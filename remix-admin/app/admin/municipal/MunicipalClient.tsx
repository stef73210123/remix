'use client'

import { Fragment, useEffect, useMemo, useState } from 'react'
import type { TownBudget } from '@/lib/municipal/budget'
import BudgetPanel from './budget/BudgetPanel'

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

interface AgendaItem {
  title: string
  action: string | null
  heading?: boolean
}

/** Group a flat agenda list into sections: each heading row starts a new
 *  section that the following items nest under. Items before the first
 *  heading fall in a leading section with no header. */
function groupAgenda(items: AgendaItem[]): { heading: string | null; items: AgendaItem[] }[] {
  const groups: { heading: string | null; items: AgendaItem[] }[] = []
  let current: { heading: string | null; items: AgendaItem[] } | null = null
  for (const it of items) {
    if (it.heading) {
      current = { heading: it.title, items: [] }
      groups.push(current)
    } else {
      if (!current) {
        current = { heading: null, items: [] }
        groups.push(current)
      }
      current.items.push(it)
    }
  }
  return groups
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

const RECORDING_KINDS = new Set(['video_mp4', 'audio_mp3'])

function recordingHref(assets: Asset[]): string {
  const a = (assets || []).find((x) => RECORDING_KINDS.has(x.kind))
  return a ? a.blobUrl || a.sourceUrl || '' : ''
}

function RecordingLink({ assets }: { assets: Asset[] }) {
  const href = recordingHref(assets)
  if (!href) return null
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="badge state"
      style={{ textDecoration: 'none', whiteSpace: 'nowrap' }}
      title="Meeting recording"
    >
      ▶ Recording ↗
    </a>
  )
}

function DocLinks({ assets }: { assets: Asset[] }) {
  // Recordings are surfaced separately (RecordingLink); this lists documents.
  const docs = (assets || []).filter((a) => !RECORDING_KINDS.has(a.kind))
  if (docs.length === 0) return <span className="muted">—</span>
  return (
    <span style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 6 }}>
      {docs.map((a, i) => {
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

export default function MunicipalClient({
  userName,
  budgets,
}: {
  userName: string
  budgets: Record<string, TownBudget>
}) {
  const [data, setData] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [town, setTown] = useState<TownFilter>('ALL')
  const [board, setBoard] = useState<BoardFilter>('ALL')
  // When "All towns" is selected, the financial-analysis section shows one
  // town at a time, chosen with this toggle.
  const [budgetTown, setBudgetTown] = useState<string>('')

  // Expandable history rows: which meeting ids are open + their lazy-loaded
  // summary/preview keyed by meeting id.
  const [openRows, setOpenRows] = useState<Set<string>>(new Set())
  const [details, setDetails] = useState<
    Record<
      string,
      {
        loading: boolean
        agendaItems?: AgendaItem[]
        summary?: string | null
        excerpt?: string | null
        error?: boolean
      }
    >
  >({})

  function toggleRow(id: string) {
    setOpenRows((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    setDetails((prev) => {
      if (prev[id]) return prev // already loaded / loading
      fetch(`/admin/api/municipal/meeting?id=${encodeURIComponent(id)}`)
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error('load'))))
        .then((d) =>
          setDetails((p) => ({
            ...p,
            [id]: { loading: false, agendaItems: d.agendaItems || [], summary: d.summary, excerpt: d.excerpt },
          }))
        )
        .catch(() => setDetails((p) => ({ ...p, [id]: { loading: false, error: true } })))
      return { ...prev, [id]: { loading: true } }
    })
  }

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

  // Towns that have budget data — the choices for the "All towns" toggle.
  const budgetTownList = useMemo(
    () => (data ? data.municipalities.filter((m) => budgets[m.key]) : []),
    [data, budgets]
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
          <a className="btn secondary" href="/admin/municipal/budget?town=nc">Budget</a>
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

          {/* Town profile — shown when a single town is selected in the strip:
              its budget, boards & committees, then its meetings below. */}
          {town !== 'ALL' && (() => {
            const m = data.municipalities.find((x) => x.key === town)
            if (!m) return null
            return (
              <div className="card" style={{ padding: 18, marginBottom: 22 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>{m.name}</div>
                    <div className="muted" style={{ fontSize: 13 }}>
                      {[m.county ? `${m.county} County` : null, m.state].filter(Boolean).join(' · ')}
                      {' · '}{m.bodies.length} boards &amp; committees
                    </div>
                  </div>
                  <a className="btn" href={`/admin/municipal/budget?town=${m.key}`}>Budget ↗</a>
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--muted)', margin: '16px 0 8px' }}>
                  Boards &amp; committees
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {m.bodies.map((b) => (
                    <a key={b.key} href={`/admin/municipal/board?muni=${m.key}&body=${b.key}`} className="btn secondary" style={{ padding: '6px 12px', fontSize: 13 }}>
                      {b.displayName}
                    </a>
                  ))}
                </div>
              </div>
            )
          })()}

          {/* Financial analysis — the selected town's budget, or a town toggle
              when viewing all towns. */}
          {(() => {
            const activeKey =
              town !== 'ALL' ? town : (budgetTown && budgets[budgetTown] ? budgetTown : budgetTownList[0]?.key || '')
            const activeBudget = activeKey ? budgets[activeKey] : undefined
            return (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', margin: '0 0 12px' }}>
                  <h2 style={{ fontSize: 16, margin: 0 }}>Financial analysis</h2>
                  {town === 'ALL' && budgetTownList.length > 0 && (
                    <div className="pill-strip" style={{ display: 'flex', gap: 6, flexWrap: 'nowrap' }}>
                      {budgetTownList.map((m) => (
                        <Chip key={m.key} active={activeKey === m.key} onClick={() => setBudgetTown(m.key)}>{m.name}</Chip>
                      ))}
                    </div>
                  )}
                </div>
                {activeBudget ? (
                  <div style={{ marginBottom: 26 }}>
                    <BudgetPanel budget={activeBudget} />
                  </div>
                ) : (
                  <div className="card" style={{ marginBottom: 26 }}>
                    <div className="muted" style={{ padding: 20, fontSize: 13 }}>
                      No budget data for{' '}
                      {town !== 'ALL'
                        ? data.municipalities.find((m) => m.key === town)?.name || 'this town'
                        : 'the tracked towns'}{' '}
                      yet.
                    </div>
                  </div>
                )}
              </>
            )
          })()}

          {/* Upcoming — horizontal timeline of the next meeting per board */}
          <h2 style={{ fontSize: 16, margin: '0 0 12px' }}>Upcoming meetings</h2>
          {upcomingRows.length > 0 ? (
            <div className="card" style={{ padding: '22px 8px 18px', marginBottom: 8, overflowX: 'auto' }}>
              <div style={{ display: 'flex', minWidth: 'min-content' }}>
                {upcomingRows.map((r, i) => (
                  <div key={i} style={{ flex: '0 0 190px', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 8px' }}>
                    {/* rail + dot */}
                    <div style={{ position: 'relative', width: '100%', height: 16, marginBottom: 12 }}>
                      <div style={{ position: 'absolute', top: 7, left: 0, right: 0, height: 2, background: 'var(--border)' }} />
                      {i === 0 && <div style={{ position: 'absolute', top: 7, left: 0, width: '50%', height: 2, background: 'var(--panel)' }} />}
                      {i === upcomingRows.length - 1 && <div style={{ position: 'absolute', top: 7, right: 0, width: '50%', height: 2, background: 'var(--panel)' }} />}
                      <div style={{ position: 'absolute', top: 1, left: '50%', transform: 'translateX(-50%)', width: 13, height: 13, borderRadius: 999, background: r.projected ? 'var(--c)' : 'var(--primary)', border: '2px solid var(--panel)' }} />
                    </div>
                    {/* content */}
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap' }} title={r.projected ? 'Projected from meeting schedule' : undefined}>
                        {r.date ? `${fmtDate(r.date)}${r.projected ? ' *' : ''}` : (r.pattern || 'TBD')}
                      </div>
                      <div style={{ fontSize: 13, marginTop: 3 }}>
                        <a href={`/admin/municipal/board?muni=${r.muniKey}&body=${r.bodyKey}`} style={{ color: 'var(--primary-light)' }}>{r.board}</a>
                      </div>
                      <div className="muted" style={{ fontSize: 12 }}>{r.town}</div>
                      <div style={{ marginTop: 8 }}><AgendaLink assets={r.assets} /></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="card" style={{ marginBottom: 8 }}>
              <div className="muted" style={{ padding: 20, fontSize: 13 }}>No boards match this filter.</div>
            </div>
          )}
          <div className="muted" style={{ fontSize: 11, marginBottom: 26 }}>
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
                  <tr>
                    <th style={{ width: 26 }}></th>
                    <th>Town</th><th>Board</th><th>Date</th><th>Status</th>
                    <th>Recording</th><th>Documents</th>
                    <th style={{ width: 50 }}>Text</th><th style={{ width: 64 }}>Source</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((mtg) => {
                    const isOpen = openRows.has(mtg.id)
                    const d = details[mtg.id]
                    const stop = (e: React.MouseEvent) => e.stopPropagation()
                    return (
                      <Fragment key={mtg.id}>
                        <tr onClick={() => toggleRow(mtg.id)} style={{ cursor: 'pointer' }}>
                          <td style={{ color: 'var(--muted)', textAlign: 'center' }}>{isOpen ? '▾' : '▸'}</td>
                          <td style={{ fontWeight: 600 }}>
                            {mtg.muni_name}
                            {mtg.title && <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{mtg.title}</div>}
                          </td>
                          <td style={{ fontSize: 13 }} onClick={stop}>
                            <a href={`/admin/municipal/board?muni=${mtg.muni_key}&body=${mtg.body_key}`} style={{ color: 'var(--primary-light)' }}>{mtg.body_name}</a>
                          </td>
                          <td style={{ fontSize: 13, whiteSpace: 'nowrap' }}>{fmtDate(mtg.scheduled_at)}</td>
                          <td><StatusBadge status={mtg.status} /></td>
                          <td onClick={stop}>
                            {recordingHref(mtg.assets) ? <RecordingLink assets={mtg.assets} /> : <span className="muted">—</span>}
                          </td>
                          <td onClick={stop}><DocLinks assets={mtg.assets} /></td>
                          <td style={{ fontSize: 13 }}>{mtg.text_count > 0 ? '✓' : '—'}</td>
                          <td onClick={stop}>
                            {mtg.source_url ? (
                              <a href={mtg.source_url} target="_blank" rel="noopener noreferrer" className="muted">Page ↗</a>
                            ) : (
                              <span className="muted">—</span>
                            )}
                          </td>
                        </tr>
                        {isOpen && (
                          <tr>
                            <td colSpan={9} style={{ background: 'var(--panel-2)', padding: '14px 18px', borderTop: '1px solid var(--border)' }}>
                              <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                                <div style={{ flex: '1 1 420px', minWidth: 0 }}>
                                  <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--muted)', marginBottom: 6 }}>
                                    Agenda
                                  </div>
                                  {d?.loading ? (
                                    <div className="muted" style={{ fontSize: 13 }}>Loading agenda…</div>
                                  ) : d?.agendaItems && d.agendaItems.length > 0 ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                      {groupAgenda(d.agendaItems).map((g, gi) => (
                                        <div key={gi}>
                                          {g.heading && (
                                            <div
                                              style={{
                                                fontSize: 13,
                                                fontWeight: 700,
                                                textDecoration: 'underline',
                                                textUnderlineOffset: 3,
                                                color: 'var(--primary-light)',
                                                marginBottom: 6,
                                              }}
                                            >
                                              {g.heading}
                                            </div>
                                          )}
                                          <ul
                                            style={{
                                              margin: 0,
                                              paddingLeft: g.heading ? 28 : 18,
                                              display: 'flex',
                                              flexDirection: 'column',
                                              gap: 6,
                                            }}
                                          >
                                            {g.items.map((it, k) => (
                                              <li key={k} style={{ fontSize: 13, lineHeight: 1.5 }}>
                                                {it.action && <strong style={{ color: 'var(--primary-light)' }}>{it.action}</strong>}
                                                {it.action ? ' — ' : ''}
                                                {it.title}
                                              </li>
                                            ))}
                                          </ul>
                                        </div>
                                      ))}
                                    </div>
                                  ) : d?.summary ? (
                                    <div style={{ fontSize: 13, lineHeight: 1.55 }}>{d.summary}</div>
                                  ) : d?.excerpt ? (
                                    <div style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--muted)' }}>
                                      {d.excerpt}{d.excerpt.length >= 1400 ? '…' : ''}
                                      <div style={{ fontSize: 11, marginTop: 6 }}>Preview from the meeting&apos;s extracted text — agenda not itemized.</div>
                                    </div>
                                  ) : (
                                    <div className="muted" style={{ fontSize: 13 }}>
                                      {d?.error ? 'Could not load the agenda.' : 'No agenda or minutes text available for this meeting yet.'}
                                    </div>
                                  )}
                                </div>
                                {recordingHref(mtg.assets) && (
                                  <div style={{ flex: '0 0 auto' }}>
                                    <a href={recordingHref(mtg.assets)} target="_blank" rel="noopener noreferrer" className="btn" style={{ whiteSpace: 'nowrap' }}>
                                      ▶ Watch recording ↗
                                    </a>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    )
                  })}
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
