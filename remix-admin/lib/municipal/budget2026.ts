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

export interface BondIssue {
  purpose: string
  yearIssued: number
  maturity: number
  rate: string
  balance: number
}

/** The Town's 9 outstanding general-obligation bond issues, balances as of
 *  12/31/2025. Balances sum to the $20,701,000 total bonded debt outstanding
 *  in NC_BOND_PROFILE. */
export const NC_BOND_ISSUES: BondIssue[] = [
  { purpose: 'Firehouse acquisition', yearIssued: 2006, maturity: 2026, rate: '3.973%', balance: 60000 },
  { purpose: 'Sewer No. 2 treatment plant upgrade', yearIssued: 2007, maturity: 2037, rate: '3.630%', balance: 2035000 },
  { purpose: 'Sewer nitrogen removal — Environmental Facilities Corp.', yearIssued: 2009, maturity: 2033, rate: '4.270%', balance: 1981000 },
  { purpose: 'Public improvements', yearIssued: 2010, maturity: 2026, rate: '1.250%', balance: 50000 },
  { purpose: 'Public improvements', yearIssued: 2011, maturity: 2026, rate: '1.50%–2.65%', balance: 205000 },
  { purpose: 'Public improvements', yearIssued: 2014, maturity: 2044, rate: '1.50%–5.00%', balance: 7420000 },
  { purpose: 'Water Project — EFC #18170', yearIssued: 2017, maturity: 2037, rate: '1.067%–3.574%', balance: 335000 },
  { purpose: 'Public improvements', yearIssued: 2017, maturity: 2029, rate: '2.00%–5.00%', balance: 1430000 },
  { purpose: 'Public improvements', yearIssued: 2021, maturity: 2036, rate: '2.00%–5.00%', balance: 7185000 },
]

export interface BondProfile {
  moodysRating: string
  moodysReaffirmedYear: number
  outlook: string
  bondSecurity: string
  nyclassRating: string
  totalBondedDebt: number
  numberOfIssues: number
  unamortizedPremium: number
  totalLongTermDebt: number
  dueWithinOneYear: number
  principalDue2026: number
  interestDue2026: number
  debtService2026: number
  debtServicePctNoncapital2026: number
  debtServicePctNoncapital2024: number
  finalMaturityYear: number
  interestRateRangeLow: number
  interestRateRangeHigh: number
  bansOutstanding: number
  debtLimit: number
  netIndebtednessSubjectToLimit: number
  debtLimitUtilizationPct: number
  remainingCapacity: number
}

/** The Town's credit rating and debt-capacity snapshot at 12/31/2025, from
 *  Moody's 2025 rating action and the Town's debt-service and legal
 *  debt-margin schedules under NY Local Finance Law §104. */
export const NC_BOND_PROFILE: BondProfile = {
  moodysRating: 'Aaa',
  moodysReaffirmedYear: 2025,
  outlook: 'Stable',
  bondSecurity: 'All Town bonds are general obligation bonds, backed by the full faith and credit of the Town, as required by NYS law',
  nyclassRating: 'AAAm by S&P Global Ratings',
  totalBondedDebt: 20701000,
  numberOfIssues: 9,
  unamortizedPremium: 774032,
  totalLongTermDebt: 21475032,
  dueWithinOneYear: 1976577,
  principalDue2026: 1859000,
  interestDue2026: 656222,
  debtService2026: 2515222,
  debtServicePctNoncapital2026: 0.057,
  debtServicePctNoncapital2024: 0.068,
  finalMaturityYear: 2044,
  interestRateRangeLow: 1.067,
  interestRateRangeHigh: 5.00,
  bansOutstanding: 0,
  debtLimit: 446448361,
  netIndebtednessSubjectToLimit: 8911457,
  debtLimitUtilizationPct: 0.02,
  remainingCapacity: 437536904,
}

export const NC_BOND_SOURCE_NOTE =
  'Source: Moody\'s 2025 rating action, and the Town\'s FY2025 debt-service, legal debt-margin, and bond-issue schedules. Balances and ratios as of 12/31/2025.'

export interface TopTaxpayer {
  rank: number
  owner: string
  parcels: number
  assessedValue: number
  fullMarketValue: number
  notes?: string
}

/** Town of North Castle's 50 largest property taxpayers, from the 2026
 *  Tentative Assessment Roll (valuation date 7/1/2025). Owner names are as
 *  recorded on the roll; several are abbreviated in the source document. */
export const NC_TOP_TAXPAYERS: TopTaxpayer[] = [
  { rank: 1, owner: 'City of New York / Bureau of Water Supply', parcels: 50, assessedValue: 8521740, fullMarketValue: 575793222, notes: 'NYC DEP Kensico Reservoir watershed land (multiple parcels)' },
  { rank: 2, owner: 'Con Edison Co of NY / Attn: Stephanie J Merrit 1', parcels: 6, assessedValue: 2035447, fullMarketValue: 137530199, notes: 'Utility — Consolidated Edison' },
  { rank: 3, owner: 'County of Westchester / Department of Transportat…', parcels: 9, assessedValue: 1795800, fullMarketValue: 121337836, notes: 'Westchester County Airport (HPN) parcels' },
  { rank: 4, owner: 'Swiss Re America / Holding Corporation', parcels: 1, assessedValue: 1227682, fullMarketValue: 82951486, notes: '175 King St — Swiss Re North American HQ office campus' },
  { rank: 5, owner: 'IBM / W. Spinei', parcels: 1, assessedValue: 1070000, fullMarketValue: 72297297, notes: '1 New Orchard Rd — IBM Corporate Headquarters' },
  { rank: 6, owner: 'Citigroup Corporate / Holdings Inc', parcels: 1, assessedValue: 975800, fullMarketValue: 65932432, notes: '399 Park Ave / North Castle — Citigroup office building' },
  { rank: 7, owner: 'Westchester County IDA / Engel Burman Group / C/O UC…', parcels: 1, assessedValue: 730000, fullMarketValue: 49324324, notes: 'IDA-financed senior living facility (Engel Burman)' },
  { rank: 8, owner: 'Fifth Avenue Properties / C/O CDL Family Office Ser…', parcels: 3, assessedValue: 706000, fullMarketValue: 47702700, notes: 'Estate residential (CDL Family Office)' },
  { rank: 9, owner: 'WMG Armonk Warehouse / Owner LLC', parcels: 4, assessedValue: 468700, fullMarketValue: 31668917, notes: 'Warehouse/industrial property' },
  { rank: 10, owner: '45 Hurlingham LLC', parcels: 1, assessedValue: 450000, fullMarketValue: 30405405 },
  { rank: 11, owner: 'Toll Northeast / Building Inc', parcels: 126, assessedValue: 440300, fullMarketValue: 29749938, notes: 'Toll Brothers — multi-parcel residential development' },
  { rank: 12, owner: 'Columbia II Armonk Square', parcels: 1, assessedValue: 352600, fullMarketValue: 23824324, notes: 'Armonk Square retail center' },
  { rank: 13, owner: 'North Castle 42 LLC / C/O Geller Advisors LLC / Attn Kat…', parcels: 1, assessedValue: 340200, fullMarketValue: 22986486 },
  { rank: 14, owner: '99 Business Park Drive LL / C/O Ecco Development LLC', parcels: 1, assessedValue: 295000, fullMarketValue: 19932432 },
  { rank: 15, owner: '94 Business Park Drive / Associates LLC / C/O Mandelbau…', parcels: 1, assessedValue: 275000, fullMarketValue: 18581081 },
  { rank: 16, owner: '154 Bedford Road LLC', parcels: 16, assessedValue: 265960, fullMarketValue: 17970263 },
  { rank: 17, owner: 'Bayberry Armonk LLC / C/O Baker Tilly', parcels: 2, assessedValue: 259200, fullMarketValue: 17513512 },
  { rank: 18, owner: 'Seven Springs LLC / C/O Trump Organization', parcels: 2, assessedValue: 256300, fullMarketValue: 17317567, notes: 'Trump Organization — Seven Springs estate' },
  { rank: 19, owner: 'Pinkus Scott M', parcels: 2, assessedValue: 252400, fullMarketValue: 17054053 },
  { rank: 20, owner: 'Cassone Mary Lou / Attn: Partridge Hollow Fa…', parcels: 2, assessedValue: 249120, fullMarketValue: 16832432 },
  { rank: 21, owner: 'Maounis Susan', parcels: 1, assessedValue: 239700, fullMarketValue: 16195945 },
  { rank: 22, owner: 'Maddd Madonna Armonk LLC', parcels: 1, assessedValue: 235800, fullMarketValue: 15932432 },
  { rank: 23, owner: 'RLIF East 5 LLC', parcels: 1, assessedValue: 221400, fullMarketValue: 14959459 },
  { rank: 24, owner: 'Cranlake Berry LLC', parcels: 2, assessedValue: 211000, fullMarketValue: 14256755 },
  { rank: 25, owner: 'Baker Lisa M / Baker Richard A', parcels: 1, assessedValue: 200000, fullMarketValue: 13513513 },
  { rank: 26, owner: '16 Reservoir Rd LLC / C/O Stop & Shop Co / Lease Administ…', parcels: 1, assessedValue: 186333, fullMarketValue: 12590067 },
  { rank: 27, owner: 'Miller Brian / Miller Giovanna', parcels: 1, assessedValue: 182000, fullMarketValue: 12297297 },
  { rank: 28, owner: 'Houston Allan W / Houston Tamara M / C/O Deedra Wolas CPA', parcels: 1, assessedValue: 179400, fullMarketValue: 12121621 },
  { rank: 29, owner: '200 Business Park Assoc L / Attn: Silverite Construct…', parcels: 1, assessedValue: 174600, fullMarketValue: 11797297 },
  { rank: 30, owner: 'Assad Edward / Assad Alicia', parcels: 3, assessedValue: 172700, fullMarketValue: 11668917 },
  { rank: 31, owner: 'Artemis Farms NY LLC', parcels: 1, assessedValue: 158400, fullMarketValue: 10702702 },
  { rank: 32, owner: 'West Properties Inc.', parcels: 2, assessedValue: 156400, fullMarketValue: 10567567 },
  { rank: 33, owner: 'BSF&F LLC / C/O Michael Fareri', parcels: 1, assessedValue: 154000, fullMarketValue: 10405405 },
  { rank: 34, owner: 'Baker Richard / Baker Lisa', parcels: 1, assessedValue: 146050, fullMarketValue: 9868243 },
  { rank: 35, owner: 'Rice Eve Hart', parcels: 5, assessedValue: 144650, fullMarketValue: 9773645 },
  { rank: 36, owner: 'Canyon Club Partners II L / Attn: Lemia Marinelli', parcels: 2, assessedValue: 141750, fullMarketValue: 9577702 },
  { rank: 37, owner: 'Verizon New York Inc / C/O Kroll', parcels: 11, assessedValue: 140588, fullMarketValue: 9499183, notes: 'Utility — Verizon telecom infrastructure' },
  { rank: 38, owner: 'Gecaj Rrustem / Gecaj Avni', parcels: 2, assessedValue: 140100, fullMarketValue: 9466215 },
  { rank: 39, owner: 'Herlew LLC', parcels: 1, assessedValue: 133000, fullMarketValue: 8986486 },
  { rank: 40, owner: 'Eden Enterprises LLC / Attn Werber Management', parcels: 2, assessedValue: 131500, fullMarketValue: 8885134 },
  { rank: 41, owner: '14 Middle Patent Road LLC', parcels: 2, assessedValue: 130700, fullMarketValue: 8831080 },
  { rank: 42, owner: 'GHP Kaysal LLC / C/O GHP Office Realty', parcels: 1, assessedValue: 128200, fullMarketValue: 8662162 },
  { rank: 43, owner: 'JG Armonk LLC', parcels: 1, assessedValue: 128200, fullMarketValue: 8662162 },
  { rank: 44, owner: 'Thomas Strauss and / Barbara Strauss Trust / Thomas', parcels: 1, assessedValue: 127500, fullMarketValue: 8614864 },
  { rank: 45, owner: 'Flagler Drive LLC', parcels: 1, assessedValue: 126400, fullMarketValue: 8540540 },
  { rank: 46, owner: 'Wolf Teton LC / C/O CDL Family Office Ser…', parcels: 1, assessedValue: 123800, fullMarketValue: 8364864 },
  { rank: 47, owner: '10 Cowdray Park Drive LLC', parcels: 2, assessedValue: 123600, fullMarketValue: 8351350 },
  { rank: 48, owner: 'Con Edison Co of NY Inc / Attn: Stephanie J Merrit 3', parcels: 5, assessedValue: 122189, fullMarketValue: 8256010, notes: 'Utility — Consolidated Edison' },
  { rank: 49, owner: "O'Brien Andrew J / O'Brien Robin", parcels: 2, assessedValue: 120200, fullMarketValue: 8121621 },
  { rank: 50, owner: 'North Castle Property / Venture LLC', parcels: 1, assessedValue: 120000, fullMarketValue: 8108108 },
]

export interface TopTaxpayersTotals {
  top50Parcels: number
  top50AssessedValue: number
  top50FullMarketValue: number
  rollAssessedValue: number
  rollFullMarketValue: number
}

/** Top-50 subtotal and townwide taxable-roll totals, from the same
 *  schedule — used to show the Top 50's share of the Town's entire roll. */
export const NC_TOP_TAXPAYERS_TOTALS: TopTaxpayersTotals = {
  top50Parcels: 289,
  top50AssessedValue: 25667409,
  top50FullMarketValue: 1734284252,
  rollAssessedValue: 125946850,
  rollFullMarketValue: 8509919945,
}

export const NC_TOP_TAXPAYERS_SOURCE_NOTE =
  'Source: Town of North Castle 2026 Tentative Assessment Roll — Top 50 Taxpayers schedule (valuation date 7/1/2025, uniform percentage of value 1.48%). Owner names as recorded on the roll; some are abbreviated in the source document.'
