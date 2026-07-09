'use client'

import { Fragment, useEffect, useMemo, useRef, type ReactNode } from 'react'

export interface TimelineItem {
  key: string
  /** Meeting date; null falls back to `fallbackLabel`. */
  date: Date | null
  /** Shown in place of the date when `date` is null (e.g. a recurring pattern). */
  fallbackLabel?: string
  /** Appended to the formatted date, e.g. ' *' to flag a projected date. */
  dateSuffix?: string
  dateTitle?: string
  /** Small secondary line under the date (meeting title). */
  title?: string | null
  /** Board name; omit (empty string) on a single-board page. */
  board?: string
  boardHref?: string
  /** Town name; omit on a single-town page. */
  town?: string
  past: boolean
  projected?: boolean
  /** Links / badges rendered at the bottom of the card. */
  links?: ReactNode
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

/**
 * Horizontal, scrollable meeting timeline: oldest on the left, upcoming on the
 * right, with a "Now" divider at the present. Shared by the municipal dashboard
 * (meetings across a town's boards) and the board page (one board's meetings).
 * The view auto-scrolls so the present sits near the left on load, with recent
 * history reachable by scrolling left and upcoming meetings filling the view.
 */
export default function MeetingTimeline({ items, emptyText }: { items: TimelineItem[]; emptyText?: string }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const boundaryRef = useRef<HTMLDivElement>(null)

  // Index of the first upcoming item — where the "Now" divider is inserted.
  const boundary = useMemo(() => items.findIndex((it) => !it.past), [items])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const div = boundaryRef.current
    // Land the present near the left edge (a little history visible before it);
    // if everything is in the past, show the most recent by scrolling fully right.
    el.scrollLeft = div ? Math.max(0, div.offsetLeft - 210) : el.scrollWidth
  }, [items.length, boundary])

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
      <div style={{ display: 'flex', minWidth: 'min-content', alignItems: 'stretch' }}>
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
              <div style={{ flex: '0 0 190px', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 8px' }}>
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
                    {it.date ? `${fmtDate(it.date)}${it.dateSuffix || ''}` : (it.fallbackLabel || 'TBD')}
                  </div>
                  {it.title && (
                    <div className="muted" style={{ fontSize: 12, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 174, marginLeft: 'auto', marginRight: 'auto' }}>
                      {it.title}
                    </div>
                  )}
                  {it.boardHref ? (
                    <div style={{ fontSize: 13, marginTop: 3 }}>
                      <a href={it.boardHref} style={{ color: 'var(--primary-light)' }}>{it.board}</a>
                    </div>
                  ) : it.board ? (
                    <div style={{ fontSize: 13, marginTop: 3 }}>{it.board}</div>
                  ) : null}
                  {it.town && <div className="muted" style={{ fontSize: 12 }}>{it.town}</div>}
                  {it.links && (
                    <div style={{ marginTop: 8, display: 'inline-flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
                      {it.links}
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
