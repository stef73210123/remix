'use client'

import { useEffect, useMemo, useState } from 'react'
import MuniHeader from '@/app/admin/municipal/MuniHeader'
import Breadcrumbs, { type Crumb } from '../Breadcrumbs'
import MemberSentiment from './MemberSentiment'
import MemberDossier from './MemberDossier'
import MemberElections from './MemberElections'
import type { MemberDossier as Dossier, MemberTerm } from '@/lib/municipal/analysis'
import { sentimentChipStyle, fmtSent, sentimentLabel } from '../sentiment'


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

function TermDetails({ term }: { term: MemberTerm }) {
  const now = new Date().getFullYear()
  const verb = term.type === 'appointed' ? 'appointed' : 'elected'
  const rows: { label: string; value: string }[] = []
  if (term.firstYear) rows.push({ label: `First ${verb}`, value: String(term.firstYear) })
  if (term.start && term.end) rows.push({ label: 'Current term', value: `${term.start}–${term.end}` })
  if (term.lengthYears) rows.push({ label: 'Term length', value: `${term.lengthYears} years` })
  const ended = term.end != null && term.end < now
  const remaining = term.end != null ? term.end - now : null
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {rows.map((r) => (
        <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 13 }}>
          <span className="muted">{r.label}</span>
          <span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{r.value}</span>
        </div>
      ))}
      {term.end != null && (
        <div className="muted" style={{ fontSize: 12, marginTop: 4, lineHeight: 1.4 }}>
          {ended
            ? `Term ended Dec 31, ${term.end}`
            : `Term expires Dec 31, ${term.end}` +
              (remaining != null && remaining > 0 ? ` · ~${remaining} yr${remaining === 1 ? '' : 's'} remaining` : ' · up this year')}
        </div>
      )}
    </div>
  )
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
  const [dossier, setDossier] = useState<Dossier | null>(null)
  const [photoBroken, setPhotoBroken] = useState(false)
  const [score, setScore] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    const m = p.get('muni') || ''
    const b = p.get('body') || ''
    const id = p.get('id') || ''
    const byName = p.get('byName') || ''
    setMuni(m)
    setFromBody(b)
    if (!m || (!id && !byName)) {
      setError('Missing town or member.')
      setLoading(false)
      return
    }
    setLoading(true)
    if (id) {
      fetch(`/admin/api/municipal/member?muni=${encodeURIComponent(m)}&id=${encodeURIComponent(id)}`)
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error('load'))))
        .then((d: MemberData) => setData(d))
        .catch(() => setError('Could not load this board member.'))
        .finally(() => setLoading(false))
      return
    }
    // Reached by name (e.g. an analysis-only member like "Chair"): resolve town +
    // board from the board API and match a DB official if one exists.
    fetch(`/admin/api/municipal/board?muni=${encodeURIComponent(m)}&body=${encodeURIComponent(b)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('load'))))
      .then((bd) => {
        const officials: Member[] = bd.members || []
        const matched = officials.find(
          (o) => o.full_name.toLowerCase() === byName.toLowerCase() ||
                 o.full_name.toLowerCase().includes(byName.toLowerCase())
        )
        setData({
          town: bd.town,
          member: matched || {
            id: '', full_name: byName, title: 'Board member', kind: 'appointed',
            email: null, active: true, updated_at: null,
          },
          bodies: bd.board ? [{ key: bd.board.key, displayName: bd.board.displayName }] : [],
          dbOk: bd.dbOk ?? true,
        })
      })
      .catch(() => setError('Could not load this board member.'))
      .finally(() => setLoading(false))
  }, [])

  // Researched dossier drives the headshot + authoritative contact email in the
  // header (the DB record often has neither for these officials).
  const memberName = data?.member?.full_name
  useEffect(() => {
    setPhotoBroken(false)
    if (!muni || !fromBody || !memberName) { setDossier(null); return }
    fetch(`/admin/api/municipal/member-dossier?muni=${encodeURIComponent(muni)}&body=${encodeURIComponent(fromBody)}&name=${encodeURIComponent(memberName)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('load'))))
      .then((x) => setDossier(x && x.available !== false ? x : null))
      .catch(() => setDossier(null))
  }, [muni, fromBody, memberName])

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
      <MuniHeader userName={userName} />

      <div style={{ marginBottom: 20 }}>
        <Breadcrumbs items={crumbs} />
      </div>

      {loading && <div className="muted" style={{ padding: 20 }}>Loading member…</div>}
      {error && <div className="error" style={{ padding: 20 }}>{error}</div>}

      {member && !loading && (
        <>
          {/* Identity header — headshot, name + progress score, then chips aligned
              with the name text to the right of the image. */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap', margin: '0 0 24px' }}>
            {dossier?.photo && !photoBroken ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={dossier.photo}
                alt={member.full_name}
                onError={() => setPhotoBroken(true)}
                style={{
                  width: 72, height: 72, borderRadius: '50%', flexShrink: 0,
                  objectFit: 'cover', border: '1px solid var(--border)', background: 'var(--panel-2)',
                }}
              />
            ) : (
              <div
                aria-hidden
                style={{
                  width: 72, height: 72, borderRadius: '50%', flexShrink: 0,
                  background: 'var(--panel-2)', border: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 24, fontWeight: 700, color: 'var(--primary-light)',
                }}
              >
                {initials(member.full_name)}
              </div>
            )}
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <h1 className="page-title" style={{ margin: 0 }}>{member.full_name}</h1>
                {score !== null && (
                  <span
                    title={`Progress score · ${sentimentLabel(score)}`}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    <span className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Progress score</span>
                    <span style={sentimentChipStyle(score)}>{fmtSent(score)}</span>
                  </span>
                )}
              </div>
              <div className="muted" style={{ fontSize: 14, marginTop: 4 }}>
                {dossier?.role || member.title || '—'}
                {data?.town ? ` · ${data.town.name}, ${data.town.state}` : ''}
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                <span className="badge state">{member.active ? 'Active' : 'Inactive'}</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginBottom: 26 }}>
            {/* Contact */}
            <div className="card" style={{ padding: 16 }}>
              <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
                Contact
              </div>
              {(() => {
                const email = member.email || dossier?.email
                return email ? (
                  <a href={`mailto:${email}`} style={{ color: 'var(--primary-light)', wordBreak: 'break-all', fontSize: 14 }}>
                    {email}
                  </a>
                ) : (
                  <div className="muted" style={{ fontSize: 13 }}>Not published.</div>
                )
              })()}
            </div>

            {/* Role */}
            <div className="card" style={{ padding: 16 }}>
              <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
                Role
              </div>
              <div style={{ fontSize: 14 }}>{dossier?.role || member.title || 'Member'}</div>
              <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
                {member.kind.replace(/_/g, ' ')} official
              </div>
            </div>

            {/* Term — elected/appointed dates, where researched */}
            {dossier?.term && (dossier.term.start || dossier.term.firstYear) && (
              <div className="card" style={{ padding: 16 }}>
                <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
                  Term
                </div>
                <TermDetails term={dossier.term} />
              </div>
            )}
          </div>

          {/* Researched dossier: background + how-to-engage (where available) */}
          {data && fromBody && member.full_name && (
            <MemberDossier muni={data.town.key} body={fromBody} memberName={member.full_name} />
          )}

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

          {/* Town-election history for this person (Supervisor / Town Board), where any. */}
          {data && member.full_name && (
            <MemberElections muniKey={data.town.key} name={member.full_name} />
          )}

          {/* Transcript-derived sentiment for this member (where a dataset exists) */}
          {data && fromBody && member.full_name && (
            <MemberSentiment muni={data.town.key} body={fromBody} memberName={member.full_name} onScore={setScore} />
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
