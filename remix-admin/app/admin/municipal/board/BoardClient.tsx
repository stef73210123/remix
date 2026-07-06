'use client'

import { useEffect, useMemo, useState } from 'react'
import AdminNav from '@/app/admin/AdminNav'

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

      {loading && <div className="muted" style={{ padding: 20 }}>Loading board…</div>}
      {error && <div className="error" style={{ padding: 20 }}>{error}</div>}

      {data && !loading && (
        <>
          <h1 className="page-title" style={{ marginBottom: 4 }}>{data.board.displayName}</h1>
          <div className="muted" style={{ fontSize: 13, marginBottom: 20 }}>
            {data.town.name}{data.town.county ? ` · ${data.town.county} County` : ''}, {data.town.state}
            {data.board.meetingPattern ? ` · ${data.board.meetingPattern}` : ''}
          </div>

          {/* Members */}
          <h2 style={{ fontSize: 16, margin: '0 0 12px' }}>
            Board members
            <span className="muted" style={{ fontSize: 13, fontWeight: 400 }}> · {data.members.length}</span>
          </h2>
          <div className="card table-card" style={{ marginBottom: 26 }}>
            {data.members.length > 0 ? (
              <table>
                <thead><tr><th>Name</th><th>Title</th><th>Role</th><th>Contact</th></tr></thead>
                <tbody>
                  {data.members.map((m) => (
                    <tr key={m.id}>
                      <td style={{ fontWeight: 600 }}>{m.full_name}</td>
                      <td style={{ fontSize: 13 }}>{m.title || '—'}</td>
                      <td style={{ fontSize: 13 }}>{m.kind}</td>
                      <td style={{ fontSize: 13 }}>{m.email ? <a href={`mailto:${m.email}`} className="muted">{m.email}</a> : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="muted" style={{ padding: 20, fontSize: 13 }}>
                No board members recorded yet. Members are populated by officials enrichment (M2) — parsing them from meeting minutes and the town site.
              </div>
            )}
          </div>

          {/* Open files */}
          <h2 style={{ fontSize: 16, margin: '0 0 12px' }}>
            Open files
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
                No open files tracked yet. Applications/matters (site plans, variances, special-use permits) are extracted from agendas &amp; minutes in M2.
              </div>
            )}
          </div>

          {/* Meetings */}
          <h2 style={{ fontSize: 16, margin: '0 0 12px' }}>
            Meetings
            <span className="muted" style={{ fontSize: 13, fontWeight: 400 }}> · {data.meetings.length}</span>
          </h2>
          <div className="card table-card">
            {data.meetings.length > 0 ? (
              <table>
                <thead><tr><th>Date</th><th>Status</th><th>Documents</th><th style={{ width: 60 }}>Text</th><th style={{ width: 70 }}>Source</th></tr></thead>
                <tbody>
                  {data.meetings.map((mtg) => (
                    <tr key={mtg.id}>
                      <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
                        {fmtDate(mtg.scheduled_at)}
                        {mtg.title && <div className="muted" style={{ fontSize: 12, marginTop: 2, fontWeight: 400 }}>{mtg.title}</div>}
                      </td>
                      <td style={{ fontSize: 13 }}>{mtg.status}</td>
                      <td><DocLinks assets={mtg.assets} /></td>
                      <td style={{ fontSize: 13 }}>{mtg.text_count > 0 ? '✓' : '—'}</td>
                      <td>{mtg.source_url ? <a href={mtg.source_url} target="_blank" rel="noopener noreferrer" className="muted">Page ↗</a> : <span className="muted">—</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="muted" style={{ padding: 20, fontSize: 13 }}>No meetings ingested for this board yet.</div>
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
