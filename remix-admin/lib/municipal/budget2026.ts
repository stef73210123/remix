/**
 * Town of North Castle 2026 Adopted Budget — real figures, transcribed from
 * the town's own adopted-budget summary schedules (the FY2026 budget itself
 * was previously only available as a scanned, non-machine-readable PDF; this
 * is that data in usable form). Distinct from budget.ts's FY2025 ACFR
 * actuals (which feed the revenue→spending Sankey) — this is the budget AS
 * ADOPTED for 2026, by fund, plus the town's own multi-year fund-balance
 * history and tax-cap worksheet.
 */

export interface FundAppropriation {
  category: string
  fund: string
  code: string
  appropriation: number
  revenue: number
  appropriatedFundBalance: number
  taxLevy: number
}

/** Every individual fund/district line from the 2026 Budget Summary — the
 *  sheet's own subtotal/grand-total rows are omitted; category and grand
 *  totals are derived from these by summing, so there's one source of truth. */
export const NC_2026_APPROPRIATIONS: FundAppropriation[] = [
  { category: 'General Funds', fund: 'General', code: 'A', appropriation: 27307201, revenue: 12171595, appropriatedFundBalance: 2088595, taxLevy: 13047011 },
  { category: 'General Funds', fund: 'Highway', code: 'DA', appropriation: 7993977, revenue: 500000, appropriatedFundBalance: 0, taxLevy: 7493977 },
  { category: 'General Funds', fund: 'Library', code: 'L', appropriation: 1859126, revenue: 16000, appropriatedFundBalance: 0, taxLevy: 1843126 },
  { category: 'Fire Protection', fund: 'Fire Protection 1 - Banksville', code: 'SF1', appropriation: 479195, revenue: 0, appropriatedFundBalance: 0, taxLevy: 479195 },
  { category: 'Street Lighting', fund: 'Street Light 1 - NWP', code: 'SL1', appropriation: 82000, revenue: 0, appropriatedFundBalance: 0, taxLevy: 82000 },
  { category: 'Street Lighting', fund: 'Street Light 2 - Armonk', code: 'SL2', appropriation: 98000, revenue: 0, appropriatedFundBalance: 0, taxLevy: 98000 },
  { category: 'Street Lighting', fund: 'Street Light 3 - King', code: 'SL3', appropriation: 5500, revenue: 0, appropriatedFundBalance: 0, taxLevy: 5500 },
  { category: 'Ambulance', fund: 'Ambulance Dist. 1 - Valhalla', code: 'SM1', appropriation: 125250, revenue: 0, appropriatedFundBalance: 0, taxLevy: 125250 },
  { category: 'Ambulance', fund: 'Ambulance Dist. 2 - WEMS', code: 'SM2', appropriation: 420000, revenue: 0, appropriatedFundBalance: 0, taxLevy: 420000 },
  { category: 'Park', fund: 'Long Pond Dam Park District', code: 'LP', appropriation: 16000, revenue: 0, appropriatedFundBalance: 0, taxLevy: 16000 },
  { category: 'Sewer Districts', fund: 'Sewer 1 - NWP', code: 'SS1', appropriation: 117428, revenue: 100, appropriatedFundBalance: 22620, taxLevy: 94708 },
  { category: 'Sewer Districts', fund: 'Sewer 1B - Quarry Hghts', code: 'S1B', appropriation: 49020, revenue: 50, appropriatedFundBalance: 22970, taxLevy: 26000 },
  { category: 'Sewer Districts', fund: 'Sewer 2 - Armonk', code: 'SS2', appropriation: 2002560, revenue: 210250, appropriatedFundBalance: 557709, taxLevy: 1234601 },
  { category: 'Sewer Districts', fund: 'Sewer 3 - Rte. 120', code: 'SS3', appropriation: 84597, revenue: 0, appropriatedFundBalance: 11597, taxLevy: 73000 },
  { category: 'Sewer Districts', fund: 'Sewer 4 - Orchard St', code: 'SS4', appropriation: 57835, revenue: 0, appropriatedFundBalance: 33835, taxLevy: 24000 },
  { category: 'Water Districts', fund: 'Water 1 - NWP', code: 'SW1', appropriation: 832843, revenue: 653456, appropriatedFundBalance: 147490, taxLevy: 31897 },
  { category: 'Water Districts', fund: 'Water 2 - Windmill', code: 'SW2', appropriation: 1003743, revenue: 377194, appropriatedFundBalance: 110049, taxLevy: 516500 },
  { category: 'Water Districts', fund: 'Water 4 - Armonk', code: 'SW4', appropriation: 911291, revenue: 477446, appropriatedFundBalance: 255050, taxLevy: 178795 },
  { category: 'Water Districts', fund: 'Water 5 - Whippoorwill', code: 'SW5', appropriation: 195641, revenue: 115436, appropriatedFundBalance: 80205, taxLevy: 0 },
  { category: 'Water Districts', fund: 'Water 8 - King Street', code: 'SW8', appropriation: 101362, revenue: 76691, appropriatedFundBalance: 24671, taxLevy: 0 },
  { category: 'Water Districts', fund: 'Water 9 - Quarry District', code: 'SW9', appropriation: 38492, revenue: 38492, appropriatedFundBalance: 0, taxLevy: 0 },
]

export interface FundAppropriationChange {
  category: string
  fund: string
  code: string
  appropriation2026: number
  appropriation2025: number
}

/** Every individual fund/district line from "2025 vs 2026 Appropriations by
 *  Fund" — sheet subtotal/grand-total rows omitted for the same reason. Note
 *  this sheet groups categories slightly differently than the summary above
 *  (Sewer + Water combined into one "Sewer & Water" category; Fire Protection
 *  and the Park district combined into "Other Special Districts"). */
export const NC_2025_VS_2026: FundAppropriationChange[] = [
  { category: 'General Funds', fund: 'General', code: 'A', appropriation2026: 27307201, appropriation2025: 25935826 },
  { category: 'General Funds', fund: 'Highway', code: 'DA', appropriation2026: 7993977, appropriation2025: 8761300 },
  { category: 'General Funds', fund: 'Library', code: 'L', appropriation2026: 1859126, appropriation2025: 1755125 },
  { category: 'Sewer & Water', fund: 'Sewer 1 - North White Plains', code: 'SS1', appropriation2026: 117428, appropriation2025: 128281 },
  { category: 'Sewer & Water', fund: 'Sewer District 1 Quarry Heights', code: 'S1B', appropriation2026: 49020, appropriation2025: 38356 },
  { category: 'Sewer & Water', fund: 'Sewer 2 - Armonk', code: 'SS2', appropriation2026: 2002560, appropriation2025: 1896035 },
  { category: 'Sewer & Water', fund: 'Sewer 3 - Route 120', code: 'SS3', appropriation2026: 84597, appropriation2025: 81584 },
  { category: 'Sewer & Water', fund: 'Sewer 4 - Orchard/Route 22', code: 'SS4', appropriation2026: 57835, appropriation2025: 46435 },
  { category: 'Sewer & Water', fund: 'Water 1 - North White Plains', code: 'SW1', appropriation2026: 832843, appropriation2025: 781773 },
  { category: 'Sewer & Water', fund: 'Water 2 - Windmill', code: 'SW2', appropriation2026: 1003743, appropriation2025: 930080 },
  { category: 'Sewer & Water', fund: 'Water 4 - Armonk', code: 'SW4', appropriation2026: 911291, appropriation2025: 626121 },
  { category: 'Sewer & Water', fund: 'Water 5 - Whippoorwill', code: 'SW5', appropriation2026: 195641, appropriation2025: 165161 },
  { category: 'Sewer & Water', fund: 'Water 8 - King Street', code: 'SW8', appropriation2026: 101362, appropriation2025: 76692 },
  { category: 'Sewer & Water', fund: 'Water 9 - Quarry District', code: 'SW9', appropriation2026: 38492, appropriation2025: 0 },
  { category: 'Street Lighting', fund: 'Street Lighting 1 - North White Plains', code: 'SL1', appropriation2026: 82000, appropriation2025: 80000 },
  { category: 'Street Lighting', fund: 'Street Lighting 2 - Armonk', code: 'SL2', appropriation2026: 98000, appropriation2025: 95000 },
  { category: 'Street Lighting', fund: 'Street Lighting 3 - King', code: 'SL3', appropriation2026: 5500, appropriation2025: 5000 },
  { category: 'Ambulance', fund: 'Ambulance District 1', code: 'SM1', appropriation2026: 125250, appropriation2025: 125250 },
  { category: 'Ambulance', fund: 'Ambulance District 2', code: 'SM2', appropriation2026: 420000, appropriation2025: 372000 },
  { category: 'Other Special Districts', fund: 'Fire Protection District 1', code: 'SF1', appropriation2026: 479195, appropriation2025: 479695 },
  { category: 'Other Special Districts', fund: 'Long Pond Dam District', code: 'LP', appropriation2026: 16000, appropriation2025: 16000 },
]

export interface FundBalanceYear {
  year: number
  fundEquityBeg: number
  revenues: number
  expenses: number
  fundEquityEnd: number
  nonspendableRestricted: number
  assignedUnrestricted: number
  unrestrictedPctOfExpenditures: number
}

export interface FundBalanceSeries {
  fund: string
  years: FundBalanceYear[]
}

/** General, Highway, Library & Combined fund-balance history, 2019–2024 — the
 *  town's own "financial position" summary (fund equity, revenues, expenses,
 *  and how much of that equity is truly free reserve vs. restricted). */
export const NC_FUND_BALANCE_HISTORY: FundBalanceSeries[] = [
  {
    fund: 'General Fund',
    years: [
      { year: 2019, fundEquityBeg: 10112118, revenues: 22735872, expenses: 20214357, fundEquityEnd: 12633633, nonspendableRestricted: 499880, assignedUnrestricted: 12133753, unrestrictedPctOfExpenditures: 0.600254 },
      { year: 2020, fundEquityBeg: 12633633, revenues: 18645986, expenses: 18134157, fundEquityEnd: 13145462, nonspendableRestricted: 554394, assignedUnrestricted: 12591068, unrestrictedPctOfExpenditures: 0.694329 },
      { year: 2021, fundEquityBeg: 13145462, revenues: 21572065, expenses: 19860099, fundEquityEnd: 14857428, nonspendableRestricted: 605624, assignedUnrestricted: 14251804, unrestrictedPctOfExpenditures: 0.71761 },
      { year: 2022, fundEquityBeg: 14857428, revenues: 23746949, expenses: 20941992, fundEquityEnd: 17662385, nonspendableRestricted: 504987, assignedUnrestricted: 17157398, unrestrictedPctOfExpenditures: 0.819282 },
      { year: 2023, fundEquityBeg: 17662385, revenues: 24472096, expenses: 22674677, fundEquityEnd: 19459804, nonspendableRestricted: 540582, assignedUnrestricted: 18919222, unrestrictedPctOfExpenditures: 0.834377 },
      { year: 2024, fundEquityBeg: 19459804, revenues: 26429971, expenses: 24232646, fundEquityEnd: 21657129, nonspendableRestricted: 653152, assignedUnrestricted: 21003977, unrestrictedPctOfExpenditures: 0.866764 },
    ],
  },
  {
    fund: 'Highway Fund',
    years: [
      { year: 2019, fundEquityBeg: 1338897, revenues: 8343177, expenses: 8733097, fundEquityEnd: 948977, nonspendableRestricted: 0, assignedUnrestricted: 948977, unrestrictedPctOfExpenditures: 0.108664 },
      { year: 2020, fundEquityBeg: 948977, revenues: 7462993, expenses: 7061105, fundEquityEnd: 1350865, nonspendableRestricted: 0, assignedUnrestricted: 1350865, unrestrictedPctOfExpenditures: 0.191311 },
      { year: 2021, fundEquityBeg: 1350865, revenues: 17482079, expenses: 11240611, fundEquityEnd: 7592333, nonspendableRestricted: 0, assignedUnrestricted: 7592333, unrestrictedPctOfExpenditures: 0.675438 },
      { year: 2022, fundEquityBeg: 7592333, revenues: 7851218, expenses: 9535912, fundEquityEnd: 5907639, nonspendableRestricted: 0, assignedUnrestricted: 5907639, unrestrictedPctOfExpenditures: 0.619515 },
      { year: 2023, fundEquityBeg: 5907639, revenues: 7744604, expenses: 7650624, fundEquityEnd: 6001619, nonspendableRestricted: 0, assignedUnrestricted: 6001619, unrestrictedPctOfExpenditures: 0.784461 },
      { year: 2024, fundEquityBeg: 6001619, revenues: 7786285, expenses: 7945563, fundEquityEnd: 5842341, nonspendableRestricted: 0, assignedUnrestricted: 5842341, unrestrictedPctOfExpenditures: 0.735296 },
    ],
  },
  {
    fund: 'Library',
    years: [
      { year: 2019, fundEquityBeg: 509442, revenues: 1697808, expenses: 2035304, fundEquityEnd: 171946, nonspendableRestricted: 0, assignedUnrestricted: 171946, unrestrictedPctOfExpenditures: 0.084482 },
      { year: 2020, fundEquityBeg: 171946, revenues: 1869638, expenses: 1523732, fundEquityEnd: 517852, nonspendableRestricted: 0, assignedUnrestricted: 517852, unrestrictedPctOfExpenditures: 0.339858 },
      { year: 2021, fundEquityBeg: 517852, revenues: 1523958, expenses: 1734568, fundEquityEnd: 307242, nonspendableRestricted: 0, assignedUnrestricted: 307242, unrestrictedPctOfExpenditures: 0.177129 },
      { year: 2022, fundEquityBeg: 307242, revenues: 1312458, expenses: 1575204, fundEquityEnd: 44496, nonspendableRestricted: 0, assignedUnrestricted: 44496, unrestrictedPctOfExpenditures: 0.028248 },
      { year: 2023, fundEquityBeg: 44496, revenues: 1820984, expenses: 1778076, fundEquityEnd: 87444, nonspendableRestricted: 0, assignedUnrestricted: 87444, unrestrictedPctOfExpenditures: 0.04918 },
      { year: 2024, fundEquityBeg: 87444, revenues: 1781613, expenses: 1724539, fundEquityEnd: 144518, nonspendableRestricted: 0, assignedUnrestricted: 144518, unrestrictedPctOfExpenditures: 0.083801 },
    ],
  },
  {
    fund: 'Combined',
    years: [
      { year: 2019, fundEquityBeg: 11960457, revenues: 32776857, expenses: 30982758, fundEquityEnd: 13754556, nonspendableRestricted: 499880, assignedUnrestricted: 13254676, unrestrictedPctOfExpenditures: 0.427808 },
      { year: 2020, fundEquityBeg: 13754556, revenues: 27978617, expenses: 26718994, fundEquityEnd: 15014179, nonspendableRestricted: 554394, assignedUnrestricted: 14459785, unrestrictedPctOfExpenditures: 0.54118 },
      { year: 2021, fundEquityBeg: 15014179, revenues: 40578102, expenses: 32835278, fundEquityEnd: 22757003, nonspendableRestricted: 605624, assignedUnrestricted: 22151379, unrestrictedPctOfExpenditures: 0.674621 },
      { year: 2022, fundEquityBeg: 22757003, revenues: 32910625, expenses: 32053108, fundEquityEnd: 23614520, nonspendableRestricted: 504987, assignedUnrestricted: 23109533, unrestrictedPctOfExpenditures: 0.720976 },
      { year: 2023, fundEquityBeg: 23614520, revenues: 34037684, expenses: 32103337, fundEquityEnd: 25548867, nonspendableRestricted: 540582, assignedUnrestricted: 25008285, unrestrictedPctOfExpenditures: 0.779893 },
      { year: 2024, fundEquityBeg: 25548867, revenues: 35997869, expenses: 33902748, fundEquityEnd: 27643988, nonspendableRestricted: 653152, assignedUnrestricted: 26990836, unrestrictedPctOfExpenditures: 0.796125 },
    ],
  },
]

export interface WaterfallStep {
  label: string
  value: number
  /** 'total' bars are drawn from zero (an absolute checkpoint); 'delta' bars
   *  float from the running total left by the previous step. */
  kind: 'total' | 'delta'
}

/** How the FYE 12/31/25 tax levy builds up, under NY's tax-cap law, to the
 *  2026 adopted levy — including the town's voted override of the cap. */
export const NC_TAX_CAP_WATERFALL: WaterfallStep[] = [
  { label: 'FYE 12/31/25 levy', value: 24271973, kind: 'total' },
  { label: 'Tax base growth (0.96%)', value: 233011, kind: 'delta' },
  { label: 'PILOTs receivable (2025)', value: 550274, kind: 'delta' },
  { label: 'Allowable growth (2%)', value: 501105, kind: 'delta' },
  { label: 'Less: PILOTs receivable (2026)', value: -540000, kind: 'delta' },
  { label: 'Carryover from FYE 2025', value: 127496, kind: 'delta' },
  { label: 'Police & fire retirement exclusion', value: 51621, kind: 'delta' },
  { label: 'Tax Levy Limit', value: 25195480, kind: 'total' },
  { label: 'Override (voted above cap)', value: 594080, kind: 'delta' },
  { label: '2026 Adopted Levy', value: 25789560, kind: 'total' },
]

export interface HomeownerTaxImpact {
  medianHomeValue: number
  assessedValue: number
  townTaxes2025: number
  townTaxes2026: number
  increase: number
  increasePct: number
}

/** Town-tax impact on North Castle's median-value ($1.2M) home. */
export const NC_HOMEOWNER_TAX_IMPACT: HomeownerTaxImpact = {
  medianHomeValue: 1200000,
  assessedValue: 19800,
  townTaxes2025: 3427,
  townTaxes2026: 3592,
  increase: 165,
  increasePct: 0.0481470674058944,
}

export const NC_2026_BUDGET_SOURCE_NOTE =
  'Source: Town of North Castle 2026 Adopted Budget — budget summary, appropriations, fund-balance and tax-cap worksheets prepared by the Finance Department. Distinct from the FY2025 actuals (ACFR) driving the revenue → spending flow above; this is the budget as adopted for 2026.'
