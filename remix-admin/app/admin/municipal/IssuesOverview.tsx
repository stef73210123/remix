'use client'

import { useEffect, useMemo, useState } from 'react'
import type { AggregateThemeStat } from '@/lib/municipal/analysis'
import { sentimentColor, sentimentChipStyle, fmtSent } from './sentiment'

interface Aggregate {
  available?: boolean
  town: string
  years: number[]
  byYear: Record<string, AggregateThemeStat[]>
}

/** Diverging sentiment bar: center = 0, fills right (positive) / left (negative). */
function DivergingBar({ score }: { score: number }) {
  const s = Math.max(-1, Math.min(1, score))
  const half = Math.abs(s) * 50
  return (
    <div style={{ position: 'relative', height: 10, background: 'var(--panel-2)', borderRadius: 5, flex: 1, minWidth: 60 }}>
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

/**
 * Town-wide "local issues" overview: the most-discussed themes and the issues
 * ranked by sentiment (highest → lowest), aggregated across every tracked board
 * and committee for the selected calendar year. Defaults to last calendar year.
 */
export default function IssuesOverview({ muni }: { muni: string }) {
  const [agg, setAgg] = useState<Aggregate | null>(null)
  const [loading, setLoading] = useState(true)
  const [year, setYear] = useState<number | null>(null)
  // Sort direction for the by-sentiment list (true = highest → lowest).
  const [sentDesc, setSentDesc] = useState(true)

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
  const topByVolume = useMemo(() => [...themes].sort((a, b) => b.mentions - a.mentions).slice(0, 8), [themes])
  const maxMentions = Math.max(1, ...topByVolume.map((t) => t.mentions))
  // The complete list for the year (no top-N cap) — the card scrolls instead.
  const bySentiment = useMemo(
    () => [...themes].sort((a, b) => (sentDesc ? b.avgSentiment - a.avgSentiment : a.avgSentiment - b.avgSentiment)),
    [themes, sentDesc]
  )

  if (loading) return null
  if (!agg || year == null) return null

  return (
    <div style={{ marginBottom: 30 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', margin: '0 0 12px' }}>
        <h2 style={{ fontSize: 16, margin: 0 }}>
          Local issues
          <span className="muted" style={{ fontSize: 13, fontWeight: 400 }}> · across all boards &amp; committees</span>
        </h2>
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
          {/* Most-discussed themes (by volume) */}
          <div className="card" style={{ padding: 16 }}>
            <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Most-discussed themes</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {topByVolume.map((t) => (
                <div key={t.theme} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                  <span style={{ width: 150, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={t.theme}>{t.theme}</span>
                  <div style={{ flex: 1, background: 'var(--panel-2)', borderRadius: 4, height: 12, overflow: 'hidden' }}>
                    <div style={{ width: `${(t.mentions / maxMentions) * 100}%`, height: '100%', background: sentimentColor(t.avgSentiment), borderRadius: 4, minWidth: 3 }} />
                  </div>
                  <span className="muted" style={{ width: 44, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{t.mentions} mtg</span>
                </div>
              ))}
            </div>
          </div>

          {/* Issues ranked by sentiment — the complete list, scrollable, with a
              sort-direction toggle. The year dropdown above filters this card. */}
          <div className="card" style={{ padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 12 }}>
              <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Issues by sentiment · all {bySentiment.length}
              </div>
              <button
                onClick={() => setSentDesc((d) => !d)}
                className="btn secondary"
                style={{ padding: '4px 10px', fontSize: 11, whiteSpace: 'nowrap' }}
                title="Flip the sort direction"
              >
                {sentDesc ? '↓ Highest → lowest' : '↑ Lowest → highest'}
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9, maxHeight: 320, overflowY: 'auto', paddingRight: 4 }}>
              {bySentiment.map((t) => (
                <div key={t.theme} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, flexShrink: 0 }}>
                  <span style={{ width: 150, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={t.theme}>{t.theme}</span>
                  <DivergingBar score={t.avgSentiment} />
                  <span style={{ ...sentimentChipStyle(t.avgSentiment), minWidth: 44 }}>{fmtSent(t.avgSentiment)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
