import { parseCsv } from './csv'
import { CRM_CATEGORIES, type CrmCategory, type CrmData, type CrmEntry } from './crm'

/**
 * Live job-search + consulting CRM — reads a public Google Sheet (CSV export)
 * on each request, exactly like lib/fundraising.ts. This removes any reliance
 * on the laptop-side seed-crm mirror: once the sheet is shared "Anyone with
 * link -> Viewer", the admin stays in sync with the sheet automatically.
 *
 * Sheet: "Stefan Job-Search + Consulting CRM"
 * Columns: Category, Firm, Tier, Status, Email, City, Contact, Web
 * Category is one of CRM_CATEGORIES (CRE, TECH, REC, AI, CONSULT).
 */
const SHEET_ID =
  process.env.JOBCRM_SHEET_ID || '1J6xTfgjgrngbA_xGv_V3ddbIHo_IA7X8p5wCG8iQyF8'
const SHEET_CSV = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv`

function emptyData(): CrmData {
  const out = {} as CrmData
  for (const c of CRM_CATEGORIES) out[c] = []
  return out
}

/**
 * Returns grouped CRM data from the sheet, or null if the sheet can't be read
 * (e.g. not yet shared publicly) so callers can fall back to another source.
 */
export async function getJobCrmFromSheet(): Promise<CrmData | null> {
  try {
    const res = await fetch(SHEET_CSV, { cache: 'no-store', redirect: 'follow' })
    if (!res.ok) return null
    const ct = res.headers.get('content-type') || ''
    // A private sheet returns an HTML sign-in page (200 or 401); require CSV.
    if (!ct.includes('text/csv')) return null
    const text = await res.text()
    const rows = parseCsv(text)
    if (rows.length < 2) return null

    const header = rows[0].map((h) => h.trim())
    const col = (name: string) => header.indexOf(name)
    const iCat = col('Category')
    const iFirm = col('Firm')
    const iTier = col('Tier')
    const iStatus = col('Status')
    const iEmail = col('Email')
    const iCity = col('City')
    const iContact = col('Contact')
    const iWeb = col('Web')
    if (iCat < 0 || iFirm < 0) return null

    const at = (row: string[], i: number) => (i >= 0 && row[i] ? row[i].trim() : '')
    const valid = new Set<string>(CRM_CATEGORIES as readonly string[])
    const out = emptyData()

    for (let r = 1; r < rows.length; r++) {
      const row = rows[r]
      const cat = at(row, iCat)
      const firm = at(row, iFirm)
      if (!firm || !valid.has(cat)) continue
      const entry: CrmEntry = {
        firm,
        tier: at(row, iTier),
        status: at(row, iStatus),
        email: at(row, iEmail),
        city: at(row, iCity),
        contact: at(row, iContact),
        web: at(row, iWeb),
      }
      out[cat as CrmCategory].push(entry)
    }

    // If nothing parsed into any category, treat as unreadable.
    const total = CRM_CATEGORIES.reduce((n, c) => n + out[c].length, 0)
    return total > 0 ? out : null
  } catch {
    return null
  }
}
