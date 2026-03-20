import { readSheetRange, appendSheetRow, updateSheetRow, deleteSheetRow } from './client'
import type { BudgetLine } from '@/types'

export interface BudgetLineWithRow extends BudgetLine {
  _rowIndex: number
}

function rowToBudgetLine(row: string[]): BudgetLine {
  return {
    category: row[0] || '',
    budgeted: parseFloat(row[1] || '0'),
    actual_to_date: parseFloat(row[2] || '0'),
    projected_final: parseFloat(row[3] || '0'),
    notes: row[4] || '',
    sort_order: parseInt(row[5] || '0', 10),
  }
}

function budgetLineToRow(b: BudgetLine): string[] {
  return [
    b.category,
    String(b.budgeted),
    String(b.actual_to_date),
    String(b.projected_final),
    b.notes || '',
    String(b.sort_order),
  ]
}

export async function getBudget(asset: string): Promise<BudgetLine[]> {
  const tabName = `Budget_${asset}`
  const rows = await readSheetRange(tabName)
  return rows
    .filter((r) => r[0])
    .map(rowToBudgetLine)
    .sort((a, b) => a.sort_order - b.sort_order)
}

export async function getBudgetWithRows(asset: string): Promise<BudgetLineWithRow[]> {
  const tabName = `Budget_${asset}`
  const rows = await readSheetRange(tabName, undefined, true)
  const result: BudgetLineWithRow[] = []
  // rows[0] is header, data starts at index 1 → rowIndex 2
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0]) {
      result.push({ ...rowToBudgetLine(rows[i]), _rowIndex: i + 1 })
    }
  }
  return result.sort((a, b) => a.sort_order - b.sort_order)
}

export async function appendBudgetLine(asset: string, b: BudgetLine): Promise<void> {
  await appendSheetRow(`Budget_${asset}`, budgetLineToRow(b))
}

export async function updateBudgetLine(asset: string, rowIndex: number, b: BudgetLine): Promise<void> {
  await updateSheetRow(`Budget_${asset}`, rowIndex, budgetLineToRow(b))
}

export async function deleteBudgetLine(asset: string, rowIndex: number): Promise<void> {
  await deleteSheetRow(`Budget_${asset}`, rowIndex)
}
