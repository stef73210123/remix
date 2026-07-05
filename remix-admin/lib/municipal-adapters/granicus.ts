/**
 * Granicus adapter — video + agenda linkage.
 *
 * URL patterns (canonical Granicus PHP endpoints):
 *   {subdomain}.granicus.com/ViewPublisher.php?view_id={n}   -- list of clips
 *   {subdomain}.granicus.com/MediaPlayer.php?view_id={n}&clip_id={c}
 *   {subdomain}.granicus.com/GeneratedAgendaViewer.php?view_id={n}&clip_id={c}
 *   {subdomain}.granicus.com/MetaViewer.php?view_id={n}&event_id={e}&meta_id={m}
 *
 * The listing page (ViewPublisher.php) renders a table of clips per
 * calendar year; each clip row exposes links to Agenda PDF, Minutes PDF,
 * and the media player. We parse that HTML.
 *
 * The MediaPlayer page holds the MP4 direct URL + any captions asset URL.
 * Caption download is opportunistic — probe for `.vtt` in the DOM.
 */
import * as cheerio from 'cheerio'
import type {
  AdapterContext,
  DiscoveredMeeting,
  FetchedAsset,
  MunicipalAdapter,
} from './base'
import { politeFetch, politeFetchBuffer } from './base'

const GRANICUS_HOST_BY_MUNI: Record<string, string> = {
  nc: 'https://northcastleny.granicus.com',
}

function pickHost(muniKey: string): string {
  const h = GRANICUS_HOST_BY_MUNI[muniKey]
  if (!h) throw new Error(`granicus adapter has no host mapping for muni '${muniKey}'`)
  return h
}

function absoluteUrl(host: string, href: string): string {
  if (!href) return href
  if (href.startsWith('http')) return href
  if (href.startsWith('//')) return `https:${href}`
  if (href.startsWith('/')) return `${host}${href}`
  return `${host}/${href}`
}

/**
 * ViewPublisher.php renders one table row per clip. Fields we care about:
 *   - clip_id (parsed from MediaPlayer.php href)
 *   - event_id (parsed from MetaViewer.php href for agenda / minutes)
 *   - date column (typically column 0 or 1, formatted M/D/YYYY)
 *   - title / body name (usually the row's first cell text)
 *   - agenda / minutes anchors (MetaViewer.php)
 *   - video anchor (MediaPlayer.php)
 *
 * Small towns' Granicus layouts drift; we grep rows for the patterns we
 * need rather than binding to strict column positions.
 */
function parseClipsFromViewPublisher(
  html: string,
  host: string,
  defaultBodyKey: DiscoveredMeeting['bodyKey'],
): DiscoveredMeeting[] {
  const $ = cheerio.load(html)
  const out: DiscoveredMeeting[] = []

  $('tr').each((_, tr) => {
    const $tr = $(tr)
    const rowText = $tr.text()

    // Extract clip_id + event_id from anchor hrefs in this row.
    let clipId: number | undefined
    let eventId: number | undefined
    let agendaUrl: string | undefined
    let minutesUrl: string | undefined
    let videoUrl: string | undefined

    $tr.find('a').each((_, a) => {
      const href = $(a).attr('href') ?? ''
      const linkText = $(a).text().trim().toLowerCase()

      const clipMatch = href.match(/clip_id=(\d+)/)
      if (clipMatch) clipId = clipMatch[1] ? Number(clipMatch[1]) : clipId

      const eventMatch = href.match(/event_id=(\d+)/)
      if (eventMatch) eventId = eventMatch[1] ? Number(eventMatch[1]) : eventId

      if (/MediaPlayer\.php/i.test(href)) {
        videoUrl = absoluteUrl(host, href)
      }
      if (/MetaViewer\.php/i.test(href) && /agenda/i.test(linkText)) {
        agendaUrl = absoluteUrl(host, href)
      }
      if (/MetaViewer\.php/i.test(href) && /minutes/i.test(linkText)) {
        minutesUrl = absoluteUrl(host, href)
      }
    })

    if (!clipId) return

    // Extract a date from the row text: M/D/YYYY or MM/DD/YYYY
    const dateMatch = rowText.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/)
    if (!dateMatch) return
    const [, mo, da, yr] = dateMatch
    const date = new Date(`${yr}-${mo!.padStart(2, '0')}-${da!.padStart(2, '0')}T00:00:00Z`)

    // Try to infer body from first cell — Town Board, Planning, ZBA, etc.
    const firstCellText = $tr.find('td').first().text().trim()
    const bodyKey = inferBodyKey(firstCellText) ?? defaultBodyKey

    out.push({
      bodyKey,
      scheduledAt: date,
      title: firstCellText || undefined,
      sourceRef: `granicus:clip:${clipId}`,
      sourceUrl: videoUrl ?? agendaUrl ?? minutesUrl,
      externalUrls: {
        video_mp4: videoUrl,     // MediaPlayer landing; MP4 direct link resolved lazily
        agenda: agendaUrl,
        minutes: minutesUrl,
      },
      meta: { clipId, eventId },
    })
  })

  return out
}

function inferBodyKey(s: string): DiscoveredMeeting['bodyKey'] | undefined {
  const t = s.toLowerCase()
  if (t.includes('town board')) return 'town_board'
  if (t.includes('planning')) return 'planning'
  if (t.includes('zoning board of appeals') || /\bzba\b/.test(t)) return 'zba'
  if (t.includes('architectural') || /\barb\b/.test(t)) return 'arb'
  if (t.includes('conservation')) return 'conservation'
  if (t.includes('open space')) return 'open_space'
  if (t.includes('ethics')) return 'ethics'
  if (t.includes('recreation')) return 'recreation'
  return undefined
}

/**
 * From a MediaPlayer.php landing page, resolve the direct MP4 URL and
 * any captions asset. Granicus embeds these as `<video src>` or in a JS
 * `mp4URL` variable; we grep both.
 */
export async function resolveMediaUrls(mediaPlayerUrl: string): Promise<{
  mp4Url?: string
  captionsUrl?: string
}> {
  const res = await politeFetch(mediaPlayerUrl)
  if (!res.ok) return {}
  const html = await res.text()
  const mp4 =
    html.match(/https?:\/\/[^\s"'<>]+\.mp4[^\s"'<>]*/i)?.[0] ??
    html.match(/mp4URL\s*=\s*['"]([^'"]+)['"]/i)?.[1]
  const vtt =
    html.match(/https?:\/\/[^\s"'<>]+\.vtt[^\s"'<>]*/i)?.[0] ??
    html.match(/DownloadFile\.php\?[^"']+type=x-[24]/i)?.[0]
  return {
    mp4Url: mp4,
    captionsUrl: vtt,
  }
}

const adapter: MunicipalAdapter = {
  key: 'nc-granicus',
  displayName: 'North Castle · Granicus',

  async *discoverMeetings(ctx: AdapterContext, since?: Date) {
    const host = pickHost(ctx.muniKey)
    // Every configured body may point at the same view_id in Granicus
    // (view_id=2 for NC). Dedupe view_ids, then parse each one.
    const viewIds = new Set<number>()
    for (const b of ctx.bodies) {
      if (b.granicusViewId) viewIds.add(b.granicusViewId)
    }

    for (const viewId of viewIds) {
      const url = `${host}/ViewPublisher.php?view_id=${viewId}`
      const res = await politeFetch(url)
      if (!res.ok) {
        console.error(`[granicus] ViewPublisher ${viewId} → HTTP ${res.status}`)
        continue
      }
      const html = await res.text()
      const clips = parseClipsFromViewPublisher(html, host, 'town_board')
      for (const m of clips) {
        if (since && m.scheduledAt < since) continue
        yield m
      }
    }
  },

  async fetchAsset(url: string): Promise<FetchedAsset> {
    return politeFetchBuffer(url)
  },
}

export default adapter
