/**
 * Recurring-pattern → calendar-date projection ("2nd & 4th Wednesday 7:30pm"
 * → actual dates). Shared by the dashboard's combined Meetings timeline and
 * each board's own page — both need the same "what does a board's meeting
 * pattern actually land on" math, and having two copies drift is how the
 * board-page timeline lost the dashboard's gap-filling behavior (a later
 * real meeting whose agenda happened to post early — e.g. November — hid
 * the fact that nothing was projected for the months before it).
 */
const WEEKDAYS: Record<string, number> = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6,
}
const ORDINALS: Record<string, number> = {
  '1st': 1, '2nd': 2, '3rd': 3, '4th': 4, '5th': 5, last: -1,
}

function nthWeekday(year: number, month: number, weekday: number, n: number): Date | null {
  if (n === -1) {
    const last = new Date(year, month + 1, 0)
    const diff = (last.getDay() - weekday + 7) % 7
    return new Date(year, month, last.getDate() - diff)
  }
  const first = new Date(year, month, 1)
  const offset = (weekday - first.getDay() + 7) % 7
  const d = new Date(year, month, 1 + offset + (n - 1) * 7)
  return d.getMonth() === month ? d : null
}

function parsePattern(pattern: string): { weekday: number; ords: number[] } | null {
  const p = pattern.toLowerCase()
  const weekdayName = Object.keys(WEEKDAYS).find((w) => p.includes(w))
  if (!weekdayName) return null
  const ords: number[] = []
  for (const [k, v] of Object.entries(ORDINALS)) {
    if (new RegExp(`(^|[^a-z0-9])${k}([^a-z0-9]|$)`).test(p)) ords.push(v)
  }
  if (ords.length === 0) return null
  return { weekday: WEEKDAYS[weekdayName], ords: Array.from(new Set(ords)) }
}

/** The single soonest date the pattern lands on at/after `from`. Returns null
 *  for vague patterns ("Monthly", "Quarterly to monthly") that don't name a
 *  weekday, or when nothing lands within the lookahead window. */
export function nextMeetingDate(pattern: string | null, from: Date): Date | null {
  if (!pattern) return null
  const parsed = parsePattern(pattern)
  if (!parsed) return null
  const base = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  let best: Date | null = null
  for (let mo = 0; mo <= 3; mo++) {
    const total = base.getMonth() + mo
    const y = base.getFullYear() + Math.floor(total / 12)
    const m = ((total % 12) + 12) % 12
    for (const n of parsed.ords) {
      const d = nthWeekday(y, m, parsed.weekday, n)
      if (d && d.getTime() >= base.getTime() && (!best || d < best)) best = d
    }
  }
  return best
}

/** Every date the recurring pattern lands on between `from` and `through`
 *  (inclusive), not just the single soonest one — used to fill in a board's
 *  full remaining schedule instead of leaving a gap between "today" and
 *  whatever real meeting happens to already have data, however far out. */
export function remainingYearMeetingDates(pattern: string | null, from: Date, through: Date): Date[] {
  if (!pattern) return []
  const parsed = parsePattern(pattern)
  if (!parsed) return []
  const base = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  const dates: Date[] = []
  let y = base.getFullYear(), m = base.getMonth()
  while (new Date(y, m, 1).getTime() <= through.getTime()) {
    for (const n of parsed.ords) {
      const d = nthWeekday(y, m, parsed.weekday, n)
      if (d && d.getTime() >= base.getTime() && d.getTime() <= through.getTime()) dates.push(d)
    }
    m += 1
    if (m > 11) { m = 0; y += 1 }
  }
  return dates.sort((a, b) => a.getTime() - b.getTime())
}

export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
