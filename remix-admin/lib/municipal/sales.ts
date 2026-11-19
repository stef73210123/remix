/**
 * Residential property sales and market trends.
 *
 * Source: NYS ORPTS real property transfer reports (RP-5217), exported from
 * Sales Web (pad.tax.ny.gov → "Download Search Results") and enriched with the
 * Westchester County tax-parcel layer by scripts/municipal/import-sales.mjs.
 * The committed JSON carries no buyer or seller names — only the parcel, date,
 * price and assessment facts needed for the charts.
 *
 * Sales Web lags recorded deeds by roughly 2–3 months, so the latest quarter is
 * always partial; `isPartialQuarter` lets the UI say so.
 */
import ncSales from './data/nc-sales.json'

export interface PropertySale {
  /** Sale (deed) date, YYYY-MM-DD. */
  date: string
  price: number
  /** Street address from the parcel roll, e.g. "4 MUSKET CT". */
  address: string
  printKey: string
  /** NYS property class code, e.g. "210" (one-family). */
  propClass: string
  /** Area label derived from the parcel's school district. */
  area: string
  /** Total assessed value on the roll the sale was matched against; null if unmatched. */
  assessedValue: number | null
  sqftLiving: number | null
  /** ORPTS arm's-length flag. Non-arm's-length sales are excluded from medians. */
  armsLength: boolean
}

export interface SalesDataset {
  muniKey: string
  /** When the export was taken (YYYY-MM-DD); null until the first import. */
  asOf: string | null
  /** Latest sale date covered by the export. */
  coveredThrough: string | null
  /** Assessed value ÷ full market value for the matched roll (the level of assessment). */
  levelOfAssessment: number
  levelOfAssessmentNote: string
  sales: PropertySale[]
}

/** Westchester County residential medians (ORPTS, arm's-length, non-condo). Context line only. */
export const WESTCHESTER_MEDIANS: { year: number; sales: number; median: number }[] = [
  { year: 2023, sales: 5711, median: 816000 },
  { year: 2024, sales: 5837, median: 868000 },
  { year: 2025, sales: 6073, median: 925000 },
]
export const WESTCHESTER_MEDIANS_SOURCE = 'https://www.tax.ny.gov/research/property/assess/sales/resmedian.htm'

const DATASETS: Record<string, SalesDataset> = {
  nc: ncSales as SalesDataset,
}

export function getSales(muniKey: string): SalesDataset | null {
  const d = DATASETS[muniKey]
  return d && d.sales.length > 0 ? d : null
}

/** Residential classes counted in the market charts: 1-, 2-, 3-family, estates, multi-structure. */
const RESIDENTIAL = new Set(['210', '215', '220', '230', '240', '250', '280'])
export function isResidential(s: PropertySale): boolean {
  return RESIDENTIAL.has(s.propClass)
}

/** Sales that count toward medians: arm's length, residential, priced above a nominal floor. */
export function marketSales(d: SalesDataset): PropertySale[] {
  return d.sales.filter((s) => s.armsLength && isResidential(s) && s.price > 10000)
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null
  const v = [...values].sort((a, b) => a - b)
  const mid = Math.floor(v.length / 2)
  return v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2
}

export function quarterOf(date: string): string {
  const y = date.slice(0, 4)
  const q = Math.floor((Number(date.slice(5, 7)) - 1) / 3) + 1
  return `${y} Q${q}`
}

export interface QuarterStat {
  quarter: string
  count: number
  median: number | null
}

/** Median price and volume per calendar quarter, oldest first, with empty quarters filled. */
export function byQuarter(sales: PropertySale[]): QuarterStat[] {
  if (sales.length === 0) return []
  const groups = new Map<string, number[]>()
  for (const s of sales) {
    const q = quarterOf(s.date)
    const arr = groups.get(q) ?? []
    arr.push(s.price)
    groups.set(q, arr)
  }
  const keys = Array.from(groups.keys()).sort()
  const [y0, q0] = keys[0].split(' Q').map(Number)
  const [y1, q1] = keys[keys.length - 1].split(' Q').map(Number)
  const out: QuarterStat[] = []
  for (let y = y0, q = q0; y < y1 || (y === y1 && q <= q1); q === 4 ? (y++, (q = 1)) : q++) {
    const key = `${y} Q${q}`
    const prices = groups.get(key) ?? []
    out.push({ quarter: key, count: prices.length, median: median(prices) })
  }
  return out
}

export interface AreaStat {
  area: string
  count: number
  median: number | null
}

export function byArea(sales: PropertySale[]): AreaStat[] {
  const groups = new Map<string, number[]>()
  for (const s of sales) {
    const arr = groups.get(s.area) ?? []
    arr.push(s.price)
    groups.set(s.area, arr)
  }
  return Array.from(groups.entries())
    .map(([area, prices]) => ({ area, count: prices.length, median: median(prices) }))
    .sort((a, b) => b.count - a.count)
}

/**
 * Median of sale price ÷ the roll's implied market value (assessed ÷ level of
 * assessment). 1.10 means homes are selling ~10% above what the roll says
 * they're worth. Null when too few sales matched a parcel.
 */
export function priceToRollRatio(d: SalesDataset, sales: PropertySale[]): { ratio: number; n: number } | null {
  const ratios = sales
    .filter((s) => s.assessedValue != null && s.assessedValue > 0)
    .map((s) => s.price / (s.assessedValue! / d.levelOfAssessment))
  const m = median(ratios)
  return m != null && ratios.length >= 5 ? { ratio: m, n: ratios.length } : null
}

/** True when the quarter is the one containing `coveredThrough` and it hasn't ended. */
export function isPartialQuarter(d: SalesDataset, quarter: string): boolean {
  if (!d.coveredThrough) return false
  if (quarterOf(d.coveredThrough) !== quarter) return false
  const month = Number(d.coveredThrough.slice(5, 7))
  const day = Number(d.coveredThrough.slice(8, 10))
  const quarterEndMonth = Math.ceil(month / 3) * 3
  return month < quarterEndMonth || day < 28
}
