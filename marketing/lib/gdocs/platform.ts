import { fetchDoc } from './client'
import { parseDocToHtml } from './parser'
import type { ParsedDoc } from '@/types'

export async function getPlatformContent(): Promise<ParsedDoc> {
  const docId = process.env.GDOC_PLATFORM_OVERVIEW_ID
  if (!docId) throw new Error('GDOC_PLATFORM_OVERVIEW_ID env var is not set')
  const doc = await fetchDoc(docId)
  return parseDocToHtml(doc)
}
