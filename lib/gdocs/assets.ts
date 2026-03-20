import { fetchDoc } from './client'
import { parseDocToHtml } from './parser'
import type { ParsedDoc } from '@/types'

type ContentType = 'public' | 'dealroom'

const DOC_ID_MAP: Record<string, Record<ContentType, string>> = {
  livingstonfarm: {
    public: 'GDOC_LIVINGSTONFARM_PUBLIC_ID',
    dealroom: 'GDOC_LIVINGSTONFARM_DEALROOM_ID',
  },
  wrenofthewoods: {
    public: 'GDOC_WRENOFTHEWOODS_PUBLIC_ID',
    dealroom: 'GDOC_WRENOFTHEWOODS_DEALROOM_ID',
  },
}

export async function getAssetContent(slug: string, type: ContentType): Promise<ParsedDoc> {
  const envKey = DOC_ID_MAP[slug]?.[type]
  if (!envKey) throw new Error(`Unknown asset slug or type: ${slug}/${type}`)

  const docId = process.env[envKey]
  if (!docId) throw new Error(`${envKey} env var is not set`)

  const doc = await fetchDoc(docId)
  return parseDocToHtml(doc)
}
