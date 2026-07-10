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

export interface HousingType {
  label: string
  /** Share of housing units of this structure type, 0–100. */
  pct: number
}

/** One year in a demographic trend series (for period-over-period sparklines). */
export interface DemoSeriesPoint {
  year: number
  population: number
  medianIncomeUsd: number
  medianHomeValueUsd: number
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
  /** Median owner-occupied home value (ACS B25077). */
  medianHomeValueUsd?: number
  /** Distribution of housing units by structure type (ACS B25024). */
  housingTypes?: HousingType[]
  /** Multi-year trend (oldest → newest) for period-over-period growth. */
  series?: DemoSeriesPoint[]
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
  medianHomeValueUsd: 985000,
  housingTypes: [
    { label: 'Single-family', pct: 86 },
    { label: '2–4 units', pct: 6 },
    { label: '5–19 units', pct: 4 },
    { label: '20+ units', pct: 3 },
    { label: 'Mobile / other', pct: 1 },
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
