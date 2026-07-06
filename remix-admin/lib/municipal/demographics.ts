/**
 * High-level jurisdiction demographics for the municipal dashboard.
 *
 * Figures are approximate (order-of-magnitude correct from public ACS data)
 * and flagged `approximate: true` until wired to a live Census ACS pull. The
 * shape is what matters — swap in exact ACS values per town.
 */

export interface IncomeBracket {
  label: string
  /** Share of households in this bracket, 0–100. */
  pct: number
}

export interface TownDemographics {
  townKey: string
  townName: string
  approximate: boolean
  source: string
  population: number
  households: number
  medianIncomeUsd: number
  medianAgeYears: number
  ownerOccupiedPct: number
  incomeBrackets: IncomeBracket[]
}

const BRACKET_LABELS = ['<$50K', '$50–100K', '$100–150K', '$150–200K', '$200K+']

const NORTH_CASTLE: TownDemographics = {
  townKey: 'nc',
  townName: 'Town of North Castle',
  approximate: true,
  source: 'Approx. from U.S. Census ACS 5-year — verify',
  population: 12100,
  households: 4300,
  medianIncomeUsd: 168000,
  medianAgeYears: 46,
  ownerOccupiedPct: 85,
  incomeBrackets: [
    { label: BRACKET_LABELS[0], pct: 14 },
    { label: BRACKET_LABELS[1], pct: 16 },
    { label: BRACKET_LABELS[2], pct: 15 },
    { label: BRACKET_LABELS[3], pct: 14 },
    { label: BRACKET_LABELS[4], pct: 41 },
  ],
}

const ROCKLAND: TownDemographics = {
  townKey: 'rockland',
  townName: 'Town of Rockland',
  approximate: true,
  source: 'Approx. from U.S. Census ACS 5-year — verify',
  population: 4100,
  households: 1700,
  medianIncomeUsd: 62000,
  medianAgeYears: 49,
  ownerOccupiedPct: 78,
  incomeBrackets: [
    { label: BRACKET_LABELS[0], pct: 41 },
    { label: BRACKET_LABELS[1], pct: 29 },
    { label: BRACKET_LABELS[2], pct: 16 },
    { label: BRACKET_LABELS[3], pct: 8 },
    { label: BRACKET_LABELS[4], pct: 6 },
  ],
}

export const TOWN_DEMOGRAPHICS: Record<string, TownDemographics> = {
  nc: NORTH_CASTLE,
  rockland: ROCKLAND,
}

export function getDemographics(townKey: string): TownDemographics | undefined {
  return TOWN_DEMOGRAPHICS[townKey]
}
