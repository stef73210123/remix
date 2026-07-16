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
 * North Castle/Armonk — The Examiner News and lohud/The Journal News, plus a
 * wider set of local/regional outlets and magazines that also cover the town
 * (Patch, Daily Voice, The Inside Press/Inside Armonk, Bedford & New Canaan
 * Magazine, Connect to Northern Westchester, News 12 Westchester, Westchester
 * County Business Journal) — via Perigon's `source` domain filter, combined
 * with the same location search, restricted to the trailing 180 days (a full
 * six-month run, so the widget doesn't run dry between the hyperlocal
 * outlets' sparser posting cadence). Several of these are nationwide/regional
 * networks that cover many other towns too, so a post-fetch relevance check
 * requires one of the town/hamlet names to actually appear in the title or
 * summary (a Pleasantville Music Festival piece slipped through the
 * source-only filter previously). Every article, date, and link below still
 * comes straight from Perigon's live response — nothing here is hand-curated.
 *
 * Note: unlike The Examiner News/lohud (confirmed live to return North Castle
 * coverage), some of the added outlets are smaller/hyperlocal and haven't all
 * been bisected against a live Perigon response — Perigon's source index may
 * not crawl a given small magazine at all, in which case that domain just
 * quietly contributes zero articles rather than erroring (same failure mode
 * as an unindexed source anywhere else in this file).
 *
 * Pagination: live production logs showed raw=100 (our full requested page)
 * with 80 of those dropped as irrelevant — these source domains publish a lot
 * of general Westchester content, so the single most-recent 100 candidates
 * (Perigon sorts by pubDate) skew mostly irrelevant, and the ~20 that pass the
 * town-relevance check cluster in just the most recent ~2-3 months instead of
 * spanning the full 180-day window. Fetching only page 0 therefore silently
 * truncates the effective date range long before DAYS_BACK is reached — the
 * fix is to page deeper into Perigon's results (0-indexed `page` + `size`,
 * max size 100 per Perigon's docs) so genuinely-relevant articles further
 * back in the window get a chance to surface past the noise.
 */

export interface NewsItem {
  key: string
  title: string
  source: string
  url: string
  summary: string
  publishedAt: string
  category: string
  categoryIcon: NewsCategoryIcon
  /** Thumbnail/preview image, when Perigon returns one for the article. */
  imageUrl: string | null
}

export type NewsCategoryIcon =
  | 'landmark'
  | 'hard-hat'
  | 'shield'
  | 'graduation-cap'
  | 'trophy'
  | 'cloud-rain'
  | 'flower'
  | 'users'
  | 'newspaper'

// muniKey → the town + hamlet names to search, and the specific local outlets
// to restrict results to. The structured `city` location filter doesn't
// resolve these place names ("North Castle" is a town, not a city; the
// hamlets are too small for Perigon's location taxonomy — confirmed live via
// a genuine Perigon {numResults: 0}), so a free-text `q` search is used
// instead, narrowed to trusted local sources rather than country/language.
const NEWS_GEO: Record<string, { cities: string[]; sourceDomains: string[] }> = {
  nc: {
    cities: ['Armonk', 'Banksville', 'North White Plains', 'North Castle'],
    sourceDomains: [
      'theexaminernews.com',
      'lohud.com',
      'patch.com', // Armonk Patch
      'dailyvoice.com', // Armonk Daily Voice
      'theinsidepress.com', // Inside Armonk magazine
      'bedfordnewcanaanmag.com', // Bedford & New Canaan Magazine
      'connecttomag.com', // Connect to Northern Westchester magazine
      'bestversionmedia.com', // Armonk Neighbors — small advertorial-format magazine; may not be crawled by Perigon at all
      'news12.com', // News 12 Westchester — regional TV news
      'westfaironline.com', // Westchester County Business Journal — local business/development/finance coverage
    ],
  },
}

const DAYS_BACK = 180

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
  /** Perigon's documented field is `imageUrl`; `urlToImage`/`image` are
   *  defensive fallbacks in case a differently-shaped response ever appears,
   *  same defensive style as the url/date/summary fields above. */
  imageUrl?: string | null
  urlToImage?: string | null
  image?: string | null
}
interface PerigonResponse {
  articles?: PerigonArticle[]
}

const MENTIONS_IBM = /\bIBM\b/i
const PAGE_SIZE = 100
// How many pages of raw candidates to page through in the worst case. Each
// page is a real HTTP round-trip, so this is a cost/thoroughness tradeoff —
// 5 pages (up to 500 raw candidates) comfortably reaches back through a full
// 180-day window even with these sources' low (~20%) town-relevance hit rate.
const MAX_PAGES = 5

// Ordered so a more specific signal (e.g. "town hall") wins over a looser one
// (e.g. a hotel/townhouse project also being local "development" news).
const CATEGORY_RULES: { key: NewsCategoryIcon; label: string; test: RegExp }[] = [
  // Obituary and Weather are checked first: their signal phrases ("passed
  // away", "tornado") are unambiguous and should win even when the text also
  // happens to contain a word like "school" (e.g. "Fordham University School
  // of Business" in an obituary's bio). Schools is checked near the end for
  // the same reason — "school" is a common substring that otherwise steals
  // articles that are really about something else.
  { key: 'flower', label: 'Obituary', test: /\bobituary\b|passed away|survived by|in loving memory/i },
  { key: 'cloud-rain', label: 'Weather', test: /\btornado\b|\bstorm\b|\bweather\b|heat wave|\bsnow\b|\bflood(ing)?\b|hurricane/i },
  { key: 'landmark', label: 'Government', test: /\btown (hall|board)\b|planning board|zoning board|\bzoning\b|\bbudget\b|\btax(es)?\b|supervisor|councilm(a|e)n|councilwoman|comptroller|\bmunicipal\b|\bordinance\b|\belection\b/i },
  { key: 'shield', label: 'Public Safety', test: /\bpolice\b|sheriff|\barrest(ed)?\b|\bcrime\b|sentenc(ed|ing)|stabb|fire department|firefighter|\bcrash\b|\baccident\b/i },
  { key: 'trophy', label: 'Sports', test: /\bgolf\b|\bsoccer\b|\bsoftball\b|\bbasketball\b|\bfootball\b|\blacrosse\b|championship|tournament|\bathlete(s)?\b|\bcoach\b/i },
  { key: 'hard-hat', label: 'Development', test: /\bdevelopment\b|\bconstruction\b|\bproject\b|townhouse|\bcondo(s)?\b|\bhotel\b|\bhousing\b|rezon|\bpermit(s)?\b/i },
  { key: 'users', label: 'Community', test: /\bfestival\b|\bconcert\b|\blibrary\b|\bchurch\b|synagogue|\bparade\b|\bfair\b|\bnonprofit\b/i },
  { key: 'graduation-cap', label: 'Schools', test: /\bschool\b|\bstudent(s)?\b|school district|superintendent|\bPTA\b|classroom/i },
]

function classify(title: string, summary: string): { category: string; categoryIcon: NewsCategoryIcon } {
  const text = `${title} ${summary}`
  for (const rule of CATEGORY_RULES) {
    if (rule.test.test(text)) return { category: rule.label, categoryIcon: rule.key }
  }
  return { category: 'News', categoryIcon: 'newspaper' }
}

function mentionsTown(text: string, cities: string[]): boolean {
  return cities.some((c) => text.toLowerCase().includes(c.toLowerCase()))
}

export async function fetchLocalNews(muniKey: string): Promise<NewsItem[] | null> {
  const key = process.env.PERIGON_API_KEY
  const geo = NEWS_GEO[muniKey]
  if (!key || !geo) return null

  // Perigon's boolean query syntax requires balanced parentheses around OR
  // groups (per their docs).
  const q = `(${geo.cities.map((c) => (c.includes(' ') ? `"${c}"` : c)).join(' OR ')})`
  const from = new Date(Date.now() - DAYS_BACK * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const baseParams = new URLSearchParams({
    apiKey: key,
    q,
    from,
    sortBy: 'pubDate',
    size: String(PAGE_SIZE),
  })
  for (const domain of geo.sourceDomains) baseParams.append('source', domain)

  // Page through up to MAX_PAGES (0-indexed, per Perigon's docs) rather than
  // taking just the first page: these source domains publish a lot of
  // general Westchester content alongside North Castle coverage, so the
  // single most-recent page of raw candidates skews mostly irrelevant, and
  // stopping there silently truncated the effective date range to just the
  // first couple of months instead of the full 180-day window. Stops early
  // once a page comes back short of a full page (no more results) or empty.
  const allArticles: PerigonArticle[] = []
  let pagesFetched = 0
  for (let page = 0; page < MAX_PAGES; page++) {
    const params = new URLSearchParams(baseParams)
    params.set('page', String(page))
    const res = await fetch(`https://api.perigon.io/v1/all?${params.toString()}`, {
      signal: AbortSignal.timeout(15000),
      next: { revalidate: 3600 },
    })
    if (!res.ok) throw new Error(`perigon HTTP ${res.status}`)
    const raw = (await res.json()) as Record<string, unknown>
    const data = raw as PerigonResponse
    const pageArticles = Array.isArray(data.articles) ? data.articles : []
    pagesFetched++
    if (pageArticles.length === 0) {
      if (page === 0) {
        console.log(`[news] muni=${muniKey} EMPTY-DIAG keys=${Object.keys(raw).join(',')} body=${JSON.stringify(raw).slice(0, 500)}`)
      }
      break
    }
    allArticles.push(...pageArticles)
    if (pageArticles.length < PAGE_SIZE) break
  }

  let droppedIbm = 0
  let droppedMalformed = 0
  let droppedIrrelevant = 0
  const seenUrls = new Set<string>()
  const items: NewsItem[] = []
  for (const a of allArticles) {
    const title = a.title?.trim()
    const url = a.url || a.link
    if (!title || !url) { droppedMalformed++; continue }
    // Belt-and-suspenders against a paginated request unexpectedly repeating
    // a prior page's results (e.g. an ignored `page` param) — de-dupe by URL
    // rather than trust that every page is distinct.
    if (seenUrls.has(url)) continue
    seenUrls.add(url)
    const summary = (a.summary || a.description || '').trim()
    if (MENTIONS_IBM.test(title) || MENTIONS_IBM.test(summary)) { droppedIbm++; continue }
    // The source-domain filter alone isn't town-specific — both outlets cover
    // many other Westchester towns, so require an actual mention of this
    // town/hamlet in the title or summary.
    if (!mentionsTown(title, geo.cities) && !mentionsTown(summary, geo.cities)) { droppedIrrelevant++; continue }
    const source = typeof a.source === 'string' ? a.source : a.source?.name || a.source?.domain || 'News'
    const rawImage = a.imageUrl || a.urlToImage || a.image || null
    const imageUrl = rawImage && /^https?:\/\//i.test(rawImage) ? rawImage : null
    items.push({ key: url, title, source, url, summary, publishedAt: a.pubDate || a.date || '', imageUrl, ...classify(title, summary) })
  }
  console.log(`[news] muni=${muniKey} raw=${allArticles.length} pages=${pagesFetched} dropped(ibm=${droppedIbm}, malformed=${droppedMalformed}, irrelevant=${droppedIrrelevant}) kept=${items.length}`)
  return items
}
