/**
 * Live local news via the Perigon News API (api.perigon.io/v1/all), scoped to
 * the town and its hamlets. Requires PERIGON_API_KEY in the environment;
 * returns null (caller falls back to rendering nothing) when the key is
 * absent or the fetch fails. The key is read from process.env only — never
 * hard-coded or logged.
 *
 * Armonk is also IBM's corporate headquarters — and "ARMONK, N.Y." is IBM's
 * standard press-release dateline, so nearly every English-language US
 * article naming the town (once scoped by country=US/language=en) turned out
 * to be IBM corporate/earnings coverage; multiple rounds of live bisection
 * (see git history on this file) ruled out the account/key, the location
 * query syntax, and every other param — the broad country+language search
 * itself just doesn't surface any non-IBM coverage of this specific town.
 *
 * Scoped instead to known hyperlocal Westchester outlets that reliably cover
 * North Castle/Armonk (The Examiner News, lohud/The Journal News) via
 * Perigon's `source` domain filter, combined with the same location search.
 * Every article, date, and link below still comes straight from Perigon's
 * live response — nothing here is hand-curated.
 */

export interface NewsItem {
  key: string
  title: string
  source: string
  url: string
  summary: string
  publishedAt: string
}

// muniKey → the town + hamlet names to search, and the specific local outlets
// to restrict results to. The structured `city` location filter doesn't
// resolve these place names ("North Castle" is a town, not a city; the
// hamlets are too small for Perigon's location taxonomy — confirmed live via
// a genuine Perigon {numResults: 0}), so a free-text `q` search is used
// instead, narrowed to trusted local sources rather than country/language.
const NEWS_GEO: Record<string, { cities: string[]; sourceDomains: string[] }> = {
  nc: {
    cities: ['Armonk', 'Banksville', 'North White Plains', 'North Castle'],
    sourceDomains: ['theexaminernews.com', 'lohud.com'],
  },
}

interface PerigonSource {
  name?: string
  domain?: string
}
interface PerigonArticle {
  title?: string
  url?: string
  link?: string
  pubDate?: string
  date?: string
  description?: string
  summary?: string
  source?: PerigonSource | string
}
interface PerigonResponse {
  articles?: PerigonArticle[]
}

const MAX_ITEMS = 12
const MENTIONS_IBM = /\bIBM\b/i

export async function fetchLocalNews(muniKey: string): Promise<NewsItem[] | null> {
  const key = process.env.PERIGON_API_KEY
  const geo = NEWS_GEO[muniKey]
  if (!key || !geo) return null

  // Perigon's boolean query syntax requires balanced parentheses around OR
  // groups (per their docs).
  const q = `(${geo.cities.map((c) => (c.includes(' ') ? `"${c}"` : c)).join(' OR ')})`
  const params = new URLSearchParams({
    apiKey: key,
    q,
    sortBy: 'pubDate',
    size: '20',
  })
  for (const domain of geo.sourceDomains) params.append('source', domain)

  const res = await fetch(`https://api.perigon.io/v1/all?${params.toString()}`, {
    signal: AbortSignal.timeout(15000),
    next: { revalidate: 3600 },
  })
  if (!res.ok) throw new Error(`perigon HTTP ${res.status}`)
  const raw = (await res.json()) as Record<string, unknown>
  const data = raw as PerigonResponse
  const articles = Array.isArray(data.articles) ? data.articles : []
  // TEMP diagnostic: earlier rounds (see git history) proved the account/key
  // works and ruled out the location-query syntax as the cause of the prior
  // empty results — this logs the raw shape in case source-domain scoping is
  // also empty, so the next deploy's logs show why.
  if (articles.length === 0) {
    console.log(`[news] muni=${muniKey} EMPTY-DIAG keys=${Object.keys(raw).join(',')} body=${JSON.stringify(raw).slice(0, 500)}`)
  }

  let droppedIbm = 0
  let droppedMalformed = 0
  const items: NewsItem[] = []
  for (const a of articles) {
    const title = a.title?.trim()
    const url = a.url || a.link
    if (!title || !url) { droppedMalformed++; continue }
    const summary = (a.summary || a.description || '').trim()
    if (MENTIONS_IBM.test(title) || MENTIONS_IBM.test(summary)) { droppedIbm++; continue }
    const source = typeof a.source === 'string' ? a.source : a.source?.name || a.source?.domain || 'News'
    items.push({ key: url, title, source, url, summary, publishedAt: a.pubDate || a.date || '' })
    if (items.length >= MAX_ITEMS) break
  }
  console.log(`[news] muni=${muniKey} raw=${articles.length} dropped(ibm=${droppedIbm}, malformed=${droppedMalformed}) kept=${items.length}`)
  return items
}
