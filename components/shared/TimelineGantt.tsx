'use client'

import { useRef, useEffect, useState } from 'react'
import type { MilestoneStatus, TimelineMilestone } from '@/types'
import type { Announcement } from '@/lib/sheets/announcements'
import type { Note } from '@/lib/sheets/notes'

const STATUS_DOT: Record<MilestoneStatus, string> = {
  upcoming: '#94a3b8',
  'in-progress': '#3b82f6',
  complete: '#22c55e',
  delayed: '#ef4444',
}

const ANNOUNCEMENT_COLOR = '#8b5cf6'
const NOTE_COLOR = '#0ea5e9'

const ROW_H = 36
const HEADER_H = 26
const LABEL_W = 200
const BAR_H = 10
const BAR_R = 3

type ShowMode = 'planned' | 'both' | 'actual'
type ZoomLevel = 'week' | 'month' | 'quarter' | 'year'

// Pixels per month at each zoom level
const ZOOM_PX: Record<ZoomLevel, number> = {
  week:  130,
  month: 68,
  quarter: 20,
  year:  8,
}

function monthsFrom(start: Date, target: Date): number {
  return (target.getFullYear() - start.getFullYear()) * 12 +
    (target.getMonth() - start.getMonth())
}

function dateToX(date: Date, start: Date, pxPerMonth: number): number {
  const year = date.getFullYear()
  const month = date.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const fraction = (date.getDate() - 1) / daysInMonth
  return (monthsFrom(start, new Date(year, month, 1)) + fraction) * pxPerMonth
}

function weeksApart(a: Date, b: Date): number {
  return Math.round(Math.abs(b.getTime() - a.getTime()) / (7 * 86_400_000))
}

export type GanttMilestone = TimelineMilestone & { _rowIndex?: number }

type TooltipItem =
  | { kind: 'announcement'; item: Announcement }
  | { kind: 'note'; item: Note }

export function TimelineGantt({
  milestones,
  announcements = [],
  notes = [],
  staticView = false,
}: {
  milestones: GanttMilestone[]
  announcements?: Announcement[]
  notes?: Note[]
  staticView?: boolean
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [showAnnouncements, setShowAnnouncements] = useState(true)
  const [showNotes, setShowNotes] = useState(true)
  const [showMode, setShowMode] = useState<ShowMode>('planned')
  const [zoom, setZoom] = useState<ZoomLevel>('quarter')
  const [tooltip, setTooltip] = useState<TooltipItem | null>(null)

  const effectiveZoom: ZoomLevel = staticView ? 'quarter' : zoom
  const effectiveShowMode: ShowMode = staticView ? 'planned' : showMode

  const pxPerMonth = ZOOM_PX[effectiveZoom]

  const scrollToToday = () => {
    if (!scrollRef.current || milestones.length === 0) return
    const allDates = collectDates(milestones, announcements, notes)
    const startDate = computeStartDate(allDates)
    const todayX = dateToX(new Date(), startDate, pxPerMonth)
    const viewW = scrollRef.current.clientWidth
    scrollRef.current.scrollLeft = todayX - viewW / 2
  }

  useEffect(() => {
    scrollToToday()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [milestones, announcements, notes, effectiveZoom])

  if (milestones.length === 0) return null

  const allDates = collectDates(milestones, announcements, notes)
  const startDate = computeStartDate(allDates)
  const endDate = computeEndDate(allDates)
  const totalMonths = monthsFrom(startDate, endDate)
  const chartW = totalMonths * pxPerMonth
  const svgH = HEADER_H + milestones.length * ROW_H

  // Build grid ticks based on zoom level
  const gridTicks: { label: string; x: number }[] = []
  if (effectiveZoom === 'year') {
    // One tick per year
    const cur = new Date(startDate.getFullYear(), 0, 1)
    while (cur < endDate) {
      gridTicks.push({
        label: String(cur.getFullYear()),
        x: dateToX(cur, startDate, pxPerMonth),
      })
      cur.setFullYear(cur.getFullYear() + 1)
    }
  } else if (effectiveZoom === 'quarter') {
    // One tick per quarter (Jan, Apr, Jul, Oct)
    const cur = new Date(startDate.getFullYear(), Math.floor(startDate.getMonth() / 3) * 3, 1)
    while (cur < endDate) {
      const q = Math.floor(cur.getMonth() / 3) + 1
      gridTicks.push({
        label: `Q${q} '${String(cur.getFullYear()).slice(2)}`,
        x: dateToX(cur, startDate, pxPerMonth),
      })
      cur.setMonth(cur.getMonth() + 3)
    }
  } else if (effectiveZoom === 'month') {
    // One tick per month (original behaviour)
    const cur = new Date(startDate)
    while (cur < endDate) {
      gridTicks.push({
        label: cur.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        x: monthsFrom(startDate, cur) * pxPerMonth,
      })
      cur.setMonth(cur.getMonth() + 1)
    }
  } else if (effectiveZoom === 'week') {
    // One tick per week — start on nearest Monday from startDate
    const cur = new Date(startDate)
    cur.setDate(cur.getDate() - cur.getDay() + 1) // Monday
    let i = 0
    while (cur < endDate) {
      const isMonthStart = cur.getDate() <= 7
      gridTicks.push({
        label: isMonthStart
          ? cur.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
          : `W${Math.ceil(cur.getDate() / 7)}`,
        x: dateToX(cur, startDate, pxPerMonth),
      })
      cur.setDate(cur.getDate() + 7)
      i++
      if (i > 500) break // safety
    }
  }

  const todayX = dateToX(new Date(), startDate, pxPerMonth)
  const validAnnouncements = (Array.isArray(announcements) ? announcements : []).filter((a) => a.posted_at && !isNaN(new Date(a.posted_at).getTime()))
  const validNotes = (Array.isArray(notes) ? notes : []).filter((n) => n.posted_at && !isNaN(new Date(n.posted_at).getTime()))

  return (
    <div className="flex flex-col rounded-xl border bg-background">
      {/* Chart row: frozen label + scrollable SVG */}
      <div className="flex overflow-hidden rounded-t-xl">
        {/* Frozen label column */}
        <div className="shrink-0 border-r bg-background" style={{ width: LABEL_W }}>
          <div style={{ height: HEADER_H }} className="border-b bg-muted/50" />
          {milestones.map((m, i) => (
            <div
              key={m._rowIndex ?? i}
              title={m.milestone}
              className={`px-3 flex items-center text-xs font-medium truncate ${i % 2 !== 0 ? 'bg-muted/30' : ''}`}
              style={{ height: ROW_H }}
            >
              <span
                className="mr-1.5 h-2 w-2 shrink-0 rounded-full inline-block"
                style={{ backgroundColor: STATUS_DOT[m.status] }}
              />
              {m.milestone}
            </div>
          ))}
        </div>

        {/* Scrollable chart */}
        <div ref={scrollRef} className="overflow-x-auto flex-1">
          <svg
          width={chartW}
          height={svgH}
          style={{ display: 'block', minWidth: chartW }}
          aria-label="Project timeline chart"
        >
          {/* Time grid */}
          {gridTicks.map((tick, i) => (
            <g key={i}>
              <line x1={tick.x} y1={0} x2={tick.x} y2={svgH} stroke="#e2e8f0" strokeWidth={1} />
              {tick.label ? (
                <text x={tick.x + 2} y={HEADER_H - 6} fontSize={9} fill="#94a3b8" fontFamily="inherit">
                  {tick.label}
                </text>
              ) : null}
            </g>
          ))}

          {/* Header separator */}
          <line x1={0} y1={HEADER_H} x2={chartW} y2={HEADER_H} stroke="#e2e8f0" strokeWidth={1} />

          {/* Today line */}
          <line x1={todayX} y1={HEADER_H} x2={todayX} y2={svgH} stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="3 2" />
          <text x={todayX + 2} y={HEADER_H - 2} fontSize={8} fill="#f59e0b" fontFamily="inherit">Today</text>

          {/* Announcement flags */}
          {showAnnouncements && validAnnouncements.map((ann, i) => {
            const ax = dateToX(new Date(ann.posted_at), startDate, pxPerMonth)
            const isActive = tooltip?.kind === 'announcement' && (tooltip.item.id === ann.id || tooltip.item.posted_at === ann.posted_at)
            return (
              <g
                key={ann.id || i}
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setTooltip({ kind: 'announcement', item: ann })}
                onMouseLeave={() => setTooltip(null)}
                onClick={() => setTooltip(isActive ? null : { kind: 'announcement', item: ann })}
              >
                <line x1={ax} y1={0} x2={ax} y2={svgH} stroke={ANNOUNCEMENT_COLOR} strokeWidth={1.5} strokeDasharray="2 3" strokeOpacity={0.55} />
                <circle cx={ax} cy={HEADER_H / 2} r={5} fill={ANNOUNCEMENT_COLOR} opacity={0.9} />
                <polygon
                  points={`${ax + 5},${HEADER_H / 2 - 4} ${ax + 11},${HEADER_H / 2 - 1} ${ax + 5},${HEADER_H / 2 + 2}`}
                  fill={ANNOUNCEMENT_COLOR} opacity={0.85}
                />
              </g>
            )
          })}

          {/* Note flags */}
          {showNotes && validNotes.map((note, i) => {
            const nx = dateToX(new Date(note.posted_at), startDate, pxPerMonth)
            const isActive = tooltip?.kind === 'note' && tooltip.item.id === note.id
            return (
              <g
                key={note.id || i}
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setTooltip({ kind: 'note', item: note })}
                onMouseLeave={() => setTooltip(null)}
                onClick={() => setTooltip(isActive ? null : { kind: 'note', item: note })}
              >
                <line x1={nx} y1={0} x2={nx} y2={svgH} stroke={NOTE_COLOR} strokeWidth={1.5} strokeDasharray="2 3" strokeOpacity={0.5} />
                {/* Diamond marker */}
                <polygon
                  points={`${nx},${HEADER_H / 2 - 5} ${nx + 5},${HEADER_H / 2} ${nx},${HEADER_H / 2 + 5} ${nx - 5},${HEADER_H / 2}`}
                  fill={NOTE_COLOR} opacity={0.9}
                />
              </g>
            )
          })}

          {/* Milestone rows */}
          {milestones.map((m, i) => {
            const rowY = HEADER_H + i * ROW_H
            const cy = rowY + ROW_H / 2
            const color = STATUS_DOT[m.status]

            const px = m.planned_date ? dateToX(new Date(m.planned_date), startDate, pxPerMonth) : null
            const pex = m.planned_end_date ? dateToX(new Date(m.planned_end_date), startDate, pxPerMonth) : null
            const ax = m.actual_date ? dateToX(new Date(m.actual_date), startDate, pxPerMonth) : null
            const aex = m.actual_end_date ? dateToX(new Date(m.actual_end_date), startDate, pxPerMonth) : null

            // Duration labels (weeks)
            const plannedWeeks = (px !== null && pex !== null)
              ? weeksApart(new Date(m.planned_date!), new Date(m.planned_end_date!))
              : null
            const actualWeeks = (ax !== null && aex !== null)
              ? weeksApart(new Date(m.actual_date!), new Date(m.actual_end_date!))
              : null

            const showPlanned = effectiveShowMode === 'planned' || effectiveShowMode === 'both'
            const showActual = effectiveShowMode === 'actual' || effectiveShowMode === 'both'

            // Vertical positioning for bars when showing both
            // Planned bar: upper band; Actual bar: lower band
            const plannedBarY = effectiveShowMode === 'both' ? cy - BAR_H - 1 : cy - BAR_H / 2
            const actualBarY  = effectiveShowMode === 'both' ? cy + 1            : cy - BAR_H / 2

            return (
              <g key={m._rowIndex ?? i}>
                {i % 2 !== 0 && (
                  <rect x={0} y={rowY} width={chartW} height={ROW_H} fill="#f8fafc" />
                )}

                {/* ── Planned ── */}
                {showPlanned && px !== null && (
                  pex !== null ? (
                    // Planned range bar
                    <g>
                      <rect
                        x={px} y={plannedBarY}
                        width={Math.max(pex - px, 4)} height={BAR_H}
                        rx={BAR_R} fill={color} opacity={showMode === 'both' ? 0.35 : 0.6}
                      >
                        <title>{`Planned: ${m.planned_date} – ${m.planned_end_date}${plannedWeeks !== null ? ` (${plannedWeeks}w)` : ''}`}</title>
                      </rect>
                      {/* Start/end tick marks */}
                      <line x1={px} y1={plannedBarY - 2} x2={px} y2={plannedBarY + BAR_H + 2} stroke={color} strokeWidth={1.5} opacity={0.7} />
                      <line x1={pex} y1={plannedBarY - 2} x2={pex} y2={plannedBarY + BAR_H + 2} stroke={color} strokeWidth={1.5} opacity={0.7} />
                      {/* Duration label */}
                      {plannedWeeks !== null && pex - px > 28 && (
                        <text x={(px + pex) / 2} y={plannedBarY + BAR_H - 1} fontSize={8} fill="white" textAnchor="middle" fontFamily="inherit">
                          {plannedWeeks}w
                        </text>
                      )}
                    </g>
                  ) : (
                    // Planned point
                    <circle cx={px} cy={cy} r={6} fill={color}>
                      <title>{`Planned: ${m.planned_date}`}</title>
                    </circle>
                  )
                )}

                {/* ── Actual ── */}
                {showActual && ax !== null && (
                  aex !== null ? (
                    // Actual range bar
                    <g>
                      <rect
                        x={ax} y={actualBarY}
                        width={Math.max(aex - ax, 4)} height={BAR_H}
                        rx={BAR_R} fill={color} opacity={0.9}
                        stroke="white" strokeWidth={0.5}
                      >
                        <title>{`Actual: ${m.actual_date} – ${m.actual_end_date}${actualWeeks !== null ? ` (${actualWeeks}w)` : ''}`}</title>
                      </rect>
                      <line x1={ax} y1={actualBarY - 2} x2={ax} y2={actualBarY + BAR_H + 2} stroke={color} strokeWidth={1.5} />
                      <line x1={aex} y1={actualBarY - 2} x2={aex} y2={actualBarY + BAR_H + 2} stroke={color} strokeWidth={1.5} />
                      {actualWeeks !== null && aex - ax > 28 && (
                        <text x={(ax + aex) / 2} y={actualBarY + BAR_H - 1} fontSize={8} fill="white" textAnchor="middle" fontFamily="inherit">
                          {actualWeeks}w
                        </text>
                      )}
                    </g>
                  ) : (
                    // Actual point (diamond)
                    <polygon
                      points={`${ax},${cy - 6} ${ax + 6},${cy} ${ax},${cy + 6} ${ax - 6},${cy}`}
                      fill={color} stroke="white" strokeWidth={1.5}
                    >
                      <title>{`Actual: ${m.actual_date}`}</title>
                    </polygon>
                  )
                )}

                {/* Connector line between planned and actual points (only in both mode, only for points) */}
                {effectiveShowMode === 'both' && px !== null && pex === null && ax !== null && aex === null && (
                  <line x1={px} y1={cy} x2={ax} y2={cy} stroke={color} strokeWidth={1.5} strokeOpacity={0.3} />
                )}
              </g>
            )
          })}

          {/* Tooltip — rendered last so it paints on top of everything */}
          {tooltip && (() => {
            const { kind, item } = tooltip
            const dateStr = item.posted_at
            const tx = dateToX(new Date(dateStr), startDate, pxPerMonth)
            const tooltipW = 260
            const tooltipX = tx + tooltipW + 20 > chartW ? tx - tooltipW - 4 : tx + 14
            const color = kind === 'announcement' ? ANNOUNCEMENT_COLOR : NOTE_COLOR
            const label = kind === 'announcement' ? 'Announcement' : `Note${item.ref_label ? ` · ${item.ref_label}` : ''}`
            return (
              <foreignObject x={tooltipX} y={HEADER_H + 4} width={tooltipW} height={220} style={{ overflow: 'visible', pointerEvents: 'none' }}>
                <div style={{
                  background: 'var(--background, #fff)',
                  border: '1px solid var(--border, #e2e8f0)',
                  borderRadius: 10,
                  padding: '10px 12px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
                  fontSize: 12,
                  lineHeight: 1.5,
                  maxWidth: tooltipW,
                  pointerEvents: 'none',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
                    <span style={{ color: '#94a3b8', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
                    {dateStr && (
                      <span style={{ color: '#94a3b8', fontSize: 10, marginLeft: 'auto' }}>
                        {new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    )}
                  </div>
                  <div style={{ fontWeight: 600, marginBottom: item.body ? 6 : 0 }}>{item.title}</div>
                  {item.body && <div style={{ color: '#64748b', whiteSpace: 'pre-line' }}>{item.body}</div>}
                </div>
              </foreignObject>
            )
          })()}
        </svg>
        </div>
      </div>

      {/* Sticky legend/controls — outside scroll area */}
      {!staticView && (
      <div className="sticky bottom-0 flex items-center gap-4 px-3 py-1.5 border-t text-xs text-muted-foreground bg-background/95 backdrop-blur flex-wrap rounded-b-xl">
        {/* Zoom control */}
        <div className="flex items-center gap-1">
          <span className="text-muted-foreground/60 mr-0.5">Zoom:</span>
          {(['week', 'month', 'quarter', 'year'] as ZoomLevel[]).map((z) => (
            <button
              key={z}
              onClick={() => setZoom(z)}
              className={`px-2 py-0.5 rounded border text-xs transition-colors capitalize ${
                zoom === z ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:border-primary/50'
              }`}
            >
              {z}
            </button>
          ))}
        </div>

        <span className="text-muted-foreground/40">|</span>

        {/* Show mode toggle */}
        <div className="flex items-center gap-1">
          {(['planned', 'both', 'actual'] as ShowMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setShowMode(m)}
              className={`px-2 py-0.5 rounded border text-xs transition-colors capitalize ${
                showMode === m ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:border-primary/50'
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        <span className="text-muted-foreground/40">|</span>

        {/* Markers legend */}
        <span className="flex items-center gap-1">
          <svg width="12" height="12"><circle cx="6" cy="6" r="5" fill="#94a3b8" /></svg> Planned pt
        </span>
        <span className="flex items-center gap-1">
          <svg width="20" height="12"><rect x="0" y="2" width="20" height="8" rx="2" fill="#94a3b8" opacity="0.5" /></svg> Planned range
        </span>
        <span className="flex items-center gap-1">
          <svg width="12" height="12">
            <polygon points="6,0 12,6 6,12 0,6" fill="#94a3b8" stroke="white" strokeWidth="1" />
          </svg> Actual pt
        </span>
        <span className="flex items-center gap-1">
          <svg width="20" height="12"><rect x="0" y="2" width="20" height="8" rx="2" fill="#94a3b8" /></svg> Actual range
        </span>

        <span className="text-muted-foreground/40">|</span>

        {/* Status colors */}
        {(['upcoming', 'in-progress', 'complete', 'delayed'] as MilestoneStatus[]).map((s) => (
          <span key={s} className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full inline-block" style={{ backgroundColor: STATUS_DOT[s] }} />
            {s}
          </span>
        ))}

        {/* Marker toggles */}
        {(validAnnouncements.length > 0 || validNotes.length > 0) && (
          <div className="flex items-center gap-3 ml-auto">
            {validAnnouncements.length > 0 && (
              <button
                onClick={() => setShowAnnouncements((v) => !v)}
                className={`flex items-center gap-1 transition-opacity select-none cursor-pointer ${showAnnouncements ? '' : 'opacity-40'}`}
              >
                <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: ANNOUNCEMENT_COLOR }} />
                Announcements
              </button>
            )}
            {validNotes.length > 0 && (
              <button
                onClick={() => setShowNotes((v) => !v)}
                className={`flex items-center gap-1 transition-opacity select-none cursor-pointer ${showNotes ? '' : 'opacity-40'}`}
              >
                <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: NOTE_COLOR }} />
                Notes
              </button>
            )}
          </div>
        )}
      </div>
      )}

    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function collectDates(milestones: GanttMilestone[], announcements: Announcement[] = [], notes: Note[] = []): Date[] {
  const dates: Date[] = [new Date()]
  for (const m of milestones) {
    if (m.planned_date) dates.push(new Date(m.planned_date))
    if (m.planned_end_date) dates.push(new Date(m.planned_end_date))
    if (m.actual_date) dates.push(new Date(m.actual_date))
    if (m.actual_end_date) dates.push(new Date(m.actual_end_date))
  }
  for (const a of (Array.isArray(announcements) ? announcements : [])) {
    if (a.posted_at) {
      const d = new Date(a.posted_at)
      if (!isNaN(d.getTime())) dates.push(d)
    }
  }
  for (const n of (Array.isArray(notes) ? notes : [])) {
    if (n.posted_at) {
      const d = new Date(n.posted_at)
      if (!isNaN(d.getTime())) dates.push(d)
    }
  }
  return dates
}

function computeStartDate(dates: Date[]): Date {
  const min = new Date(Math.min(...dates.map((d) => d.getTime())))
  return new Date(min.getFullYear(), min.getMonth() - 2, 1)
}

function computeEndDate(dates: Date[]): Date {
  const max = new Date(Math.max(...dates.map((d) => d.getTime())))
  return new Date(max.getFullYear(), max.getMonth() + 4, 1)
}
