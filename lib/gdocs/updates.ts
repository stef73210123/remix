import { fetchDoc } from './client'
import { parseDocToHtml } from './parser'
import type { DocSection } from '@/types'

const DOC_ID_MAP: Record<string, string> = {
  livingstonfarm: 'GDOC_LIVINGSTONFARM_UPDATES_ID',
  wrenofthewoods: 'GDOC_WRENOFTHEWOODS_UPDATES_ID',
}

/**
 * Returns asset update sections sorted by appearance order (newest first = top of doc).
 * Each H1 section is one update period (e.g., "February 2026").
 */
export async function getAssetUpdates(slug: string): Promise<DocSection[]> {
  const envKey = DOC_ID_MAP[slug]
  if (!envKey) throw new Error(`Unknown asset slug: ${slug}`)

  const docId = process.env[envKey]
  if (!docId) throw new Error(`${envKey} env var is not set`)

  const doc = await fetchDoc(docId)
  const parsed = parseDocToHtml(doc)

  // Return only H1 sections (top-level update periods)
  return parsed.sections.filter((s) => s.level === 1)
}

/**
 * Returns the most recent update section (first H1).
 */
export async function getLatestUpdate(slug: string): Promise<DocSection | null> {
  const updates = await getAssetUpdates(slug)
  return updates[0] || null
}
