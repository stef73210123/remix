'use client'

import { useMemo } from 'react'
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
  const { total } = useMemo(() => {
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

      <div className="card" style={{ padding: 20 }}>
        <Sankey nodes={budget.nodes} links={budget.links} />
      </div>
    </>
  )
}
