/**
 * Upstash Redis persistence for RFP records.
 *
 * Key layout:
 *   rfp:{STATE}:{sourceId}       — JSON blob of the Opportunity
 *   rfp:index:{STATE}            — Set<sourceId> for fast per-state listing
 *   rfp:index:all                — Set<"{STATE}:{sourceId}"> for whole-CRM listing
 *   rfp:seed:v1                  — flag key set after the curated seed runs
 *
 * Curated-flag protection: if an existing record has curated=true, ingest
 * may upgrade the sourceUrl (search-fallback → direct) but never overwrites
 * tier / rationale / notes / title / agency / dueLabel. Everything else on
 * the record is preserved as Stefan entered it.
 */
import { getRedis } from './redis'
import {
  CURATED_NY_OPPORTUNITIES,
  STATE_CODES,
  type Opportunity,
  type StateCode,
} from './opportunities'

const KEY_REC = (state: StateCode, sourceId: string) => `rfp:${state}:${sourceId}`
const KEY_INDEX_STATE = (state: StateCode) => `rfp:index:${state}`
const KEY_INDEX_ALL = 'rfp:index:all'
const KEY_SEED = 'rfp:seed:v1'

export async function getRfp(state: StateCode, sourceId: string): Promise<Opportunity | null> {
  const r = getRedis()
  const raw = await r.get<Opportunity | string>(KEY_REC(state, sourceId))
  if (!raw) return null
  // Upstash's SDK auto-parses when the stored value is a JSON string; be
  // defensive and handle both shapes.
  return typeof raw === 'string' ? (JSON.parse(raw) as Opportunity) : raw
}

/**
 * Write a record with curated-flag protection.
 *
 * Behavior:
 *   - New record: write as-is.
 *   - Existing curated record + new record has direct link:
 *       upgrade sourceUrl + linkStatus + sourceId; preserve everything else.
 *   - Existing curated record + new record is search-fallback:
 *       no-op (don't downgrade the link).
 *   - Existing non-curated record: overwrite.
 *
 * Returns the write action taken for logging.
 */
export type WriteAction = 'created' | 'updated' | 'url-upgraded' | 'preserved' | 'unchanged'

export interface WriteResult {
  action: WriteAction
  record: Opportunity
}

export async function putRfp(next: Opportunity): Promise<WriteResult> {
  const r = getRedis()
  const existing = await getRfp(next.state, next.sourceId)

  if (!existing) {
    await r.set(KEY_REC(next.state, next.sourceId), JSON.stringify(next))
    await r.sadd(KEY_INDEX_STATE(next.state), next.sourceId)
    await r.sadd(KEY_INDEX_ALL, `${next.state}:${next.sourceId}`)
    return { action: 'created', record: next }
  }

  if (existing.curated) {
    // Curated rows: only allow a sourceUrl/linkStatus upgrade. Everything
    // Stefan curated stays put.
    const canUpgradeUrl =
      existing.linkStatus === 'search-fallback' && next.linkStatus === 'direct'
    if (!canUpgradeUrl) {
      return { action: 'preserved', record: existing }
    }
    const upgraded: Opportunity = {
      ...existing,
      sourceUrl: next.sourceUrl,
      linkStatus: 'direct',
      // Keep the original sourceName ("NYSCR") — the direct link still points
      // at the NYSCR record, we just have a real deep-link now.
      ingestedAt: next.ingestedAt,
    }
    await r.set(KEY_REC(existing.state, existing.sourceId), JSON.stringify(upgraded))
    return { action: 'url-upgraded', record: upgraded }
  }

  // Non-curated: normal overwrite. Preserve Stefan's edits to
  // tier/rationale/notes if he made any (these live on the record).
  const merged: Opportunity = {
    ...next,
    tier: existing.tier || next.tier,
    rationale: existing.rationale || next.rationale,
    notes: existing.notes || next.notes,
  }
  await r.set(KEY_REC(merged.state, merged.sourceId), JSON.stringify(merged))
  return { action: 'updated', record: merged }
}

/** Fetch all records for a given state. */
export async function listByState(state: StateCode): Promise<Opportunity[]> {
  const r = getRedis()
  const ids = await r.smembers(KEY_INDEX_STATE(state))
  if (!ids || ids.length === 0) return []
  const keys = ids.map((id) => KEY_REC(state, id))
  const values = await r.mget<(Opportunity | string | null)[]>(...keys)
  const out: Opportunity[] = []
  for (const v of values) {
    if (!v) continue
    out.push(typeof v === 'string' ? (JSON.parse(v) as Opportunity) : v)
  }
  return out
}

/** Fetch all records across all states. */
export async function listAll(): Promise<Opportunity[]> {
  const all: Opportunity[] = []
  for (const s of STATE_CODES) {
    const rows = await listByState(s)
    all.push(...rows)
  }
  return all
}

/**
 * Seed the 13 curated NY entries into Redis once. Idempotent: re-runs won't
 * duplicate. Called at cron startup to ensure the base rows exist.
 */
export async function seedCuratedIfNeeded(): Promise<{ seeded: boolean; count: number }> {
  const r = getRedis()
  const already = await r.get(KEY_SEED)
  if (already) return { seeded: false, count: 0 }

  let count = 0
  for (const row of CURATED_NY_OPPORTUNITIES) {
    const existing = await getRfp(row.state, row.sourceId)
    if (existing) continue
    await r.set(KEY_REC(row.state, row.sourceId), JSON.stringify(row))
    await r.sadd(KEY_INDEX_STATE(row.state), row.sourceId)
    await r.sadd(KEY_INDEX_ALL, `${row.state}:${row.sourceId}`)
    count++
  }
  await r.set(KEY_SEED, new Date().toISOString())
  return { seeded: true, count }
}

/**
 * Test-only: wipe every RFP key. Not called from production paths.
 */
export async function wipeAll(): Promise<number> {
  const r = getRedis()
  const all = await r.smembers(KEY_INDEX_ALL)
  let deleted = 0
  for (const composite of all) {
    const [state, id] = composite.split(':')
    if (!state || !id) continue
    await r.del(KEY_REC(state as StateCode, id))
    await r.srem(KEY_INDEX_STATE(state as StateCode), id)
    deleted++
  }
  await r.del(KEY_INDEX_ALL)
  await r.del(KEY_SEED)
  return deleted
}
