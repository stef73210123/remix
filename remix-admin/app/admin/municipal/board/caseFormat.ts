import { fmtDateShort } from '@/lib/municipal/date'

/**
 * A meeting date for display. The analysis writes bare `YYYY-MM-DD`, which
 * `new Date()` reads as midnight UTC and a western timezone then renders as the
 * day before — so a date-only string is anchored at midday before formatting.
 * Shared by the case list and the case profile so both say the same day.
 */
export function fmtDate(iso: string): string {
  const d = new Date(iso + (iso.length === 10 ? 'T12:00:00Z' : ''))
  return isNaN(d.getTime()) ? iso : fmtDateShort(d)
}
