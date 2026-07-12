'use client'

import { useEffect, useRef } from 'react'
import { type TimelineItem } from './MeetingTimeline'
import { syncScrollIntoView } from './syncSelection'

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
  selectedKey,
  onSelect,
  compact = false,
}: {
  items: TimelineItem[]
  maxHeight?: number
  emptyText?: string
  /** Key of the item highlighted/synced from a paired MeetingTimeline, if any. */
  selectedKey?: string | null
  onSelect?: (key: string) => void
  /** Drop the Upcoming badge, town line, and title line — just date, board
   *  link, and summary. For lists (e.g. the dashboard's combined feed) where
   *  the title/town otherwise just restate the board name on every row. */
  compact?: boolean
}) {
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  // Newest first; items without a date (e.g. a projected/pattern-only row) sort last.
  const rows = [...items].sort((a, b) => {
    if (a.date && b.date) return b.date.getTime() - a.date.getTime()
    if (a.date) return -1
    if (b.date) return 1
    return 0
  })

  // Scroll a selection made elsewhere (e.g. the paired MeetingTimeline) into view here.
  useEffect(() => {
    if (!selectedKey) return
    syncScrollIntoView(itemRefs.current.get(selectedKey))
  }, [selectedKey])

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
          ref={(el) => {
            if (el) itemRefs.current.set(it.key, el)
            else itemRefs.current.delete(it.key)
          }}
          onClick={onSelect ? () => onSelect(it.key) : undefined}
          style={{
            display: 'flex', alignItems: 'baseline', gap: 12, padding: '16px 16px', flexWrap: 'wrap',
            borderTop: i ? '1px solid var(--border)' : 'none',
            opacity: it.past ? 0.92 : 1,
            cursor: onSelect ? 'pointer' : undefined,
            background: it.key === selectedKey ? 'color-mix(in srgb, var(--primary) 12%, transparent)' : undefined,
            boxShadow: it.key === selectedKey ? 'inset 0 0 0 1.5px var(--primary)' : undefined,
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
              {!compact && !it.past && (
                <span className="badge" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--primary-light)' }}>
                  Upcoming
                </span>
              )}
              {!compact && it.town && <span className="muted" style={{ fontSize: 12 }}>{it.town}</span>}
            </div>
            {!compact && it.title && (
              <div className="muted" style={{ fontSize: 12, marginTop: 5, overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.title}</div>
            )}
            {it.summary && (
              <div
                className="muted"
                style={{ fontSize: 12.5, marginTop: 6, lineHeight: 1.55, maxHeight: '3.1em', overflow: 'hidden' }}
              >
                {it.summary}
              </div>
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
