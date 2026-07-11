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

export interface HomeValueBracket {
  label: string
  /** Share of owner-occupied units in this value range, 0–100. */
  pct: number
}

/** One uniform 5-year age bin (ACS B01001, male+female), 0–4 … 85+. */
export interface AgeBin {
  label: string
  /** Inclusive lower bound (years). */
  min: number
  /** Exclusive upper bound (years); null for the open-ended 85+ bin. */
  max: number | null
  /** Share of the population in this bin, 0–100. */
  pct: number
}

/** The full age distribution for one ACS vintage. */
export interface AgeVintage {
  year: number
  bins: AgeBin[]
}

/** One year in a demographic trend series (for period-over-period sparklines). */
export interface DemoSeriesPoint {
  year: number
  population: number
  medianIncomeUsd: number
  medianHomeValueUsd: number
  /** Median age (ACS B01002); optional so older data still validates. */
  medianAgeYears?: number
  /** Household count (ACS B11001); powers the household-size trend. */
  households?: number
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
  /** Distribution of owner-occupied units by value range (ACS B25075). */
  homeValueBrackets?: HomeValueBracket[]
  /** Average household size — people per occupied unit (ACS B25010). */
  avgHouseholdSizePeople?: number
  /** Multi-year trend (oldest → newest) for period-over-period growth. */
  series?: DemoSeriesPoint[]
  /** Fine-grained age distribution across ACS vintages (oldest → newest). */
  ageDistribution?: AgeVintage[]
}

/** Uniform 5-year bin labels, 0–4 … 85+ (matches AgeVintage.bins order). */
export const AGE_BIN_LABELS = [
  '0–4', '5–9', '10–14', '15–19', '20–24', '25–29', '30–34', '35–39', '40–44',
  '45–49', '50–54', '55–59', '60–64', '65–69', '70–74', '75–79', '80–84', '85+',
]

/** Build AgeBins from a parallel array of 18 percentages (0–4 … 85+). */
export function ageBinsFromPercents(pcts: number[]): AgeBin[] {
  return AGE_BIN_LABELS.map((label, i) => ({
    label,
    min: i * 5,
    max: i === AGE_BIN_LABELS.length - 1 ? null : i * 5 + 5,
    pct: pcts[i] ?? 0,
  }))
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
  avgHouseholdSizePeople: 2.8,
  housingTypes: [
    { label: 'Single-family', pct: 86 },
    { label: '2–4 units', pct: 6 },
    { label: '5–19 units', pct: 4 },
    { label: '20+ units', pct: 3 },
    { label: 'Mobile / other', pct: 1 },
  ],
  homeValueBrackets: [
    { label: '<$500K', pct: 8 },
    { label: '$500–750K', pct: 14 },
    { label: '$750K–1M', pct: 30 },
    { label: '$1–1.5M', pct: 26 },
    { label: '$1.5–2M', pct: 12 },
    { label: '$2M+', pct: 10 },
  ],
  // Approximate ACS 5-year trend (oldest → newest) so the dashboard shows
  // period-over-period movement even without a live Census key.
  series: [
    { year: 2018, population: 12000, medianIncomeUsd: 150000, medianHomeValueUsd: 850000, medianAgeYears: 45, households: 4250 },
    { year: 2019, population: 12050, medianIncomeUsd: 156000, medianHomeValueUsd: 880000, medianAgeYears: 45, households: 4270 },
    { year: 2020, population: 12100, medianIncomeUsd: 160000, medianHomeValueUsd: 910000, medianAgeYears: 46, households: 4290 },
    { year: 2021, population: 12150, medianIncomeUsd: 165000, medianHomeValueUsd: 950000, medianAgeYears: 46, households: 4300 },
    { year: 2022, population: 12100, medianIncomeUsd: 168000, medianHomeValueUsd: 985000, medianAgeYears: 47, households: 4300 },
  ],
  // Approximate ACS B01001 age distribution across a ~decade so the chart shows
  // the shift over time even without a live Census key. (0–4 … 85+)
  ageDistribution: [
    {
      year: 2013,
      bins: ageBinsFromPercents([5, 8, 10, 8, 3, 4, 5, 7, 10, 11, 9, 7, 5, 3, 2, 1, 1, 1]),
    },
    {
      year: 2022,
      bins: ageBinsFromPercents([4, 7, 9, 9, 3, 3, 3, 5, 8, 11, 11, 8, 7, 5, 3, 2, 1, 1]),
    },
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
