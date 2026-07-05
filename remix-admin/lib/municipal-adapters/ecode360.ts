/**
 * eCode360 (General Code) adapter — codified zoning & town code.
 *
 * URL pattern:
 *   https://ecode360.com/{bookId}
 *   https://ecode360.com/{sectionId}
 *
 * The DOM is stable and semantic — chapters render as `<section>` with
 * `data-guid` attributes, and section text sits inside `<div class="content">`.
 *
 * For M1 we implement `fetchCodeChapters` at a coarse granularity (one
 * chapter = one document row). Section-level granularity can layer on
 * later without schema change.
 */
import * as cheerio from 'cheerio'
import type {
  AdapterContext,
  DiscoveredCodeChapter,
  FetchedAsset,
  MunicipalAdapter,
} from './base'
import { politeFetch, politeFetchBuffer } from './base'

async function fetchHtml(url: string): Promise<cheerio.CheerioAPI> {
  const res = await politeFetch(url)
  if (!res.ok) throw new Error(`ecode360 fetch ${url}: HTTP ${res.status}`)
  return cheerio.load(await res.text())
}

const adapter: MunicipalAdapter = {
  key: 'ecode360',
  displayName: 'General Code · eCode360',

  // Meeting discovery is not this adapter's job.
  async *discoverMeetings(_ctx: AdapterContext) {},

  async fetchAsset(url: string): Promise<FetchedAsset> {
    return politeFetchBuffer(url)
  },

  async *fetchCodeChapters(_ctx: AdapterContext, bookId: string) {
    const root = `https://ecode360.com/${bookId}`
    const $ = await fetchHtml(root)

    // The root TOC lists chapters as anchors — we grep the ones that look
    // like chapter links (numeric id path).
    const seen = new Set<string>()
    const chapters: Array<{ title: string; sourceUrl: string; chapterNumber?: string }> = []

    $('a[href^="/"]').each((_, a) => {
      const href = $(a).attr('href') ?? ''
      const label = $(a).text().trim()
      if (!href || !label) return
      // Chapter links look like `/{sectionId}` where sectionId is numeric
      // for numeric books, alphanumeric for text-keyed books (e.g. RO1679).
      const m = href.match(/^\/([A-Za-z0-9]+)$/)
      if (!m) return
      if (m[1] === bookId) return
      if (seen.has(m[1]!)) return
      seen.add(m[1]!)
      const chapterNumMatch = label.match(/Chapter\s+(\d+[A-Za-z]?)/i)
      chapters.push({
        title: label,
        sourceUrl: `https://ecode360.com${href}`,
        chapterNumber: chapterNumMatch?.[1],
      })
    })

    for (const ch of chapters) {
      try {
        const $c = await fetchHtml(ch.sourceUrl)
        // Content pane — resilient selector list
        const content =
          $c('div#content, div.content, article, main').first().text().trim() ||
          $c('body').text().trim()
        yield {
          title: ch.title,
          sourceUrl: ch.sourceUrl,
          text: content,
          chapterNumber: ch.chapterNumber,
        } satisfies DiscoveredCodeChapter
      } catch (e) {
        console.error(`[ecode360] chapter fetch failed for ${ch.sourceUrl}:`, e)
      }
    }
  },
}

export default adapter
