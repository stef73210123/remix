import { readSheetRange } from './client'
import type { InvestorDocument, DocType, DocVisibility, UserRole } from '@/types'

const TAB = 'Documents'

function rowToDocument(row: string[]): InvestorDocument {
  return {
    id: row[0] || '',
    email: row[1] || '',
    asset: row[2] || '',
    doc_name: row[3] || '',
    doc_type: (row[4] || 'other') as DocType,
    r2_key: row[5] || '',
    date: row[6] || '',
    visible_to: (row[7] || 'lp') as DocVisibility,
  }
}

/**
 * Returns documents visible to this user for a given asset.
 * Includes docs where email matches OR email === "all".
 * Filters by visibility based on role.
 */
export async function getDocumentsForUser(
  email: string,
  asset: string,
  role: UserRole
): Promise<InvestorDocument[]> {
  const rows = await readSheetRange(TAB)
  const visibilityOrder: Record<DocVisibility, number> = { lp: 0, gp: 1, admin: 2 }
  const roleOrder: Record<UserRole, number> = { lp: 0, dealroom: 0, gp: 1, admin: 2 }

  return rows
    .filter((r) => {
      const emailMatch =
        r[1]?.toLowerCase() === email.toLowerCase() || r[1] === 'all'
      const assetMatch = r[2]?.toLowerCase() === asset.toLowerCase()
      const visibility = (r[7] || 'lp') as DocVisibility
      const canSee = roleOrder[role] >= visibilityOrder[visibility]
      return emailMatch && assetMatch && canSee
    })
    .map(rowToDocument)
}

export async function getDocumentById(id: string): Promise<InvestorDocument | null> {
  const rows = await readSheetRange(TAB)
  const row = rows.find((r) => r[0] === id)
  return row ? rowToDocument(row) : null
}

/**
 * Returns shared deal room documents (email="all") for a given asset.
 */
export async function getSharedDealDocuments(asset: string): Promise<InvestorDocument[]> {
  const rows = await readSheetRange(TAB)
  return rows
    .filter((r) => r[1] === 'all' && r[2]?.toLowerCase() === asset.toLowerCase())
    .map(rowToDocument)
}
