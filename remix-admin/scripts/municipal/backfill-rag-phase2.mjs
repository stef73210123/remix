#!/usr/bin/env node
/**
 * RAG Phase 2 backfill — ingests budgets, financial reports (CAFR/ACFR +
 * auditor's reports), and 2024-2026 local laws from the user's Google Drive
 * document archive into the `document` table, so /admin/api/municipal/ask's
 * retrieval step (lib/municipal/askRetrieval.ts) can cite them.
 *
 * Unlike Phase 1 (backfill-rag-phase1.mjs), the source PDFs live in Google
 * Drive, not this repo — there's no standing, credentialed Drive
 * integration in the deployed app, so this script can't fetch them itself.
 * The one-time fetch+extract already happened in a Drive-connected session
 * (for each entry in rag-manifests/phase2-budgets-financials-locallaws.json,
 * downloading by `driveFileId` and extracting text with `pdf-parse`) and its
 * output — one `<idx>_<slug>.txt` per manifest entry, ~5MB total — is
 * committed at rag-staging/phase2/ (the default --staging-dir below), so
 * this script is fully reproducible from the repo alone; re-running the
 * Drive fetch is only needed to pick up new/updated source documents later.
 *
 * Usage:
 *   NEON_DATABASE_URL=postgres://... node scripts/municipal/backfill-rag-phase2.mjs
 *   node scripts/municipal/backfill-rag-phase2.mjs --dry-run
 *   node scripts/municipal/backfill-rag-phase2.mjs --staging-dir=/path/to/refreshed/txt  # after a new Drive fetch
 *
 * Entries in the manifest with no matching staged file are skipped (logged,
 * not silently dropped) — the run doesn't have to cover 100% of the
 * manifest to be useful. As of the last Drive fetch, 56/57 files staged (1
 * transient download failure on the 2008 Adopted Budget — a scanned PDF per
 * its metadata anyway, so low-impact; re-fetch it from
 * https://www.northcastleny.gov/ArchiveCenter/ViewFile/Item/70 to close the
 * gap). 19 of the 56 staged files are themselves scanned/image-only PDFs
 * (mostly pre-2017 Adopted Budgets and pre-2012 financial reports) with no
 * real text layer — those get an honest placeholder instead of garbled OCR
 * noise (see below). Idempotent — upserts on (municipality_id, source_url),
 * same as Phase 1's document rows.
 */
import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { Client } from '@neondatabase/serverless'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = join(SCRIPT_DIR, '..', '..') // remix-admin/
const MANIFEST_PATH = join(SCRIPT_DIR, 'rag-manifests', 'phase2-budgets-financials-locallaws.json')
const DRY_RUN = process.argv.includes('--dry-run')
const MUNI_KEY = 'nc'
const MUNI_NAME = 'Town of North Castle'

const stagingArg = process.argv.find((a) => a.startsWith('--staging-dir='))
const STAGING_DIR = stagingArg ? stagingArg.slice('--staging-dir='.length) : join(SCRIPT_DIR, 'rag-staging', 'phase2')

// A PDF that extracted to almost nothing per page is very likely a scanned
// image with no real text layer — pdf-parse can't OCR it. Still ingested
// (a short doc is better than none, and the title/date alone are useful
// metadata) but flagged loudly rather than silently treated as a normal row.
const LOW_TEXT_CHAR_THRESHOLD = 500

async function ensureMunicipality(client) {
  const res = await client.query(
    `INSERT INTO municipality (key, name, state, county, timezone)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (key) DO UPDATE SET name = EXCLUDED.name, updated_at = now()
     RETURNING id`,
    [MUNI_KEY, MUNI_NAME, 'NY', 'Westchester', 'America/New_York'],
  )
  return res.rows[0].id
}

async function upsertDocument(client, muniId, { title, sourceUrl, fullText, effectiveDate, category, meta }) {
  await client.query(
    `INSERT INTO document (municipality_id, kind, title, source_platform, source_url, full_text, effective_date, category, meta, last_ingested_at)
     VALUES ($1, 'other', $2, 'drive-archive', $3, $4, $5, $6, $7::jsonb, now())
     ON CONFLICT (municipality_id, source_url) DO UPDATE
       SET title = EXCLUDED.title, full_text = EXCLUDED.full_text, effective_date = EXCLUDED.effective_date,
           category = EXCLUDED.category, meta = EXCLUDED.meta, last_ingested_at = now()`,
    [muniId, title, sourceUrl, fullText, effectiveDate ?? null, category, JSON.stringify(meta ?? {})],
  )
}

async function main() {
  if (!existsSync(STAGING_DIR)) {
    console.error(`Staging dir not found: ${STAGING_DIR}`)
    console.error('Usage: node scripts/municipal/backfill-rag-phase2.mjs [--staging-dir=/path/to/staged/txt] [--dry-run]')
    process.exit(1)
  }

  const url = process.env.NEON_DATABASE_URL
  if (!url && !DRY_RUN) {
    console.error('NEON_DATABASE_URL not set (pass --dry-run to preview without a database)')
    process.exit(1)
  }

  const manifest = JSON.parse(await readFile(MANIFEST_PATH, 'utf8'))
  const client = url ? new Client(url) : null
  if (client) await client.connect()

  const muniId = client ? await ensureMunicipality(client) : null

  const stats = { ingested: 0, lowText: 0, notStaged: 0 }

  for (const entry of manifest) {
    const txtPath = join(STAGING_DIR, `${entry.idx}_${entry.slug}.txt`)
    if (!existsSync(txtPath)) {
      stats.notStaged++
      console.log(`skip (not staged): ${entry.title}`)
      continue
    }
    const extractedText = await readFile(txtPath, 'utf8')
    const lowText = extractedText.length < LOW_TEXT_CHAR_THRESHOLD
    if (lowText) {
      stats.lowText++
      console.log(`LOW TEXT (${extractedText.length} chars) — likely scanned/image-only: ${entry.title}`)
    }
    // A few hundred garbled OCR-fragment characters from a scanned PDF is
    // worse than nothing for full-text search (spurious matches on noise) —
    // swap in an honest placeholder instead. The row (title, date, citation
    // URL) still exists for completeness/audit, but since `document.tsv` is
    // generated from full_text alone, this placeholder essentially never
    // surfaces as a search hit, which is the right degradation: point
    // whoever's looking at the real PDF rather than pretend we indexed it.
    const fullText = lowText
      ? `[This document is a scanned image PDF with no machine-readable text layer — OCR was not run in this ingestion pass. See the source PDF at ${entry.sourceUrl} for the full document.]`
      : extractedText

    if (!DRY_RUN) {
      await upsertDocument(client, muniId, {
        title: entry.title,
        sourceUrl: entry.sourceUrl,
        fullText,
        effectiveDate: entry.effectiveDate,
        category: entry.category,
        meta: { source: 'google-drive-archive', driveFileId: entry.driveFileId, lowText },
      })
    }
    stats.ingested++
  }

  console.log(`\n${DRY_RUN ? '[dry run] ' : ''}Done.`, stats)
  if (client) await client.end()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
