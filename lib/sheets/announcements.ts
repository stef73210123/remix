import { readSheetRange, appendSheetRow } from './client'

const TAB = 'Announcements'

export interface Announcement {
  id: string
  asset: string
  title: string
  body: string
  posted_by: string
  posted_at: string
  media_urls?: string
}

function rowToAnnouncement(row: string[]): Announcement {
  return {
    id: row[0] || '',
    asset: row[1] || '',
    title: row[2] || '',
    body: row[3] || '',
    posted_by: row[4] || '',
    posted_at: row[5] || '',
    media_urls: row[6] || '',
  }
}

export async function getAnnouncementsForAsset(asset: string): Promise<Announcement[]> {
  const rows = await readSheetRange(TAB)
  return rows
    .filter((r) => r[1]?.toLowerCase() === asset.toLowerCase() && r[0])
    .map(rowToAnnouncement)
    .sort((a, b) => b.posted_at.localeCompare(a.posted_at))
}

export async function appendAnnouncement(
  ann: Omit<Announcement, 'id'>
): Promise<Announcement> {
  const id = `ann_${Date.now()}`
  await appendSheetRow(TAB, [id, ann.asset, ann.title, ann.body, ann.posted_by, ann.posted_at, ann.media_urls || ''])
  return { id, ...ann }
}
