'use client'

import { useMemo, useState } from 'react'
import type { TownBudget } from '@/lib/municipal/budget'
import Sankey from './Sankey'

const WORDMARK = 'https://remix-admin-omega.vercel.app/remix-wordmark.png'

function fmtUSD(v: number): string {
  return `$${v.toLocaleString('en-US')}`
}

export default function BudgetClient({ userName, budget }: { userName: string; budget: TownBudget }) {
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

  async function logout() {
    await fetch('/admin/api/auth/logout', { method: 'POST' })
    window.location.href = '/admin/login'
  }

  return (
    <div className="container">
      <header
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}
      >
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={WORDMARK} alt="Remix Properties" style={{ height: 34, display: 'block' }} />
          <div className="muted" style={{ fontSize: 13, marginTop: 6 }}>Municipal · Signed in as {userName}</div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          <a className="btn secondary" href="/admin/municipal">← Municipal</a>
          <button className="btn secondary" onClick={logout}>Sign out</button>
        </div>
      </header>

      <h1 className="page-title" style={{ marginBottom: 4 }}>Budget</h1>
      <div className="muted" style={{ fontSize: 13, marginBottom: 16 }}>
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

      <div className="card" style={{ padding: 20, marginBottom: 18 }}>
        <Sankey nodes={budget.nodes} links={budget.links} />
      </div>

      <button className="btn secondary" onClick={() => setShowTable((v) => !v)} style={{ marginBottom: 18 }}>
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
    </div>
  )
}
