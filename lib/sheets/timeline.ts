import { readSheetRange } from './client'
import type { TimelineMilestone, MilestoneStatus } from '@/types'

function rowToMilestone(row: string[]): TimelineMilestone {
  return {
    milestone: row[0] || '',
    planned_date: row[1] || '',
    actual_date: row[2] || undefined,
    status: (row[3] || 'upcoming') as MilestoneStatus,
    notes: row[4] || '',
    sort_order: parseInt(row[5] || '0', 10),
  }
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
