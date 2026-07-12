'use client'

import { useEffect, useRef, useState } from 'react'
import { type TimelineItem } from './MeetingTimeline'
import { syncScrollIntoView } from './syncSelection'
import { MeetingRow } from './board/MeetingAnalysisList'
import { fmtDateShort } from '@/lib/municipal/date'

/**
 * Fixed-height meetings list shown beneath the horizontal timeline: newest
 * first, a few visible with the rest scrolling in place. Reuses the
 * timeline's `TimelineItem` shape so no extra data plumbing is needed.
 * `board`/`town` are omitted gracefully on single-board pages. Shared as-is
 * by the municipal dashboard and the board pages, so both show the same
 * content and formatting.
 *
 * A row whose meeting carries `analysis` data (its board has a transcript-
 * analysis dataset) renders via the same expandable `MeetingRow` a board's
 * own tab uses — sentiment chip, item count, click-to-expand case detail —
 * tagged with its board name/link since this list can mix meetings from
 * several boards (e.g. the dashboard's combined feed). Rows without analysis
 * fall back to a plain summary row.
 */
export default function MeetingList({
  items,
  maxHeight = 300,
  emptyText,
  selectedKey,
  onSelect,
}: {
  items: TimelineItem[]
  maxHeight?: number
  emptyText?: string
  /** Key of the item highlighted/synced from a paired MeetingTimeline, if any. */
  selectedKey?: string | null
  onSelect?: (key: string) => void
}) {
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const [openMeeting, setOpenMeeting] = useState<string | null>(null)

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
      {rows.map((it, i) => {
        const registerRef = (el: HTMLDivElement | null) => {
          if (el) itemRefs.current.set(it.key, el)
          else itemRefs.current.delete(it.key)
        }

        if (it.analysis) {
          return (
            <MeetingRow
              key={it.key}
              mt={it.analysis}
              bordered={i > 0}
              open={openMeeting === it.key}
              onToggle={() => setOpenMeeting(openMeeting === it.key ? null : it.key)}
              selected={it.key === selectedKey}
              onSelect={onSelect ? () => onSelect(it.key) : undefined}
              registerRef={registerRef}
              boardLabel={it.board}
              boardHref={it.boardHref}
            />
          )
        }

        return (
          <div
            key={it.key}
            ref={registerRef}
            onClick={onSelect ? () => onSelect(it.key) : undefined}
            style={{
              padding: '12px 16px',
              borderTop: i ? '1px solid var(--border)' : 'none',
              opacity: it.past ? 0.92 : 1,
              cursor: onSelect ? 'pointer' : undefined,
              background: it.key === selectedKey ? 'color-mix(in srgb, var(--primary) 12%, transparent)' : undefined,
              boxShadow: it.key === selectedKey ? 'inset 0 0 0 1.5px var(--primary)' : undefined,
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 12.5 }} title={it.dateTitle}>
              {it.date ? `${fmtDateShort(it.date)}${it.dateSuffix || ''}` : (it.fallbackLabel || 'TBD')}
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap', marginTop: 4 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap', flex: 1, minWidth: 140 }}>
                {it.boardHref ? (
                  <a href={it.boardHref} style={{ fontSize: 13, fontWeight: 600, color: 'var(--primary-light)' }}>{it.board}</a>
                ) : it.board ? (
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{it.board}</span>
                ) : null}
                {/* Town and the meeting title (usually just "<Board> Meeting")
                    are redundant with the board link right above for an
                    upcoming/projected row, so only show them for past,
                    already-ingested meetings where they carry real info. */}
                {it.past && it.town && <span className="muted" style={{ fontSize: 12 }}>{it.town}</span>}
              </div>
              {it.links && (
                <div style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 6, justifyContent: 'flex-end' }}>
                  {it.links}
                </div>
              )}
            </div>
            {it.past && it.title && (
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
        )
      })}
    </div>
  )
}
