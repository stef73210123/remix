/**
 * Live demographics from the U.S. Census ACS 5-year API.
 *
 * Queries county-subdivision (town/MCD) rows for the town's county and matches
 * by name, so no exact cousub FIPS is needed. Returns the same TownDemographics
 * shape as the static fallback. Requires CENSUS_API_KEY in the environment;
 * returns null (caller falls back) when the key is absent or the fetch fails.
 *
 * The key is read from process.env only — never hard-coded or logged.
 */
import type { TownDemographics, IncomeBracket, HousingType, HomeValueBracket, DemoSeriesPoint } from './demographics'

const ACS_YEAR = '2022'
// ACS 5-year vintages to pull for the trend sparklines (oldest → newest).
const SERIES_YEARS = [2018, 2019, 2020, 2021, 2022]

// muniKey → Census geography (state + county FIPS) and the town name to match.
const CENSUS_GEO: Record<string, { state: string; county: string; nameStartsWith: string }> = {
  nc: { state: '36', county: '119', nameStartsWith: 'North Castle' }, // Westchester Co, NY
  rockland: { state: '36', county: '105', nameStartsWith: 'Rockland' }, // Sullivan Co, NY
}

// B19001 income brackets 002..017 (<$10k … $200k+).
const B19001 = Array.from({ length: 16 }, (_, i) => `B19001_${String(i + 2).padStart(3, '0')}E`)
// B25024 units-in-structure 001..011 (total, 1-detached … boat/RV).
const B25024 = Array.from({ length: 11 }, (_, i) => `B25024_${String(i + 1).padStart(3, '0')}E`)
// B25075 value of owner-occupied units 001..027 (total, <$10k … $2,000,000+).
const B25075 = Array.from({ length: 27 }, (_, i) => `B25075_${String(i + 1).padStart(3, '0')}E`)
const VARS = [
  'NAME',
  'B01003_001E', // population
  'B19013_001E', // median household income
  'B01002_001E', // median age
  'B11001_001E', // households
  'B25010_001E', // average household size (occupied units)
  'B25003_001E', // occupied units
  'B25003_002E', // owner-occupied
  'B25077_001E', // median home value
  ...B19001,
  ...B25024,
  ...B25075,
]

/** ACS null sentinels are large negatives; coerce to a safe number. */
function num(v: string | undefined): number {
  const n = Number(v)
  return isFinite(n) && n > -100000 ? n : 0
}

export async function fetchCensusDemographics(
  muniKey: string,
  townName: string,
): Promise<TownDemographics | null> {
  const key = process.env.CENSUS_API_KEY
  const geo = CENSUS_GEO[muniKey]
  if (!key || !geo) return null

  const url =
    `https://api.census.gov/data/${ACS_YEAR}/acs/acs5?get=${VARS.join(',')}` +
    `&for=county%20subdivision:*&in=state:${geo.state}%20county:${geo.county}&key=${key}`

  const res = await fetch(url, { signal: AbortSignal.timeout(15000) })
  if (!res.ok) throw new Error(`census HTTP ${res.status}`)
  const table = (await res.json()) as string[][]
  if (!Array.isArray(table) || table.length < 2) return null

  const header = table[0]
  const idx = (name: string) => header.indexOf(name)
  const nameI = idx('NAME')
  const row = table.slice(1).find((r) => (r[nameI] || '').startsWith(geo.nameStartsWith))
  if (!row) return null

  const get = (v: string) => num(row[idx(v)])

  const households = get('B11001_001E')
  const occupied = get('B25003_001E')
  const owner = get('B25003_002E')
  const bTotal = get('B19001_001E') || B19001.reduce((s, v) => s + get(v), 0)

  const sum = (vs: string[]) => vs.reduce((s, v) => s + get(v), 0)
  const pct = (n: number) => (bTotal > 0 ? Math.round((n / bTotal) * 100) : 0)
  const b = (i: number) => `B19001_${String(i).padStart(3, '0')}E`
  const incomeBrackets: IncomeBracket[] = [
    { label: '<$50K', pct: pct(sum([2, 3, 4, 5, 6, 7, 8, 9, 10].map(b))) },
    { label: '$50–100K', pct: pct(sum([11, 12, 13].map(b))) },
    { label: '$100–150K', pct: pct(sum([14, 15].map(b))) },
    { label: '$150–200K', pct: pct(get(b(16))) },
    { label: '$200K+', pct: pct(get(b(17))) },
  ]

  // Housing units by structure type (B25024), grouped into readable buckets.
  const h = (i: number) => `B25024_${String(i).padStart(3, '0')}E`
  const hTotal = get(h(1)) || sum([2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(h))
  const hPct = (n: number) => (hTotal > 0 ? Math.round((n / hTotal) * 100) : 0)
  const housingTypes: HousingType[] = [
    { label: 'Single-family', pct: hPct(sum([2, 3].map(h))) },
    { label: '2–4 units', pct: hPct(sum([4, 5].map(h))) },
    { label: '5–19 units', pct: hPct(sum([6, 7].map(h))) },
    { label: '20+ units', pct: hPct(sum([8, 9].map(h))) },
    { label: 'Mobile / other', pct: hPct(sum([10, 11].map(h))) },
  ].filter((t) => t.pct > 0)

  // Owner-occupied value distribution (B25075), grouped into readable ranges.
  // 002..022 = under $500k, 023 = $500–750k, 024 = $750k–1M, 025 = $1–1.5M,
  // 026 = $1.5–2M, 027 = $2M+.
  const v = (i: number) => `B25075_${String(i).padStart(3, '0')}E`
  const vTotal = get(v(1)) || sum(Array.from({ length: 26 }, (_, i) => v(i + 2)))
  const vPct = (n: number) => (vTotal > 0 ? Math.round((n / vTotal) * 100) : 0)
  const under500 = sum(Array.from({ length: 21 }, (_, i) => v(i + 2))) // 002..022
  const homeValueBrackets: HomeValueBracket[] = [
    { label: '<$500K', pct: vPct(under500) },
    { label: '$500–750K', pct: vPct(get(v(23))) },
    { label: '$750K–1M', pct: vPct(get(v(24))) },
    { label: '$1–1.5M', pct: vPct(get(v(25))) },
    { label: '$1.5–2M', pct: vPct(get(v(26))) },
    { label: '$2M+', pct: vPct(get(v(27))) },
  ].filter((b) => b.pct > 0)

  const avgHouseholdSize = get('B25010_001E')

  return {
    townKey: muniKey,
    townName,
    approximate: false,
    source: `U.S. Census ACS 5-year (${ACS_YEAR})`,
    population: get('B01003_001E'),
    households,
    medianIncomeUsd: get('B19013_001E'),
    medianAgeYears: get('B01002_001E'),
    ownerOccupiedPct: occupied > 0 ? Math.round((owner / occupied) * 100) : 0,
    incomeBrackets,
    medianHomeValueUsd: get('B25077_001E') || undefined,
    housingTypes: housingTypes.length ? housingTypes : undefined,
    homeValueBrackets: homeValueBrackets.length ? homeValueBrackets : undefined,
    avgHouseholdSizePeople: avgHouseholdSize > 0 ? avgHouseholdSize : undefined,
  }
}

/** One ACS 5-year vintage's population / median income / median home value for
 *  the town, or null if that year or the row is unavailable. */
async function fetchYearPoint(
  year: number,
  key: string,
  geo: { state: string; county: string; nameStartsWith: string },
): Promise<DemoSeriesPoint | null> {
  const vars = ['NAME', 'B01003_001E', 'B19013_001E', 'B25077_001E', 'B01002_001E', 'B11001_001E']
  const url =
    `https://api.census.gov/data/${year}/acs/acs5?get=${vars.join(',')}` +
    `&for=county%20subdivision:*&in=state:${geo.state}%20county:${geo.county}&key=${key}`
  const res = await fetch(url, { signal: AbortSignal.timeout(12000) })
  if (!res.ok) return null
  const table = (await res.json()) as string[][]
  if (!Array.isArray(table) || table.length < 2) return null
  const header = table[0]
  const idx = (n: string) => header.indexOf(n)
  const row = table.slice(1).find((r) => (r[idx('NAME')] || '').startsWith(geo.nameStartsWith))
  if (!row) return null
  const g = (v: string) => num(row[idx(v)])
  return {
    year,
    population: g('B01003_001E'),
    medianIncomeUsd: g('B19013_001E'),
    medianHomeValueUsd: g('B25077_001E'),
    medianAgeYears: g('B01002_001E') || undefined,
    households: g('B11001_001E') || undefined,
  }
}

/** Multi-year trend for the town's population, income and home value (for the
 *  period-over-period sparklines). Empty when no key/geo or all years fail. */
export async function fetchCensusSeries(muniKey: string): Promise<DemoSeriesPoint[]> {
  const key = process.env.CENSUS_API_KEY
  const geo = CENSUS_GEO[muniKey]
  if (!key || !geo) return []
  const pts = await Promise.all(
    SERIES_YEARS.map((y) => fetchYearPoint(y, key, geo).catch(() => null)),
  )
  return pts.filter((p): p is DemoSeriesPoint => p != null && p.population > 0).sort((a, b) => a.year - b.year)
}
