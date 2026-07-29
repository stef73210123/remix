/**
 * Consulting hours — per-client daily hours for the admin Dashboard.
 *
 * remix-admin can't read Google Sheets directly (no service account), so the
 * time-tracker spreadsheets (one per client) are exposed by a small Google
 * Apps Script web app that returns raw rows as JSON. We fetch that here and
 * aggregate Duration → hours per calendar day. Set CONSULTING_HOURS_URL to the
 * web-app URL; until then the Dashboard shows zeros.
 *
 * Expected JSON shape from the web app:
 *   { "RARE": [{ "date": "...", "duration": "..." }, ...],
 *     "Premier": [{ "date": "...", "duration": "..." }, ...] }
 */
import { etDate } from './briefing'

/** Current clients, in display order. Extra keys returned by the feed are also shown. */
export const CONSULTING_CLIENTS = ['RARE', 'Premier']

export type ConsultingData = Record<string, Record<string, number>>

/** Parse a Duration cell ("1 hour", "3.0 hours", "0.5", "4") to a number of hours. */
export function parseHours(v: unknown): number {
  const m = String(v ?? '').match(/[\d.]+/)
  return m ? parseFloat(m[0]) : 0
}

/** Normalize a date cell to YYYY-MM-DD. Handles ISO, M/D/YY(YY), and Date-ish strings. */
export function normalizeDate(v: unknown): string | null {
  const s = String(v ?? '').trim()
  if (!s) return null
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m) return `${m[1]}-${m[2]}-${m[3]}`
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
  if (m) {
    const yr = m[3].length === 2 ? `20${m[3]}` : m[3]
    return `${yr}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`
  }
  const dt = new Date(s)
  return Number.isNaN(dt.getTime()) ? null : etDate(dt)
}

/** The last `n` business days (Mon–Fri) ending today (ET), oldest → newest. */
export function lastBusinessDays(n: number, endYmd = etDate()): string[] {
  const out: string[] = []
  let d = new Date(`${endYmd}T12:00:00Z`)
  while (out.length < n) {
    const wd = d.getUTCDay()
    if (wd !== 0 && wd !== 6) out.push(d.toISOString().slice(0, 10))
    d = new Date(d.getTime() - 86_400_000)
  }
  return out.reverse()
}

export async function getConsultingHours(): Promise<ConsultingData | null> {
  const url = process.env.CONSULTING_HOURS_URL
  if (!url) return null
  try {
    const res = await fetch(url, { next: { revalidate: 300 } })
    if (!res.ok) return null
    const raw = (await res.json()) as Record<string, Array<{ date: unknown; duration: unknown }>>
    const out: ConsultingData = {}
    for (const [client, rows] of Object.entries(raw)) {
      const map: Record<string, number> = {}
      for (const r of rows ?? []) {
        const d = normalizeDate(r.date)
        if (!d) continue
        map[d] = (map[d] ?? 0) + parseHours(r.duration)
      }
      out[client] = map
    }
    return out
  } catch {
    return null
  }
}
