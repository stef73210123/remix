/**
 * Single-head operational departments (Police, Highway, Receiver of Taxes,
 * Water & Sewer) — unlike Town Board/Planning Board/Parks & Recreation, these
 * aren't multi-member bodies that hold public deliberative meetings, so they
 * get a lightweight contact/info page (`/admin/municipal/dept`) instead of
 * the Meetings/timeline/transcript machinery on the generic board page.
 */
export interface DeptPageDef {
  key: string
  label: string
}

// The descriptive blurb lives once, on the department's contact card in
// departments.ts (getBoardDepartments) — kept out of this list so the two
// don't drift out of sync with each other.
export const DEPT_PAGES: DeptPageDef[] = [
  { key: 'police', label: 'Police' },
  { key: 'highway', label: 'Highway' },
  { key: 'receiver_of_taxes', label: 'Receiver of Taxes' },
  { key: 'water_sewer', label: 'Water and Sewer' },
]

export function getDeptPage(key: string): DeptPageDef | undefined {
  return DEPT_PAGES.find((d) => d.key === key)
}
