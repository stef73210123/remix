import { readSheetRange, appendSheetRow, updateSheetRow, deleteSheetRow, findRowIndex } from './client'

const TAB = 'Team'

export type TeamMemberType = 'principal' | 'firm'

export interface TeamMember {
  id: string
  asset: string       // 'livingstonfarm' | 'wrenofthewoods' | 'all'
  type: TeamMemberType
  name: string
  title: string       // job title for principals, empty for firms
  bio: string         // bio for principals, description for firms
  email: string       // principals only
  linkedin_url: string
  website: string     // homepage for firms
  headshot_url: string  // principals only
  logo_url: string      // firms only
  images: string[]    // carousel images for firms
  sort_order: number
  active: boolean
  created_at: string
}

function rowToMember(row: string[]): TeamMember {
  return {
    id: row[0] || '',
    asset: row[1] || '',
    type: (row[2] || 'principal') as TeamMemberType,
    name: row[3] || '',
    title: row[4] || '',
    bio: row[5] || '',
    email: row[6] || '',
    linkedin_url: row[7] || '',
    website: row[8] || '',
    headshot_url: row[9] || '',
    logo_url: row[10] || '',
    images: row[11] ? JSON.parse(row[11]) : [],
    sort_order: parseInt(row[12] || '0', 10),
    active: (row[13] || 'TRUE').toUpperCase() !== 'FALSE',
    created_at: row[14] || '',
  }
}

function memberToRow(m: TeamMember): string[] {
  return [
    m.id,
    m.asset,
    m.type,
    m.name,
    m.title,
    m.bio,
    m.email,
    m.linkedin_url,
    m.website,
    m.headshot_url,
    m.logo_url,
    JSON.stringify(m.images),
    String(m.sort_order),
    m.active ? 'TRUE' : 'FALSE',
    m.created_at,
  ]
}

export async function listTeamMembers(asset?: string): Promise<TeamMember[]> {
  const rows = await readSheetRange(TAB)
  const members = rows.filter((r) => r[0]).map(rowToMember)
  if (asset) return members.filter((m) => m.asset === asset || m.asset === 'all')
  return members
}

export async function upsertTeamMember(member: TeamMember): Promise<void> {
  if (!member.created_at) {
    member.created_at = new Date().toISOString().split('T')[0]
  }
  const rowIndex = await findRowIndex(TAB, member.id)
  if (rowIndex === -1) {
    await appendSheetRow(TAB, memberToRow(member))
  } else {
    await updateSheetRow(TAB, rowIndex, memberToRow(member))
  }
}

export async function deleteTeamMember(id: string): Promise<void> {
  const rowIndex = await findRowIndex(TAB, id)
  if (rowIndex !== -1) {
    await deleteSheetRow(TAB, rowIndex)
  }
}
