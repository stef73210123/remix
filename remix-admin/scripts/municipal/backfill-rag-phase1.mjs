#!/usr/bin/env node
/**
 * RAG Phase 1 backfill — ingests data already committed in this repo
 * (meeting transcripts, per-meeting analysis summaries, adopted-budget
 * figures, and building-permit rollups) into the `meeting`/`meeting_asset`/
 * `meeting_text`/`document` tables, so /admin/api/municipal/ask's retrieval
 * step (lib/municipal/askRetrieval.ts) has real, citable passages to search
 * instead of only the small static digest it uses today.
 *
 * No external I/O and no new dependencies — everything ingested here is
 * already in lib/municipal/data/ or lib/municipal/budget*.ts. Later phases
 * (ingesting the user's Google Drive document archive) are separate scripts;
 * this one only covers what ships in the repo.
 *
 * Usage:
 *   NEON_DATABASE_URL=postgres://... node --experimental-strip-types scripts/municipal/backfill-rag-phase1.mjs
 *   node --experimental-strip-types scripts/municipal/backfill-rag-phase1.mjs --dry-run
 *
 * --dry-run does every formatting/read step but skips DB writes — useful to
 * sanity-check row counts and text formatting without a NEON_DATABASE_URL.
 * (--experimental-strip-types is required because this script imports
 * lib/municipal/budget2026.ts and budget.ts directly, to keep the dollar
 * figures as a single source of truth rather than re-transcribing them here.)
 *
 * Idempotent — every insert upserts on a stable key (transcripts/analysis
 * summaries key on municipality+source_ref/source_url derived from the
 * board+date; budget/permit documents key on a fixed synthetic URL), so
 * re-running this after editing a formatting function or after new meetings
 * are added to the committed transcripts is always safe.
 */
import { readFile, readdir } from 'node:fs/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, join } from 'node:path'
import { Client } from '@neondatabase/serverless'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = join(SCRIPT_DIR, '..', '..') // remix-admin/
const DATA_DIR = join(REPO_ROOT, 'lib', 'municipal', 'data')
const DRY_RUN = process.argv.includes('--dry-run')
const MUNI_KEY = 'nc'
const MUNI_NAME = 'Town of North Castle'

const BOARDS = [
  { dataDir: 'nc-townboard', bodyKey: 'town_board', display: 'Town Board' },
  { dataDir: 'nc-planning', bodyKey: 'planning', display: 'Planning Board' },
]

function fmtUSD(n) {
  const v = Math.round(Number(n) || 0)
  return `${v < 0 ? '-' : ''}$${Math.abs(v).toLocaleString('en-US')}`
}
function fmtPct(n, digits = 1) {
  const v = Number(n) || 0
  return `${v >= 0 ? '+' : ''}${(v * 100).toFixed(digits)}%`
}

// ── DB helpers (raw SQL via @neondatabase/serverless's Client — same
//    approach as migrate.mjs, not the tagged-template `sql` helper in
//    lib/municipal/db.ts, which is HTTP-only and Next.js-request-scoped) ──

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

async function ensureBody(client, muniId, bodyKey, displayName) {
  const res = await client.query(
    `INSERT INTO body (municipality_id, key, display_name)
     VALUES ($1, $2, $3)
     ON CONFLICT (municipality_id, key) DO UPDATE SET display_name = EXCLUDED.display_name
     RETURNING id`,
    [muniId, bodyKey, displayName],
  )
  return res.rows[0].id
}

async function upsertMeeting(client, muniId, bodyId, sourceRef, title, scheduledAtISO) {
  const res = await client.query(
    `INSERT INTO meeting (body_id, municipality_id, scheduled_at, status, title, source_ref)
     VALUES ($1, $2, $3, 'held', $4, $5)
     ON CONFLICT (municipality_id, source_ref) DO UPDATE
       SET title = EXCLUDED.title, last_ingested_at = now()
     RETURNING id`,
    [bodyId, muniId, scheduledAtISO, title, sourceRef],
  )
  return res.rows[0].id
}

async function upsertTranscriptAsset(client, meetingId, sourceUrl, byteSize) {
  const res = await client.query(
    `INSERT INTO meeting_asset (meeting_id, kind, source_url, content_type, byte_size, fetched_at)
     VALUES ($1, 'other', $2, 'text/plain', $3, now())
     ON CONFLICT (meeting_id, source_url) DO UPDATE
       SET byte_size = EXCLUDED.byte_size, fetched_at = now()
     RETURNING id`,
    [meetingId, sourceUrl, byteSize],
  )
  return res.rows[0].id
}

async function replaceMeetingText(client, assetId, meetingId, fullText) {
  // meeting_text has no unique constraint to upsert against (see comment in
  // the plan) — delete-then-insert on the stable asset_id is the idempotent
  // equivalent.
  await client.query('DELETE FROM meeting_text WHERE asset_id = $1', [assetId])
  await client.query(
    `INSERT INTO meeting_text (asset_id, meeting_id, extractor, full_text)
     VALUES ($1, $2, 'whisper-mini', $3)`,
    [assetId, meetingId, fullText],
  )
}

async function upsertDocument(client, muniId, { title, sourceUrl, fullText, effectiveDate, category, meta }) {
  await client.query(
    `INSERT INTO document (municipality_id, kind, title, source_platform, source_url, full_text, effective_date, category, meta, last_ingested_at)
     VALUES ($1, 'other', $2, 'repo', $3, $4, $5, $6, $7::jsonb, now())
     ON CONFLICT (municipality_id, source_url) DO UPDATE
       SET title = EXCLUDED.title, full_text = EXCLUDED.full_text, effective_date = EXCLUDED.effective_date,
           category = EXCLUDED.category, meta = EXCLUDED.meta, last_ingested_at = now()`,
    [muniId, title, sourceUrl, fullText, effectiveDate ?? null, category, JSON.stringify(meta ?? {})],
  )
}

// ── Phase A: committed meeting transcripts → meeting/meeting_asset/meeting_text ──

async function ingestTranscripts(client, muniId, bodyId, board, stats) {
  const dir = join(DATA_DIR, board.dataDir, 'transcripts')
  const files = (await readdir(dir)).filter((f) => f.endsWith('.txt')).sort()
  for (const f of files) {
    const date = f.replace(/\.txt$/, '')
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { stats.skipped++; continue }
    const text = await readFile(join(dir, f), 'utf8')
    if (text.trim().length < 200) { stats.skipped++; continue } // near-empty transcript — skip, don't ingest noise

    const sourceRef = `repo-transcript:${board.bodyKey}:${date}`
    const title = `${board.display} — ${date}`
    if (DRY_RUN) { stats.meetingTexts++; continue }

    const meetingId = await upsertMeeting(client, muniId, bodyId, sourceRef, title, `${date}T00:00:00Z`)
    const assetUrl = `repo://lib/municipal/data/${board.dataDir}/transcripts/${f}`
    const assetId = await upsertTranscriptAsset(client, meetingId, assetUrl, Buffer.byteLength(text, 'utf8'))
    await replaceMeetingText(client, assetId, meetingId, text)
    stats.meetingTexts++
  }
}

// ── Phase B: analysis.json's per-meeting summaries → document rows ──

async function ingestAnalysisSummaries(client, muniId, board, stats) {
  const path = join(DATA_DIR, board.dataDir, 'analysis.json')
  const data = JSON.parse(await readFile(path, 'utf8'))
  for (const m of data.meetings ?? []) {
    const parts = [m.meetingSummary || '']
    if (m.durationNote) parts.push(m.durationNote)
    for (const c of m.cases ?? []) {
      if (c.summary) parts.push(`${c.name} (${c.status}): ${c.summary}`)
    }
    const fullText = parts.filter(Boolean).join('\n\n')
    if (!fullText.trim()) { stats.skipped++; continue }

    const sourceUrl = `repo://lib/municipal/data/${board.dataDir}/analysis.json#meetings[${m.date}]`
    if (DRY_RUN) { stats.analysisDocuments++; continue }
    await upsertDocument(client, muniId, {
      title: `${board.display} meeting summary — ${m.date}`,
      sourceUrl,
      fullText,
      effectiveDate: m.date,
      category: 'analysis_summary',
      meta: { board: board.display, bodyKey: board.bodyKey, date: m.date },
    })
    stats.analysisDocuments++
  }
}

// ── Phase C: budget2026.ts / budget.ts constants → document rows ──

async function ingestBudgetDocuments(client, muniId, stats) {
  // Import the real .ts module (needs `node --experimental-strip-types`,
  // see the usage note at the top of this file) rather than re-transcribing
  // these figures here, so the budget constants stay a single source of
  // truth shared with the Assessor-page widgets.
  const budget2026 = await import(pathToFileURL(join(REPO_ROOT, 'lib', 'municipal', 'budget2026.ts')).href)

  const docs = []

  // 1. Appropriations by fund, grouped by category.
  {
    const byCategory = new Map()
    for (const r of budget2026.NC_2026_APPROPRIATIONS) {
      const arr = byCategory.get(r.category) ?? []
      arr.push(r)
      byCategory.set(r.category, arr)
    }
    const lines = []
    for (const [category, rows] of byCategory) {
      const subtotal = rows.reduce((s, r) => s + r.taxLevy, 0)
      lines.push(`${category} (${fmtUSD(subtotal)} tax levy):`)
      for (const r of rows) {
        lines.push(
          `  ${r.fund} (${r.code}) — appropriation ${fmtUSD(r.appropriation)}, revenue ${fmtUSD(r.revenue)}, `
          + `appropriated fund balance ${fmtUSD(r.appropriatedFundBalance)}, tax levy ${fmtUSD(r.taxLevy)}.`,
        )
      }
    }
    docs.push({
      title: '2026 Adopted Budget — Appropriations by Fund',
      sourceUrl: 'repo://lib/municipal/budget2026.ts#NC_2026_APPROPRIATIONS',
      fullText: lines.join('\n'),
      effectiveDate: '2026-01-01',
      category: 'budget',
    })
  }

  // 2. 2025 vs 2026 appropriations, year-over-year change.
  {
    const lines = budget2026.NC_2025_VS_2026.map((r) => {
      const pct = r.appropriation2025 ? (r.appropriation2026 - r.appropriation2025) / r.appropriation2025 : 0
      return `${r.category} — ${r.fund} (${r.code}): ${fmtUSD(r.appropriation2025)} in 2025 → ${fmtUSD(r.appropriation2026)} in 2026 (${fmtPct(pct)}).`
    })
    docs.push({
      title: '2025 vs 2026 Appropriations — Year-over-Year Change by Fund',
      sourceUrl: 'repo://lib/municipal/budget2026.ts#NC_2025_VS_2026',
      fullText: lines.join('\n'),
      effectiveDate: '2026-01-01',
      category: 'budget',
    })
  }

  // 3. Tax cap worksheet, as prose.
  {
    const lines = ['How North Castle’s 2026 total tax levy was calculated, step by step, under New York’s tax-cap law (General Municipal Law §3-c):']
    for (const step of budget2026.NC_TAX_CAP_WATERFALL) {
      lines.push(step.kind === 'delta'
        ? `  ${step.value >= 0 ? 'Add' : 'Subtract'} ${step.label}: ${fmtUSD(Math.abs(step.value))}`
        : step.kind === 'benchmark'
          ? `${step.label} (state-calculated cap): ${fmtUSD(step.value)}`
          : `${step.label}: ${fmtUSD(step.value)}`)
    }
    docs.push({
      title: 'How North Castle’s 2026 Tax Levy Was Calculated (Tax Cap Worksheet)',
      sourceUrl: 'repo://lib/municipal/budget2026.ts#NC_TAX_CAP_WATERFALL',
      fullText: lines.join('\n'),
      effectiveDate: '2026-01-01',
      category: 'budget',
    })
  }

  // 4. Total levy history, with YoY change.
  {
    const hist = budget2026.NC_TOTAL_TAX_LEVY_HISTORY
    const lines = hist.map((y, i) => {
      if (i === 0) return `${y.year}: ${fmtUSD(y.levy)}`
      const pct = (y.levy - hist[i - 1].levy) / hist[i - 1].levy
      return `${y.year}: ${fmtUSD(y.levy)} (${fmtPct(pct)} vs. ${hist[i - 1].year})`
    })
    docs.push({
      title: 'Total North Castle Tax Levy, 2020-2026',
      sourceUrl: 'repo://lib/municipal/budget2026.ts#NC_TOTAL_TAX_LEVY_HISTORY',
      fullText: lines.join('\n'),
      effectiveDate: '2026-01-01',
      category: 'budget',
    })
  }

  // 5. Homeowner impact.
  {
    const h = budget2026.NC_HOMEOWNER_TAX_IMPACT
    const text = `For North Castle’s median-value home (assessed at ${fmtUSD(h.assessedValue)}, market value approximately ${fmtUSD(h.medianHomeValue)}), the Town-only portion of the tax bill goes from ${fmtUSD(h.townTaxes2025)} in 2025 to ${fmtUSD(h.townTaxes2026)} in 2026 — an increase of ${fmtUSD(h.increase)} (${fmtPct(h.increasePct)}). This is the Town portion only; it does not include county, school, or special-district taxes.`
    docs.push({
      title: 'What the 2026 Tax Levy Increase Means for a Typical Homeowner',
      sourceUrl: 'repo://lib/municipal/budget2026.ts#NC_HOMEOWNER_TAX_IMPACT',
      fullText: text,
      effectiveDate: '2026-01-01',
      category: 'budget',
    })
  }

  // 6. Fund balance history.
  {
    const lines = []
    for (const series of budget2026.NC_FUND_BALANCE_HISTORY) {
      lines.push(`${series.fund}:`)
      for (const y of series.years) {
        lines.push(
          `  ${y.year}: began the year with ${fmtUSD(y.fundEquityBeg)} in fund equity, took in ${fmtUSD(y.revenues)} `
          + `in revenue against ${fmtUSD(y.expenses)} in expenses, ending the year at ${fmtUSD(y.fundEquityEnd)} `
          + `(${fmtPct(y.unrestrictedPctOfExpenditures, 0)} of expenditures held as unrestricted reserve).`,
        )
      }
    }
    docs.push({
      title: 'Fund Balance History, 2019-2024',
      sourceUrl: 'repo://lib/municipal/budget2026.ts#NC_FUND_BALANCE_HISTORY',
      fullText: lines.join('\n'),
      effectiveDate: '2024-12-31',
      category: 'budget',
    })
  }

  for (const d of docs) {
    if (!DRY_RUN) await upsertDocument(client, muniId, { ...d, meta: { source: 'budget2026.ts' } })
    stats.budgetDocuments++
  }
}

// ── Phase D: permit rollups (permits.json — NOT the 4,094 raw records in
//    permits_full.json, which are numeric/tabular and already well-served
//    by the existing permit map/search UI) → document rows ──

async function ingestPermitRollups(client, muniId, stats) {
  const path = join(DATA_DIR, 'nc-building', 'permits.json')
  const data = JSON.parse(await readFile(path, 'utf8'))
  const docs = []

  docs.push({
    title: `Building Permits — Overall Totals, ${data.coverage.firstYear}-${data.coverage.lastYear}`,
    text: `${data.source}\n\n${data.totals.permits.toLocaleString()} permits issued between ${data.coverage.firstYear} and ${data.coverage.lastYear}, totaling ${fmtUSD(data.totals.totalCost)} in reported construction cost and ${fmtUSD(data.totals.totalFees)} in permit fees (${data.totals.withCost.toLocaleString()} of the permits reported a cost figure). Median turnaround from application to permit issuance was ${data.turnaround.medianDays} days (average ${data.turnaround.avgDays} days, across ${data.turnaround.n.toLocaleString()} permits with turnaround data).`,
    date: `${data.coverage.lastYear}-12-31`,
  })

  docs.push({
    title: 'Building Permits by Year',
    text: data.byYear.map((y) => `${y.year}: ${y.count.toLocaleString()} permits, ${fmtUSD(y.cost)} total cost, ${fmtUSD(y.fees)} in fees.`).join('\n'),
    date: `${data.coverage.lastYear}-12-31`,
  })

  docs.push({
    title: 'Building Permits by Category',
    text: data.byCategory.map((c) => `${c.category}: ${c.count.toLocaleString()} permits, ${fmtUSD(c.cost)} total cost.`).join('\n'),
    date: `${data.coverage.lastYear}-12-31`,
  })

  docs.push({
    title: 'Most Active Building Contractors',
    text: data.topContractors.map((c) => `${c.name}: ${c.count.toLocaleString()} permits, ${fmtUSD(c.cost)} total cost.`).join('\n'),
    date: `${data.coverage.lastYear}-12-31`,
  })

  for (const d of docs) {
    const sourceUrl = `repo://lib/municipal/data/nc-building/permits.json#${d.title}`
    if (!DRY_RUN) {
      await upsertDocument(client, muniId, {
        title: d.title, sourceUrl, fullText: d.text, effectiveDate: d.date,
        category: 'permit_rollup', meta: { source: 'permits.json' },
      })
    }
    stats.permitDocuments++
  }
}

async function main() {
  const url = process.env.NEON_DATABASE_URL
  if (!url && !DRY_RUN) {
    console.error('NEON_DATABASE_URL not set (pass --dry-run to preview without a database)')
    process.exit(1)
  }

  const client = url ? new Client(url) : null
  if (client) await client.connect()

  const stats = { meetingTexts: 0, analysisDocuments: 0, budgetDocuments: 0, permitDocuments: 0, skipped: 0 }

  let muniId = null
  const bodyIds = {}
  if (client) {
    muniId = await ensureMunicipality(client)
    for (const b of BOARDS) bodyIds[b.bodyKey] = await ensureBody(client, muniId, b.bodyKey, b.display)
  }

  for (const board of BOARDS) {
    console.log(`→ transcripts: ${board.display}`)
    await ingestTranscripts(client, muniId, bodyIds[board.bodyKey], board, stats)
    console.log(`→ analysis summaries: ${board.display}`)
    await ingestAnalysisSummaries(client, muniId, board, stats)
  }

  console.log('→ budget documents')
  await ingestBudgetDocuments(client, muniId, stats)

  console.log('→ permit rollups')
  await ingestPermitRollups(client, muniId, stats)

  console.log(`\n${DRY_RUN ? '[dry run] ' : ''}Done.`, stats)
  if (client) await client.end()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
