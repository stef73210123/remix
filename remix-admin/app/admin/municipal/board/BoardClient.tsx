'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import MuniHeader from '@/app/admin/municipal/MuniHeader'
import MuniTabs from '@/app/admin/municipal/MuniTabs'
import Breadcrumbs, { type Crumb } from '../Breadcrumbs'
import MeetingTimeline, { type TimelineItem } from '../MeetingTimeline'
import MeetingList from '../MeetingList'
import TranscriptAnalysis from './TranscriptAnalysis'
import BoardCaseMap from './BoardCaseMap'
import ParksMap from './ParksMap'
import BoardStaffCards from './BoardStaffCards'
import BoardKeyDocs from './BoardKeyDocs'
import BoardMemberCards from './BoardMemberCards'
import MeetingAnalysisList from './MeetingAnalysisList'
import CasesList from './CasesList'
import type { AnalysisDataset } from '@/lib/municipal/analysis'
import { isOpen } from '@/lib/flavor'
import { isHiddenBody } from '@/lib/municipal/registry'
import { nextMeetingDate, remainingYearMeetingDates, dayKey } from '@/lib/municipal/meetingPattern'


interface Asset { kind: string; sourceUrl: string | null; blobUrl: string | null; pageCount: number | null }
interface Meeting {
  id: string
  scheduled_at: string
  status: string
  title: string | null
  source_url: string | null
  assets: Asset[]
  text_count: number
}
interface Member {
  id: string
  full_name: string
  title: string | null
  kind: string
  email: string | null
  active: boolean
}
interface OpenFile {
  id: string
  kind: string
  subject: string
  applicant_name: string | null
  status: string
  application_date: string | null
  decision_date: string | null
}
interface BoardData {
  town: { key: string; name: string; state: string; county: string | null }
  board: { key: string; displayName: string; meetingPattern: string | null }
  meetings: Meeting[]
  members: Member[]
  openFiles: OpenFile[]
  dbOk: boolean
  dbError?: string
}

function DocLinks({ assets }: { assets: Asset[] }) {
  if (!assets || assets.length === 0) return <span className="muted">—</span>
  return (
    <span style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 6 }}>
      {assets.map((a, i) => {
        const href = a.blobUrl || a.sourceUrl || ''
        const label = a.kind.charAt(0).toUpperCase() + a.kind.slice(1)
        return href ? (
          <a key={i} href={href} target="_blank" rel="noopener noreferrer" className="badge state" style={{ textDecoration: 'none' }}>{label} ↗</a>
        ) : (
          <span key={i} className="badge state">{label}</span>
        )
      })}
    </span>
  )
}

function startOfToday(): number {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

export default function BoardClient({ userName }: { userName: string }) {
  const [muni, setMuni] = useState('')
  const [body, setBody] = useState('')
  const [data, setData] = useState<BoardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [transcriptDates, setTranscriptDates] = useState<Set<string>>(new Set())
  const memberScrollRef = useRef<HTMLDivElement>(null)
  // Analysis dataset surfaced by TranscriptAnalysis, so the Meetings section
  // below can attach the meeting-by-meeting rows to its timeline.
  const [analysis, setAnalysis] = useState<AnalysisDataset | null>(null)
  // Shared selection between the Meetings timeline and the list beneath it —
  // clicking an entry in either highlights and scrolls to the match in the other.
  const [selectedMeetingKey, setSelectedMeetingKey] = useState<string | null>(null)

  useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    const m = p.get('muni') || ''
    const b = p.get('body') || ''
    setMuni(m)
    setBody(b)
    // A board the registry hides has too little behind it to be worth a page;
    // an old link or a hand-typed URL still lands here, so send it to the
    // dashboard rather than rendering a near-empty board.
    if (m && b && isHiddenBody(m, b)) {
      window.location.replace(isOpen ? '/' : '/admin/municipal')
      return
    }
    if (m && b) {
      fetch(`/admin/api/municipal/transcript?muni=${encodeURIComponent(m)}&body=${encodeURIComponent(b)}`)
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error('load'))))
        .then((d) => setTranscriptDates(new Set<string>(d.dates || [])))
        .catch(() => setTranscriptDates(new Set()))
    }
    if (!m || !b) {
      setError('Missing town or board.')
      setLoading(false)
      return
    }
    setLoading(true)
    fetch(`/admin/api/municipal/board?muni=${encodeURIComponent(m)}&body=${encodeURIComponent(b)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('load'))))
      .then((d: BoardData) => setData(d))
      .catch(() => setError('Could not load this board.'))
      .finally(() => setLoading(false))
  }, [])

  // One horizontal timeline of this board's meetings: past on the left, upcoming
  // on the right. Each card carries its document + transcript links.
  const timelineItems = useMemo<TimelineItem[]>(() => {
    const t0 = startOfToday()
    const items: TimelineItem[] = (data?.meetings || [])
      .map((mtg) => {
        const past = new Date(mtg.scheduled_at).getTime() < t0
        const dateKey = (mtg.scheduled_at || '').slice(0, 10)
        const hasTranscript = transcriptDates.has(dateKey)
        const hasDocs = (mtg.assets || []).length > 0
        return {
          // Composite muni+body+date key, matching MeetingAnalysisList's row
          // keys, so selecting a meeting in either view highlights/scrolls to
          // the same entry in the other.
          key: `${muni}_${body}_${dateKey}`,
          date: new Date(mtg.scheduled_at),
          past,
          links: hasDocs ? <DocLinks assets={mtg.assets} /> : undefined,
          transcriptLink: hasTranscript ? (
            <a
              href={`/admin/api/municipal/transcript?muni=${muni}&body=${body}&date=${dateKey}`}
              target="_blank"
              rel="noopener noreferrer"
              className="badge state"
              style={{ textDecoration: 'none' }}
            >
              Transcript ↗
            </a>
          ) : undefined,
        }
      })
      .sort((a, b) => (a.date!.getTime() - b.date!.getTime()))

    // Fill in every remaining date this year the recurring pattern implies
    // that isn't already covered by a real ingested meeting — not just a
    // single placeholder when there's no real upcoming meeting at all.
    // Otherwise a later real meeting whose agenda happened to post early
    // (e.g. one in November) hides the gap in the months before it, since
    // "no real upcoming meeting" would no longer be true.
    const pattern = data?.board.meetingPattern ?? null
    const today = new Date(t0)
    const yearEnd = new Date(today.getFullYear(), 11, 31)
    const ingestedDays = new Set(items.map((it) => dayKey(it.date!)))
    let addedProjection = false
    for (const d of remainingYearMeetingDates(pattern, today, yearEnd)) {
      if (!ingestedDays.has(dayKey(d))) {
        items.push({ key: `projected_${dayKey(d)}`, date: d, dateSuffix: ' *', dateTitle: 'Projected from meeting schedule', past: false, projected: true })
        addedProjection = true
      }
    }
    // Vague patterns ("Monthly", "Quarterly to monthly") can't be projected
    // above — fall back to the single-soonest-date heuristic so the board
    // isn't left with nothing upcoming when it also has no real one ingested.
    if (!addedProjection && !items.some((it) => !it.past)) {
      const single = nextMeetingDate(pattern, today)
      if (single) items.push({ key: 'projected', date: single, dateSuffix: ' *', dateTitle: 'Projected from meeting schedule', past: false, projected: true })
    }

    return items.sort((a, b) => (a.date!.getTime() - b.date!.getTime()))
  }, [data, transcriptDates, muni, body])

  // Breadcrumb trail: Dashboard › Town › Board (current). OpenNorthCastle is a
  // single-jurisdiction site, so the town crumb is implied and skipped there.
  const crumbs = useMemo<Crumb[]>(() => {
    const trail: Crumb[] = [{ label: 'Dashboard', href: isOpen ? '/' : '/admin/municipal' }]
    if (data?.town && !isOpen) trail.push({ label: data.town.name, href: `/admin/municipal?town=${data.town.key}` })
    trail.push({ label: data?.board.displayName || 'Board' })
    return trail
  }, [data])

  const scrollMembersByCard = (dir: 1 | -1) => {
    const el = memberScrollRef.current
    if (!el) return
    const card = el.querySelector<HTMLElement>('[data-board-member-card]')
    const step = (card?.offsetWidth ?? 210) + 12
    el.scrollBy({ left: dir * step, behavior: 'smooth' })
  }

  return (
    <div className="container">
      <MuniHeader userName={userName} />
      <MuniTabs muni={muni} active={body} />

      {!isOpen && data && !loading && (
        <div style={{ marginBottom: 12 }}>
          <Breadcrumbs items={crumbs} />
        </div>
      )}

      {loading && <div className="muted" style={{ padding: 20 }}>Loading board…</div>}
      {error && <div className="error" style={{ padding: 20 }}>{error}</div>}

      {data && !loading && (
        <>
          <h1 className="page-title" style={{ marginBottom: 6 }}>{data.board.displayName}</h1>

          {/* Board members — at the very top of the page. Where a transcript-analysis
              dataset exists, this renders the sentiment-scored cards (same data
              TranscriptAnalysis surfaces further down); otherwise a plain DB roster. */}
          {analysis && analysis.members.some((mem) => mem.totalPositions > 0) ? (
            <BoardMemberCards data={analysis} muni={muni} body={body} />
          ) : transcriptDates.size === 0 && data.members.length > 0 && (
            <>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', margin: '0 0 12px' }}>
                <h2 style={{ fontSize: 16, margin: 0 }}>
                  Board members
                  <span className="muted" style={{ fontSize: 13, fontWeight: 400 }}> · {data.members.length}</span>
                </h2>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button onClick={() => scrollMembersByCard(-1)} aria-label="Previous" className="btn secondary" style={{ padding: '4px 10px', fontSize: 14 }}>‹</button>
                  <button onClick={() => scrollMembersByCard(1)} aria-label="Next" className="btn secondary" style={{ padding: '4px 10px', fontSize: 14 }}>›</button>
                </div>
              </div>
              <div
                ref={memberScrollRef}
                style={{
                  display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 6, marginBottom: 26,
                  scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch',
                }}
              >
                {data.members.map((m) => (
                  <a
                    key={m.id}
                    href={`/admin/municipal/member?muni=${data.town.key}&body=${data.board.key}&id=${m.id}`}
                    className="card"
                    data-board-member-card
                    style={{ padding: 14, flex: '0 0 210px', minWidth: 0, textDecoration: 'none', display: 'block', scrollSnapAlign: 'start' }}
                  >
                    <div style={{ fontWeight: 700 }}>{m.full_name}</div>
                    <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{m.title || '—'}</div>
                    <span className="badge state" style={{ display: 'inline-block', marginTop: 10 }}>{m.kind.replace(/_/g, ' ')}</span>
                    {m.email && (
                      <div className="muted" style={{ fontSize: 12, marginTop: 10, wordBreak: 'break-all' }}>{m.email}</div>
                    )}
                    <div style={{ fontSize: 12, marginTop: 10, color: 'var(--primary-light)' }}>View profile →</div>
                  </a>
                ))}
              </div>
            </>
          )}

          {/* Parks & Rec runs facilities, not public deliberative meetings the way
              the boards do — its page gets a map of parks instead of the
              case/agenda-item map + Meetings section every other board shows. */}
          {body === 'parks_rec' ? (
            <ParksMap muni={muni} />
          ) : (
            <>
              {/* Case/agenda-item map, at the top — Meetings sits directly below it. */}
              <BoardCaseMap dataset={analysis} muni={muni} />

              {/* Meetings — one horizontal timeline: history on the left, upcoming on
                  the right, matching the municipal dashboard. Where an analysis
                  dataset exists, the meeting-by-meeting rows attach here in place of
                  the plain list. */}
              <h2 style={{ fontSize: 16, margin: '0 0 12px' }}>Meetings</h2>
              <MeetingTimeline
                items={timelineItems}
                selectedKey={selectedMeetingKey}
                onSelect={setSelectedMeetingKey}
                emptyText="We don't have any meetings on file for this board yet."
              />
              {analysis && analysis.meetings.length > 0 ? (
                <div style={{ margin: '10px 0 26px' }}>
                  <MeetingAnalysisList
                    meetings={analysis.meetings}
                    muni={muni}
                    body={body}
                    selectedKey={selectedMeetingKey}
                    onSelect={setSelectedMeetingKey}
                  />
                </div>
              ) : (
                timelineItems.length > 0 && (
                  <div style={{ margin: '10px 0 26px' }}>
                    <MeetingList items={timelineItems} selectedKey={selectedMeetingKey} onSelect={setSelectedMeetingKey} />
                  </div>
                )
              )}
            </>
          )}
          {/* Transcript analysis (only where a dataset exists, e.g. NC Planning) */}
          <TranscriptAnalysis muni={muni} body={body} onData={setAnalysis} />

          {/* Recurring/all applications (or agenda items) table — after Meetings. */}
          {analysis && <CasesList data={analysis} muni={muni} />}

          {/* Departmental staff cards and key reference documents — at the bottom. */}
          <BoardStaffCards muni={muni} bodyKey={body} />
          <BoardKeyDocs muni={muni} bodyKey={body} />

          {/* Climb-back trail at the end of the board page */}
          {!isOpen && (
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 26 }}>
              <Breadcrumbs items={crumbs} />
            </div>
          )}

          {!data.dbOk && data.dbError && (
            <p className="muted" style={{ fontSize: 11, marginTop: 12 }}>DB: {data.dbError}</p>
          )}
        </>
      )}
    </div>
  )
}
