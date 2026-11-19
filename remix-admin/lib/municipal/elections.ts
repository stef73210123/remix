/**
 * Town-level election results for tracked municipalities.
 *
 * Scope is deliberately narrow: only the offices the town itself elects —
 * **Town Supervisor** and **Town Board (Council)** — for both the November
 * general and any contested June primary. County, state, federal and judicial
 * races are intentionally excluded (this dashboard is about the town's own
 * governing body). Data is committed static JSON-in-TS so it renders with no DB
 * dependency and can be imported directly into client components.
 *
 * Figures are transcribed from the Westchester County Board of Elections
 * official/certified results and corroborating local reporting; see `sources`.
 */

export type ElectionType = 'general' | 'primary'
export type ElectionOffice = 'Supervisor' | 'Town Board'

export interface ElectionCandidate {
  name: string
  /** Ballot lines the candidate ran on, e.g. ['Democratic', 'Conservative']. */
  parties: string[]
  /** Combined vote total across all of the candidate's lines; null if unknown. */
  votes: number | null
  won: boolean
  incumbent?: boolean
}

export interface ElectionRace {
  year: number
  type: ElectionType
  /** Election day, YYYY-MM-DD. */
  date?: string
  office: ElectionOffice
  /** Seats being filled (Town Board is typically a "vote for two"). */
  seatsUp: number
  candidates: ElectionCandidate[]
  /** Notable context — recounts, litigation, unusually close margins. */
  note?: string
  /** True while the Board of Elections count is not yet certified. */
  unofficial?: boolean
}

export interface MunicipalElections {
  muniKey: string
  town: string
  /** Prose summary of who has held the Supervisor seat and key transitions. */
  supervisorHistory?: string
  /** Shown when no contested primary exists, so the "primary" ask is answered. */
  primaryNote?: string
  sources: string[]
  races: ElectionRace[]
}

const ELECTIONS: Record<string, MunicipalElections> = {
  nc: {
    muniKey: 'nc',
    town: 'Town of North Castle',
    supervisorHistory:
      'Democrat Michael Schiliro held the Supervisor seat for five terms through 2023, winning a ' +
      'fifth term unopposed in 2021 before declining to seek re-election. In November 2023 Democrat ' +
      'Joseph A. (Joe) Rende won the open seat over Republican Councilwoman Barbara DiGiacinto — ' +
      'decided by a handful of votes after absentee canvassing, a manual recount and litigation — and ' +
      'took office in January 2024. He was re-elected unopposed in November 2025 (Democratic and ' +
      'Conservative lines). New York\'s 2023 Even-Year Election Law (upheld by the Court of Appeals in ' +
      'October 2025) turned that win into a one-year transitional term, so the seat was on the ballot ' +
      'again in 2026: Rende beat sitting Councilman Jose Berra 456–402 in the June 23 Democratic ' +
      'primary, then defeated Republican Melvin Orellana about 57% to 43% on November 3, 2026.',
    primaryNote:
      'No contested town primary (June) was held for Supervisor or Town Board in this cycle — ' +
      'the fall general election was the only town-level contest.',
    sources: [
      'https://www.westchestergov.com/boe99/',
      'https://citizenparticipation.westchestercountyny.gov/election-results',
      'https://app.enhancedvoting.com/results/public/westchester-county-ny/elections/2026GeneralElection',
      'https://citizenparticipation.westchestercountyny.gov/images/stories/pdfs/2025/2025-general-election-canvass.pdf',
      'https://citizenparticipation.westchestercountyny.gov/images/stories/pdfs/2025/2025_June_Primary_Election_Canvass.pdf',
      'https://westfaironline.com/latest-news/ballot-scanning-finished-and-westchester-election-results-known/',
      'https://www.cbsnews.com/newyork/news/democrat-declares-victory-in-westchester-county-supervisors-race-decided-by-3-votes/',
      'https://www.theexaminernews.com/rende-certified-as-north-castle-supervisor-winner-amidst-fraud-allegations/',
      'https://www.theexaminernews.com/milim-surprises-in-north-castle-incumbents-re-elected-in-mt-pleasant/',
      'https://www.theexaminernews.com/near-dead-heat-in-race-for-north-castle-supervisor/',
      'https://www.brennancenter.org/our-work/research-reports/new-york-even-year-election-law',
    ],
    races: [
      {
        year: 2026,
        type: 'general',
        date: '2026-11-03',
        office: 'Supervisor',
        seatsUp: 1,
        unofficial: true,
        candidates: [
          { name: 'Joseph A. Rende', parties: ['Democratic'], votes: 3219, won: true, incumbent: true },
          { name: 'Melvin D. Orellana', parties: ['Republican', 'Conservative'], votes: 2461, won: false, incumbent: false },
        ],
        note: 'Unofficial Board of Elections count as of Nov 18, 2026 (Orellana: 2,277 REP + 184 CON; ' +
          '6 write-ins). Certified totals may differ slightly. No Town Board seats were on the 2026 ballot.',
      },
      {
        year: 2026,
        type: 'primary',
        date: '2026-06-23',
        office: 'Supervisor',
        seatsUp: 1,
        candidates: [
          { name: 'Joseph A. Rende', parties: ['Democratic'], votes: 456, won: true, incumbent: true },
          { name: 'Jose Berra', parties: ['Democratic'], votes: 402, won: false, incumbent: false },
        ],
        note: 'Democratic primary (certified). Sitting Councilman Jose Berra challenged Rende for the ' +
          'Democratic line; Rende won with about 53% of the vote.',
      },
      {
        year: 2025,
        type: 'general',
        date: '2025-11-04',
        office: 'Supervisor',
        seatsUp: 1,
        candidates: [
          { name: 'Joseph A. Rende', parties: ['Democratic', 'Conservative'], votes: 2359, won: true, incumbent: true },
        ],
        note: 'Rende ran unopposed (1,899 DEM + 460 CON). Under the Even-Year Election Law this became a ' +
          'one-year term, putting the seat back on the ballot in 2026.',
      },
      {
        year: 2025,
        type: 'general',
        date: '2025-11-04',
        office: 'Town Board',
        seatsUp: 2,
        candidates: [
          { name: 'Barbara DiGiacinto', parties: ['Republican', 'Conservative'], votes: 1875, won: true, incumbent: true },
          { name: 'Sonny Vataj', parties: ['Democratic', 'Conservative'], votes: 1814, won: true, incumbent: false },
          { name: 'Michael Akavan', parties: ['Democratic'], votes: 1787, won: false, incumbent: false },
          { name: 'Melvin Orellana', parties: ['Republican'], votes: 1480, won: false, incumbent: false },
        ],
        note: 'Four candidates, two seats (certified canvass). DiGiacinto (1,670 REP + 205 CON) and ' +
          'first-time candidate Sonny Vataj (1,640 DEM + 174 CON) won; Akavan finished 27 votes behind Vataj.',
      },
      {
        year: 2023,
        type: 'general',
        date: '2023-11-07',
        office: 'Supervisor',
        seatsUp: 1,
        candidates: [
          { name: 'Joseph A. Rende', parties: ['Democratic'], votes: 1585, won: true, incumbent: false },
          { name: 'Barbara DiGiacinto', parties: ['Republican'], votes: 1582, won: false, incumbent: false },
        ],
        note: 'One of the closest town races in Westchester history for this open seat. Election night: ' +
          'Rende led 1,569–1,568 (one vote); after absentees, 1,585–1,582. Rende was certified the winner ' +
          'by three votes following a manual recount and litigation over challenged absentee ballots. ' +
          'DiGiacinto, a sitting councilwoman, kept her Town Board seat; Rende succeeded retiring Democrat Michael Schiliro.',
      },
      {
        year: 2023,
        type: 'general',
        date: '2023-11-07',
        office: 'Town Board',
        seatsUp: 2,
        candidates: [
          { name: 'Jose Berra', parties: ['Democratic'], votes: 1616, won: true, incumbent: true },
          { name: 'Saleem Hussain', parties: ['Democratic'], votes: 1524, won: true, incumbent: true },
          { name: 'Larry Ruisi', parties: ['Republican'], votes: 1490, won: false, incumbent: false },
          { name: 'Melvin Orellana', parties: ['Republican'], votes: 1447, won: false, incumbent: false },
        ],
        note: 'Four candidates, two seats. Democratic incumbents Berra and Hussain held both seats; ' +
          'Hussain finished about 32 votes ahead of third-place Ruisi.',
      },
      {
        year: 2021,
        type: 'general',
        date: '2021-11-02',
        office: 'Supervisor',
        seatsUp: 1,
        candidates: [
          { name: 'Michael Schiliro', parties: ['Democratic'], votes: null, won: true, incumbent: true },
        ],
        note: 'Schiliro ran unopposed for a fifth two-year term, then declined to seek a sixth in 2023.',
      },
      {
        year: 2021,
        type: 'general',
        date: '2021-11-02',
        office: 'Town Board',
        seatsUp: 2,
        candidates: [
          { name: 'Matt Milim', parties: ['Republican'], votes: 1639, won: true, incumbent: false },
          { name: 'Barbara DiGiacinto', parties: ['Republican'], votes: 1591, won: true, incumbent: true },
          { name: 'Barry Reiter', parties: ['Democratic'], votes: 1464, won: false, incumbent: true },
        ],
        note: 'Three candidates for two seats (only one Democrat ran). Republican Matt Milim, running a ' +
          'grassroots campaign, topped the poll and unseated Democratic incumbent Barry Reiter; ' +
          'Republican incumbent DiGiacinto took the second seat.',
      },
    ],
  },
}

/** All town-election data for a municipality, or null if none tracked. */
export function getElections(muniKey: string): MunicipalElections | null {
  return ELECTIONS[muniKey] ?? null
}

/** Distinct election years for a town, most recent first. */
export function electionYears(muniKey: string): number[] {
  const e = ELECTIONS[muniKey]
  if (!e) return []
  return Array.from(new Set(e.races.map((r) => r.year))).sort((a, b) => b - a)
}

/** Reduce a personal name to a comparable "first last" key, tolerant of middle
 *  initials, periods, nicknames-in-parens and casing. */
function nameKey(name: string): string {
  const cleaned = name
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')     // drop "(Joe)" style nicknames
    .replace(/[."']/g, ' ')
    .replace(/\b[a-z]\b/g, ' ')     // drop lone middle initials
    .replace(/\s+/g, ' ')
    .trim()
  const parts = cleaned.split(' ').filter(Boolean)
  if (parts.length === 0) return ''
  if (parts.length === 1) return parts[0]
  return `${parts[0]} ${parts[parts.length - 1]}`
}

/**
 * Every race a person appeared in, most recent first, with their result in that
 * race. Used to surface a legislator's electoral history on their profile page.
 */
export function candidateElectionHistory(
  muniKey: string,
  name: string,
): { race: ElectionRace; candidate: ElectionCandidate }[] {
  const e = ELECTIONS[muniKey]
  if (!e || !name) return []
  const key = nameKey(name)
  if (!key) return []
  const out: { race: ElectionRace; candidate: ElectionCandidate }[] = []
  for (const race of e.races) {
    for (const cand of race.candidates) {
      if (nameKey(cand.name) === key) out.push({ race, candidate: cand })
    }
  }
  // Most recent first; general before primary within a year.
  out.sort((a, b) => b.race.year - a.race.year || (a.race.type === 'general' ? -1 : 1))
  return out
}
