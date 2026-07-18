'use client'

import { useMemo, useState } from 'react'
import type { TownBudget, BudgetYear } from '@/lib/municipal/budget'
import { yearToSankey } from '@/lib/municipal/budget'
import Sankey from './Sankey'

/**
 * Financial-analysis body for one town: a fiscal-year toggle and the revenue→
 * spending Sankey for the selected year (click a node marked ⊕ to drill into
 * its detail). Shared by the standalone Budget page and the dashboard.
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
            <select
              value={scope}
              onChange={(e) => pickScope(e.target.value)}
              aria-label="Budget scope"
              style={{ fontSize: 14, padding: '6px 10px', borderRadius: 6, background: 'var(--panel-2)', border: '1px solid var(--border)', color: 'var(--text)' }}
            >
              {scopes.map((s) => (
                <option key={s} value={s}>{scopeShort(s)}</option>
              ))}
            </select>
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

      <div className="card" style={{ padding: 20 }}>
        <Sankey nodes={nodes} links={links} totalRevenue={sel.totalRevenue} totalExpenditure={sel.totalExpenditure} />
      </div>
    </>
  )
}
