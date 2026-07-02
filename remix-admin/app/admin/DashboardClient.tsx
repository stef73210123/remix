'use client'

import { useEffect, useMemo, useState } from 'react'
import { OPPORTUNITIES, nyscrUrl } from '@/lib/opportunities'
import {
  CRM_CATEGORIES,
  CRM_LABELS,
  type CrmCategory,
  type CrmData,
} from '@/lib/crm'
import type { FundraisingContact } from '@/lib/fundraising'

type TabKey = 'rfps' | CrmCategory | 'fundraising'

const WORDMARK = 'https://remix-admin-omega.vercel.app/remix-wordmark.png'

function daysUntil(iso: string): number | null {
  if (!iso) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(iso + 'T00:00:00')
  return Math.round((due.getTime() - today.getTime()) / 86400000)
}

function TierBadge({ tier }: { tier: string }) {
  if (!tier) return null
  const cls = tier === 'A' || tier === 'B' || tier === 'C' ? tier : 'C'
  return <span className={`badge ${cls}`}>{tier}</span>
}

export default function DashboardClient({
  userName,
  crm,
}: {
  userName: string
  crm: CrmData
}) {
  const [tab, setTab] = useState<TabKey>('rfps')
  const [query, setQuery] = useState('')
  const [visible, setVisible] = useState(100)

  const [fund, setFund] = useState<FundraisingContact[] | null>(null)
  const [fundLoading, setFundLoading] = useState(false)
  const [fundError, setFundError] = useState('')

  useEffect(() => {
    setQuery('')
    setVisible(100)
  }, [tab])

  useEffect(() => {
    if (tab === 'fundraising' && fund === null && !fundLoading) {
      setFundLoading(true)
      setFundError('')
      fetch('/admin/api/fundraising')
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error('load'))))
        .then((d) => setFund(d.contacts || []))
        .catch(() => setFundError('Could not load the fundraising directory.'))
        .finally(() => setFundLoading(false))
    }
  }, [tab, fund, fundLoading])

  async function logout() {
    await fetch('/admin/api/auth/logout', { method: 'POST' })
    window.location.href = '/admin/login'
  }

  const q = query.trim().toLowerCase()

  const rfps = useMemo(() => {
    return OPPORTUNITIES.filter((o) => {
      if (!q) return true
      return (
        o.title.toLowerCase().includes(q) ||
        o.agency.toLowerCase().includes(q) ||
        o.rationale.toLowerCase().includes(q) ||
        o.cr.includes(q)
      )
    }).sort((a, b) => {
      if (a.tier !== b.tier) return a.tier.localeCompare(b.tier)
      return (a.due || '9999').localeCompare(b.due || '9999')
    })
  }, [q])

  const crmRows = useMemo(() => {
    if (tab === 'rfps' || tab === 'fundraising') return []
    const rows = crm[tab] || []
    const filtered = rows.filter((e) => {
      if (!q) return true
      return (
        e.firm.toLowerCase().includes(q) ||
        e.contact.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q) ||
        e.city.toLowerCase().includes(q) ||
        e.status.toLowerCase().includes(q)
      )
    })
    return filtered.sort((a, b) => (a.tier || 'Z').localeCompare(b.tier || 'Z'))
  }, [tab, crm, q])

  const fundRows = useMemo(() => {
    if (!fund) return []
    return fund.filter((c) => {
      if (!q) return true
      return (
        c.name.toLowerCase().includes(q) ||
        c.affiliation.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.type.toLowerCase().includes(q) ||
        c.status.toLowerCase().includes(q) ||
        c.source.toLowerCase().includes(q)
      )
    })
  }, [fund, q])

  const tabs: { key: TabKey; label: string; count: number | null }[] = [
    { key: 'rfps', label: 'RFPs', count: OPPORTUNITIES.length },
    ...CRM_CATEGORIES.map((c) => ({
      key: c as TabKey,
      label: CRM_LABELS[c],
      count: (crm[c] || []).length,
    })),
    { key: 'fundraising', label: 'Fundraising', count: fund ? fund.length : null },
  ]

  const link = (href: string, label: string) =>
    href ? (
      <a href={href} target="_blank" rel="noopener noreferrer" className="muted">
        {label} ↗
      </a>
    ) : (
      <span className="muted">—</span>
    )

  return (
    <div className="container">
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          marginBottom: 20,
        }}
      >
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={WORDMARK} alt="Remix Properties" style={{ height: 34, display: 'block' }} />
          <div className="muted" style={{ fontSize: 13, marginTop: 6 }}>
            Admin · Signed in as {userName}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <a className="btn" href="https://atlas.remixcre.com" target="_blank" rel="noopener noreferrer">
            Open Atlas
          </a>
          <a
            className="btn secondary"
            href="https://investors.circular.enterprises/admin/feed"
            target="_blank"
            rel="noopener noreferrer"
          >
            Circular Admin
          </a>
          <button className="btn secondary" onClick={logout}>
            Sign out
          </button>
        </div>
      </header>

      <h1 style={{ fontSize: 22, margin: '0 0 16px' }}>CRM</h1>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={tab === t.key ? 'btn' : 'btn secondary'}
            style={{ padding: '7px 14px' }}
          >
            {t.label}
            {t.count !== null && (
              <span style={{ opacity: 0.7, marginLeft: 2 }}>({t.count})</span>
            )}
          </button>
        ))}
      </div>

      {/* Search */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 14, alignItems: 'center' }}>
        <input
          className="input"
          placeholder="Search…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ maxWidth: 320 }}
        />
        <span className="muted" style={{ fontSize: 13 }}>
          {tab === 'rfps'
            ? `${rfps.length} shown`
            : tab === 'fundraising'
              ? fund
                ? `${fundRows.length} of ${fund.length}`
                : ''
              : `${crmRows.length} shown`}
        </span>
      </div>

      {/* RFPs */}
      {tab === 'rfps' && (
        <div className="card" style={{ overflow: 'hidden' }}>
          <table>
            <thead>
              <tr>
                <th style={{ width: 54 }}>Tier</th>
                <th>Opportunity</th>
                <th>Agency</th>
                <th>Due</th>
                <th className="hidden-narrow">Why it fits</th>
                <th style={{ width: 60 }}>Link</th>
              </tr>
            </thead>
            <tbody>
              {rfps.map((o) => {
                const d = daysUntil(o.due)
                const urgent = d !== null && d >= 0 && d <= 14
                const past = d !== null && d < 0
                return (
                  <tr key={o.cr}>
                    <td><TierBadge tier={o.tier} /></td>
                    <td style={{ fontWeight: 600 }}>
                      {o.title}
                      <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                        CR# {o.cr} · {o.city}
                      </div>
                    </td>
                    <td style={{ fontSize: 13 }}>{o.agency}</td>
                    <td style={{ whiteSpace: 'nowrap', fontSize: 13, color: past ? 'var(--muted)' : urgent ? 'var(--warn)' : 'inherit', fontWeight: urgent ? 700 : 400 }}>
                      {o.dueLabel}
                    </td>
                    <td className="muted hidden-narrow" style={{ fontSize: 12, maxWidth: 340 }}>{o.rationale}</td>
                    <td>{link(nyscrUrl(o.cr), 'NYSCR')}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* CRM categories */}
      {tab !== 'rfps' && tab !== 'fundraising' && (
        <div className="card" style={{ overflow: 'hidden' }}>
          <table>
            <thead>
              <tr>
                <th style={{ width: 54 }}>Tier</th>
                <th>Firm</th>
                <th>Contact</th>
                <th>Status</th>
                <th className="hidden-narrow">City</th>
                <th style={{ width: 60 }}>Web</th>
              </tr>
            </thead>
            <tbody>
              {crmRows.map((e, i) => (
                <tr key={`${e.firm}-${i}`}>
                  <td><TierBadge tier={e.tier} /></td>
                  <td style={{ fontWeight: 600 }}>
                    {e.firm || '—'}
                    {e.email && (
                      <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{e.email}</div>
                    )}
                  </td>
                  <td style={{ fontSize: 13 }}>{e.contact || '—'}</td>
                  <td style={{ fontSize: 13 }}>{e.status || '—'}</td>
                  <td className="muted hidden-narrow" style={{ fontSize: 13 }}>{e.city || '—'}</td>
                  <td>{e.web ? link(e.web.startsWith('http') ? e.web : `https://${e.web}`, 'Site') : <span className="muted">—</span>}</td>
                </tr>
              ))}
              {crmRows.length === 0 && (
                <tr><td colSpan={6} className="muted" style={{ padding: 20 }}>No entries. Run <code>npm run seed-crm</code> to import from your Stefan_CRM file.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Fundraising */}
      {tab === 'fundraising' && (
        <div className="card" style={{ overflow: 'hidden' }}>
          {fundLoading && <div className="muted" style={{ padding: 20 }}>Loading fundraising directory…</div>}
          {fundError && <div className="error" style={{ padding: 20 }}>{fundError}</div>}
          {fund && !fundLoading && (
            <>
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Affiliation</th>
                    <th className="hidden-narrow">Type</th>
                    <th>Status</th>
                    <th className="hidden-narrow">Amount</th>
                    <th style={{ width: 60 }}>Contact</th>
                  </tr>
                </thead>
                <tbody>
                  {fundRows.slice(0, visible).map((c, i) => (
                    <tr key={`${c.email || c.name}-${i}`}>
                      <td style={{ fontWeight: 600 }}>
                        {c.name}
                        {c.priority && <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>Priority: {c.priority}</div>}
                      </td>
                      <td style={{ fontSize: 13 }}>{c.affiliation || '—'}</td>
                      <td className="muted hidden-narrow" style={{ fontSize: 13 }}>{c.type || '—'}</td>
                      <td style={{ fontSize: 13 }}>{c.status || '—'}</td>
                      <td className="muted hidden-narrow" style={{ fontSize: 13 }}>{c.amount || '—'}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {c.email && <a href={`mailto:${c.email}`} className="muted" title={c.email}>✉</a>}
                        {c.linkedin && <> {link(c.linkedin.startsWith('http') ? c.linkedin : `https://${c.linkedin}`, 'in')}</>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {fundRows.length > visible && (
                <div style={{ padding: 14, textAlign: 'center' }}>
                  <button className="btn secondary" onClick={() => setVisible((v) => v + 200)}>
                    Load more ({fundRows.length - visible} remaining)
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      <p className="muted" style={{ fontSize: 12, marginTop: 14 }}>
        RFPs: NYS Contract Reporter. Job-search &amp; consulting: mirrored from your Stefan_CRM. Fundraising: live from the Circular fundraising sheet.
      </p>
    </div>
  )
}
