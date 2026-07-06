/**
 * CivicClerk (CivicPlus "Meeting Portal") adapter.
 *
 * North Castle publishes its board meetings on a CivicClerk portal, e.g.
 *   https://northcastleny.portal.civicclerk.com/event/1985/files/agenda/2464
 * NOT on the CivicPlus AgendaCenter that `nc-civicplus` scrapes — which is why
 * the AgendaCenter category ids returned the wrong board's documents.
 *
 * The portal SPA is backed by an OData API at `{slug}.api.civicclerk.com`.
 * `GET /v1/Events` returns events with (confirmed against the live response):
 *   - id, eventName, startDateTime, categoryName, isPublished
 *   - publishedFiles[]: { fileId, type ("Agenda" | "Agenda Packet" | "Minutes"),
 *       name, url ("stream/{TENANT}/{guid}.pdf") }
 *
 * Meetings are mapped to a board by matching `categoryName` against the
 * municipality's configured body keys, so no per-board numeric id is needed.
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
  for (const k of keys) if (obj && obj[k] != null) return obj[k]
  return undefined
}

/** Map a CivicClerk category name to our internal body key. */
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

/**
 * Classify a published file. Only the primary Agenda and Minutes are ingested;
 * "Agenda Packet" and other supplementary files are ignored (M1).
 */
function fileKind(file: any): 'agenda' | 'minutes' | null {
  const type = `${file?.type ?? ''}`.toLowerCase().trim()
  const name = `${file?.name ?? file?.fileName ?? ''}`.toLowerCase()
  if (type === 'minutes' || (!type && /minute/.test(name))) return 'minutes'
  if (type === 'agenda' || (!type && /agenda/.test(name) && !/packet/.test(name))) return 'agenda'
  return null
}

/** Resolve a published file's relative `url` to an absolute PDF download URL. */
function fileUrl(api: string, file: any): string | null {
  const raw = pick(file, ['url', 'streamUrl', 'downloadUrl'])
  if (raw) return /^https?:\/\//.test(raw) ? raw : `${api}/v1/${String(raw).replace(/^\/+/, '')}`
  const fileId = pick(file, ['fileId', 'id'])
  return fileId != null ? `${api}/v1/Meetings/GetMeetingFileStream(fileId=${fileId},plainText=false)` : null
}

async function fetchEvents(api: string, top: number): Promise<any[]> {
  // Ordering newest-first alone returns only upcoming meetings, which have no
  // agenda posted yet — so prefer meetings that actually HAVE an agenda,
  // most-recent first. Fall back progressively if the OData surface rejects a
  // filter/orderby. publishedFiles come inline on /v1/Events (no $expand).
  const hasAgenda = encodeURIComponent('hasAgenda eq true')
  const byDate = encodeURIComponent('startDateTime desc')
  for (const q of [
    `/v1/Events?$filter=${hasAgenda}&$orderby=${byDate}&$top=${top}`,
    `/v1/Events?$filter=${hasAgenda}&$top=${top}`,
    `/v1/Events?$orderby=${byDate}&$top=${top}`,
    `/v1/Events?$top=${top}`,
    `/v1/Events`,
  ]) {
    const res = await politeFetch(`${api}${q}`, { headers: { Accept: 'application/json' } })
    if (!res.ok) continue
    const json = (await res.json()) as any
    const rows = Array.isArray(json) ? json : json.value
    if (Array.isArray(rows) && rows.length > 0) return rows
  }
  throw new Error('civicclerk: could not read /v1/Events')
}

async function* discover(
  slug: string,
  configuredBodies: Set<BodyKey>,
  since?: Date,
): AsyncGenerator<DiscoveredMeeting> {
  const api = apiBase(slug)
  const events = await fetchEvents(api, 200)

  for (const ev of events) {
    const eventId = pick(ev, ['id', 'eventId'])
    if (eventId == null) continue

    // Only publicly-published meetings.
    const published = pick(ev, ['isPublished'])
    if (published != null && `${published}`.toLowerCase() !== 'published') continue

    const category = `${pick(ev, ['categoryName', 'eventCategoryName', 'category']) ?? ''}`
    const bodyKey = bodyKeyFromCategory(category)
    if (!bodyKey || !configuredBodies.has(bodyKey)) continue

    const startRaw = pick(ev, ['startDateTime', 'eventDate', 'startDate'])
    const scheduledAt = startRaw ? new Date(startRaw) : null
    if (!scheduledAt || isNaN(scheduledAt.getTime())) continue
    if (since && scheduledAt < since) continue

    const files: any[] = pick(ev, ['publishedFiles', 'eventFiles', 'files']) ?? []
    const externalUrls: DiscoveredMeeting['externalUrls'] = {}
    for (const f of files) {
      const kind = fileKind(f)
      if (!kind || externalUrls[kind]) continue
      const url = fileUrl(api, f)
      if (url) externalUrls[kind] = url
    }

    yield {
      bodyKey,
      scheduledAt,
      title: `${pick(ev, ['eventName', 'name', 'title']) ?? category}`.trim() || undefined,
      sourceRef: `civicclerk:${eventId}`,
      sourceUrl: `${portalBase(slug)}/event/${eventId}/overview`,
      externalUrls,
      meta: { eventId, category, agendaId: pick(ev, ['agendaId']) },
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
