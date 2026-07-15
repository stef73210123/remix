'use client'

import { Fragment, useEffect, useMemo, useRef, type ReactNode } from 'react'
import { syncScrollIntoView } from './syncSelection'
import type { MeetingAnalysis } from '@/lib/municipal/analysis'
import { fmtDateShort } from '@/lib/municipal/date'
import { isOpen } from '@/lib/flavor'

export interface TimelineItem {
  key: string
  /** Meeting date; null falls back to `fallbackLabel`. */
  date: Date | null
  /** Shown in place of the date when `date` is null (e.g. a recurring pattern). */
  fallbackLabel?: string
  /** Appended to the formatted date, e.g. ' *' to flag a projected date. */
  dateSuffix?: string
  dateTitle?: string
  /** One-line agenda summary, shown (truncated) where available. */
  summary?: string | null
  /** Secondary line shown under the board/date on both the compact timeline
   *  card and the list row — e.g. a permit's street address. Always visible
   *  (unlike `summary`/`detail`, which are list-only and expand-only). */
  subtitle?: string
  /** Extra supporting detail revealed when the row is expanded (tap) in
   *  MeetingList — e.g. a permit's owner, contractor, valuation, and key
   *  dates pulled from the full report. Independent of `analysis`, which
   *  drives the richer case-by-case expand for analyzed board meetings. */
  detail?: ReactNode
  /** Board name; omit (empty string) on a single-board page. */
  board?: string
  boardHref?: string
  /** Town name; omit on a single-town page. Rendered on the paywalled Remix
   *  build only (it can list several towns' boards together); OpenNorthCastle
   *  is single-jurisdiction so a repeated town name is pure clutter there. */
  town?: string
  past: boolean
  projected?: boolean
  /** Links / badges rendered at the bottom of the card. */
  links?: ReactNode
  /** Transcript badge — shown on the timeline card but omitted from the
   *  MeetingList row to keep the list dense. */
  transcriptLink?: ReactNode
  /** Full case-level analysis for this meeting, when its board has a
   *  transcript-analysis dataset. When present, MeetingList renders the same
   *  expandable row (sentiment chip, item count, case detail) a board's own
   *  tab shows, instead of the plain summary row. */
  analysis?: MeetingAnalysis
}

/**
 * Horizontal, scrollable meeting timeline: oldest on the left, upcoming on the
 * right, with a "Now" divider at the present. Shared by the municipal dashboard
 * (meetings across a town's boards) and the board page (one board's meetings).
 * The view auto-scrolls so the present sits near the left on load, with recent
 * history reachable by scrolling left and upcoming meetings filling the view.
 */
export default function MeetingTimeline({
  items,
  emptyText,
  selectedKey,
  onSelect,
}: {
  items: TimelineItem[]
  emptyText?: string
  /** Key of the item highlighted/synced from a paired MeetingList, if any. */
  selectedKey?: string | null
  onSelect?: (key: string) => void
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const boundaryRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  // Index of the first upcoming item — where the "Now" divider is inserted.
  const boundary = useMemo(() => items.findIndex((it) => !it.past), [items])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    // Land the next upcoming meeting at the right edge of the viewport — the
    // one thing a reader actually needs — with as much history as fits
    // filling the rest of the view to its left, reachable without scrolling.
    // Further-out projected meetings (a board's full remaining-year schedule)
    // sit past the right edge, reachable by scrolling right. If everything is
    // in the past, show the most recent by scrolling fully right instead.
    const next = boundary >= 0 ? itemRefs.current.get(items[boundary].key) : undefined
    el.scrollLeft = next ? Math.max(0, next.offsetLeft + next.offsetWidth - el.clientWidth) : el.scrollWidth
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length, boundary])

  // Scroll a selection made elsewhere (e.g. the paired MeetingList) into view here.
  useEffect(() => {
    if (!selectedKey) return
    syncScrollIntoView(itemRefs.current.get(selectedKey))
  }, [selectedKey])

  if (items.length === 0) {
    return (
      <div className="card" style={{ marginBottom: 8 }}>
        <div className="muted" style={{ padding: 20, fontSize: 13 }}>{emptyText || 'No meetings.'}</div>
      </div>
    )
  }

  return (
    <div
      ref={scrollRef}
      className="card"
      style={{ padding: '22px 8px 18px', marginBottom: 8, overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}
    >
      {/* flex-start (not stretch): a past card with several wrapped document
          badges shouldn't force every other card in the row taller than its
          own content needs — the "Now" divider still spans the full row
          height via its own explicit alignSelf: 'stretch' below. */}
      <div style={{ display: 'flex', minWidth: 'min-content', alignItems: 'flex-start' }}>
        {items.map((it, i) => {
          const dotColor = it.past ? 'var(--muted)' : it.projected ? 'var(--c)' : 'var(--primary)'
          return (
            <Fragment key={it.key}>
              {i === boundary && (
                <div
                  ref={boundaryRef}
                  aria-hidden
                  style={{ flex: '0 0 auto', width: 0, alignSelf: 'stretch', borderLeft: '1px dashed var(--primary)', margin: '0 13px', position: 'relative' }}
                >
                  <span
                    style={{
                      position: 'absolute', top: -3, left: 0, transform: 'translateX(-50%)',
                      fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                      color: 'var(--primary-light)', background: 'var(--panel)', padding: '0 4px', whiteSpace: 'nowrap',
                    }}
                  >
                    Now
                  </span>
                </div>
              )}
              <div
                ref={(el) => {
                  if (el) itemRefs.current.set(it.key, el)
                  else itemRefs.current.delete(it.key)
                }}
                onClick={onSelect ? () => onSelect(it.key) : undefined}
                style={{
                  flex: '0 0 190px', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '6px 8px',
                  borderRadius: 8, cursor: onSelect ? 'pointer' : undefined,
                  background: it.key === selectedKey ? 'color-mix(in srgb, var(--primary) 12%, transparent)' : undefined,
                  boxShadow: it.key === selectedKey ? 'inset 0 0 0 1.5px var(--primary)' : undefined,
                }}
              >
                {/* rail + dot */}
                <div style={{ position: 'relative', width: '100%', height: 16, marginBottom: 12 }}>
                  <div style={{ position: 'absolute', top: 7, left: 0, right: 0, height: 2, background: 'var(--border)' }} />
                  {i === 0 && <div style={{ position: 'absolute', top: 7, left: 0, width: '50%', height: 2, background: 'var(--panel)' }} />}
                  {i === items.length - 1 && <div style={{ position: 'absolute', top: 7, right: 0, width: '50%', height: 2, background: 'var(--panel)' }} />}
                  <div style={{ position: 'absolute', top: 1, left: '50%', transform: 'translateX(-50%)', width: 13, height: 13, borderRadius: 999, background: dotColor, border: '2px solid var(--panel)' }} />
                </div>
                {/* content */}
                <div style={{ textAlign: 'center', width: '100%' }}>
                  <div style={{ fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap', opacity: it.past ? 0.85 : 1 }} title={it.dateTitle}>
                    {it.date ? `${fmtDateShort(it.date)}${it.dateSuffix || ''}` : (it.fallbackLabel || 'TBD')}
                  </div>
                  {it.boardHref ? (
                    <div style={{ fontSize: 13, marginTop: 3 }}>
                      <a href={it.boardHref} style={{ color: 'var(--primary-light)' }}>{it.board}</a>
                    </div>
                  ) : it.board ? (
                    <div style={{ fontSize: 13, marginTop: 3 }}>{it.board}</div>
                  ) : null}
                  {/* Town name only carries information on the paywalled Remix
                      build (several towns' boards can appear together there),
                      and only for a real past meeting — an upcoming/projected
                      row already names its board right above. OpenNorthCastle
                      is single-jurisdiction, so it never repeats the town. */}
                  {!isOpen && it.past && it.town && <div className="muted" style={{ fontSize: 12 }}>{it.town}</div>}
                  {it.subtitle && (
                    <div
                      className="muted"
                      title={it.subtitle}
                      style={{
                        fontSize: 12, marginTop: 3, lineHeight: 1.35,
                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                      }}
                    >
                      {it.subtitle}
                    </div>
                  )}
                  {(it.links || it.transcriptLink) && (
                    <div style={{ marginTop: 8, display: 'inline-flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
                      {it.links}
                      {it.transcriptLink}
                    </div>
                  )}
                </div>
              </div>
            </Fragment>
          )
        })}
      </div>
    </div>
  )
}
