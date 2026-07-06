/**
 * Town budget data for the interactive Sankey.
 *
 * A budget is modeled as a layered flow graph:
 *   layer 0 = revenue sources  →  layer 1 = total budget (hub)  →
 *   layer 2 = spending areas (departments / funds)
 *
 * Values are in dollars. `color` is a validated categorical hue (see the
 * dataviz palette) or `null` for neutral (hub / "other" areas). Links inherit
 * the color of their non-hub endpoint.
 *
 * NOTE: the North Castle entry below is a PLACEHOLDER with representative-but-
 * invented figures so the visualization can be built and reviewed. Replace
 * with the real adopted budget (from the town's budget documents) — the shape
 * is all that matters; nodes/links/values drop straight in.
 */

export interface BudgetNode {
  id: string
  label: string
  layer: number
  /** Parent node id — set on drill-down detail nodes (layer 3+). */
  parent?: string
  /** Validated categorical hue, or null for neutral (hub / minor areas). */
  color: string | null
}
export interface BudgetLink {
  source: string
  target: string
  value: number
}
export interface TownBudget {
  townKey: string
  townName: string
  fiscalYear: string
  /** True while figures are placeholders, not the town's real adopted budget. */
  placeholder: boolean
  sourceNote: string
  nodes: BudgetNode[]
  links: BudgetLink[]
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

const NORTH_CASTLE_PLACEHOLDER: TownBudget = {
  townKey: 'nc',
  townName: 'Town of North Castle',
  fiscalYear: '2025 (placeholder)',
  placeholder: true,
  sourceNote:
    'Sample figures for layout review — NOT the town’s actual adopted budget. Upload the budget documents to populate real numbers.',
  nodes: [
    // Revenue sources (layer 0)
    { id: 'rev_property_tax', label: 'Property Taxes', layer: 0, color: C.teal },
    { id: 'rev_sales_tax', label: 'Sales Tax', layer: 0, color: C.teal },
    { id: 'rev_mortgage_tax', label: 'Mortgage Tax', layer: 0, color: C.teal },
    { id: 'rev_state_aid', label: 'State Aid', layer: 0, color: C.teal },
    { id: 'rev_fees', label: 'Fees & Permits', layer: 0, color: C.teal },
    { id: 'rev_other', label: 'Other Revenue', layer: 0, color: C.teal },
    // Hub (layer 1)
    { id: 'total', label: 'Total Budget', layer: 1, color: C.neutral },
    // Spending areas (layer 2)
    { id: 'exp_public_safety', label: 'Public Safety', layer: 2, color: C.coral },
    { id: 'exp_highway', label: 'Highway / DPW', layer: 2, color: C.gold },
    { id: 'exp_general_gov', label: 'General Government', layer: 2, color: C.blue },
    { id: 'exp_benefits', label: 'Employee Benefits', layer: 2, color: C.purple },
    { id: 'exp_parks', label: 'Parks & Recreation', layer: 2, color: C.green },
    { id: 'exp_sanitation', label: 'Sanitation & Refuse', layer: 2, color: C.neutral },
    { id: 'exp_debt', label: 'Debt Service', layer: 2, color: C.neutral },
    { id: 'exp_other', label: 'Other', layer: 2, color: C.neutral },
  ],
  links: [
    { source: 'rev_property_tax', target: 'total', value: 22_000_000 },
    { source: 'rev_sales_tax', target: 'total', value: 3_000_000 },
    { source: 'rev_mortgage_tax', target: 'total', value: 2_000_000 },
    { source: 'rev_state_aid', target: 'total', value: 2_000_000 },
    { source: 'rev_fees', target: 'total', value: 2_500_000 },
    { source: 'rev_other', target: 'total', value: 3_500_000 },
    { source: 'total', target: 'exp_public_safety', value: 9_000_000 },
    { source: 'total', target: 'exp_highway', value: 6_000_000 },
    { source: 'total', target: 'exp_general_gov', value: 5_000_000 },
    { source: 'total', target: 'exp_benefits', value: 5_000_000 },
    { source: 'total', target: 'exp_parks', value: 3_000_000 },
    { source: 'total', target: 'exp_sanitation', value: 2_500_000 },
    { source: 'total', target: 'exp_debt', value: 2_500_000 },
    { source: 'total', target: 'exp_other', value: 2_500_000 },
  ],
}

// Drill-down detail (layer 3): each spending category → its sub-line-items.
// Children sum to the parent value. Placeholder, like the top level.
const NC_DETAIL: Record<string, [string, number][]> = {
  exp_public_safety: [
    ['Police Protection', 5_500_000],
    ['Fire / EMS', 1_800_000],
    ['Building & Code', 900_000],
    ['Justice Court', 800_000],
  ],
  exp_highway: [
    ['Personnel', 2_600_000],
    ['Road Maintenance', 1_600_000],
    ['Snow & Ice', 1_000_000],
    ['Equipment', 800_000],
  ],
  exp_general_gov: [
    ['Town Board & Supervisor', 900_000],
    ['Finance & IT', 1_100_000],
    ['Legal', 800_000],
    ['Assessor', 700_000],
    ['Clerk & Records', 700_000],
    ['Town Buildings', 800_000],
  ],
  exp_benefits: [
    ['Health Insurance', 2_800_000],
    ['NYS Retirement', 1_500_000],
    ['Social Security', 700_000],
  ],
  exp_parks: [
    ['Facilities & Grounds', 1_300_000],
    ['Programs', 1_200_000],
    ['Pool', 500_000],
  ],
  exp_sanitation: [
    ['Collection', 1_600_000],
    ['Disposal / Tipping', 900_000],
  ],
  exp_debt: [
    ['Principal', 1_700_000],
    ['Interest', 800_000],
  ],
  exp_other: [
    ['Contingency', 1_000_000],
    ['Insurance', 900_000],
    ['Miscellaneous', 600_000],
  ],
}

for (const [parentId, kids] of Object.entries(NC_DETAIL)) {
  const parent = NORTH_CASTLE_PLACEHOLDER.nodes.find((n) => n.id === parentId)
  if (!parent) continue
  kids.forEach(([label, value], i) => {
    const id = `${parentId}__${i}`
    NORTH_CASTLE_PLACEHOLDER.nodes.push({ id, label, layer: 3, parent: parentId, color: parent.color })
    NORTH_CASTLE_PLACEHOLDER.links.push({ source: parentId, target: id, value })
  })
}

export const TOWN_BUDGETS: Record<string, TownBudget> = {
  nc: NORTH_CASTLE_PLACEHOLDER,
}

export function getBudget(townKey: string): TownBudget | undefined {
  return TOWN_BUDGETS[townKey]
}
