import { readSheetRange } from './client'
import type { BudgetLine } from '@/types'

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

export async function getBudget(asset: string): Promise<BudgetLine[]> {
  const tabName = `Budget_${asset}`
  const rows = await readSheetRange(tabName)
  return rows
    .filter((r) => r[0])
    .map(rowToBudgetLine)
    .sort((a, b) => a.sort_order - b.sort_order)
}
