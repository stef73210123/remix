/**
 * Municipality registry — the *only* place town-specific config lives.
 *
 * Adding a 21st town = one entry here + reuse of existing adapters.
 * The ingest pipeline never branches on jurisdiction — it iterates
 * `sources` and dispatches to the named adapter.
 *
 * Body scheduling patterns are human-readable strings; a future RRULE
 * parser can consume them for scheduling / gap detection. For M1 they
 * are documentation only.
 */

export type AdapterKey =
  | 'nc-civicplus'
  | 'nc-civicclerk'
  | 'nc-granicus'
  | 'nc-youtube'
  | 'rockland-wp'
  | 'ecode360'

export interface BodySeed {
  key: string
  displayName: string
  meetingPattern?: string
  civicPlusAgendaId?: number   // AgendaCenter "cat=" id or slug id
  granicusViewId?: number      // ViewPublisher view_id, when video source is Granicus
  meta?: Record<string, unknown>
}

export interface MunicipalityConfig {
  key: string
  name: string
  state: string
  county?: string
  timezone: string
  sources: {
    meetings: AdapterKey[]
    code: string[]              // e.g. 'ecode360:29140526'
    officials: AdapterKey[]
  }
  bodies: BodySeed[]
  domains: string[]             // canonical + mirrors (`.com`, `.gov`)
  meta?: Record<string, unknown>
}

export const MUNICIPALITIES: MunicipalityConfig[] = [
  {
    key: 'nc',
    name: 'Town of North Castle',
    state: 'NY',
    county: 'Westchester',
    timezone: 'America/New_York',
    domains: ['northcastleny.com', 'northcastleny.gov'],
    sources: {
      // North Castle publishes meetings on a CivicClerk portal, not the
      // CivicPlus AgendaCenter — the AgendaCenter category ids below returned
      // the wrong board's documents (e.g. Parks & Rec agenda under Town Board).
      meetings: ['nc-civicclerk', 'nc-granicus'],
      code: ['ecode360:29140526'],
      officials: ['nc-civicplus'],
    },
    bodies: [
      {
        key: 'town_board',
        displayName: 'Town Board',
        meetingPattern: '2nd & 4th Wednesday 7:30pm',
        civicPlusAgendaId: 8,          // to be verified on first scrape
        granicusViewId: 2,
      },
      {
        key: 'planning',
        displayName: 'Planning Board',
        meetingPattern: '2nd & 4th Monday 7:00pm',
        civicPlusAgendaId: 9,
        granicusViewId: 2,
      },
      {
        key: 'zba',
        displayName: 'Zoning Board of Appeals',
        meetingPattern: 'Monthly',
        civicPlusAgendaId: 10,
        granicusViewId: 2,
      },
      {
        key: 'arb',
        displayName: 'Architectural Review Board',
        meetingPattern: 'Monthly (as-needed)',
        civicPlusAgendaId: 11,
        granicusViewId: 2,
      },
      {
        key: 'conservation',
        displayName: 'Conservation Board',
        meetingPattern: 'Monthly',
        civicPlusAgendaId: 12,
        granicusViewId: 2,
      },
      {
        key: 'open_space',
        displayName: 'Open Space Committee',
        meetingPattern: 'Quarterly to monthly',
        granicusViewId: 2,
      },
      {
        key: 'parks_rec',
        displayName: 'Parks and Recreation',
        meetingPattern: 'Monthly',
        granicusViewId: 2,
      },
    ],
  },
  {
    key: 'rockland',
    name: 'Town of Rockland',
    state: 'NY',
    county: 'Sullivan',
    timezone: 'America/New_York',
    domains: ['townofrocklandny.com', 'townofrocklandny.gov'],
    sources: {
      meetings: ['rockland-wp'],
      code: ['ecode360:RO1679'],
      officials: ['rockland-wp'],
    },
    bodies: [
      {
        key: 'town_board',
        displayName: 'Town Board',
        meetingPattern: '1st & 3rd Thursday 7:00pm (Livingston Manor Town Hall)',
        meta: { minutes_url: '/town-board/meeting-minutes/', hub_url: '/town-board/' },
      },
      {
        key: 'planning',
        displayName: 'Planning Board',
        meetingPattern: '1st Wednesday 7:00pm (via Zoom)',
        meta: {
          minutes_url: '/planning-board-2/planning-board-meeting-minutes/',
          hub_url: '/planning-board-2/',
          video_platform: 'zoom_private',
        },
      },
      {
        key: 'zba',
        displayName: 'Zoning Board of Appeals',
        meetingPattern: 'Monthly (as-needed)',
        meta: { hub_url: '/zoning-board-of-appeals/' },
      },
    ],
  },
]

export function findMunicipality(key: string): MunicipalityConfig | undefined {
  return MUNICIPALITIES.find((m) => m.key === key)
}

/**
 * Boards that exist in the registry but are deliberately not surfaced as their
 * own page or nav entry, keyed by municipality.
 *
 * A board page is only worth linking to when there's enough behind it to be
 * useful. North Castle's Architectural Review Board meets as-needed and only
 * one usable public recording exists for it (2022-02-02), so its page would be
 * a roster and a single meeting — thin enough to read as an oversight rather
 * than a limit of the source material. The dataset stays on disk; if more ARB
 * recordings are ingested later, removing the key here brings the page back.
 *
 * These boards still count toward the "N of M boards covered" denominator on
 * the dashboard, because they are real boards the Town has — we just don't
 * cover them yet, and hiding that would overstate the site's reach.
 */
export const HIDDEN_BODIES: Record<string, string[]> = {
  nc: ['arb'],
}

/** True when a board exists but is intentionally not given a page/nav entry. */
export function isHiddenBody(muniKey: string, bodyKey: string): boolean {
  return (HIDDEN_BODIES[muniKey] || []).includes(bodyKey)
}
