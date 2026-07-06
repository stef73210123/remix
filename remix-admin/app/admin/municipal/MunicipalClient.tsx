'use client'

import { useEffect, useMemo, useState } from 'react'

const WORDMARK = 'https://remix-admin-omega.vercel.app/remix-wordmark.png'

interface Body {
  key: string
  displayName: string
  meetingPattern: string | null
}
interface Municipality {
  key: string
  name: string
  state: string
  county: string | null
  domains: string[]
  bodies: Body[]
}
interface Meeting {
  id: string
  muni_key: string
  muni_name: string
  state: string
  county: string | null
  body_name: string
  body_key: string
  scheduled_at: string
  status: string
  title: string | null
  source_url: string | null
  asset_count: number
  text_count: number
}
interface Summary {
  municipalities: Municipality[]
  meetings: Meeting[]
  counts: Record<string, { meetings: number; lastMeetingAt: string | null }>
  dbOk: boolean
  dbError?: string
}

function fmtDate(iso: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

const STATUS_COLOR: Record<string, string> = {
  held: 'var(--a)',
  scheduled: 'var(--b)',
  cancelled: 'var(--c)',
  rescheduled: 'var(--warn)',
}

function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLOR[status] || 'var(--c)'
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: 999,
          background: color,
          display: 'inline-block',
        }}
      />
      {status}
    </span>
  )
}

export default function MunicipalClient({ userName }: { userName: string }) {
  const [data, setData] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    fetch('/admin/api/municipal/summary')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('load'))))
      .then((d: Summary) => setData(d))
      .catch(() => setError('Could not load the municipal pipeline.'))
      .finally(() => setLoading(false))
  }, [])

  async function logout() {
    await fetch('/admin/api/auth/logout', { method: 'POST' })
    window.location.href = '/admin/login'
  }

  const totalBodies = useMemo(
    () => (data ? data.municipalities.reduce((n, m) => n + m.bodies.length, 0) : 0),
    [data]
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
            Municipal · Signed in as {userName}
          </div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          <a className="btn secondary" href="/admin">
            ← CRM
          </a>
          <a className="btn secondary" href="https://atlas.remixcre.com" target="_blank" rel="noopener noreferrer">
            Atlas
          </a>
          <button className="btn secondary" onClick={logout}>
            Sign out
          </button>
        </div>
      </header>

      <h1 className="page-title">Municipal Dashboard</h1>

      {/* Pipeline status line */}
      <div className="muted" style={{ fontSize: 13, marginBottom: 18 }}>
        {data
          ? `${data.municipalities.length} ${
              data.municipalities.length === 1 ? 'town' : 'towns'
            } · ${totalBodies} boards tracked` +
            (data.dbOk
              ? ` · ${data.meetings.length} meeting${data.meetings.length === 1 ? '' : 's'} ingested`
              : ' · pipeline DB not connected — showing configured towns only')
          : 'Municipal meetings, agendas & minutes across tracked towns.'}
      </div>

      {loading && <div className="muted" style={{ padding: 20 }}>Loading municipal pipeline…</div>}
      {error && <div className="error" style={{ padding: 20 }}>{error}</div>}

      {data && !loading && (
        <>
          {/* Town cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 14,
              marginBottom: 26,
            }}
          >
            {data.municipalities.map((m) => {
              const c = data.counts[m.key]
              return (
                <div key={m.key} className="card" style={{ padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{m.name}</div>
                    <span className="badge state">{m.state}</span>
                  </div>
                  <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                    {m.county ? `${m.county} County` : ''}
                    {m.domains[0] ? ` · ${m.domains[0]}` : ''}
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
                    {m.bodies.map((b) => (
                      <span key={b.key} className="badge state" title={b.meetingPattern || undefined}>
                        {b.displayName}
                      </span>
                    ))}
                  </div>

                  <div className="muted" style={{ fontSize: 12, marginTop: 12 }}>
                    {c
                      ? `${c.meetings} meeting${c.meetings === 1 ? '' : 's'} · latest ${fmtDate(
                          c.lastMeetingAt || ''
                        )}`
                      : data.dbOk
                        ? 'No meetings ingested yet'
                        : `${m.bodies.length} boards configured`}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Recent ingested meetings */}
          <h2 style={{ fontSize: 16, margin: '0 0 12px' }}>Recent meetings</h2>
          <div className="card" style={{ overflow: 'hidden' }}>
            {data.meetings.length > 0 ? (
              <table>
                <thead>
                  <tr>
                    <th>Town</th>
                    <th>Board</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th style={{ width: 70 }}>Docs</th>
                    <th style={{ width: 70 }}>Text</th>
                    <th style={{ width: 60 }}>Source</th>
                  </tr>
                </thead>
                <tbody>
                  {data.meetings.map((mtg) => (
                    <tr key={mtg.id}>
                      <td style={{ fontWeight: 600 }}>
                        {mtg.muni_name}
                        {mtg.title && (
                          <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{mtg.title}</div>
                        )}
                      </td>
                      <td style={{ fontSize: 13 }}>{mtg.body_name}</td>
                      <td style={{ fontSize: 13, whiteSpace: 'nowrap' }}>{fmtDate(mtg.scheduled_at)}</td>
                      <td><StatusBadge status={mtg.status} /></td>
                      <td style={{ fontSize: 13 }}>{mtg.asset_count}</td>
                      <td style={{ fontSize: 13 }}>{mtg.text_count}</td>
                      <td>
                        {mtg.source_url ? (
                          <a href={mtg.source_url} target="_blank" rel="noopener noreferrer" className="muted">
                            Link ↗
                          </a>
                        ) : (
                          <span className="muted">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="muted" style={{ padding: 20, fontSize: 13 }}>
                {data.dbOk
                  ? 'No meetings ingested yet. Run the ingest pipeline (/admin/api/municipal/ingest-one?muni=nc) to populate this table.'
                  : 'Pipeline database not connected in this environment. Configured towns and boards are shown above; ingested meetings will appear here once NEON_DATABASE_URL is set and the ingest has run.'}
              </div>
            )}
          </div>

          {!data.dbOk && data.dbError && (
            <p className="muted" style={{ fontSize: 11, marginTop: 12 }}>
              DB: {data.dbError}
            </p>
          )}
        </>
      )}
    </div>
  )
}
