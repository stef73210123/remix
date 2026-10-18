/**
 * Collapsing the same meeting when the source portal lists it more than once.
 *
 * CivicClerk exposes a single evening under two event records: a low-numbered
 * one titled "… Regular Meeting Agenda (PDF)" that carries the documents, and
 * a higher-numbered one titled plainly "Town Board Meeting" that often carries
 * none. Both are ingested, so the timeline grew two cards for one meeting —
 * one with an Agenda badge and one bare. North Castle has 34 such dates.
 *
 * Two things this must NOT do:
 *
 *  1. Hide a work session. Several North Castle dates hold a work session AND
 *     the regular meeting that evening — genuinely two meetings. Rows are
 *     therefore grouped by session kind as well as time, and a non-regular
 *     session keeps its own card and is labelled, so two cards on one date
 *     read as what they are rather than as a duplicate.
 *
 *  2. Swallow a town whose dates are wrong. Rockland's minutes are ingested
 *     with no real time (every row sits at midnight) and the true date only
 *     in the filename, so ten separate meetings can share one date. Merging
 *     on date alone would destroy nine of them. Rows are merged only when we
 *     actually know the time of day and it matches exactly — midnight means
 *     "date unknown", and such rows are always left alone. That is a date-
 *     parsing bug in that town's adapter, and not something to paper over here.
 */

export type SessionKind = 'regular' | 'work_session' | 'special' | 'organizational' | 'public_hearing'

/** Classify a meeting from its title. Anything unrecognised is a regular meeting. */
export function sessionKind(title: string | null | undefined): SessionKind {
  const t = (title || '').toLowerCase()
  if (t.includes('work session')) return 'work_session'
  if (t.includes('special')) return 'special'
  if (t.includes('organizational') || t.includes('reorg')) return 'organizational'
  if (t.includes('public hearing')) return 'public_hearing'
  return 'regular'
}

/** Badge text for a session that is not the board's ordinary meeting. */
export function sessionLabel(kind: SessionKind): string | null {
  switch (kind) {
    case 'work_session': return 'Work session'
    case 'special': return 'Special meeting'
    case 'organizational': return 'Organizational meeting'
    case 'public_hearing': return 'Public hearing'
    default: return null
  }
}

interface AssetLike { kind: string; pageCount?: number | null }
interface MeetingLike {
  scheduled_at: string
  title?: string | null
  assets?: AssetLike[] | null
  muni_key?: string
  body_key?: string
}

/** A row whose time of day is midnight carries no real time — see note above. */
function hasRealTime(scheduledAt: string): boolean {
  return scheduledAt.slice(11, 19) !== '00:00:00'
}

/**
 * Collapse portal duplicates, merging their documents onto the survivor so the
 * remaining card keeps the agenda AND the minutes even when they arrived on
 * different records. Input order is preserved. Every returned row carries the
 * session kind so the UI can label anything that is not an ordinary meeting.
 */
export function dedupeMeetings<T extends MeetingLike>(rows: T[]): (T & { sessionKind: SessionKind })[] {
  const out: (T & { sessionKind: SessionKind })[] = []
  const groups = new Map<string, number>()   // group key -> index in `out`

  for (const row of rows) {
    const kind = sessionKind(row.title)
    const ts = row.scheduled_at.slice(0, 19)
    const tagged = { ...row, sessionKind: kind }

    if (!hasRealTime(ts)) { out.push(tagged); continue }

    const key = `${row.muni_key ?? ''}|${row.body_key ?? ''}|${ts}|${kind}`
    const at = groups.get(key)
    if (at === undefined) {
      groups.set(key, out.length)
      out.push(tagged)
      continue
    }

    // Merge into the row already kept: one document per kind, richest wins,
    // and the better-documented title becomes the survivor's.
    const keptRow = out[at]
    const byKind = new Map<string, AssetLike>()
    for (const a of [...(keptRow.assets || []), ...(row.assets || [])]) {
      const cur = byKind.get(a.kind)
      if (!cur || (a.pageCount ?? 0) > (cur.pageCount ?? 0)) byKind.set(a.kind, a)
    }
    const mergedAssets = [...byKind.values()]
    const keptCount = (keptRow.assets || []).length
    const rowCount = (row.assets || []).length
    out[at] = {
      ...(rowCount > keptCount ? tagged : keptRow),
      assets: mergedAssets,
    } as T & { sessionKind: SessionKind }
  }

  return out
}
