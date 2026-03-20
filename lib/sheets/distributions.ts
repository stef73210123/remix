import { readSheetRange } from './client'
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
