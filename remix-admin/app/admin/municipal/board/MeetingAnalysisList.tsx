'use client'

import { useEffect, useRef, useState } from 'react'
import type { MeetingAnalysis } from '@/lib/municipal/analysis'
import { sentimentChipStyle, fmtSent, dispositionLabel } from '../sentiment'
import { syncScrollIntoView } from '../syncSelection'

function fmtDate(iso: string): string {
  const d = new Date(iso + (iso.length === 10 ? 'T12:00:00Z' : ''))
  if (isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
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
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight, overflowY: 'auto', paddingRight: 4 }}>
      {[...meetings].sort((a, b) => b.date.localeCompare(a.date)).map((mt) => {
        const key = `${muni}_${body}_${mt.date}`
        return (
          <MeetingRow
            key={mt.date}
            mt={mt}
            muni={muni}
            body={body}
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

function MeetingRow({
  mt, muni, body, open, onToggle, selected, onSelect, registerRef,
}: {
  mt: MeetingAnalysis; muni: string; body: string; open: boolean; onToggle: () => void
  selected: boolean; onSelect?: () => void; registerRef: (el: HTMLDivElement | null) => void
}) {
  const avg = mt.cases.length ? mt.cases.reduce((s, c) => s + (c.sentimentScore || 0), 0) / mt.cases.length : 0
  const transcriptHref = `/admin/api/municipal/transcript?muni=${muni}&body=${body}&date=${mt.date}`
  return (
    <div
      ref={registerRef}
      className="card"
      style={{
        padding: 0, flexShrink: 0, borderRadius: 10,
        background: selected ? 'color-mix(in srgb, var(--primary) 12%, transparent)' : undefined,
        boxShadow: selected ? 'inset 0 0 0 1.5px var(--primary)' : undefined,
      }}
    >
      <div
        onClick={() => { onToggle(); onSelect?.() }}
        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 16px', cursor: 'pointer', flexWrap: 'wrap' }}
      >
        <span className="muted" style={{ width: 10 }}>{open ? '▾' : '▸'}</span>
        <span style={{ fontWeight: 700, minWidth: 130 }}>{fmtDate(mt.date)}</span>
        <span className="muted" style={{ fontSize: 13 }}>{mt.cases.length} item{mt.cases.length === 1 ? '' : 's'}</span>
        <span style={{ flex: 1 }} />
        <Chip score={avg} />
        <a
          href={transcriptHref}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="badge state"
          style={{ textDecoration: 'none' }}
        >
          Transcript ↗
        </a>
      </div>
      {/* Quick summary, visible even collapsed — a full copy appears above the
          case list when expanded, so this one only shows while closed. Kept to
          one line so it doesn't crowd the header row above it. */}
      {!open && mt.meetingSummary && (
        <div
          className="muted"
          style={{
            fontSize: 12.5, lineHeight: 1.55, padding: '12px 16px 14px 38px',
            marginTop: 2, borderTop: '1px solid var(--border)',
            maxHeight: '4.7em', overflow: 'hidden',
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
