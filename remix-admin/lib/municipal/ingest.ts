/**
 * Ingest orchestrator — jurisdiction-agnostic.
 *
 * Discovers meetings per municipality's declared sources, upserts meeting
 * rows, fetches lightweight assets (agenda + minutes PDFs), extracts text,
 * writes text rows.
 *
 * Deliberately NOT included in M1:
 *   - MP4 download (large; covered in M1½ transcription cycle)
 *   - Whisper transcription (M1½)
 *   - Sentiment / topic tagging (M2)
 *   - Entity NER + officials enrichment (M2)
 *   - Cron scheduling (M2 — this file's `ingestMunicipality` is called
 *     manually via /admin/api/municipal/ingest-one for M1)
 *
 * Everything here is idempotent — safe to re-run. Meeting upsert dedupes
 * on `(municipality_id, source_ref)`. Asset upsert dedupes on
 * `(meeting_id, source_url)`.
 */
import type { AdapterContext, DiscoveredMeeting } from '../municipal-adapters/base'
import { getAdapter } from '../municipal-adapters'
import { findMunicipality, type MunicipalityConfig } from './registry'
import { sql } from './db'
import { putAsset } from './blob'

// pdf-parse is CommonJS + optional peer of node-canvas; require dynamically
// so the bundle stays clean when the parser isn't loaded.
async function parsePdf(buf: Buffer): Promise<{ text: string; numpages: number }> {
  const pdfParse = (await import('pdf-parse')).default as (b: Buffer) => Promise<{ text: string; numpages: number }>
  const res = await pdfParse(buf)
  return { text: res.text, numpages: res.numpages }
}

export interface MeetingIngestReport {
  discovered: number
  upserted: number
  assetsFetched: number
  textExtracted: number
  errors: Array<{ where: string; error: string }>
}

export async function ingestMunicipality(opts: {
  muniKey: string
  since?: Date
  limit?: number      // hard cap on meetings ingested per run (M1: default 1)
  bodyKeys?: string[] // if set, restrict to these bodies
}): Promise<MeetingIngestReport> {
  const cfg = findMunicipality(opts.muniKey)
  if (!cfg) throw new Error(`unknown municipality '${opts.muniKey}'`)

  const muniRow = await ensureMunicipality(cfg)
  const bodyIds = await ensureBodies(muniRow.id, cfg)

  const ctx: AdapterContext = {
    muniKey: cfg.key,
    domains: cfg.domains,
    bodies: cfg.bodies.map((b) => ({
      key: b.key as AdapterContext['bodies'][number]['key'],
      civicPlusAgendaId: b.civicPlusAgendaId,
      granicusViewId: b.granicusViewId,
      meta: b.meta,
    })),
  }

  const report: MeetingIngestReport = {
    discovered: 0,
    upserted: 0,
    assetsFetched: 0,
    textExtracted: 0,
    errors: [],
  }

  const collected: DiscoveredMeeting[] = []
  const limit = opts.limit ?? 1

  for (const adapterKey of cfg.sources.meetings) {
    const adapter = getAdapter(adapterKey)
    try {
      for await (const m of adapter.discoverMeetings(ctx, opts.since)) {
        if (opts.bodyKeys && !opts.bodyKeys.includes(m.bodyKey)) continue
        report.discovered++
        collected.push(m)
        if (collected.length >= limit) break
      }
    } catch (e) {
      report.errors.push({ where: `discover:${adapterKey}`, error: errMsg(e) })
    }
    if (collected.length >= limit) break
  }

  for (const m of collected.slice(0, limit)) {
    try {
      const meetingId = await upsertMeeting(muniRow.id, bodyIds, m)
      report.upserted++
      const adapter = getAdapter(cfg.sources.meetings[0]!) // use any adapter for asset fetch
      await ingestAssetsForMeeting({
        cfg,
        meetingId,
        bodyKey: m.bodyKey,
        scheduledDate: m.scheduledAt.toISOString().slice(0, 10),
        externalUrls: m.externalUrls,
        report,
        // Prefer the discovering adapter for asset fetch — falls through
        // to the shared `politeFetchBuffer` if the URL is on a different host
        fetch: adapter.fetchAsset.bind(adapter),
      })
    } catch (e) {
      report.errors.push({ where: `upsert:${m.sourceRef}`, error: errMsg(e) })
    }
  }

  return report
}

// ── Persistence helpers ────────────────────────────────────────────────

export async function ensureMunicipality(cfg: MunicipalityConfig): Promise<{ id: string }> {
  const rows = (await sql`
    INSERT INTO municipality (key, name, state, county, timezone, meta)
    VALUES (${cfg.key}, ${cfg.name}, ${cfg.state}, ${cfg.county ?? null}, ${cfg.timezone}, ${JSON.stringify(cfg.meta ?? {})}::jsonb)
    ON CONFLICT (key) DO UPDATE
      SET name = EXCLUDED.name,
          state = EXCLUDED.state,
          county = EXCLUDED.county,
          timezone = EXCLUDED.timezone,
          updated_at = now()
    RETURNING id
  `) as Array<{ id: string }>
  return rows[0]!
}

export async function ensureBodies(
  muniId: string,
  cfg: MunicipalityConfig,
): Promise<Record<string, string>> {
  const out: Record<string, string> = {}
  for (const b of cfg.bodies) {
    const rows = (await sql`
      INSERT INTO body (
        municipality_id, key, display_name, civicplus_agenda_id, granicus_view_id, meeting_pattern, meta
      ) VALUES (
        ${muniId}, ${b.key}, ${b.displayName}, ${b.civicPlusAgendaId ?? null},
        ${b.granicusViewId ?? null}, ${b.meetingPattern ?? null},
        ${JSON.stringify(b.meta ?? {})}::jsonb
      )
      ON CONFLICT (municipality_id, key) DO UPDATE
        SET display_name = EXCLUDED.display_name,
            civicplus_agenda_id = EXCLUDED.civicplus_agenda_id,
            granicus_view_id = EXCLUDED.granicus_view_id,
            meeting_pattern = EXCLUDED.meeting_pattern
      RETURNING id
    `) as Array<{ id: string }>
    out[b.key] = rows[0]!.id
  }
  return out
}

async function upsertMeeting(
  muniId: string,
  bodyIds: Record<string, string>,
  m: DiscoveredMeeting,
): Promise<string> {
  const bodyId = bodyIds[m.bodyKey]
  if (!bodyId) throw new Error(`no body row for key '${m.bodyKey}' — check registry seed`)

  const rows = (await sql`
    INSERT INTO meeting (
      body_id, municipality_id, scheduled_at, status, title,
      source_ref, source_url, granicus_clip_id, granicus_event_id, meta
    ) VALUES (
      ${bodyId}, ${muniId}, ${m.scheduledAt.toISOString()}, 'held',
      ${m.title ?? null}, ${m.sourceRef}, ${m.sourceUrl ?? null},
      ${(m.meta?.clipId as number | undefined) ?? null},
      ${(m.meta?.eventId as number | undefined) ?? null},
      ${JSON.stringify(m.meta ?? {})}::jsonb
    )
    ON CONFLICT (municipality_id, source_ref) DO UPDATE
      SET title = COALESCE(EXCLUDED.title, meeting.title),
          source_url = COALESCE(EXCLUDED.source_url, meeting.source_url),
          last_ingested_at = now(),
          meta = meeting.meta || EXCLUDED.meta
    RETURNING id
  `) as Array<{ id: string }>
  return rows[0]!.id
}

interface AssetIngestArgs {
  cfg: MunicipalityConfig
  meetingId: string
  bodyKey: string
  scheduledDate: string
  externalUrls: DiscoveredMeeting['externalUrls']
  report: MeetingIngestReport
  fetch: (url: string) => Promise<{ content: Buffer; contentType: string; sha256: string }>
}

async function ingestAssetsForMeeting(args: AssetIngestArgs): Promise<void> {
  const { cfg, meetingId, bodyKey, scheduledDate, externalUrls, report, fetch } = args

  const targets: Array<{ kind: 'agenda' | 'minutes'; url: string }> = []
  if (externalUrls.agenda) targets.push({ kind: 'agenda', url: externalUrls.agenda })
  if (externalUrls.minutes) targets.push({ kind: 'minutes', url: externalUrls.minutes })

  for (const t of targets) {
    try {
      const asset = await fetch(t.url)
      const stored = await putAsset({
        muniKey: cfg.key,
        bodyKey,
        scheduledDate,
        kind: t.kind,
        content: asset.content,
        contentType: asset.contentType,
      })

      // Upsert asset row
      const assetRows = (await sql`
        INSERT INTO meeting_asset (
          meeting_id, kind, source_url, blob_url, sha256, content_type, byte_size, fetched_at
        ) VALUES (
          ${meetingId}, ${t.kind}, ${t.url}, ${stored.url}, ${stored.sha256},
          ${asset.contentType}, ${asset.content.byteLength}, now()
        )
        ON CONFLICT (meeting_id, source_url) DO UPDATE
          SET blob_url = EXCLUDED.blob_url,
              sha256 = EXCLUDED.sha256,
              content_type = EXCLUDED.content_type,
              byte_size = EXCLUDED.byte_size,
              fetched_at = now()
        RETURNING id
      `) as Array<{ id: string }>
      const assetId = assetRows[0]!.id
      report.assetsFetched++

      // Extract text if PDF
      if (asset.contentType.includes('pdf')) {
        try {
          const { text, numpages } = await parsePdf(asset.content)
          await sql`
            UPDATE meeting_asset SET page_count = ${numpages} WHERE id = ${assetId}
          `
          await sql`
            INSERT INTO meeting_text (asset_id, meeting_id, extractor, full_text)
            VALUES (${assetId}, ${meetingId}, 'pdf-parse', ${text})
            ON CONFLICT DO NOTHING
          `
          report.textExtracted++
        } catch (e) {
          report.errors.push({ where: `pdf-parse:${t.url}`, error: errMsg(e) })
        }
      }
    } catch (e) {
      report.errors.push({ where: `asset-fetch:${t.url}`, error: errMsg(e) })
    }
  }
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}
