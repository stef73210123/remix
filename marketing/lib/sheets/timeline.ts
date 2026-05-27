import { readSheetRange, appendSheetRow, updateSheetRow, deleteSheetRow } from './client'
import type { TimelineMilestone, MilestoneStatus } from '@/types'

export interface TimelineMilestoneWithRow extends TimelineMilestone {
  _rowIndex: number
}

function rowToMilestone(row: string[]): TimelineMilestone {
  return {
    milestone: row[0] || '',
    planned_date: row[1] || '',
    actual_date: row[2] || undefined,
    status: (row[3] || 'upcoming') as MilestoneStatus,
    notes: row[4] || '',
    sort_order: parseInt(row[5] || '0', 10),
    planned_end_date: row[6] || undefined,
    actual_end_date: row[7] || undefined,
  }
}

function milestoneToRow(m: TimelineMilestone): string[] {
  return [
    m.milestone,
    m.planned_date,
    m.actual_date || '',
    m.status,
    m.notes || '',
    String(m.sort_order),
    m.planned_end_date || '',
    m.actual_end_date || '',
  ]
}

export async function getTimeline(asset: string): Promise<TimelineMilestone[]> {
  const tabName = `Timeline_${asset}`
  const rows = await readSheetRange(tabName)
  return rows
    .filter((r) => r[0])
    .map(rowToMilestone)
    .sort((a, b) => {
      if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order
      return new Date(a.planned_date).getTime() - new Date(b.planned_date).getTime()
    })
}

export async function getTimelineWithRows(asset: string): Promise<TimelineMilestoneWithRow[]> {
  const tabName = `Timeline_${asset}`
  const rows = await readSheetRange(tabName, undefined, true)
  const result: TimelineMilestoneWithRow[] = []
  // rows[0] is header, data starts at index 1 → rowIndex 2
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0]) {
      result.push({ ...rowToMilestone(rows[i]), _rowIndex: i + 1 })
    }
  }
  return result.sort((a, b) => {
    if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order
    return new Date(a.planned_date).getTime() - new Date(b.planned_date).getTime()
  })
}

export async function appendMilestone(asset: string, m: TimelineMilestone): Promise<void> {
  await appendSheetRow(`Timeline_${asset}`, milestoneToRow(m))
}

export async function updateMilestone(asset: string, rowIndex: number, m: TimelineMilestone): Promise<void> {
  await updateSheetRow(`Timeline_${asset}`, rowIndex, milestoneToRow(m))
}

export async function deleteMilestone(asset: string, rowIndex: number): Promise<void> {
  await deleteSheetRow(`Timeline_${asset}`, rowIndex)
}
