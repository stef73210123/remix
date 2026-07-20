'use client'

/**
 * OpenDocket — municipal decision-maker directory, rendered as a tab inside
 * the CRM dashboard (alongside RFPs / CRE / AI / …). Self-contained: fetches
 * from /admin/api/opendocket and owns its own state filter + search.
 */
import { Fragment, useEffect, useMemo, useState } from 'react'
import type { OpenDocketContact } from '@/lib/opendocket'

type StateFilter = 'ALL' | string

function fmtNum(n: number | null): string {
  return n == null ? '—' : n.toLocaleString('en-US')
}
function fmtUsd(n: number | null): string {
  return n == null ? '—' : `$${n.toLocaleString('en-US')}`
}
function isRealEmail(v: string): boolean {
  return /.+@.+\..+/.test(v) && !/^n\/?a$/i.test(v)
}

function Email({ value }: { value: string }) {
  const v = (value || '').trim()
  if (!v || !isRealEmail(v)) return <span className="muted">{v || '—'}</span>
  return (
    <a href={`mailto:${v}`} className="muted" title={v}>
      {v}
    </a>
  )
}

function Person({ name, title, email }: { name: string; title?: string; email: string }) {
  const n = (name || '').trim()
  if (!n || /^n\/?a$/i.test(n)) return <span className="muted">—</span>
  return (
    <div>
      <div style={{ fontWeight: 600 }}>{n}</div>
      {title && title.trim() && !/^n\/?a$/i.test(title) && (
        <div className="muted" style={{ fontSize: 12 }}>{title}</div>
      )}
      <div style={{ fontSize: 12, marginTop: 2 }}><Email value={email} /></div>
    </div>
  )
}

export default function OpenDocketPanel() {
  const [contacts, setContacts] = useState<OpenDocketContact[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [stateFilter, setStateFilter] = useState<StateFilter>('ALL')
  const [query, setQuery] = useState('')
  const [openRow, setOpenRow] = useState<string | null>(null)

  useEffect(() => {
    fetch('/admin/api/opendocket')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('load'))))
      .then((d) => setContacts(d.contacts || []))
      .catch(() => setError('Could not load the OpenDocket directory.'))
      .finally(() => setLoading(false))
  }, [])

  const states = useMemo(
    () => Array.from(new Set((contacts ?? []).map((c) => c.state))).filter(Boolean).sort(),
    [contacts],
  )
  const countsByState = useMemo(() => {
    const c: Record<string, number> = { ALL: contacts?.length ?? 0 }
    for (const row of contacts ?? []) c[row.state] = (c[row.state] || 0) + 1
    return c
  }, [contacts])

  const q = query.trim().toLowerCase()
  const rows = useMemo(() => {
    if (!contacts) return []
    return contacts.filter((c) => {
      if (stateFilter !== 'ALL' && c.state !== stateFilter) return false
      if (!q) return true
      return (
        c.municipality.toLowerCase().includes(q) ||
        c.county.toLowerCase().includes(q) ||
        c.clerkName.toLowerCase().includes(q) ||
        c.execName.toLowerCase().includes(q) ||
        c.adminName.toLowerCase().includes(q) ||
        c.clerkEmail.toLowerCase().includes(q) ||
        c.execEmail.toLowerCase().includes(q) ||
        c.adminEmail.toLowerCase().includes(q)
      )
    })
  }, [contacts, stateFilter, q])

  return (
    <>
      <p className="muted" style={{ fontSize: 13, margin: '0 0 12px', maxWidth: 720 }}>
        Municipal decision-makers — clerks, supervisors / mayors, and administrators — across the NY, NJ, CT &amp; MA footprint.
      </p>

      {/* State filter — horizontal-scroll strip on mobile */}
      <div className="pill-strip" style={{ display: 'flex', gap: 6, flexWrap: 'nowrap', marginBottom: 12 }}>
        {(['ALL', ...states] as StateFilter[]).map((s) => (
          <button
            key={s}
            onClick={() => setStateFilter(s)}
            className={stateFilter === s ? 'btn' : 'btn secondary'}
            style={{ padding: '5px 12px', fontSize: 13 }}
          >
            {s === 'ALL' ? 'All states' : s}
            <span style={{ opacity: 0.7, marginLeft: 4 }}>({countsByState[s] ?? 0})</span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 14, alignItems: 'center' }}>
        <input
          className="input"
          placeholder="Search municipality, county, or official…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ maxWidth: 360 }}
        />
        <span className="muted" style={{ fontSize: 13 }}>{rows.length} shown</span>
      </div>

      <div className="card table-card">
        {loading && <div className="muted" style={{ padding: 20 }}>Loading directory…</div>}
        {error && <div className="error" style={{ padding: 20 }}>{error}</div>}
        {contacts && !loading && (
          <table>
            <thead>
              <tr>
                <th style={{ width: 28 }}></th>
                <th>Municipality</th>
                <th style={{ width: 46 }}>State</th>
                <th className="hidden-narrow">Population</th>
                <th className="hidden-narrow">Median HHI</th>
                <th>Supervisor / Mayor</th>
                <th className="hidden-narrow">Clerk</th>
                <th style={{ width: 54 }}>Web</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => {
                const id = `${c.state}-${c.municipality}`
                const isOpen = openRow === id
                const stop = (e: React.MouseEvent) => e.stopPropagation()
                return (
                  <Fragment key={id}>
                    <tr onClick={() => setOpenRow(isOpen ? null : id)} style={{ cursor: 'pointer' }}>
                      <td style={{ color: 'var(--muted)', textAlign: 'center' }}>{isOpen ? '▾' : '▸'}</td>
                      <td style={{ fontWeight: 600 }}>
                        {c.municipality}
                        <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                          {c.county && `${c.county} County`}
                          {c.county && c.type ? ' · ' : ''}
                          {c.type}
                        </div>
                      </td>
                      <td><span className="badge state">{c.state}</span></td>
                      <td className="hidden-narrow" style={{ fontSize: 13, whiteSpace: 'nowrap' }}>{fmtNum(c.population)}</td>
                      <td className="hidden-narrow" style={{ fontSize: 13, whiteSpace: 'nowrap' }}>{fmtUsd(c.mhi)}</td>
                      <td><Person name={c.execName} title={c.execTitle} email={c.execEmail} /></td>
                      <td className="hidden-narrow"><Person name={c.clerkName} title="Clerk" email={c.clerkEmail} /></td>
                      <td onClick={stop}>
                        {c.website ? (
                          <a href={c.website} target="_blank" rel="noopener noreferrer" className="muted">Site ↗</a>
                        ) : (
                          <span className="muted">—</span>
                        )}
                      </td>
                    </tr>
                    {isOpen && (
                      <tr>
                        <td colSpan={8} style={{ background: 'var(--panel-2)', padding: '14px 18px', borderTop: '1px solid var(--border)' }}>
                          <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', marginBottom: c.notes || c.governanceNote ? 14 : 0 }}>
                            <div>
                              <div className="label">Supervisor / Mayor</div>
                              <Person name={c.execName} title={c.execTitle} email={c.execEmail} />
                            </div>
                            <div>
                              <div className="label">Clerk</div>
                              <Person name={c.clerkName} title="Clerk" email={c.clerkEmail} />
                            </div>
                            <div>
                              <div className="label">Administrator / Manager</div>
                              <Person name={c.adminName} title={c.adminTitle} email={c.adminEmail} />
                            </div>
                            <div>
                              <div className="label">Profile</div>
                              <div style={{ fontSize: 13 }}>Pop. {fmtNum(c.population)}</div>
                              <div style={{ fontSize: 13 }}>Median HHI {fmtUsd(c.mhi)}</div>
                              <div style={{ fontSize: 13 }}>{c.type || '—'}</div>
                            </div>
                          </div>
                          {c.governanceNote && (
                            <div style={{ fontSize: 13, lineHeight: 1.5, marginBottom: c.notes ? 10 : 0 }}>
                              <span className="label" style={{ display: 'inline' }}>Governance — </span>
                              {c.governanceNote}
                            </div>
                          )}
                          {c.notes && (
                            <div className="muted" style={{ fontSize: 12, lineHeight: 1.55 }}>{c.notes}</div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="muted" style={{ padding: 20 }}>No municipalities match this filter.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}
