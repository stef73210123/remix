/**
 * Building Department permit dataset for a town (currently North Castle).
 *
 * The data is extracted offline from the department's annual "M5 Permit Report"
 * PDFs (permit issue windows May 2015 – May 2025) into two committed JSON files
 * under lib/municipal/data/nc-building/:
 *   - permits.json      → pre-computed aggregates + a `recent` slice (served by
 *                         default; small, ~110KB)
 *   - permits_full.json → every distinct permit record (loaded lazily, only for
 *                         the full table / a single-permit detail lookup)
 *
 * Loaded with the same fs + module-cache pattern as analysis.ts, so it renders
 * with no database configured (the public OpenNorthCastle build).
 */
import fs from 'fs'
import path from 'path'

export interface PermitRecord {
  permitNumber: string
  type: string
  /** Normalized category (HVAC / Pool / New construction / …), derived offline. */
  category: string
  /** Residential | Commercial | Vacant land | Other, from the NYS property class. */
  klass: string
  address: string
  owner: string
  printKey: string
  propClass: string
  contractor: string | null
  description: string | null
  appIso: string | null
  permitIso: string | null
  closeIso: string | null
  cost: number | null
  fee: number | null
  zone: string | null
}

export interface YearStat { year: number; count: number; cost: number; fees: number }
export interface CategoryStat { category: string; count: number; cost: number }
export interface CountStat { count: number }
export interface PermitDataset {
  muniKey: string
  source: string
  coverage: { records: number; firstYear: number | null; lastYear: number | null }
  totals: { permits: number; totalCost: number; totalFees: number; withCost: number }
  byYear: YearStat[]
  monthly: { month: string; count: number }[]
  byCategory: CategoryStat[]
  byClass: { klass: string; count: number }[]
  byZone: { zone: string; count: number }[]
  valuationBuckets: { label: string; count: number }[]
  topContractors: { name: string; count: number; cost: number }[]
  turnaround: { n: number; avgDays: number | null; medianDays: number | null }
  recent: PermitRecord[]
}

// muni → committed data directory. Add a row when a town gets a permit dataset.
const DATA_DIRS: Record<string, string> = {
  nc: 'nc-building',
}
function dataDir(muniKey: string): string | null {
  const d = DATA_DIRS[muniKey]
  return d ? path.join(process.cwd(), 'lib', 'municipal', 'data', d) : null
}

/**
 * Static department facts (from the Town of North Castle Building &
 * Engineering pages) so the dashboard has real context even before a record is
 * read. Keyed by muni.
 */
export interface DepartmentInfo {
  name: string
  inspector: string
  phone: string
  email: string
  address: string
  hours?: string
  mission: string
  lifecycle: string[]
  fees: { label: string; value: string }[]
  links: { label: string; href: string }[]
}
const DEPARTMENTS: Record<string, DepartmentInfo> = {
  nc: {
    name: 'Building Department',
    inspector: 'Rob Melillo, Building Inspector',
    phone: '(914) 273-3000 ext. 44',
    email: 'building@northcastleny.com',
    address: '17 Bedford Road, Armonk, NY 10504',
    mission:
      'Safeguards life, health, property and public welfare by administering and enforcing the NYS ' +
      'Uniform Fire Prevention and Building Code and the Town’s adopted laws for all construction in North Castle.',
    lifecycle: ['Application', 'Plan review', 'Corrections', 'Permit issued', 'Inspections', 'Certificate of Occupancy'],
    fees: [
      { label: 'Application fee', value: '$125' },
      { label: 'Certificate fee', value: '$100' },
      { label: 'Cost of construction', value: '$16 / $1,000' },
      { label: 'Fill permit', value: '$125 + $3 / yd' },
    ],
    links: [
      { label: 'Building & Engineering', href: 'https://www.northcastleny.com/180/Building-Engineering' },
      { label: 'Permit process guide', href: 'https://www.northcastleny.com/213/Customers-Guide-to-the-Building-Permit-P' },
      { label: 'Online permitting', href: 'https://www.northcastleny.com/218/Online-Permitting' },
    ],
  },
}

export function getDepartment(muniKey: string): DepartmentInfo | null {
  return DEPARTMENTS[muniKey] ?? null
}

const cache = new Map<string, PermitDataset | null>()
export function getPermitData(muniKey: string): PermitDataset | null {
  const dir = dataDir(muniKey)
  if (!dir) return null
  if (cache.has(muniKey)) return cache.get(muniKey) ?? null
  let val: PermitDataset | null = null
  try {
    val = JSON.parse(fs.readFileSync(path.join(dir, 'permits.json'), 'utf8')) as PermitDataset
  } catch {
    val = null
  }
  cache.set(muniKey, val)
  return val
}

const fullCache = new Map<string, PermitRecord[] | null>()
export function getPermitsFull(muniKey: string): PermitRecord[] | null {
  const dir = dataDir(muniKey)
  if (!dir) return null
  if (fullCache.has(muniKey)) return fullCache.get(muniKey) ?? null
  let val: PermitRecord[] | null = null
  try {
    const parsed = JSON.parse(fs.readFileSync(path.join(dir, 'permits_full.json'), 'utf8')) as { permits: PermitRecord[] }
    val = parsed.permits ?? null
  } catch {
    val = null
  }
  fullCache.set(muniKey, val)
  return val
}

/** A single permit by its permit number (searches the full record set). */
export function getPermit(muniKey: string, permitNumber: string): PermitRecord | null {
  const all = getPermitsFull(muniKey)
  if (!all) return null
  return all.find((p) => p.permitNumber === permitNumber) ?? null
}
