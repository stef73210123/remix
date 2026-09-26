import catalog from './data/nc-packets.json'
import supporting from './data/nc-supporting-documents.json'

export interface DocumentAsset {
  kind: string
  sourceUrl: string | null
  blobUrl: string | null
  pageCount: number | null
}

export const packetCatalog = catalog

/** Exact event identity only: never attach a different meeting's documents. */
export function meetingDocuments(muni: string, sourceUrl: string | null, assets: DocumentAsset[], meta?: { documentLinks?: { agenda?: string; packet?: string } }): DocumentAsset[] {
  if (muni !== 'nc') return assets
  const eventId = sourceUrl?.match(/\/event\/(\d+)(?:\/|$)/)?.[1]
  const row = packetCatalog.find(r => r.event_id === eventId)
  const packet = meta?.documentLinks?.packet || row?.packet_url
  const agenda = meta?.documentLinks?.agenda || row?.agenda_url
  const result = assets.map(a => a.sourceUrl === packet ? { ...a, kind: 'agenda_packet' } : a)
  if (packet && !result.some(a => a.sourceUrl === packet)) result.unshift({ kind: 'agenda_packet', sourceUrl: packet, blobUrl: null, pageCount: null })
  if (agenda && !result.some(a => a.sourceUrl === agenda)) result.push({ kind: 'agenda', sourceUrl: agenda, blobUrl: null, pageCount: null })
  if (supporting.some(r=>r.event_id===eventId) && !result.some(a=>a.kind==='supporting_documents')) {
    result.push({kind:'supporting_documents',sourceUrl:`/admin/municipal/supporting-documents?event=${eventId}`,blobUrl:null,pageCount:null})
  }
  return result
}

export function documentLabel(kind: string): string {
  return kind === 'agenda_packet' ? 'Full packet' : kind.charAt(0).toUpperCase() + kind.slice(1).replaceAll('_', ' ')
}
