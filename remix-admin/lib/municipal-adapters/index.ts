/**
 * Adapter registry — resolves adapter keys to their concrete implementations.
 *
 * The ingest pipeline dispatches on `AdapterKey` string via this map,
 * never by class name or municipality-specific branches.
 */
import type { AdapterKey } from '../municipal/registry'
import type { MunicipalAdapter } from './base'
import civicplus from './civicplus'
import granicus from './granicus'
import wpPdf from './wp-pdf'
import ecode360 from './ecode360'

// YouTube adapter is a stub for M1; wired in M1½ if we need it.
const youtubeStub: MunicipalAdapter = {
  key: 'nc-youtube',
  displayName: 'North Castle · YouTube (Planning Dept)',
  async *discoverMeetings() {},
  async fetchAsset() {
    throw new Error('yt-dlp adapter not wired yet — planned for M1½')
  },
}

export const ADAPTERS: Record<AdapterKey, MunicipalAdapter> = {
  'nc-civicplus': civicplus,
  'nc-granicus': granicus,
  'nc-youtube': youtubeStub,
  'rockland-wp': wpPdf,
  ecode360,
}

export function getAdapter(key: AdapterKey): MunicipalAdapter {
  const a = ADAPTERS[key]
  if (!a) throw new Error(`no adapter registered for key '${key}'`)
  return a
}
