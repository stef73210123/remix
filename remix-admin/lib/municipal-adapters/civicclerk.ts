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
 * Classify a published file. Agenda and Agenda Packet both feed the same
 * 'agenda' slot downstream — when a meeting has both, the packet (agenda plus
 * the backup/supporting materials) is what a resident actually wants to read,
 * so it's preferred over the bare agenda; the UI still just labels it
 * "Agenda" either way (see the packet-preference in `discover()` below).
 * Other supplementary files are ignored (M1).
 */
function fileKind(file: any): 'agenda' | 'agenda_packet' | 'minutes' | null {
  const type = `${file?.type ?? ''}`.toLowerCase().trim()
  const name = `${file?.name ?? file?.fileName ?? ''}`.toLowerCase()
  if (type === 'minutes' || (!type && /minute/.test(name))) return 'minutes'
  if (type === 'agenda packet' || (!type && /agenda/.test(name) && /packet/.test(name))) return 'agenda_packet'
  if (type === 'agenda' || (!type && /agenda/.test(name) && !/packet/.test(name))) return 'agenda'
  return null
}

/**
 * Absolute PDF download URL for a published file.
 *
 * The relative `url` ("stream/{TENANT}/{guid}.pdf") is NOT servable under the
 * API host (404). CivicClerk streams published files by id via the documented
 * GetMeetingFileStream function endpoint, so prefer the fileId.
 */
function fileUrl(api: string, file: any): string | null {
  const fileId = pick(file, ['fileId', 'id'])
  if (fileId != null) return `${api}/v1/Meetings/GetMeetingFileStream(fileId=${fileId},plainText=false)`
  const raw = pick(file, ['url', 'streamUrl', 'downloadUrl'])
  return raw && /^https?:\/\//.test(raw) ? raw : null
}

/**
 * Read up to `top` events, newest first.
 *
 * The API ignores `$top` and always returns a fixed 15-row page, so a single
 * request only ever saw the newest couple of weeks — which is why minutes
 * (published weeks after the meeting they record, once the next meeting
 * approves them) were almost never picked up: by the time a meeting's minutes
 * appeared it had long since fallen out of that window. It does honour `$skip`,
 * so page through until we have `top` rows or the archive runs out.
 * `@odata.nextLink` is also offered but its skiptoken stops after two pages
 * when combined with the hasAgenda filter, so `$skip` is the reliable cursor.
 *
 * Ordering newest-first alone returns only upcoming meetings, which have no
 * agenda posted yet — so prefer meetings that actually HAVE an agenda,
 * most-recent first. Fall back progressively if the OData surface rejects a
 * filter/orderby. publishedFiles come inline on /v1/Events (no $expand).
 */
async function fetchPage(api: string, query: string): Promise<any[] | null> {
  const res = await politeFetch(`${api}${query}`, { headers: { Accept: 'application/json' } })
  if (!res.ok) return null
  const json = (await res.json()) as any
  const rows = Array.isArray(json) ? json : json.value
  return Array.isArray(rows) ? rows : null
}

/** Hard cap on requests per shape, so a portal that silently ignores `$skip`
 *  can never spin this into an unbounded crawl. */
const MAX_PAGES = 40

async function fetchEvents(api: string, top: number): Promise<any[]> {
  const hasAgenda = encodeURIComponent('hasAgenda eq true')
  const byDate = encodeURIComponent('startDateTime desc')
  const shapes = [
    `/v1/Events?$filter=${hasAgenda}&$orderby=${byDate}`,
    `/v1/Events?$filter=${hasAgenda}`,
    `/v1/Events?$orderby=${byDate}`,
    `/v1/Events?`,
  ]

  for (const shape of shapes) {
    const sep = shape.endsWith('?') ? '' : '&'
    const out: any[] = []
    const seenIds = new Set<unknown>()
    let pages = 0

    while (out.length < top && pages < MAX_PAGES) {
      const rows = await fetchPage(api, `${shape}${sep}$top=100&$skip=${out.length}`)
      pages++
      if (rows == null) break          // this shape isn't supported — try the next
      if (rows.length === 0) break     // end of the archive

      // If `$skip` were ignored we'd get the same first row forever; stop
      // rather than loop, and keep whatever we already have.
      const firstId = pick(rows[0], ['id', 'eventId'])
      if (firstId != null && seenIds.has(firstId)) break
      for (const r of rows) {
        const id = pick(r, ['id', 'eventId'])
        if (id != null) seenIds.add(id)
      }
      out.push(...rows)
    }

    if (out.length > 0) return out.slice(0, top)
  }

  // Last resort: whatever the bare collection endpoint gives us.
  const bare = await fetchPage(api, '/v1/Events')
  if (bare && bare.length > 0) return bare
  throw new Error('civicclerk: could not read /v1/Events')
}

async function* discover(
  slug: string,
  configuredBodies: Set<BodyKey>,
  since?: Date,
): AsyncGenerator<DiscoveredMeeting> {
  const api = apiBase(slug)
  // Deep enough to reach the whole published archive (~400 events back to
  // 2022) so the minutes backfill in lib/municipal/ingest.ts can see meetings
  // whose minutes were posted long after the meeting itself.
  const events = await fetchEvents(api, 400)

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
    let agendaPacketUrl: string | null = null
    let agendaPlainUrl: string | null = null
    for (const f of files) {
      const kind = fileKind(f)
      if (!kind) continue
      const url = fileUrl(api, f)
      if (!url) continue
      if (kind === 'agenda_packet') { if (!agendaPacketUrl) agendaPacketUrl = url }
      else if (kind === 'agenda') { if (!agendaPlainUrl) agendaPlainUrl = url }
      else if (!externalUrls[kind]) externalUrls[kind] = url
    }
    // Prefer the fuller agenda packet when the portal published one for this
    // meeting; fall back to the plain agenda otherwise.
    const agendaUrl = agendaPacketUrl || agendaPlainUrl
    if (agendaUrl) externalUrls.agenda = agendaUrl

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
