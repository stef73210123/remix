'use client'

import { useEffect, useMemo, useState } from 'react'
import type { AnalysisDataset, MemberProfile, ThemeRollup } from '@/lib/municipal/analysis'
import { sentimentColor, sentimentChipStyle, fmtSent, dispositionLabel, sentimentLabel } from '../sentiment'
import MeetingTimelineChart from './MeetingTimelineChart'
import ProgressSpectrum, { weightedProgressScore } from '../ProgressSpectrum'
import { getBoardDepartments } from '@/lib/municipal/departments'

function fmtCaptionDate(iso: string): string {
  const d = new Date(iso + 'T12:00:00Z')
  if (isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

/** Diverging bar: center = 0, fill extends left (neg) or right (pos). */
function SentBar({ score, height = 8 }: { score: number; height?: number }) {
  const s = Math.max(-1, Math.min(1, score))
  const half = Math.abs(s) * 50
  return (
    <div style={{ position: 'relative', height, background: 'var(--panel-2)', borderRadius: height / 2 }}>
      <div style={{ position: 'absolute', left: '50%', top: -1, bottom: -1, width: 1, background: 'var(--border)' }} />
      <div
        style={{
          position: 'absolute', top: 0, height: '100%', background: sentimentColor(s), borderRadius: height / 2,
          ...(s >= 0 ? { left: '50%', width: `${half}%` } : { right: '50%', width: `${half}%` }),
        }}
      />
    </div>
  )
}

function Chip({ score }: { score: number }) {
  return <span style={sentimentChipStyle(score)} title={dispositionLabel(score)}>{fmtSent(score)}</span>
}

type ThemeSort = 'volume' | 'positive' | 'negative'

export default function TranscriptAnalysis({ muni, body, onData }: {
  muni: string
  body: string
  /** Lets the host page reuse the dataset (e.g. the Meetings section renders the
   *  meeting-by-meeting rows attached to its timeline). */
  onData?: (d: AnalysisDataset | null) => void
}) {
  const [data, setData] = useState<AnalysisDataset | null>(null)
  const [loading, setLoading] = useState(true)
  const [themeSort, setThemeSort] = useState<ThemeSort>('volume')

  useEffect(() => {
    setLoading(true)
    fetch(`/admin/api/municipal/transcript-analysis?muni=${encodeURIComponent(muni)}&body=${encodeURIComponent(body)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('load'))))
      .then((d) => {
        const ds = d && d.available !== false ? (d as AnalysisDataset) : null
        setData(ds)
        onData?.(ds)
      })
      .catch(() => { setData(null); onData?.(null) })
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [muni, body])

  // Most recent meeting the analysis covers — shown as a "current as of" caption
  // so readers know how fresh the ingested/analyzed data is.
  const latestMeetingDate = useMemo(() => {
    const dates = (data?.meetings ?? []).map((mt) => mt.date).filter(Boolean).sort()
    return dates.length ? dates[dates.length - 1] : null
  }, [data])

  // Themes, re-ranked by the selected lens.
  const themesSorted = useMemo(() => {
    const t = [...(data?.themes ?? [])]
    if (themeSort === 'positive') return t.sort((a, b) => b.avgSentiment - a.avgSentiment)
    if (themeSort === 'negative') return t.sort((a, b) => a.avgSentiment - b.avgSentiment)
    return t.sort((a, b) => b.meetings - a.meetings)
  }, [data, themeSort])

  if (loading) return <div className="muted" style={{ fontSize: 13, marginBottom: 26 }}>Loading transcript analysis…</div>
  if (!data) return null

  const m = data.meta
  const inactiveSet = new Set(m.inactiveMembers || [])
  // Board-appropriate noun for the "cases" (Planning = applications; Town Board = agenda items).
  const isTownBoard = m.bodyKey === 'town_board'
  const itemNounPlural = isTownBoard ? 'agenda items' : 'applications'
  const departments = getBoardDepartments(muni, m.bodyKey)

  return (
    <div style={{ marginBottom: 30 }}>
      {/* ---- Departmental information (the staff behind this board's business) ---- */}
      {departments.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12, marginBottom: 24 }}>
          {departments.map((d) => (
            <div key={d.department} className="card" style={{ padding: 16 }}>
              <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{d.department}</div>
              <div style={{ fontSize: 15, fontWeight: 700, marginTop: 4 }}>{d.person}</div>
              <div className="muted" style={{ fontSize: 12.5 }}>{d.title}</div>
              <div className="muted" style={{ fontSize: 12.5, marginTop: 8, lineHeight: 1.55 }}>{d.blurb}</div>
              <div style={{ fontSize: 12.5, marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: '4px 14px' }}>
                {d.phone && <span>📞 {d.phone}</span>}
                {d.email && <a href={`mailto:${d.email}`} style={{ color: 'var(--primary-light)' }}>✉ {d.email}</a>}
                {d.address && <span className="muted">📍 {d.address}</span>}
              </div>
              {d.links.length > 0 && (
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 10 }}>
                  {d.links.map((l) => (
                    <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12.5, color: 'var(--primary-light)' }}>{l.label} ↗</a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <h2 style={{ fontSize: 18, margin: '0 0 4px' }}>Meeting transcript analysis</h2>
      <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
        {m.meetings} meetings · {m.cases} {itemNounPlural} · {m.themes} themes · {m.memberPositions} attributed member positions
      </div>
      {latestMeetingDate && (
        <div className="muted" style={{ fontSize: 12, marginBottom: 6 }}>
          Data current as of {fmtCaptionDate(latestMeetingDate)} — reflects meetings through that date.
        </div>
      )}
      <div className="muted" style={{ fontSize: 11, marginBottom: 18, lineHeight: 1.5, maxWidth: 720 }}>
        Sentiment −10 (opposed) to +10 (favorable). Member-level attribution is directional.
      </div>

      {/* ---- Consolidated board progress score ---- */}
      {(() => {
        const board = weightedProgressScore(data.members)
        if (!board) return null
        return (
          <div className="card" style={{ padding: 16, marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{m.board} progress score</span>
              <span style={sentimentChipStyle(board.score)}>{fmtSent(board.score)}</span>
              <span className="muted" style={{ fontSize: 13 }}>{sentimentLabel(board.score)}</span>
              <span className="muted" style={{ fontSize: 12 }}>· {board.positions} positions across {board.members} members</span>
            </div>
            <ProgressSpectrum score={board.score} height={16} showScale />
          </div>
        )
      })()}

      {/* ---- Board member sentiment ---- */}
      <h3 style={{ fontSize: 14, margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)' }}>
        Board members — progress score
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 12, marginBottom: data.members.some((m2) => m2.totalPositions === 0) ? 10 : 28 }}>
        {data.members
          .filter((mem) => mem.totalPositions > 0)
          // Active members first (stable within each group); former/inactive members sink to the bottom.
          .sort((a, b) => Number(inactiveSet.has(a.member)) - Number(inactiveSet.has(b.member)))
          .map((mem) => (
          <MemberCard key={mem.member} mem={mem} muni={muni} body={body} role={m.roles?.[mem.member]} inactive={inactiveSet.has(mem.member)} />
        ))}
      </div>
      {data.members.filter((mem) => mem.totalPositions === 0).length > 0 && (
        <div className="muted" style={{ fontSize: 12, marginBottom: 28 }}>
          No statements confidently attributed yet:{' '}
          {data.members.filter((mem) => mem.totalPositions === 0).map((mem) => mem.member).join(', ')}
          {' '}— named too rarely in the transcripts to attribute reliably.
        </div>
      )}

      {/* ---- Sentiment timeline (stacked columns per meeting) ---- */}
      <MeetingTimelineChart data={data} />

      {/* ---- Themes ---- */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', margin: '0 0 12px' }}>
        <h3 style={{ fontSize: 14, margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)' }}>
          Themes across the year
        </h3>
        <div className="pill-strip" style={{ display: 'flex', gap: 4 }}>
          {([['volume', 'Most volume'], ['positive', 'Most positive'], ['negative', 'Most negative']] as const).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setThemeSort(k)}
              className="btn secondary"
              style={{ padding: '4px 10px', fontSize: 12, ...(themeSort === k ? { background: 'var(--primary)', color: '#fff', borderColor: 'var(--primary)' } : {}) }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="card" style={{ padding: 16, marginBottom: 28 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {themesSorted.map((t) => (
            <ThemeRow key={t.theme} t={t} maxMeetings={Math.max(1, ...themesSorted.map((x) => x.meetings))} />
          ))}
        </div>
        <div className="muted" style={{ fontSize: 11, marginTop: 14, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <span>Bar = meetings the theme came up</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: sentimentColor(-0.6), display: 'inline-block' }} /> concern
            <span style={{ width: 10, height: 10, borderRadius: 2, background: sentimentColor(0.6), display: 'inline-block', marginLeft: 8 }} /> favorable
          </span>
        </div>
      </div>

    </div>
  )
}

function MemberCard({ mem, muni, body, role, inactive = false }: { mem: MemberProfile; muni: string; body: string; role?: string; inactive?: boolean }) {
  const conf = mem.confidenceMix || {}
  const total = (conf.high || 0) + (conf.medium || 0) + (conf.low || 0) || 1
  const topThemes = mem.byTheme.slice(0, 3)
  return (
    <a
      href={`/admin/municipal/member?muni=${muni}&body=${body}&byName=${encodeURIComponent(mem.member)}`}
      className="card"
      // Inactive (no-longer-serving) members are de-emphasized but stay fully clickable.
      style={{ padding: 14, textDecoration: 'none', display: 'block', opacity: inactive ? 0.55 : 1 }}
      title={inactive ? `${mem.member} — former member` : undefined}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
        <div style={{ fontWeight: 700, display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
          {mem.member}
          {inactive && (
            <span className="badge" style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--muted)' }}>
              Former
            </span>
          )}
        </div>
        <Chip score={mem.avgSentiment} />
      </div>
      {role && (
        <div className="muted" style={{ fontSize: 12, marginTop: 3, fontWeight: 600, color: 'var(--primary-light)' }}>{role}</div>
      )}
      <div style={{ margin: '10px 0 4px' }}><SentBar score={mem.avgSentiment} /></div>
      <div className="muted" style={{ fontSize: 11, marginBottom: 10 }}>
        {mem.totalPositions} positions · {Math.round(((conf.high || 0) / total) * 100)}% high-confidence
      </div>
      {topThemes.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {topThemes.map((t) => (
            <div key={t.theme} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
              <span style={{ width: 9, height: 9, borderRadius: 2, background: sentimentColor(t.avgSentiment), flexShrink: 0 }} />
              <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.theme}</span>
              <span className="muted" style={{ fontVariantNumeric: 'tabular-nums' }}>{fmtSent(t.avgSentiment)}</span>
            </div>
          ))}
        </div>
      )}
      <div style={{ fontSize: 12, marginTop: 12, color: 'var(--primary-light)' }}>Full profile →</div>
    </a>
  )
}

function ThemeRow({ t, maxMeetings }: { t: ThemeRollup; maxMeetings: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ width: 180, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flexShrink: 0 }}>{t.theme}</div>
      <div style={{ flex: 1, background: 'var(--panel-2)', borderRadius: 5, height: 14, overflow: 'hidden' }}>
        <div style={{ width: `${(t.meetings / maxMeetings) * 100}%`, height: '100%', background: 'var(--c)', borderRadius: 5, minWidth: 4 }} />
      </div>
      <div className="muted" style={{ width: 58, fontSize: 12, textAlign: 'right', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>{t.meetings} mtg</div>
      <span style={{ ...sentimentChipStyle(t.avgSentiment), minWidth: 46 }} title={`avg sentiment ${fmtSent(t.avgSentiment)}`}>{fmtSent(t.avgSentiment)}</span>
    </div>
  )
}
