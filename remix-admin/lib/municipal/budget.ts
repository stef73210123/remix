/**
 * Town budget data for the financial-analysis panel.
 *
 * A budget is modeled per fiscal year as two ranked lists of line items —
 * REVENUE sources and EXPENDITURE areas — each optionally broken into
 * sub-line `children` for drill-down. Holding multiple years lets the panel
 * offer a year toggle and compute each line's year-over-year % change.
 *
 * The Sankey view is derived from the selected year on the fly (see
 * `yearToSankey`): revenue (layer 0) → total (hub, layer 1) → spending
 * (layer 2) → spending detail (layer 3).
 *
 * Values are whole dollars.
 *
 * ── DATA STATUS ──────────────────────────────────────────────────────────
 * The North Castle figures below are PLACEHOLDER/ILLUSTRATIVE. A few
 * aggregates are anchored to reporting on the town's adopted FY2025 budget
 * (total ≈ $42.6M, +3.2% over 2024; property-tax levy ≈ $24.27M just under the
 * $24.43M cap; ≈ $4.1M appropriated fund balance), but the by-category splits
 * are NOT the town's actual line items — the adopted-budget PDFs on
 * northcastleny.com and the NYS Comptroller filings are blocked by this
 * environment's egress policy, so they could not be fetched and parsed. Drop
 * the real schedules in here (same shape) and the whole panel updates.
 */

export interface BudgetChild {
  label: string
  value: number
}
export interface BudgetLine {
  /** Stable id — used to match a line across years for YoY change. */
  id: string
  label: string
  /** Validated categorical hue, or null for neutral (minor / "other"). */
  color: string | null
  value: number
  /** Sub-line detail for drill-down; children sum to `value`. */
  children?: BudgetChild[]
}
export interface BudgetYear {
  year: string
  /** 'adopted' | 'preliminary' | 'tentative' | 'placeholder'. */
  status: string
  revenue: BudgetLine[]
  expense: BudgetLine[]
}
export interface TownBudget {
  townKey: string
  townName: string
  /** True while any year is placeholder rather than the real adopted budget. */
  placeholder: boolean
  sourceNote: string
  /** Fiscal years, newest first. */
  years: BudgetYear[]
}

// ── Sankey adapter (kept for the flow diagram) ────────────────────────────
export interface BudgetNode {
  id: string
  label: string
  layer: number
  parent?: string
  color: string | null
}
export interface BudgetLink {
  source: string
  target: string
  value: number
}

/** Build the Sankey node/link graph for one fiscal year. Spending lines keep
 *  their children as layer-3 drill-down; revenue children are surfaced in the
 *  revenue breakdown list instead. */
export function yearToSankey(y: BudgetYear): { nodes: BudgetNode[]; links: BudgetLink[] } {
  const nodes: BudgetNode[] = [{ id: 'total', label: 'Total Budget', layer: 1, color: null }]
  const links: BudgetLink[] = []
  for (const r of y.revenue) {
    nodes.push({ id: r.id, label: r.label, layer: 0, color: r.color })
    links.push({ source: r.id, target: 'total', value: r.value })
  }
  for (const e of y.expense) {
    nodes.push({ id: e.id, label: e.label, layer: 2, color: e.color })
    links.push({ source: 'total', target: e.id, value: e.value })
    ;(e.children || []).forEach((c, i) => {
      const cid = `${e.id}__${i}`
      nodes.push({ id: cid, label: c.label, layer: 3, parent: e.id, color: e.color })
      links.push({ source: e.id, target: cid, value: c.value })
    })
  }
  return { nodes, links }
}

// Validated categorical palette (dataviz — passes light + dark).
const C = {
  green: '#3d9c72',
  blue: '#5a9bd4',
  coral: '#ca615f',
  gold: '#b0862f',
  purple: '#9b7fd4',
  teal: '#12a6b8',
  neutral: null,
}

// Revenue sources share the teal family; each expense area gets its own hue.
function ncRevenue(v: {
  propertyTax: number; townLevy: number; highwayLevy: number; districtLevy: number
  salesTax: number; mortgageTax: number
  stateAid: number; aim: number; chips: number; stateOther: number
  deptIncome: number; buildingPermits: number; recFees: number; clerkFees: number; courtFines: number
  fundBalance: number; other: number; interest: number; rentals: number; miscOther: number
}): BudgetLine[] {
  return [
    { id: 'rev_property_tax', label: 'Real Property Taxes', color: C.teal, value: v.propertyTax, children: [
      { label: 'Townwide (A) levy', value: v.townLevy },
      { label: 'Highway (DB) levy', value: v.highwayLevy },
      { label: 'Special district levies', value: v.districtLevy },
    ] },
    { id: 'rev_sales_tax', label: 'Sales Tax', color: C.teal, value: v.salesTax },
    { id: 'rev_mortgage_tax', label: 'Mortgage Tax', color: C.teal, value: v.mortgageTax },
    { id: 'rev_state_aid', label: 'State Aid', color: C.teal, value: v.stateAid, children: [
      { label: 'Per-capita (AIM)', value: v.aim },
      { label: 'CHIPS (roads)', value: v.chips },
      { label: 'Other state aid', value: v.stateOther },
    ] },
    { id: 'rev_dept_income', label: 'Departmental Income & Fees', color: C.teal, value: v.deptIncome, children: [
      { label: 'Building permits & fees', value: v.buildingPermits },
      { label: 'Recreation fees', value: v.recFees },
      { label: 'Clerk & licensing fees', value: v.clerkFees },
      { label: 'Court fines & forfeitures', value: v.courtFines },
    ] },
    { id: 'rev_fund_balance', label: 'Appropriated Fund Balance', color: C.teal, value: v.fundBalance },
    { id: 'rev_other', label: 'Other Revenue', color: C.teal, value: v.other, children: [
      { label: 'Interest earnings', value: v.interest },
      { label: 'Rentals & leases', value: v.rentals },
      { label: 'Miscellaneous', value: v.miscOther },
    ] },
  ]
}

function ncExpense(v: {
  genGov: number; board: number; finance: number; legal: number; assessor: number; clerk: number; buildings: number
  publicSafety: number; police: number; court: number; codeEnf: number
  highway: number; hwyPersonnel: number; roadMaint: number; snow: number; equipment: number
  culture: number; parksFacilities: number; programs: number; pool: number
  homeComm: number; sanitation: number; water: number; sewer: number; planningZoning: number
  benefits: number; health: number; retirement: number; fica: number
  debt: number; principal: number; interest: number
  other: number
}): BudgetLine[] {
  return [
    { id: 'exp_public_safety', label: 'Public Safety', color: C.coral, value: v.publicSafety, children: [
      { label: 'Police Department', value: v.police },
      { label: 'Justice Court', value: v.court },
      { label: 'Building & Code Enforcement', value: v.codeEnf },
    ] },
    { id: 'exp_highway', label: 'Transportation / Highway', color: C.gold, value: v.highway, children: [
      { label: 'Personnel', value: v.hwyPersonnel },
      { label: 'Road maintenance', value: v.roadMaint },
      { label: 'Snow & ice', value: v.snow },
      { label: 'Equipment', value: v.equipment },
    ] },
    { id: 'exp_benefits', label: 'Employee Benefits', color: C.purple, value: v.benefits, children: [
      { label: 'Health insurance', value: v.health },
      { label: 'NYS retirement', value: v.retirement },
      { label: 'Social Security (FICA)', value: v.fica },
    ] },
    { id: 'exp_gen_gov', label: 'General Government', color: C.blue, value: v.genGov, children: [
      { label: 'Town Board & Supervisor', value: v.board },
      { label: 'Finance & IT', value: v.finance },
      { label: 'Legal', value: v.legal },
      { label: 'Assessor', value: v.assessor },
      { label: 'Clerk & records', value: v.clerk },
      { label: 'Town buildings', value: v.buildings },
    ] },
    { id: 'exp_home_comm', label: 'Home & Community Services', color: C.green, value: v.homeComm, children: [
      { label: 'Sanitation & refuse', value: v.sanitation },
      { label: 'Water district', value: v.water },
      { label: 'Sewer district', value: v.sewer },
      { label: 'Planning & Zoning', value: v.planningZoning },
    ] },
    { id: 'exp_culture', label: 'Culture & Recreation', color: C.teal, value: v.culture, children: [
      { label: 'Facilities & grounds', value: v.parksFacilities },
      { label: 'Programs', value: v.programs },
      { label: 'Pool', value: v.pool },
    ] },
    { id: 'exp_debt', label: 'Debt Service', color: C.neutral, value: v.debt, children: [
      { label: 'Principal', value: v.principal },
      { label: 'Interest', value: v.interest },
    ] },
    { id: 'exp_other', label: 'Interfund & Other', color: C.neutral, value: v.other },
  ]
}

const NORTH_CASTLE: TownBudget = {
  townKey: 'nc',
  townName: 'Town of North Castle',
  placeholder: true,
  sourceNote:
    'Illustrative splits — NOT the town’s actual line items. Aggregates anchor to reporting on the adopted FY2025 budget (≈ $42.6M, +3.2% over 2024; levy ≈ $24.27M under the $24.43M cap; ≈ $4.1M appropriated fund balance). The adopted-budget PDFs on northcastleny.com and the NYS Comptroller filings are blocked by this environment’s network policy; provide them and the real figures drop straight in.',
  years: [
    {
      year: '2026',
      status: 'placeholder',
      revenue: ncRevenue({
        propertyTax: 24_900_000, townLevy: 15_200_000, highwayLevy: 6_100_000, districtLevy: 3_600_000,
        salesTax: 3_800_000, mortgageTax: 2_000_000,
        stateAid: 1_250_000, aim: 300_000, chips: 620_000, stateOther: 330_000,
        deptIncome: 3_450_000, buildingPermits: 1_500_000, recFees: 1_150_000, clerkFees: 350_000, courtFines: 450_000,
        fundBalance: 4_100_000, other: 4_500_000, interest: 1_700_000, rentals: 900_000, miscOther: 1_900_000,
      }),
      expense: ncExpense({
        genGov: 6_700_000, board: 950_000, finance: 1_250_000, legal: 850_000, assessor: 750_000, clerk: 750_000, buildings: 2_150_000,
        publicSafety: 10_900_000, police: 8_600_000, court: 850_000, codeEnf: 1_450_000,
        highway: 7_000_000, hwyPersonnel: 3_100_000, roadMaint: 1_900_000, snow: 1_100_000, equipment: 900_000,
        culture: 3_700_000, parksFacilities: 1_500_000, programs: 1_500_000, pool: 700_000,
        homeComm: 5_600_000, sanitation: 2_500_000, water: 1_400_000, sewer: 1_000_000, planningZoning: 700_000,
        benefits: 6_400_000, health: 3_500_000, retirement: 2_100_000, fica: 800_000,
        debt: 2_450_000, principal: 1_650_000, interest: 800_000,
        other: 1_250_000,
      }),
    },
    {
      year: '2025',
      status: 'adopted (aggregates); splits illustrative',
      revenue: ncRevenue({
        propertyTax: 24_270_000, townLevy: 14_900_000, highwayLevy: 5_970_000, districtLevy: 3_400_000,
        salesTax: 3_600_000, mortgageTax: 1_900_000,
        stateAid: 1_200_000, aim: 300_000, chips: 600_000, stateOther: 300_000,
        deptIncome: 3_300_000, buildingPermits: 1_450_000, recFees: 1_100_000, clerkFees: 300_000, courtFines: 450_000,
        fundBalance: 4_100_000, other: 4_230_000, interest: 1_600_000, rentals: 850_000, miscOther: 1_780_000,
      }),
      expense: ncExpense({
        genGov: 6_500_000, board: 920_000, finance: 1_200_000, legal: 820_000, assessor: 720_000, clerk: 720_000, buildings: 2_120_000,
        publicSafety: 10_500_000, police: 8_300_000, court: 820_000, codeEnf: 1_380_000,
        highway: 6_800_000, hwyPersonnel: 3_000_000, roadMaint: 1_850_000, snow: 1_050_000, equipment: 900_000,
        culture: 3_600_000, parksFacilities: 1_450_000, programs: 1_450_000, pool: 700_000,
        homeComm: 5_400_000, sanitation: 2_450_000, water: 1_350_000, sewer: 950_000, planningZoning: 650_000,
        benefits: 6_200_000, health: 3_400_000, retirement: 2_050_000, fica: 750_000,
        debt: 2_400_000, principal: 1_620_000, interest: 780_000,
        other: 1_200_000,
      }),
    },
    {
      year: '2024',
      status: 'placeholder',
      revenue: ncRevenue({
        propertyTax: 24_270_000, townLevy: 14_900_000, highwayLevy: 5_970_000, districtLevy: 3_400_000,
        salesTax: 3_400_000, mortgageTax: 1_800_000,
        stateAid: 1_130_000, aim: 300_000, chips: 560_000, stateOther: 270_000,
        deptIncome: 3_000_000, buildingPermits: 1_300_000, recFees: 1_000_000, clerkFees: 300_000, courtFines: 400_000,
        fundBalance: 3_600_000, other: 4_100_000, interest: 1_500_000, rentals: 820_000, miscOther: 1_780_000,
      }),
      expense: ncExpense({
        genGov: 6_300_000, board: 900_000, finance: 1_150_000, legal: 800_000, assessor: 700_000, clerk: 700_000, buildings: 2_050_000,
        publicSafety: 10_100_000, police: 7_980_000, court: 800_000, codeEnf: 1_320_000,
        highway: 6_600_000, hwyPersonnel: 2_900_000, roadMaint: 1_800_000, snow: 1_000_000, equipment: 900_000,
        culture: 3_500_000, parksFacilities: 1_400_000, programs: 1_400_000, pool: 700_000,
        homeComm: 5_200_000, sanitation: 2_400_000, water: 1_300_000, sewer: 900_000, planningZoning: 600_000,
        benefits: 5_900_000, health: 3_250_000, retirement: 1_950_000, fica: 700_000,
        debt: 2_400_000, principal: 1_620_000, interest: 780_000,
        other: 1_100_000,
      }),
    },
  ],
}

export const TOWN_BUDGETS: Record<string, TownBudget> = {
  nc: NORTH_CASTLE,
}

export function getBudget(townKey: string): TownBudget | undefined {
  return TOWN_BUDGETS[townKey]
}
