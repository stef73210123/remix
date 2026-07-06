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
interface Asset {
  kind: string
  sourceUrl: string | null
  blobUrl: string | null
  pageCount: number | null
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
  assets: Asset[]
  text_count: number
}
interface Summary {
  municipalities: Municipality[]
  meetings: Meeting[]
  counts: Record<string, { meetings: number; lastMeetingAt: string | null }>
  dbOk: boolean
  dbError?: string
}

type TownFilter = 'ALL' | string
type BoardFilter = 'ALL' | string

function fmtDate(iso: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

function startOfToday(): number {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.getTime()
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
      <span style={{ width: 8, height: 8, borderRadius: 999, background: color, display: 'inline-block' }} />
      {status}
    </span>
  )
}

function DocLinks({ assets }: { assets: Asset[] }) {
  if (!assets || assets.length === 0) return <span className="muted">—</span>
  return (
    <span style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 6 }}>
      {assets.map((a, i) => {
        const href = a.blobUrl || a.sourceUrl || ''
        const label = a.kind.charAt(0).toUpperCase() + a.kind.slice(1)
        const title = a.pageCount ? `${label} · ${a.pageCount}pp` : label
        return href ? (
          <a key={i} href={href} target="_blank" rel="noopener noreferrer" className="badge state" style={{ textDecoration: 'none' }} title={title}>
            {label} ↗
          </a>
        ) : (
          <span key={i} className="badge state">{label}</span>
        )
      })}
    </span>
  )
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={active ? 'btn' : 'btn secondary'} style={{ padding: '6px 12px', fontSize: 13 }}>
      {children}
    </button>
  )
}

export default function MunicipalClient({ userName }: { userName: string }) {
  const [data, setData] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [town, setTown] = useState<TownFilter>('ALL')
  const [board, setBoard] = useState<BoardFilter>('ALL')

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

  // Union of board names across towns, in first-seen order — powers the board filter.
  const allBoards = useMemo(() => {
    if (!data) return [] as string[]
    const seen = new Set<string>()
    const out: string[] = []
    for (const m of data.municipalities)
      for (const b of m.bodies)
        if (!seen.has(b.displayName)) {
          seen.add(b.displayName)
          out.push(b.displayName)
        }
    return out
  }, [data])

  const munisShown = useMemo(
    () => (data ? data.municipalities.filter((m) => town === 'ALL' || m.key === town) : []),
    [data, town]
  )

  const meetingsFiltered = useMemo(() => {
    if (!data) return []
    return data.meetings.filter(
      (m) => (town === 'ALL' || m.muni_key === town) && (board === 'ALL' || m.body_name === board)
    )
  }, [data, town, board])

  const { upcoming, history } = useMemo(() => {
    const t0 = startOfToday()
    const up: Meeting[] = []
    const hist: Meeting[] = []
    for (const m of meetingsFiltered) {
      const ts = new Date(m.scheduled_at).getTime()
      if (!isNaN(ts) && ts >= t0) up.push(m)
      else hist.push(m)
    }
    up.sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
    return { upcoming: up, history: hist }
  }, [meetingsFiltered])

  // Recurring schedule fallback for "upcoming" when no future-dated meetings are ingested yet.
  const schedule = useMemo(() => {
    const rows: { town: string; board: string; pattern: string }[] = []
    for (const m of munisShown)
      for (const b of m.bodies)
        if (b.meetingPattern && (board === 'ALL' || b.displayName === board))
          rows.push({ town: m.name, board: b.displayName, pattern: b.meetingPattern })
    return rows
  }, [munisShown, board])

  const totalBodies = useMemo(
    () => (data ? data.municipalities.reduce((n, m) => n + m.bodies.length, 0) : 0),
    [data]
  )

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
          <a className="btn secondary" href="/admin">← CRM</a>
          <a className="btn secondary" href="https://atlas.remixcre.com" target="_blank" rel="noopener noreferrer">Atlas</a>
          <button className="btn secondary" onClick={logout}>Sign out</button>
        </div>
      </header>

      <h1 className="page-title">Municipal Dashboard</h1>

      <div className="muted" style={{ fontSize: 13, marginBottom: 16 }}>
        {data
          ? `${data.municipalities.length} ${data.municipalities.length === 1 ? 'town' : 'towns'} · ${totalBodies} boards tracked` +
            (data.dbOk
              ? ` · ${data.meetings.length} meeting${data.meetings.length === 1 ? '' : 's'} in history`
              : ' · pipeline DB not connected — showing configured towns only')
          : 'Municipal meetings, agendas & minutes across tracked towns.'}
      </div>

      {loading && <div className="muted" style={{ padding: 20 }}>Loading municipal pipeline…</div>}
      {error && <div className="error" style={{ padding: 20 }}>{error}</div>}

      {data && !loading && (
        <>
          {/* Town filter strip */}
          <div className="pill-strip" style={{ display: 'flex', gap: 6, flexWrap: 'nowrap', marginBottom: 8 }}>
            <Chip active={town === 'ALL'} onClick={() => setTown('ALL')}>All towns</Chip>
            {data.municipalities.map((m) => (
              <Chip key={m.key} active={town === m.key} onClick={() => setTown(m.key)}>{m.name}</Chip>
            ))}
          </div>
          {/* Board filter strip */}
          <div className="pill-strip" style={{ display: 'flex', gap: 6, flexWrap: 'nowrap', marginBottom: 20 }}>
            <Chip active={board === 'ALL'} onClick={() => setBoard('ALL')}>All boards</Chip>
            {allBoards.map((b) => (
              <Chip key={b} active={board === b} onClick={() => setBoard(b)}>{b}</Chip>
            ))}
          </div>

          {/* Town cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14, marginBottom: 26 }}>
            {munisShown.map((m) => {
              const c = data.counts[m.key]
              return (
                <div key={m.key} className="card" style={{ padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{m.name}</div>
                    <span className="badge state">{m.state}</span>
                  </div>
                  <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                    {m.county ? `${m.county} County` : ''}{m.domains[0] ? ` · ${m.domains[0]}` : ''}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
                    {m.bodies.map((b) => (
                      <span key={b.key} className="badge state" title={b.meetingPattern || undefined}>{b.displayName}</span>
                    ))}
                  </div>
                  <div className="muted" style={{ fontSize: 12, marginTop: 12 }}>
                    {c ? `${c.meetings} meeting${c.meetings === 1 ? '' : 's'} · latest ${fmtDate(c.lastMeetingAt || '')}` : data.dbOk ? 'No meetings ingested yet' : `${m.bodies.length} boards configured`}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Upcoming */}
          <h2 style={{ fontSize: 16, margin: '0 0 12px' }}>Upcoming meetings</h2>
          {upcoming.length > 0 ? (
            <div className="card" style={{ overflow: 'hidden', marginBottom: 26 }}>
              <table>
                <thead>
                  <tr><th>Town</th><th>Board</th><th>Date</th><th>Status</th><th>Documents</th></tr>
                </thead>
                <tbody>
                  {upcoming.map((mtg) => (
                    <tr key={mtg.id}>
                      <td style={{ fontWeight: 600 }}>{mtg.muni_name}</td>
                      <td style={{ fontSize: 13 }}>{mtg.body_name}</td>
                      <td style={{ fontSize: 13, whiteSpace: 'nowrap' }}>{fmtDate(mtg.scheduled_at)}</td>
                      <td><StatusBadge status={mtg.status} /></td>
                      <td><DocLinks assets={mtg.assets} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="card" style={{ overflow: 'hidden', marginBottom: 26 }}>
              {schedule.length > 0 ? (
                <table>
                  <thead><tr><th>Town</th><th>Board</th><th>Recurring schedule</th></tr></thead>
                  <tbody>
                    {schedule.map((s, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 600 }}>{s.town}</td>
                        <td style={{ fontSize: 13 }}>{s.board}</td>
                        <td className="muted" style={{ fontSize: 13 }}>{s.pattern}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="muted" style={{ padding: 20, fontSize: 13 }}>No upcoming meetings for this filter.</div>
              )}
            </div>
          )}

          {/* History */}
          <h2 style={{ fontSize: 16, margin: '0 0 12px' }}>
            Meeting history
            <span className="muted" style={{ fontSize: 13, fontWeight: 400 }}> · {history.length}</span>
          </h2>
          <div className="card" style={{ overflow: 'hidden' }}>
            {history.length > 0 ? (
              <table>
                <thead>
                  <tr><th>Town</th><th>Board</th><th>Date</th><th>Status</th><th>Documents</th><th style={{ width: 60 }}>Text</th><th style={{ width: 70 }}>Source</th></tr>
                </thead>
                <tbody>
                  {history.map((mtg) => (
                    <tr key={mtg.id}>
                      <td style={{ fontWeight: 600 }}>
                        {mtg.muni_name}
                        {mtg.title && <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{mtg.title}</div>}
                      </td>
                      <td style={{ fontSize: 13 }}>{mtg.body_name}</td>
                      <td style={{ fontSize: 13, whiteSpace: 'nowrap' }}>{fmtDate(mtg.scheduled_at)}</td>
                      <td><StatusBadge status={mtg.status} /></td>
                      <td><DocLinks assets={mtg.assets} /></td>
                      <td style={{ fontSize: 13 }}>{mtg.text_count > 0 ? '✓' : '—'}</td>
                      <td>
                        {mtg.source_url ? (
                          <a href={mtg.source_url} target="_blank" rel="noopener noreferrer" className="muted">Page ↗</a>
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
                  ? 'No meetings match this filter. Run the ingest pipeline (/admin/api/municipal/ingest-one?muni=nc) to populate history.'
                  : 'Pipeline database not connected in this environment. Configured towns and boards are shown above; ingested meetings will appear once NEON_DATABASE_URL is set and the ingest has run.'}
              </div>
            )}
          </div>

          {!data.dbOk && data.dbError && (
            <p className="muted" style={{ fontSize: 11, marginTop: 12 }}>DB: {data.dbError}</p>
          )}
        </>
      )}
    </div>
  )
}
