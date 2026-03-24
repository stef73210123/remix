import { readSheetRange, appendSheetRow, updateSheetRow, deleteSheetRow, findRowIndex } from './client'

export type PipelineStage =
  | 'backlog'
  | 'prospect'
  | 'contacted'
  | 'interested'
  | 'soft-commit'
  | 'committed'
  | 'closed'
  | 'passed'
  | 'unqualified'

export type InvestorCategory =
  | 'institutional'
  | 'co-gp'
  | 'family-office'
  | 'individual'
  | 'new-contact'
  | ''

export type InvestorType =
  | 'individual'
  | 'family-office'
  | 'institutional'
  | 'other'
  | ''

export type PointOfContact =
  | 'stefan'
  | 'joe'
  | 'roxanne'
  | ''

export interface PipelineLead {
  id: string
  name: string
  email: string
  phone?: string
  asset: string
  target_amount: number
  actual_amount: number
  stage: PipelineStage
  close_date?: string
  probability: number
  notes?: string
  created_at: string
  // Categorisation
  category?: InvestorCategory
  investor_type?: InvestorType
  point_of_contact?: PointOfContact
  // Contact info
  firm?: string
  title?: string
  linkedin_url?: string
  website?: string
  // Meta
  priority_tier?: string
  source?: string
  investment_rationale?: string
  lifecycle_stage?: string
  record_id?: string
  // Hierarchy: company → individuals
  parent_id?: string   // set on individual records pointing to a company record
  is_company?: boolean // true when this row represents a company/firm (not an individual)
  // File attachments – JSON array of { name: string; url: string; uploaded_at: string }
  documents?: string
}

export interface PipelineLeadWithRow extends PipelineLead {
  _rowIndex: number
}

const TAB = 'Pipeline'

function rowToLead(row: string[]): PipelineLead {
  return {
    id: row[0] || '',
    name: row[1] || '',
    email: row[2] || '',
    phone: row[3] || '',
    asset: row[4] || '',
    target_amount: parseFloat(row[5] || '0'),
    actual_amount: parseFloat(row[6] || '0'),
    stage: (row[7] || 'backlog') as PipelineStage,
    close_date: row[8] || '',
    probability: parseFloat(row[9] || '0'),
    notes: row[10] || '',
    created_at: row[11] || '',
    category: (row[12] || '') as InvestorCategory,
    firm: row[13] || '',
    title: row[14] || '',
    linkedin_url: row[15] || '',
    website: row[16] || '',
    priority_tier: row[17] || '',
    source: row[18] || '',
    investment_rationale: row[19] || '',
    lifecycle_stage: row[20] || '',
    record_id: row[21] || '',
    investor_type: (row[22] || '') as InvestorType,
    point_of_contact: (row[23] || '') as PointOfContact,
    parent_id: row[24] || '',
    is_company: row[25] === 'true',
    documents: row[26] || '',
  }
}

function leadToRow(l: PipelineLead): string[] {
  return [
    l.id,
    l.name,
    l.email,
    l.phone || '',
    l.asset,
    String(l.target_amount),
    String(l.actual_amount),
    l.stage,
    l.close_date || '',
    String(l.probability),
    l.notes || '',
    l.created_at,
    l.category || '',
    l.firm || '',
    l.title || '',
    l.linkedin_url || '',
    l.website || '',
    l.priority_tier || '',
    l.source || '',
    l.investment_rationale || '',
    l.lifecycle_stage || '',
    l.record_id || '',
    l.investor_type || '',
    l.point_of_contact || '',
    l.parent_id || '',
    l.is_company ? 'true' : '',
    l.documents || '',
  ]
}

export async function listPipelineLeads(): Promise<PipelineLead[]> {
  const rows = await readSheetRange(TAB)
  return rows.filter((r) => r[0]).map(rowToLead)
}

export async function listPipelineLeadsWithRows(): Promise<PipelineLeadWithRow[]> {
  const rows = await readSheetRange(TAB, undefined, true)
  const result: PipelineLeadWithRow[] = []
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0]) {
      result.push({ ...rowToLead(rows[i]), _rowIndex: i + 1 })
    }
  }
  return result
}

export async function appendPipelineLead(lead: Omit<PipelineLead, 'id' | 'created_at'>): Promise<PipelineLead> {
  const full: PipelineLead = {
    ...lead,
    id: `lead_${Date.now()}`,
    created_at: new Date().toISOString().split('T')[0],
  }
  await appendSheetRow(TAB, leadToRow(full))
  return full
}

export async function updatePipelineLead(id: string, updates: Partial<PipelineLead>): Promise<void> {
  const rowIndex = await findRowIndex(TAB, id)
  if (rowIndex === -1) throw new Error('Lead not found')
  const rows = await readSheetRange(TAB, undefined, true)
  const row = rows.find((r) => r[0] === id)
  if (!row) throw new Error('Lead not found')
  const current = rowToLead(row)
  await updateSheetRow(TAB, rowIndex, leadToRow({ ...current, ...updates, id }))
}

export async function deletePipelineLead(id: string): Promise<void> {
  const rowIndex = await findRowIndex(TAB, id)
  if (rowIndex !== -1) await deleteSheetRow(TAB, rowIndex)
}
