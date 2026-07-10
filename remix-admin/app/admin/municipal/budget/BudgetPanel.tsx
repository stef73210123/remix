'use client'

import { useMemo, useState } from 'react'
import type { TownBudget, BudgetYear, BudgetLine } from '@/lib/municipal/budget'
import { yearToSankey } from '@/lib/municipal/budget'
import Sankey from './Sankey'

function fmtUSD(v: number): string {
  return `$${Math.round(v).toLocaleString('en-US')}`
}
function fmtUSDshort(v: number): string {
  if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(v >= 10_000_000 ? 1 : 2)}M`
  if (Math.abs(v) >= 1_000) return `$${Math.round(v / 1000)}K`
  return `$${Math.round(v)}`
}

const UP = '#3d9c72'
const DOWN = '#ca615f'

/** Year-over-year change chip: direction-coloured, arrowed, exact on hover. */
function DeltaChip({ cur, prev }: { cur: number; prev: number | undefined }) {
  if (prev === undefined) {
    return <span className="badge" style={{ background: 'var(--panel-2)', color: 'var(--muted)', fontSize: 11 }} title="No prior-year figure">new</span>
  }
  if (prev === 0) {
    return <span className="badge" style={{ background: 'var(--panel-2)', color: 'var(--muted)', fontSize: 11 }}>—</span>
  }
  const pct = ((cur - prev) / prev) * 100
  const flat = Math.abs(pct) < 0.05
  const color = flat ? 'var(--muted)' : pct > 0 ? UP : DOWN
  const arrow = flat ? '' : pct > 0 ? '▲' : '▼'
  return (
    <span
      title={`${fmtUSD(cur)} vs ${fmtUSD(prev)} (${pct >= 0 ? '+' : ''}${fmtUSD(cur - prev)})`}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 12, fontWeight: 600,
        color, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap',
      }}
    >
      {arrow} {pct >= 0 ? '+' : ''}{pct.toFixed(1)}%
    </span>
  )
}

function BudgetRow({ line, prev, total, first }: { line: BudgetLine; prev: BudgetLine | undefined; total: number; first: boolean }) {
  const [open, setOpen] = useState(false)
  const hasKids = !!line.children && line.children.length > 0
  const share = total > 0 ? (line.value / total) * 100 : 0
  // Match children to the prior year's same-labelled children for their own YoY.
  const prevKids = useMemo(() => {
    const m = new Map<string, number>()
    ;(prev?.children || []).forEach((c) => m.set(c.label, c.value))
    return m
  }, [prev])

  return (
    <div style={{ borderTop: first ? 'none' : '1px solid var(--border)' }}>
      <div
        onClick={hasKids ? () => setOpen((o) => !o) : undefined}
        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', cursor: hasKids ? 'pointer' : 'default' }}
      >
        <span className="muted" style={{ width: 10, flexShrink: 0, fontSize: 13 }}>{hasKids ? (open ? '▾' : '▸') : ''}</span>
        <span style={{ width: 10, height: 10, borderRadius: 3, flexShrink: 0, background: line.color || 'var(--muted)' }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.3 }}>{line.label}</div>
          <div style={{ marginTop: 5, height: 4, borderRadius: 2, background: 'var(--panel-2)', overflow: 'hidden', maxWidth: 320 }}>
            <div style={{ width: `${share}%`, height: '100%', background: line.color || 'var(--muted)', opacity: 0.7, minWidth: share > 0 ? 2 : 0 }} />
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }} title={fmtUSD(line.value)}>{fmtUSDshort(line.value)}</div>
          <div style={{ marginTop: 2 }}><DeltaChip cur={line.value} prev={prev?.value} /></div>
        </div>
      </div>
      {open && hasKids && (
        <div style={{ background: 'var(--panel-2)', padding: '4px 14px 12px 44px' }}>
          {line.children!.map((c) => {
            const pv = prevKids.get(c.label)
            return (
              <div key={c.label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 0', fontSize: 13 }}>
                <span style={{ flex: 1, minWidth: 0, color: 'var(--muted)' }}>{c.label}</span>
                <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }} title={fmtUSD(c.value)}>{fmtUSDshort(c.value)}</span>
                <span style={{ width: 62, textAlign: 'right' }}><DeltaChip cur={c.value} prev={pv} /></span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Breakdown({ title, lines, prevLines, note }: { title: string; lines: BudgetLine[]; prevLines: BudgetLine[]; note?: string }) {
  const total = useMemo(() => lines.reduce((s, l) => s + l.value, 0), [lines])
  const prevById = useMemo(() => {
    const m = new Map<string, BudgetLine>()
    prevLines.forEach((l) => m.set(l.id, l))
    return m
  }, [prevLines])
  const ranked = useMemo(() => [...lines].sort((a, b) => b.value - a.value), [lines])

  return (
    <div style={{ flex: '1 1 380px', minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
        <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</div>
        <div style={{ fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }} title={fmtUSD(total)}>{fmtUSDshort(total)}</div>
      </div>
      <div className="card" style={{ padding: 0 }}>
        {ranked.map((l, i) => (
          <BudgetRow key={l.id} line={l} prev={prevById.get(l.id)} total={total} first={i === 0} />
        ))}
      </div>
      {note && <div className="muted" style={{ fontSize: 11, marginTop: 6 }}>{note}</div>}
    </div>
  )
}

/**
 * Financial-analysis body for one town: a fiscal-year toggle, the revenue→
 * spending Sankey for the selected year, and revenue/expenditure breakdown
 * lists where every line shows its year-over-year % change and drills down to
 * sub-line detail. Shared by the standalone Budget page and the dashboard.
 */
function scopeShort(scope: string): string {
  return /all/i.test(scope) ? 'All funds' : scope
}

export default function BudgetPanel({ budget }: { budget: TownBudget }) {
  const years = budget.years
  // Distinct scopes (All funds / General Fund) become the toggle; the year is a
  // dropdown of the years available for the chosen scope, newest first.
  const scopes = useMemo(() => [...new Set(years.map((y) => y.scope))], [years])
  const [scope, setScope] = useState(scopes[0] || '')
  const yearsForScope = useMemo(
    () => years.filter((y) => y.scope === scope).sort((a, b) => Number(b.fiscalYear) - Number(a.fiscalYear)),
    [years, scope]
  )
  const [fiscalYear, setFiscalYear] = useState(yearsForScope[0]?.fiscalYear || '')

  const sel: BudgetYear | undefined = yearsForScope.find((y) => y.fiscalYear === fiscalYear) || yearsForScope[0]
  // Prior year within the same scope (like-for-like YoY); may be undefined.
  const prev: BudgetYear | undefined = sel
    ? years.find((y) => y.scope === sel.scope && Number(y.fiscalYear) === Number(sel.fiscalYear) - 1)
    : undefined

  function pickScope(s: string) {
    setScope(s)
    const newest = years.filter((y) => y.scope === s).sort((a, b) => Number(b.fiscalYear) - Number(a.fiscalYear))[0]
    if (newest) setFiscalYear(newest.fiscalYear)
  }

  const { nodes, links } = useMemo(() => (sel ? yearToSankey(sel) : { nodes: [], links: [] }), [sel])

  if (!sel) return <div className="muted" style={{ fontSize: 13, padding: 16 }}>No budget data.</div>

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
        <div className="muted" style={{ fontSize: 13 }}>{budget.townName} · {sel.status}</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          {scopes.length > 1 && (
            <div className="pill-strip" style={{ display: 'flex', gap: 4 }}>
              {scopes.map((s) => (
                <button
                  key={s}
                  onClick={() => pickScope(s)}
                  className="btn secondary"
                  style={{ padding: '5px 12px', fontSize: 13, whiteSpace: 'nowrap', ...(s === scope ? { background: 'var(--primary)', color: '#fff', borderColor: 'var(--primary)' } : {}) }}
                >
                  {scopeShort(s)}
                </button>
              ))}
            </div>
          )}
          {yearsForScope.length > 1 ? (
            <select
              value={sel.fiscalYear}
              onChange={(e) => setFiscalYear(e.target.value)}
              aria-label="Fiscal year"
              style={{ fontSize: 14, padding: '6px 10px', borderRadius: 6, background: 'var(--panel-2)', border: '1px solid var(--border)', color: 'var(--text)' }}
            >
              {yearsForScope.map((y) => (
                <option key={y.fiscalYear} value={y.fiscalYear}>FY {y.fiscalYear}</option>
              ))}
            </select>
          ) : (
            <span className="badge state">FY {sel.fiscalYear}</span>
          )}
        </div>
      </div>

      {sel.note && (
        <div className="muted" style={{ fontSize: 12, marginBottom: 14, lineHeight: 1.5, maxWidth: 760 }}>{sel.note}</div>
      )}

      {budget.placeholder && (
        <div className="card" style={{ padding: '12px 16px', marginBottom: 18, borderColor: 'var(--warn)', color: 'var(--text)', fontSize: 13, lineHeight: 1.5 }}>
          <strong style={{ color: 'var(--warn)' }}>Illustrative figures.</strong> {budget.sourceNote}
        </div>
      )}

      <div className="card" style={{ padding: 20, marginBottom: 20 }}>
        <Sankey nodes={nodes} links={links} totalRevenue={sel.totalRevenue} totalExpenditure={sel.totalExpenditure} />
      </div>

      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
        <Breakdown
          title={`Revenue · FY ${sel.fiscalYear}`}
          lines={sel.revenue}
          prevLines={prev?.revenue || []}
          note={prev ? `▲▼ = change vs FY ${prev.fiscalYear}. Click a source with a marker to see its detail.` : 'Click a source with a marker to see its detail.'}
        />
        <Breakdown
          title={`Expenditures · FY ${sel.fiscalYear}`}
          lines={sel.expense}
          prevLines={prev?.expense || []}
          note={prev ? `▲▼ = change vs FY ${prev.fiscalYear}. Click an area with a marker to break it down.` : 'Click an area with a marker to break it down.'}
        />
      </div>
    </>
  )
}
