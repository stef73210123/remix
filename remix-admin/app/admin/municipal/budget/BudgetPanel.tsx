'use client'

import { useMemo, useState } from 'react'
import type { TownBudget } from '@/lib/municipal/budget'
import Sankey from './Sankey'

function fmtUSD(v: number): string {
  return `$${v.toLocaleString('en-US')}`
}

/**
 * The financial-analysis body for one town: summary line, placeholder banner,
 * Sankey diagram and an optional revenue/spending table. Shared by the
 * standalone Budget page and the inline section on the Municipal dashboard.
 */
export default function BudgetPanel({ budget }: { budget: TownBudget }) {
  const [showTable, setShowTable] = useState(false)

  const { revenue, spending, total } = useMemo(() => {
    const out = (id: string) => budget.links.filter((l) => l.source === id).reduce((s, l) => s + l.value, 0)
    const inc = (id: string) => budget.links.filter((l) => l.target === id).reduce((s, l) => s + l.value, 0)
    const revenue = budget.nodes
      .filter((n) => n.layer === 0)
      .map((n) => ({ label: n.label, color: n.color, value: out(n.id) }))
      .sort((a, b) => b.value - a.value)
    const spending = budget.nodes
      .filter((n) => n.layer === 2)
      .map((n) => ({ label: n.label, color: n.color, value: inc(n.id) }))
      .sort((a, b) => b.value - a.value)
    const total = revenue.reduce((s, r) => s + r.value, 0)
    return { revenue, spending, total }
  }, [budget])

  return (
    <>
      <div className="muted" style={{ fontSize: 13, marginBottom: 12 }}>
        {budget.townName} · FY {budget.fiscalYear} · total {fmtUSD(total)}
      </div>

      {budget.placeholder && (
        <div
          className="card"
          style={{ padding: '12px 16px', marginBottom: 18, borderColor: 'var(--warn)', color: 'var(--text)', fontSize: 13 }}
        >
          <strong style={{ color: 'var(--warn)' }}>Placeholder data.</strong> {budget.sourceNote}
        </div>
      )}

      <div className="card" style={{ padding: 20, marginBottom: 14 }}>
        <Sankey nodes={budget.nodes} links={budget.links} />
      </div>

      <button className="btn secondary" onClick={() => setShowTable((v) => !v)} style={{ marginBottom: 14 }}>
        {showTable ? 'Hide table view' : 'Show table view'}
      </button>

      {showTable && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          <div className="card table-card">
            <table>
              <thead><tr><th>Revenue source</th><th style={{ textAlign: 'right' }}>Amount</th><th style={{ width: 60, textAlign: 'right' }}>%</th></tr></thead>
              <tbody>
                {revenue.map((r) => (
                  <tr key={r.label}>
                    <td>
                      <span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: 2, background: r.color ?? '#7a8590', marginRight: 8 }} />
                      {r.label}
                    </td>
                    <td style={{ textAlign: 'right', fontSize: 13, whiteSpace: 'nowrap' }}>{fmtUSD(r.value)}</td>
                    <td style={{ textAlign: 'right', fontSize: 13 }}>{total ? Math.round((r.value / total) * 100) : 0}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="card table-card">
            <table>
              <thead><tr><th>Spending area</th><th style={{ textAlign: 'right' }}>Amount</th><th style={{ width: 60, textAlign: 'right' }}>%</th></tr></thead>
              <tbody>
                {spending.map((r) => (
                  <tr key={r.label}>
                    <td>
                      <span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: 2, background: r.color ?? '#7a8590', marginRight: 8 }} />
                      {r.label}
                    </td>
                    <td style={{ textAlign: 'right', fontSize: 13, whiteSpace: 'nowrap' }}>{fmtUSD(r.value)}</td>
                    <td style={{ textAlign: 'right', fontSize: 13 }}>{total ? Math.round((r.value / total) * 100) : 0}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  )
}
