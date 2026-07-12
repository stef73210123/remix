'use client'

import { useEffect, useRef, useState } from 'react'
import type { MeetingAnalysis } from '@/lib/municipal/analysis'
import { sentimentChipStyle, fmtSent, dispositionLabel } from '../sentiment'
import { syncScrollIntoView } from '../syncSelection'
import { fmtDateShort } from '@/lib/municipal/date'

function fmtDate(iso: string): string {
  const d = new Date(iso + (iso.length === 10 ? 'T12:00:00Z' : ''))
  if (isNaN(d.getTime())) return iso
  return fmtDateShort(d)
}

function Chip({ score }: { score: number }) {
  return <span style={sentimentChipStyle(score)} title={dispositionLabel(score)}>{fmtSent(score)}</span>
}

function ThemeTag({ t }: { t: string }) {
  return <span className="badge" style={{ fontSize: 11 }}>{t}</span>
}

/**
 * Expandable meeting-by-meeting analysis rows. Lives under the Meetings
 * timeline (replacing the plain meeting list where an analysis dataset exists),
 * so per-meeting narrative attaches to the same timeline as everywhere else.
 * `selectedKey`/`onSelect` mirror MeetingList's — keyed `${muni}_${body}_${date}`
 * so a click here (or on the paired MeetingTimeline) highlights and scrolls to
 * the same meeting in both.
 */
export default function MeetingAnalysisList({ meetings, muni, body, maxHeight = 480, selectedKey, onSelect }: {
  meetings: MeetingAnalysis[]
  muni: string
  body: string
  maxHeight?: number
  selectedKey?: string | null
  onSelect?: (key: string) => void
}) {
  const [openMeeting, setOpenMeeting] = useState<string | null>(null)
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  useEffect(() => {
    if (!selectedKey) return
    syncScrollIntoView(itemRefs.current.get(selectedKey))
  }, [selectedKey])

  if (meetings.length === 0) return null
  const sorted = [...meetings].sort((a, b) => b.date.localeCompare(a.date))
  return (
    <div className="card" style={{ padding: 0, maxHeight, overflowY: 'auto' }}>
      {sorted.map((mt, i) => {
        const key = `${muni}_${body}_${mt.date}`
        return (
          <MeetingRow
            key={mt.date}
            mt={mt}
            bordered={i > 0}
            open={openMeeting === mt.date}
            onToggle={() => setOpenMeeting(openMeeting === mt.date ? null : mt.date)}
            selected={key === selectedKey}
            onSelect={onSelect ? () => onSelect(key) : undefined}
            registerRef={(el) => {
              if (el) itemRefs.current.set(key, el)
              else itemRefs.current.delete(key)
            }}
          />
        )
      })}
    </div>
  )
}

/**
 * A single expandable meeting row — the date, board's item count and average
 * sentiment chip, a quick summary while collapsed, and the full case-by-case
 * breakdown when expanded. Exported so the dashboard's combined, multi-board
 * Meetings list (`MeetingList`) can render mixed rows (some analyzed, some
 * not) with this exact same content and formatting, tagging each with which
 * board it belongs to via `boardLabel`/`boardHref` (omitted on a single-board
 * page, where the board is already named in the page header above).
 */
export function MeetingRow({
  mt, bordered, open, onToggle, selected, onSelect, registerRef, boardLabel, boardHref,
}: {
  mt: MeetingAnalysis; bordered: boolean; open: boolean; onToggle: () => void
  selected: boolean; onSelect?: () => void; registerRef: (el: HTMLDivElement | null) => void
  boardLabel?: string; boardHref?: string
}) {
  const avg = mt.cases.length ? mt.cases.reduce((s, c) => s + (c.sentimentScore || 0), 0) / mt.cases.length : 0
  return (
    <div
      ref={registerRef}
      style={{
        borderTop: bordered ? '1px solid var(--border)' : 'none',
        background: selected ? 'color-mix(in srgb, var(--primary) 12%, transparent)' : undefined,
        boxShadow: selected ? 'inset 0 0 0 1.5px var(--primary)' : undefined,
      }}
    >
      <div
        onClick={() => { onToggle(); onSelect?.() }}
        style={{ padding: '16px 16px', cursor: 'pointer' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="muted" style={{ width: 10 }}>{open ? '▾' : '▸'}</span>
          <span style={{ fontWeight: 700, fontSize: 12.5 }}>{fmtDate(mt.date)}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginTop: 6, paddingLeft: 18 }}>
          {boardLabel && (
            boardHref ? (
              <a href={boardHref} style={{ fontSize: 13, fontWeight: 600, color: 'var(--primary-light)' }}>{boardLabel}</a>
            ) : (
              <span style={{ fontSize: 13, fontWeight: 600 }}>{boardLabel}</span>
            )
          )}
          <span className="muted" style={{ fontSize: 13 }}>{mt.cases.length} item{mt.cases.length === 1 ? '' : 's'}</span>
          <span style={{ flex: 1 }} />
          <Chip score={avg} />
        </div>
      </div>
      {/* Quick summary, visible even collapsed — a full copy appears above the
          case list when expanded, so this one only shows while closed. Sized
          to its own (short) content rather than a fixed clamp height. */}
      {!open && mt.meetingSummary && (
        <div
          className="muted"
          style={{
            fontSize: 12.5, lineHeight: 1.55, padding: '0 16px 14px 18px',
          }}
        >
          {mt.meetingSummary}
        </div>
      )}
      {open && (
        <div style={{ padding: '0 14px 14px', borderTop: '1px solid var(--border)' }}>
          <div style={{ fontSize: 13, margin: '12px 0 14px', lineHeight: 1.55 }}>{mt.meetingSummary}</div>
          {mt.cases.map((c, i) => (
            <div key={i} style={{ padding: '10px 0', borderTop: i ? '1px solid var(--border)' : 'none' }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 600, fontSize: 13 }}>{c.name}</span>
                {c.status && <span className="badge" style={{ fontSize: 11 }}>{c.status}</span>}
                <span style={{ ...sentimentChipStyle(c.sentimentScore) }}>{fmtSent(c.sentimentScore)}</span>
              </div>
              {c.summary && <div className="muted" style={{ fontSize: 12, margin: '6px 0' }}>{c.summary}</div>}
              {c.themes.length > 0 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '6px 0' }}>
                  {c.themes.map((t) => <ThemeTag key={t} t={t} />)}
                </div>
              )}
              {c.memberPositions.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 }}>
                  {c.memberPositions.map((p, j) => (
                    <div key={j} style={{ display: 'flex', gap: 8, alignItems: 'baseline', fontSize: 12 }}>
                      <span style={{ fontWeight: 600, width: 108, flexShrink: 0 }}>{p.member}</span>
                      <span style={{ ...sentimentChipStyle(p.score), flexShrink: 0 }}>{fmtSent(p.score)}</span>
                      <span className="muted" style={{ flex: 1 }}>
                        {p.stance}{p.evidence ? ` — ${p.evidence}` : ''}
                        {p.confidence === 'low' ? ' (low confidence)' : ''}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          {mt.attributionNote && (
            <div className="muted" style={{ fontSize: 11, marginTop: 12, fontStyle: 'italic' }}>{mt.attributionNote}</div>
          )}
        </div>
      )}
    </div>
  )
}
