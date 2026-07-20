/**
 * OpenDocket — directory of municipal decision-makers (clerks, supervisors /
 * mayors, administrators) across the tri-state + MA footprint.
 *
 * Static dataset bundled as JSON (imported so it's guaranteed present in the
 * serverless bundle) and served read-only behind the admin session via
 * /admin/api/opendocket.
 */
import raw from './opendocket/data.json'

export interface OpenDocketContact {
  state: string
  municipality: string
  county: string
  population: number | null
  mhi: number | null
  type: string
  governanceNote: string
  website: string
  clerkName: string
  clerkEmail: string
  execName: string
  execTitle: string
  execEmail: string
  adminName: string
  adminTitle: string
  adminEmail: string
  notes: string
}

export const OPEN_DOCKET_CONTACTS = raw as OpenDocketContact[]

/** Distinct states present in the dataset, alphabetized. */
export function openDocketStates(): string[] {
  return Array.from(new Set(OPEN_DOCKET_CONTACTS.map((c) => c.state)))
    .filter(Boolean)
    .sort()
}
