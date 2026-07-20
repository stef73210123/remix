'use client'

import { useEffect, useMemo, useState } from 'react'
import { Mail } from 'lucide-react'
import {
  STATE_CODES,
  STATE_NAMES,
  type Opportunity,
  type StateCode,
} from '@/lib/opportunities'
import {
  CRM_CATEGORIES,
  CRM_LABELS,
  type CrmCategory,
  type CrmData,
} from '@/lib/crm'
import type { FundraisingContact } from '@/lib/fundraising'
import AdminNav from '@/app/admin/AdminNav'
import ClearableInput from '@/app/ClearableInput'
import OpenDocketPanel from '@/app/admin/OpenDocketPanel'

type TabKey = 'rfps' | CrmCategory | 'fundraising' | 'opendocket'
type StateFilter = 'ALL' | StateCode

const WORDMARK = 'https://remix-admin-omega.vercel.app/remix-wordmark.png'

function daysUntil(iso: string): number | null {
  if (!iso) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(iso + 'T00:00:00')
  return Math.round((due.getTime() - today.getTime()) / 86400000)
}

function TierBadge({ tier }: { tier: string }) {
  if (!tier) return <span className="muted" style={{ fontSize: 11 }}>—</span>
  const cls = tier === 'A' || tier === 'B' || tier === 'C' ? tier : 'C'
  return <span className={`badge ${cls}`}>{tier}</span>
}

function StateBadge({ state }: { state: StateCode }) {
  return <span className="badge state">{state}</span>
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

  const [rfps, setRfps] = useState<Opportunity[] | null>(null)
  const [rfpsLoading, setRfpsLoading] = useState(false)
  const [rfpsError, setRfpsError] = useState('')
  const [stateFilter, setStateFilter] = useState<StateFilter>('ALL')

  const [fund, setFund] = useState<FundraisingContact[] | null>(null)
  const [fundLoading, setFundLoading] = useState(false)
  const [fundError, setFundError] = useState('')

  useEffect(() => {
    setQuery('')
    setVisible(100)
  }, [tab])

  useEffect(() => {
    if (tab === 'rfps' && rfps === null && !rfpsLoading) {
      setRfpsLoading(true)
      setRfpsError('')
      fetch('/admin/api/rfps')
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error('load'))))
        .then((d) => setRfps(d.opportunities || []))
        .catch(() => setRfpsError('Could not load RFPs.'))
        .finally(() => setRfpsLoading(false))
    }
  }, [tab, rfps, rfpsLoading])

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

  const q = query.trim().toLowerCase()

  const filteredRfps = useMemo(() => {
    if (!rfps) return []
    const stateFiltered =
      stateFilter === 'ALL' ? rfps : rfps.filter((o) => o.state === stateFilter)
    return stateFiltered.filter((o) => {
      if (!q) return true
      return (
        o.title.toLowerCase().includes(q) ||
        o.agency.toLowerCase().includes(q) ||
        (o.rationale || '').toLowerCase().includes(q) ||
        (o.cr || '').includes(q) ||
        (o.city || '').toLowerCase().includes(q)
      )
    })
  }, [rfps, stateFilter, q])

  const rfpCountsByState = useMemo(() => {
    const c: Record<StateFilter, number> = { ALL: 0, NY: 0, CT: 0, NJ: 0, RI: 0, MA: 0 }
    if (rfps) {
      c.ALL = rfps.length
      for (const o of rfps) c[o.state]++
    }
    return c
  }, [rfps])

  const crmRows = useMemo(() => {
    if (tab === 'rfps' || tab === 'fundraising' || tab === 'opendocket') return []
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
    { key: 'rfps', label: 'RFPs', count: rfps ? rfps.length : null },
    ...CRM_CATEGORIES.map((c) => ({
      key: c as TabKey,
      label: CRM_LABELS[c],
      count: (crm[c] || []).length,
    })),
    { key: 'fundraising', label: 'Fundraising', count: fund ? fund.length : null },
    { key: 'opendocket', label: 'OpenDocket', count: null },
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
          flexWrap: 'wrap',
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
        <AdminNav />
      </header>

      <h1 className="page-title">CRM</h1>

      {/* Tabs */}
      <div className="pill-strip" style={{ display: 'flex', gap: 6, flexWrap: 'nowrap', marginBottom: 16 }}>
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

      {/* Search — OpenDocket brings its own filter/search UI. */}
      {tab !== 'opendocket' && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 14, alignItems: 'center' }}>
          <ClearableInput
            className="input"
            placeholder="Search…"
            value={query}
            onChange={setQuery}
            wrapperStyle={{ maxWidth: 320 }}
          />
          <span className="muted" style={{ fontSize: 13 }}>
            {tab === 'rfps'
              ? `${filteredRfps.length} shown`
              : tab === 'fundraising'
                ? fund
                  ? `${fundRows.length} of ${fund.length}`
                  : ''
                : `${crmRows.length} shown`}
          </span>
        </div>
      )}

      {/* OpenDocket — municipal decision-maker directory */}
      {tab === 'opendocket' && <OpenDocketPanel />}

      {/* RFPs — state filter chip row (horizontal-scroll strip on mobile).
          Records are refreshed automatically by the weekly ingest cron
          (see vercel.json → /admin/api/cron/rfp-ingest). */}
      {tab === 'rfps' && (
        <div
          className="pill-strip"
          style={{ display: 'flex', gap: 6, flexWrap: 'nowrap', marginBottom: 12 }}
        >
          {(['ALL', ...STATE_CODES] as StateFilter[]).map((s) => {
            const active = stateFilter === s
            const label = s === 'ALL' ? 'All states' : STATE_NAMES[s]
            const count = rfpCountsByState[s]
            return (
              <button
                key={s}
                onClick={() => setStateFilter(s)}
                className={active ? 'btn' : 'btn secondary'}
                style={{ padding: '5px 12px', fontSize: 13 }}
              >
                {label}
                <span style={{ opacity: 0.7, marginLeft: 4 }}>({count})</span>
              </button>
            )
          })}
        </div>
      )}

      {/* RFPs table */}
      {tab === 'rfps' && (
        <div className="card table-card">
          {rfpsLoading && <div className="muted" style={{ padding: 20 }}>Loading RFPs…</div>}
          {rfpsError && <div className="error" style={{ padding: 20 }}>{rfpsError}</div>}
          {rfps && !rfpsLoading && (
            <table>
              <thead>
                <tr>
                  <th style={{ width: 54 }}>Tier</th>
                  <th style={{ width: 46 }}>State</th>
                  <th>Opportunity</th>
                  <th>Agency</th>
                  <th>Due</th>
                  <th className="hidden-narrow">Why it fits</th>
                  <th style={{ width: 60 }}>Link</th>
                </tr>
              </thead>
              <tbody>
                {filteredRfps.map((o) => {
                  const d = daysUntil(o.due)
                  const urgent = d !== null && d >= 0 && d <= 14
                  const past = d !== null && d < 0
                  const linkLabel =
                    o.linkStatus === 'search-fallback' ? `${o.sourceName}*` : o.sourceName
                  return (
                    <tr key={o.id}>
                      <td><TierBadge tier={o.tier} /></td>
                      <td><StateBadge state={o.state} /></td>
                      <td style={{ fontWeight: 600 }}>
                        {o.title}
                        <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                          {o.cr && `#${o.cr}`}
                          {o.cr && o.city ? ' · ' : ''}
                          {o.city}
                        </div>
                      </td>
                      <td style={{ fontSize: 13 }}>{o.agency}</td>
                      <td
                        style={{
                          whiteSpace: 'nowrap',
                          fontSize: 13,
                          color: past ? 'var(--muted)' : urgent ? 'var(--warn)' : 'inherit',
                          fontWeight: urgent ? 700 : 400,
                        }}
                      >
                        {o.dueLabel || '—'}
                      </td>
                      <td className="muted hidden-narrow" style={{ fontSize: 12, maxWidth: 340 }}>
                        {o.rationale || (o.curated ? '' : 'Auto-ingested — not yet triaged.')}
                      </td>
                      <td>{link(o.sourceUrl, linkLabel)}</td>
                    </tr>
                  )
                })}
                {filteredRfps.length === 0 && (
                  <tr>
                    <td colSpan={7} className="muted" style={{ padding: 20 }}>
                      No RFPs match this filter yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* CRM categories */}
      {tab !== 'rfps' && tab !== 'fundraising' && tab !== 'opendocket' && (
        <div className="card table-card">
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
        <div className="card table-card">
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
                        {c.email && <a href={`mailto:${c.email}`} className="muted" title={c.email} style={{ display: 'inline-flex' }}><Mail size={13} aria-hidden /></a>}
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
        RFPs: NY (NYSCR), CT (CTsource), NJ (NJSTART), RI (RIDOP OSP), MA (COMMBUYS) — ingested weekly. * = search-fallback link (curated row not yet matched to a direct portal record). Job-search &amp; consulting: mirrored from your Stefan_CRM. Fundraising: live from the Circular fundraising sheet.
      </p>
    </div>
  )
}
