import { readSheetRange, appendSheetRow, updateSheetRow, findRowIndex, deleteSheetRow } from './client'
import type { Distribution, DistributionType } from '@/types'

const TAB = 'Distributions'

function rowToDistribution(row: string[]): Distribution {
  return {
    id: row[0] || '',
    investor_id: row[1] || '',
    email: row[2] || '',
    asset: row[3] || '',
    date: row[4] || '',
    amount: parseFloat(row[5] || '0'),
    type: (row[6] || 'profit') as DistributionType,
    notes: row[7] || '',
  }
}

export async function listAllDistributions(): Promise<Distribution[]> {
  const rows = await readSheetRange(TAB)
  return rows.filter((r) => r[0]).map(rowToDistribution)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

function distributionToRow(d: Distribution): string[] {
  return [d.id, d.investor_id, d.email, d.asset, d.date, String(d.amount), d.type, d.notes || '']
}

export async function appendDistribution(d: Omit<Distribution, 'id'>): Promise<Distribution> {
  const id = `dist_${Date.now()}`
  const dist = { id, ...d }
  await appendSheetRow(TAB, distributionToRow(dist))
  return dist
}

export async function updateDistribution(id: string, updates: Partial<Distribution>): Promise<void> {
  const rowIndex = await findRowIndex(TAB, id)
  if (rowIndex === -1) throw new Error('Distribution not found')
  const rows = await readSheetRange(TAB, undefined, true)
  const row = rows.find((r) => r[0] === id)
  if (!row) throw new Error('Distribution not found')
  const current = rowToDistribution(row)
  await updateSheetRow(TAB, rowIndex, distributionToRow({ ...current, ...updates, id }))
}

export async function deleteDistribution(id: string): Promise<void> {
  const rowIndex = await findRowIndex(TAB, id)
  if (rowIndex !== -1) await deleteSheetRow(TAB, rowIndex)
}

export async function getDistributionsForUser(
  email: string,
  asset?: string
): Promise<Distribution[]> {
  const rows = await readSheetRange(TAB)
  return rows
    .filter((r) => {
      const emailMatch = r[2]?.toLowerCase() === email.toLowerCase()
      if (!emailMatch) return false
      if (asset) return r[3]?.toLowerCase() === asset.toLowerCase()
      return true
    })
    .map(rowToDistribution)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
}
