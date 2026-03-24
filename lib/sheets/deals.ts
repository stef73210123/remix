import { readSheetRange, appendSheetRow, updateSheetRow, deleteSheetRow, findRowIndex } from './client'

export type DealStage =
  | 'sourcing'
  | 'screening'
  | 'loi'
  | 'due-diligence'
  | 'negotiating'
  | 'contracted'
  | 'closed'
  | 'passed'
  | 'dead'

export interface Deal {
  id: string
  name: string
  address: string
  asset_type: string
  market: string
  asking_price: number
  target_price: number
  size_sf: number
  units: number
  cap_rate: number
  irr_target: number
  source: string
  broker: string
  stage: DealStage
  probability: number
  close_date: string
  notes: string
  created_at: string
}

export interface DealWithRow extends Deal {
  _rowIndex: number
}

const TAB = 'Deals'

function rowToDeal(row: string[]): Deal {
  return {
    id: row[0] || '',
    name: row[1] || '',
    address: row[2] || '',
    asset_type: row[3] || '',
    market: row[4] || '',
    asking_price: parseFloat(row[5] || '0'),
    target_price: parseFloat(row[6] || '0'),
    size_sf: parseFloat(row[7] || '0'),
    units: parseInt(row[8] || '0'),
    cap_rate: parseFloat(row[9] || '0'),
    irr_target: parseFloat(row[10] || '0'),
    source: row[11] || '',
    broker: row[12] || '',
    stage: (row[13] || 'sourcing') as DealStage,
    probability: parseFloat(row[14] || '0'),
    close_date: row[15] || '',
    notes: row[16] || '',
    created_at: row[17] || '',
  }
}

function dealToRow(d: Deal): string[] {
  return [
    d.id, d.name, d.address, d.asset_type, d.market,
    String(d.asking_price), String(d.target_price),
    String(d.size_sf), String(d.units),
    String(d.cap_rate), String(d.irr_target),
    d.source, d.broker, d.stage,
    String(d.probability), d.close_date, d.notes, d.created_at,
  ]
}

export async function listDeals(): Promise<Deal[]> {
  const rows = await readSheetRange(TAB)
  return rows.filter((r) => r[0]).map(rowToDeal)
}

export async function listDealsWithRows(): Promise<DealWithRow[]> {
  const rows = await readSheetRange(TAB, undefined, true)
  const result: DealWithRow[] = []
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0]) result.push({ ...rowToDeal(rows[i]), _rowIndex: i + 1 })
  }
  return result
}

export async function appendDeal(deal: Omit<Deal, 'id' | 'created_at'>): Promise<Deal> {
  const full: Deal = {
    ...deal,
    id: `deal_${Date.now()}`,
    created_at: new Date().toISOString().split('T')[0],
  }
  await appendSheetRow(TAB, dealToRow(full))
  return full
}

export async function updateDeal(id: string, updates: Partial<Deal>): Promise<void> {
  const rowIndex = await findRowIndex(TAB, id)
  if (rowIndex === -1) throw new Error('Deal not found')
  const rows = await readSheetRange(TAB, undefined, true)
  const row = rows.find((r) => r[0] === id)
  if (!row) throw new Error('Deal not found')
  const current = rowToDeal(row)
  await updateSheetRow(TAB, rowIndex, dealToRow({ ...current, ...updates, id }))
}

export async function deleteDeal(id: string): Promise<void> {
  const rowIndex = await findRowIndex(TAB, id)
  if (rowIndex !== -1) await deleteSheetRow(TAB, rowIndex)
}
