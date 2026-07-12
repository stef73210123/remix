'use client'

import { useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import type { AnalysisDataset, CaseRollup, MemberProfile, ThemeRollup } from '@/lib/municipal/analysis'
import { sentimentColor, sentimentChipStyle, fmtSent, dispositionLabel, sentimentLabel } from '../sentiment'
import MeetingTimelineChart from './MeetingTimelineChart'
import ProgressSpectrum, { weightedProgressScore } from '../ProgressSpectrum'
import { propertyId } from '@/lib/municipal/propertyId'
import { getBoardDepartments } from '@/lib/municipal/departments'
import type { PermitMarker } from '../JurisdictionMap'

const JurisdictionMap = dynamic(() => import('../JurisdictionMap'), {
  ssr: false,
  loading: () => <div className="card" style={{ height: 380, marginBottom: 30 }} />,
})

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

/** Last date a case was seen (its latest timeline appearance). */
function lastSeen(c: CaseRollup): string {
  let max = ''
  for (const ap of c.timeline) if (ap.date > max) max = ap.date
  return max
}

type ThemeSort = 'volume' | 'positive' | 'negative'
type CaseSort = 'lastSeen' | 'name'

export default function TranscriptAnalysis({ muni, body, onData }: {
  muni: string
  body: string
  /** Lets the host page reuse the dataset (e.g. the Meetings section renders the
   *  meeting-by-meeting rows attached to its timeline). */
  onData?: (d: AnalysisDataset | null) => void
}) {
  const [data, setData] = useState<AnalysisDataset | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAllCases, setShowAllCases] = useState(false)
  const [openCase, setOpenCase] = useState<string | null>(null)
  const [themeSort, setThemeSort] = useState<ThemeSort>('volume')
  const [caseSort, setCaseSort] = useState<CaseSort>('lastSeen')
  const [caseQuery, setCaseQuery] = useState('')
  const [mapYear, setMapYear] = useState<number | 'ALL'>('ALL')

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

  // Alphabetical by name (numeric-aware so street numbers order naturally).
  const byName = (a: CaseRollup, b: CaseRollup) =>
    a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
  const byLastSeen = (a: CaseRollup, b: CaseRollup) => lastSeen(b).localeCompare(lastSeen(a))

  const trackedCases = useMemo(
    () => (data ? data.cases.filter((c) => c.appearances >= 2) : []),
    [data]
  )
  const visibleCases = useMemo(() => {
    const base = showAllCases ? [...(data?.cases ?? [])] : [...trackedCases]
    const q = caseQuery.trim().toLowerCase()
    const filtered = q
      ? base.filter((c) =>
          [c.name, c.address, c.applicant, c.applicationType, ...(c.themes || [])]
            .filter(Boolean)
            .some((s) => String(s).toLowerCase().includes(q)),
        )
      : base
    return filtered.sort(caseSort === 'name' ? byName : byLastSeen)
  }, [showAllCases, data, trackedCases, caseQuery, caseSort])

  // Themes, re-ranked by the selected lens.
  const themesSorted = useMemo(() => {
    const t = [...(data?.themes ?? [])]
    if (themeSort === 'positive') return t.sort((a, b) => b.avgSentiment - a.avgSentiment)
    if (themeSort === 'negative') return t.sort((a, b) => a.avgSentiment - b.avgSentiment)
    return t.sort((a, b) => b.meetings - a.meetings)
  }, [data, themeSort])

  // Map: one pin per case with a street address, filterable by appearance year.
  const mapYears = useMemo(() => {
    const ys = new Set<number>()
    for (const c of data?.cases ?? []) for (const ap of c.timeline) {
      const y = Number(ap.date.slice(0, 4))
      if (y) ys.add(y)
    }
    return Array.from(ys).sort((a, b) => b - a)
  }, [data])
  const caseMarkers = useMemo<PermitMarker[]>(() => {
    return (data?.cases ?? [])
      .filter((c) => c.address && /\d/.test(c.address))
      .filter((c) => mapYear === 'ALL' || c.timeline.some((ap) => Number(ap.date.slice(0, 4)) === mapYear))
      .map((c) => ({
        id: c.id,
        address: c.address as string,
        title: c.name,
        sub: [c.applicationType, c.lastStatus, `seen ${c.appearances}×`].filter(Boolean).join(' · '),
        color: sentimentColor(c.avgSentiment),
      }))
  }, [data, mapYear])

  if (loading) return <div className="muted" style={{ fontSize: 13, marginBottom: 26 }}>Loading transcript analysis…</div>
  if (!data) return null

  const m = data.meta
  const inactiveSet = new Set(m.inactiveMembers || [])
  // Board-appropriate noun for the "cases" (Planning = applications; Town Board = agenda items).
  const isTownBoard = m.bodyKey === 'town_board'
  const itemNounPlural = isTownBoard ? 'agenda items' : 'applications'
  const itemNounTitle = isTownBoard ? 'agenda items' : 'applications'
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

      {/* ---- Map of items with a street address ---- */}
      {(caseMarkers.length > 0 || mapYear !== 'ALL') && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', margin: '0 0 10px' }}>
            <h3 style={{ fontSize: 14, margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)' }}>
              {itemNounTitle} on the map
              <span className="muted" style={{ fontSize: 12, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}> · {caseMarkers.length} with a street address · pin color = sentiment</span>
            </h3>
            <select
              value={mapYear}
              onChange={(e) => setMapYear(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
              aria-label="Filter map by year"
              style={{ fontSize: 13, padding: '5px 10px', borderRadius: 6, background: 'var(--panel-2)', border: '1px solid var(--border)', color: 'var(--text)' }}
            >
              <option value="ALL">All years</option>
              {mapYears.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <JurisdictionMap
            muni={muni}
            permits={caseMarkers}
            permitsLabel={`${itemNounTitle[0].toUpperCase()}${itemNounTitle.slice(1)}`}
            permitsGroup="This board"
            defaultActive="permits"
            showIssues={false}
            height={380}
          />
        </>
      )}

      {/* ---- Cases ---- */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', margin: '0 0 12px' }}>
        <h3 style={{ fontSize: 14, margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)' }}>
          {showAllCases ? `All ${itemNounTitle} (${visibleCases.length})` : `Recurring ${itemNounTitle} (${visibleCases.length})`}
        </h3>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="search"
            value={caseQuery}
            onChange={(e) => setCaseQuery(e.target.value)}
            placeholder={`Search ${itemNounPlural}…`}
            aria-label={`Search ${itemNounPlural}`}
            style={{ fontSize: 13, padding: '5px 10px', borderRadius: 6, background: 'var(--panel-2)', border: '1px solid var(--border)', color: 'var(--text)', minWidth: 170 }}
          />
          <select
            value={caseSort}
            onChange={(e) => setCaseSort(e.target.value as CaseSort)}
            aria-label="Sort"
            style={{ fontSize: 13, padding: '5px 10px', borderRadius: 6, background: 'var(--panel-2)', border: '1px solid var(--border)', color: 'var(--text)' }}
          >
            <option value="lastSeen">Last seen</option>
            <option value="name">Name</option>
          </select>
          <button className="btn secondary" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => setShowAllCases((v) => !v)}>
            {showAllCases ? 'Show recurring only' : `Show all ${data.cases.length}`}
          </button>
        </div>
      </div>
      {/* Always a bounded scroll window, so the table stays a shorter view. */}
      <div className="card" style={{ padding: 0, marginBottom: 28, maxHeight: 440, overflowY: 'auto' }}>
        {visibleCases.length === 0 ? (
          <div className="muted" style={{ padding: 16, fontSize: 13 }}>
            {caseQuery ? `No ${itemNounPlural} match “${caseQuery}”.` : 'Nothing to show.'}
          </div>
        ) : visibleCases.map((c, i) => (
          <CaseRow key={c.id} c={c} members={data.members} muni={muni} first={i === 0} open={openCase === c.id} onToggle={() => setOpenCase(openCase === c.id ? null : c.id)} />
        ))}
      </div>
      {/* Meeting-by-meeting rows render with the Meetings timeline on the host
          page (via onData) — no standalone section here anymore. */}
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
            {lastSeen(c) && <span>· last {fmtDate(lastSeen(c))}</span>}
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
