import { parseCsv } from './csv'
import { CRM_CATEGORIES, type CrmCategory, type CrmData, type CrmEntry } from './crm'

/**
 * Live job-search + consulting CRM.
 *
 * Primary source is the Google Apps Script web app bound to the sheet
 * (SHEET_WRITE_URL + SHEET_WRITE_SECRET). It runs as the sheet owner and
 * returns rows as JSON, so the sheet does NOT need to be shared publicly.
 * Fallback: the public CSV export (if the sheet is shared "Anyone with link").
 * If neither works, callers fall back to Upstash (see lib/crm.ts).
 *
 * Columns: Category, Firm, Tier, Status, Email, City, Contact, Web
 * Category is one of CRM_CATEGORIES (CRE, TECH, REC, AI, CONSULT).
 */
const SHEET_ID =
  process.env.JOBCRM_SHEET_ID || '1J6xTfgjgrngbA_xGv_V3ddbIHo_IA7X8p5wCG8iQyF8'
const SHEET_CSV = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv`

const VALID = new Set<string>(CRM_CATEGORIES as readonly string[])

function emptyData(): CrmData {
  const out = {} as CrmData
  for (const c of CRM_CATEGORIES) out[c] = []
  return out
}

interface RawRow {
  category?: string
  firm?: string
  tier?: string
  status?: string
  email?: string
  city?: string
  contact?: string
  web?: string
}

function groupRows(rows: RawRow[]): CrmData | null {
  const out = emptyData()
  for (const r of rows) {
    const cat = String(r.category || '').toUpperCase().trim()
    const firm = String(r.firm || '').trim()
    if (!firm || !VALID.has(cat)) continue
    const entry: CrmEntry = {
      firm,
      tier: String(r.tier || '').trim(),
      status: String(r.status || '').trim(),
      email: String(r.email || '').trim(),
      city: String(r.city || '').trim(),
      contact: String(r.contact || '').trim(),
      web: String(r.web || '').trim(),
    }
    out[cat as CrmCategory].push(entry)
  }
  const total = CRM_CATEGORIES.reduce((n, c) => n + out[c].length, 0)
  return total > 0 ? out : null
}

/** Primary: read rows as JSON from the Apps Script (sheet stays private). */
async function fromAppsScript(): Promise<CrmData | null> {
  const base = process.env.SHEET_WRITE_URL
  const secret = process.env.SHEET_WRITE_SECRET
  if (!base || !secret) return null
  try {
    const url = `${base}${base.includes('?') ? '&' : '?'}secret=${encodeURIComponent(secret)}`
    const res = await fetch(url, { cache: 'no-store', redirect: 'follow' })
    if (!res.ok) return null
    const data = (await res.json()) as { rows?: RawRow[] }
    if (!data || !Array.isArray(data.rows)) return null
    return groupRows(data.rows)
  } catch {
    return null
  }
}

/** Fallback: public CSV export (only works if the sheet is shared publicly). */
async function fromCsv(): Promise<CrmData | null> {
  try {
    const res = await fetch(SHEET_CSV, { cache: 'no-store', redirect: 'follow' })
    if (!res.ok) return null
    const ct = res.headers.get('content-type') || ''
    if (!ct.includes('text/csv')) return null // private sheet returns HTML
    const rows = parseCsv(await res.text())
    if (rows.length < 2) return null
    const header = rows[0].map((h) => h.trim())
    const col = (name: string) => header.indexOf(name)
    const idx = {
      category: col('Category'),
      firm: col('Firm'),
      tier: col('Tier'),
      status: col('Status'),
      email: col('Email'),
      city: col('City'),
      contact: col('Contact'),
      web: col('Web'),
    }
    if (idx.category < 0 || idx.firm < 0) return null
    const at = (row: string[], i: number) => (i >= 0 && row[i] ? row[i].trim() : '')
    const raw: RawRow[] = rows.slice(1).map((row) => ({
      category: at(row, idx.category),
      firm: at(row, idx.firm),
      tier: at(row, idx.tier),
      status: at(row, idx.status),
      email: at(row, idx.email),
      city: at(row, idx.city),
      contact: at(row, idx.contact),
      web: at(row, idx.web),
    }))
    return groupRows(raw)
  } catch {
    return null
  }
}

/**
 * Returns grouped CRM data from the sheet, or null if it can't be read so
 * callers can fall back to another source (Upstash).
 */
export async function getJobCrmFromSheet(): Promise<CrmData | null> {
  return (await fromAppsScript()) ?? (await fromCsv())
}
