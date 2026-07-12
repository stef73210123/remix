'use client'

import { useMemo, useState } from 'react'
import { getCommunityEvents, type CommunityEvent } from '@/lib/municipal/events'
import EventLightbox from './EventLightbox'

const CATEGORY_COLOR: Record<CommunityEvent['category'], string> = {
  festival: '#c76b2a',
  market: '#3f9b6b',
  concert: '#7a5fc9',
  holiday: '#d0473f',
  civic: '#2563d6',
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function startOfDayIso(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/** All calendar dates a (possibly multi-day) event should render a marker on. */
function eventDates(ev: CommunityEvent): string[] {
  if (!ev.endDate || ev.endDate === ev.date) return [ev.date]
  const out: string[] = []
  const cur = new Date(ev.date + 'T00:00:00Z')
  const end = new Date(ev.endDate + 'T00:00:00Z')
  while (cur.getTime() <= end.getTime()) {
    out.push(cur.toISOString().slice(0, 10))
    cur.setUTCDate(cur.getUTCDate() + 1)
  }
  return out
}

/**
 * Month-grid community events calendar — town fairs, concert series and civic
 * celebrations, distinct from the board-meeting Meetings timeline. Clicking an
 * event opens EventLightbox with details plus quick actions (event page /
 * add to Google Calendar).
 */
export default function CommunityCalendar({ muniKey }: { muniKey: string }) {
  const events = useMemo(() => getCommunityEvents(muniKey), [muniKey])

  const today = useMemo(() => new Date(), [])
  const todayIso = useMemo(() => startOfDayIso(today), [today])
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1))
  const [openEvent, setOpenEvent] = useState<CommunityEvent | null>(null)

  const byDate = useMemo(() => {
    const map = new Map<string, CommunityEvent[]>()
    for (const ev of events) {
      for (const d of eventDates(ev)) {
        if (!map.has(d)) map.set(d, [])
        map.get(d)!.push(ev)
      }
    }
    return map
  }, [events])

  if (events.length === 0) return null

  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const firstOfMonth = new Date(year, month, 1)
  const startOffset = firstOfMonth.getDay() // 0 = Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrevMonth = new Date(year, month, 0).getDate()

  const cells: { day: number; iso: string; inMonth: boolean }[] = []
  for (let i = 0; i < startOffset; i++) {
    const day = daysInPrevMonth - startOffset + 1 + i
    const d = new Date(year, month - 1, day)
    cells.push({ day, iso: startOfDayIso(d), inMonth: false })
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month, day)
    cells.push({ day, iso: startOfDayIso(d), inMonth: true })
  }
  while (cells.length % 7 !== 0 || cells.length < 35) {
    const day = cells.length - (startOffset + daysInMonth) + 1
    const d = new Date(year, month + 1, day)
    cells.push({ day, iso: startOfDayIso(d), inMonth: false })
  }

  const monthLabel = firstOfMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  return (
    <div style={{ marginBottom: 30 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', margin: '0 0 12px' }}>
        <h2 style={{ fontSize: 16, margin: 0 }}>
          Community events
          <span className="muted" style={{ fontSize: 13, fontWeight: 400 }}> · town fairs, concerts &amp; civic celebrations</span>
        </h2>
      </div>

      <div className="card" style={{ padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <button
            onClick={() => setCursor(new Date(year, month - 1, 1))}
            className="btn secondary"
            aria-label="Previous month"
            style={{ padding: '5px 11px', fontSize: 14 }}
          >
            ‹
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontWeight: 700, fontSize: 14.5 }}>{monthLabel}</span>
            {(year !== today.getFullYear() || month !== today.getMonth()) && (
              <button
                onClick={() => setCursor(new Date(today.getFullYear(), today.getMonth(), 1))}
                className="btn secondary"
                style={{ padding: '3px 9px', fontSize: 11 }}
              >
                Today
              </button>
            )}
          </div>
          <button
            onClick={() => setCursor(new Date(year, month + 1, 1))}
            className="btn secondary"
            aria-label="Next month"
            style={{ padding: '5px 11px', fontSize: 14 }}
          >
            ›
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
          {WEEKDAYS.map((w) => (
            <div key={w} className="muted" style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'center', padding: '2px 0 6px' }}>
              {w}
            </div>
          ))}
          {cells.map((cell, i) => {
            const dayEvents = byDate.get(cell.iso) ?? []
            const isToday = cell.iso === todayIso
            const shown = dayEvents.slice(0, 2)
            const overflow = dayEvents.length - shown.length
            return (
              <div
                key={i}
                style={{
                  minHeight: 62, minWidth: 0, borderRadius: 8, padding: '4px 4px 5px', overflow: 'hidden',
                  background: isToday ? 'color-mix(in srgb, var(--primary) 10%, transparent)' : undefined,
                  boxShadow: isToday ? 'inset 0 0 0 1.5px var(--primary)' : 'inset 0 0 0 1px var(--border)',
                  opacity: cell.inMonth ? 1 : 0.4,
                }}
              >
                <div style={{ fontSize: 11, fontWeight: isToday ? 700 : 500, marginBottom: 3, textAlign: 'right', paddingRight: 2 }}>
                  {cell.day}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {shown.map((ev, j) => (
                    <button
                      key={`${ev.key}-${j}`}
                      onClick={() => setOpenEvent(ev)}
                      title={ev.title}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 4, width: '100%', minWidth: 0, textAlign: 'left',
                        background: 'none', border: 'none', padding: '1px 2px', cursor: 'pointer', borderRadius: 4,
                        font: 'inherit', color: 'inherit',
                      }}
                    >
                      <span style={{ width: 6, height: 6, borderRadius: 999, background: CATEGORY_COLOR[ev.category], flexShrink: 0 }} />
                      <span style={{ fontSize: 9.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.3, minWidth: 0, flex: 1 }}>{ev.title}</span>
                    </button>
                  ))}
                  {overflow > 0 && (
                    <div className="muted" style={{ fontSize: 9.5, paddingLeft: 8 }}>+{overflow} more</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <div style={{ display: 'flex', gap: '4px 14px', flexWrap: 'wrap', marginTop: 14 }}>
          {(Object.keys(CATEGORY_COLOR) as CommunityEvent['category'][]).map((c) => (
            <span key={c} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11 }}>
              <span style={{ width: 8, height: 8, borderRadius: 999, background: CATEGORY_COLOR[c], flexShrink: 0 }} />
              <span className="muted" style={{ textTransform: 'capitalize' }}>{c}</span>
            </span>
          ))}
        </div>
      </div>

      {openEvent && <EventLightbox event={openEvent} onClose={() => setOpenEvent(null)} />}
    </div>
  )
}
