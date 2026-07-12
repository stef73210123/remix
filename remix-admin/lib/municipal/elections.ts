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
      'decided by roughly four votes after absentee canvassing, a manual recount and litigation — and ' +
      'took office in January 2024. In June 2025 Rende turned back a Democratic primary challenge ' +
      'from sitting Councilman Jose Berra with roughly 53% of the vote, then was re-elected unopposed ' +
      '(Democratic and Conservative lines) that November.',
    primaryNote:
      'No contested town primary (June) was held for Supervisor or Town Board in this cycle — ' +
      'the fall general election was the only town-level contest.',
    sources: [
      'https://www.westchestergov.com/boe99/',
      'https://citizenparticipation.westchestercountyny.gov/election-results',
      'https://www.cbsnews.com/newyork/news/democrat-declares-victory-in-westchester-county-supervisors-race-decided-by-3-votes/',
      'https://www.theexaminernews.com/rende-certified-as-north-castle-supervisor-winner-amidst-fraud-allegations/',
      'https://www.theexaminernews.com/milim-surprises-in-north-castle-incumbents-re-elected-in-mt-pleasant/',
      'https://patch.com/new-york/chappaqua/polls-have-closed-new-castle-mount-kisco-north-castle-election-day-2025-early',
      'https://www.theexaminernews.com/near-dead-heat-in-race-for-north-castle-supervisor/',
      'https://westfaironline.com/elections/conley-feiner-among-the-winners-in-democrat-primary-contests/',
    ],
    races: [
      {
        year: 2025,
        type: 'primary',
        date: '2025-06-24',
        office: 'Supervisor',
        seatsUp: 1,
        candidates: [
          { name: 'Joseph A. Rende', parties: ['Democratic'], votes: null, won: true, incumbent: true },
          { name: 'Jose Berra', parties: ['Democratic'], votes: null, won: false, incumbent: false },
        ],
        note: 'Democratic primary. Sitting Councilman Jose Berra challenged first-term Supervisor Joe ' +
          'Rende for the Democratic line; Rende won the nomination with roughly 53% of the vote and went ' +
          'on to run unopposed in November. Vote totals pending BOE certification transcription.',
      },
      {
        year: 2025,
        type: 'general',
        date: '2025-11-04',
        office: 'Supervisor',
        seatsUp: 1,
        candidates: [
          { name: 'Joseph A. Rende', parties: ['Democratic', 'Conservative'], votes: null, won: true, incumbent: true },
        ],
        note: 'Rende ran unopposed for re-election, appearing on both the Democratic and Conservative lines.',
      },
      {
        year: 2025,
        type: 'general',
        date: '2025-11-04',
        office: 'Town Board',
        seatsUp: 2,
        candidates: [
          { name: 'Barbara DiGiacinto', parties: ['Republican', 'Conservative'], votes: 1864, won: true, incumbent: true },
          { name: 'Sonny Vataj', parties: ['Democratic', 'Conservative'], votes: 1794, won: true, incumbent: false },
          { name: 'Michael Akavan', parties: ['Democratic'], votes: 1773, won: false, incumbent: false },
          { name: 'Melvin Orellana', parties: ['Republican'], votes: 1468, won: false, incumbent: false },
        ],
        note: 'Four candidates, two seats — a split result decided by the future of Town Hall. ' +
          'Republican incumbent DiGiacinto (1,659 REP + 205 CON) and Democrat Sonny Vataj, a first-time ' +
          'candidate and Armonk volunteer firefighter (1,621 DEM + 173 CON), won; Akavan (D) and Orellana (R) fell short.',
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
          'by four votes following a manual recount and litigation over challenged absentee ballots. ' +
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
