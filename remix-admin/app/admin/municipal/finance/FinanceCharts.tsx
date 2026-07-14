'use client'

import { useState } from 'react'
import {
  NC_2026_APPROPRIATIONS, NC_2025_VS_2026, NC_FUND_BALANCE_HISTORY,
  NC_TAX_CAP_WATERFALL, NC_HOMEOWNER_TAX_IMPACT, NC_2026_BUDGET_SOURCE_NOTE,
} from '@/lib/municipal/budget2026'

function fmtUSD(v: number): string {
  const sign = v < 0 ? '-' : ''
  const abs = Math.abs(v)
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(abs >= 10_000_000 ? 1 : 2)}M`
  if (abs >= 1_000) return `${sign}$${Math.round(abs / 1000)}K`
  return `${sign}$${abs}`
}
function fmtUSDFull(v: number): string {
  return `${v < 0 ? '-' : ''}$${Math.abs(Math.round(v)).toLocaleString('en-US')}`
}
function fmtPct(v: number): string {
  return `${v >= 0 ? '+' : ''}${(v * 100).toFixed(1)}%`
}

// Fixed categorical order — never cycled or re-assigned when a filter changes
// which categories are present.
const CATEGORY_COLORS_2026: Record<string, string> = {
  'General Funds': '#5a9bd4',
  'Fire Protection': '#e8813a',
  'Street Lighting': '#d4767a',
  'Ambulance': '#0ea5e9',
  'Park': '#3d9c72',
  'Sewer Districts': '#9b7fd4',
  'Water Districts': '#c9973f',
}
const CATEGORY_COLORS_CHANGE: Record<string, string> = {
  'General Funds': '#5a9bd4',
  'Sewer & Water': '#9b7fd4',
  'Street Lighting': '#d4767a',
  'Ambulance': '#0ea5e9',
  'Other Special Districts': '#e8813a',
}
const FUND_COLORS: Record<string, string> = {
  'General Fund': '#5a9bd4',
  'Highway Fund': '#e8813a',
  'Library': '#3d9c72',
  'Combined': '#12a6b8',
}

function groupSum<T>(rows: T[], keyOf: (r: T) => string, valueOf: (r: T) => number): Map<string, number> {
  const m = new Map<string, number>()
  for (const r of rows) {
    const k = keyOf(r)
    m.set(k, (m.get(k) ?? 0) + valueOf(r))
  }
  return m
}

/** 2026 appropriations by category, each bar segmented by fund — the "part
 *  of whole" composition of the $43.78M adopted budget. Categories vary by
 *  orders of magnitude (General Funds vs. a single park district), so bars
 *  share one scale rather than each filling its own row — the skew itself
 *  (how dominant General/Highway/Library is) is real and worth showing. */
export function AppropriationsCompositionChart() {
  const [hover, setHover] = useState<string | null>(null)
  const categories = Array.from(new Set(NC_2026_APPROPRIATIONS.map((r) => r.category)))
  const byCategory = categories.map((cat) => ({
    category: cat,
    total: NC_2026_APPROPRIATIONS.filter((r) => r.category === cat).reduce((s, r) => s + r.appropriation, 0),
    funds: NC_2026_APPROPRIATIONS.filter((r) => r.category === cat),
  })).sort((a, b) => b.total - a.total)
  const max = Math.max(...byCategory.map((c) => c.total), 1)
  const grandTotal = byCategory.reduce((s, c) => s + c.total, 0)

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {byCategory.map((c) => {
          let running = 0
          return (
            <div key={c.category}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 4 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 9, height: 9, borderRadius: 2, background: CATEGORY_COLORS_2026[c.category], flexShrink: 0 }} />
                  {c.category}
                </span>
                <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{fmtUSD(c.total)}</span>
              </div>
              <div style={{ display: 'flex', height: 18, borderRadius: 5, overflow: 'hidden', background: 'var(--panel-2)', width: `${Math.max((c.total / max) * 100, 1.5)}%`, minWidth: 3 }}>
                {c.funds.map((f) => {
                  const w = (f.appropriation / c.total) * 100
                  running += f.appropriation
                  const key = `${c.category}__${f.fund}`
                  return (
                    <div
                      key={key}
                      onMouseEnter={() => setHover(key)}
                      onMouseLeave={() => setHover((h) => (h === key ? null : h))}
                      title={`${f.fund}: ${fmtUSDFull(f.appropriation)}`}
                      style={{
                        width: `${w}%`, minWidth: f.appropriation > 0 ? 2 : 0, height: '100%',
                        background: CATEGORY_COLORS_2026[c.category],
                        opacity: hover && hover !== key ? 0.35 : c.funds.length > 1 ? 0.55 + 0.4 * ((c.funds.indexOf(f) % 2)) : 0.85,
                        borderRight: c.funds.length > 1 ? '1px solid var(--panel)' : 'none',
                        cursor: 'default',
                      }}
                    />
                  )
                })}
              </div>
              {hover && hover.startsWith(c.category + '__') && (
                <div className="muted" style={{ fontSize: 11, marginTop: 3 }}>
                  {hover.slice(c.category.length + 2)} · {fmtUSDFull(c.funds.find((f) => `${c.category}__${f.fund}` === hover)?.appropriation ?? 0)}
                </div>
              )}
            </div>
          )
        })}
      </div>
      <div className="muted" style={{ fontSize: 11, marginTop: 12 }}>
        {categories.length} categories · {NC_2026_APPROPRIATIONS.length} funds/districts · {fmtUSDFull(grandTotal)} total
      </div>
    </div>
  )
}

/** 2025 vs 2026 appropriations, grouped by category — direct year-over-year
 *  comparison while keeping the category grouping visible. */
export function AppropriationsChangeChart() {
  const categories = Array.from(new Set(NC_2025_VS_2026.map((r) => r.category)))
  const by2026 = groupSum(NC_2025_VS_2026, (r) => r.category, (r) => r.appropriation2026)
  const by2025 = groupSum(NC_2025_VS_2026, (r) => r.category, (r) => r.appropriation2025)
  const rows = categories
    .map((cat) => ({ category: cat, v2026: by2026.get(cat) ?? 0, v2025: by2025.get(cat) ?? 0 }))
    .sort((a, b) => b.v2026 - a.v2026)
  const max = Math.max(...rows.map((r) => Math.max(r.v2026, r.v2025)), 1)

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {rows.map((r) => {
          const change = r.v2026 - r.v2025
          const pct = r.v2025 > 0 ? change / r.v2025 : null
          const color = CATEGORY_COLORS_CHANGE[r.category]
          return (
            <div key={r.category}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 5 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 9, height: 9, borderRadius: 2, background: color, flexShrink: 0 }} />
                  {r.category}
                </span>
                <span className="muted" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {fmtUSD(r.v2025)} → {fmtUSD(r.v2026)}
                  {pct != null && <span style={{ marginLeft: 8, color: change >= 0 ? '#3d9c72' : '#ca615f', fontWeight: 600 }}>{fmtPct(pct)}</span>}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="muted" style={{ fontSize: 10, width: 30, flexShrink: 0 }}>2025</span>
                  <div style={{ flex: 1, background: 'var(--panel-2)', borderRadius: 4, height: 12, overflow: 'hidden' }}>
                    <div style={{ width: `${(r.v2025 / max) * 100}%`, height: '100%', background: color, opacity: 0.45, borderRadius: 4 }} />
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="muted" style={{ fontSize: 10, width: 30, flexShrink: 0 }}>2026</span>
                  <div style={{ flex: 1, background: 'var(--panel-2)', borderRadius: 4, height: 12, overflow: 'hidden' }}>
                    <div style={{ width: `${(r.v2026 / max) * 100}%`, height: '100%', background: color, opacity: 0.9, borderRadius: 4 }} />
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** "Financial position" — fund equity (fund balance) at the end of each year,
 *  2019–2024, one line per fund. The town's own multi-year solvency trend. */
export function FundBalanceChart() {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)
  const years = NC_FUND_BALANCE_HISTORY[0].years.map((y) => y.year)
  const funds = NC_FUND_BALANCE_HISTORY.map((f) => f.fund)

  const W = 640, H = 260, PAD = { t: 14, r: 16, b: 24, l: 56 }
  const plotW = W - PAD.l - PAD.r, plotH = H - PAD.t - PAD.b
  const maxV = Math.max(...NC_FUND_BALANCE_HISTORY.flatMap((f) => f.years.map((y) => y.fundEquityEnd)))
  const x = (i: number) => PAD.l + (i / (years.length - 1)) * plotW
  const y = (v: number) => PAD.t + plotH - (v / maxV) * plotH
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(maxV * f))

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }} role="img" aria-label="Fund equity at year end, 2019 to 2024, by fund">
        {yTicks.map((t) => (
          <g key={t}>
            <line x1={PAD.l} y1={y(t)} x2={W - PAD.r} y2={y(t)} stroke="var(--border)" strokeWidth={1} opacity={0.5} />
            <text x={PAD.l - 8} y={y(t) + 3} textAnchor="end" fontSize={10} fill="var(--muted)">{fmtUSD(t)}</text>
          </g>
        ))}
        {years.map((yr, i) => (
          <text key={yr} x={x(i)} y={H - 6} textAnchor="middle" fontSize={10} fill="var(--muted)">{yr}</text>
        ))}
        {NC_FUND_BALANCE_HISTORY.map((f) => {
          const path = f.years.map((yy, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(yy.fundEquityEnd).toFixed(1)}`).join(' ')
          return (
            <g key={f.fund}>
              <path d={path} fill="none" stroke={FUND_COLORS[f.fund]} strokeWidth={f.fund === 'Combined' ? 2.5 : 1.75} opacity={f.fund === 'Combined' ? 1 : 0.85} />
              {f.years.map((yy, i) => (
                <circle key={i} cx={x(i)} cy={y(yy.fundEquityEnd)} r={hoverIdx === i ? 4 : 2.5} fill={FUND_COLORS[f.fund]} />
              ))}
            </g>
          )
        })}
        {years.map((_, i) => (
          <rect key={i} x={x(i) - (plotW / (years.length - 1)) / 2} y={PAD.t} width={plotW / (years.length - 1)} height={plotH}
            fill="transparent" onMouseEnter={() => setHoverIdx(i)} onMouseLeave={() => setHoverIdx(null)} style={{ cursor: 'pointer' }} />
        ))}
        {hoverIdx != null && (
          <line x1={x(hoverIdx)} y1={PAD.t} x2={x(hoverIdx)} y2={PAD.t + plotH} stroke="var(--text)" strokeWidth={1} strokeDasharray="2,2" opacity={0.4} />
        )}
      </svg>
      <div style={{ minHeight: 20, fontSize: 12.5, marginTop: 4 }}>
        {hoverIdx != null ? (
          <span style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 14px' }}>
            <strong>{years[hoverIdx]}</strong>
            {NC_FUND_BALANCE_HISTORY.map((f) => (
              <span key={f.fund}>
                <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: FUND_COLORS[f.fund], marginRight: 4 }} />
                {f.fund}: {fmtUSD(f.years[hoverIdx].fundEquityEnd)}
              </span>
            ))}
          </span>
        ) : (
          <span className="muted">Hover a year for fund-by-fund detail.</span>
        )}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 14px', marginTop: 8 }}>
        {funds.map((f) => (
          <span key={f} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11 }}>
            <span style={{ width: 8, height: 8, borderRadius: 999, background: FUND_COLORS[f], flexShrink: 0 }} />
            <span className="muted">{f}</span>
          </span>
        ))}
      </div>
    </div>
  )
}

/** How the FYE 12/31/25 levy builds up to the 2026 adopted levy under NY's
 *  tax-cap law — the town's own worksheet, as a waterfall. */
export function TaxCapWaterfallChart() {
  const [hover, setHover] = useState<number | null>(null)
  const steps = NC_TAX_CAP_WATERFALL
  let running = 0
  const bars = steps.map((s) => {
    const start = s.kind === 'total' ? 0 : running
    const end = s.kind === 'total' ? s.value : running + s.value
    running = end
    return { ...s, start, end }
  })
  const maxV = Math.max(...bars.map((b) => Math.max(b.start, b.end)))

  const W = 640, H = 260, PAD = { t: 14, r: 8, b: 46, l: 56 }
  const plotW = W - PAD.l - PAD.r, plotH = H - PAD.t - PAD.b
  const bw = plotW / bars.length
  const y = (v: number) => PAD.t + plotH - (v / maxV) * plotH
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(maxV * f))
  const hb = hover != null ? bars[hover] : null

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }} role="img" aria-label="Tax levy build-up from FYE 2025 to the 2026 adopted levy">
        {yTicks.map((t) => (
          <g key={t}>
            <line x1={PAD.l} y1={y(t)} x2={W - PAD.r} y2={y(t)} stroke="var(--border)" strokeWidth={1} opacity={0.5} />
            <text x={PAD.l - 8} y={y(t) + 3} textAnchor="end" fontSize={10} fill="var(--muted)">{fmtUSD(t)}</text>
          </g>
        ))}
        {bars.map((b, i) => {
          const isTotal = b.kind === 'total'
          const isPositive = b.value >= 0
          const color = isTotal ? 'var(--primary)' : isPositive ? '#3d9c72' : '#ca615f'
          const top = y(Math.max(b.start, b.end))
          const bottom = y(Math.min(b.start, b.end))
          const bx = PAD.l + i * bw
          return (
            <g key={b.label}>
              <rect
                x={bx + bw * 0.12} y={top} width={bw * 0.76} height={Math.max(1, bottom - top)}
                fill={color} opacity={hover != null && hover !== i ? 0.35 : 0.85} rx={2}
                onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} style={{ cursor: 'pointer' }}
              />
              {i > 0 && !isTotal && (
                <line x1={bx} y1={y(b.start)} x2={bx + bw * 0.12} y2={y(b.start)} stroke="var(--border)" strokeWidth={1} strokeDasharray="2,2" />
              )}
            </g>
          )
        })}
      </svg>
      {/* Labels below the plot, rotated to fit 10 categories in a narrow card. */}
      <div style={{ display: 'flex', marginTop: 2 }}>
        {bars.map((b) => (
          <div key={b.label} style={{ flex: 1, fontSize: 8.5, textAlign: 'center', lineHeight: 1.2, padding: '0 1px' }} className="muted">
            {b.label}
          </div>
        ))}
      </div>
      <div style={{ minHeight: 20, fontSize: 12.5, marginTop: 8 }}>
        {hb ? (
          <span>
            <strong>{hb.label}</strong>
            <span className="muted"> · {hb.kind === 'total' ? fmtUSDFull(hb.value) : `${hb.value >= 0 ? '+' : ''}${fmtUSDFull(hb.value)}`} · running total {fmtUSDFull(hb.end)}</span>
          </span>
        ) : (
          <span className="muted">Hover a step for the running total.</span>
        )}
      </div>
    </div>
  )
}

/** Simple 2025 vs 2026 comparison for a median-value home's Town tax bill. */
export function HomeownerTaxImpactChart() {
  const d = NC_HOMEOWNER_TAX_IMPACT
  const max = Math.max(d.townTaxes2025, d.townTaxes2026)
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 28, height: 140 }}>
        {[{ label: '2025', value: d.townTaxes2025 }, { label: '2026', value: d.townTaxes2026 }].map((b) => (
          <div key={b.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flex: '0 0 64px' }}>
            <div style={{ fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{fmtUSDFull(b.value)}</div>
            <div
              style={{
                width: 48, height: `${(b.value / max) * 96}px`, borderRadius: '5px 5px 0 0',
                background: b.label === '2026' ? 'var(--primary)' : 'var(--panel-2)',
              }}
            />
            <div className="muted" style={{ fontSize: 12 }}>{b.label}</div>
          </div>
        ))}
        <div style={{ marginLeft: 12, alignSelf: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#ca615f' }}>+{fmtUSDFull(d.increase)}</div>
          <div className="muted" style={{ fontSize: 12 }}>{fmtPct(d.increasePct)} year over year</div>
        </div>
      </div>
      <div className="muted" style={{ fontSize: 11, marginTop: 12 }}>
        On a median ${fmtUSDFull(d.medianHomeValue).slice(1)} home (assessed value {fmtUSDFull(d.assessedValue)}) — Town taxes only; excludes school and county tax bills.
      </div>
    </div>
  )
}

export { NC_2026_BUDGET_SOURCE_NOTE }
