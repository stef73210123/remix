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

const selectStyle = { fontSize: 12.5, padding: '4px 9px', borderRadius: 6, background: 'var(--panel-2)', border: '1px solid var(--border)', color: 'var(--text)' } as const

// Fixed categorical order — never cycled or re-assigned when a filter changes
// which categories are present. The two appropriations sheets group funds
// into slightly different categories, so each gets its own map.
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

function Caret({ open }: { open: boolean }) {
  return (
    <span style={{ display: 'inline-block', width: 10, fontSize: 10, transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}>
      ▸
    </span>
  )
}

type ApproMode = '2026' | 'change'
const APPROP_MODES: { value: ApproMode; label: string }[] = [
  { value: '2026', label: '2026 detail, by fund' },
  { value: 'change', label: '2025 → 2026 change' },
]

/** Appropriations, as a single drill-down list rather than two always-open
 *  charts: category rows are condensed to one bar each (the composition or
 *  the year-over-year comparison, depending on the mode picked from the
 *  dropdown), and a category expands in place to reveal its individual
 *  funds/districts — the hierarchy the source sheets actually have, without
 *  the clutter of a segmented stacked bar or a treemap/sunburst. */
export function AppropriationsExplorer() {
  const [mode, setMode] = useState<ApproMode>('2026')
  const [openCategory, setOpenCategory] = useState<string | null>(null)

  const toggle = (cat: string) => setOpenCategory((c) => (c === cat ? null : cat))

  const header = (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
      <select
        value={mode}
        onChange={(e) => { setMode(e.target.value as ApproMode); setOpenCategory(null) }}
        aria-label="Appropriations view"
        style={selectStyle}
      >
        {APPROP_MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
      </select>
    </div>
  )

  if (mode === '2026') {
    const categories = Array.from(new Set(NC_2026_APPROPRIATIONS.map((r) => r.category)))
    const byCategory = categories
      .map((cat) => {
        const funds = NC_2026_APPROPRIATIONS.filter((r) => r.category === cat)
        return { category: cat, total: funds.reduce((s, f) => s + f.appropriation, 0), funds }
      })
      .sort((a, b) => b.total - a.total)
    const grandTotal = byCategory.reduce((s, c) => s + c.total, 0)
    const max = Math.max(...byCategory.map((c) => c.total), 1)

    return (
      <div>
        {header}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {byCategory.map((c) => {
            const open = openCategory === c.category
            return (
              <div key={c.category}>
                <button
                  onClick={() => toggle(c.category)}
                  aria-expanded={open}
                  style={{ all: 'unset', cursor: 'pointer', display: 'block', width: '100%', padding: '6px 0', boxSizing: 'border-box' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 4 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <Caret open={open} />
                      <span style={{ width: 9, height: 9, borderRadius: 2, background: CATEGORY_COLORS_2026[c.category], flexShrink: 0 }} />
                      {c.category}
                      <span className="muted" style={{ fontWeight: 400 }}>· {c.funds.length} fund{c.funds.length > 1 ? 's' : ''}</span>
                    </span>
                    <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{fmtUSD(c.total)}</span>
                  </div>
                  <div style={{ height: 8, borderRadius: 4, background: 'var(--panel-2)', overflow: 'hidden' }}>
                    <div style={{ width: `${Math.max((c.total / max) * 100, 1.5)}%`, height: '100%', background: CATEGORY_COLORS_2026[c.category], opacity: 0.85 }} />
                  </div>
                </button>
                {open && (
                  <div style={{ paddingLeft: 24, marginTop: 6, marginBottom: 8, display: 'flex', flexDirection: 'column', gap: 9 }}>
                    {c.funds.map((f) => (
                      <div key={f.fund} style={{ fontSize: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                          <span>{f.fund} <span className="muted">· {f.code}</span></span>
                          <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{fmtUSD(f.appropriation)}</span>
                        </div>
                        <div className="muted" style={{ fontSize: 11, marginTop: 2, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                          <span>Revenue {fmtUSD(f.revenue)}</span>
                          <span>Fund balance used {fmtUSD(f.appropriatedFundBalance)}</span>
                          <span>Tax levy {fmtUSD(f.taxLevy)}</span>
                        </div>
                      </div>
                    ))}
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

  // mode === 'change'
  const categories = Array.from(new Set(NC_2025_VS_2026.map((r) => r.category)))
  const by2026 = groupSum(NC_2025_VS_2026, (r) => r.category, (r) => r.appropriation2026)
  const by2025 = groupSum(NC_2025_VS_2026, (r) => r.category, (r) => r.appropriation2025)
  const rows = categories
    .map((cat) => ({
      category: cat, v2026: by2026.get(cat) ?? 0, v2025: by2025.get(cat) ?? 0,
      funds: NC_2025_VS_2026.filter((r) => r.category === cat),
    }))
    .sort((a, b) => b.v2026 - a.v2026)
  const grandTotal2026 = rows.reduce((s, r) => s + r.v2026, 0)
  const grandTotal2025 = rows.reduce((s, r) => s + r.v2025, 0)
  const grandChange = grandTotal2025 > 0 ? (grandTotal2026 - grandTotal2025) / grandTotal2025 : null
  const max = Math.max(...rows.map((r) => Math.max(r.v2026, r.v2025)), 1)

  return (
    <div>
      {header}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {rows.map((r) => {
          const change = r.v2026 - r.v2025
          const pct = r.v2025 > 0 ? change / r.v2025 : null
          const color = CATEGORY_COLORS_CHANGE[r.category]
          const open = openCategory === r.category
          return (
            <div key={r.category}>
              <button
                onClick={() => toggle(r.category)}
                aria-expanded={open}
                style={{ all: 'unset', cursor: 'pointer', display: 'block', width: '100%', padding: '6px 0', boxSizing: 'border-box' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 5 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <Caret open={open} />
                    <span style={{ width: 9, height: 9, borderRadius: 2, background: color, flexShrink: 0 }} />
                    {r.category}
                  </span>
                  <span className="muted" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {fmtUSD(r.v2025)} → {fmtUSD(r.v2026)}
                    {pct != null && <span style={{ marginLeft: 8, color: change >= 0 ? '#3d9c72' : '#ca615f', fontWeight: 600 }}>{fmtPct(pct)}</span>}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 3 }}>
                  <div style={{ flex: 1, background: 'var(--panel-2)', borderRadius: 4, height: 8, overflow: 'hidden' }}>
                    <div style={{ width: `${(r.v2025 / max) * 100}%`, height: '100%', background: color, opacity: 0.45 }} />
                  </div>
                  <div style={{ flex: 1, background: 'var(--panel-2)', borderRadius: 4, height: 8, overflow: 'hidden' }}>
                    <div style={{ width: `${(r.v2026 / max) * 100}%`, height: '100%', background: color, opacity: 0.9 }} />
                  </div>
                </div>
              </button>
              {open && (
                <div style={{ paddingLeft: 24, marginTop: 6, marginBottom: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {r.funds.map((f) => {
                    const fchange = f.appropriation2026 - f.appropriation2025
                    const fpct = f.appropriation2025 > 0 ? fchange / f.appropriation2025 : null
                    return (
                      <div key={f.fund} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, gap: 8 }}>
                        <span>{f.fund} <span className="muted">· {f.code}</span></span>
                        <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                          {fmtUSD(f.appropriation2025)} → {fmtUSD(f.appropriation2026)}
                          {fpct != null && <span className="muted" style={{ marginLeft: 6 }}>{fmtPct(fpct)}</span>}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
      <div className="muted" style={{ fontSize: 11, marginTop: 12 }}>
        {fmtUSDFull(grandTotal2025)} → {fmtUSDFull(grandTotal2026)}
        {grandChange != null && <strong style={{ marginLeft: 6, color: grandChange >= 0 ? '#3d9c72' : '#ca615f' }}> {fmtPct(grandChange)}</strong>}
      </div>
    </div>
  )
}

/** "Financial position" — fund equity (fund balance) at the end of each year,
 *  2019–2024, one line per fund, with an expandable panel that breaks a
 *  chosen fund's equity down into restricted vs. free (unrestricted) reserve
 *  — the town's own solvency detail, previously unused. */
export function FundBalanceChart() {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)
  const [inspectFund, setInspectFund] = useState('Combined')
  const [showReserve, setShowReserve] = useState(false)
  const years = NC_FUND_BALANCE_HISTORY[0].years.map((y) => y.year)
  const funds = NC_FUND_BALANCE_HISTORY.map((f) => f.fund)

  const W = 640, H = 260, PAD = { t: 14, r: 16, b: 24, l: 56 }
  const plotW = W - PAD.l - PAD.r, plotH = H - PAD.t - PAD.b
  const maxV = Math.max(...NC_FUND_BALANCE_HISTORY.flatMap((f) => f.years.map((y) => y.fundEquityEnd)))
  const x = (i: number) => PAD.l + (i / (years.length - 1)) * plotW
  const y = (v: number) => PAD.t + plotH - (v / maxV) * plotH
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(maxV * f))

  const inspected = NC_FUND_BALANCE_HISTORY.find((f) => f.fund === inspectFund) ?? NC_FUND_BALANCE_HISTORY[NC_FUND_BALANCE_HISTORY.length - 1]
  const reserveMax = Math.max(...inspected.years.map((yy) => yy.fundEquityEnd), 1)

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

      <div style={{ marginTop: 14, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
        <button
          onClick={() => setShowReserve((s) => !s)}
          aria-expanded={showReserve}
          style={{ all: 'unset', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 600 }}
        >
          <Caret open={showReserve} /> Reserve composition — restricted vs. free balance
        </button>
        {showReserve && (
          <div style={{ marginTop: 10 }}>
            <select
              value={inspectFund}
              onChange={(e) => setInspectFund(e.target.value)}
              aria-label="Fund to inspect"
              style={{ ...selectStyle, marginBottom: 10 }}
            >
              {funds.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {inspected.years.map((yy) => (
                <div key={yy.year} style={{ fontSize: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                    <span>{yy.year}</span>
                    <span className="muted">{fmtUSD(yy.fundEquityEnd)} total · {(yy.unrestrictedPctOfExpenditures * 100).toFixed(0)}% of expenditures unrestricted</span>
                  </div>
                  <div style={{ display: 'flex', height: 10, borderRadius: 4, overflow: 'hidden', background: 'var(--panel-2)', width: `${Math.max((yy.fundEquityEnd / reserveMax) * 100, 1.5)}%` }}>
                    {yy.nonspendableRestricted > 0 && (
                      <div style={{ width: `${(yy.nonspendableRestricted / yy.fundEquityEnd) * 100}%`, background: '#c9973f', opacity: 0.8 }} title={`Non-spendable/restricted: ${fmtUSDFull(yy.nonspendableRestricted)}`} />
                    )}
                    <div style={{ flex: 1, background: FUND_COLORS[inspected.fund], opacity: 0.85 }} title={`Assigned/unrestricted: ${fmtUSDFull(yy.assignedUnrestricted)}`} />
                  </div>
                </div>
              ))}
            </div>
            <div className="muted" style={{ fontSize: 11, marginTop: 8, display: 'flex', gap: 12 }}>
              <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: '#c9973f', marginRight: 4 }} />Non-spendable / restricted</span>
              <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: FUND_COLORS[inspected.fund], marginRight: 4 }} />Assigned / unrestricted (free reserve)</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const WATERFALL_TOTAL_STEPS = NC_TAX_CAP_WATERFALL.filter((s) => s.kind === 'total')

/** How the FYE 12/31/25 levy builds up to the 2026 adopted levy under NY's
 *  tax-cap law — the town's own worksheet. Opens condensed to the three
 *  checkpoint totals; the full 10-step build-up (each cap adjustment and the
 *  voted override) expands on demand. */
export function TaxCapWaterfallChart() {
  const [hover, setHover] = useState<number | null>(null)
  const [expanded, setExpanded] = useState(false)
  const steps = expanded ? NC_TAX_CAP_WATERFALL : WATERFALL_TOTAL_STEPS
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
      {/* Labels below the plot — small/rotated-feeling text to fit up to 10
          categories in a narrow card. */}
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
      <button
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
        style={{ all: 'unset', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, marginTop: 10 }}
      >
        <Caret open={expanded} /> {expanded ? 'Show the 3 checkpoint totals only' : `Show the full ${NC_TAX_CAP_WATERFALL.length}-step build-up`}
      </button>
    </div>
  )
}

/** Median-home Town-tax impact, as a stat tile rather than a chart — a single
 *  before/after comparison is better read as a number than as two bars. */
export function HomeownerTaxImpactStat() {
  const d = NC_HOMEOWNER_TAX_IMPACT
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 30, fontWeight: 700, color: '#ca615f' }}>+{fmtUSDFull(d.increase)}</span>
        <span style={{ fontSize: 16, fontWeight: 600, color: '#ca615f' }}>{fmtPct(d.increasePct)}</span>
        <span className="muted" style={{ fontSize: 12.5 }}>year over year</span>
      </div>
      <div style={{ marginTop: 12, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className="muted">{fmtUSDFull(d.townTaxes2025)}</span>
        <span className="muted">→</span>
        <span style={{ fontWeight: 700 }}>{fmtUSDFull(d.townTaxes2026)}</span>
      </div>
      <div className="muted" style={{ fontSize: 11, marginTop: 12 }}>
        On a median ${fmtUSDFull(d.medianHomeValue).slice(1)} home (assessed value {fmtUSDFull(d.assessedValue)}) — Town taxes only; excludes school and county tax bills.
      </div>
    </div>
  )
}

export { NC_2026_BUDGET_SOURCE_NOTE }
