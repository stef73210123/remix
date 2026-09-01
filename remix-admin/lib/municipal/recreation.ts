/**
 * Recreation programme enrolment and facility use, by year.
 *
 * Built from the Recreation Department's own participation and
 * facility-reservation extracts, released under FOIL 26-580. The released
 * records are section-level, not person-level — they carry no registrant names
 * or contact details — so nothing had to be stripped to publish this.
 *
 * The department reports a status per section, and it is the most useful column
 * in the file: "Below" means the section ran under its minimum enrolment,
 * "Waitlist" means demand exceeded its cap. Both at once, year after year, is
 * the interesting shape — it points at programme mix rather than demand.
 */
import fs from 'fs'
import path from 'path'

export interface RecreationYear {
  year: string
  /** The extract stops partway through the last year; rates still read, totals don't. */
  partial: boolean
  sections: number
  enrolment: number
  below: number
  full: number
  waitlist: number
  over: number
  reservations: number
  reservationHeadcount: number
  reservationFees: number
}

export interface RecreationMeta {
  town: string
  muniKey: string
  firstYear: string
  lastYear: string
  partialYear: string
  programSections: number
  facilityReservations: number
  source: string
  note: string
}

export interface RecreationDataset {
  meta: RecreationMeta
  years: RecreationYear[]
  mostWaitlisted: { program: string; sections: number }[]
  topFacilities: { facility: string; reservations: number }[]
}

const FILES: Record<string, string> = { nc: 'nc-recreation.json' }
const cache: Record<string, RecreationDataset | null> = {}

export function loadRecreation(muniKey: string): RecreationDataset | null {
  if (muniKey in cache) return cache[muniKey]
  const file = FILES[muniKey]
  if (!file) return (cache[muniKey] = null)
  try {
    const p = path.join(process.cwd(), 'lib', 'municipal', 'data', file)
    cache[muniKey] = JSON.parse(fs.readFileSync(p, 'utf8')) as RecreationDataset
  } catch {
    cache[muniKey] = null
  }
  return cache[muniKey]
}

export interface RecreationSummary {
  /** Complete years only — the partial year would understate every total. */
  fullYears: RecreationYear[]
  totalSections: number
  totalEnrolment: number
  /** Share of sections that ran under their minimum, across complete years. */
  pctBelow: number
  totalWaitlisted: number
  totalReservations: number
}

export function summarizeRecreation(d: RecreationDataset): RecreationSummary {
  const fullYears = d.years.filter((y) => !y.partial)
  const sections = fullYears.reduce((n, y) => n + y.sections, 0)
  const below = fullYears.reduce((n, y) => n + y.below, 0)
  return {
    fullYears,
    totalSections: sections,
    totalEnrolment: fullYears.reduce((n, y) => n + y.enrolment, 0),
    pctBelow: sections ? Math.round((below / sections) * 100) : 0,
    totalWaitlisted: fullYears.reduce((n, y) => n + y.waitlist, 0),
    totalReservations: fullYears.reduce((n, y) => n + y.reservations, 0),
  }
}
