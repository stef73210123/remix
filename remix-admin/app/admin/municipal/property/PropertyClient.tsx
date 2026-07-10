'use client'

import { useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import AdminNav from '@/app/admin/AdminNav'
import Breadcrumbs, { type Crumb } from '../Breadcrumbs'
import type { Property } from '@/lib/municipal/property'
import { sentimentChipStyle, fmtSent, sentimentColor, dispositionLabel } from '../sentiment'

const WORDMARK = 'https://remix-admin-omega.vercel.app/remix-wordmark.png'
const PropertyMap = dynamic(() => import('./PropertyMap'), {
  ssr: false,
  loading: () => <div className="card" style={{ height: 300 }} />,
})

interface Asset { kind: string; sourceUrl: string | null; blobUrl: string | null; pageCount: number | null }
interface Meeting { muni_key: string; body_key: string; body_name: string; scheduled_at: string; assets: Asset[] }
interface Summary { municipalities: { key: string; name: string }[]; meetings: Meeting[] }

function fmtDate(iso: string): string {
  const d = new Date(iso + (iso.length === 10 ? 'T12:00:00Z' : ''))
  if (isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

const ROLE_COLOR: Record<string, string> = {
  applicant: '#ca615f', 'attorney / firm': '#9b7fd4', engineer: '#5a9bd4',
  architect: '#3d9c72', company: '#b0862f', representative: '#7a8590',
}

export default function PropertyClient({ userName }: { userName: string }) {
  const [muni, setMuni] = useState('')
  const [prop, setProp] = useState<Property | null>(null)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    const m = p.get('muni') || ''
    const id = p.get('id') || ''
    setMuni(m)
    if (!m || !id) { setError('Missing property.'); setLoading(false); return }
    setLoading(true)
    Promise.all([
      fetch(`/admin/api/municipal/property?muni=${encodeURIComponent(m)}&id=${encodeURIComponent(id)}`).then((r) => (r.ok ? r.json() : null)),
      fetch('/admin/api/municipal/summary').then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ])
      .then(([pd, sd]) => {
        if (!pd || pd.available === false) { setError('Property not found.'); return }
        setProp(pd as Property)
        setSummary(sd as Summary)
      })
      .catch(() => setError('Could not load this property.'))
      .finally(() => setLoading(false))
  }, [])

  const townName = useMemo(
    () => summary?.municipalities.find((x) => x.key === muni)?.name || 'Town',
    [summary, muni]
  )

  // Related documents: meetings (by board + date) where this property appeared.
  const documents = useMemo(() => {
    if (!prop || !summary) return []
    const want = new Set(prop.timeline.map((e) => `${e.bodyKey}|${e.date}`))
    const rows: { date: string; board: string; assets: Asset[] }[] = []
    for (const mtg of summary.meetings) {
      if (mtg.muni_key !== muni) continue
      const key = `${mtg.body_key}|${mtg.scheduled_at.slice(0, 10)}`
      if (!want.has(key)) continue
      const docs = (mtg.assets || []).filter((a) => (a.blobUrl || a.sourceUrl))
      if (docs.length) rows.push({ date: mtg.scheduled_at.slice(0, 10), board: mtg.body_name, assets: docs })
    }
    rows.sort((a, b) => b.date.localeCompare(a.date))
    return rows
  }, [prop, summary, muni])

  const crumbs: Crumb[] = [
    { label: 'Dashboard', href: '/admin/municipal' },
    { label: townName, href: `/admin/municipal?town=${muni}` },
    { label: prop?.label || 'Property' },
  ]

  return (
    <div className="container">
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={WORDMARK} alt="Remix Properties" style={{ height: 34, display: 'block' }} />
          <div className="muted" style={{ fontSize: 13, marginTop: 6 }}>Municipal · Signed in as {userName}</div>
        </div>
        <AdminNav />
      </header>

      <div style={{ marginBottom: 20 }}><Breadcrumbs items={crumbs} /></div>

      {loading && <div className="muted" style={{ padding: 20 }}>Loading property…</div>}
      {error && <div className="error" style={{ padding: 20 }}>{error}</div>}

      {prop && !loading && (
        <>
          {/* Header */}
          <h1 className="page-title" style={{ margin: '0 0 4px' }}>{prop.label}</h1>
          <div className="muted" style={{ fontSize: 14, marginBottom: 12 }}>{prop.address}</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
            {prop.boards.map((b) => (
              <a key={b.bodyKey} href={`/admin/municipal/board?muni=${muni}&body=${b.bodyKey}`} className="badge state" style={{ textDecoration: 'none' }}>
                {b.board} · {b.appearances}×
              </a>
            ))}
            {prop.applicationTypes.slice(0, 3).map((t) => <span key={t} className="badge">{t}</span>)}
            <span style={sentimentChipStyle(prop.avgSentiment)} title={dispositionLabel(prop.avgSentiment)}>{fmtSent(prop.avgSentiment)}</span>
          </div>

          {/* Map + facts */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20, marginBottom: 26 }}>
            <div>
              <PropertyMap address={prop.address} muniHint={`${townName}, NY`} />
            </div>
            <div>
              {/* Synopsis */}
              <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Synopsis</div>
              <div style={{ fontSize: 14, lineHeight: 1.55, marginBottom: 16 }}>
                Heard <strong>{prop.appearances}×</strong> before {prop.boards.map((b) => b.board).join(' & ')} from{' '}
                {fmtDate(prop.firstSeen)} to {fmtDate(prop.lastSeen)}.{prop.lastStatus ? ` Latest status: ${prop.lastStatus}.` : ''}
                {prop.timeline.length > 0 && ` ${[...prop.timeline].reverse().find((e) => e.summary)?.summary || ''}`}
              </div>
              {/* Parties */}
              {prop.parties.length > 0 && (
                <>
                  <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>People involved</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
                    {prop.parties.map((p) => (
                      <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: ROLE_COLOR[p.role] || '#7a8590', flexShrink: 0 }} />
                        <span style={{ fontWeight: 600 }}>{p.name}</span>
                        <span className="muted" style={{ fontSize: 12 }}>· {p.role}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
              {prop.themes.length > 0 && (
                <>
                  <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Topics</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {prop.themes.map((t) => <span key={t} className="badge" style={{ fontSize: 11 }}>{t}</span>)}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Federated timeline */}
          <h2 style={{ fontSize: 16, margin: '0 0 12px' }}>
            Timeline
            <span className="muted" style={{ fontSize: 13, fontWeight: 400 }}> · every board &amp; committee, {prop.appearances} appearances</span>
          </h2>
          <div className="card" style={{ padding: 0, marginBottom: 26 }}>
            {[...prop.timeline].reverse().map((e, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, padding: '12px 16px', borderTop: i ? '1px solid var(--border)' : undefined }}>
                <div style={{ width: 96, flexShrink: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{fmtDate(e.date)}</div>
                  <div className="muted" style={{ fontSize: 11 }}>{e.board}</div>
                </div>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: sentimentColor(e.sentiment), flexShrink: 0, marginTop: 4 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' }}>
                    {e.status && <span className="badge state" style={{ fontSize: 11 }}>{e.status}</span>}
                    <span style={{ ...sentimentChipStyle(e.sentiment), fontSize: 11 }}>{fmtSent(e.sentiment)}</span>
                  </div>
                  {e.summary && <div style={{ fontSize: 13, lineHeight: 1.5, marginTop: 4 }}>{e.summary}</div>}
                </div>
              </div>
            ))}
          </div>

          {/* Documents */}
          <h2 style={{ fontSize: 16, margin: '0 0 12px' }}>
            Documents
            <span className="muted" style={{ fontSize: 13, fontWeight: 400 }}> · from meetings where this property appeared</span>
          </h2>
          {documents.length > 0 ? (
            <div className="card" style={{ padding: 0, marginBottom: 26 }}>
              {documents.map((d, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '11px 16px', borderTop: i ? '1px solid var(--border)' : undefined, flexWrap: 'wrap' }}>
                  <div style={{ width: 96, flexShrink: 0, fontSize: 13 }}>{fmtDate(d.date)}</div>
                  <div className="muted" style={{ fontSize: 12, minWidth: 120 }}>{d.board}</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {d.assets.map((a, j) => {
                      const href = a.blobUrl || a.sourceUrl || ''
                      const label = a.kind.charAt(0).toUpperCase() + a.kind.slice(1)
                      return (
                        <a key={j} href={href} target="_blank" rel="noopener noreferrer" className="badge state" style={{ textDecoration: 'none' }}>
                          {label}{a.pageCount ? ` · ${a.pageCount}pp` : ''} ↗
                        </a>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card" style={{ marginBottom: 26 }}>
              <div className="muted" style={{ padding: 20, fontSize: 13 }}>No ingested documents linked to this property yet.</div>
            </div>
          )}

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}><Breadcrumbs items={crumbs} /></div>
        </>
      )}
    </div>
  )
}
