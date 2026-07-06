'use client'

import { useEffect, useMemo, useState } from 'react'
import AdminNav from '@/app/admin/AdminNav'
import Breadcrumbs, { type Crumb } from '../Breadcrumbs'

const WORDMARK = 'https://remix-admin-omega.vercel.app/remix-wordmark.png'

interface BodyRef { key: string; displayName: string }
interface Member {
  id: string
  full_name: string
  title: string | null
  kind: string
  email: string | null
  active: boolean
  updated_at: string | null
}
interface MemberData {
  town: { key: string; name: string; state: string; county: string | null }
  member: Member | null
  bodies: BodyRef[]
  dbOk: boolean
  dbError?: string
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return (first + last).toUpperCase()
}

export default function MemberClient({ userName }: { userName: string }) {
  const [muni, setMuni] = useState('')
  const [fromBody, setFromBody] = useState('')
  const [data, setData] = useState<MemberData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    const m = p.get('muni') || ''
    const b = p.get('body') || ''
    const id = p.get('id') || ''
    setMuni(m)
    setFromBody(b)
    if (!m || !id) {
      setError('Missing town or member.')
      setLoading(false)
      return
    }
    setLoading(true)
    fetch(`/admin/api/municipal/member?muni=${encodeURIComponent(m)}&id=${encodeURIComponent(id)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('load'))))
      .then((d: MemberData) => setData(d))
      .catch(() => setError('Could not load this board member.'))
      .finally(() => setLoading(false))
  }, [])

  // Breadcrumb trail: Dashboard › Town › (Board) › Member.
  const crumbs = useMemo<Crumb[]>(() => {
    const trail: Crumb[] = [{ label: 'Dashboard', href: '/admin/municipal' }]
    if (data?.town) {
      trail.push({ label: data.town.name, href: `/admin/municipal?town=${data.town.key}` })
      // If we arrived from a specific board, include it as a climb-back crumb.
      const board = data.bodies.find((b) => b.key === fromBody)
      if (board) {
        trail.push({
          label: board.displayName,
          href: `/admin/municipal/board?muni=${data.town.key}&body=${board.key}`,
        })
      }
    }
    trail.push({ label: data?.member?.full_name || 'Member' })
    return trail
  }, [data, fromBody])

  const member = data?.member ?? null

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

      <div style={{ marginBottom: 20 }}>
        <Breadcrumbs items={crumbs} />
      </div>

      {loading && <div className="muted" style={{ padding: 20 }}>Loading member…</div>}
      {error && <div className="error" style={{ padding: 20 }}>{error}</div>}

      {member && !loading && (
        <>
          {/* Identity header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap', marginBottom: 8 }}>
            <div
              aria-hidden
              style={{
                width: 64, height: 64, borderRadius: '50%', flexShrink: 0,
                background: 'var(--panel-2)', border: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22, fontWeight: 700, color: 'var(--primary-light)',
              }}
            >
              {initials(member.full_name)}
            </div>
            <div>
              <h1 className="page-title" style={{ margin: 0 }}>{member.full_name}</h1>
              <div className="muted" style={{ fontSize: 14, marginTop: 4 }}>
                {member.title || '—'}
                {data?.town ? ` · ${data.town.name}, ${data.town.state}` : ''}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '10px 0 24px' }}>
            <span className="badge state">{member.kind.replace(/_/g, ' ')}</span>
            <span className="badge state">{member.active ? 'Active' : 'Inactive'}</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginBottom: 26 }}>
            {/* Contact */}
            <div className="card" style={{ padding: 16 }}>
              <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
                Contact
              </div>
              {member.email ? (
                <a href={`mailto:${member.email}`} style={{ color: 'var(--primary-light)', wordBreak: 'break-all', fontSize: 14 }}>
                  {member.email}
                </a>
              ) : (
                <div className="muted" style={{ fontSize: 13 }}>No email on record.</div>
              )}
              <div className="muted" style={{ fontSize: 12, marginTop: 14 }}>
                Last updated {fmtDate(member.updated_at)}
              </div>
            </div>

            {/* Role */}
            <div className="card" style={{ padding: 16 }}>
              <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
                Role
              </div>
              <div style={{ fontSize: 14 }}>{member.title || 'Member'}</div>
              <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
                {member.kind.replace(/_/g, ' ')} official
              </div>
            </div>
          </div>

          {/* Boards this person serves on */}
          <h2 style={{ fontSize: 16, margin: '0 0 12px' }}>
            Serves on
            <span className="muted" style={{ fontSize: 13, fontWeight: 400 }}> · {data?.bodies.length ?? 0}</span>
          </h2>
          {data && data.bodies.length > 0 ? (
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 28 }}>
              {data.bodies.map((b) => (
                <a
                  key={b.key}
                  href={`/admin/municipal/board?muni=${data.town.key}&body=${b.key}`}
                  className="card"
                  style={{ padding: '12px 16px', minWidth: 200, textDecoration: 'none', display: 'block' }}
                >
                  <div style={{ fontWeight: 600 }}>{b.displayName}</div>
                  <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>{data.town.name} →</div>
                </a>
              ))}
            </div>
          ) : (
            <div className="card" style={{ marginBottom: 28 }}>
              <div className="muted" style={{ padding: 20, fontSize: 13 }}>No board memberships on record.</div>
            </div>
          )}

          {/* Climb-back trail at the end of the profile */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
            <Breadcrumbs items={crumbs} />
          </div>

          {!data?.dbOk && data?.dbError && (
            <p className="muted" style={{ fontSize: 11, marginTop: 12 }}>DB: {data.dbError}</p>
          )}
        </>
      )}
    </div>
  )
}
