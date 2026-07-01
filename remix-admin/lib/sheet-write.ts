/**
 * Append rows to the Job-Search CRM Google Sheet from the cloud.
 *
 * Writes go through a Google Apps Script web app bound to the sheet (see
 * apps-script/JobCrmWriter.gs). This runs *as the sheet owner*, so it needs no
 * Google Cloud service account, and the same script can later create Gmail
 * drafts as the owner. The endpoint is authenticated with a shared secret.
 *
 * Required env vars (set in the remix-admin Vercel project):
 *   SHEET_WRITE_URL     - the Apps Script web-app deployment URL (/exec)
 *   SHEET_WRITE_SECRET  - shared secret, must match the script's SECRET
 */
import type { CrmCategory } from './crm'

export interface JobCrmRow {
  category: CrmCategory
  firm: string
  tier?: string
  status?: string
  email?: string
  city?: string
  contact?: string
  web?: string
}

export interface AppendResult {
  ok: boolean
  appended: number
  error?: string
}

export async function appendRowsToSheet(rows: JobCrmRow[]): Promise<AppendResult> {
  if (rows.length === 0) return { ok: true, appended: 0 }

  const url = process.env.SHEET_WRITE_URL
  const secret = process.env.SHEET_WRITE_SECRET
  if (!url || !secret) {
    return { ok: false, appended: 0, error: 'SHEET_WRITE_URL / SHEET_WRITE_SECRET not set' }
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        secret,
        rows: rows.map((r) => ({
          category: r.category,
          firm: r.firm,
          tier: r.tier ?? '',
          status: r.status ?? 'Backlog',
          email: r.email ?? '',
          city: r.city ?? '',
          contact: r.contact ?? '',
          web: r.web ?? '',
        })),
      }),
      // Apps Script /exec redirects to a googleusercontent URL; follow it.
      redirect: 'follow',
    })
    const text = await res.text()
    let data: { appended?: number; error?: string } = {}
    try {
      data = JSON.parse(text)
    } catch {
      return { ok: false, appended: 0, error: `Non-JSON response: ${text.slice(0, 200)}` }
    }
    if (!res.ok || data.error) {
      return { ok: false, appended: 0, error: data.error || `HTTP ${res.status}` }
    }
    return { ok: true, appended: data.appended ?? rows.length }
  } catch (e) {
    return { ok: false, appended: 0, error: e instanceof Error ? e.message : String(e) }
  }
}
