import { readSheetRange, appendSheetRow, updateSheetRow, deleteSheetRow } from './client'
import type { AssetMedia, AssetMediaType, AssetMediaWithRow } from '@/types'

const TAB = 'AssetMedia'

/**
 * Media items uploaded via the admin (file upload) are stored in R2 with a
 * "r2:" prefix in the URL column. Resolve these to the /api/media proxy route.
 */
function resolveUrl(url: string): string {
  if (url.startsWith('r2:')) {
    return `/api/media?key=${encodeURIComponent(url.slice(3))}`
  }
  return url
}

function rowToMedia(row: string[]): AssetMedia {
  return {
    id: row[0] || '',
    asset: row[1] || '',
    type: (row[2] || 'image') as AssetMediaType,
    url: resolveUrl(row[3] || ''),
    caption: row[4] || '',
    sort_order: parseInt(row[5] || '0', 10),
  }
}

function mediaToRow(m: AssetMedia): string[] {
  return [m.id, m.asset, m.type, m.url, m.caption || '', String(m.sort_order)]
}

export async function getAssetMedia(asset: string): Promise<AssetMedia[]> {
  const rows = await readSheetRange(TAB)
  return rows
    .filter((r) => r[0] && r[1]?.toLowerCase() === asset.toLowerCase())
    .map(rowToMedia)
    .sort((a, b) => a.sort_order - b.sort_order)
}

export async function getAllMediaWithRows(): Promise<AssetMediaWithRow[]> {
  const rows = await readSheetRange(TAB, undefined, true)
  const result: AssetMediaWithRow[] = []
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0]) {
      result.push({ ...rowToMedia(rows[i]), _rowIndex: i + 1 })
    }
  }
  return result.sort((a, b) => {
    if (a.asset !== b.asset) return a.asset.localeCompare(b.asset)
    return a.sort_order - b.sort_order
  })
}

export async function getAssetMediaWithRows(asset: string): Promise<AssetMediaWithRow[]> {
  const all = await getAllMediaWithRows()
  return all.filter((m) => m.asset.toLowerCase() === asset.toLowerCase())
}

export async function appendMedia(m: Omit<AssetMedia, 'id'>): Promise<AssetMedia> {
  const media: AssetMedia = { id: `media_${Date.now()}`, ...m }
  await appendSheetRow(TAB, mediaToRow(media))
  return media
}

export async function updateMedia(rowIndex: number, m: AssetMedia): Promise<void> {
  await updateSheetRow(TAB, rowIndex, mediaToRow(m))
}

export async function deleteMedia(rowIndex: number): Promise<void> {
  await deleteSheetRow(TAB, rowIndex)
}
