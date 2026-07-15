/**
 * Live local news via the Perigon News API (api.perigon.io/v1/all), scoped to
 * the town and its hamlets. Requires PERIGON_API_KEY in the environment;
 * returns null (caller falls back to rendering nothing) when the key is
 * absent or the fetch fails. The key is read from process.env only — never
 * hard-coded or logged.
 *
 * Armonk is also IBM's corporate headquarters — and "ARMONK, N.Y." is IBM's
 * standard press-release dateline, so nearly every English-language US
 * article naming the town is IBM corporate/earnings coverage. A bare query
 * (no filters beyond the search term) confirmed live that Perigon has real
 * matches; the full query with `excludeCompanySymbol`/`excludeCompanyDomain`
 * applied came back with a genuine Perigon {numResults: 0}. Working theory:
 * those structured excludes match on company *mention*, not just by-line, so
 * combined with country=US/language=en they filtered out essentially every
 * Armonk-tagged article. Dropped them in favor of relying solely on the
 * post-fetch keyword check below — verify via production logs after deploy.
 */

export interface NewsItem {
  key: string
  title: string
  source: string
  url: string
  summary: string
  publishedAt: string
}

// muniKey → the town + hamlet names to search. Confirmed live (production
// runtime logs showed Perigon's own response as {status:200, numResults:0}, a
// genuine zero-match rather than an error) that Perigon's structured `city`
// filter doesn't resolve these: "North Castle" is a town, not a city, and
// "Banksville"/"North White Plains" are small hamlets unlikely to exist in
// Perigon's location taxonomy — so a `q` free-text search is used instead.
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

  // Perigon's boolean query syntax requires balanced parentheses around OR
  // groups (per their docs) — an earlier version without them came back with
  // a genuine {numResults: 0} even for country=US/language=en alone, despite
  // a bare single-term query proving the account/key works.
  const q = `(${geo.cities.map((c) => (c.includes(' ') ? `"${c}"` : c)).join(' OR ')})`
  const params = new URLSearchParams({
    apiKey: key,
    q,
    state: 'NY',
    country: 'US',
    language: 'en',
    sortBy: 'pubDate',
    // A generous pool: Armonk is also IBM's HQ, so the raw result set skews
    // heavily toward corporate/earnings coverage that the IBM filter below
    // strips out — fetching only a handful risked filtering everything away.
    size: '50',
    showReprints: 'false',
  })
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
  // TEMP diagnostic: both a structured `city` filter and a free-text `q`
  // search have independently come back with a genuine {numResults: 0} from
  // Perigon itself — so the location-targeting strategy isn't the issue.
  // Bisect against the rest of the query (excludes, sortBy, showReprints,
  // size, state) with a bare-minimum request, to see whether the account/key
  // can return ANY articles at all.
  if (articles.length === 0) {
    console.log(`[news] muni=${muniKey} EMPTY-DIAG keys=${Object.keys(raw).join(',')} body=${JSON.stringify(raw).slice(0, 500)}`)
    // Bisect round 3: rounds 1-2 proved the account/key works (bare single-
    // term query) and ruled out state/sortBy/size/showReprints/excludeLabel
    // (the unparenthesized multi-term OR + country/language alone was ALSO
    // zero). Now that the main query wraps the OR group in parentheses per
    // Perigon's documented boolean syntax, test that same parenthesized
    // string with a bare single-term OR (no quoting) to see whether
    // parenthesization was the fix, or whether even a trivial 2-term
    // parenthesized OR still zeroes out with country/language applied.
    try {
      const round3Params = new URLSearchParams({ apiKey: key, q: '(Armonk OR "North Castle")', country: 'US', language: 'en', size: '10' })
      const round3Res = await fetch(`https://api.perigon.io/v1/all?${round3Params.toString()}`, {
        signal: AbortSignal.timeout(15000),
      })
      const round3Raw = round3Res.ok ? await round3Res.json() : { httpError: round3Res.status }
      console.log(`[news] muni=${muniKey} ROUND3-DIAG status=${round3Res.status} body=${JSON.stringify(round3Raw).slice(0, 500)}`)
    } catch (e) {
      console.log(`[news] muni=${muniKey} ROUND3-DIAG threw: ${e instanceof Error ? e.message : String(e)}`)
    }
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
