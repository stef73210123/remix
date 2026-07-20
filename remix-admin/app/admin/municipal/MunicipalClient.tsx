'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import MuniHeader from '@/app/admin/municipal/MuniHeader'
import MuniTabs, { TabDropdownGroups } from '@/app/admin/municipal/MuniTabs'
import { useTabScrollRestore } from './useTabScroll'
import dynamic from 'next/dynamic'
import Demographics from './Demographics'
import IssuesOverview from './IssuesOverview'
import KeyIssues from './KeyIssues'
import BoardFilterDropdown from './BoardFilterDropdown'
import ElectionResults from './ElectionResults'
import CommunityCalendar from './CommunityCalendar'
import CommunityOrgs from './CommunityOrgs'
import InTheNews from './InTheNews'
import OpenPetitions from './OpenPetitions'
import SchoolDistrict from './SchoolDistrict'
import BoardSentiment, { type BoardScore } from './BoardProgress'
import { isOpen } from '@/lib/flavor'
import { nextMeetingDate, remainingYearMeetingDates, dayKey } from '@/lib/municipal/meetingPattern'

// Leaflet touches `window`, so the map is client-only (no SSR).
const JurisdictionMap = dynamic(() => import('./JurisdictionMap'), {
  ssr: false,
  loading: () => <div className="card" style={{ height: 420, marginBottom: 30 }} />,
})
import TranscriptAnalysis from './board/TranscriptAnalysis'
import BoardCaseMap from './board/BoardCaseMap'
import BoardStaffCards from './board/BoardStaffCards'
import BoardKeyDocs from './board/BoardKeyDocs'
import MeetingAnalysisList from './board/MeetingAnalysisList'
import CasesList from './board/CasesList'
import type { AnalysisDataset, MeetingAnalysis } from '@/lib/municipal/analysis'
import MeetingTimeline, { type TimelineItem } from './MeetingTimeline'
import MeetingList from './MeetingList'
import TownBackground from './TownBackground'


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
}: {
  userName: string
}) {
  const [data, setData] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [town, setTown] = useState<TownFilter>('nc')
  const [board, setBoard] = useState<BoardFilter>('ALL')

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

  // Analysis dataset surfaced by the inline TranscriptAnalysis (board tabs), so
  // the Meetings section attaches the meeting-by-meeting rows to its timeline.
  const [boardAnalysis, setBoardAnalysis] = useState<AnalysisDataset | null>(null)
  useEffect(() => { setBoardAnalysis(null) }, [board, town])

  // Shared selection between the Meetings timeline and the list beneath it —
  // clicking an entry in either highlights and scrolls to the match in the other.
  const [selectedMeetingKey, setSelectedMeetingKey] = useState<string | null>(null)
  useEffect(() => { setSelectedMeetingKey(null) }, [board, town])

  // Meetings widget's own board/committee filter (distinct from the page-level
  // `board` tab above) — only meaningful on the combined "Dashboard" tab,
  // where every board's meetings intermingle in one timeline. A board name in
  // this set is hidden; empty (the default) shows every board.
  const [hiddenMeetingBoards, setHiddenMeetingBoards] = useState<Set<string>>(new Set())
  useEffect(() => { setHiddenMeetingBoards(new Set()) }, [town])

  // Remix (non-ONC) only — ONC now renders the shared <MuniTabs> component
  // below, which measures the sticky header height itself.
  const tabScrollRef = useTabScrollRestore<HTMLDivElement>()

  const munisShown = useMemo(
    () => (data ? data.municipalities.filter((m) => town === 'ALL' || m.key === town) : []),
    [data, town]
  )

  // Per-meeting transcript analysis for every one of the selected town's
  // boards (not just the currently-selected tab), so the dashboard's combined
  // Meetings list — which spans every board — can attach the same rich,
  // expandable row (sentiment chip, item count, case detail) that a board's
  // own tab shows, instead of a plain summary line. Keyed the same way as
  // timelineItems below (`${muni}_${body}_${date}`).
  const [meetingAnalysisByKey, setMeetingAnalysisByKey] = useState<Map<string, MeetingAnalysis>>(new Map())
  useEffect(() => {
    if (town === 'ALL') { setMeetingAnalysisByKey(new Map()); return }
    const m = data?.municipalities.find((x) => x.key === town)
    if (!m) return
    let cancelled = false
    Promise.all(
      m.bodies.map((b) =>
        fetch(`/admin/api/municipal/transcript-analysis?muni=${encodeURIComponent(town)}&body=${encodeURIComponent(b.key)}`)
          .then((r) => (r.ok ? r.json() : null))
          .then((d) => (d && d.available !== false ? (d as AnalysisDataset) : null))
          .catch(() => null)
      )
    ).then((datasets) => {
      if (cancelled) return
      const lookup = new Map<string, MeetingAnalysis>()
      datasets.forEach((ds, i) => {
        if (!ds) return
        const bodyKey = m.bodies[i].key
        for (const mt of ds.meetings) {
          lookup.set(`${town}_${bodyKey}_${mt.date}`, mt)
        }
      })
      setMeetingAnalysisByKey(lookup)
    })
    return () => { cancelled = true }
  }, [data, town])

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

  // One row per upcoming meeting, per tracked board: every board gets its
  // full remaining-this-calendar-year schedule (every ingested future
  // meeting, plus every not-yet-ingested date its recurring pattern implies),
  // not just the single soonest date — so all of a board's known meeting
  // dates show on the timeline. A board with neither a real upcoming meeting
  // nor a parseable pattern still falls back to a single TBD row so it isn't
  // silently dropped from the widget.
  const upcomingRows = useMemo(() => {
    const t0 = startOfToday()
    const today = new Date(t0)
    const yearEnd = new Date(today.getFullYear(), 11, 31)
    const rows: { town: string; board: string; muniKey: string; bodyKey: string; date: Date | null; assets: Asset[]; pattern: string | null; projected: boolean }[] = []
    const meetings = data?.meetings ?? []
    for (const m of munisShown) {
      for (const b of m.bodies) {
        if (board !== 'ALL' && b.displayName !== board) continue
        const common = { town: m.name, board: b.displayName, muniKey: m.key, bodyKey: b.key, pattern: b.meetingPattern }
        const ingestedFuture = meetings
          .filter((mm) => mm.muni_key === m.key && mm.body_name === b.displayName && new Date(mm.scheduled_at).getTime() >= t0)
          .sort((a, c) => new Date(a.scheduled_at).getTime() - new Date(c.scheduled_at).getTime())

        let addedAny = false
        if (isOpen) {
          for (const mm of ingestedFuture) {
            rows.push({ ...common, date: new Date(mm.scheduled_at), assets: mm.assets, projected: false })
            addedAny = true
          }
          const ingestedDays = new Set(ingestedFuture.map((mm) => dayKey(new Date(mm.scheduled_at))))
          for (const d of remainingYearMeetingDates(b.meetingPattern, today, yearEnd)) {
            if (!ingestedDays.has(dayKey(d))) { rows.push({ ...common, date: d, assets: [], projected: true }); addedAny = true }
          }
        }
        if (!addedAny) {
          if (ingestedFuture[0]) {
            rows.push({ ...common, date: new Date(ingestedFuture[0].scheduled_at), assets: ingestedFuture[0].assets, projected: false })
          } else {
            rows.push({ ...common, date: nextMeetingDate(b.meetingPattern, today), assets: [], projected: true })
          }
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
        const itemKey = `${mtg.muni_key}_${mtg.body_key}_${mtg.scheduled_at.slice(0, 10)}`
        const analysis = meetingAnalysisByKey.get(itemKey)
        return {
          // Composite muni+body+date key, matching MeetingAnalysisList's row
          // keys, so selecting a meeting in either view (the board tab's
          // timeline vs. its meeting-by-meeting list) highlights/scrolls to
          // the same entry in the other.
          key: itemKey,
          date: new Date(mtg.scheduled_at),
          summary: analysis?.meetingSummary,
          // Full case-level analysis, when this meeting's board has a
          // transcript-analysis dataset — lets MeetingList render the same
          // expandable row a board's own tab shows, instead of a plain one.
          analysis,
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
    // Every dated upcoming row teases on the right of "Now" — for most boards
    // that's just the single soonest meeting, but Town Board and Planning
    // Board (see upcomingRows above) each contribute their full remaining-year
    // schedule here. A board with no parseable date at all still falls back
    // to a single TBD row so it isn't silently dropped from the widget.
    const dated = upcomingRows.filter((r) => r.date)
    const upRows = dated.length > 0 ? dated : upcomingRows.slice(0, 1)
    const up: TimelineItem[] = upRows.map((r) => ({
      key: `u_${r.bodyKey}_${r.date ? dayKey(r.date) : 'tbd'}`,
      date: r.date,
      dateSuffix: r.projected ? ' *' : '',
      dateTitle: r.projected ? 'Projected from meeting schedule' : undefined,
      fallbackLabel: r.pattern || 'TBD',
      board: r.board,
      boardHref: `/admin/municipal/board?muni=${r.muniKey}&body=${r.bodyKey}`,
      town: r.town,
      past: false,
      projected: r.projected,
      links: <AgendaLink assets={r.assets} />,
    }))
    return [...hist, ...up]
  }, [history, upcomingRows, meetingAnalysisByKey])

  // Distinct board/committee names actually present on the combined timeline —
  // the multi-select filter's option list, in the same oldest-board-first
  // order they appear.
  const meetingBoardOptions = useMemo(() => {
    const seen = new Set<string>()
    const out: string[] = []
    for (const it of timelineItems) if (it.board && !seen.has(it.board)) { seen.add(it.board); out.push(it.board) }
    return out
  }, [timelineItems])

  // The board/committee multi-select filter only makes sense on the combined
  // "Dashboard" tab (board === 'ALL'), where several boards' meetings
  // intermingle in one timeline — a single-board tab already shows just that
  // board, so the filter is a no-op there.
  const visibleTimelineItems = useMemo(
    () => (board === 'ALL' && hiddenMeetingBoards.size > 0
      ? timelineItems.filter((it) => !it.board || !hiddenMeetingBoards.has(it.board))
      : timelineItems),
    [timelineItems, board, hiddenMeetingBoards]
  )

  // Meetings — one horizontal timeline: history on the left, the next meeting
  // per board on the right, with a "Now" divider between. Rendered once and
  // referenced from two different spots below: right under the board's own
  // case map (a specific board tab) or in its usual place above Board
  // Sentiment (the "All" dashboard tab) — never both at once.
  //
  // Until the user clicks a specific meeting, the selection defaults to the
  // soonest upcoming one (visibleTimelineItems' first non-past entry, already
  // sorted ascending) so the timeline and list highlight the next meeting
  // ahead of "Now" on load, rather than nothing being selected.
  const defaultMeetingKey = visibleTimelineItems.find((it) => !it.past)?.key ?? null
  const effectiveMeetingKey = selectedMeetingKey ?? defaultMeetingKey
  const meetingsBlock = data && (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', margin: '0 0 12px' }}>
        <h2 style={{ fontSize: 16, margin: 0 }}>Meetings</h2>
        {board === 'ALL' && meetingBoardOptions.length > 1 && (
          <BoardFilterDropdown
            options={meetingBoardOptions}
            hidden={hiddenMeetingBoards}
            onChange={setHiddenMeetingBoards}
          />
        )}
      </div>
      <MeetingTimeline
        items={visibleTimelineItems}
        selectedKey={effectiveMeetingKey}
        onSelect={setSelectedMeetingKey}
        emptyText={
          data.dbOk
            ? 'No meetings match this filter. Run the ingest pipeline (/admin/api/municipal/ingest-one?muni=nc) to populate history.'
            : 'Pipeline database not connected in this environment. Ingested meetings will appear once NEON_DATABASE_URL is set and the ingest has run.'
        }
      />
      {/* Compact scrolling list of the same meetings beneath the timeline —
          or, on a board tab with an analysis dataset, the meeting-by-meeting
          analysis rows attached to the same timeline. */}
      {board !== 'ALL' && town !== 'ALL' && boardAnalysis && boardAnalysis.meetings.length > 0 ? (
        <div style={{ marginTop: 10 }}>
          <MeetingAnalysisList
            meetings={boardAnalysis.meetings}
            muni={town}
            body={data.municipalities.find((x) => x.key === town)?.bodies.find((b) => b.displayName === board)?.key || ''}
            selectedKey={effectiveMeetingKey}
            onSelect={setSelectedMeetingKey}
          />
        </div>
      ) : (
        visibleTimelineItems.length > 0 && (
          <div style={{ marginTop: 10 }}>
            <MeetingList items={visibleTimelineItems} selectedKey={effectiveMeetingKey} onSelect={setSelectedMeetingKey} />
          </div>
        )
      )}
      <div style={{ marginBottom: 26 }} />
    </>
  )

  return (
    <div className="container">
      <MuniHeader userName={userName} />

      {/* On the public OpenNorthCastle build the wordmark + civic buttons live
          in the sticky header (MuniHeader) instead, and the page title is
          redundant with it — so this whole row is Remix-only. */}
      {/* CivicActions (FOIL/Report/Ask) now live in the shared bottom bar via
          MuniHeader on both flavors, so no inline copy here. */}
      {!isOpen && (
        <h1 className="page-title" style={{ marginBottom: 16 }}>Municipal Dashboard</h1>
      )}

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
          {/* ONC: the same Dashboard / Boards▾ / Committees▾ / Departments▾ strip
              every other page uses — no separate per-board chips, since the
              Boards dropdown already covers Town Board/Planning Board. Remix
              (internal, multi-town) keeps its own board-analysis chip row,
              which drives the inline board-profile view below. */}
          {isOpen ? (
            <MuniTabs muni={town} active="dashboard" />
          ) : (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 22 }}>
              <div ref={tabScrollRef} className="pill-strip" style={{ display: 'flex', gap: 6, flexWrap: 'nowrap', minWidth: 0 }}>
                <Chip active={board === 'ALL'} onClick={() => setBoard('ALL')}>Dashboard</Chip>
                {boardTabs.map((b) => (
                  <Chip key={b} active={board === b} onClick={() => setBoard(b)}>{b}</Chip>
                ))}
              </div>
              {town === 'nc' && <TabDropdownGroups muni={town} active="" showBoards={false} />}
            </div>
          )}

          {/* Board view — the enriched profile (members, themes, cases, meeting-by-
              meeting analysis) inline, so it doesn't require a click-through. */}
          {board !== 'ALL' && town !== 'ALL' && (() => {
            const m = data.municipalities.find((x) => x.key === town)
            const bodyKey = m?.bodies.find((b) => b.displayName === board)?.key
            if (!m || !bodyKey) return null
            return (
              <>
                <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 20px' }}>{board}</h2>
                <BoardStaffCards muni={town} bodyKey={bodyKey} />
                <BoardKeyDocs muni={town} bodyKey={bodyKey} />
                <BoardCaseMap dataset={boardAnalysis} muni={town} />
                {meetingsBlock}
                <TranscriptAnalysis muni={town} body={bodyKey} onData={setBoardAnalysis} />
              </>
            )
          })()}

          {/* Town background + image carousel, directly above the map — Dashboard tab only. */}
          {board === 'ALL' && town !== 'ALL' && (
            <TownBackground muniKey={town} townName={data.municipalities.find((m) => m.key === town)?.name || ''} />
          )}

          {/* Jurisdiction map — Dashboard tab only, for the selected town. */}
          {board === 'ALL' && town !== 'ALL' && <JurisdictionMap muni={town} />}

          {/* Meetings — sits just above the board-sentiment roll-up on the "All"
              dashboard tab. (On a specific board tab, this same block already
              rendered above, right under that board's case map.) */}
          {board === 'ALL' && meetingsBlock}

          {/* Recurring/all applications (or agenda items) table — after Meetings. */}
          {board !== 'ALL' && town !== 'ALL' && boardAnalysis && <CasesList data={boardAnalysis} muni={town} />}

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

          {/* Community events calendar + the orgs behind them — Dashboard tab
              only. Sits at the bottom, after the town's own civic/financial data. */}
          {board === 'ALL' && town !== 'ALL' && <CommunityCalendar muniKey={town} />}
          {board === 'ALL' && town !== 'ALL' && <CommunityOrgs muniKey={town} />}
          {board === 'ALL' && town !== 'ALL' && <InTheNews muniKey={town} />}
          {board === 'ALL' && town !== 'ALL' && <OpenPetitions muniKey={town} />}

          {!data.dbOk && data.dbError && (
            <p className="muted" style={{ fontSize: 11, marginTop: 12 }}>DB: {data.dbError}</p>
          )}
        </>
      )}
    </div>
  )
}
