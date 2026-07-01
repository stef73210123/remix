import { getRedis } from './redis'

/**
 * Job-search + consulting CRM, read live from Upstash. Populated (and kept in
 * sync) by scripts/seed-crm.mjs, which mirrors the Stefan_CRM_v*.html tabs into
 * Redis keys crm:CRE, crm:TECH, crm:REC, crm:AI, crm:CONSULT.
 */
export const CRM_CATEGORIES = ['CRE', 'TECH', 'REC', 'AI', 'CONSULT'] as const
export type CrmCategory = (typeof CRM_CATEGORIES)[number]

export const CRM_LABELS: Record<CrmCategory, string> = {
  CRE: 'CRE',
  TECH: 'PropTech',
  REC: 'Recruiting',
  AI: 'AI',
  CONSULT: 'Consulting',
}

export interface CrmEntry {
  firm: string
  tier: string
  status: string
  email: string
  city: string
  contact: string
  web: string
}

export type CrmData = Record<CrmCategory, CrmEntry[]>

export async function getAllCrm(): Promise<CrmData> {
  const redis = getRedis()
  const results = await Promise.all(
    CRM_CATEGORIES.map((c) => redis.get<CrmEntry[]>(`crm:${c}`))
  )
  const out = {} as CrmData
  CRM_CATEGORIES.forEach((c, i) => {
    out[c] = results[i] ?? []
  })
  return out
}
