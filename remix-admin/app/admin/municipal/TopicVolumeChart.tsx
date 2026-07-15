'use client'

import { useEffect, useMemo, useState } from 'react'
import { sentimentColor, fmtSent } from './sentiment'
import BoardFilterDropdown from './BoardFilterDropdown'

interface MonthlyIssueVolume { month: string; volume: number; avgSentiment: number }
interface Aggregate {
  available?: boolean
  monthly?: MonthlyIssueVolume[]
  boards?: string[]
  monthlyByBoard?: Record<string, MonthlyIssueVolume[]>
}

/** Default view is the trailing 12 months — a "how are we doing lately"
 *  read, not the full multi-year history. */
const DEFAULT_MONTHS = 12

function monthLabel(iso: string): string {
  const d = new Date(iso + '-01T12:00:00Z')
  if (isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }).replace(' ', " '")
}
function monthLabelFull(iso: string): string {
  const d = new Date(iso + '-01T12:00:00Z')
  if (isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

const W = 900
const H = 320
const PAD = { t: 14, r: 16, b: 30, l: 34 }

/**
 * Town-wide topic volume over time: one line, oldest → newest month, each
 * point a dot colored by that month's average sentiment (green favorable,
 * coral opposed) so trend and tone read together at a glance. Full-width,
 * below Key Issues on the dashboard.
 */
export default function TopicVolumeChart({ muni }: { muni: string }) {
  const [agg, setAgg] = useState<Aggregate | null>(null)
  const [loading, setLoading] = useState(true)
  const [hover, setHover] = useState<number | null>(null)
  const [hiddenBoards, setHiddenBoards] = useState<Set<string>>(new Set())

  useEffect(() => {
    setLoading(true)
    setAgg(null)
    setHiddenBoards(new Set())
    fetch(`/admin/api/municipal/aggregate?muni=${encodeURIComponent(muni)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('load'))))
      .then((d: Aggregate) => setAgg(d && d.available !== false ? d : null))
      .catch(() => setAgg(null))
      .finally(() => setLoading(false))
  }, [muni])

  const boards = agg?.boards ?? []

  // Recombine the selected boards' per-month stats client-side, so toggling
  // the filter never needs a re-fetch. avgSentiment is volume-weighted so the
  // combined average is exact, not an average-of-averages.
  const allMonths = useMemo(() => {
    const selected = boards.filter((b) => !hiddenBoards.has(b))
    const byMonth = new Map<string, { volume: number; sentSum: number }>()
    for (const b of selected) {
      for (const p of agg?.monthlyByBoard?.[b] ?? []) {
        const cur = byMonth.get(p.month) || { volume: 0, sentSum: 0 }
        cur.volume += p.volume
        cur.sentSum += p.avgSentiment * p.volume
        byMonth.set(p.month, cur)
      }
    }
    return [...byMonth.entries()]
      .map(([month, v]) => ({ month, volume: v.volume, avgSentiment: v.volume ? v.sentSum / v.volume : 0 }))
      .sort((a, b) => a.month.localeCompare(b.month))
  }, [agg, boards, hiddenBoards])

  const points = useMemo(() => allMonths.slice(-DEFAULT_MONTHS), [allMonths])

  const plotW = W - PAD.l - PAD.r
  const plotH = H - PAD.t - PAD.b
  const maxV = Math.max(1, ...points.map((p) => p.volume))
  const x = (i: number) => PAD.l + (points.length > 1 ? (i / (points.length - 1)) * plotW : plotW / 2)
  const y = (v: number) => PAD.t + plotH - (v / maxV) * plotH
  const yTicks = Array.from(new Set([0, maxV].map((v) => Math.round(v))))

  if (loading) return null
  if (!agg || points.length < 2) return null

  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.volume).toFixed(1)}`).join(' ')
  const hoverPt = hover != null ? points[hover] : null

  // Show at most ~8 month labels so they don't crowd on a narrow screen.
  const labelStep = Math.max(1, Math.ceil(points.length / 8))

  return (
    <div style={{ marginBottom: 30 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', margin: '0 0 12px' }}>
        <h2 style={{ fontSize: 16, margin: 0 }}>Topic volume by month</h2>
        {boards.length > 1 && (
          <BoardFilterDropdown options={boards} hidden={hiddenBoards} onChange={setHiddenBoards} />
        )}
      </div>
      <div className="card" style={{ padding: '14px 12px 10px', position: 'relative' }}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}
          role="img"
          aria-label="Total topic mentions per month, dots colored by average sentiment that month"
          onMouseLeave={() => setHover(null)}
        >
          {yTicks.map((t) => (
            <g key={t}>
              <line x1={PAD.l} y1={y(t)} x2={W - PAD.r} y2={y(t)} stroke="var(--border)" strokeWidth={1} opacity={0.4} />
              <text x={PAD.l - 8} y={y(t) + 3} textAnchor="end" fontSize={11} fill="var(--muted)">{t}</text>
            </g>
          ))}
          {points.map((p, i) => (
            i % labelStep === 0 && (
              <text key={p.month} x={x(i)} y={H - 8} textAnchor="middle" fontSize={10} fill="var(--muted)">{monthLabel(p.month)}</text>
            )
          ))}
          <path d={path} fill="none" stroke="var(--muted)" strokeWidth={2} opacity={0.55} />
          {points.map((p, i) => (
            <circle
              key={p.month}
              cx={x(i)}
              cy={y(p.volume)}
              r={hover === i ? 7 : 5.5}
              fill={sentimentColor(p.avgSentiment)}
              stroke="var(--panel)"
              strokeWidth={1.5}
              style={{ cursor: 'pointer' }}
              onMouseEnter={() => setHover(i)}
              onClick={() => setHover((h) => (h === i ? null : i))}
            />
          ))}
        </svg>

        {hoverPt && (
          <div
            className="card"
            style={{
              position: 'absolute', top: 10, right: 10, padding: '8px 12px', pointerEvents: 'none',
              boxShadow: '0 6px 20px rgba(0,0,0,0.3)', fontSize: 12,
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 3 }}>{monthLabelFull(hoverPt.month)}</div>
            <div className="muted">{hoverPt.volume} topic mention{hoverPt.volume === 1 ? '' : 's'}</div>
            <div style={{ marginTop: 3 }}>
              <span style={{
                background: sentimentColor(hoverPt.avgSentiment), color: '#0a0a0a', fontWeight: 700, fontSize: 11,
                padding: '1px 7px', borderRadius: 999,
              }}>
                {fmtSent(hoverPt.avgSentiment)}
              </span>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, fontSize: 11 }}>
          <span className="muted">opposed</span>
          <span style={{ display: 'inline-block', width: 90, height: 10, borderRadius: 5, background: `linear-gradient(90deg, ${sentimentColor(-1)}, ${sentimentColor(0)}, ${sentimentColor(1)})` }} />
          <span className="muted">favorable</span>
          <span className="muted" style={{ marginLeft: 'auto' }}>Dot color = that month&rsquo;s average sentiment</span>
        </div>
      </div>
    </div>
  )
}
