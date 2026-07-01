import { getRedis } from './redis'

/**
 * Job-search + consulting CRM.
 *
 * Primary source is a public Google Sheet, read live on each request (see
 * lib/jobcrm.ts) — fully laptop-independent. If the sheet can't be read (e.g.
 * not yet shared publicly) we fall back to Upstash, which the laptop-side
 * scripts/seed-crm.mjs mirrors from Stefan_CRM_v*.html into keys crm:CRE,
 * crm:TECH, crm:REC, crm:AI, crm:CONSULT.
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

async function getAllCrmFromUpstash(): Promise<CrmData> {
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

export async function getAllCrm(): Promise<CrmData> {
  // Prefer the live Google Sheet (laptop-independent). Import lazily to avoid
  // any circular-import evaluation issues.
  const { getJobCrmFromSheet } = await import('./jobcrm')
  const fromSheet = await getJobCrmFromSheet()
  if (fromSheet) return fromSheet
  // Fallback: Upstash mirror (kept fresh by scripts/seed-crm.mjs) so the hub
  // never goes blank if the sheet isn't shared publicly yet.
  return getAllCrmFromUpstash()
}
