/**
 * Officials enrichment (M2, roster-first).
 *
 * Discovers the current members of every board / committee for a municipality
 * via the Anthropic web-search adapter, then upserts them into the `official`
 * table so the board profile pages (/admin/municipal/board) show rosters.
 *
 * Idempotent and additive: re-running updates a person's title / body
 * membership / kind but never duplicates (dedupe on
 * `municipality_id, lower(full_name)`). Stale-member deactivation is a
 * deliberate follow-up — we don't auto-flip members inactive on a run that
 * might have simply missed someone.
 */
import { sql } from './db'
import { ensureMunicipality, ensureBodies } from './ingest'
import { findMunicipality, MUNICIPALITIES, type MunicipalityConfig } from './registry'
import { discoverOfficialsViaSearch } from '../municipal-adapters/officials-search'
import type { DiscoveredOfficial } from '../municipal-adapters/base'

export interface OfficialsRefreshReport {
  muniKey: string
  ok: boolean
  discovered: number
  upserted: number
  errors: string[]
}

/** Merge duplicate people (same name on multiple bodies) into one record. */
function dedupeByName(officials: DiscoveredOfficial[]): DiscoveredOfficial[] {
  const byName = new Map<string, DiscoveredOfficial>()
  for (const o of officials) {
    const norm = o.fullName.toLowerCase().replace(/\s+/g, ' ').trim()
    const existing = byName.get(norm)
    if (!existing) {
      byName.set(norm, { ...o, bodyKeys: [...(o.bodyKeys ?? [])] })
      continue
    }
    // Union body memberships; keep the first non-empty title / email.
    const keys = new Set([...(existing.bodyKeys ?? []), ...(o.bodyKeys ?? [])])
    existing.bodyKeys = [...keys] as DiscoveredOfficial['bodyKeys']
    existing.title = existing.title || o.title
    existing.email = existing.email || o.email
  }
  return [...byName.values()]
}

export async function refreshOfficials(cfg: MunicipalityConfig): Promise<OfficialsRefreshReport> {
  const report: OfficialsRefreshReport = {
    muniKey: cfg.key,
    ok: false,
    discovered: 0,
    upserted: 0,
    errors: [],
  }

  const search = await discoverOfficialsViaSearch(cfg)
  if (!search.ok) {
    report.errors.push(search.error || 'discovery failed')
    return report
  }
  const people = dedupeByName(search.officials)
  report.discovered = people.length

  let muniId: string
  let bodyIds: Record<string, string>
  try {
    muniId = (await ensureMunicipality(cfg)).id
    bodyIds = await ensureBodies(muniId, cfg)
  } catch (e) {
    report.errors.push(`db setup: ${e instanceof Error ? e.message : String(e)}`)
    return report
  }

  for (const p of people) {
    const ids = (p.bodyKeys ?? [])
      .map((k) => bodyIds[k])
      .filter((v): v is string => Boolean(v))
    if (ids.length === 0) continue
    const bodyIdArray = `{${ids.join(',')}}` // uuids are literal-safe

    try {
      await sql`
        INSERT INTO official (municipality_id, kind, full_name, title, body_ids, email)
        VALUES (
          ${muniId}, ${p.kind ?? 'appointed'}, ${p.fullName}, ${p.title ?? null},
          ${bodyIdArray}::uuid[], ${p.email ?? null}
        )
        ON CONFLICT (municipality_id, lower(full_name)) DO UPDATE
          SET kind      = EXCLUDED.kind,
              title     = COALESCE(EXCLUDED.title, official.title),
              body_ids  = EXCLUDED.body_ids,
              email     = COALESCE(EXCLUDED.email, official.email),
              active    = true,
              updated_at = now()
      `
      report.upserted++
    } catch (e) {
      report.errors.push(`${p.fullName}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  report.ok = true
  return report
}

/** Refresh a single town, or every registered town when muniKey is omitted. */
export async function refreshOfficialsFor(muniKey?: string): Promise<OfficialsRefreshReport[]> {
  const targets = muniKey
    ? [findMunicipality(muniKey)].filter((c): c is MunicipalityConfig => Boolean(c))
    : MUNICIPALITIES
  const reports: OfficialsRefreshReport[] = []
  for (const cfg of targets) {
    reports.push(await refreshOfficials(cfg))
  }
  return reports
}
