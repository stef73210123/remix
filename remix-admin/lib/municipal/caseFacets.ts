/**
 * Turning the boards' free-text case fields into things you can filter on.
 *
 * `lastStatus` and `applicationType` are written by the transcript analysis in
 * whatever words the board used on the night, so across North Castle's Planning
 * Board alone there are 157 distinct statuses and 118 distinct application
 * types for 399 cases. Most appear once. "approved", "approved with
 * conditions", "conditional approval", "public hearing closed | approved" and
 * "approved — resolution adopted as amended" are five spellings of one outcome,
 * and a filter offering all five is no filter at all.
 *
 * Two different shapes of problem, so two different treatments:
 *
 *  - **Status is one outcome**, so it collapses to a single bucket by ordered
 *    rules. Order matters: a denial is often worded "resolution denying…" and
 *    must be tested before the approval rule, and "public hearing closed |
 *    approved" is an approval rather than an open hearing.
 *  - **Type is genuinely several things at once.** "site plan / steep slopes /
 *    wetlands / tree removal" is one application engaging four regimes, and
 *    bucketing it under any one of them loses the other three. So types get
 *    multi-label tags and a case can carry several.
 *
 * Both vocabularies stay visible in the UI — the raw string is what a row
 * shows and what search matches. These derived facets exist to narrow a list of
 * 399 down to something readable, not to replace what the board actually said.
 *
 * The tables below span every body type (Planning, ZBA, Town Board), and
 * `buildFacets` reports only the values a given dataset actually contains, so a
 * board never offers a filter that would return nothing.
 */
import type { AnalysisDataset, CaseRollup } from './analysis'

export type StatusBucket =
  | 'approved'
  | 'denied'
  | 'referred'
  | 'open'
  | 'discussed'
  | 'other'

export const STATUS_LABELS: Record<StatusBucket, string> = {
  approved: 'Approved',
  denied: 'Denied',
  referred: 'Referred out',
  open: 'Still open',
  discussed: 'Discussed only',
  other: 'Other',
}

/**
 * Ordered — the first match wins, and the order encodes the tricky cases:
 * denial before approval (a denial is usually phrased "resolution denying…",
 * and "board declined to adopt" must not read as approved), approval before
 * the hearing states (an approval is routinely recorded as "public hearing
 * closed | approved"), and referral before the open states so a matter sent to
 * another board isn't filed as merely adjourned.
 */
const STATUS_RULES: { bucket: StatusBucket; test: RegExp }[] = [
  { bucket: 'denied', test: /\bdenied\b|\bdenying\b|\bdeny\b|\bwithdrawn\b|\brejected\b|\bdefeated\b|\bopposed\b/ },
  // "adopted" is the Town Board's word for the same thing the land-use boards
  // call "approved", and it accounts for 440 of its 737 matters on its own.
  // \badopted\b deliberately does not match "declined to adopt".
  { bucket: 'approved', test: /approv|\bgranted\b|\badopted\b|\bpassed\b/ },
  { bucket: 'referred', test: /\breferr?(ed|al)\b|\bsent to\b|\brefer to\b/ },
  {
    // "carried" is deliberately absent: on a motion it means passed, on a
    // matter it means held over, and the record does not say which.
    bucket: 'open',
    test: /held open|kept open|adjourn|continu|reopen|defer|tabled|no vote|no action|sent back|scheduled|opened|hearing held|pending|\breceived\b|under review/,
  },
  { bucket: 'discussed', test: /discuss|work ?session|presentation|update|advocacy/ },
]

/** Collapse a board's own wording for an outcome into one bucket. */
export function statusBucket(raw: string | null | undefined): StatusBucket {
  const s = (raw || '').toLowerCase()
  if (!s.trim()) return 'other'
  for (const r of STATUS_RULES) if (r.test.test(s)) return r.bucket
  return 'other'
}

/**
 * Whether an approval carried conditions. Worth surfacing separately because
 * "approved" and "approved with conditions" are the same bucket but not the
 * same outcome to anyone reading the record.
 */
export function isConditional(raw: string | null | undefined): boolean {
  return /condition/i.test(raw || '')
}

/**
 * Multi-label, because one application routinely engages several regimes at
 * once. Tags are matched against the raw type string, so "site plan / steep
 * slopes / wetlands / tree removal" carries four.
 */
const TYPE_TAGS: { tag: string; test: RegExp }[] = [
  // Land-use boards
  { tag: 'Site plan', test: /site plan/i },
  { tag: 'Subdivision', test: /subdivision|lot line|lot-line/i },
  { tag: 'Special use permit', test: /special (use )?permit/i },
  { tag: 'Variance', test: /variance/i },
  { tag: 'Wetlands', test: /wetland|watercourse/i },
  { tag: 'Steep slopes', test: /steep slope|rock (removal|chipping)|blast/i },
  { tag: 'Trees', test: /tree/i },
  { tag: 'Stormwater', test: /stormwater|drainage|erosion/i },
  { tag: 'Signs', test: /\bsign\b|signage/i },
  { tag: 'Fill & excavation', test: /\bfill\b|excavat|grading/i },
  { tag: 'Extension', test: /extension|renew/i },
  { tag: 'Referral', test: /referr?al|referred/i },
  { tag: 'Interpretation', test: /interpretation/i },
  // Town Board business
  { tag: 'Resolution', test: /resolution/i },
  { tag: 'Local law', test: /local law|ordinance|code amendment/i },
  { tag: 'Contract & bids', test: /contract|\bbid\b|\brfp\b|procurement|purchase/i },
  { tag: 'Appointment', test: /appointment|appoint/i },
  { tag: 'Public hearing', test: /public hearing/i },
  { tag: 'Intermunicipal', test: /intermunicipal|shared services/i },
  { tag: 'Permits & licensing', test: /licens|permits? ?&|peddl/i },
  { tag: 'Budget & finance', test: /budget|bond|fund|tax|financ|grant/i },
  { tag: 'Property & easements', test: /easement|sale of town|covenant|license agreement|right[- ]of[- ]way/i },
  { tag: 'Personnel & legal', test: /personnel|litigation|settlement|employment/i },
  { tag: 'Community events', test: /proclamation|community event|special event|filming/i },
]

/** Every regime a case's application type touches. Empty when nothing matches. */
export function typeTags(raw: string | null | undefined): string[] {
  const s = raw || ''
  if (!s.trim()) return []
  const out: string[] = []
  for (const t of TYPE_TAGS) if (t.test.test(s)) out.push(t.tag)
  return out
}

export interface FacetValue {
  value: string
  label: string
  count: number
}

export interface CaseFacets {
  statuses: FacetValue[]
  types: FacetValue[]
  themes: FacetValue[]
  years: FacetValue[]
}

/**
 * Facet values present in this dataset, each with how many cases carry it,
 * commonest first. Only non-empty facets are returned, so the UI never offers a
 * filter that would empty the list.
 */
export function buildFacets(cases: CaseRollup[]): CaseFacets {
  const status = new Map<string, number>()
  const type = new Map<string, number>()
  const theme = new Map<string, number>()
  const year = new Map<string, number>()

  for (const c of cases) {
    bump(status, statusBucket(c.lastStatus))
    for (const t of typeTags(c.applicationType)) bump(type, t)
    for (const t of c.themes || []) bump(theme, t)
    for (const y of caseYears(c)) bump(year, y)
  }

  const rank = (m: Map<string, number>): FacetValue[] =>
    [...m.entries()]
      .map(([value, count]) => ({ value, label: value, count }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))

  return {
    statuses: rank(status)
      .map((f) => ({ ...f, label: STATUS_LABELS[f.value as StatusBucket] ?? f.value }))
      // Outcome reads better in a fixed order than by volume — approvals
      // dominate every board, so ranking by count buries everything else.
      .sort((a, b) => STATUS_ORDER.indexOf(a.value as StatusBucket) - STATUS_ORDER.indexOf(b.value as StatusBucket)),
    types: rank(type),
    themes: rank(theme),
    years: [...year.entries()]
      .map(([value, count]) => ({ value, label: value, count }))
      .sort((a, b) => b.value.localeCompare(a.value)),
  }
}

const STATUS_ORDER: StatusBucket[] = ['approved', 'open', 'referred', 'discussed', 'denied', 'other']

/** Every calendar year a case came before the board. */
export function caseYears(c: CaseRollup): string[] {
  const ys = new Set<string>()
  for (const ap of c.timeline || []) {
    const y = (ap.date || '').slice(0, 4)
    if (y) ys.add(y)
  }
  return [...ys]
}

function bump(m: Map<string, number>, k: string) {
  if (!k) return
  m.set(k, (m.get(k) || 0) + 1)
}

/** Facets for a whole dataset — convenience wrapper. */
export function facetsFor(data: AnalysisDataset): CaseFacets {
  return buildFacets(data.cases)
}
