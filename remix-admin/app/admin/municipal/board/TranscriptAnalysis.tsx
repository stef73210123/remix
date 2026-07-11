'use client'

import { useEffect, useMemo, useState } from 'react'
import type { AnalysisDataset, CaseRollup, MemberProfile, ThemeRollup, MeetingAnalysis } from '@/lib/municipal/analysis'
import { sentimentColor, sentimentChipStyle, fmtSent, dispositionLabel } from '../sentiment'
import MeetingTimelineChart from './MeetingTimelineChart'
import { propertyId } from '@/lib/municipal/propertyId'

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

  // Alphabetical by name (numeric-aware so street numbers order naturally).
  const byName = (a: CaseRollup, b: CaseRollup) =>
    a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
  const trackedCases = useMemo(
    () => (data ? data.cases.filter((c) => c.appearances >= 2).sort(byName) : []),
    [data]
  )
  const visibleCases = useMemo(
    () => (showAllCases ? [...(data?.cases ?? [])].sort(byName) : trackedCases),
    [showAllCases, data, trackedCases]
  )

  if (loading) return <div className="muted" style={{ fontSize: 13, marginBottom: 26 }}>Loading transcript analysis…</div>
  if (!data) return null

  const m = data.meta
  const inactiveSet = new Set(m.inactiveMembers || [])
  // Board-appropriate noun for the "cases" (Planning = applications; Town Board = agenda items).
  const isTownBoard = m.bodyKey === 'town_board'
  const itemNounPlural = isTownBoard ? 'agenda items' : 'applications'
  const itemNounTitle = isTownBoard ? 'agenda items' : 'applications'

  return (
    <div style={{ marginBottom: 30 }}>
      <h2 style={{ fontSize: 18, margin: '0 0 4px' }}>Meeting transcript analysis</h2>
      <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
        {m.meetings} meetings · {m.cases} {itemNounPlural} · {m.themes} themes · {m.memberPositions} attributed member positions
      </div>
      <div className="muted" style={{ fontSize: 11, marginBottom: 18, lineHeight: 1.5, maxWidth: 720 }}>
        Sentiment −10 (opposed) to +10 (favorable). Member-level attribution is directional.
      </div>

      {/* ---- Board member sentiment ---- */}
      <h3 style={{ fontSize: 14, margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)' }}>
        Board members — overall disposition
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 12, marginBottom: data.members.some((m2) => m2.totalPositions === 0) ? 10 : 28 }}>
        {data.members.filter((mem) => mem.totalPositions > 0).map((mem) => (
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
          {showAllCases ? `All ${itemNounTitle} (${data.cases.length})` : `Recurring ${itemNounTitle} (${trackedCases.length})`}
        </h3>
        <button className="btn secondary" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => setShowAllCases((v) => !v)}>
          {showAllCases ? 'Show recurring only' : `Show all ${data.cases.length}`}
        </button>
      </div>
      <div className="card" style={{ padding: 0, marginBottom: 28, maxHeight: showAllCases ? 520 : undefined, overflowY: showAllCases ? 'auto' : undefined }}>
        {visibleCases.length === 0 ? (
          <div className="muted" style={{ padding: 16, fontSize: 13 }}>Nothing to show.</div>
        ) : visibleCases.map((c, i) => (
          <CaseRow key={c.id} c={c} members={data.members} muni={muni} first={i === 0} open={openCase === c.id} onToggle={() => setOpenCase(openCase === c.id ? null : c.id)} />
        ))}
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

function CaseRow({ c, members, muni, first, open, onToggle }: { c: CaseRollup; members: MemberProfile[]; muni: string; first: boolean; open: boolean; onToggle: () => void }) {
  const propId = c.address ? propertyId(c.address) : ''
  // Where each board member stood on this case: their avg sentiment on it + their quotes.
  const stances = useMemo(() => {
    return members
      .map((mem) => {
        const bc = mem.byCase.find((x) => x.caseId === c.id)
        if (!bc) return null
        const quotes = mem.evidence.filter((e) => e.caseId === c.id)
        return { member: mem.member, avgSentiment: bc.avgSentiment, count: bc.count, quotes }
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort((a, b) => b.avgSentiment - a.avgSentiment)
  }, [members, c.id])

  return (
    <div style={{ borderTop: first ? 'none' : '1px solid var(--border)' }}>
      <div onClick={onToggle} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '12px 14px', cursor: 'pointer' }}>
        <span className="muted" style={{ fontSize: 13, lineHeight: '20px', width: 10, flexShrink: 0 }}>{open ? '▾' : '▸'}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 14, lineHeight: 1.35 }}>{c.name}</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 5, fontSize: 12, color: 'var(--muted)' }}>
            {c.applicationType && <span>{c.applicationType}</span>}
            <span>· seen {c.appearances}×</span>
            {c.lastStatus && <span>· {c.lastStatus}</span>}
            <Spark points={c.trajectory.map((p) => p.sentiment)} />
          </div>
        </div>
        <span style={{ flexShrink: 0 }}><Chip score={c.avgSentiment} /></span>
      </div>
      {open && (
        <div style={{ background: 'var(--panel-2)', padding: '6px 14px 14px 32px' }}>
          <div>
              {(c.address || c.applicant) && (
                <div className="muted" style={{ fontSize: 12, marginBottom: 8 }}>
                  {c.address}{c.address && c.applicant ? ' · ' : ''}{c.applicant ? `Applicant: ${c.applicant}` : ''}
                </div>
              )}
              {propId && (
                <a href={`/admin/municipal/property?muni=${muni}&id=${propId}`}
                   style={{ display: 'inline-block', fontSize: 12, color: 'var(--primary-light)', marginBottom: 12 }}>
                  Property profile →
                </a>
              )}
              {c.themes.length > 0 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
                  {c.themes.map((t) => <ThemeTag key={t} t={t} />)}
                </div>
              )}

              {/* Where the board stood — per-member tabulation */}
              {stances.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                    Where the board stood
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {stances.map((s) => (
                      <div key={s.member} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13 }}>
                        <span style={{ width: 130, flexShrink: 0, fontWeight: 600 }}>{s.member}</span>
                        <span style={{ ...sentimentChipStyle(s.avgSentiment), flexShrink: 0 }}>{fmtSent(s.avgSentiment)}</span>
                        <span style={{ flex: 1 }}>
                          {s.quotes.length > 0 ? (
                            <span className="muted">{s.quotes.map((q) => q.evidence).join(' ')}</span>
                          ) : (
                            <span className="muted" style={{ fontStyle: 'italic' }}>{s.count} position{s.count === 1 ? '' : 's'} recorded</span>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Timeline across meetings */}
              <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                Across meetings
              </div>
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
        </div>
      )}
    </div>
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
