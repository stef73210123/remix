/**
 * CivicPlus / CivicEngage AgendaCenter adapter.
 *
 * Target site pattern: `{host}/AgendaCenter/{BoardName}-{n}` where `n` is
 * a stable numeric id per body. Each body page lists meetings; each meeting
 * row exposes links to Agenda PDF, Minutes PDF, and often supporting docs.
 *
 * Prior art: biglocalnews/civic-scraper's `CivicPlusSite` — informed the
 * selectors here but implemented natively in TS + Cheerio to avoid a
 * cross-language toolchain in the Vercel runtime.
 *
 * Extraction strategy (M1):
 *   - Load AgendaCenter root once, discover per-body category pages
 *   - For each configured body, load its category page
 *   - Extract meeting rows via a small set of resilient selectors — fall
 *     back gracefully when the DOM changes
 *   - Yield DiscoveredMeeting objects; caller fetches assets lazily
 */
import * as cheerio from 'cheerio'
import type {
  AdapterContext,
  DiscoveredMeeting,
  FetchedAsset,
  MunicipalAdapter,
} from './base'
import { politeFetch, politeFetchBuffer } from './base'

const CIVICPLUS_HOSTS_BY_MUNI: Record<string, string> = {
  nc: 'https://www.northcastleny.com',
}

function pickHost(muniKey: string): string {
  const h = CIVICPLUS_HOSTS_BY_MUNI[muniKey]
  if (!h) throw new Error(`civicplus adapter has no host mapping for muni '${muniKey}'`)
  return h
}

async function fetchHtml(url: string): Promise<cheerio.CheerioAPI> {
  const res = await politeFetch(url)
  if (!res.ok) throw new Error(`civicplus fetch ${url}: HTTP ${res.status}`)
  return cheerio.load(await res.text())
}

/**
 * From a body's category page, parse meeting rows.
 * CivicPlus renders the "Previous Versions" table with anchors like:
 *   <a href="/AgendaCenter/ViewFile/Agenda/_04102024-799">...</a>
 *   <a href="/AgendaCenter/ViewFile/Minutes/_04102024-799">...</a>
 * where the id after the underscore encodes MMDDYYYY + row id.
 */
function parseMeetingsFromCategoryPage(
  $: cheerio.CheerioAPI,
  bodyKey: DiscoveredMeeting['bodyKey'],
  host: string,
): DiscoveredMeeting[] {
  const out: DiscoveredMeeting[] = []
  // Anchor href patterns tie an agenda + minutes to the same meeting row id.
  const seen = new Map<string, { agendaUrl?: string; minutesUrl?: string; date?: Date; title?: string }>()

  $('a[href*="/AgendaCenter/ViewFile/"]').each((_, a) => {
    const href = $(a).attr('href') ?? ''
    // Pattern: /AgendaCenter/ViewFile/{Kind}/_MMDDYYYY-rowId
    const m = href.match(/\/AgendaCenter\/ViewFile\/(Agenda|Minutes)\/_(\d{8})-(\d+)/i)
    if (!m) return
    const [, kind, mmddyyyy, rowId] = m
    const mo = mmddyyyy.slice(0, 2)
    const da = mmddyyyy.slice(2, 4)
    const yr = mmddyyyy.slice(4, 8)
    const date = new Date(`${yr}-${mo}-${da}T00:00:00Z`)
    const abs = href.startsWith('http') ? href : `${host}${href}`
    const entry = seen.get(rowId) ?? {}
    if (kind.toLowerCase() === 'agenda') entry.agendaUrl = abs
    if (kind.toLowerCase() === 'minutes') entry.minutesUrl = abs
    entry.date = date
    entry.title = $(a).text().trim() || entry.title
    seen.set(rowId, entry)
  })

  for (const [rowId, entry] of seen) {
    if (!entry.date) continue
    out.push({
      bodyKey,
      scheduledAt: entry.date,
      title: entry.title,
      sourceRef: `civicplus:${bodyKey}:${rowId}`,
      sourceUrl: entry.agendaUrl ?? entry.minutesUrl,
      externalUrls: {
        agenda: entry.agendaUrl,
        minutes: entry.minutesUrl,
      },
      meta: { rowId },
    })
  }

  return out
}

async function* discoverForBody(
  host: string,
  bodyKey: DiscoveredMeeting['bodyKey'],
  civicPlusAgendaId: number | undefined,
  since?: Date,
): AsyncGenerator<DiscoveredMeeting> {
  if (!civicPlusAgendaId) return
  // AgendaCenter category page format:
  //   {host}/AgendaCenter/{Slug}-{n}    (human-facing; needs slug)
  //   {host}/AgendaCenter/Search/?term=&CIDs={n}   (id-only lookup — more resilient)
  const url = `${host}/AgendaCenter/Search/?term=&CIDs=${civicPlusAgendaId}&startDate=&endDate=`
  const $ = await fetchHtml(url)
  const meetings = parseMeetingsFromCategoryPage($, bodyKey, host)
  for (const m of meetings) {
    if (since && m.scheduledAt < since) continue
    yield m
  }
}

const adapter: MunicipalAdapter = {
  key: 'nc-civicplus',
  displayName: 'North Castle · CivicPlus AgendaCenter',

  async *discoverMeetings(ctx: AdapterContext, since?: Date) {
    const host = pickHost(ctx.muniKey)
    for (const body of ctx.bodies) {
      try {
        for await (const m of discoverForBody(host, body.key, body.civicPlusAgendaId, since)) {
          yield m
        }
      } catch (e) {
        // One body failing shouldn't break the whole run.
        console.error(`[civicplus] body '${body.key}' failed:`, e)
      }
    }
  },

  async fetchAsset(url: string): Promise<FetchedAsset> {
    return politeFetchBuffer(url)
  },
}

export default adapter
