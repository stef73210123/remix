/**
 * CivicClerk (CivicPlus "Meeting Portal") adapter.
 *
 * North Castle publishes its board meetings on a CivicClerk portal, e.g.
 *   https://northcastleny.portal.civicclerk.com/event/1985/files/agenda/2464
 * NOT on the CivicPlus AgendaCenter that `nc-civicplus` scrapes — which is why
 * the AgendaCenter category ids returned the wrong board's documents.
 *
 * The portal SPA is backed by an OData API at `{slug}.api.civicclerk.com`.
 * Meetings are discovered from `/v1/Events`; each event carries a category
 * name (the board) and a set of published files (agenda / minutes). The
 * canonical file download is the GetMeetingFileStream endpoint keyed by fileId.
 *
 * Field names vary slightly between CivicClerk deployments, so the parsing
 * here is deliberately defensive: it reads a value from the first of several
 * candidate keys rather than assuming one exact shape. Meetings are mapped to a
 * board by matching the event's category name against the municipality's
 * configured body keys, so no per-board numeric id is needed.
 *
 * NOTE: built against CivicClerk's documented API shape; the North Castle host
 * is not reachable from the build sandbox, so verify with a live ingest
 * (/admin/api/municipal/ingest-one?muni=nc) after deploy.
 */
import type {
  AdapterContext,
  BodyKey,
  DiscoveredMeeting,
  FetchedAsset,
  MunicipalAdapter,
} from './base'
import { politeFetch, politeFetchBuffer } from './base'

// muniKey → CivicClerk tenant slug (the `{slug}` in {slug}.portal.civicclerk.com).
const CIVICCLERK_SLUG_BY_MUNI: Record<string, string> = {
  nc: 'northcastleny',
}

function apiBase(slug: string): string {
  return `https://${slug}.api.civicclerk.com`
}
function portalBase(slug: string): string {
  return `https://${slug}.portal.civicclerk.com`
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function pick(obj: any, keys: string[]): any {
  for (const k of keys) {
    if (obj && obj[k] != null) return obj[k]
  }
  return undefined
}

/** Map a CivicClerk category/committee name to our internal body key. */
function bodyKeyFromCategory(name: string): BodyKey | null {
  const n = (name || '').toLowerCase()
  if (/town board/.test(n)) return 'town_board'
  if (/planning/.test(n)) return 'planning'
  if (/zoning|z\.?b\.?a\.?|board of appeals/.test(n)) return 'zba'
  if (/architect/.test(n)) return 'arb'
  if (/conservation/.test(n)) return 'conservation'
  if (/open space/.test(n)) return 'open_space'
  if (/ethics/.test(n)) return 'ethics'
  if (/recreation|parks/.test(n)) return 'recreation'
  return null
}

/** Classify a file as an agenda or minutes from its type/name, else null. */
function fileKind(file: any): 'agenda' | 'minutes' | null {
  const hay = `${pick(file, ['type', 'fileType', 'categoryName', 'name', 'fileName']) ?? ''}`.toLowerCase()
  if (/agenda/.test(hay)) return 'agenda'
  if (/minute/.test(hay)) return 'minutes'
  return null
}

async function fetchEvents(api: string, top: number): Promise<any[]> {
  // Prefer files embedded via $expand; fall back to a plain list if the
  // deployment rejects the expand (older/newer OData surface).
  const queries = [
    `/v1/Events?$expand=publishedFiles&$orderby=startDateTime desc&$top=${top}`,
    `/v1/Events?$orderby=startDateTime desc&$top=${top}`,
  ]
  for (const q of queries) {
    const res = await politeFetch(`${api}${q}`, { headers: { Accept: 'application/json' } })
    if (!res.ok) continue
    const json = (await res.json()) as any
    const rows = Array.isArray(json) ? json : json.value
    if (Array.isArray(rows)) return rows
  }
  throw new Error('civicclerk: could not read /v1/Events')
}

async function* discover(
  slug: string,
  configuredBodies: Set<BodyKey>,
  since?: Date,
): AsyncGenerator<DiscoveredMeeting> {
  const api = apiBase(slug)
  const events = await fetchEvents(api, 100)

  for (const ev of events) {
    const eventId = pick(ev, ['id', 'eventId'])
    if (eventId == null) continue

    const category = `${pick(ev, ['categoryName', 'category', 'eventTypeName', 'committeeName']) ?? ''}`
    const bodyKey = bodyKeyFromCategory(category)
    // Only surface boards this municipality actually tracks.
    if (!bodyKey || !configuredBodies.has(bodyKey)) continue

    const startRaw = pick(ev, ['startDateTime', 'eventDate', 'startDate', 'date'])
    const scheduledAt = startRaw ? new Date(startRaw) : null
    if (!scheduledAt || isNaN(scheduledAt.getTime())) continue
    if (since && scheduledAt < since) continue

    const files: any[] = pick(ev, ['publishedFiles', 'eventFiles', 'files']) ?? []
    const externalUrls: DiscoveredMeeting['externalUrls'] = {}
    for (const f of files) {
      const kind = fileKind(f)
      if (!kind || externalUrls[kind]) continue
      const fileId = pick(f, ['fileId', 'id'])
      if (fileId == null) continue
      externalUrls[kind] = `${api}/v1/Meetings/GetMeetingFileStream(fileId=${fileId},plainText=false)`
    }

    yield {
      bodyKey,
      scheduledAt,
      title: `${pick(ev, ['eventName', 'name', 'title']) ?? category}`.trim() || undefined,
      sourceRef: `civicclerk:${eventId}`,
      sourceUrl: `${portalBase(slug)}/event/${eventId}/overview`,
      externalUrls,
      meta: { eventId, category },
    }
  }
}

const adapter: MunicipalAdapter = {
  key: 'nc-civicclerk',
  displayName: 'North Castle · CivicClerk portal',

  async *discoverMeetings(ctx: AdapterContext, since?: Date) {
    const slug = CIVICCLERK_SLUG_BY_MUNI[ctx.muniKey]
    if (!slug) throw new Error(`civicclerk adapter has no slug mapping for muni '${ctx.muniKey}'`)
    const configured = new Set<BodyKey>(ctx.bodies.map((b) => b.key))
    yield* discover(slug, configured, since)
  },

  async fetchAsset(url: string): Promise<FetchedAsset> {
    return politeFetchBuffer(url)
  },
}

export default adapter
