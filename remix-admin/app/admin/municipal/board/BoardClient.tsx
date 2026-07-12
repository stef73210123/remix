'use client'

import { useEffect, useMemo, useState } from 'react'
import MuniHeader from '@/app/admin/municipal/MuniHeader'
import MuniTabs from '@/app/admin/municipal/MuniTabs'
import Breadcrumbs, { type Crumb } from '../Breadcrumbs'
import MeetingTimeline, { type TimelineItem } from '../MeetingTimeline'
import MeetingList from '../MeetingList'
import TranscriptAnalysis from './TranscriptAnalysis'
import BoardCaseMap from './BoardCaseMap'
import BoardStaffCards from './BoardStaffCards'
import MeetingAnalysisList from './MeetingAnalysisList'
import CasesList from './CasesList'
import type { AnalysisDataset } from '@/lib/municipal/analysis'
import { isOpen } from '@/lib/flavor'


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

// Next actual date from a recurring pattern like "2nd & 4th Wednesday 7:30pm".
const WEEKDAYS: Record<string, number> = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 }
const ORDINALS: Record<string, number> = { '1st': 1, '2nd': 2, '3rd': 3, '4th': 4, '5th': 5, last: -1 }
function nthWeekday(year: number, month: number, weekday: number, n: number): Date | null {
  if (n === -1) {
    const last = new Date(year, month + 1, 0)
    return new Date(year, month, last.getDate() - ((last.getDay() - weekday + 7) % 7))
  }
  const first = new Date(year, month, 1)
  const d = new Date(year, month, 1 + ((weekday - first.getDay() + 7) % 7) + (n - 1) * 7)
  return d.getMonth() === month ? d : null
}
function nextMeetingDate(pattern: string | null, from: Date): Date | null {
  if (!pattern) return null
  const p = pattern.toLowerCase()
  const wd = Object.keys(WEEKDAYS).find((w) => p.includes(w))
  if (!wd) return null
  const ords: number[] = []
  for (const [k, v] of Object.entries(ORDINALS)) if (new RegExp(`(^|[^a-z0-9])${k}([^a-z0-9]|$)`).test(p)) ords.push(v)
  if (!ords.length) return null
  const base = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  let best: Date | null = null
  for (let mo = 0; mo <= 3; mo++) {
    const total = base.getMonth() + mo
    const y = base.getFullYear() + Math.floor(total / 12)
    const m = ((total % 12) + 12) % 12
    for (const n of Array.from(new Set(ords))) {
      const d = nthWeekday(y, m, WEEKDAYS[wd], n)
      if (d && d.getTime() >= base.getTime() && (!best || d < best)) best = d
    }
  }
  return best
}

export default function BoardClient({ userName }: { userName: string }) {
  const [muni, setMuni] = useState('')
  const [body, setBody] = useState('')
  const [data, setData] = useState<BoardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [transcriptDates, setTranscriptDates] = useState<Set<string>>(new Set())
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

  const counts = useMemo(() => {
    const t0 = startOfToday()
    const ms = data?.meetings || []
    return {
      past: ms.filter((m) => new Date(m.scheduled_at).getTime() < t0).length,
      upcoming: ms.filter((m) => new Date(m.scheduled_at).getTime() >= t0).length,
    }
  }, [data])
  const projectedNext = useMemo(
    () => (data ? nextMeetingDate(data.board.meetingPattern, new Date(startOfToday())) : null),
    [data]
  )

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
          title: mtg.title,
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
    // If no real upcoming meeting is ingested, project the next one from the schedule.
    if (!items.some((it) => !it.past) && projectedNext) {
      items.push({ key: 'projected', date: projectedNext, dateSuffix: ' *', dateTitle: 'Projected from meeting schedule', past: false, projected: true })
    }
    return items
  }, [data, transcriptDates, projectedNext, muni, body])

  // Breadcrumb trail: Dashboard › Town › Board (current). OpenNorthCastle is a
  // single-jurisdiction site, so the town crumb is implied and skipped there.
  const crumbs = useMemo<Crumb[]>(() => {
    const trail: Crumb[] = [{ label: 'Dashboard', href: isOpen ? '/' : '/admin/municipal' }]
    if (data?.town && !isOpen) trail.push({ label: data.town.name, href: `/admin/municipal?town=${data.town.key}` })
    trail.push({ label: data?.board.displayName || 'Board' })
    return trail
  }, [data])

  return (
    <div className="container">
      <MuniHeader userName={userName} />
      <MuniTabs muni={muni} active={body} />

      {data && !loading && (
        <div style={{ marginBottom: 20 }}>
          <Breadcrumbs items={crumbs} />
        </div>
      )}

      {loading && <div className="muted" style={{ padding: 20 }}>Loading board…</div>}
      {error && <div className="error" style={{ padding: 20 }}>{error}</div>}

      {data && !loading && (
        <>
          <h1 className="page-title" style={{ marginBottom: 4 }}>{data.board.displayName}</h1>
          <div className="muted" style={{ fontSize: 13, marginBottom: 20 }}>
            {data.town.name}{data.town.county ? ` · ${data.town.county} County` : ''}, {data.town.state}
            {data.board.meetingPattern ? ` · ${data.board.meetingPattern}` : ''}
          </div>

          {/* Departmental staff cards — at the very top of the page. */}
          <BoardStaffCards muni={muni} bodyKey={body} />

          {/* Members roster — only for boards WITHOUT a transcript dataset. Where a
              dataset exists, the analysis section below shows members with sentiment,
              so we don't duplicate (or show an empty roster above it). */}
          {transcriptDates.size === 0 && data.members.length > 0 && (
            <>
              <h2 style={{ fontSize: 16, margin: '0 0 12px' }}>
                Board members
                <span className="muted" style={{ fontSize: 13, fontWeight: 400 }}> · {data.members.length}</span>
              </h2>
              <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 6, marginBottom: 26, WebkitOverflowScrolling: 'touch' }}>
                {data.members.map((m) => (
                  <a
                    key={m.id}
                    href={`/admin/municipal/member?muni=${data.town.key}&body=${data.board.key}&id=${m.id}`}
                    className="card"
                    style={{ padding: 14, minWidth: 210, flexShrink: 0, textDecoration: 'none', display: 'block' }}
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

          {/* Case/agenda-item map, at the top — Meetings sits directly below it. */}
          <BoardCaseMap dataset={analysis} muni={muni} />

          {/* Meetings — one horizontal timeline: history on the left, upcoming on
              the right, matching the municipal dashboard. Where an analysis
              dataset exists, the meeting-by-meeting rows attach here in place of
              the plain list. */}
          <h2 style={{ fontSize: 16, margin: '0 0 12px' }}>
            Meetings
            <span className="muted" style={{ fontSize: 13, fontWeight: 400 }}> · {counts.past} past · {counts.upcoming} upcoming{analysis ? ' · click a meeting for its analysis' : ''}</span>
          </h2>
          <MeetingTimeline
            items={timelineItems}
            selectedKey={selectedMeetingKey}
            onSelect={setSelectedMeetingKey}
            emptyText="No meetings ingested for this board yet."
          />
          {analysis && analysis.meetings.length > 0 ? (
            <div style={{ marginTop: 10 }}>
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
              <div style={{ marginTop: 10 }}>
                <MeetingList items={timelineItems} selectedKey={selectedMeetingKey} onSelect={setSelectedMeetingKey} />
              </div>
            )
          )}
          <div className="muted" style={{ fontSize: 11, margin: '10px 0 26px' }}>
            Grey dots are past meetings; coral is the next scheduled meeting; slate (*) is projected from the board&apos;s recurring schedule.
          </div>

          {/* Transcript analysis (only where a dataset exists, e.g. NC Planning) */}
          <TranscriptAnalysis muni={muni} body={body} onData={setAnalysis} />

          {/* Recurring/all applications (or agenda items) table — after Meetings. */}
          {analysis && <CasesList data={analysis} muni={muni} />}

          {/* Climb-back trail at the end of the board page */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 26 }}>
            <Breadcrumbs items={crumbs} />
          </div>

          {!data.dbOk && data.dbError && (
            <p className="muted" style={{ fontSize: 11, marginTop: 12 }}>DB: {data.dbError}</p>
          )}
        </>
      )}
    </div>
  )
}
