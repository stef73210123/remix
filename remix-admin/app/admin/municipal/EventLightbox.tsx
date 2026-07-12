'use client'

import { useEffect } from 'react'
import { type CommunityEvent, googleCalendarUrl } from '@/lib/municipal/events'
import { useLockBodyScroll } from './useLockBodyScroll'

function fmtDate(iso: string): string {
  const d = new Date(iso + 'T12:00:00Z')
  if (isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
}
function fmtTime(t: string): string {
  const [h, m] = t.split(':').map(Number)
  const d = new Date(2000, 0, 1, h, m)
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: m ? '2-digit' : undefined })
}

/**
 * Event-detail lightbox for the community calendar — same visual/interaction
 * shell as Lightbox.tsx (dark backdrop, rounded panel, ✕/backdrop/Escape to
 * close), but shows the event's own structured info instead of an embedded
 * iframe, with quick actions to the organizer's page and Google Calendar.
 */
export default function EventLightbox({ event, onClose }: { event: CommunityEvent; onClose: () => void }) {
  useLockBodyScroll()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const when = event.endDate && event.endDate !== event.date
    ? `${fmtDate(event.date)} – ${fmtDate(event.endDate)}`
    : fmtDate(event.date)
  const timeRange = event.startTime
    ? `${fmtTime(event.startTime)}${event.endTime ? ` – ${fmtTime(event.endTime)}` : ''}`
    : null

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 4000,
        background: 'rgba(0,0,0,0.66)', backdropFilter: 'blur(3px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3vh 2vw',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(480px, 100%)',
          background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 14,
          boxShadow: '0 24px 80px rgba(0,0,0,0.55)', overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '16px 18px 4px' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 17, lineHeight: 1.3 }}>{event.title}</div>
          </div>
          <button onClick={onClose} aria-label="Close" className="btn secondary" style={{ padding: '4px 10px', fontSize: 14, lineHeight: 1, flexShrink: 0 }}>✕</button>
        </div>
        <div style={{ padding: '10px 18px 18px' }}>
          <div style={{ fontSize: 13.5, marginBottom: 2 }}>{when}{timeRange ? ` · ${timeRange}` : ''}</div>
          <div className="muted" style={{ fontSize: 13 }}>📍 {event.location}</div>
          <div style={{ fontSize: 13.5, lineHeight: 1.55, marginTop: 12 }}>{event.description}</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 18 }}>
            <a href={event.url} target="_blank" rel="noopener noreferrer" className="btn secondary" style={{ padding: '8px 14px', fontSize: 13, textDecoration: 'none' }}>
              See event page ↗
            </a>
            <a href={googleCalendarUrl(event)} target="_blank" rel="noopener noreferrer" className="btn" style={{ padding: '8px 14px', fontSize: 13, textDecoration: 'none' }}>
              Add to Google Calendar ↗
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
