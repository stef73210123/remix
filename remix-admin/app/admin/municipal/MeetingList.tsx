'use client'

import { type TimelineItem } from './MeetingTimeline'

function fmtDate(d: Date): string {
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

/**
 * Compact, fixed-height meetings list shown beneath the horizontal timeline:
 * newest first, a few visible with the rest scrolling in place, each row keeping
 * its agenda/doc/transcript link badges. Reuses the timeline's `TimelineItem`
 * shape so no extra data plumbing is needed. `board`/`town` are omitted
 * gracefully on single-board pages.
 */
export default function MeetingList({
  items,
  maxHeight = 300,
  emptyText,
}: {
  items: TimelineItem[]
  maxHeight?: number
  emptyText?: string
}) {
  // Newest first; items without a date (e.g. a projected/pattern-only row) sort last.
  const rows = [...items].sort((a, b) => {
    if (a.date && b.date) return b.date.getTime() - a.date.getTime()
    if (a.date) return -1
    if (b.date) return 1
    return 0
  })

  if (rows.length === 0) {
    return (
      <div className="card" style={{ marginBottom: 8 }}>
        <div className="muted" style={{ padding: 16, fontSize: 13 }}>{emptyText || 'No meetings.'}</div>
      </div>
    )
  }

  return (
    <div className="card" style={{ padding: 0, marginBottom: 8, maxHeight, overflowY: 'auto' }}>
      {rows.map((it, i) => (
        <div
          key={it.key}
          style={{
            display: 'flex', alignItems: 'baseline', gap: 12, padding: '10px 14px', flexWrap: 'wrap',
            borderTop: i ? '1px solid var(--border)' : 'none',
            opacity: it.past ? 0.92 : 1,
          }}
        >
          <span style={{ fontWeight: 700, fontSize: 13, minWidth: 108, whiteSpace: 'nowrap' }} title={it.dateTitle}>
            {it.date ? `${fmtDate(it.date)}${it.dateSuffix || ''}` : (it.fallbackLabel || 'TBD')}
          </span>
          <div style={{ flex: 1, minWidth: 140 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' }}>
              {it.boardHref ? (
                <a href={it.boardHref} style={{ fontSize: 13, fontWeight: 600, color: 'var(--primary-light)' }}>{it.board}</a>
              ) : it.board ? (
                <span style={{ fontSize: 13, fontWeight: 600 }}>{it.board}</span>
              ) : null}
              {!it.past && (
                <span className="badge" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--primary-light)' }}>
                  Upcoming
                </span>
              )}
              {it.town && <span className="muted" style={{ fontSize: 12 }}>{it.town}</span>}
            </div>
            {it.title && (
              <div className="muted" style={{ fontSize: 12, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.title}</div>
            )}
          </div>
          {it.links && (
            <div style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 6, justifyContent: 'flex-end' }}>
              {it.links}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
