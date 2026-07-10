'use client'

import { useEffect, useState } from 'react'
import type { MemberDossier as Dossier } from '@/lib/municipal/analysis'

export default function MemberDossier({
  muni, body, memberName,
}: { muni: string; body: string; memberName: string }) {
  const [d, setD] = useState<Dossier | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/admin/api/municipal/member-dossier?muni=${encodeURIComponent(muni)}&body=${encodeURIComponent(body)}&name=${encodeURIComponent(memberName)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('load'))))
      .then((x) => setD(x && x.available !== false ? x : null))
      .catch(() => setD(null))
      .finally(() => setLoading(false))
  }, [muni, body, memberName])

  if (loading || !d) return null
  const eng = d.engagement || {}
  const hasEngagement = (eng.keyIssues?.length || eng.likes || eng.dislikes || eng.recommendation)

  return (
    <div style={{ marginBottom: 28 }}>
      {/* Background */}
      {d.bio && (
        <>
          <h2 style={{ fontSize: 16, margin: '0 0 12px' }}>Background</h2>
          <div className="card" style={{ padding: 16, marginBottom: hasEngagement ? 16 : 0 }}>
            <div style={{ fontSize: 14, lineHeight: 1.6 }}>{d.bio}</div>
            {d.bioConfidence && d.bioConfidence !== 'high' && (
              <div className="muted" style={{ fontSize: 11, marginTop: 10, fontStyle: 'italic' }}>
                {d.bioConfidence === 'low' ? 'Low-confidence identification — verify before relying on it.' : 'Medium-confidence identification.'}
              </div>
            )}
          </div>
        </>
      )}

      {/* How to engage */}
      {hasEngagement && (
        <>
          <h2 style={{ fontSize: 16, margin: '0 0 12px' }}>How to engage</h2>

          {eng.keyIssues && eng.keyIssues.length > 0 && (
            <div className="card" style={{ padding: 16, marginBottom: 12 }}>
              <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Key issues</div>
              <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {eng.keyIssues.map((k, i) => (
                  <li key={i} style={{ fontSize: 13, lineHeight: 1.5 }}>{k}</li>
                ))}
              </ul>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12, marginBottom: eng.recommendation ? 12 : 0 }}>
            {eng.likes && (
              <div className="card" style={{ padding: 16 }}>
                <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, color: '#3d9c72' }}>Responds well to</div>
                <div style={{ fontSize: 13, lineHeight: 1.55 }}>{eng.likes}</div>
              </div>
            )}
            {eng.dislikes && (
              <div className="card" style={{ padding: 16 }}>
                <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, color: 'var(--primary-light)' }}>Draws skepticism</div>
                <div style={{ fontSize: 13, lineHeight: 1.55 }}>{eng.dislikes}</div>
              </div>
            )}
          </div>

          {eng.recommendation && (
            <div className="card" style={{ padding: 16, borderLeft: '3px solid var(--primary)' }}>
              <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Recommended approach</div>
              <div style={{ fontSize: 13, lineHeight: 1.6 }}>{eng.recommendation}</div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
