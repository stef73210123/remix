'use client'

import { useMemo, useState } from 'react'
import { OPPORTUNITIES, nyscrUrl, type Tier } from '@/lib/opportunities'

function daysUntil(iso: string): number | null {
  if (!iso) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(iso + 'T00:00:00')
  return Math.round((due.getTime() - today.getTime()) / 86400000)
}

export default function DashboardClient({ userName }: { userName: string }) {
  const [query, setQuery] = useState('')
  const [tier, setTier] = useState<string>('all')

  async function logout() {
    await fetch('/admin/api/auth/logout', { method: 'POST' })
    window.location.href = '/admin/login'
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return OPPORTUNITIES.filter((o) => {
      if (tier !== 'all' && o.tier !== tier) return false
      if (!q) return true
      return (
        o.title.toLowerCase().includes(q) ||
        o.agency.toLowerCase().includes(q) ||
        o.rationale.toLowerCase().includes(q) ||
        o.cr.includes(q)
      )
    }).sort((a, b) => {
      if (a.tier !== b.tier) return a.tier.localeCompare(b.tier)
      return (a.due || '9999-12-31').localeCompare(b.due || '9999-12-31')
    })
  }, [query, tier])

  const counts = useMemo(() => {
    const byTier: Record<Tier, number> = { A: 0, B: 0, C: 0 }
    let soon = 0
    for (const o of OPPORTUNITIES) {
      byTier[o.tier]++
      const d = daysUntil(o.due)
      if (d !== null && d >= 0 && d <= 14) soon++
    }
    return { total: OPPORTUNITIES.length, byTier, soon }
  }, [])

  return (
    <div className="container">
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '0.06em' }}>
            REMIX <span className="muted" style={{ fontWeight: 400 }}>Admin</span>
          </div>
          <div className="muted" style={{ fontSize: 13 }}>
            Signed in as {userName}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <a className="btn" href="/admin/atlas">
            Open Atlas
          </a>
          <button className="btn secondary" onClick={logout}>
            Sign out
          </button>
        </div>
      </header>

      <h1 style={{ fontSize: 22, margin: '0 0 4px' }}>Opportunities Dashboard</h1>
      <p className="muted" style={{ margin: '0 0 20px', fontSize: 14 }}>
        Government RFP &amp; consulting opportunities from the NYS Contract
        Reporter, matched to the firm&apos;s development and PropTech profiles.
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 14,
          marginBottom: 22,
        }}
      >
        {[
          { label: 'Total open', value: counts.total },
          { label: 'Tier A (strongest)', value: counts.byTier.A },
          { label: 'Tier B', value: counts.byTier.B },
          { label: 'Closing ≤ 14 days', value: counts.soon },
        ].map((c) => (
          <div className="card" key={c.label} style={{ padding: 16 }}>
            <div className="muted" style={{ fontSize: 12 }}>
              {c.label}
            </div>
            <div style={{ fontSize: 28, fontWeight: 700 }}>{c.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
        <input
          className="input"
          placeholder="Search title, agency, CR#…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ maxWidth: 280 }}
        />
        <select
          className="input"
          value={tier}
          onChange={(e) => setTier(e.target.value)}
          style={{ maxWidth: 160 }}
        >
          <option value="all">All tiers</option>
          <option value="A">Tier A</option>
          <option value="B">Tier B</option>
          <option value="C">Tier C</option>
        </select>
        <span className="muted" style={{ marginLeft: 'auto', alignSelf: 'center', fontSize: 13 }}>
          {filtered.length} shown
        </span>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        <table>
          <thead>
            <tr>
              <th style={{ width: 56 }}>Tier</th>
              <th>Opportunity</th>
              <th>Agency</th>
              <th>Due</th>
              <th>Link</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((o) => {
              const d = daysUntil(o.due)
              const urgent = d !== null && d >= 0 && d <= 14
              const past = d !== null && d < 0
              return (
                <tr key={o.cr}>
                  <td>
                    <span className={`badge ${o.tier}`}>{o.tier}</span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{o.title}</div>
                    <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                      CR# {o.cr} · {o.city}
                    </div>
                    <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                      {o.rationale}
                    </div>
                  </td>
                  <td style={{ fontSize: 13 }}>{o.agency}</td>
                  <td style={{ whiteSpace: 'nowrap', fontSize: 13 }}>
                    <span
                      style={{
                        color: past
                          ? 'var(--muted)'
                          : urgent
                            ? 'var(--warn)'
                            : 'inherit',
                        textDecoration: past ? 'line-through' : 'none',
                        fontWeight: urgent ? 700 : 400,
                      }}
                    >
                      {o.dueLabel}
                    </span>
                  </td>
                  <td>
                    <a
                      href={nyscrUrl(o.cr)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="muted"
                    >
                      NYSCR ↗
                    </a>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className="muted" style={{ fontSize: 12, marginTop: 14 }}>
        Source: NYS Contract Reporter (nyscr.ny.gov). Full ad text and documents
        require an NYSCR login; links filter the site to each CR#.
      </p>
    </div>
  )
}
