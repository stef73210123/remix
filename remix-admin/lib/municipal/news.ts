/**
 * Live local news via the Perigon News API (api.perigon.io/v1/all), scoped to
 * the town and its hamlets. Requires PERIGON_API_KEY in the environment;
 * returns null (caller falls back to rendering nothing) when the key is
 * absent or the fetch fails. The key is read from process.env only — never
 * hard-coded or logged.
 *
 * Armonk is also IBM's corporate headquarters, so a plain location search
 * floods with unrelated corporate/earnings coverage. Excluded via Perigon's
 * structured company filters (not a fragile keyword match), plus a
 * defensive keyword check as a second layer in case a mention slips through
 * without being tagged as IBM-company content.
 */

export interface NewsItem {
  key: string
  title: string
  source: string
  url: string
  summary: string
  publishedAt: string
}

// muniKey → the town + hamlet names to search as Perigon's structured
// location tags (not free-text keywords), so "North White Plains" doesn't
// also pull in unrelated White Plains city news.
const NEWS_GEO: Record<string, { cities: string[] }> = {
  nc: { cities: ['Armonk', 'Banksville', 'North White Plains', 'North Castle'] },
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

  const params = new URLSearchParams({
    apiKey: key,
    country: 'US',
    language: 'en',
    sortBy: 'pubDate',
    // A generous pool: Armonk is also IBM's HQ, so the raw result set skews
    // heavily toward corporate/earnings coverage that the IBM filter below
    // strips out — fetching only a handful risked filtering everything away.
    size: '50',
    showReprints: 'false',
    excludeCompanySymbol: 'IBM',
    excludeCompanyDomain: 'ibm.com',
  })
  for (const city of geo.cities) params.append('city', city)
  params.append('excludeLabel', 'Non-news')
  params.append('excludeLabel', 'Opinion')

  const res = await fetch(`https://api.perigon.io/v1/all?${params.toString()}`, {
    signal: AbortSignal.timeout(15000),
    next: { revalidate: 3600 },
  })
  if (!res.ok) throw new Error(`perigon HTTP ${res.status}`)
  const raw = (await res.json()) as Record<string, unknown>
  const data = raw as PerigonResponse
  const articles = Array.isArray(data.articles) ? data.articles : []
  // TEMP diagnostic: the query returns raw=0 in production for reasons not yet
  // understood (not the IBM filter — that only drops articles that made it
  // through). Log the response shape so the next deploy's logs reveal whether
  // Perigon is erroring under a different field, paginating differently, or
  // genuinely matching nothing.
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
