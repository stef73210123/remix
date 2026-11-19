'use client'

import { useMemo, useState } from 'react'
import {
  getSales,
  marketSales,
  byQuarter,
  byArea,
  median,
  priceToRollRatio,
  isPartialQuarter,
  WESTCHESTER_MEDIANS,
  WESTCHESTER_MEDIANS_SOURCE,
  type QuarterStat,
} from '@/lib/municipal/sales'
import { fmtDateShort } from '@/lib/municipal/date'

function fmtUSDshort(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `$${Math.round(n / 1000)}K`
  return `$${Math.round(n)}`
}
function fmtUSD(n: number): string {
  return `$${Math.round(n).toLocaleString('en-US')}`
}
function fmtDate(iso: string): string {
  const d = new Date(iso + 'T12:00:00Z')
  return isNaN(d.getTime()) ? iso : fmtDateShort(d)
}

const CLASS_LABEL: Record<string, string> = {
  '210': 'One-family',
  '215': 'One-family w/ apt',
  '220': 'Two-family',
  '230': 'Three-family',
  '240': 'Rural residence',
  '250': 'Estate',
  '280': 'Multi-structure',
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{ flex: '1 1 140px', minWidth: 0 }}>
      <div className="muted" style={{ fontSize: 12 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, fontVariantNumeric: 'tabular-nums', lineHeight: 1.2 }}>{value}</div>
      {sub && <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

/** Median price per quarter (bars) with a small volume strip beneath on the same x. */
function QuarterChart({ quarters, partial }: { quarters: QuarterStat[]; partial: (q: string) => boolean }) {
  const [hover, setHover] = useState<number | null>(null)
  const maxPrice = Math.max(1, ...quarters.map((q) => q.median ?? 0))
  const maxCount = Math.max(1, ...quarters.map((q) => q.count))
  const H = 140
  const VH = 36
  const shown = hover != null ? quarters[hover] : quarters[quarters.length - 1]
  return (
    <div>
      <div style={{ fontSize: 12, minHeight: 18, marginBottom: 6 }}>
        <strong>{shown.quarter}</strong>
        <span className="muted">
          {' · '}
          {shown.median != null ? `median ${fmtUSD(shown.median)}` : 'no sales'}
          {` · ${shown.count} sale${shown.count === 1 ? '' : 's'}`}
          {partial(shown.quarter) ? ' · partial quarter' : ''}
        </span>
      </div>
      <div className="muted" style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
        <span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmtUSDshort(maxPrice)}</span>
        <span style={{ flex: 1, borderTop: '1px dashed var(--border)' }} />
      </div>
      <div
        role="img"
        aria-label="Median residential sale price by quarter"
        style={{ display: 'grid', gridTemplateColumns: `repeat(${quarters.length}, 1fr)`, gap: 2, alignItems: 'end', height: H }}
        onMouseLeave={() => setHover(null)}
      >
        {quarters.map((q, i) => {
          const h = q.median != null ? Math.max(3, (q.median / maxPrice) * H) : 0
          const isPartial = partial(q.quarter)
          return (
            <div
              key={q.quarter}
              onMouseEnter={() => setHover(i)}
              onFocus={() => setHover(i)}
              tabIndex={0}
              title={`${q.quarter}: ${q.median != null ? fmtUSD(q.median) : 'no sales'} (${q.count})`}
              style={{ height: '100%', display: 'flex', alignItems: 'flex-end', cursor: 'default', outline: 'none' }}
            >
              <div
                style={{
                  width: '100%',
                  height: h,
                  borderRadius: '4px 4px 0 0',
                  background: isPartial
                    ? 'repeating-linear-gradient(45deg, var(--primary) 0 3px, transparent 3px 6px)'
                    : 'var(--primary)',
                  border: isPartial ? '1px solid var(--primary)' : 'none',
                  opacity: hover == null || hover === i ? 1 : 0.45,
                }}
              />
            </div>
          )
        })}
      </div>
      <div style={{ borderTop: '1px solid var(--border)' }} />
      <div
        aria-hidden
        style={{ display: 'grid', gridTemplateColumns: `repeat(${quarters.length}, 1fr)`, gap: 2, alignItems: 'start', height: VH, marginTop: 4 }}
      >
        {quarters.map((q, i) => (
          <div
            key={q.quarter}
            onMouseEnter={() => setHover(i)}
            style={{
              height: Math.max(q.count ? 2 : 0, (q.count / maxCount) * VH),
              borderRadius: '0 0 4px 4px',
              background: 'var(--c, #8a8f98)',
              opacity: hover == null || hover === i ? 0.8 : 0.35,
            }}
          />
        ))}
      </div>
      <div className="muted" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginTop: 2 }}>
        <span>{quarters[0].quarter}</span>
        <span>Bars: median price · strip: number of sales</span>
        <span>{quarters[quarters.length - 1].quarter}</span>
      </div>
    </div>
  )
}

export default function MarketTrends({ muniKey }: { muniKey: string }) {
  const data = useMemo(() => getSales(muniKey), [muniKey])
  const [showAll, setShowAll] = useState(false)

  const view = useMemo(() => {
    if (!data || !data.coveredThrough) return null
    const sales = marketSales(data)
    if (sales.length === 0) return null
    const end = new Date(data.coveredThrough + 'T12:00:00Z')
    const yearAgo = new Date(end); yearAgo.setUTCFullYear(end.getUTCFullYear() - 1)
    const twoYearsAgo = new Date(end); twoYearsAgo.setUTCFullYear(end.getUTCFullYear() - 2)
    const iso = (d: Date) => d.toISOString().slice(0, 10)
    const last12 = sales.filter((s) => s.date > iso(yearAgo))
    const prior12 = sales.filter((s) => s.date > iso(twoYearsAgo) && s.date <= iso(yearAgo))
    const m12 = median(last12.map((s) => s.price))
    const mPrior = median(prior12.map((s) => s.price))
    return {
      sales,
      last12,
      m12,
      change: m12 != null && mPrior != null && prior12.length >= 5 ? (m12 - mPrior) / mPrior : null,
      quarters: byQuarter(sales).slice(-12),
      areas: byArea(last12.length >= 10 ? last12 : sales),
      areasWindow: last12.length >= 10 ? 'last 12 months' : 'all years shown',
      ratio: priceToRollRatio(data, last12.length >= 10 ? last12 : sales),
    }
  }, [data])

  if (!data || !view) return null
  const recent = showAll ? view.sales.slice(0, 40) : view.sales.slice(0, 8)
  const county = WESTCHESTER_MEDIANS[WESTCHESTER_MEDIANS.length - 1]

  return (
    <div id="market" style={{ marginBottom: 30 }}>
      <h2 style={{ fontSize: 16, margin: '0 0 12px' }}>Home sales</h2>
      <div className="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <Stat
            label="Median sale price, last 12 months"
            value={view.m12 != null ? fmtUSDshort(view.m12) : '—'}
            sub={view.change != null ? `${view.change >= 0 ? '▲' : '▼'} ${Math.abs(view.change * 100).toFixed(1)}% vs prior 12 months` : undefined}
          />
          <Stat label="Homes sold, last 12 months" value={String(view.last12.length)} sub="arm's-length residential" />
          {view.ratio && (
            <Stat
              label="Sale price vs. tax roll value"
              value={`${view.ratio.ratio >= 1 ? '+' : '−'}${Math.abs((view.ratio.ratio - 1) * 100).toFixed(0)}%`}
              sub={`median of ${view.ratio.n} sales matched to the roll`}
            />
          )}
        </div>

        {view.quarters.length >= 2 && (
          <QuarterChart quarters={view.quarters} partial={(q) => isPartialQuarter(data, q)} />
        )}

        <div>
          <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
            By area · {view.areasWindow}
          </div>
          <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
            <tbody>
              {view.areas.map((a) => (
                <tr key={a.area} style={{ borderTop: '1px solid var(--border)' }}>
                  <td style={{ padding: '7px 0' }}>{a.area}</td>
                  <td className="muted" style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{a.count} sales</td>
                  <td style={{ textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums', width: 90 }}>
                    {a.median != null ? fmtUSDshort(a.median) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div>
          <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
            Recent sales
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
              <tbody>
                {recent.map((s) => (
                  <tr key={`${s.printKey}-${s.date}`} style={{ borderTop: '1px solid var(--border)' }}>
                    <td className="muted" style={{ padding: '7px 8px 7px 0', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{fmtDate(s.date)}</td>
                    <td style={{ padding: '7px 8px 7px 0', width: '100%' }}>
                      <span style={{ textTransform: 'capitalize' }}>{s.address.toLowerCase()}</span>
                      <span className="muted" style={{ display: 'block', fontSize: 12 }}>{CLASS_LABEL[s.propClass] ?? s.propClass}</span>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{fmtUSD(s.price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {view.sales.length > 8 && (
            <button className="btn secondary" style={{ marginTop: 8, padding: '6px 12px', fontSize: 13 }} onClick={() => setShowAll((v) => !v)}>
              {showAll ? 'Show fewer' : 'Show more'}
            </button>
          )}
        </div>

        <div className="muted" style={{ fontSize: 11, lineHeight: 1.5 }}>
          Arm&apos;s-length residential sales from NYS real property transfer reports (RP-5217), via ORPTS Sales Web,
          matched to the Westchester County parcel roll. Deeds reach the state 2–3 months after closing, so the
          latest quarter is incomplete. Covers sales through {fmtDate(data.coveredThrough!)}; data as of {fmtDate(data.asOf!)}.
          Areas follow school-district lines. For context, Westchester&apos;s {county.year} countywide median
          was {fmtUSDshort(county.median)} (<a href={WESTCHESTER_MEDIANS_SOURCE} target="_blank" rel="noreferrer">ORPTS</a>).
        </div>
      </div>
    </div>
  )
}
