'use client'

import { useEffect, useMemo, useState } from 'react'
import AdminNav from '@/app/admin/AdminNav'
import Breadcrumbs, { type Crumb } from '../Breadcrumbs'

const WORDMARK = 'https://remix-admin-omega.vercel.app/remix-wordmark.png'

interface Asset { kind: string; sourceUrl: string | null; blobUrl: string | null; pageCount: number | null }
interface Meeting {
  id: string
  scheduled_at: string
  status: string
  title: string | null
  source_url: string | null
  assets: Asset[]
  text_count: number
}
interface Member {
  id: string
  full_name: string
  title: string | null
  kind: string
  email: string | null
  active: boolean
}
interface OpenFile {
  id: string
  kind: string
  subject: string
  applicant_name: string | null
  status: string
  application_date: string | null
  decision_date: string | null
}
interface BoardData {
  town: { key: string; name: string; state: string; county: string | null }
  board: { key: string; displayName: string; meetingPattern: string | null }
  meetings: Meeting[]
  members: Member[]
  openFiles: OpenFile[]
  dbOk: boolean
  dbError?: string
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

function DocLinks({ assets }: { assets: Asset[] }) {
  if (!assets || assets.length === 0) return <span className="muted">—</span>
  return (
    <span style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 6 }}>
      {assets.map((a, i) => {
        const href = a.blobUrl || a.sourceUrl || ''
        const label = a.kind.charAt(0).toUpperCase() + a.kind.slice(1)
        return href ? (
          <a key={i} href={href} target="_blank" rel="noopener noreferrer" className="badge state" style={{ textDecoration: 'none' }}>{label} ↗</a>
        ) : (
          <span key={i} className="badge state">{label}</span>
        )
      })}
    </span>
  )
}

function startOfToday(): number {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

// Next actual date from a recurring pattern like "2nd & 4th Wednesday 7:30pm".
const WEEKDAYS: Record<string, number> = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 }
const ORDINALS: Record<string, number> = { '1st': 1, '2nd': 2, '3rd': 3, '4th': 4, '5th': 5, last: -1 }
function nthWeekday(year: number, month: number, weekday: number, n: number): Date | null {
  if (n === -1) {
    const last = new Date(year, month + 1, 0)
    return new Date(year, month, last.getDate() - ((last.getDay() - weekday + 7) % 7))
  }
  const first = new Date(year, month, 1)
  const d = new Date(year, month, 1 + ((weekday - first.getDay() + 7) % 7) + (n - 1) * 7)
  return d.getMonth() === month ? d : null
}
function nextMeetingDate(pattern: string | null, from: Date): Date | null {
  if (!pattern) return null
  const p = pattern.toLowerCase()
  const wd = Object.keys(WEEKDAYS).find((w) => p.includes(w))
  if (!wd) return null
  const ords: number[] = []
  for (const [k, v] of Object.entries(ORDINALS)) if (new RegExp(`(^|[^a-z0-9])${k}([^a-z0-9]|$)`).test(p)) ords.push(v)
  if (!ords.length) return null
  const base = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  let best: Date | null = null
  for (let mo = 0; mo <= 3; mo++) {
    const total = base.getMonth() + mo
    const y = base.getFullYear() + Math.floor(total / 12)
    const m = ((total % 12) + 12) % 12
    for (const n of Array.from(new Set(ords))) {
      const d = nthWeekday(y, m, WEEKDAYS[wd], n)
      if (d && d.getTime() >= base.getTime() && (!best || d < best)) best = d
    }
  }
  return best
}

export default function BoardClient({ userName }: { userName: string }) {
  const [muni, setMuni] = useState('')
  const [body, setBody] = useState('')
  const [data, setData] = useState<BoardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    const m = p.get('muni') || ''
    const b = p.get('body') || ''
    setMuni(m)
    setBody(b)
    if (!m || !b) {
      setError('Missing town or board.')
      setLoading(false)
      return
    }
    setLoading(true)
    fetch(`/admin/api/municipal/board?muni=${encodeURIComponent(m)}&body=${encodeURIComponent(b)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('load'))))
      .then((d: BoardData) => setData(d))
      .catch(() => setError('Could not load this board.'))
      .finally(() => setLoading(false))
  }, [])

  const openCount = useMemo(() => data?.openFiles.length ?? 0, [data])
  const { upcoming, history } = useMemo(() => {
    const t0 = startOfToday()
    const ms = data?.meetings || []
    return {
      upcoming: ms
        .filter((m) => new Date(m.scheduled_at).getTime() >= t0)
        .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()),
      history: ms.filter((m) => new Date(m.scheduled_at).getTime() < t0),
    }
  }, [data])
  const projectedNext = useMemo(
    () => (data ? nextMeetingDate(data.board.meetingPattern, new Date(startOfToday())) : null),
    [data]
  )

  // Breadcrumb trail: Dashboard › Town › Board (current).
  const crumbs = useMemo<Crumb[]>(() => {
    const trail: Crumb[] = [{ label: 'Dashboard', href: '/admin/municipal' }]
    if (data?.town) trail.push({ label: data.town.name, href: `/admin/municipal?town=${data.town.key}` })
    trail.push({ label: data?.board.displayName || 'Board' })
    return trail
  }, [data])

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
        <AdminNav />
      </header>

      {data && !loading && (
        <div style={{ marginBottom: 20 }}>
          <Breadcrumbs items={crumbs} />
        </div>
      )}

      {loading && <div className="muted" style={{ padding: 20 }}>Loading board…</div>}
      {error && <div className="error" style={{ padding: 20 }}>{error}</div>}

      {data && !loading && (
        <>
          <h1 className="page-title" style={{ marginBottom: 4 }}>{data.board.displayName}</h1>
          <div className="muted" style={{ fontSize: 13, marginBottom: 20 }}>
            {data.town.name}{data.town.county ? ` · ${data.town.county} County` : ''}, {data.town.state}
            {data.board.meetingPattern ? ` · ${data.board.meetingPattern}` : ''}
          </div>

          {/* Members — horizontal carousel */}
          <h2 style={{ fontSize: 16, margin: '0 0 12px' }}>
            Board members
            <span className="muted" style={{ fontSize: 13, fontWeight: 400 }}> · {data.members.length}</span>
          </h2>
          {data.members.length > 0 ? (
            <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 6, marginBottom: 26, WebkitOverflowScrolling: 'touch' }}>
              {data.members.map((m) => (
                <a
                  key={m.id}
                  href={`/admin/municipal/member?muni=${data.town.key}&body=${data.board.key}&id=${m.id}`}
                  className="card"
                  style={{ padding: 14, minWidth: 210, flexShrink: 0, textDecoration: 'none', display: 'block' }}
                >
                  <div style={{ fontWeight: 700 }}>{m.full_name}</div>
                  <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{m.title || '—'}</div>
                  <span className="badge state" style={{ display: 'inline-block', marginTop: 10 }}>{m.kind.replace(/_/g, ' ')}</span>
                  {m.email && (
                    <div className="muted" style={{ fontSize: 12, marginTop: 10, wordBreak: 'break-all' }}>{m.email}</div>
                  )}
                  <div style={{ fontSize: 12, marginTop: 10, color: 'var(--primary-light)' }}>View profile →</div>
                </a>
              ))}
            </div>
          ) : (
            <div className="card" style={{ marginBottom: 26 }}>
              <div className="muted" style={{ padding: 20, fontSize: 13 }}>
                No members recorded yet — run officials enrichment (/admin/api/municipal/officials-refresh?muni={data.town.key}).
              </div>
            </div>
          )}

          {/* Cases before this board (map coming with matter extraction) */}
          <h2 style={{ fontSize: 16, margin: '0 0 12px' }}>
            Cases before this board
            <span className="muted" style={{ fontSize: 13, fontWeight: 400 }}> · {openCount}</span>
          </h2>
          <div className="card table-card" style={{ marginBottom: 26 }}>
            {data.openFiles.length > 0 ? (
              <table>
                <thead><tr><th>Subject</th><th>Applicant</th><th>Type</th><th>Status</th><th>Filed</th></tr></thead>
                <tbody>
                  {data.openFiles.map((f) => (
                    <tr key={f.id}>
                      <td style={{ fontWeight: 600 }}>{f.subject}</td>
                      <td style={{ fontSize: 13 }}>{f.applicant_name || '—'}</td>
                      <td style={{ fontSize: 13 }}>{f.kind.replace(/_/g, ' ')}</td>
                      <td style={{ fontSize: 13 }}>{f.status.replace(/_/g, ' ')}</td>
                      <td style={{ fontSize: 13, whiteSpace: 'nowrap' }}>{fmtDate(f.application_date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="muted" style={{ padding: 20, fontSize: 13 }}>
                No cases tracked yet. A map of case locations heard before this board is coming with matter extraction (M2).
              </div>
            )}
          </div>

          {/* Upcoming meetings */}
          <h2 style={{ fontSize: 16, margin: '0 0 12px' }}>Upcoming meetings</h2>
          <div className="card table-card" style={{ marginBottom: 26 }}>
            {upcoming.length > 0 ? (
              <table>
                <thead><tr><th>Date</th><th>Documents</th></tr></thead>
                <tbody>
                  {upcoming.map((mtg) => (
                    <tr key={mtg.id}>
                      <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{fmtDate(mtg.scheduled_at)}</td>
                      <td><DocLinks assets={mtg.assets} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="muted" style={{ padding: 20, fontSize: 13 }}>
                {projectedNext
                  ? `Next meeting (projected from schedule): ${fmtDate(projectedNext.toISOString())}`
                  : data.board.meetingPattern
                    ? `Schedule: ${data.board.meetingPattern}`
                    : 'No upcoming meetings.'}
              </div>
            )}
          </div>

          {/* Meeting history */}
          <h2 style={{ fontSize: 16, margin: '0 0 12px' }}>
            Meeting history
            <span className="muted" style={{ fontSize: 13, fontWeight: 400 }}> · {history.length}</span>
          </h2>
          <div className="card table-card" style={{ maxHeight: 360, overflowY: 'auto' }}>
            {history.length > 0 ? (
              <table>
                <thead><tr><th>Date</th><th>Documents</th></tr></thead>
                <tbody>
                  {history.map((mtg) => (
                    <tr key={mtg.id}>
                      <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
                        {fmtDate(mtg.scheduled_at)}
                        {mtg.title && <div className="muted" style={{ fontSize: 12, marginTop: 2, fontWeight: 400 }}>{mtg.title}</div>}
                      </td>
                      <td><DocLinks assets={mtg.assets} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="muted" style={{ padding: 20, fontSize: 13 }}>No meetings ingested for this board yet.</div>
            )}
          </div>

          {/* Climb-back trail at the end of the board page */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 26 }}>
            <Breadcrumbs items={crumbs} />
          </div>

          {!data.dbOk && data.dbError && (
            <p className="muted" style={{ fontSize: 11, marginTop: 12 }}>DB: {data.dbError}</p>
          )}
        </>
      )}
    </div>
  )
}
