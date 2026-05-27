import { readSheetRange, appendSheetRow, updateSheetRow, findRowIndex } from './client'
import type { User, UserRole } from '@/types'

const TAB = 'Users'

function rowToUser(row: string[]): User {
  return {
    email: row[0] || '',
    name: row[1] || '',
    role: (row[2] || 'lp') as UserRole,
    asset_access: row[3] ? row[3].split(',').map((s) => s.trim()).filter(Boolean) : [],
    active: row[4]?.toUpperCase() === 'TRUE',
    created_at: row[5] || '',
    notes: row[6] || '',
  }
}

function rowToUserWithHash(row: string[]): User & { password_hash?: string } {
  return {
    ...rowToUser(row),
    password_hash: row[7] || undefined,
  }
}

function userToRow(user: User): string[] {
  return [
    user.email,
    user.name,
    user.role,
    user.asset_access.join(','),
    user.active ? 'TRUE' : 'FALSE',
    user.created_at,
    user.notes || '',
  ]
}

export async function getUser(email: string): Promise<User | null> {
  const rows = await readSheetRange(TAB)
  const row = rows.find((r) => r[0]?.toLowerCase() === email.toLowerCase())
  if (!row) return null
  return rowToUser(row)
}

export async function listUsers(): Promise<User[]> {
  const rows = await readSheetRange(TAB)
  return rows.filter((r) => r[0]).map(rowToUser)
}

export async function listUsersWithStatus(): Promise<(User & { has_password: boolean })[]> {
  const rows = await readSheetRange(TAB)
  return rows.filter((r) => r[0]).map((row) => ({
    ...rowToUser(row),
    has_password: !!(row[7] && row[7].trim()),
  }))
}

export async function upsertUser(user: User): Promise<void> {
  const rowIndex = await findRowIndex(TAB, user.email)
  if (rowIndex === -1) {
    // New user — append
    if (!user.created_at) {
      user.created_at = new Date().toISOString().split('T')[0]
    }
    await appendSheetRow(TAB, userToRow(user))
  } else {
    // Existing user — update (rowIndex includes header, so actual sheet row = rowIndex)
    await updateSheetRow(TAB, rowIndex, userToRow(user))
  }
}

/**
 * Soft delete: set active=FALSE rather than removing the row.
 */
export async function deleteUser(email: string): Promise<void> {
  const user = await getUser(email)
  if (!user) return
  user.active = false
  await upsertUser(user)
}

/**
 * Returns a user including the password_hash column (col 7).
 */
export async function getUserWithPasswordHash(email: string): Promise<(User & { password_hash?: string }) | null> {
  const rows = await readSheetRange(TAB)
  const row = rows.find((r) => r[0]?.toLowerCase() === email.toLowerCase())
  if (!row) return null
  return rowToUserWithHash(row)
}

/**
 * Updates only the password_hash column (col 7) for a given user row.
 */
export async function updateUserPasswordHash(email: string, hash: string): Promise<void> {
  const rowIndex = await findRowIndex(TAB, email)
  if (rowIndex === -1) throw new Error(`User not found: ${email}`)
  const rows = await readSheetRange(TAB)
  const row = rows.find((r) => r[0]?.toLowerCase() === email.toLowerCase())
  if (!row) throw new Error(`User row not found: ${email}`)
  // Build the full row including the new hash at index 7
  const fullRow = [
    row[0] || '',
    row[1] || '',
    row[2] || '',
    row[3] || '',
    row[4] || '',
    row[5] || '',
    row[6] || '',
    hash,
  ]
  await updateSheetRow(TAB, rowIndex, fullRow)
}
