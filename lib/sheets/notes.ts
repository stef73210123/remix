import { readSheetRange, appendSheetRow, deleteSheetRow, findRowIndex } from './client'

const TAB = 'Notes'

export interface Note {
  id: string
  type: 'timeline' | 'budget' | 'post'
  asset: string
  ref_id: string      // rowIndex or id of the referenced item (empty for posts)
  ref_label: string   // display label, e.g. milestone name or budget category
  title: string
  body: string
  posted_by: string
  posted_at: string
  media_urls: string  // comma-separated URLs
}

function rowToNote(row: string[]): Note {
  return {
    id: row[0] || '',
    type: (row[1] || 'post') as Note['type'],
    asset: row[2] || '',
    ref_id: row[3] || '',
    ref_label: row[4] || '',
    title: row[5] || '',
    body: row[6] || '',
    posted_by: row[7] || '',
    posted_at: row[8] || '',
    media_urls: row[9] || '',
  }
}

function noteToRow(n: Omit<Note, 'id'> & { id: string }): string[] {
  return [n.id, n.type, n.asset, n.ref_id, n.ref_label, n.title, n.body, n.posted_by, n.posted_at, n.media_urls || '']
}

export async function getAllNotes(): Promise<Note[]> {
  const rows = await readSheetRange(TAB)
  return rows
    .filter((r) => r[0])
    .map(rowToNote)
    .sort((a, b) => b.posted_at.localeCompare(a.posted_at))
}

export async function getNotesForAsset(asset: string, type?: Note['type']): Promise<Note[]> {
  const all = await getAllNotes()
  return all.filter((n) => {
    if (type && n.type !== type) return false
    if (asset && n.asset !== asset) return false
    return true
  })
}

export async function appendNote(n: Omit<Note, 'id' | 'media_urls'> & { media_urls?: string }): Promise<Note> {
  const id = `note_${Date.now()}`
  const note: Note = { id, media_urls: '', ...n }
  await appendSheetRow(TAB, noteToRow(note))
  return note
}

export async function deleteNote(id: string): Promise<void> {
  const rowIndex = await findRowIndex(TAB, id)
  if (rowIndex === -1) throw new Error(`Note ${id} not found`)
  await deleteSheetRow(TAB, rowIndex)
}
