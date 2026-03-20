'use client'

import { useRef, useEffect } from 'react'
import type { MilestoneStatus, TimelineMilestone } from '@/types'

const STATUS_DOT: Record<MilestoneStatus, string> = {
  upcoming: '#94a3b8',
  'in-progress': '#3b82f6',
  complete: '#22c55e',
  delayed: '#ef4444',
}

const PX_PER_MONTH = 68
const ROW_H = 32
const HEADER_H = 26
const LABEL_W = 180

function monthsFrom(start: Date, target: Date): number {
  return (target.getFullYear() - start.getFullYear()) * 12 +
    (target.getMonth() - start.getMonth())
}

/** X position for a date: fractional month from start */
function dateToX(date: Date, start: Date): number {
  const year = date.getFullYear()
  const month = date.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const fraction = (date.getDate() - 1) / daysInMonth
  return (monthsFrom(start, new Date(year, month, 1)) + fraction) * PX_PER_MONTH
}

export type GanttMilestone = TimelineMilestone & { _rowIndex?: number }

export function TimelineGantt({ milestones }: { milestones: GanttMilestone[] }) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!scrollRef.current || milestones.length === 0) return
    const allDates = collectDates(milestones)
    const startDate = computeStartDate(allDates)
    const todayX = dateToX(new Date(), startDate)
    const viewW = scrollRef.current.clientWidth
    scrollRef.current.scrollLeft = todayX - viewW / 2
  }, [milestones])

  if (milestones.length === 0) return null

  const allDates = collectDates(milestones)
  const startDate = computeStartDate(allDates)
  const endDate = computeEndDate(allDates)
  const totalMonths = monthsFrom(startDate, endDate)
  const chartW = totalMonths * PX_PER_MONTH
  const svgH = HEADER_H + milestones.length * ROW_H

  // Month grid
  const months: { label: string; x: number }[] = []
  const cur = new Date(startDate)
  while (cur < endDate) {
    months.push({
      label: cur.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      x: monthsFrom(startDate, cur) * PX_PER_MONTH,
    })
    cur.setMonth(cur.getMonth() + 1)
  }

  const todayX = dateToX(new Date(), startDate)

  return (
    <div className="flex rounded-xl border overflow-hidden bg-background">
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
          {/* Month grid */}
          {months.map((mon, i) => (
            <g key={i}>
              <line x1={mon.x} y1={0} x2={mon.x} y2={svgH} stroke="#e2e8f0" strokeWidth={1} />
              <text x={mon.x + 4} y={HEADER_H - 6} fontSize={9} fill="#94a3b8" fontFamily="inherit">
                {mon.label}
              </text>
            </g>
          ))}

          {/* Header separator */}
          <line x1={0} y1={HEADER_H} x2={chartW} y2={HEADER_H} stroke="#e2e8f0" strokeWidth={1} />

          {/* Today line */}
          <line
            x1={todayX} y1={HEADER_H}
            x2={todayX} y2={svgH}
            stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="3 2"
          />
          <text x={todayX + 2} y={HEADER_H - 2} fontSize={8} fill="#f59e0b" fontFamily="inherit">Today</text>

          {/* Milestone rows */}
          {milestones.map((m, i) => {
            const y = HEADER_H + i * ROW_H + ROW_H / 2
            const color = STATUS_DOT[m.status]
            const px = m.planned_date ? dateToX(new Date(m.planned_date), startDate) : null
            const ax = m.actual_date ? dateToX(new Date(m.actual_date), startDate) : null

            return (
              <g key={m._rowIndex ?? i}>
                {i % 2 !== 0 && (
                  <rect x={0} y={HEADER_H + i * ROW_H} width={chartW} height={ROW_H} fill="#f8fafc" />
                )}
                {/* Connector line */}
                {px !== null && ax !== null && (
                  <line x1={px} y1={y} x2={ax} y2={y} stroke={color} strokeWidth={1.5} strokeOpacity={0.3} />
                )}
                {/* Planned circle */}
                {px !== null && <circle cx={px} cy={y} r={6} fill={color} />}
                {/* Actual diamond */}
                {ax !== null && (
                  <polygon
                    points={`${ax},${y - 6} ${ax + 6},${y} ${ax},${y + 6} ${ax - 6},${y}`}
                    fill={color} stroke="white" strokeWidth={1.5}
                  />
                )}
              </g>
            )
          })}
        </svg>

        {/* Legend */}
        <div className="flex items-center gap-4 px-3 py-1.5 border-t text-xs text-muted-foreground bg-muted/20">
          <span className="flex items-center gap-1">
            <svg width="12" height="12"><circle cx="6" cy="6" r="5" fill="#94a3b8" /></svg> Planned
          </span>
          <span className="flex items-center gap-1">
            <svg width="12" height="12">
              <polygon points="6,0 12,6 6,12 0,6" fill="#94a3b8" stroke="white" strokeWidth="1" />
            </svg> Actual
          </span>
          {(['upcoming', 'in-progress', 'complete', 'delayed'] as MilestoneStatus[]).map((s) => (
            <span key={s} className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full inline-block" style={{ backgroundColor: STATUS_DOT[s] }} />
              {s}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function collectDates(milestones: GanttMilestone[]): Date[] {
  const dates: Date[] = [new Date()]
  for (const m of milestones) {
    if (m.planned_date) dates.push(new Date(m.planned_date))
    if (m.actual_date) dates.push(new Date(m.actual_date))
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
