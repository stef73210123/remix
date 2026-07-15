'use client'

import { useEffect, useMemo, useState } from 'react'
import type { AggregateThemeStat, MonthlyIssueVolume } from '@/lib/municipal/analysis'
import { sentimentColor, sentimentChipStyle, fmtSent } from './sentiment'

interface Aggregate {
  available?: boolean
  town: string
  years: number[]
  byYear: Record<string, AggregateThemeStat[]>
  monthlyByTheme: Record<string, MonthlyIssueVolume[]>
}

type SortBy = 'volume' | 'sentiment'

/** Trailing months of history shown in each row's sparkline. */
const SPARKLINE_MONTHS = 12
const SPARK_W = 104
const SPARK_H = 22

/** Diverging sentiment bar: center = 0, fills right (positive) / left (negative). */
function DivergingBar({ score }: { score: number }) {
  const s = Math.max(-1, Math.min(1, score))
  const half = Math.abs(s) * 50
  return (
    <div style={{ position: 'relative', height: 10, background: 'var(--panel-2)', borderRadius: 5, flex: '3 1 50px' }}>
      <div style={{ position: 'absolute', left: '50%', top: -1, bottom: -1, width: 1, background: 'var(--border)' }} />
      <div
        style={{
          position: 'absolute', top: 0, height: '100%', background: sentimentColor(s), borderRadius: 5,
          ...(s >= 0 ? { left: '50%', width: `${half}%` } : { right: '50%', width: `${half}%` }),
        }}
      />
    </div>
  )
}

/** Trailing-12-month volume trend — same visual language as the Recurring
 *  Agenda Items sparkline (board/CasesList.tsx's `Spark`): a full-width
 *  baseline, a thin connecting line, and every point plotted as its own
 *  dot colored by that month's sentiment (not just the latest one). Height
 *  encodes volume off a zero baseline rather than diverging from a
 *  midline, since volume (unlike sentiment) is never negative. */
function Sparkline({ points }: { points: MonthlyIssueVolume[] }) {
  if (points.length === 0) {
    return <span className="muted" style={{ fontSize: 10, width: SPARK_W, display: 'inline-block', textAlign: 'center', flexShrink: 0 }}>—</span>
  }
  const n = points.length
  const maxV = Math.max(1, ...points.map((p) => p.volume))
  const x = (i: number) => (n === 1 ? SPARK_W / 2 : (i / (n - 1)) * SPARK_W)
  const y = (v: number) => SPARK_H - 2 - (v / maxV) * (SPARK_H - 4)
  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.volume).toFixed(1)}`).join(' ')
  return (
    <svg width={SPARK_W} height={SPARK_H} style={{ display: 'block', flexShrink: 0 }} aria-hidden>
      <line x1={0} y1={SPARK_H - 2} x2={SPARK_W} y2={SPARK_H - 2} stroke="var(--border)" strokeWidth={1} />
      {n > 1 && <path d={d} fill="none" stroke="var(--muted)" strokeWidth={1.5} />}
      {points.map((p, i) => (
        <circle key={i} cx={x(i)} cy={y(p.volume)} r={2.5} fill={sentimentColor(p.avgSentiment)} />
      ))}
    </svg>
  )
}

function SortControls({
  sortBy, onSortBy, desc, onToggleDesc,
}: {
  sortBy: SortBy
  onSortBy: (s: SortBy) => void
  desc: boolean
  onToggleDesc: () => void
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
      <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
        {(['volume', 'sentiment'] as SortBy[]).map((s) => (
          <button
            key={s}
            onClick={() => onSortBy(s)}
            className={sortBy === s ? 'btn' : 'btn secondary'}
            style={{ padding: '4px 10px', fontSize: 11, borderRadius: 0, border: 'none' }}
          >
            {s === 'volume' ? 'Volume' : 'Sentiment'}
          </button>
        ))}
      </div>
      <button
        onClick={onToggleDesc}
        className="btn secondary"
        style={{ padding: '4px 8px', fontSize: 11 }}
        title="Flip the sort direction"
      >
        {desc ? '↓' : '↑'}
      </button>
    </div>
  )
}

/**
 * Town-wide "local issues" overview: one full-width, sortable ranked-theme
 * list (themes and issues are the same underlying data, so a single panel
 * replaces what used to be two near-duplicate ones). Sorting by volume shows
 * a volume bar; sorting by sentiment shows a diverging sentiment bar — the
 * visualization always matches whatever you're currently ranked by. Both
 * bar styles flex-grow to fill the row's remaining width (rather than a
 * fixed size), so they read as a proper proportional bar chart at any
 * viewport width. Every row also carries a trailing-12-month volume
 * sparkline, always the real last 12 months regardless of the year filter,
 * since that's a "how's it trending lately" signal rather than a
 * historical-year comparison.
 */
export default function IssuesOverview({ muni }: { muni: string }) {
  const [agg, setAgg] = useState<Aggregate | null>(null)
  const [loading, setLoading] = useState(true)
  const [year, setYear] = useState<number | null>(null)
  const [sortBy, setSortBy] = useState<SortBy>('volume')
  const [desc, setDesc] = useState(true)

  useEffect(() => {
    setLoading(true)
    setAgg(null)
    setYear(null)
    fetch(`/admin/api/municipal/aggregate?muni=${encodeURIComponent(muni)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('load'))))
      .then((d: Aggregate) => {
        if (!d || d.available === false || !d.years?.length) { setAgg(null); return }
        setAgg(d)
        // Default to last calendar year if present, else the most recent year.
        const lastCalendarYear = new Date().getFullYear() - 1
        setYear(d.years.includes(lastCalendarYear) ? lastCalendarYear : d.years[0])
      })
      .catch(() => setAgg(null))
      .finally(() => setLoading(false))
  }, [muni])

  const themes = useMemo<AggregateThemeStat[]>(
    // Drop the "Other" catch-all bucket — it's noise, not a real issue.
    () => (agg && year != null ? (agg.byYear[String(year)] || []).filter((t) => t.theme.toLowerCase() !== 'other') : []),
    [agg, year]
  )

  const sorted = useMemo(() => {
    const arr = [...themes]
    if (sortBy === 'volume') arr.sort((a, b) => (desc ? b.mentions - a.mentions : a.mentions - b.mentions))
    else arr.sort((a, b) => (desc ? b.avgSentiment - a.avgSentiment : a.avgSentiment - b.avgSentiment))
    return arr
  }, [themes, sortBy, desc])

  const maxMentions = Math.max(1, ...themes.map((t) => t.mentions))

  if (loading) return null
  if (!agg || year == null) return null

  return (
    <div style={{ marginBottom: 30 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', margin: '0 0 12px' }}>
        <h2 style={{ fontSize: 16, margin: 0 }}>Local issues</h2>
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          aria-label="Calendar year"
          style={{ fontSize: 14, padding: '6px 10px', borderRadius: 6, background: 'var(--panel-2)', border: '1px solid var(--border)', color: 'var(--text)' }}
        >
          {agg.years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {themes.length === 0 ? (
        <div className="card"><div className="muted" style={{ padding: 20, fontSize: 13 }}>No themes recorded for {year}.</div></div>
      ) : (
        <div className="card" style={{ padding: '16px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
            <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Themes · {sorted.length}
            </div>
            <SortControls sortBy={sortBy} onSortBy={setSortBy} desc={desc} onToggleDesc={() => setDesc((d) => !d)} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9, maxHeight: 480, overflowY: 'auto', paddingRight: 4 }}>
            {sorted.map((t) => {
              const spark = (agg.monthlyByTheme[t.theme] || []).slice(-SPARKLINE_MONTHS)
              return (
                <div key={t.theme} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, flexShrink: 0 }}>
                  <span style={{ flex: '1 1 90px', minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={t.theme}>
                    {t.theme}
                  </span>
                  {sortBy === 'volume' ? (
                    <div style={{ flex: '3 1 50px', background: 'var(--panel-2)', borderRadius: 4, height: 12, overflow: 'hidden' }}>
                      <div style={{ width: `${(t.mentions / maxMentions) * 100}%`, height: '100%', background: sentimentColor(t.avgSentiment), borderRadius: 4, minWidth: 3 }} />
                    </div>
                  ) : (
                    <DivergingBar score={t.avgSentiment} />
                  )}
                  <span className="muted" style={{ width: 20, textAlign: 'right', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }} title={`${t.mentions} meetings`}>{t.mentions}</span>
                  <span style={{ ...sentimentChipStyle(t.avgSentiment), width: 36, flexShrink: 0, textAlign: 'center', padding: '2px 0' }}>{fmtSent(t.avgSentiment)}</span>
                  <Sparkline points={spark} />
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
