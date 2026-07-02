/**
 * RFP CRM data types + curated seed.
 *
 * The `Opportunity` type is the canonical shape written to Upstash by every
 * state adapter (see lib/rfp-adapters/) and read by the admin UI via
 * /admin/api/rfps.
 *
 * `curated: true` marks rows Stefan hand-entered — those rows are protected
 * from overwrite during ingest. The NY adapter may upgrade `sourceUrl` /
 * `linkStatus` from search-fallback to a direct portal deep-link when a
 * matching solicitation is found, but never touches tier/rationale/notes.
 */
export type Tier = 'A' | 'B' | 'C'
export type StateCode = 'NY' | 'CT' | 'NJ' | 'RI' | 'MA'

export const STATE_NAMES: Record<StateCode, string> = {
  NY: 'New York',
  CT: 'Connecticut',
  NJ: 'New Jersey',
  RI: 'Rhode Island',
  MA: 'Massachusetts',
}

export const STATE_CODES: StateCode[] = ['NY', 'CT', 'NJ', 'RI', 'MA']

/**
 * `direct` = link points at the exact solicitation record on the portal.
 * `search-fallback` = link is a portal search URL keyed by the CR/bid number
 * (used for curated NY rows before the ingest finds them).
 */
export type LinkStatus = 'direct' | 'search-fallback'

export interface Opportunity {
  /** Composite key: `${state}:${sourceId}`. Also the Redis key suffix. */
  id: string
  state: StateCode
  /** Portal-issued solicitation ID (CR#, bid#, docId, etc.). */
  sourceId: string
  /** Portal name for display ("NYSCR", "COMMBUYS", etc.). */
  sourceName: string
  /** URL to the underlying source content (direct deep-link when possible). */
  sourceUrl: string
  linkStatus: LinkStatus

  title: string
  agency: string
  city: string

  /** ISO date "YYYY-MM-DD", empty string for rolling. */
  due: string
  /** Human-friendly deadline label. */
  dueLabel: string

  /** Solicitation number. For curated NY rows this is the CR#. */
  cr: string

  /** Stefan-curated fields — never overwritten by ingest. */
  tier: Tier | ''
  rationale: string
  notes: string

  /** True for hand-entered rows (the 13 curated NY entries). */
  curated: boolean
  ingestedAt: string // ISO timestamp
}

/**
 * Fallback URL when we only have a solicitation number and haven't matched
 * it to a direct portal record yet.
 */
export const nyscrUrl = (cr: string) =>
  `https://www.nyscr.ny.gov/Ads/Search?Status=Open&Keyword=${cr}`

const now = () => new Date().toISOString()

const curatedNY = (
  cr: string,
  tier: Tier,
  title: string,
  agency: string,
  city: string,
  due: string,
  dueLabel: string,
  rationale: string,
): Opportunity => ({
  id: `NY:${cr}`,
  state: 'NY',
  sourceId: cr,
  sourceName: 'NYSCR',
  sourceUrl: nyscrUrl(cr),
  linkStatus: 'search-fallback',
  title,
  agency,
  city,
  due,
  dueLabel,
  cr,
  tier,
  rationale,
  notes: '',
  curated: true,
  ingestedAt: now(),
})

/**
 * The 13 hand-curated NY entries. Seeded into Redis on first ingest and
 * protected against overwrite thereafter. The NY adapter may upgrade the
 * `sourceUrl`/`linkStatus` if it matches one of these CR numbers to a
 * direct portal record.
 */
export const CURATED_NY_OPPORTUNITIES: Opportunity[] = [
  curatedNY(
    '2136655',
    'A',
    'Economic Development Services — Consultant Pool (RFQ)',
    'Empire State Development',
    'Statewide NY',
    '2026-08-28',
    '8/28/2026',
    'Direct fit: site-selection & economic-development background plus advisory practice. Qualified-vendor pool = recurring task-order work once admitted.',
  ),
  curatedNY(
    '2136174',
    'A',
    'Student Housing Development — Ground Lease, SUNY ESF (RFI)',
    'SUNY System Administration',
    'Syracuse, NY',
    '2026-07-22',
    '7/22/2026',
    'A development / ground-lease play (not a consulting RFP) — closest to the Remix / mixed-use developer profile. Pursue as principal or advisor to a development team.',
  ),
  curatedNY(
    '2133780',
    'A',
    'Business Consulting Services',
    'NYS Office of General Services',
    'Albany, NY',
    '2026-07-07',
    '7/7/2026',
    'Broad statewide consulting vehicle — position strategy / underwriting / asset-management advisory.',
  ),
  curatedNY(
    '2136537',
    'A',
    'Land Lease & Development Opportunities for Energy Storage (RFQ)',
    'Power Authority of New York',
    'Statewide NY',
    '',
    'Rolling — through 6/24/2028',
    'Land assemblage / ground-lease development structuring. Aligns with land-assemblage and deal-structuring experience. Rolling deadline.',
  ),
  curatedNY(
    '2125864',
    'B',
    'Disadvantaged Communities Consultant Pool',
    'NYSERDA',
    'Statewide NY',
    '2026-12-31',
    '12/31/2026',
    'Consultant pool spanning planning / community development. Low-pressure deadline; builds a state credential.',
  ),
  curatedNY(
    '2135699',
    'B',
    'Smart Growth Community Planning Program',
    'NYS Dept. of State',
    'Statewide NY',
    '2026-07-31',
    '7/31/2026',
    'Land-use / smart-growth planning — adjacent to entitlements and mixed-use development.',
  ),
  curatedNY(
    '2135693',
    'B',
    'Brownfield Opportunity Area Program',
    'NYS Dept. of State',
    'Statewide NY',
    '2026-07-31',
    '7/31/2026',
    'Brownfield redevelopment planning — site repositioning and adaptive reuse.',
  ),
  curatedNY(
    '2136625',
    'B',
    'Transportation Planning Platform',
    'Niagara Frontier Transportation Authority',
    'Buffalo, NY',
    '2026-07-21',
    '7/21/2026',
    'Location / planning data platform — closest match to the Placer.ai / Remix location-intelligence profile.',
  ),
  curatedNY(
    '2136510',
    'B',
    'Pre-Qualified IT Goods & Services',
    'Empire State Development',
    'Statewide NY',
    '2026-08-07',
    '8/7/2026',
    'IT vendor pre-qualification — entry point to position a PropTech / data-tooling offering to the state.',
  ),
  curatedNY(
    '2135547',
    'C',
    'Schroon Unified Zoning & Development Code',
    'Essex County',
    'Schroon Lake, NY',
    '2026-06-30',
    '6/30/2026',
    'Zoning / development-code work; relevant to entitlements experience but deadline imminent.',
  ),
  curatedNY(
    '2078045',
    'C',
    'Just Transition Site Reuse Planning',
    'NYSERDA',
    'Statewide NY',
    '2026-06-30',
    '6/30/2026',
    'Site reuse / repositioning planning. Deadline imminent.',
  ),
  curatedNY(
    '2136198',
    'C',
    'Asset Management Software (RFP)',
    'Empire State Development',
    'Statewide NY',
    '2026-07-17',
    '7/17/2026',
    'Software-oriented, but asset-management + analytics background gives domain credibility (partner / advisor angle).',
  ),
  curatedNY(
    '2133427',
    'C',
    'Real Property Appraisal Services',
    'NYS Dept. of Tax & Finance',
    'Albany, NY',
    '2026-07-09',
    '7/9/2026',
    'RE valuation work; specialized utility/telecom property likely needs a licensed-appraiser partner.',
  ),
]

/**
 * @deprecated Kept as a compat re-export while the UI transitions off the
 * static array. The DashboardClient now fetches from /admin/api/rfps.
 * Retained so old imports don't break during the schema migration.
 */
export const OPPORTUNITIES: Opportunity[] = CURATED_NY_OPPORTUNITIES
