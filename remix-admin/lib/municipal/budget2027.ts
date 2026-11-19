/**
 * Town of North Castle FY2027 budget — the cycle in progress.
 *
 * Unlike budget2026.ts (the budget AS ADOPTED), these figures come from the
 * 2027 Tentative/Preliminary Budget the Town Board received on Nov 4, 2026 and
 * took to public hearing on Nov 18, 2026 — they are PROPOSED and can change
 * before adoption. Flip `status` (and add `adoptedOn` / the vote) once the
 * Board adopts; every surface that shows these numbers keys its wording off it.
 *
 * Source: Town Board agenda packet for the Nov 18, 2026 meeting (CivicClerk
 * fileId 2639) — p.7 "2027 Property Tax Cap" worksheet, p.8 "North Castle
 * Town Tax Impact", pp.15–51 "Fiscal Year 2027 Budget – Budget Line Item
 * Report" (printed 10/16/2026), pp.105–106 Nov 4 minutes and the draft local
 * law to override the tax levy limit.
 */
import type { WaterfallStep } from './budget2026'

export type BudgetStatus = 'tentative' | 'preliminary' | 'adopted'

export interface BudgetCycle {
  fiscalYear: number
  status: BudgetStatus
  /** Key dates, ISO. */
  receivedOn: string
  hearingOn: string
  /** Statutory/charter adoption deadline per the Town's budget calendar. */
  adoptBy: string
  adoptedOn?: string
  /** Free-text vote tally once adopted, e.g. "4–1 (Berra no)". */
  adoptionVote?: string
  /** Whether the cap-override local law has passed (null = not yet voted). */
  overridePassed: boolean | null
  packetUrl: string
}

export const NC_2027_BUDGET_CYCLE: BudgetCycle = {
  fiscalYear: 2027,
  status: 'preliminary',
  receivedOn: '2026-11-04',
  hearingOn: '2026-11-18',
  adoptBy: '2026-12-20',
  overridePassed: null,
  packetUrl: 'https://northcastleny.api.civicclerk.com/v1/Meetings/GetMeetingFileStream(fileId=2639,plainText=false)',
}

/** The Town's own 2027 tax-cap worksheet (packet p.7). The "2027 Adopted
 *  Levy" line on that sheet is the PROPOSED levy — the sheet is a template
 *  printed before any vote. Steps chain exactly to the Town's figures. */
export const NC_2027_TAX_CAP_WATERFALL: WaterfallStep[] = [
  { label: '2026 adopted levy', value: 25789560, kind: 'total' },
  { label: 'Tax base growth (0.47%)', value: 121211, kind: 'delta' },
  { label: 'PILOTs receivable (2026)', value: 559160, kind: 'delta' },
  { label: 'Allowable growth (2%)', value: 529399, kind: 'delta' },
  { label: 'Less: PILOTs receivable (2027)', value: -360000, kind: 'delta' },
  { label: 'Tax Levy Limit', value: 26639330, kind: 'benchmark' },
  { label: 'Over the cap (override)', value: 1677051, kind: 'delta' },
  { label: '2027 proposed levy', value: 28316381, kind: 'total' },
]

export const NC_2027_LEVY = {
  prior: 25789560,
  proposed: 28316381,
  limit: 26639330,
  overCap: 1677051,
}

/** Town-tax impact on the median-value ($1.2M, AV $19,800) home (packet p.8). */
export const NC_2027_HOMEOWNER_IMPACT = {
  medianHomeValue: 1200000,
  assessedValue: 19800,
  townTaxesPrior: 3592,
  townTaxesProposed: 3798,
  increase: 206,
}

export interface FundRequest {
  fund: string
  code: string
  appropriation2026: number
  appropriation2027: number
  levy2026: number
  levy2027: number
  fundBalance2026: number
  fundBalance2027: number
}

/** The three major funds, from the Oct 16 line-item report's "2027 Request"
 *  column (packet pp.15–51). These were set before the tentative budget was
 *  finalized: summing every fund's request levy gives ~$27.6M, not the
 *  worksheet's $28.3M, so individual funds may still move. */
export const NC_2027_MAJOR_FUNDS: FundRequest[] = [
  { fund: 'General', code: 'A', appropriation2026: 27307201, appropriation2027: 28227191, levy2026: 13047011, levy2027: 14741391, fundBalance2026: 2088595, fundBalance2027: 1300000 },
  { fund: 'Highway', code: 'DA', appropriation2026: 7993977, appropriation2027: 8803169, levy2026: 7493977, levy2027: 7203169, fundBalance2026: 0, fundBalance2027: 1100000 },
  { fund: 'Library', code: 'L', appropriation2026: 1859126, appropriation2027: 2056887, levy2026: 1843126, levy2027: 1970887, fundBalance2026: 0, fundBalance2027: 70000 },
]

/** Reasons the Town gives for exceeding the cap — quoted from the draft local
 *  law (packet p.105). */
export const NC_2027_OVERRIDE_REASONS = [
  'Reduce how much of the General Fund balance the budget relies on',
  'Higher pension contributions and health-insurance costs',
]

/** Context a reader needs to make sense of the jump. */
export const NC_2027_CONTEXT =
  'In 2025 the Town moved $7.07M from the General Fund into capital projects (including the first $3M phase ' +
  'of the Water District 4 pipeline), cutting General Fund equity from $21.7M to $13.7M. The 2027 budget plans to ' +
  'draw less on that balance ($1.3M vs. $2.1M in 2026) and raise more from taxes instead.'

export const NC_2027_SOURCE_NOTE =
  'Source: 2027 Tentative/Preliminary Budget in the Town Board’s Nov 18, 2026 agenda packet — tax-cap worksheet, ' +
  'homeowner-impact sheet and line-item report. Proposed figures; they can change before the Board adopts the budget.'
