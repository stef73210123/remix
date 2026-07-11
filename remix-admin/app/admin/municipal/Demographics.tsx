'use client'

import { useEffect, useState } from 'react'
import type { TownDemographics, DemoSeriesPoint } from '@/lib/municipal/demographics'

function fmtInt(n: number): string {
  return n.toLocaleString('en-US')
}
function fmtUSD0(n: number): string {
  return `$${Math.round(n).toLocaleString('en-US')}`
}
function fmtUSDshort(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(n >= 10_000_000 ? 1 : 2)}M`
  if (n >= 1_000) return `$${Math.round(n / 1000)}K`
  return `$${Math.round(n)}`
}

const POS = '#3d9c72'
const NEG = '#ca615f'

/** Period-over-period % growth from the last two series points, or null. */
function popGrowth(series: DemoSeriesPoint[] | undefined, key: keyof DemoSeriesPoint): number | null {
  if (!series || series.length < 2) return null
  const a = Number(series[series.length - 2][key])
  const b = Number(series[series.length - 1][key])
  if (!a || !b) return null
  return ((b - a) / a) * 100
}

/** Tiny trend line over the series values. */
function Spark({ values, w = 128, h = 30 }: { values: number[]; w?: number; h?: number }) {
  const pts = values.filter((v) => v > 0)
  if (pts.length < 2) return null
  const min = Math.min(...pts)
  const max = Math.max(...pts)
  const span = max - min || 1
  const x = (i: number) => (i / (pts.length - 1)) * (w - 4) + 2
  const y = (v: number) => h - 3 - ((v - min) / span) * (h - 6)
  const up = pts[pts.length - 1] >= pts[0]
  const d = pts.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
  return (
    <svg width={w} height={h} style={{ display: 'block', marginTop: 8 }} aria-hidden>
      <path d={d} fill="none" stroke={up ? POS : NEG} strokeWidth={1.5} />
      <circle cx={x(pts.length - 1)} cy={y(pts[pts.length - 1])} r={2.5} fill={up ? POS : NEG} />
    </svg>
  )
}

function GrowthBadge({ pct }: { pct: number }) {
  const up = pct >= 0
  return (
    <span style={{ color: up ? POS : NEG, fontSize: 12, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
      {up ? '▲' : '▼'} {up ? '+' : ''}{pct.toFixed(1)}% <span className="muted" style={{ fontWeight: 400 }}>YoY</span>
    </span>
  )
}

function Tile({ label, value, sub, growth, spark }: {
  label: string; value: string; sub?: string; growth?: number | null; spark?: number[]
}) {
  return (
    <div className="card" style={{ padding: '14px 16px' }}>
      <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4, lineHeight: 1.1 }}>{value}</div>
      {sub && <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{sub}</div>}
      {growth != null && <div style={{ marginTop: 6 }}><GrowthBadge pct={growth} /></div>}
      {spark && <Spark values={spark} />}
    </div>
  )
}

export default function Demographics({ muniKey }: { muniKey: string }) {
  const [demo, setDemo] = useState<TownDemographics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/admin/api/municipal/demographics?muni=${encodeURIComponent(muniKey)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('load'))))
      .then((d) => setDemo(d.demo || null))
      .catch(() => setDemo(null))
      .finally(() => setLoading(false))
  }, [muniKey])

  if (loading) return <div className="muted" style={{ fontSize: 13, marginBottom: 26 }}>Loading demographics…</div>
  if (!demo) return null

  const renterPct = Math.max(0, 100 - demo.ownerOccupiedPct)
  const maxBracket = Math.max(...demo.incomeBrackets.map((b) => b.pct), 1)
  const series = demo.series
  const popSeries = series?.map((s) => s.population)
  const incSeries = series?.map((s) => s.medianIncomeUsd)
  const homeSeries = series?.map((s) => s.medianHomeValueUsd)
  const ageSeries = series?.map((s) => s.medianAgeYears ?? 0)
  const homeValue = demo.medianHomeValueUsd ?? (homeSeries && homeSeries[homeSeries.length - 1])
  const housingTypes = demo.housingTypes
  const maxHousing = Math.max(...(housingTypes?.map((t) => t.pct) || [1]), 1)
  const homeValueBrackets = demo.homeValueBrackets
  const maxHomeVal = Math.max(...(homeValueBrackets?.map((b) => b.pct) || [1]), 1)
  const avgHouseholdSize = demo.avgHouseholdSizePeople ?? (demo.households ? demo.population / demo.households : null)
  const spanYears = series && series.length > 1 ? `${series[0].year}–${series[series.length - 1].year}` : null

  return (
    <div style={{ marginBottom: 26 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', margin: '0 0 12px' }}>
        <h2 style={{ fontSize: 16, margin: 0 }}>
          Demographics
          {spanYears && <span className="muted" style={{ fontSize: 13, fontWeight: 400 }}> · trends {spanYears}</span>}
        </h2>
        {demo.approximate && (
          <span className="muted" style={{ fontSize: 11 }}>{demo.source}</span>
        )}
      </div>

      {/* KPI tiles — population, income & home value carry YoY growth + sparklines. */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 16 }}>
        <Tile label="Population" value={fmtInt(demo.population)} growth={popGrowth(series, 'population')} spark={popSeries} />
        <Tile label="Median income" value={fmtUSD0(demo.medianIncomeUsd)} growth={popGrowth(series, 'medianIncomeUsd')} spark={incSeries} />
        {homeValue ? (
          <Tile label="Median home value" value={fmtUSDshort(homeValue)} growth={popGrowth(series, 'medianHomeValueUsd')} spark={homeSeries} />
        ) : null}
        <Tile label="Households" value={fmtInt(demo.households)} />
        <Tile
          label="Household size"
          value={avgHouseholdSize != null ? avgHouseholdSize.toFixed(1) : '—'}
          sub="people / household"
        />
        <Tile
          label="Median age"
          value={`${demo.medianAgeYears}`}
          sub="years"
          growth={popGrowth(series, 'medianAgeYears')}
          spark={ageSeries}
        />
        <Tile label="Owner-occupied" value={`${demo.ownerOccupiedPct}%`} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        {/* Housing by structure type */}
        {housingTypes && housingTypes.length > 0 && (
          <div className="card" style={{ padding: 16 }}>
            <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
              Housing by type
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {housingTypes.map((t) => (
                <div key={t.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 90, fontSize: 12, color: 'var(--muted)', textAlign: 'right', flexShrink: 0 }}>{t.label}</div>
                  <div style={{ flex: 1, background: 'var(--panel-2)', borderRadius: 5, height: 16, overflow: 'hidden' }}>
                    <div style={{ width: `${(t.pct / maxHousing) * 100}%`, background: '#5a9bd4', height: '100%', borderRadius: 5, minWidth: t.pct > 0 ? 4 : 0 }} />
                  </div>
                  <div style={{ width: 34, fontSize: 12, fontWeight: 600, textAlign: 'right', flexShrink: 0 }}>{t.pct}%</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Home value distribution — owner-occupied units by value range */}
        {homeValueBrackets && homeValueBrackets.length > 0 && (
          <div className="card" style={{ padding: 16 }}>
            <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
              Home value distribution
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {homeValueBrackets.map((b) => (
                <div key={b.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 78, fontSize: 12, color: 'var(--muted)', textAlign: 'right', flexShrink: 0 }}>{b.label}</div>
                  <div style={{ flex: 1, background: 'var(--panel-2)', borderRadius: 5, height: 16, overflow: 'hidden' }}>
                    <div style={{ width: `${(b.pct / maxHomeVal) * 100}%`, background: '#3d9c72', height: '100%', borderRadius: 5, minWidth: b.pct > 0 ? 4 : 0 }} />
                  </div>
                  <div style={{ width: 34, fontSize: 12, fontWeight: 600, textAlign: 'right', flexShrink: 0 }}>{b.pct}%</div>
                </div>
              ))}
            </div>
            <div className="muted" style={{ fontSize: 11, marginTop: 12 }}>
              Owner-occupied units{homeValue ? ` · median ${fmtUSDshort(homeValue)}` : ''}
            </div>
          </div>
        )}

        {/* Income distribution — single-hue magnitude bars */}
        <div className="card" style={{ padding: 16 }}>
          <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
            Household income distribution
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {demo.incomeBrackets.map((b) => (
              <div key={b.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 74, fontSize: 12, color: 'var(--muted)', textAlign: 'right', flexShrink: 0 }}>{b.label}</div>
                <div style={{ flex: 1, background: 'var(--panel-2)', borderRadius: 5, height: 16, overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${(b.pct / maxBracket) * 100}%`,
                      background: 'var(--primary)',
                      height: '100%',
                      borderRadius: 5,
                      minWidth: b.pct > 0 ? 4 : 0,
                    }}
                  />
                </div>
                <div style={{ width: 34, fontSize: 12, fontWeight: 600, textAlign: 'right', flexShrink: 0 }}>{b.pct}%</div>
              </div>
            ))}
          </div>
        </div>

        {/* Housing tenure — two-category split */}
        <div className="card" style={{ padding: 16 }}>
          <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
            Housing tenure
          </div>
          <div style={{ display: 'flex', height: 20, borderRadius: 6, overflow: 'hidden', marginBottom: 12 }}>
            <div style={{ width: `${demo.ownerOccupiedPct}%`, background: '#3d9c72' }} />
            <div style={{ width: `${renterPct}%`, background: '#5a9bd4' }} />
          </div>
          <div style={{ display: 'flex', gap: 18, fontSize: 13, flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: '#3d9c72', display: 'inline-block' }} />
              Owner {demo.ownerOccupiedPct}%
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: '#5a9bd4', display: 'inline-block' }} />
              Renter {renterPct}%
            </span>
          </div>
          <div className="muted" style={{ fontSize: 12, marginTop: 14 }}>
            {fmtInt(demo.households)} households · {(demo.population / (demo.households || 1)).toFixed(1)} people per household
          </div>
        </div>
      </div>
    </div>
  )
}
