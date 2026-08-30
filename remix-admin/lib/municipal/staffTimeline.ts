/**
 * What each department's head actually said, in date order.
 *
 * Every board dataset records a `staffInput` block per meeting: which town
 * staff spoke, in what role, and what they contributed. That is authored
 * alongside the meeting analysis, so it is already attributed and dated — this
 * module does no fresh extraction from transcript text. It regroups those
 * entries by *department* rather than by meeting, so the Water & Sewer page can
 * show what the Superintendent has been raising across three years of Town
 * Board meetings without a reader having to open thirty meetings to find out.
 *
 * Two things make that regrouping non-trivial:
 *
 *  - **Names and roles drift.** The transcripts are un-diarized ASR, so the
 *    same person arrives as "Sal", "Sal Mesiti", "Sal Misisti" and "Sal (Water
 *    & Sewer Superintendent)", and the same job as "Comptroller" and "Director
 *    of Finance". CANONICAL_STAFF collapses each set to one person and one
 *    role label, so a department's timeline reads as one continuous voice.
 *
 *  - **Not everyone in `staffInput` is town staff.** Applicants' attorneys,
 *    traffic consultants and engineering peer reviewers are recorded there too,
 *    for context. EXTERNAL_ROLE filters them out — a department timeline should
 *    carry the department's own people, not the people appearing before it.
 *
 * Departments whose head does not appear get nothing rather than an empty
 * shell. That is a real finding about how the Town runs, not a data gap: the
 * Assessor never speaks at a Town Board, Planning Board or ZBA meeting in any
 * transcript we hold, so `getStaffTimeline('nc', 'assessor')` is legitimately
 * empty and the section is omitted.
 */
import { loadAnalysis, analysisBodiesForMuni } from './analysis'

export interface StaffTimelineCase {
  id: string
  name: string
}

export interface StaffTimelineEntry {
  date: string
  /** Which body they were speaking to — the same head reports to several. */
  board: string
  bodyKey: string
  /** Canonical display name, not the transcript's spelling of it. */
  person: string
  /** Canonical role label. */
  role: string
  summary: string
  /** Matters they spoke to, resolved from case ids to readable names. */
  cases: StaffTimelineCase[]
}

/**
 * Lowercase, strip punctuation, collapse whitespace. Parenthetical content is
 * kept, not dropped — the transcripts routinely carry the only usable name
 * inside it ("Police Chief (Reagan Hufnagle)"), and discarding it would flatten
 * two different chiefs into one anonymous voice.
 */
function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/["'’‘“”()]/g, ' ')
    .replace(/[^a-z0-9 /&-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * A department's people.
 *
 * `surnames` match as substrings, so a mangled or partial rendering still
 * lands ("Police Chief (Reagan Hufnagle)" → Huffnagle). `exact` is for people
 * the transcripts name only by first name; those must match the whole string,
 * because bare first names collide with board members — "Matt" is both Matt
 * Traynor of Recreation and Matt Milim of the Town Board, and only the former
 * belongs here.
 */
interface CanonicalStaff {
  dept: string
  person: string
  role: string
  /** Distinctive surname fragments, matched anywhere in the person string. */
  surnames?: string[]
  /** Full normalized person strings, matched in their entirety. */
  exact?: string[]
  /** Tested against the normalized person string. */
  personTest?: RegExp
  /** Role-string test, used when the person string is one we don't recognize. */
  roleTest?: RegExp
}

const CANONICAL_STAFF: CanonicalStaff[] = [
  {
    dept: 'water_sewer',
    person: 'Sal Mesiti',
    role: 'Superintendent of Water & Sewer Operations',
    surnames: ['mesiti', 'misisti'],
    // No other town staff in the record is called Sal, so a leading "Sal"
    // is unambiguous — and it arrives with half a dozen different suffixes.
    personTest: /^sal\b/,
    roleTest: /\b(water|sewer)\b/i,
  },
  {
    dept: 'finance',
    person: 'Abbas Sura',
    role: 'Comptroller / Director of Finance',
    surnames: ['abbas'],
    roleTest: /comptroller|director of finance/i,
  },
  {
    dept: 'building',
    person: 'Rob Melillo',
    role: 'Building Inspector',
    surnames: ['melillo', 'malelo'],
    // \b after "rob" keeps this off "Robert 'Bob' Spolzino", the Town Attorney.
    personTest: /^rob\b/,
    roleTest: /building inspector|code enforcement/i,
  },
  {
    dept: 'parks_rec',
    person: 'Matt Traynor',
    role: 'Superintendent of Recreation & Parks',
    surnames: ['traynor', 'trainer', 'trainor'],
    roleTest: /recreation|parks/i,
  },
  // Norris is the Highway Superintendent, confirmed by the department. The
  // transcripts say "Foreman Jamie Norris" and two meeting summaries call him
  // general foreman; that is the ASR and the summaries being loose, not the
  // title. Giaccio is kept as himself: he is a *retired* Superintendent
  // reading Norris's memo aloud, so filing his words under Norris's name
  // would misattribute them.
  {
    dept: 'highway',
    person: 'Jamie Norris',
    role: 'Highway Superintendent',
    surnames: ['norris'],
    roleTest: /highway/i,
  },
  {
    dept: 'highway',
    person: 'Mike Giaccio',
    role: 'Retired Highway Superintendent',
    surnames: ['giaccio'],
  },
  // The chief changed hands mid-record; each is kept under his own name rather
  // than flattened, since "the Chief said" spanning a handover would
  // misattribute. Anyone else from the department keeps their recorded name.
  {
    dept: 'police',
    person: 'Chief Peter Simonson',
    role: 'Chief of Police',
    surnames: ['simonson', 'peter simon'],
  },
  {
    dept: 'police',
    person: 'Chief Reagan Huffnagle',
    role: 'Chief of Police',
    surnames: ['huffnagle', 'hufnagle', 'huff-nagle'],
  },
  {
    dept: 'police',
    person: 'Lt. Tom Cormack',
    role: 'Police Lieutenant',
    surnames: ['cormack'],
  },
  // A chief the transcript doesn't name resolvably. Deliberately displayed by
  // office rather than by the recorded string, which carries ASR guesses at the
  // name ("Chief Chick") we have no basis to assert as a real person.
  {
    dept: 'police',
    person: 'Police Chief',
    role: 'Chief of Police',
    personTest: /^police chief\b/,
  },
]

/**
 * Staff who belong to a body with its own board page, and so must never be
 * pulled onto a department page even when a role string files them there. One
 * 2026 entry labels the Director of Planning "Building Inspector / code staff";
 * he is Planning's, and his contributions already show on the Planning board.
 */
const NOT_DEPARTMENT_STAFF = /kaufman/i

/** Assigns a department by role alone, for people we don't recognize by name. */
const DEPT_BY_ROLE: { dept: string; test: RegExp }[] = [
  { dept: 'water_sewer', test: /\b(water|sewer)\b/i },
  { dept: 'finance', test: /comptroller|director of finance/i },
  { dept: 'building', test: /building inspector|code enforcement/i },
  { dept: 'parks_rec', test: /recreation|parks/i },
  { dept: 'highway', test: /highway/i },
  { dept: 'police', test: /police/i },
]

/**
 * Roles belonging to people appearing *before* the town rather than speaking
 * for it. Checked before any department match, so an applicant's engineer
 * never lands on a department page.
 */
const EXTERNAL_ROLE =
  /applicant|not town staff|developer|contractor representative|refuse\/recycling|independent auditors|peer review|hotels? representative|meyer jabara|attorney for /i

/** Title-case a recorded person string we have no canonical entry for. */
function tidyName(person: string): string {
  return person.replace(/\s+/g, ' ').trim()
}

interface Attribution {
  dept: string
  person: string
  role: string
}

/**
 * Resolve one `staffInput` entry to a department and a display name. Falls
 * back to the *recorded* name and role when the person isn't one we recognize,
 * rather than filing them under a stand-in like "Police Department" — an
 * unfamiliar name is still that person's name, and inventing a collective one
 * would attribute their words to the department at large.
 */
function attribute(person: string, role: string): Attribution | null {
  if (EXTERNAL_ROLE.test(role)) return null
  const p = norm(person)

  if (NOT_DEPARTMENT_STAFF.test(person)) return null

  for (const s of CANONICAL_STAFF) {
    const hit =
      (s.surnames || []).some((n) => p.includes(n)) ||
      (s.exact || []).includes(p) ||
      (s.personTest ? s.personTest.test(p) : false)
    if (hit) return { dept: s.dept, person: s.person, role: s.role }
  }

  // Name unrecognized — fall back to the role. The person string is searched
  // too, because the department is frequently stated only there, with `role`
  // left as the catch-all "other" ("Police Chief" / role: "other").
  const haystack = `${p} ${norm(role)}`
  for (const d of DEPT_BY_ROLE) {
    if (d.test.test(haystack)) {
      return { dept: d.dept, person: tidyName(person), role: tidyName(role) }
    }
  }
  return null
}

/**
 * Every recorded contribution by a department's staff, newest first, across
 * all of a town's analyzed boards. Empty when that department's head never
 * appears — callers should render nothing rather than an empty section.
 */
export function getStaffTimeline(muniKey: string, deptKey: string): StaffTimelineEntry[] {
  const out: StaffTimelineEntry[] = []

  for (const bodyKey of analysisBodiesForMuni(muniKey)) {
    const data = loadAnalysis(muniKey, bodyKey)
    if (!data) continue
    const board = data.meta.board
    // `staffInput.cases` cites the ids as written on each meeting, not the
    // canonicalized ids in the `cases` rollup — case_canon.json merges records
    // whose id drifted between meetings, so only a handful of the two sets
    // coincide. Build the lookup from the meeting-level cases (which resolve
    // every reference) and keep the rollup as a fallback.
    const caseNames = new Map<string, string>()
    for (const c of data.cases) caseNames.set(c.id, c.name)
    for (const m of data.meetings) {
      for (const c of m.cases) caseNames.set(c.id, c.name)
    }

    for (const meeting of data.meetings) {
      for (const s of meeting.staffInput || []) {
        const at = attribute(s.person || '', s.role || '')
        if (!at || at.dept !== deptKey) continue
        if (!s.summary) continue
        out.push({
          date: meeting.date,
          board,
          bodyKey,
          person: at.person,
          role: at.role,
          summary: s.summary,
          cases: (s.cases || []).map((id) => ({ id, name: caseNames.get(id) || id })),
        })
      }
    }
  }

  return out.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
}

/** Department keys under a town that have at least one timeline entry. */
export function deptsWithTimeline(muniKey: string): string[] {
  const keys = [...new Set([...CANONICAL_STAFF.map((s) => s.dept), ...DEPT_BY_ROLE.map((d) => d.dept)])]
  return keys.filter((k) => getStaffTimeline(muniKey, k).length > 0)
}
