// ─── User & Auth ────────────────────────────────────────────────────────────

export type UserRole = 'admin' | 'gp' | 'lp' | 'dealroom'

export interface User {
  email: string
  name: string
  role: UserRole
  asset_access: string[]
  active: boolean
  created_at: string
  notes?: string
}

export interface JWTPayload {
  email: string
  name: string
  role: UserRole
  asset_access: string[]
  exp: number
}

// ─── Config ──────────────────────────────────────────────────────────────────

export type ConfigMap = Record<string, string>

export interface AssetConfig {
  raise_target: number
  raise_to_date: number
  status: 'Raising' | 'Active' | 'Stabilized' | 'Exited'
  target_irr: string
  target_multiple: string
  hold_period: string
  minimum: number
  asset_type: string
  location: string
}

// ─── Investors ───────────────────────────────────────────────────────────────

export interface InvestorPosition {
  investor_id: string
  email: string
  name: string
  asset: string
  equity_invested: number
  ownership_pct: number
  capital_account_balance: number
  nav_estimate: number
  irr_estimate: number
  equity_multiple: number
  distributions_total: number
  last_updated: string
}

// ─── Distributions ───────────────────────────────────────────────────────────

export type DistributionType = 'return_of_capital' | 'preferred_return' | 'profit'

export interface Distribution {
  id: string
  investor_id: string
  email: string
  asset: string
  date: string
  amount: number
  type: DistributionType
  notes?: string
}

// ─── Documents ───────────────────────────────────────────────────────────────

export type DocType = 'k1' | 'quarterly_report' | 'ppm' | 'operating_agreement' | 'other'
export type DocVisibility = 'lp' | 'gp' | 'admin'

export interface InvestorDocument {
  id: string
  email: string
  asset: string
  doc_name: string
  doc_type: DocType
  r2_key: string
  date: string
  visible_to: DocVisibility
}

// ─── Timeline ────────────────────────────────────────────────────────────────

export type MilestoneStatus = 'upcoming' | 'in-progress' | 'complete' | 'delayed'

export interface TimelineMilestone {
  milestone: string
  planned_date: string
  actual_date?: string
  status: MilestoneStatus
  notes?: string
  sort_order: number
}

// ─── Budget ──────────────────────────────────────────────────────────────────

export interface BudgetLine {
  category: string
  budgeted: number
  actual_to_date: number
  projected_final: number
  notes?: string
  sort_order: number
}

// ─── Portfolio ───────────────────────────────────────────────────────────────

export interface PortfolioSummary {
  total_invested: number
  total_nav: number
  total_distributions: number
  irr_blended: number
  positions: InvestorPosition[]
}

// ─── Admin Activity ──────────────────────────────────────────────────────────

export interface AdminActivity {
  timestamp: string
  admin_email: string
  action: string
  target: string
  details: string
}

// ─── Google Docs Content ─────────────────────────────────────────────────────

export interface DocSection {
  heading: string
  level: 1 | 2 | 3
  html: string
}

export interface ParsedDoc {
  sections: DocSection[]
  fullHtml: string
}

// ─── Asset Media ─────────────────────────────────────────────────────────────

export type AssetMediaType = 'image' | 'youtube'

export interface AssetMedia {
  id: string
  asset: string
  type: AssetMediaType
  url: string
  caption?: string
  sort_order: number
}

export interface AssetMediaWithRow extends AssetMedia {
  _rowIndex: number
}

// ─── Assets ──────────────────────────────────────────────────────────────────

export type AssetSlug = 'livingstonfarm' | 'wrenofthewoods'

export const ASSET_SLUGS: AssetSlug[] = ['livingstonfarm', 'wrenofthewoods']

export const ASSET_NAMES: Record<AssetSlug, string> = {
  livingstonfarm: 'Livingston Farm',
  wrenofthewoods: 'Wren of the Woods',
}
