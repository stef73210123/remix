'use client'

import { useEffect, useRef, useState } from 'react'
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

function GrowthBadge({ pct }: { pct: number }) {
  const up = pct >= 0
  return (
    <span style={{ color: up ? POS : NEG, fontSize: 12, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
      {up ? '▲' : '▼'} {up ? '+' : ''}{pct.toFixed(1)}% <span className="muted" style={{ fontWeight: 400 }}>YoY</span>
    </span>
  )
}

/** KPI value + label, shown atop each card's chart (consolidates what used
 *  to be a separate stat tile above a duplicate caption under the chart). */
function KpiHeader({ label, value, sub, growth }: {
  label: string; value: string; sub?: string; growth?: number | null
}) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap', marginTop: 2 }}>
        <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.1 }}>{value}</div>
        {sub && <div className="muted" style={{ fontSize: 12 }}>{sub}</div>}
        {growth != null && <GrowthBadge pct={growth} />}
      </div>
    </div>
  )
}

/** Compact year → value line chart, x-position scaled by real year (not
 *  index) so a mix of decade-spaced and annual points reads as a mix —
 *  sparse gaps look sparse, dense runs look dense. */
function TrendChart({ points, fmtY, color = 'var(--primary)' }: {
  points: { year: number; value: number }[]
  fmtY: (v: number) => string
  color?: string
}) {
  const [hover, setHover] = useState<number | null>(null)
  const pts = points.filter((p) => p.value > 0).sort((a, b) => a.year - b.year)
  if (pts.length < 2) return null

  const W = 280, H = 110, PAD = { t: 10, r: 8, b: 18, l: 8 }
  const plotW = W - PAD.l - PAD.r, plotH = H - PAD.t - PAD.b
  const minYear = pts[0].year, maxYear = pts[pts.length - 1].year
  const yearSpan = maxYear - minYear || 1
  const minV = Math.min(...pts.map((p) => p.value))
  const maxV = Math.max(...pts.map((p) => p.value))
  const span = maxV - minV || 1
  const x = (yr: number) => PAD.l + ((yr - minYear) / yearSpan) * plotW
  const y = (v: number) => PAD.t + plotH - ((v - minV) / span) * plotH
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.year).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ')
  const areaPath = `${path} L${x(maxYear).toFixed(1)},${(PAD.t + plotH).toFixed(1)} L${x(minYear).toFixed(1)},${(PAD.t + plotH).toFixed(1)} Z`
  const hb = hover != null ? pts[hover] : null

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      style={{ width: '100%', height: '100%', display: 'block' }}
      role="img"
      aria-label="Trend over time"
    >
      <path d={areaPath} fill={color} opacity={0.12} />
      <path d={path} fill="none" stroke={color} strokeWidth={1.75} />
      {pts.map((p, i) => (
        <circle key={p.year} cx={x(p.year)} cy={y(p.value)} r={hover === i ? 3.5 : 2.25} fill={color} />
      ))}
      {pts.map((p, i) => (
        <rect key={`h${p.year}`} x={x(p.year) - 10} y={PAD.t} width={20} height={plotH} fill="transparent"
          onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} style={{ cursor: 'pointer' }} />
      ))}
      <text x={x(minYear)} y={H - 4} textAnchor="start" fontSize={9} fill="var(--muted)">{minYear}</text>
      {maxYear !== minYear && (
        <text x={x(maxYear)} y={H - 4} textAnchor="end" fontSize={9} fill="var(--muted)">{maxYear}</text>
      )}
      {hb && (() => {
        const label = `${hb.year}: ${fmtY(hb.value)}`
        const tw = label.length * 6 + 14
        const tx = Math.min(Math.max(x(hb.year) - tw / 2, 2), W - tw - 2)
        return (
          <g style={{ pointerEvents: 'none' }}>
            <rect x={tx} y={2} width={tw} height={20} rx={5} fill="var(--panel)" stroke="var(--border)" />
            <text x={tx + 7} y={16} fontSize={11} fontWeight={600} fill="var(--text)">{label}</text>
          </g>
        )
      })()}
    </svg>
  )
}

/** Decade-spaced decennial anchors + the annual ACS series, merged by year
 *  (series wins on overlap) — a longer, mixed-granularity trend than either
 *  source gives alone. */
function longSeries(demo: TownDemographics, field: 'population' | 'households'): { year: number; value: number }[] {
  const byYear = new Map<number, number>()
  for (const d of demo.decennial ?? []) {
    const v = d[field]
    if (v != null) byYear.set(d.year, v)
  }
  for (const s of demo.series ?? []) {
    const v = s[field]
    if (v != null) byYear.set(s.year, v)
  }
  return [...byYear.entries()].sort((a, b) => a[0] - b[0]).map(([year, value]) => ({ year, value }))
}

const CARD_HEIGHT = 260

function DemoCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      data-demo-card
      className="card"
      style={{
        padding: 16, flex: '0 0 300px', minWidth: 0, scrollSnapAlign: 'start',
        height: CARD_HEIGHT, display: 'flex', flexDirection: 'column',
      }}
    >
      {children}
    </div>
  )
}

/** Fills whatever vertical space is left in a DemoCard below its header, so
 *  every card reads as the same size regardless of how much its own content
 *  (a chart vs. a handful of bar rows) would naturally need. */
function CardBody({ children, center }: { children: React.ReactNode; center?: boolean }) {
  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', ...(center ? { justifyContent: 'center' } : {}) }}>
      {children}
    </div>
  )
}

function BarRows({ rows, max, color }: { rows: { label: string; pct: number }[]; max: number; color: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
      {rows.map((r) => (
        <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 84, fontSize: 12, color: 'var(--muted)', textAlign: 'right', flexShrink: 0 }}>{r.label}</div>
          <div style={{ flex: 1, background: 'var(--panel-2)', borderRadius: 5, height: 16, overflow: 'hidden' }}>
            <div style={{ width: `${(r.pct / max) * 100}%`, background: color, height: '100%', borderRadius: 5, minWidth: r.pct > 0 ? 4 : 0 }} />
          </div>
          <div style={{ width: 34, fontSize: 12, fontWeight: 600, textAlign: 'right', flexShrink: 0 }}>{r.pct}%</div>
        </div>
      ))}
    </div>
  )
}

export default function Demographics({ muniKey }: { muniKey: string }) {
  const [demo, setDemo] = useState<TownDemographics | null>(null)
  const [loading, setLoading] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)

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

  const scrollByCard = (dir: 1 | -1) => {
    const el = scrollRef.current
    if (!el) return
    const card = el.querySelector<HTMLElement>('[data-demo-card]')
    const step = (card?.offsetWidth ?? 300) + 12
    el.scrollBy({ left: dir * step, behavior: 'smooth' })
  }

  const renterPct = Math.max(0, 100 - demo.ownerOccupiedPct)
  const maxBracket = Math.max(...demo.incomeBrackets.map((b) => b.pct), 1)
  const series = demo.series
  const homeSeries = series?.map((s) => ({ year: s.year, value: s.medianHomeValueUsd })).filter((p) => p.value > 0)
  const homeValue = demo.medianHomeValueUsd ?? (homeSeries && homeSeries[homeSeries.length - 1]?.value)
  const housingTypes = demo.housingTypes
  const maxHousing = Math.max(...(housingTypes?.map((t) => t.pct) || [1]), 1)
  const homeValueBrackets = demo.homeValueBrackets
  const maxHomeVal = Math.max(...(homeValueBrackets?.map((b) => b.pct) || [1]), 1)
  const avgHouseholdSize = demo.avgHouseholdSizePeople ?? (demo.households ? demo.population / demo.households : null)
  const spanYears = series && series.length > 1 ? `${series[0].year}–${series[series.length - 1].year}` : null

  const populationSeries = longSeries(demo, 'population')
  const householdsSeries = longSeries(demo, 'households')
  const incomeSeries = series?.map((s) => ({ year: s.year, value: s.medianIncomeUsd })).filter((p) => p.value > 0) ?? []
  const ageSeries = series?.map((s) => ({ year: s.year, value: s.medianAgeYears ?? 0 })).filter((p) => p.value > 0) ?? []
  const householdSizeSeries = (series ?? [])
    .filter((s): s is DemoSeriesPoint & { households: number } => !!s.households)
    .map((s) => ({ year: s.year, value: s.population / s.households }))

  return (
    <div style={{ marginBottom: 26 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', margin: '0 0 12px' }}>
        <h2 style={{ fontSize: 16, margin: 0 }}>
          Demographics
          {spanYears && <span className="muted" style={{ fontSize: 13, fontWeight: 400 }}> · trends {spanYears}</span>}
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          {demo.approximate && <span className="muted" style={{ fontSize: 11 }}>{demo.source}</span>}
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            <button onClick={() => scrollByCard(-1)} aria-label="Previous" className="btn secondary" style={{ padding: '4px 10px', fontSize: 14 }}>‹</button>
            <button onClick={() => scrollByCard(1)} aria-label="Next" className="btn secondary" style={{ padding: '4px 10px', fontSize: 14 }}>›</button>
          </div>
        </div>
      </div>

      <div
        ref={scrollRef}
        style={{
          display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4,
          scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch',
        }}
      >
        <DemoCard>
          <KpiHeader label="Population" value={fmtInt(demo.population)} growth={popGrowth(series, 'population')} />
          <CardBody><TrendChart points={populationSeries} fmtY={fmtInt} /></CardBody>
        </DemoCard>

        <DemoCard>
          <KpiHeader label="Households" value={fmtInt(demo.households)} growth={popGrowth(series, 'households')} />
          <CardBody><TrendChart points={householdsSeries} fmtY={fmtInt} color="#5a9bd4" /></CardBody>
        </DemoCard>

        <DemoCard>
          <KpiHeader label="Median income" value={fmtUSD0(demo.medianIncomeUsd)} growth={popGrowth(series, 'medianIncomeUsd')} />
          <CardBody><TrendChart points={incomeSeries} fmtY={fmtUSD0} color="#c7913c" /></CardBody>
        </DemoCard>

        <DemoCard>
          <KpiHeader label="Median age" value={`${demo.medianAgeYears}`} sub="years" growth={popGrowth(series, 'medianAgeYears')} />
          <CardBody><TrendChart points={ageSeries} fmtY={(v) => `${v.toFixed(0)}y`} color="#9b7fd4" /></CardBody>
        </DemoCard>

        <DemoCard>
          <KpiHeader
            label="Household size"
            value={avgHouseholdSize != null ? avgHouseholdSize.toFixed(1) : '—'}
            sub="people / household"
          />
          <CardBody><TrendChart points={householdSizeSeries} fmtY={(v) => v.toFixed(1)} color="#22a06b" /></CardBody>
        </DemoCard>

        {/* Median home value — the KPI and its distribution used to be two
            separate things (a tile above, a repeated caption below the
            histogram); now the KPI sits directly atop the one chart it describes. */}
        {homeValueBrackets && homeValueBrackets.length > 0 && (
          <DemoCard>
            {homeValue != null && (
              <KpiHeader label="Median home value" value={fmtUSDshort(homeValue)} growth={popGrowth(series, 'medianHomeValueUsd')} />
            )}
            <CardBody center>
              <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
                Home value distribution
              </div>
              <BarRows rows={homeValueBrackets} max={maxHomeVal} color="#3d9c72" />
            </CardBody>
          </DemoCard>
        )}

        {/* Owner-occupied % — same consolidation, atop the tenure split it summarizes. */}
        <DemoCard>
          <KpiHeader label="Owner-occupied" value={`${demo.ownerOccupiedPct}%`} />
          <CardBody center>
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
          </CardBody>
        </DemoCard>

        {/* Housing by structure type — a distribution with no single KPI to consolidate. */}
        {housingTypes && housingTypes.length > 0 && (
          <DemoCard>
            <CardBody center>
              <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
                Housing by type
              </div>
              <BarRows rows={housingTypes} max={maxHousing} color="#5a9bd4" />
            </CardBody>
          </DemoCard>
        )}

        {/* Household income distribution — likewise a distribution on its own. */}
        <DemoCard>
          <CardBody center>
            <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
              Household income distribution
            </div>
            <BarRows rows={demo.incomeBrackets} max={maxBracket} color="var(--primary)" />
          </CardBody>
        </DemoCard>
      </div>
    </div>
  )
}
