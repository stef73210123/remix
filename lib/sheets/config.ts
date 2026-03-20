import { readSheetRange } from './client'
import type { ConfigMap, AssetConfig } from '@/types'

/**
 * Returns the full Config tab as a key→value map.
 * Cached at the call site via ISR revalidation.
 */
export async function getConfig(): Promise<ConfigMap> {
  const rows = await readSheetRange('Config')
  const map: ConfigMap = {}
  for (const row of rows) {
    if (row[0] && row[1] !== undefined) {
      map[row[0].trim()] = row[1].trim()
    }
  }
  return map
}

/**
 * Returns structured config for a specific asset slug.
 */
export async function getAssetConfig(slug: string): Promise<AssetConfig> {
  const config = await getConfig()
  return {
    raise_target: parseFloat(config[`${slug}_raise_target`] || '0'),
    raise_to_date: parseFloat(config[`${slug}_raise_to_date`] || '0'),
    status: (config[`${slug}_status`] as AssetConfig['status']) || 'Raising',
    target_irr: config[`${slug}_target_irr`] || '',
    target_multiple: config[`${slug}_target_multiple`] || '',
    hold_period: config[`${slug}_hold_period`] || '',
    minimum: parseFloat(config[`${slug}_minimum`] || '0'),
    asset_type: config[`${slug}_asset_type`] || '',
    location: config[`${slug}_location`] || '',
  }
}
