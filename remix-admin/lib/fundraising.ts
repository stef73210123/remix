import { parseCsv } from './csv'

/**
 * Live fundraising directory — reads the public Circular fundraising Google
 * Sheet (CSV export) on each request, so the admin stays in sync with the sheet.
 */
const SHEET_CSV =
  'https://docs.google.com/spreadsheets/d/10iQ6S5zKOT7HQ0RLd_-cR4LZ_mhde9ZWr7XCTub-rVE/export?format=csv'

export interface FundraisingContact {
  name: string
  firstName: string
  priority: string
  engagement: string
  status: string
  type: string
  affiliation: string
  source: string
  amount: string
  email: string
  linkedin: string
}

export async function getFundraising(): Promise<FundraisingContact[]> {
  try {
    const res = await fetch(SHEET_CSV, { cache: 'no-store' })
    if (!res.ok) return []
    const text = await res.text()
    const rows = parseCsv(text)
    if (rows.length < 2) return []

    const header = rows[0].map((h) => h.trim())
    const col = (name: string) => header.indexOf(name)
    const iName = col('Full Name')
    const iFirst = col('First Name')
    const iPriority = col('Priority')
    const iEngagement = col('Engagement')
    const iStatus = col('Status')
    const iType = col('Type')
    const iAff = col('Affiliation')
    const iSource = col('Source')
    const iAmount = col('Investment Amount')
    const iEmail = col('Email')
    const iLinkedin = col('LinkedIn')

    const at = (row: string[], i: number) => (i >= 0 && row[i] ? row[i].trim() : '')

    const out: FundraisingContact[] = []
    for (let r = 1; r < rows.length; r++) {
      const row = rows[r]
      const name = at(row, iName)
      if (!name) continue
      out.push({
        name,
        firstName: at(row, iFirst),
        priority: at(row, iPriority),
        engagement: at(row, iEngagement),
        status: at(row, iStatus),
        type: at(row, iType),
        affiliation: at(row, iAff),
        source: at(row, iSource),
        amount: at(row, iAmount),
        email: at(row, iEmail),
        linkedin: at(row, iLinkedin),
      })
    }
    return out
  } catch {
    return []
  }
}
