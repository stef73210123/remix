/**
 * Single-head operational departments (Police, Assessor, Water & Sewer) —
 * unlike Town Board/Planning Board/Parks & Recreation, these aren't
 * multi-member bodies that hold public deliberative meetings, so they get a
 * lightweight contact/info page (`/admin/municipal/dept`) instead of the
 * Meetings/timeline/transcript machinery on the generic board page.
 *
 * Highway used to be here too, but it now has its own dedicated page (the
 * roads-by-jurisdiction map), so it's routed via MuniTabs' 'highway' kind
 * instead of this list.
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
  { key: 'assessor', label: 'Assessor' },
  { key: 'water_sewer', label: 'Water and Sewer' },
]

export function getDeptPage(key: string): DeptPageDef | undefined {
  return DEPT_PAGES.find((d) => d.key === key)
}
