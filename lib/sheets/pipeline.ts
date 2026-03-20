import { readSheetRange, appendSheetRow, updateSheetRow, deleteSheetRow, findRowIndex } from './client'

export type PipelineStage =
  | 'prospect'
  | 'contacted'
  | 'interested'
  | 'soft-commit'
  | 'committed'
  | 'closed'

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
    stage: (row[7] || 'prospect') as PipelineStage,
    close_date: row[8] || '',
    probability: parseFloat(row[9] || '0'),
    notes: row[10] || '',
    created_at: row[11] || '',
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
