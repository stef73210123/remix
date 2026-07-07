'use client'

import { useEffect, useMemo, useState } from 'react'
import type { AnalysisDataset, CaseRollup, MemberProfile, ThemeRollup, MeetingAnalysis } from '@/lib/municipal/analysis'
import { sentimentColor, sentimentChipStyle, fmtSent, dispositionLabel } from '../sentiment'

function fmtDate(iso: string): string {
  const d = new Date(iso + (iso.length === 10 ? 'T12:00:00Z' : ''))
  if (isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}
function fmtDateShort(iso: string): string {
  const d = new Date(iso + 'T12:00:00Z')
  if (isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
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

/** Tiny sentiment trajectory sparkline (points over time). */
function Spark({ points, w = 88, h = 22 }: { points: number[]; w?: number; h?: number }) {
  if (points.length === 0) return null
  const n = points.length
  const x = (i: number) => (n === 1 ? w / 2 : (i / (n - 1)) * w)
  const y = (v: number) => h / 2 - (Math.max(-1, Math.min(1, v)) * (h / 2 - 2))
  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p).toFixed(1)}`).join(' ')
  return (
    <svg width={w} height={h} style={{ display: 'block' }} aria-hidden>
      <line x1={0} y1={h / 2} x2={w} y2={h / 2} stroke="var(--border)" strokeWidth={1} />
      {n > 1 && <path d={d} fill="none" stroke="var(--muted)" strokeWidth={1.5} />}
      {points.map((p, i) => (
        <circle key={i} cx={x(i)} cy={y(p)} r={2.5} fill={sentimentColor(p)} />
      ))}
    </svg>
  )
}

function Chip({ score }: { score: number }) {
  return <span style={sentimentChipStyle(score)} title={dispositionLabel(score)}>{fmtSent(score)}</span>
}

function ThemeTag({ t }: { t: string }) {
  return <span className="badge" style={{ fontSize: 11 }}>{t}</span>
}

export default function TranscriptAnalysis({ muni, body }: { muni: string; body: string }) {
  const [data, setData] = useState<AnalysisDataset | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAllCases, setShowAllCases] = useState(false)
  const [openCase, setOpenCase] = useState<string | null>(null)
  const [openMeeting, setOpenMeeting] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    fetch(`/admin/api/municipal/transcript-analysis?muni=${encodeURIComponent(muni)}&body=${encodeURIComponent(body)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('load'))))
      .then((d) => setData(d && d.available !== false ? d : null))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [muni, body])

  const trackedCases = useMemo(
    () => (data ? data.cases.filter((c) => c.appearances >= 2) : []),
    [data]
  )
  const visibleCases = showAllCases ? data?.cases ?? [] : trackedCases

  if (loading) return <div className="muted" style={{ fontSize: 13, marginBottom: 26 }}>Loading transcript analysis…</div>
  if (!data) return null

  const m = data.meta

  return (
    <div style={{ marginBottom: 30 }}>
      <h2 style={{ fontSize: 18, margin: '0 0 4px' }}>Meeting transcript analysis</h2>
      <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
        {m.meetings} meetings · {m.cases} applications · {m.themes} themes · {m.memberPositions} attributed member positions
      </div>
      <div className="muted" style={{ fontSize: 11, marginBottom: 18, lineHeight: 1.5, maxWidth: 720 }}>
        Derived from meeting-video transcripts (automatic speech recognition, no speaker labels). Case- and
        theme-level sentiment is robust; member-level attribution is name-based (a member is credited only when
        named or addressed by name) and carries a confidence level — read it as directional, not a vote record.
        Sentiment runs −1 (opposed / heavy concern) to +1 (supportive / favorable).
      </div>

      {/* ---- Board member sentiment ---- */}
      <h3 style={{ fontSize: 14, margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)' }}>
        Board members — overall disposition
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 12, marginBottom: 28 }}>
        {data.members.filter((mem) => mem.totalPositions > 0).map((mem) => (
          <MemberCard key={mem.member} mem={mem} muni={muni} body={body} />
        ))}
      </div>

      {/* ---- Themes ---- */}
      <h3 style={{ fontSize: 14, margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)' }}>
        Themes across the year
      </h3>
      <div className="card" style={{ padding: 16, marginBottom: 28 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {data.themes.map((t) => (
            <ThemeRow key={t.theme} t={t} maxMeetings={data.themes[0]?.meetings || 1} />
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

      {/* ---- Cases ---- */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', margin: '0 0 12px' }}>
        <h3 style={{ fontSize: 14, margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)' }}>
          {showAllCases ? `All applications (${data.cases.length})` : `Tracked applications (${trackedCases.length})`}
        </h3>
        <button className="btn secondary" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => setShowAllCases((v) => !v)}>
          {showAllCases ? 'Show tracked only' : `Show all ${data.cases.length}`}
        </button>
      </div>
      <div className="card table-card" style={{ marginBottom: 28, maxHeight: showAllCases ? 520 : undefined, overflowY: showAllCases ? 'auto' : undefined }}>
        <table>
          <thead>
            <tr>
              <th>Application</th><th>Type</th><th style={{ textAlign: 'center' }}>Seen</th>
              <th>Last status</th><th style={{ textAlign: 'center' }}>Sentiment</th><th>Trajectory</th>
            </tr>
          </thead>
          <tbody>
            {visibleCases.map((c) => (
              <CaseRow key={c.id} c={c} open={openCase === c.id} onToggle={() => setOpenCase(openCase === c.id ? null : c.id)} />
            ))}
          </tbody>
        </table>
      </div>

      {/* ---- Meeting-by-meeting ---- */}
      <h3 style={{ fontSize: 14, margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)' }}>
        Meeting by meeting
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[...data.meetings].sort((a, b) => b.date.localeCompare(a.date)).map((mt) => (
          <MeetingRow
            key={mt.date}
            mt={mt}
            muni={muni}
            body={body}
            open={openMeeting === mt.date}
            onToggle={() => setOpenMeeting(openMeeting === mt.date ? null : mt.date)}
          />
        ))}
      </div>
    </div>
  )
}

function MemberCard({ mem, muni, body }: { mem: MemberProfile; muni: string; body: string }) {
  const conf = mem.confidenceMix || {}
  const total = (conf.high || 0) + (conf.medium || 0) + (conf.low || 0) || 1
  const topThemes = mem.byTheme.slice(0, 3)
  return (
    <a
      href={`/admin/municipal/member?muni=${muni}&body=${body}&byName=${encodeURIComponent(mem.member)}`}
      className="card"
      style={{ padding: 14, textDecoration: 'none', display: 'block' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
        <div style={{ fontWeight: 700 }}>{mem.member}</div>
        <Chip score={mem.avgSentiment} />
      </div>
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

function CaseRow({ c, open, onToggle }: { c: CaseRollup; open: boolean; onToggle: () => void }) {
  return (
    <>
      <tr onClick={onToggle} style={{ cursor: 'pointer' }}>
        <td style={{ fontWeight: 600 }}>
          <span className="muted" style={{ marginRight: 6, display: 'inline-block', width: 10 }}>{open ? '▾' : '▸'}</span>
          {c.name}
        </td>
        <td style={{ fontSize: 13 }}>{c.applicationType || '—'}</td>
        <td style={{ textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>{c.appearances}</td>
        <td style={{ fontSize: 13 }}>{c.lastStatus || '—'}</td>
        <td style={{ textAlign: 'center' }}><Chip score={c.avgSentiment} /></td>
        <td><Spark points={c.trajectory.map((p) => p.sentiment)} /></td>
      </tr>
      {open && (
        <tr>
          <td colSpan={6} style={{ background: 'var(--panel-2)' }}>
            <div style={{ padding: '4px 8px 10px' }}>
              {(c.address || c.applicant) && (
                <div className="muted" style={{ fontSize: 12, marginBottom: 8 }}>
                  {c.address}{c.address && c.applicant ? ' · ' : ''}{c.applicant ? `Applicant: ${c.applicant}` : ''}
                </div>
              )}
              {c.themes.length > 0 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                  {c.themes.map((t) => <ThemeTag key={t} t={t} />)}
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {c.timeline.map((ap, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13 }}>
                    <span className="muted" style={{ width: 62, flexShrink: 0, whiteSpace: 'nowrap' }}>{fmtDateShort(ap.date)}</span>
                    <span style={{ ...sentimentChipStyle(ap.sentiment), flexShrink: 0 }}>{fmtSent(ap.sentiment)}</span>
                    <span style={{ flex: 1 }}>
                      {ap.status && <span style={{ fontWeight: 600 }}>{ap.status}. </span>}
                      <span className="muted">{ap.summary}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

function MeetingRow({
  mt, muni, body, open, onToggle,
}: { mt: MeetingAnalysis; muni: string; body: string; open: boolean; onToggle: () => void }) {
  const avg = mt.cases.length ? mt.cases.reduce((s, c) => s + (c.sentimentScore || 0), 0) / mt.cases.length : 0
  const transcriptHref = `/admin/api/municipal/transcript?muni=${muni}&body=${body}&date=${mt.date}`
  return (
    <div className="card" style={{ padding: 0 }}>
      <div
        onClick={onToggle}
        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', cursor: 'pointer', flexWrap: 'wrap' }}
      >
        <span className="muted" style={{ width: 10 }}>{open ? '▾' : '▸'}</span>
        <span style={{ fontWeight: 700, minWidth: 130 }}>{fmtDate(mt.date)}</span>
        <span className="muted" style={{ fontSize: 13 }}>{mt.cases.length} item{mt.cases.length === 1 ? '' : 's'}</span>
        <span style={{ flex: 1 }} />
        <Chip score={avg} />
        <a
          href={transcriptHref}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="badge state"
          style={{ textDecoration: 'none' }}
        >
          Transcript ↗
        </a>
      </div>
      {open && (
        <div style={{ padding: '0 14px 14px', borderTop: '1px solid var(--border)' }}>
          <div style={{ fontSize: 13, margin: '12px 0 14px', lineHeight: 1.55 }}>{mt.meetingSummary}</div>
          {mt.cases.map((c, i) => (
            <div key={i} style={{ padding: '10px 0', borderTop: i ? '1px solid var(--border)' : 'none' }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 600, fontSize: 13 }}>{c.name}</span>
                {c.status && <span className="badge" style={{ fontSize: 11 }}>{c.status}</span>}
                <span style={{ ...sentimentChipStyle(c.sentimentScore) }}>{fmtSent(c.sentimentScore)}</span>
              </div>
              {c.summary && <div className="muted" style={{ fontSize: 12, margin: '6px 0' }}>{c.summary}</div>}
              {c.themes.length > 0 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '6px 0' }}>
                  {c.themes.map((t) => <ThemeTag key={t} t={t} />)}
                </div>
              )}
              {c.memberPositions.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 }}>
                  {c.memberPositions.map((p, j) => (
                    <div key={j} style={{ display: 'flex', gap: 8, alignItems: 'baseline', fontSize: 12 }}>
                      <span style={{ fontWeight: 600, width: 108, flexShrink: 0 }}>{p.member}</span>
                      <span style={{ ...sentimentChipStyle(p.score), flexShrink: 0 }}>{fmtSent(p.score)}</span>
                      <span className="muted" style={{ flex: 1 }}>
                        {p.stance}{p.evidence ? ` — ${p.evidence}` : ''}
                        {p.confidence === 'low' ? ' (low confidence)' : ''}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          {mt.attributionNote && (
            <div className="muted" style={{ fontSize: 11, marginTop: 12, fontStyle: 'italic' }}>{mt.attributionNote}</div>
          )}
        </div>
      )}
    </div>
  )
}
