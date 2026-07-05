/**
 * WordPress + PDF scrape adapter — Town of Rockland shape.
 *
 * Rockland publishes meeting artifacts as PDFs uploaded to the WP media
 * library at `/wp-content/uploads/{YYYY}/{MM}/{filename}.pdf` and linked
 * from category pages (Town Board / Planning / ZBA).
 *
 * IMPORTANT: the `{YYYY}/{MM}` in the upload URL is the *upload* date,
 * NOT the meeting date. Never trust it — always extract the meeting date
 * from the PDF filename or (better) from the PDF content itself.
 *
 * File-naming conventions are wildly inconsistent — examples in the wild:
 *   October-17th-minutes.pdf
 *   Comprehensive-Meeting-Minutes-4.pdf
 *   REGULAR-MEETING-NOV7.pdf
 *   Area-Variance.ZBA-MInutes.-23-03-Rockland-Solar-LLC-10.17.2023-draft-1.pdf
 *
 * Strategy:
 *   1. Load the category hub / minutes page for each body
 *   2. Discover PDF links matching common minutes-page patterns
 *   3. Parse dates from PDF filenames using an ordered list of heuristics
 *   4. Fall back to "unknown date" placeholder — downstream text extraction
 *      can override with a date extracted from the PDF content
 */
import * as cheerio from 'cheerio'
import type {
  AdapterContext,
  DiscoveredMeeting,
  FetchedAsset,
  MunicipalAdapter,
} from './base'
import { politeFetch, politeFetchBuffer } from './base'

const WP_HOST_BY_MUNI: Record<string, string> = {
  rockland: 'https://www.townofrocklandny.com',
}

function pickHost(muniKey: string): string {
  const h = WP_HOST_BY_MUNI[muniKey]
  if (!h) throw new Error(`wp-pdf adapter has no host mapping for muni '${muniKey}'`)
  return h
}

const MONTHS: Record<string, number> = {
  jan: 1, january: 1,
  feb: 2, february: 2,
  mar: 3, march: 3,
  apr: 4, april: 4,
  may: 5,
  jun: 6, june: 6,
  jul: 7, july: 7,
  aug: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  oct: 10, october: 10,
  nov: 11, november: 11,
  dec: 12, december: 12,
}

/**
 * Try to extract a meeting date from a PDF filename. Returns null when
 * confidence is low — caller can fall back to WP upload folder as a
 * *last resort* (with a wide error bar).
 */
export function parseDateFromFilename(filename: string): Date | null {
  const clean = filename.replace(/\.pdf$/i, '').replace(/[-_.]+/g, ' ').toLowerCase()

  // MM/DD/YYYY or MM.DD.YYYY or MM-DD-YYYY
  const numeric = clean.match(/\b(\d{1,2})[\/\.\-\s](\d{1,2})[\/\.\-\s](\d{2,4})\b/)
  if (numeric) {
    const [, mo, da, yrRaw] = numeric
    const yr = yrRaw!.length === 2 ? 2000 + Number(yrRaw) : Number(yrRaw)
    if (yr >= 2000 && yr <= 2100) {
      const iso = new Date(Date.UTC(yr, Number(mo) - 1, Number(da)))
      if (!isNaN(iso.getTime())) return iso
    }
  }

  // Month-name + day + year: "october 17 2024", "nov 7 2019", "april 6 2016"
  const named = clean.match(/\b([a-z]{3,9})\s+(\d{1,2})(?:st|nd|rd|th)?\s+(\d{4})\b/)
  if (named) {
    const mo = MONTHS[named[1]!]
    const da = Number(named[2])
    const yr = Number(named[3])
    if (mo && da && yr) return new Date(Date.UTC(yr, mo - 1, da))
  }

  // Month-name + day, no year: try to infer year from another number in the string
  const nameDay = clean.match(/\b([a-z]{3,9})\s+(\d{1,2})(?:st|nd|rd|th)?\b/)
  const yr4 = clean.match(/\b(19|20)\d{2}\b/)
  if (nameDay && yr4) {
    const mo = MONTHS[nameDay[1]!]
    const da = Number(nameDay[2])
    const yr = Number(yr4[0])
    if (mo && da) return new Date(Date.UTC(yr, mo - 1, da))
  }

  return null
}

const BODY_HUB_PATHS: Record<string, { hub: string; body: DiscoveredMeeting['bodyKey']; label: string }[]> = {
  rockland: [
    {
      hub: '/town-board/meeting-minutes/',
      body: 'town_board',
      label: 'Town Board',
    },
    {
      hub: '/planning-board-2/planning-board-meeting-minutes/',
      body: 'planning',
      label: 'Planning Board',
    },
    { hub: '/zoning-board-of-appeals/', body: 'zba', label: 'ZBA' },
  ],
}

async function fetchHtml(url: string): Promise<cheerio.CheerioAPI> {
  const res = await politeFetch(url)
  if (!res.ok) throw new Error(`wp-pdf fetch ${url}: HTTP ${res.status}`)
  return cheerio.load(await res.text())
}

async function* discoverForHub(
  host: string,
  hub: { hub: string; body: DiscoveredMeeting['bodyKey']; label: string },
  since?: Date,
): AsyncGenerator<DiscoveredMeeting> {
  const url = `${host}${hub.hub}`
  const $ = await fetchHtml(url)

  const pdfs = new Set<string>()
  $('a[href*=".pdf"]').each((_, a) => {
    const href = $(a).attr('href') ?? ''
    if (!href) return
    const abs = href.startsWith('http') ? href : `${host}${href.startsWith('/') ? '' : '/'}${href}`
    pdfs.add(abs)
  })

  for (const pdfUrl of pdfs) {
    // Only consider URLs under wp-content/uploads (rules out header/theme links).
    if (!pdfUrl.includes('/wp-content/uploads/')) continue

    const filename = decodeURIComponent(pdfUrl.split('/').pop() ?? '')
    const parsedDate = parseDateFromFilename(filename)

    // If we can't parse a date at all, still yield with placeholder — better
    // to surface for human triage than drop.
    const scheduledAt = parsedDate ?? unknownDate(pdfUrl)
    if (since && parsedDate && parsedDate < since) continue

    yield {
      bodyKey: hub.body,
      scheduledAt,
      title: `${hub.label} — ${filename}`,
      sourceRef: `wp:${new URL(pdfUrl).pathname}`,
      sourceUrl: pdfUrl,
      externalUrls: {
        minutes: pdfUrl,        // best guess — many Rockland PDFs are minutes; verify from content later
      },
      meta: {
        filename,
        dateSource: parsedDate ? 'filename' : 'unknown',
      },
    }
  }
}

/**
 * Fallback: use WP upload folder (YYYY/MM) as a *very rough* date guess.
 * Marks the meeting as low-confidence so downstream text extraction can
 * correct it.
 */
function unknownDate(pdfUrl: string): Date {
  const m = pdfUrl.match(/\/wp-content\/uploads\/(\d{4})\/(\d{2})\//)
  if (m) {
    const yr = Number(m[1])
    const mo = Number(m[2])
    return new Date(Date.UTC(yr, mo - 1, 1))
  }
  return new Date(Date.UTC(1970, 0, 1))
}

const adapter: MunicipalAdapter = {
  key: 'rockland-wp',
  displayName: 'Rockland · WordPress + PDF',

  async *discoverMeetings(ctx: AdapterContext, since?: Date) {
    const host = pickHost(ctx.muniKey)
    const hubs = BODY_HUB_PATHS[ctx.muniKey] ?? []
    for (const hub of hubs) {
      try {
        for await (const m of discoverForHub(host, hub, since)) {
          yield m
        }
      } catch (e) {
        console.error(`[wp-pdf] hub '${hub.hub}' failed:`, e)
      }
    }
  },

  async fetchAsset(url: string): Promise<FetchedAsset> {
    return politeFetchBuffer(url)
  },
}

export default adapter
