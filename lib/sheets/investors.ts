import { readSheetRange, appendSheetRow, updateSheetRow, findRowIndex, deleteSheetRow } from './client'
import type { InvestorPosition } from '@/types'

const TAB = 'Investors'

function rowToPosition(row: string[]): InvestorPosition {
  return {
    investor_id: row[0] || '',
    email: row[1] || '',
    name: row[2] || '',
    asset: row[3] || '',
    equity_invested: parseFloat(row[4] || '0'),
    ownership_pct: parseFloat(row[5] || '0'),
    capital_account_balance: parseFloat(row[6] || '0'),
    nav_estimate: parseFloat(row[7] || '0'),
    irr_estimate: parseFloat(row[8] || '0'),
    equity_multiple: parseFloat(row[9] || '0'),
    distributions_total: parseFloat(row[10] || '0'),
    last_updated: row[11] || '',
  }
}

export async function getInvestorPositionsForUser(email: string): Promise<InvestorPosition[]> {
  const rows = await readSheetRange(TAB)
  return rows
    .filter((r) => r[1]?.toLowerCase() === email.toLowerCase())
    .map(rowToPosition)
}

export async function getInvestorPositionForAsset(
  email: string,
  asset: string
): Promise<InvestorPosition | null> {
  const rows = await readSheetRange(TAB)
  const row = rows.find(
    (r) =>
      r[1]?.toLowerCase() === email.toLowerCase() &&
      r[3]?.toLowerCase() === asset.toLowerCase()
  )
  return row ? rowToPosition(row) : null
}

export async function listAllInvestorPositions(): Promise<InvestorPosition[]> {
  const rows = await readSheetRange(TAB)
  return rows.filter((r) => r[0]).map(rowToPosition)
}

function positionToRow(p: InvestorPosition): string[] {
  return [
    p.investor_id, p.email, p.name, p.asset,
    String(p.equity_invested), String(p.ownership_pct), String(p.capital_account_balance),
    String(p.nav_estimate), String(p.irr_estimate), String(p.equity_multiple),
    String(p.distributions_total), p.last_updated || new Date().toISOString().split('T')[0],
  ]
}

export async function upsertInvestorPosition(pos: InvestorPosition): Promise<void> {
  const rowIndex = await findRowIndex(TAB, pos.investor_id)
  if (rowIndex === -1) {
    await appendSheetRow(TAB, positionToRow(pos))
  } else {
    await updateSheetRow(TAB, rowIndex, positionToRow(pos))
  }
}

export async function deleteInvestorPosition(investor_id: string): Promise<void> {
  const rowIndex = await findRowIndex(TAB, investor_id)
  if (rowIndex !== -1) await deleteSheetRow(TAB, rowIndex)
}
