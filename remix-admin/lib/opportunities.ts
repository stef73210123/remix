export type Tier = 'A' | 'B' | 'C'

export interface Opportunity {
  tier: Tier
  title: string
  agency: string
  cr: string
  due: string // ISO date, or '' if rolling
  dueLabel: string
  city: string
  rationale: string
}

export const nyscrUrl = (cr: string) =>
  `https://www.nyscr.ny.gov/Ads/Search?Status=Open&Keyword=${cr}`

export const OPPORTUNITIES: Opportunity[] = [
  {
    tier: 'A',
    title: 'Economic Development Services — Consultant Pool (RFQ)',
    agency: 'Empire State Development',
    cr: '2136655',
    due: '2026-08-28',
    dueLabel: '8/28/2026',
    city: 'Statewide NY',
    rationale:
      'Direct fit: site-selection & economic-development background plus advisory practice. Qualified-vendor pool = recurring task-order work once admitted.',
  },
  {
    tier: 'A',
    title: 'Student Housing Development — Ground Lease, SUNY ESF (RFI)',
    agency: 'SUNY System Administration',
    cr: '2136174',
    due: '2026-07-22',
    dueLabel: '7/22/2026',
    city: 'Syracuse, NY',
    rationale:
      'A development / ground-lease play (not a consulting RFP) — closest to the Remix / mixed-use developer profile. Pursue as principal or advisor to a development team.',
  },
  {
    tier: 'A',
    title: 'Business Consulting Services',
    agency: 'NYS Office of General Services',
    cr: '2133780',
    due: '2026-07-07',
    dueLabel: '7/7/2026',
    city: 'Albany, NY',
    rationale:
      'Broad statewide consulting vehicle — position strategy / underwriting / asset-management advisory.',
  },
  {
    tier: 'A',
    title: 'Land Lease & Development Opportunities for Energy Storage (RFQ)',
    agency: 'Power Authority of New York',
    cr: '2136537',
    due: '',
    dueLabel: 'Rolling — through 6/24/2028',
    city: 'Statewide NY',
    rationale:
      'Land assemblage / ground-lease development structuring. Aligns with land-assemblage and deal-structuring experience. Rolling deadline.',
  },
  {
    tier: 'B',
    title: 'Disadvantaged Communities Consultant Pool',
    agency: 'NYSERDA',
    cr: '2125864',
    due: '2026-12-31',
    dueLabel: '12/31/2026',
    city: 'Statewide NY',
    rationale:
      'Consultant pool spanning planning / community development. Low-pressure deadline; builds a state credential.',
  },
  {
    tier: 'B',
    title: 'Smart Growth Community Planning Program',
    agency: 'NYS Dept. of State',
    cr: '2135699',
    due: '2026-07-31',
    dueLabel: '7/31/2026',
    city: 'Statewide NY',
    rationale:
      'Land-use / smart-growth planning — adjacent to entitlements and mixed-use development.',
  },
  {
    tier: 'B',
    title: 'Brownfield Opportunity Area Program',
    agency: 'NYS Dept. of State',
    cr: '2135693',
    due: '2026-07-31',
    dueLabel: '7/31/2026',
    city: 'Statewide NY',
    rationale:
      'Brownfield redevelopment planning — site repositioning and adaptive reuse.',
  },
  {
    tier: 'B',
    title: 'Transportation Planning Platform',
    agency: 'Niagara Frontier Transportation Authority',
    cr: '2136625',
    due: '2026-07-21',
    dueLabel: '7/21/2026',
    city: 'Buffalo, NY',
    rationale:
      'Location / planning data platform — closest match to the Placer.ai / Remix location-intelligence profile.',
  },
  {
    tier: 'B',
    title: 'Pre-Qualified IT Goods & Services',
    agency: 'Empire State Development',
    cr: '2136510',
    due: '2026-08-07',
    dueLabel: '8/7/2026',
    city: 'Statewide NY',
    rationale:
      'IT vendor pre-qualification — entry point to position a PropTech / data-tooling offering to the state.',
  },
  {
    tier: 'C',
    title: 'Schroon Unified Zoning & Development Code',
    agency: 'Essex County',
    cr: '2135547',
    due: '2026-06-30',
    dueLabel: '6/30/2026',
    city: 'Schroon Lake, NY',
    rationale:
      'Zoning / development-code work; relevant to entitlements experience but deadline imminent.',
  },
  {
    tier: 'C',
    title: 'Just Transition Site Reuse Planning',
    agency: 'NYSERDA',
    cr: '2078045',
    due: '2026-06-30',
    dueLabel: '6/30/2026',
    city: 'Statewide NY',
    rationale: 'Site reuse / repositioning planning. Deadline imminent.',
  },
  {
    tier: 'C',
    title: 'Asset Management Software (RFP)',
    agency: 'Empire State Development',
    cr: '2136198',
    due: '2026-07-17',
    dueLabel: '7/17/2026',
    city: 'Statewide NY',
    rationale:
      'Software-oriented, but asset-management + analytics background gives domain credibility (partner / advisor angle).',
  },
  {
    tier: 'C',
    title: 'Real Property Appraisal Services',
    agency: 'NYS Dept. of Tax & Finance',
    cr: '2133427',
    due: '2026-07-09',
    dueLabel: '7/9/2026',
    city: 'Albany, NY',
    rationale:
      'RE valuation work; specialized utility/telecom property likely needs a licensed-appraiser partner.',
  },
]
