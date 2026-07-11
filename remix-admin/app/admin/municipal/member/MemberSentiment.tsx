'use client'

import { useEffect, useMemo, useState } from 'react'
import type { AnalysisDataset, MemberProfile } from '@/lib/municipal/analysis'
import { sentimentColor, sentimentChipStyle, fmtSent, sentimentLabel } from '../sentiment'

function fmtDateShort(iso: string): string {
  const d = new Date(iso + 'T12:00:00Z')
  if (isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

/** Match an analysis member to a display name (official full_name or an explicit
 *  byName), tolerating first-name-only labels like "Chair" / "Christopher". */
function matchMember(members: MemberProfile[], name: string): MemberProfile | null {
  const n = name.trim().toLowerCase()
  if (!n) return null
  return (
    members.find((m) => m.member.toLowerCase() === n) ||
    members.find((m) => m.member.toLowerCase().includes(n) || n.includes(m.member.toLowerCase())) ||
    members.find((m) => {
      const first = m.member.split(/\s+/)[0].toLowerCase()
      return first.length > 2 && (n.startsWith(first) || n.split(/\s+/)[0] === first)
    }) ||
    null
  )
}

export default function MemberSentiment({
  muni, body, memberName, onScore,
}: { muni: string; body: string; memberName: string; onScore?: (score: number | null) => void }) {
  const [data, setData] = useState<AnalysisDataset | null>(null)
  const [loading, setLoading] = useState(true)
  const [evQuery, setEvQuery] = useState('')
  const [evSort, setEvSort] = useState<'date' | 'high' | 'low'>('date')

  useEffect(() => {
    setLoading(true)
    fetch(`/admin/api/municipal/transcript-analysis?muni=${encodeURIComponent(muni)}&body=${encodeURIComponent(body)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('load'))))
      .then((d) => setData(d && d.available !== false ? d : null))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [muni, body])

  const profile = useMemo(() => (data ? matchMember(data.members, memberName) : null), [data, memberName])

  // Surface the overall disposition ("progress score") to the profile header.
  useEffect(() => {
    if (!onScore) return
    onScore(profile && profile.totalPositions > 0 ? profile.avgSentiment : null)
  }, [profile, onScore])

  // Themes ordered by sentiment (highest → lowest), limited to the most-discussed.
  const themesBySentiment = useMemo(() => {
    const t = profile?.byTheme ?? []
    return [...t].sort((a, b) => b.count - a.count).slice(0, 8).sort((a, b) => b.avgSentiment - a.avgSentiment)
  }, [profile])
  const caseName = useMemo(() => {
    const map: Record<string, string> = {}
    data?.cases.forEach((c) => { map[c.id] = c.name })
    return map
  }, [data])

  // Filter (keyword) + sort (date / most-positive / most-negative) the comment history.
  const visibleEvidence = useMemo(() => {
    const list = profile?.evidence ?? []
    const q = evQuery.trim().toLowerCase()
    const filtered = q
      ? list.filter((e) =>
          `${e.evidence} ${e.case} ${e.stance} ${e.themes.join(' ')}`.toLowerCase().includes(q)
        )
      : list
    const sorted = [...filtered]
    if (evSort === 'date') sorted.sort((a, b) => b.date.localeCompare(a.date))
    else if (evSort === 'high') sorted.sort((a, b) => b.score - a.score)
    else sorted.sort((a, b) => a.score - b.score)
    return sorted
  }, [profile, evQuery, evSort])

  if (loading || !data || !profile || profile.totalPositions === 0) return null

  const conf = profile.confidenceMix || {}
  const total = (conf.high || 0) + (conf.medium || 0) + (conf.low || 0) || 1
  const maxTheme = Math.max(1, ...profile.byTheme.map((t) => t.count))

  return (
    <div style={{ marginBottom: 28 }}>
      <h2 style={{ fontSize: 16, margin: '0 0 4px' }}>{data.meta.board} sentiment</h2>
      <div className="muted" style={{ fontSize: 11, marginBottom: 16, lineHeight: 1.5, maxWidth: 640 }}>
        {profile.totalPositions} attributed positions · {Math.round(((conf.high || 0) / total) * 100)}% high-confidence · directional (name-based)
      </div>

      {/* Overall */}
      <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Progress score</span>
          <span style={sentimentChipStyle(profile.avgSentiment)}>{fmtSent(profile.avgSentiment)}</span>
          <span className="muted" style={{ fontSize: 13 }}>{sentimentLabel(profile.avgSentiment)}</span>
        </div>
        <div style={{ position: 'relative', height: 10, background: 'var(--panel-2)', borderRadius: 5 }}>
          <div style={{ position: 'absolute', left: '50%', top: -2, bottom: -2, width: 1, background: 'var(--border)' }} />
          {(() => {
            const s = Math.max(-1, Math.min(1, profile.avgSentiment))
            const half = Math.abs(s) * 50
            return (
              <div style={{
                position: 'absolute', top: 0, height: '100%', background: sentimentColor(s), borderRadius: 5,
                ...(s >= 0 ? { left: '50%', width: `${half}%` } : { right: '50%', width: `${half}%` }),
              }} />
            )
          })()}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 16 }}>
        {/* By theme */}
        {profile.byTheme.length > 0 && (
          <div className="card" style={{ padding: 16 }}>
            <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Sentiment by theme</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {themesBySentiment.map((t) => (
                <div key={t.theme} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                  <span style={{ width: 150, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.theme}</span>
                  <span className="muted" style={{ width: 20, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{t.count}</span>
                  <div style={{ flex: 1, background: 'var(--panel-2)', borderRadius: 4, height: 12, overflow: 'hidden' }}>
                    <div style={{ width: `${(t.count / maxTheme) * 100}%`, height: '100%', background: sentimentColor(t.avgSentiment), borderRadius: 4, minWidth: 3 }} />
                  </div>
                  <span style={{ ...sentimentChipStyle(t.avgSentiment), minWidth: 44 }}>{fmtSent(t.avgSentiment)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* By case */}
        {profile.byCase.length > 0 && (
          <div className="card" style={{ padding: 16 }}>
            <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Most-engaged {data.meta.bodyKey === 'town_board' ? 'agenda items' : 'applications'}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {profile.byCase.slice(0, 8).map((c) => (
                <div key={c.caseId} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                  <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {caseName[c.caseId] || c.caseId}
                  </span>
                  <span className="muted" style={{ fontSize: 11 }}>×{c.count}</span>
                  <span style={{ ...sentimentChipStyle(c.avgSentiment), minWidth: 44 }}>{fmtSent(c.avgSentiment)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Evidence — searchable, sortable comment history */}
      {profile.evidence.length > 0 && (
        <div className="card" style={{ padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
            <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              What they said · {visibleEvidence.length}{visibleEvidence.length !== profile.evidence.length ? ` of ${profile.evidence.length}` : ''}
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                value={evQuery}
                onChange={(e) => setEvQuery(e.target.value)}
                placeholder="Search comments…"
                style={{
                  // 16px prevents iOS Safari from auto-zooming (and shifting the
                  // layout) when the field is focused.
                  fontSize: 16, padding: '5px 9px', borderRadius: 6, background: 'var(--panel-2)',
                  border: '1px solid var(--border)', color: 'var(--text)', minWidth: 160, maxWidth: '100%',
                }}
              />
              <div className="pill-strip" style={{ display: 'flex', gap: 4 }}>
                {([['date', 'Newest'], ['high', 'Most +'], ['low', 'Most −']] as const).map(([k, label]) => (
                  <button
                    key={k}
                    onClick={() => setEvSort(k)}
                    className="btn secondary"
                    style={{ padding: '4px 9px', fontSize: 12, ...(evSort === k ? { background: 'var(--primary)', color: '#fff', borderColor: 'var(--primary)' } : {}) }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 360, overflowY: 'auto' }}>
            {visibleEvidence.length === 0 ? (
              <div className="muted" style={{ fontSize: 13, padding: '8px 0' }}>No comments match “{evQuery}”.</div>
            ) : visibleEvidence.map((e, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ ...sentimentChipStyle(e.score), flexShrink: 0, marginTop: 2 }}>{fmtSent(e.score)}</span>
                <div style={{ fontSize: 13, lineHeight: 1.5 }}>
                  <span style={{ fontWeight: 600 }}>{e.case}</span>
                  <span className="muted" style={{ fontSize: 11 }}> · {fmtDateShort(e.date)} · {e.stance}{e.confidence === 'low' ? ' · low confidence' : ''}</span>
                  <div className="muted" style={{ marginTop: 2 }}>{e.evidence}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
