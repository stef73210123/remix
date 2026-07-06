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

function fmtDate(d: Date | string): string {
  const dt = typeof d === 'string' ? new Date(d) : d
  if (!dt || isNaN(dt.getTime())) return '—'
  return dt.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

function startOfToday(): number {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

// ── Recurring-pattern → next date ─────────────────────────────────────────
// Parses human patterns like "2nd & 4th Wednesday 7:30pm" or "1st Thursday"
// into the next actual calendar date on/after `from`. Returns null for vague
// patterns ("Monthly", "Quarterly to monthly") that don't name a weekday.
const WEEKDAYS: Record<string, number> = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6,
}
const ORDINALS: Record<string, number> = {
  '1st': 1, '2nd': 2, '3rd': 3, '4th': 4, '5th': 5, last: -1,
}

function nthWeekday(year: number, month: number, weekday: number, n: number): Date | null {
  if (n === -1) {
    const last = new Date(year, month + 1, 0)
    const diff = (last.getDay() - weekday + 7) % 7
    return new Date(year, month, last.getDate() - diff)
  }
  const first = new Date(year, month, 1)
  const offset = (weekday - first.getDay() + 7) % 7
  const d = new Date(year, month, 1 + offset + (n - 1) * 7)
  return d.getMonth() === month ? d : null
}

function nextMeetingDate(pattern: string | null, from: Date): Date | null {
  if (!pattern) return null
  const p = pattern.toLowerCase()
  const weekdayName = Object.keys(WEEKDAYS).find((w) => p.includes(w))
  if (!weekdayName) return null
  const weekday = WEEKDAYS[weekdayName]
  const ords: number[] = []
  for (const [k, v] of Object.entries(ORDINALS)) {
    if (new RegExp(`(^|[^a-z0-9])${k}([^a-z0-9]|$)`).test(p)) ords.push(v)
  }
  if (ords.length === 0) return null
  const uniq = Array.from(new Set(ords))
  const base = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  let best: Date | null = null
  for (let mo = 0; mo <= 3; mo++) {
    const total = base.getMonth() + mo
    const y = base.getFullYear() + Math.floor(total / 12)
    const m = ((total % 12) + 12) % 12
    for (const n of uniq) {
      const d = nthWeekday(y, m, weekday, n)
      if (d && d.getTime() >= base.getTime() && (!best || d < best)) best = d
    }
  }
  return best
}

const STATUS_COLOR: Record<string, string> = {
  held: 'var(--a)', scheduled: 'var(--b)', cancelled: 'var(--c)', rescheduled: 'var(--warn)',
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

function AgendaLink({ assets }: { assets: Asset[] }) {
  const agenda = assets.find((a) => a.kind === 'agenda')
  const href = agenda ? agenda.blobUrl || agenda.sourceUrl || '' : ''
  return href ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className="badge state" style={{ textDecoration: 'none' }}>
      Agenda ↗
    </a>
  ) : (
    <span className="muted">—</span>
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

  const allBoards = useMemo(() => {
    if (!data) return [] as string[]
    const seen = new Set<string>()
    const out: string[] = []
    for (const m of data.municipalities)
      for (const b of m.bodies)
        if (!seen.has(b.displayName)) { seen.add(b.displayName); out.push(b.displayName) }
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

  const history = useMemo(
    () => meetingsFiltered.filter((m) => new Date(m.scheduled_at).getTime() < startOfToday()),
    [meetingsFiltered]
  )

  // One "next meeting" row per tracked board: prefer a real ingested upcoming
  // meeting (with its agenda); otherwise project the next date from the schedule.
  const upcomingRows = useMemo(() => {
    const t0 = startOfToday()
    const today = new Date(t0)
    const rows: { town: string; board: string; muniKey: string; bodyKey: string; date: Date | null; assets: Asset[]; pattern: string | null; projected: boolean }[] = []
    const meetings = data?.meetings ?? []
    for (const m of munisShown) {
      for (const b of m.bodies) {
        if (board !== 'ALL' && b.displayName !== board) continue
        const ingested = meetings
          .filter((mm) => mm.muni_key === m.key && mm.body_name === b.displayName && new Date(mm.scheduled_at).getTime() >= t0)
          .sort((a, c) => new Date(a.scheduled_at).getTime() - new Date(c.scheduled_at).getTime())[0]
        const common = { town: m.name, board: b.displayName, muniKey: m.key, bodyKey: b.key, pattern: b.meetingPattern }
        if (ingested) {
          rows.push({ ...common, date: new Date(ingested.scheduled_at), assets: ingested.assets, projected: false })
        } else {
          rows.push({ ...common, date: nextMeetingDate(b.meetingPattern, today), assets: [], projected: true })
        }
      }
    }
    rows.sort((a, c) => {
      if (a.date && c.date) return a.date.getTime() - c.date.getTime()
      if (a.date) return -1
      if (c.date) return 1
      return 0
    })
    return rows
  }, [munisShown, board, data])

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
          <div className="pill-strip" style={{ display: 'flex', gap: 6, flexWrap: 'nowrap', marginBottom: 8 }}>
            <Chip active={town === 'ALL'} onClick={() => setTown('ALL')}>All towns</Chip>
            {data.municipalities.map((m) => (
              <Chip key={m.key} active={town === m.key} onClick={() => setTown(m.key)}>{m.name}</Chip>
            ))}
          </div>
          <div className="pill-strip" style={{ display: 'flex', gap: 6, flexWrap: 'nowrap', marginBottom: 22 }}>
            <Chip active={board === 'ALL'} onClick={() => setBoard('ALL')}>All boards</Chip>
            {allBoards.map((b) => (
              <Chip key={b} active={board === b} onClick={() => setBoard(b)}>{b}</Chip>
            ))}
          </div>

          {/* Upcoming — actual next meeting date per board + agenda when available */}
          <h2 style={{ fontSize: 16, margin: '0 0 12px' }}>Upcoming meetings</h2>
          <div className="card table-card" style={{ marginBottom: 26 }}>
            {upcomingRows.length > 0 ? (
              <table>
                <thead>
                  <tr><th>Town</th><th>Board</th><th>Next meeting</th><th>Agenda</th></tr>
                </thead>
                <tbody>
                  {upcomingRows.map((r, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 600 }}>{r.town}</td>
                      <td style={{ fontSize: 13 }}>
                        <a href={`/admin/municipal/board?muni=${r.muniKey}&body=${r.bodyKey}`} style={{ color: 'var(--primary-light)' }}>{r.board}</a>
                      </td>
                      <td style={{ fontSize: 13, whiteSpace: 'nowrap' }}>
                        {r.date ? (
                          <span title={r.projected ? 'Projected from meeting schedule' : undefined}>
                            {fmtDate(r.date)}{r.projected ? ' *' : ''}
                          </span>
                        ) : (
                          <span className="muted">{r.pattern || 'schedule TBD'}</span>
                        )}
                      </td>
                      <td><AgendaLink assets={r.assets} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="muted" style={{ padding: 20, fontSize: 13 }}>No boards match this filter.</div>
            )}
          </div>
          <div className="muted" style={{ fontSize: 11, marginTop: -18, marginBottom: 26 }}>
            * projected from the board&apos;s recurring schedule; agenda links appear once a meeting is published/ingested.
          </div>

          {/* History */}
          <h2 style={{ fontSize: 16, margin: '0 0 12px' }}>
            Meeting history
            <span className="muted" style={{ fontSize: 13, fontWeight: 400 }}> · {history.length}</span>
          </h2>
          <div className="card table-card">
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
                      <td style={{ fontSize: 13 }}>
                        <a href={`/admin/municipal/board?muni=${mtg.muni_key}&body=${mtg.body_key}`} style={{ color: 'var(--primary-light)' }}>{mtg.body_name}</a>
                      </td>
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
