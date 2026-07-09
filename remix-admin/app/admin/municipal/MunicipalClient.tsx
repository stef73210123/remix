'use client'

import { useEffect, useMemo, useState } from 'react'
import type { TownBudget } from '@/lib/municipal/budget'
import BudgetPanel from './budget/BudgetPanel'
import Demographics from './Demographics'
import TranscriptAnalysis from './board/TranscriptAnalysis'
import MeetingTimeline, { type TimelineItem } from './MeetingTimeline'
import AdminNav from '@/app/admin/AdminNav'

const WORDMARK = 'https://remix-admin-omega.vercel.app/remix-wordmark.png'

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

  const allBoards = useMemo(() => {
    if (!data) return [] as string[]
    const seen = new Set<string>()
    const out: string[] = []
    for (const m of data.municipalities)
      for (const b of m.bodies)
        if (!seen.has(b.displayName)) { seen.add(b.displayName); out.push(b.displayName) }
    return out
  }, [data])

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
    const up: TimelineItem[] = upcomingRows.map((r, i) => ({
      key: `u_${i}_${r.bodyKey}`,
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
  }, [history, upcomingRows])

  const totalBodies = useMemo(
    () => (data ? data.municipalities.reduce((n, m) => n + m.bodies.length, 0) : 0),
    [data]
  )

  // Towns that have budget data — the choices for the "All towns" toggle.
  const budgetTownList = useMemo(
    () => (data ? data.municipalities.filter((m) => budgets[m.key]) : []),
    [data, budgets]
  )

  return (
    <div className="container">
      <header
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}
      >
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={WORDMARK} alt="Remix Properties" style={{ height: 34, display: 'block' }} />
          <div className="muted" style={{ fontSize: 13, marginTop: 6 }}>Municipal · Signed in as {userName}</div>
        </div>
        <AdminNav />
      </header>

      <h1 className="page-title">Municipal Dashboard</h1>

      <div className="muted" style={{ fontSize: 13, marginBottom: 16 }}>
        {data
          ? `${data.municipalities.length} ${data.municipalities.length === 1 ? 'town' : 'towns'} · ${totalBodies} boards tracked` +
            (data.dbOk
              ? ` · ${data.meetings.length} meeting${data.meetings.length === 1 ? '' : 's'} in history`
              : ' · pipeline DB not connected — showing configured towns only')
          : 'Municipal meetings, agendas & minutes across tracked towns.'}
      </div>

      {loading && <div className="muted" style={{ padding: 20 }}>Loading municipal pipeline…</div>}
      {error && <div className="error" style={{ padding: 20 }}>{error}</div>}

      {data && !loading && (
        <>
          <div className="pill-strip" style={{ display: 'flex', gap: 6, flexWrap: 'nowrap', marginBottom: 8 }}>
            {data.municipalities.map((m) => (
              <Chip key={m.key} active={town === m.key} onClick={() => setTown(m.key)}>{m.name}</Chip>
            ))}
          </div>
          <div className="pill-strip" style={{ display: 'flex', gap: 6, flexWrap: 'nowrap', marginBottom: 22 }}>
            <Chip active={board === 'ALL'} onClick={() => setBoard('ALL')}>Dashboard</Chip>
            {allBoards.map((b) => (
              <Chip key={b} active={board === b} onClick={() => setBoard(b)}>{b}</Chip>
            ))}
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

          {/* Demographics — Dashboard tab only, for the selected town. */}
          {board === 'ALL' && town !== 'ALL' && <Demographics muniKey={town} />}

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

          {/* Meetings — one horizontal timeline: history on the left, the next
              meeting per board on the right, with a "Now" divider between. */}
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', margin: '0 0 12px' }}>
            <h2 style={{ fontSize: 16, margin: 0 }}>
              Meetings
              <span className="muted" style={{ fontSize: 13, fontWeight: 400 }}> · {history.length} past · {upcomingRows.length} upcoming</span>
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
          <div className="muted" style={{ fontSize: 11, marginBottom: 26 }}>
            Grey dots are past meetings; coral is the next scheduled meeting per board; slate (*) is projected from the board&apos;s recurring schedule.
          </div>

          {!data.dbOk && data.dbError && (
            <p className="muted" style={{ fontSize: 11, marginTop: 12 }}>DB: {data.dbError}</p>
          )}
        </>
      )}
    </div>
  )
}
