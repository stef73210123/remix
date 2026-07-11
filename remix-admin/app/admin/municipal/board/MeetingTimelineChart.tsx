'use client'

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import type { AnalysisDataset } from '@/lib/municipal/analysis'
import { sentimentColor, fmtSent } from '../sentiment'

interface Seg { key: string; label: string; count: number; sentiment: number }
interface Col { date: string; segments: Seg[]; total: number }

function mean(a: number[]): number { return a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0 }
function fmtDate(iso: string): string {
  const d = new Date(iso + 'T12:00:00Z')
  if (isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}
function monthLabel(iso: string): string {
  const d = new Date(iso + 'T12:00:00Z')
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }).replace(' ', " '")
}

const COL_W = 26
const GAP = 4
const PLOT_H = 200

export default function MeetingTimelineChart({ data }: { data: AnalysisDataset }) {
  const [mode, setMode] = useState<'member' | 'issue'>('member')
  const [hover, setHover] = useState<{ col: Col; seg: Seg } | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const meetings = useMemo(() => [...data.meetings].sort((a, b) => a.date.localeCompare(b.date)), [data])
  const roster = data.meta.roster

  const cols = useMemo<Col[]>(() => meetings.map((mt) => {
    if (mode === 'member') {
      const per = new Map<string, { s: number[]; c: number }>()
      for (const c of mt.cases) for (const p of c.memberPositions || []) {
        const e = per.get(p.member) ?? { s: [], c: 0 }
        e.s.push(p.score); e.c++; per.set(p.member, e)
      }
      // Stack in a fixed roster order so a given member is always the same band.
      const segments: Seg[] = roster.filter((m) => per.has(m)).map((m) => {
        const e = per.get(m)!
        return { key: m, label: m, count: e.c, sentiment: mean(e.s) }
      })
      return { date: mt.date, segments, total: segments.reduce((s, x) => s + x.count, 0) }
    }
    const segments: Seg[] = (mt.cases || [])
      .map((c) => ({ key: c.id || c.name, label: c.name, count: (c.memberPositions || []).length, sentiment: c.sentimentScore }))
      .filter((s) => s.count > 0)
      .sort((a, b) => b.sentiment - a.sentiment)
    return { date: mt.date, segments, total: segments.reduce((s, x) => s + x.count, 0) }
  }), [meetings, mode, roster])

  const maxTotal = Math.max(1, ...cols.map((c) => c.total))

  // Default the scroll position to the far right (most recent) once loaded.
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollLeft = el.scrollWidth
  }, [meetings.length])

  return (
    <div style={{ marginBottom: 30 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 6 }}>
        <h3 style={{ fontSize: 14, margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)' }}>
          Sentiment timeline
        </h3>
        <div className="pill-strip" style={{ display: 'flex', gap: 4 }}>
          {([['member', 'By member'], ['issue', 'By issue']] as const).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setMode(k)}
              className="btn secondary"
              style={{ padding: '4px 10px', fontSize: 12, ...(mode === k ? { background: 'var(--primary)', color: '#fff', borderColor: 'var(--primary)' } : {}) }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Hover readout (updates as you move across the columns) */}
      <div style={{ fontSize: 12, minHeight: 20, marginBottom: 6 }}>
        {hover ? (
          <span>
            <span className="muted">{fmtDate(hover.col.date)} · </span>
            <span style={{ fontWeight: 600 }}>{hover.seg.label}</span>
            <span style={{ marginLeft: 8, ...chipInline(hover.seg.sentiment) }}>{fmtSent(hover.seg.sentiment)}</span>
            <span className="muted"> · {hover.seg.count} position{hover.seg.count === 1 ? '' : 's'}</span>
          </span>
        ) : (
          <span className="muted">
            {mode === 'member'
              ? 'Each column is a meeting; each band a board member (height = how much they weighed in, color = their progress score). Hover for detail.'
              : 'Each column is a meeting; each slice an issue discussed (height = attention, color = sentiment toward it). Hover for detail.'}
          </span>
        )}
      </div>

      <div className="card" style={{ padding: '14px 12px 10px' }}>
        <div ref={scrollRef} style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <div style={{ display: 'flex', gap: GAP, alignItems: 'flex-end', minWidth: 'min-content', paddingBottom: 4 }}>
            {cols.map((col, i) => {
              const prev = i > 0 ? cols[i - 1].date : ''
              const showMonth = !prev || new Date(prev + 'T12:00:00Z').getMonth() !== new Date(col.date + 'T12:00:00Z').getMonth() || new Date(prev + 'T12:00:00Z').getFullYear() !== new Date(col.date + 'T12:00:00Z').getFullYear()
              return (
                <div key={col.date + i} style={{ width: COL_W, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  {/* stacked column */}
                  <div
                    style={{
                      width: COL_W, height: PLOT_H, display: 'flex', flexDirection: 'column-reverse',
                      justifyContent: 'flex-start', gap: 1.5, borderBottom: '1px solid var(--border)',
                    }}
                  >
                    {col.segments.map((seg) => (
                      <div
                        key={seg.key}
                        onMouseEnter={() => setHover({ col, seg })}
                        onMouseLeave={() => setHover((h) => (h?.seg === seg ? null : h))}
                        title={`${fmtDate(col.date)} · ${seg.label} · ${fmtSent(seg.sentiment)} · ${seg.count} position${seg.count === 1 ? '' : 's'}`}
                        style={{
                          height: `${(seg.count / maxTotal) * PLOT_H}px`,
                          background: sentimentColor(seg.sentiment),
                          borderRadius: 2, cursor: 'pointer',
                          outline: hover?.seg === seg ? '2px solid var(--text)' : 'none',
                        }}
                      />
                    ))}
                  </div>
                  {/* x label: month markers only, to avoid crowding */}
                  <div style={{ height: 26, marginTop: 4, width: COL_W, position: 'relative' }}>
                    {showMonth && (
                      <div className="muted" style={{ position: 'absolute', top: 0, left: 0, fontSize: 9, whiteSpace: 'nowrap', transform: 'rotate(35deg)', transformOrigin: 'left top' }}>
                        {monthLabel(col.date)}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* legend */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', marginTop: 8, fontSize: 11 }}>
          <span className="muted" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            opposed
            <span style={{ display: 'inline-block', width: 90, height: 10, borderRadius: 5, background: `linear-gradient(90deg, ${sentimentColor(-1)}, ${sentimentColor(0)}, ${sentimentColor(1)})` }} />
            favorable
          </span>
          <span className="muted">height = # attributed positions</span>
          {mode === 'member' && (
            <span className="muted">bands (bottom→top): {roster.join(', ')}</span>
          )}
        </div>
      </div>
    </div>
  )
}

function chipInline(score: number): CSSProperties {
  return {
    background: sentimentColor(score), color: '#0a0a0a', fontWeight: 700, fontSize: 11,
    padding: '1px 7px', borderRadius: 999, fontVariantNumeric: 'tabular-nums',
  }
}
