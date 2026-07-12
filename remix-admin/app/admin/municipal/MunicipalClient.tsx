'use client'

import { useEffect, useMemo, useState } from 'react'
import MuniHeader from '@/app/admin/municipal/MuniHeader'
import dynamic from 'next/dynamic'
import type { TownBudget } from '@/lib/municipal/budget'
import BudgetPanel from './budget/BudgetPanel'
import Demographics from './Demographics'
import IssuesOverview from './IssuesOverview'
import KeyIssues from './KeyIssues'
import ElectionResults from './ElectionResults'
import SchoolDistrict from './SchoolDistrict'
import AgeDistribution from './AgeDistribution'
import BoardSentiment, { type BoardScore } from './BoardProgress'
import CivicActions from './CivicActions'
import { isOpen } from '@/lib/flavor'

// Leaflet touches `window`, so the map is client-only (no SSR).
const JurisdictionMap = dynamic(() => import('./JurisdictionMap'), {
  ssr: false,
  loading: () => <div className="card" style={{ height: 420, marginBottom: 30 }} />,
})
import TranscriptAnalysis from './board/TranscriptAnalysis'
import MeetingTimeline, { type TimelineItem } from './MeetingTimeline'
import MeetingList from './MeetingList'


interface Body {
  key: string
  displayName: string
  meetingPattern: string | null
}
interface Municipality {
  key: string
  name: string
  state: string
  county: string | null
  domains: string[]
  bodies: Body[]
}
interface Asset {
  kind: string
  sourceUrl: string | null
  blobUrl: string | null
  pageCount: number | null
}
interface Meeting {
  id: string
  muni_key: string
  muni_name: string
  state: string
  county: string | null
  body_name: string
  body_key: string
  scheduled_at: string
  status: string
  title: string | null
  source_url: string | null
  assets: Asset[]
  text_count: number
}
interface Summary {
  municipalities: Municipality[]
  meetings: Meeting[]
  counts: Record<string, { meetings: number; lastMeetingAt: string | null }>
  dbOk: boolean
  dbError?: string
}

type TownFilter = 'ALL' | string
type BoardFilter = 'ALL' | string

function startOfToday(): number {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

// ── Recurring-pattern → next date ─────────────────────────────────────────
// Parses human patterns like "2nd & 4th Wednesday 7:30pm" or "1st Thursday"
// into the next actual calendar date on/after `from`. Returns null for vague
// patterns ("Monthly", "Quarterly to monthly") that don't name a weekday.
const WEEKDAYS: Record<string, number> = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6,
}
const ORDINALS: Record<string, number> = {
  '1st': 1, '2nd': 2, '3rd': 3, '4th': 4, '5th': 5, last: -1,
}

function nthWeekday(year: number, month: number, weekday: number, n: number): Date | null {
  if (n === -1) {
    const last = new Date(year, month + 1, 0)
    const diff = (last.getDay() - weekday + 7) % 7
    return new Date(year, month, last.getDate() - diff)
  }
  const first = new Date(year, month, 1)
  const offset = (weekday - first.getDay() + 7) % 7
  const d = new Date(year, month, 1 + offset + (n - 1) * 7)
  return d.getMonth() === month ? d : null
}

function nextMeetingDate(pattern: string | null, from: Date): Date | null {
  if (!pattern) return null
  const p = pattern.toLowerCase()
  const weekdayName = Object.keys(WEEKDAYS).find((w) => p.includes(w))
  if (!weekdayName) return null
  const weekday = WEEKDAYS[weekdayName]
  const ords: number[] = []
  for (const [k, v] of Object.entries(ORDINALS)) {
    if (new RegExp(`(^|[^a-z0-9])${k}([^a-z0-9]|$)`).test(p)) ords.push(v)
  }
  if (ords.length === 0) return null
  const uniq = Array.from(new Set(ords))
  const base = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  let best: Date | null = null
  for (let mo = 0; mo <= 3; mo++) {
    const total = base.getMonth() + mo
    const y = base.getFullYear() + Math.floor(total / 12)
    const m = ((total % 12) + 12) % 12
    for (const n of uniq) {
      const d = nthWeekday(y, m, weekday, n)
      if (d && d.getTime() >= base.getTime() && (!best || d < best)) best = d
    }
  }
  return best
}


const RECORDING_KINDS = new Set(['video_mp4', 'audio_mp3'])

function recordingHref(assets: Asset[]): string {
  const a = (assets || []).find((x) => RECORDING_KINDS.has(x.kind))
  return a ? a.blobUrl || a.sourceUrl || '' : ''
}

function RecordingLink({ assets }: { assets: Asset[] }) {
  const href = recordingHref(assets)
  if (!href) return null
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="badge state"
      style={{ textDecoration: 'none', whiteSpace: 'nowrap' }}
      title="Meeting recording"
    >
      ▶ Recording ↗
    </a>
  )
}

function DocLinks({ assets }: { assets: Asset[] }) {
  // Recordings are surfaced separately (RecordingLink); this lists documents.
  const docs = (assets || []).filter((a) => !RECORDING_KINDS.has(a.kind))
  if (docs.length === 0) return <span className="muted">—</span>
  return (
    <span style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 6 }}>
      {docs.map((a, i) => {
        const href = a.blobUrl || a.sourceUrl || ''
        const label = a.kind.charAt(0).toUpperCase() + a.kind.slice(1)
        const title = a.pageCount ? `${label} · ${a.pageCount}pp` : label
        return href ? (
          <a key={i} href={href} target="_blank" rel="noopener noreferrer" className="badge state" style={{ textDecoration: 'none' }} title={title}>
            {label} ↗
          </a>
        ) : (
          <span key={i} className="badge state">{label}</span>
        )
      })}
    </span>
  )
}

function AgendaLink({ assets }: { assets: Asset[] }) {
  const agenda = assets.find((a) => a.kind === 'agenda')
  const href = agenda ? agenda.blobUrl || agenda.sourceUrl || '' : ''
  return href ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className="badge state" style={{ textDecoration: 'none' }}>
      Agenda ↗
    </a>
  ) : (
    <span className="muted">—</span>
  )
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={active ? 'btn' : 'btn secondary'} style={{ padding: '6px 12px', fontSize: 13 }}>
      {children}
    </button>
  )
}

export default function MunicipalClient({
  userName,
  budgets,
}: {
  userName: string
  budgets: Record<string, TownBudget>
}) {
  const [data, setData] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [town, setTown] = useState<TownFilter>('nc')
  const [board, setBoard] = useState<BoardFilter>('ALL')
  // When "All towns" is selected, the financial-analysis section shows one
  // town at a time, chosen with this toggle.
  const [budgetTown, setBudgetTown] = useState<string>('')

  // Deep-link: breadcrumbs and board pages return here with ?town=nc so the
  // right jurisdiction tab is pre-selected.
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('town')
    if (t) setTown(t)
  }, [])

  useEffect(() => {
    setLoading(true)
    fetch('/admin/api/municipal/summary')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('load'))))
      .then((d: Summary) => setData(d))
      .catch(() => setError('Could not load the municipal pipeline.'))
      .finally(() => setLoading(false))
  }, [])

  // Per-board sentiment scores for the selected town — drives the Board
  // Sentiment roll-up AND which boards get a tab (unanalyzed boards are hidden
  // from both).
  const [boardScores, setBoardScores] = useState<BoardScore[] | null>(null)
  const [scoresLoading, setScoresLoading] = useState(true)
  useEffect(() => {
    if (town === 'ALL') { setBoardScores(null); setScoresLoading(false); return }
    setScoresLoading(true)
    fetch(`/admin/api/municipal/board-scores?muni=${encodeURIComponent(town)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('load'))))
      .then((d: { boards?: BoardScore[] }) => setBoardScores(d.boards || []))
      .catch(() => setBoardScores(null))
      .finally(() => setScoresLoading(false))
  }, [town])

  const allBoards = useMemo(() => {
    if (!data) return [] as string[]
    const seen = new Set<string>()
    const out: string[] = []
    for (const m of data.municipalities)
      for (const b of m.bodies)
        if (!seen.has(b.displayName)) { seen.add(b.displayName); out.push(b.displayName) }
    return out
  }, [data])

  // Boards that actually have a transcript-analysis dataset — only these get a
  // tab. While scores load (or for the multi-town "ALL" view) show everything,
  // so tabs never flash away for towns we don't score.
  const boardTabs = useMemo(() => {
    if (town === 'ALL' || !boardScores) return allBoards
    const analyzed = new Set(boardScores.filter((b) => b.score != null).map((b) => b.displayName))
    return allBoards.filter((b) => analyzed.has(b))
  }, [allBoards, boardScores, town])

  // If the selected board tab loses its analysis (or the town changes), fall
  // back to the dashboard rather than stranding an orphaned view.
  useEffect(() => {
    if (board !== 'ALL' && !boardTabs.includes(board)) setBoard('ALL')
  }, [board, boardTabs])

  const munisShown = useMemo(
    () => (data ? data.municipalities.filter((m) => town === 'ALL' || m.key === town) : []),
    [data, town]
  )

  const meetingsFiltered = useMemo(() => {
    if (!data) return []
    return data.meetings.filter(
      (m) => (town === 'ALL' || m.muni_key === town) && (board === 'ALL' || m.body_name === board)
    )
  }, [data, town, board])

  const history = useMemo(
    () => meetingsFiltered.filter((m) => new Date(m.scheduled_at).getTime() < startOfToday()),
    [meetingsFiltered]
  )

  // One "next meeting" row per tracked board: prefer a real ingested upcoming
  // meeting (with its agenda); otherwise project the next date from the schedule.
  const upcomingRows = useMemo(() => {
    const t0 = startOfToday()
    const today = new Date(t0)
    const rows: { town: string; board: string; muniKey: string; bodyKey: string; date: Date | null; assets: Asset[]; pattern: string | null; projected: boolean }[] = []
    const meetings = data?.meetings ?? []
    for (const m of munisShown) {
      for (const b of m.bodies) {
        if (board !== 'ALL' && b.displayName !== board) continue
        const ingested = meetings
          .filter((mm) => mm.muni_key === m.key && mm.body_name === b.displayName && new Date(mm.scheduled_at).getTime() >= t0)
          .sort((a, c) => new Date(a.scheduled_at).getTime() - new Date(c.scheduled_at).getTime())[0]
        const common = { town: m.name, board: b.displayName, muniKey: m.key, bodyKey: b.key, pattern: b.meetingPattern }
        if (ingested) {
          rows.push({ ...common, date: new Date(ingested.scheduled_at), assets: ingested.assets, projected: false })
        } else {
          rows.push({ ...common, date: nextMeetingDate(b.meetingPattern, today), assets: [], projected: true })
        }
      }
    }
    rows.sort((a, c) => {
      if (a.date && c.date) return a.date.getTime() - c.date.getTime()
      if (a.date) return -1
      if (c.date) return 1
      return 0
    })
    return rows
  }, [munisShown, board, data])

  // One combined timeline: past meetings (per meeting) on the left, the next
  // meeting per board on the right, oldest → newest.
  const timelineItems = useMemo<TimelineItem[]>(() => {
    const hist: TimelineItem[] = history
      .map((mtg) => {
        const hasDocs = (mtg.assets || []).some((a) => !RECORDING_KINDS.has(a.kind))
        const hasRec = !!recordingHref(mtg.assets)
        return {
          key: `h_${mtg.id}`,
          date: new Date(mtg.scheduled_at),
          title: mtg.title,
          board: mtg.body_name,
          boardHref: `/admin/municipal/board?muni=${mtg.muni_key}&body=${mtg.body_key}`,
          town: mtg.muni_name,
          past: true,
          links:
            hasDocs || hasRec ? (
              <>
                {hasDocs && <DocLinks assets={mtg.assets} />}
                {hasRec && <RecordingLink assets={mtg.assets} />}
              </>
            ) : undefined,
        }
      })
      .sort((a, b) => (a.date!.getTime() - b.date!.getTime()))
    // Only the single soonest upcoming meeting teases on the right of "Now";
    // everything else is history on the left.
    const nextRow = upcomingRows.find((r) => r.date) || upcomingRows[0]
    const up: TimelineItem[] = nextRow
      ? [{
          key: `u_${nextRow.bodyKey}`,
          date: nextRow.date,
          dateSuffix: nextRow.projected ? ' *' : '',
          dateTitle: nextRow.projected ? 'Projected from meeting schedule' : undefined,
          fallbackLabel: nextRow.pattern || 'TBD',
          board: nextRow.board,
          boardHref: `/admin/municipal/board?muni=${nextRow.muniKey}&body=${nextRow.bodyKey}`,
          town: nextRow.town,
          past: false,
          projected: nextRow.projected,
          links: <AgendaLink assets={nextRow.assets} />,
        }]
      : []
    return [...hist, ...up]
  }, [history, upcomingRows])

  // Towns that have budget data — the choices for the "All towns" toggle.
  const budgetTownList = useMemo(
    () => (data ? data.municipalities.filter((m) => budgets[m.key]) : []),
    [data, budgets]
  )

  return (
    <div className="container">
      <MuniHeader userName={userName} />

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <h1 className="page-title" style={{ marginBottom: 16 }}>Municipal Dashboard</h1>
        {/* On the public OpenNorthCastle build these live in the sticky header
            (MuniHeader) instead; the paywalled Remix build keeps them here. */}
        {!isOpen && <CivicActions style={{ marginTop: 4 }} />}
      </div>

      {loading && <div className="muted" style={{ padding: 20 }}>Loading municipal pipeline…</div>}
      {error && <div className="error" style={{ padding: 20 }}>{error}</div>}

      {data && !loading && (
        <>
          {/* Town selector — hidden on the single-town public OpenNorthCastle build. */}
          {!isOpen && (
            <div className="pill-strip" style={{ display: 'flex', gap: 6, flexWrap: 'nowrap', marginBottom: 8 }}>
              {data.municipalities.map((m) => (
                <Chip key={m.key} active={town === m.key} onClick={() => setTown(m.key)}>{m.name}</Chip>
              ))}
            </div>
          )}
          <div className="pill-strip" style={{ display: 'flex', gap: 6, flexWrap: 'nowrap', marginBottom: 22 }}>
            <Chip active={board === 'ALL'} onClick={() => setBoard('ALL')}>Dashboard</Chip>
            {boardTabs.map((b) => (
              <Chip key={b} active={board === b} onClick={() => setBoard(b)}>{b}</Chip>
            ))}
            {town === 'nc' && (
              <a
                href={`/admin/municipal/building?muni=${town}`}
                className="btn secondary"
                style={{ padding: '6px 12px', fontSize: 13, textDecoration: 'none', whiteSpace: 'nowrap' }}
              >
                Building Dept
              </a>
            )}
          </div>

          {/* Board view — the enriched profile (members, themes, cases, meeting-by-
              meeting analysis) inline, so it doesn't require a click-through. */}
          {board !== 'ALL' && town !== 'ALL' && (() => {
            const m = data.municipalities.find((x) => x.key === town)
            const bodyKey = m?.bodies.find((b) => b.displayName === board)?.key
            if (!m || !bodyKey) return null
            return (
              <>
                <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>{board}</h2>
                <div className="muted" style={{ fontSize: 13, marginBottom: 20 }}>{m.name}</div>
                <TranscriptAnalysis muni={town} body={bodyKey} />
              </>
            )
          })()}

          {/* Jurisdiction map — Dashboard tab only, for the selected town. */}
          {board === 'ALL' && town !== 'ALL' && <JurisdictionMap muni={town} />}

          {/* Meetings — one horizontal timeline: history on the left, the next
              meeting per board on the right, with a "Now" divider between.
              Sits just above the board-sentiment roll-up. */}
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', margin: '0 0 12px' }}>
            <h2 style={{ fontSize: 16, margin: 0 }}>
              Meetings
              <span className="muted" style={{ fontSize: 13, fontWeight: 400 }}> · {history.length} past · next meeting ahead</span>
            </h2>
          </div>
          <MeetingTimeline
            items={timelineItems}
            emptyText={
              data.dbOk
                ? 'No meetings match this filter. Run the ingest pipeline (/admin/api/municipal/ingest-one?muni=nc) to populate history.'
                : 'Pipeline database not connected in this environment. Ingested meetings will appear once NEON_DATABASE_URL is set and the ingest has run.'
            }
          />
          {/* Compact scrolling list of the same meetings beneath the timeline. */}
          {timelineItems.length > 0 && <div style={{ marginTop: 10 }}><MeetingList items={timelineItems} /></div>}
          <div style={{ marginBottom: 26 }} />

          {/* Consolidated per-board sentiment spectrums — Dashboard tab only. */}
          {board === 'ALL' && town !== 'ALL' && <BoardSentiment muniKey={town} boards={boardScores} loading={scoresLoading} />}

          {/* Narrative key-issue synopsis, above the sorted theme bars. */}
          {board === 'ALL' && town !== 'ALL' && <KeyIssues muniKey={town} />}

          {/* Town-wide local issues across all boards — Dashboard tab only. */}
          {board === 'ALL' && town !== 'ALL' && <IssuesOverview muni={town} />}

          {/* Town election results (Supervisor & Town Board) — Dashboard tab only. */}
          {board === 'ALL' && town !== 'ALL' && <ElectionResults muniKey={town} />}

          {/* Demographics — Dashboard tab only, for the selected town. */}
          {board === 'ALL' && town !== 'ALL' && <Demographics muniKey={town} />}

          {/* School district context — Dashboard tab only. */}
          {board === 'ALL' && town !== 'ALL' && <SchoolDistrict muniKey={town} />}

          {/* Age distribution over time, with school-age bands — Dashboard tab only. */}
          {board === 'ALL' && town !== 'ALL' && <AgeDistribution muniKey={town} />}

          {/* Financial analysis — the selected town's budget. Dashboard tab only. */}
          {board === 'ALL' && (() => {
            const activeKey =
              town !== 'ALL' ? town : (budgetTown && budgets[budgetTown] ? budgetTown : budgetTownList[0]?.key || '')
            const activeBudget = activeKey ? budgets[activeKey] : undefined
            return (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', margin: '0 0 12px' }}>
                  <h2 style={{ fontSize: 16, margin: 0 }}>Financial analysis</h2>
                  {town === 'ALL' && budgetTownList.length > 0 && (
                    <div className="pill-strip" style={{ display: 'flex', gap: 6, flexWrap: 'nowrap' }}>
                      {budgetTownList.map((m) => (
                        <Chip key={m.key} active={activeKey === m.key} onClick={() => setBudgetTown(m.key)}>{m.name}</Chip>
                      ))}
                    </div>
                  )}
                </div>
                {activeBudget ? (
                  <div style={{ marginBottom: 26 }}>
                    <BudgetPanel budget={activeBudget} />
                  </div>
                ) : (
                  <div className="card" style={{ marginBottom: 26 }}>
                    <div className="muted" style={{ padding: 20, fontSize: 13 }}>
                      No budget data for{' '}
                      {town !== 'ALL'
                        ? data.municipalities.find((m) => m.key === town)?.name || 'this town'
                        : 'the tracked towns'}{' '}
                      yet.
                    </div>
                  </div>
                )}
              </>
            )
          })()}

          {!data.dbOk && data.dbError && (
            <p className="muted" style={{ fontSize: 11, marginTop: 12 }}>DB: {data.dbError}</p>
          )}
        </>
      )}
    </div>
  )
}
