'use client'

import { Fragment, useState } from 'react'
import {
  NC_2025_VS_2026, NC_FUND_BALANCE_HISTORY,
  NC_TAX_CAP_WATERFALL, NC_HOMEOWNER_TAX_IMPACT, NC_2026_BUDGET_SOURCE_NOTE,
  NC_BOND_PROFILE, NC_BOND_ISSUES, NC_BOND_SOURCE_NOTE,
  NC_TOP_TAXPAYERS, NC_TOP_TAXPAYERS_TOTALS, NC_TOP_TAXPAYERS_SOURCE_NOTE,
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

export function Caret({ open }: { open: boolean }) {
  return (
    <span style={{ display: 'inline-block', width: 10, fontSize: 10, transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}>
      ▸
    </span>
  )
}

interface TreemapRect { x: number; y: number; w: number; h: number }

/** Squarified treemap layout (Bruls/Huizing/van Wijk) — lays out `items`
 *  (pre-sorted descending by `.value`) into the box (x, y, w, h), each row
 *  filling the box's shorter dimension so cells stay close to square rather
 *  than degenerating into slivers. */
function squarify<T extends { value: number }>(items: T[], x: number, y: number, w: number, h: number): (T & TreemapRect)[] {
  const total = items.reduce((s, it) => s + it.value, 0)
  const area = w * h
  const scaled = items.map((it) => ({ ...it, area: total > 0 ? (it.value / total) * area : 0 }))
  const result: (T & TreemapRect)[] = []
  let remaining = scaled
  let rx = x, ry = y, rw = w, rh = h

  const rowSum = (row: typeof scaled) => row.reduce((s, it) => s + it.area, 0)
  const worst = (row: typeof scaled, side: number) => {
    if (!row.length) return Infinity
    const sum = rowSum(row)
    const rmax = Math.max(...row.map((it) => it.area))
    const rmin = Math.min(...row.map((it) => it.area))
    const sideSq = side * side
    const sumSq = sum * sum
    return Math.max((sideSq * rmax) / sumSq, sumSq / (sideSq * rmin))
  }

  while (remaining.length) {
    const side = Math.min(rw, rh)
    let row = [remaining[0]]
    let i = 1
    while (i < remaining.length) {
      const next = [...row, remaining[i]]
      if (worst(next, side) <= worst(row, side)) { row = next; i++ } else break
    }
    const rowArea = rowSum(row)
    if (rw <= rh) {
      const stripH = rw > 0 ? rowArea / rw : 0
      let cx = rx
      for (const it of row) {
        const iw = stripH > 0 ? it.area / stripH : 0
        result.push({ ...it, x: cx, y: ry, w: iw, h: stripH })
        cx += iw
      }
      ry += stripH
      rh -= stripH
    } else {
      const stripW = rh > 0 ? rowArea / rh : 0
      let cy = ry
      for (const it of row) {
        const ih = stripW > 0 ? it.area / stripW : 0
        result.push({ ...it, x: rx, y: cy, w: stripW, h: ih })
        cy += ih
      }
      rx += stripW
      rw -= stripW
    }
    remaining = remaining.slice(row.length)
  }
  return result
}

/** Diverging fill for a % year-over-year change — green growth, red decline,
 *  a fixed neutral gray at 0%, scaled by magnitude (capped at ±15%) rather
 *  than blended toward the page background, so even a near-zero box reads
 *  as a visible, legible neutral tile instead of an almost-blank one. */
function yoyColor(pct: number): string {
  const cap = 0.15
  const t = Math.min(Math.abs(pct) / cap, 1)
  const hue = pct >= 0 ? '#3d9c72' : '#ca615f'
  return `color-mix(in srgb, ${hue} ${Math.round(t * 100)}%, #93a0ad)`
}

/** Appropriations, as a treemap sized by 2026 value and colored by
 *  year-over-year change, with a category list below it (also the
 *  treemap's table-view fallback, since a couple of the smaller categories
 *  are too small to show a size-legible box) that expands in place to each
 *  category's individual funds/districts. */
export function AppropriationsExplorer() {
  const [openCategory, setOpenCategory] = useState<string | null>(null)
  const [hoverCategory, setHoverCategory] = useState<string | null>(null)

  const toggle = (cat: string) => setOpenCategory((c) => (c === cat ? null : cat))

  const categories = Array.from(new Set(NC_2025_VS_2026.map((r) => r.category)))
  const by2026 = groupSum(NC_2025_VS_2026, (r) => r.category, (r) => r.appropriation2026)
  const by2025 = groupSum(NC_2025_VS_2026, (r) => r.category, (r) => r.appropriation2025)
  const rows = categories
    .map((cat) => {
      const value = by2026.get(cat) ?? 0
      const v2025 = by2025.get(cat) ?? 0
      return {
        category: cat, value, v2025,
        yoy: v2025 > 0 ? (value - v2025) / v2025 : 0,
        funds: NC_2025_VS_2026.filter((r) => r.category === cat),
      }
    })
    .sort((a, b) => b.value - a.value)
  const grandTotal = rows.reduce((s, r) => s + r.value, 0)

  const TM_W = 640, TM_H = 200
  const rects = squarify(rows, 0, 0, TM_W, TM_H)

  return (
    <div>
      <div style={{ position: 'relative', width: '100%', aspectRatio: `${TM_W} / ${TM_H}`, marginBottom: 12 }}>
        {rects.map((r) => {
          const pctOfTotal = grandTotal > 0 ? r.value / grandTotal : 0
          const big = r.w > 90 && r.h > 46
          const medium = !big && r.w > 46 && r.h > 20
          const isHover = hoverCategory === r.category
          return (
            <div
              key={r.category}
              onMouseEnter={() => setHoverCategory(r.category)}
              onMouseLeave={() => setHoverCategory((c) => (c === r.category ? null : c))}
              onClick={() => toggle(r.category)}
              title={`${r.category}: ${fmtUSDFull(r.value)} · ${(pctOfTotal * 100).toFixed(1)}% of total · ${fmtPct(r.yoy)} YoY`}
              style={{
                position: 'absolute',
                left: `${(r.x / TM_W) * 100}%`, top: `${(r.y / TM_H) * 100}%`,
                width: `${(r.w / TM_W) * 100}%`, height: `${(r.h / TM_H) * 100}%`,
                boxSizing: 'border-box', border: '2px solid var(--panel)',
                background: yoyColor(r.yoy), cursor: 'pointer',
                opacity: hoverCategory && !isHover ? 0.55 : 1,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                padding: 4, overflow: 'hidden', textAlign: 'center', transition: 'opacity 0.1s',
              }}
            >
              {(big || medium) && (
                <div style={{ fontSize: big ? 12.5 : 11, fontWeight: 700, color: '#fff', lineHeight: 1.25, textShadow: '0 1px 2px rgba(0,0,0,0.4)' }}>
                  {r.category}
                </div>
              )}
              {big && (
                <>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginTop: 2, textShadow: '0 1px 2px rgba(0,0,0,0.4)' }}>{fmtUSD(r.value)}</div>
                  <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.92)', marginTop: 1, textShadow: '0 1px 2px rgba(0,0,0,0.4)' }}>
                    {(pctOfTotal * 100).toFixed(1)}% of total · {fmtPct(r.yoy)} YoY
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>

      <div className="muted" style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10, flexWrap: 'wrap' }}>
        <span><span style={{ display: 'inline-block', width: 20, height: 8, borderRadius: 2, background: yoyColor(0.15), marginRight: 4, verticalAlign: 'middle' }} />Growth</span>
        <span><span style={{ display: 'inline-block', width: 20, height: 8, borderRadius: 2, background: yoyColor(0), marginRight: 4, verticalAlign: 'middle' }} />Flat</span>
        <span><span style={{ display: 'inline-block', width: 20, height: 8, borderRadius: 2, background: yoyColor(-0.15), marginRight: 4, verticalAlign: 'middle' }} />Decline</span>
        <span style={{ marginLeft: 'auto' }}>Box size = share of {fmtUSDFull(grandTotal)} total</span>
      </div>

      {/* Doubles as the treemap's table view — the smallest 2-3 categories
          can't fit a legible box label, so every category's full value / %
          of total / % YoY is always available here regardless of box size. */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {rows.map((r) => {
          const open = openCategory === r.category
          const pctOfTotal = grandTotal > 0 ? r.value / grandTotal : 0
          return (
            <div key={r.category}>
              <button
                onClick={() => toggle(r.category)}
                onMouseEnter={() => setHoverCategory(r.category)}
                onMouseLeave={() => setHoverCategory((c) => (c === r.category ? null : c))}
                aria-expanded={open}
                style={{
                  all: 'unset', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  width: '100%', padding: '6px 4px', boxSizing: 'border-box', fontSize: 12.5, borderRadius: 4,
                  background: hoverCategory === r.category ? 'var(--panel-2)' : undefined,
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Caret open={open} />
                  <span style={{ width: 9, height: 9, borderRadius: 2, background: yoyColor(r.yoy), flexShrink: 0 }} />
                  {r.category}
                </span>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                  <span style={{ fontWeight: 600 }}>{fmtUSD(r.value)}</span>
                  <span className="muted" style={{ marginLeft: 8 }}>{(pctOfTotal * 100).toFixed(1)}% of total</span>
                  <span style={{ marginLeft: 8, fontWeight: 600, color: r.yoy >= 0 ? '#3d9c72' : '#ca615f' }}>{fmtPct(r.yoy)} YoY</span>
                </span>
              </button>
              {open && (
                <div style={{ paddingLeft: 24, marginTop: 4, marginBottom: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {r.funds.map((f) => {
                    const fyoy = f.appropriation2025 > 0 ? (f.appropriation2026 - f.appropriation2025) / f.appropriation2025 : null
                    const fpctOfCategory = r.value > 0 ? f.appropriation2026 / r.value : 0
                    return (
                      <div key={f.fund} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, gap: 8 }}>
                        <span>{f.fund} <span className="muted">· {f.code}</span></span>
                        <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                          {fmtUSD(f.appropriation2026)}
                          <span className="muted" style={{ marginLeft: 6 }}>{(fpctOfCategory * 100).toFixed(0)}% of category</span>
                          {fyoy != null && <span className="muted" style={{ marginLeft: 6 }}>{fmtPct(fyoy)} YoY</span>}
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
        {categories.length} categories · {NC_2025_VS_2026.length} funds/districts · {fmtUSDFull(grandTotal)} total
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
 *  tax-cap law — the town's own worksheet. Shown as a 3-stage stepper (the
 *  checkpoint totals, connected by the rate of change alone — a waterfall's
 *  floating bars added visual noise without adding information a plain %
 *  doesn't already give); the individual cap-law adjustments and the voted
 *  override expand below as a plain ledger, which reads the actual line-item
 *  arithmetic more clearly than bars ever could, especially the smaller
 *  adjustments that were barely visible as bars. */
export function TaxLevyBuildup() {
  const [expanded, setExpanded] = useState(false)
  const [start, limit, adopted] = WATERFALL_TOTAL_STEPS
  const capGrowthPct = (limit.value - start.value) / start.value
  const overridePct = (adopted.value - limit.value) / limit.value
  const totalPct = (adopted.value - start.value) / start.value

  let running = 0
  const ledger = NC_TAX_CAP_WATERFALL.map((s) => {
    running = s.kind === 'total' ? s.value : running + s.value
    return { ...s, running }
  })

  const stages = [
    { label: 'FYE 12/31/25 levy', value: start.value },
    { label: 'Tax Levy Limit (cap)', value: limit.value },
    { label: '2026 Adopted Levy', value: adopted.value },
  ]
  const connectors = [capGrowthPct, overridePct]

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'stretch', gap: 2 }}>
        {stages.map((s, i) => (
          <Fragment key={s.label}>
            <div style={{ flex: '1 1 0', textAlign: 'center', padding: '4px 2px' }}>
              <div className="muted" style={{ fontSize: 11 }}>{s.label}</div>
              <div style={{ fontSize: 19, fontWeight: 700, marginTop: 3, fontVariantNumeric: 'tabular-nums' }}>{fmtUSD(s.value)}</div>
            </div>
            {i < stages.length - 1 && (
              <div style={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 6px' }}>
                <span style={{ fontSize: 15, color: 'var(--muted)' }}>→</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: connectors[i] >= 0 ? '#3d9c72' : '#ca615f', whiteSpace: 'nowrap' }}>
                  {fmtPct(connectors[i])}
                </span>
              </div>
            )}
          </Fragment>
        ))}
      </div>
      <div className="muted" style={{ fontSize: 11.5, marginTop: 10, textAlign: 'center' }}>
        {fmtPct(totalPct)} year over year, including the voted override
      </div>

      <div style={{ marginTop: 14, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
        <button
          onClick={() => setExpanded((e) => !e)}
          aria-expanded={expanded}
          style={{ all: 'unset', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600 }}
        >
          <Caret open={expanded} /> {expanded ? 'Hide the build-up detail' : 'Show how the cap and override are calculated'}
        </button>
        {expanded && (
          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {ledger.map((s) => (
              <div
                key={s.label}
                style={{
                  display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 12.5, padding: '5px 0',
                  borderTop: s.kind === 'total' ? '1px solid var(--border)' : 'none',
                  fontWeight: s.kind === 'total' ? 700 : 400,
                }}
              >
                <span>{s.label}</span>
                <span style={{ fontVariantNumeric: 'tabular-nums', color: s.kind === 'delta' ? (s.value >= 0 ? '#3d9c72' : '#ca615f') : undefined }}>
                  {s.kind === 'total' ? fmtUSDFull(s.value) : `${s.value >= 0 ? '+' : ''}${fmtUSDFull(s.value)}`}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
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

/** The Town's outstanding bonds and credit standing — Moody's rating, the
 *  debt snapshot at 12/31/2025, and constitutional debt-limit capacity — with
 *  the individual bond issues as an expandable ledger (mirrors
 *  TaxLevyBuildup's ledger pattern). Shown above the Bond Simulator so a
 *  resident sees where the Town's actual debt stands before modeling a
 *  hypothetical new bond. */
export function BondRatingProfile() {
  const [expanded, setExpanded] = useState(false)
  const p = NC_BOND_PROFILE

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
        <span style={{ fontSize: 26, fontWeight: 700 }}>Moody&rsquo;s {p.moodysRating}</span>
        <span className="muted" style={{ fontSize: 13 }}>Outlook: {p.outlook} · reaffirmed {p.moodysReaffirmedYear}</span>
      </div>
      <div className="muted" style={{ fontSize: 12, lineHeight: 1.5, marginBottom: 16, maxWidth: 640 }}>
        {p.bondSecurity}. NYCLASS, the Town&rsquo;s investment pool for bond proceeds, is rated {p.nyclassRating}.
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
        <div className="card" style={{ padding: 14, background: 'var(--panel-2)' }}>
          <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total bonded debt</div>
          <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>{fmtUSDFull(p.totalBondedDebt)}</div>
          <div className="muted" style={{ fontSize: 11.5, marginTop: 4 }}>
            {p.numberOfIssues} issues · {fmtUSDFull(p.totalLongTermDebt)} incl. unamortized premium
          </div>
        </div>
        <div className="card" style={{ padding: 14, background: 'var(--panel-2)' }}>
          <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>2026 debt service</div>
          <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>{fmtUSDFull(p.debtService2026)}</div>
          <div className="muted" style={{ fontSize: 11.5, marginTop: 4 }}>
            {(p.debtServicePctNoncapital2026 * 100).toFixed(1)}% of noncapital expenditures, down from {(p.debtServicePctNoncapital2024 * 100).toFixed(1)}% in 2024
          </div>
        </div>
        <div className="card" style={{ padding: 14, background: 'var(--panel-2)' }}>
          <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Debt-limit utilization</div>
          <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>{(p.debtLimitUtilizationPct * 100).toFixed(2)}%</div>
          <div className="muted" style={{ fontSize: 11.5, marginTop: 4 }}>
            {fmtUSDFull(p.remainingCapacity)} remaining of a {fmtUSDFull(p.debtLimit)} constitutional limit
          </div>
        </div>
      </div>

      <div className="muted" style={{ fontSize: 11, marginTop: 12 }}>
        Final maturity {p.finalMaturityYear} · interest rates {p.interestRateRangeLow.toFixed(3)}%–{p.interestRateRangeHigh.toFixed(2)}% · no bond anticipation notes outstanding.
      </div>

      <div style={{ marginTop: 14, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
        <button
          onClick={() => setExpanded((e) => !e)}
          aria-expanded={expanded}
          style={{ all: 'unset', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600 }}
        >
          <Caret open={expanded} /> {expanded ? 'Hide individual bond issues' : `Show the ${NC_BOND_ISSUES.length} individual bond issues`}
        </button>
        {expanded && (
          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {NC_BOND_ISSUES.map((b, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 12.5, padding: '5px 0' }}>
                <span>{b.purpose} <span className="muted">· {b.yearIssued}–{b.maturity} · {b.rate}</span></span>
                <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{fmtUSDFull(b.balance)}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, padding: '5px 0', borderTop: '1px solid var(--border)', fontWeight: 700 }}>
              <span>Total</span>
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmtUSDFull(p.totalBondedDebt)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/** Top 50 Taxpayers — a scrollable ranked list rather than a chart, since 50
 *  rows of owner/value/share reads far better as a scannable table than any
 *  chart form would. The source schedule's own "% of Roll" column is
 *  actually the percent of this Top-50 subtotal (verified: summing it
 *  reproduces the sheet's own 100.00% subtotal row), not of the Town's full
 *  taxable roll — labeled "% of Top 50" here to keep that unambiguous. */
export function TopTaxpayersList() {
  const t = NC_TOP_TAXPAYERS_TOTALS
  const rollSharePct = t.rollAssessedValue > 0 ? t.top50AssessedValue / t.rollAssessedValue : 0

  return (
    <div>
      <div className="muted" style={{ fontSize: 11.5, marginBottom: 10, lineHeight: 1.5 }}>
        The 50 largest property owners carry {fmtUSDFull(t.top50AssessedValue)} of assessed value across {t.top50Parcels} parcels
        — {(rollSharePct * 100).toFixed(1)}% of the Town&rsquo;s entire {fmtUSDFull(t.rollAssessedValue)} taxable assessment roll.
      </div>
      <div style={{ maxHeight: 420, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 8 }}>
        <div
          style={{
            position: 'sticky', top: 0, zIndex: 1, display: 'flex', gap: 8, alignItems: 'center',
            padding: '7px 10px', fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em',
            color: 'var(--muted)', background: 'var(--panel)', borderBottom: '1px solid var(--border)',
          }}
        >
          <span style={{ width: 22, flexShrink: 0 }}>#</span>
          <span style={{ flex: 1 }}>Owner</span>
          <span style={{ width: 92, textAlign: 'right', flexShrink: 0 }}>Assessed</span>
          <span style={{ width: 66, textAlign: 'right', flexShrink: 0 }}>% Top 50</span>
        </div>
        {NC_TOP_TAXPAYERS.map((row) => {
          const caption = [row.notes, row.parcels > 1 ? `${row.parcels} parcels` : null].filter(Boolean).join(' · ')
          return (
            <div
              key={row.rank}
              style={{
                display: 'flex', gap: 8, alignItems: 'flex-start', padding: '7px 10px', fontSize: 12.5,
                borderBottom: row.rank < NC_TOP_TAXPAYERS.length ? '1px solid var(--border)' : 'none',
              }}
            >
              <span className="muted" style={{ width: 22, flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>{row.rank}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                {row.owner}
                {caption && <div className="muted" style={{ fontSize: 11, marginTop: 1 }}>{caption}</div>}
              </span>
              <span style={{ width: 92, textAlign: 'right', flexShrink: 0, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                {fmtUSDFull(row.assessedValue)}
              </span>
              <span className="muted" style={{ width: 66, textAlign: 'right', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
                {((row.assessedValue / t.top50AssessedValue) * 100).toFixed(2)}%
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export { NC_2026_BUDGET_SOURCE_NOTE, NC_BOND_SOURCE_NOTE, NC_TOP_TAXPAYERS_SOURCE_NOTE }
