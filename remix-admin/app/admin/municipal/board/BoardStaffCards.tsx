'use client'

import { useRef } from 'react'
import { Phone, Mail, MapPin } from 'lucide-react'
import { getBoardDepartments } from '@/lib/municipal/departments'

/**
 * Departmental contact cards (the staff behind a board's business) — pulled
 * out of TranscriptAnalysis so they can sit at the very top of the page,
 * above the map and Meetings, on every page that has them. Static lookup
 * (no fetch), so it renders instantly with no loading flicker.
 *
 * Laid out as a horizontal carousel (matching the board-members carousel):
 * cards scroll sideways with snap, and ‹ › step one card at a time.
 */
export default function BoardStaffCards({ muni, bodyKey }: { muni: string; bodyKey: string }) {
  const departments = getBoardDepartments(muni, bodyKey)
  const scrollRef = useRef<HTMLDivElement>(null)

  if (departments.length === 0) return null

  const scrollByCard = (dir: number) => {
    const el = scrollRef.current
    if (!el) return
    const card = el.querySelector('[data-staff-card]') as HTMLElement | null
    const step = card ? card.getBoundingClientRect().width + 12 : el.clientWidth * 0.9
    el.scrollBy({ left: dir * step, behavior: 'smooth' })
  }

  return (
    <div style={{ marginBottom: 24 }}>
      {departments.length > 1 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginBottom: 8 }}>
          <button onClick={() => scrollByCard(-1)} aria-label="Previous" className="btn secondary" style={{ padding: '4px 10px', fontSize: 14 }}>‹</button>
          <button onClick={() => scrollByCard(1)} aria-label="Next" className="btn secondary" style={{ padding: '4px 10px', fontSize: 14 }}>›</button>
        </div>
      )}
      <div
        ref={scrollRef}
        style={{
          display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 6,
          scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch',
        }}
      >
        {departments.map((d) => (
          <div key={d.department} data-staff-card className="card" style={{ padding: 16, flex: '0 0 300px', minWidth: 0, scrollSnapAlign: 'start' }}>
            <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{d.department}</div>
            <div style={{ fontSize: 15, fontWeight: 700, marginTop: 4 }}>{d.person}</div>
            {d.title.trim().toLowerCase() !== d.department.trim().toLowerCase() && (
              <div className="muted" style={{ fontSize: 12.5 }}>{d.title}</div>
            )}
            <div className="muted" style={{ fontSize: 12.5, marginTop: 8, lineHeight: 1.55 }}>{d.blurb}</div>
            <div style={{ fontSize: 12.5, marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: '4px 14px' }}>
              {d.phone && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Phone size={12} aria-hidden /> {d.phone}</span>}
              {d.email && (
                <a href={`mailto:${d.email}`} style={{ color: 'var(--primary-light)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Mail size={12} aria-hidden /> {d.email}
                </a>
              )}
              {d.address && <span className="muted" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><MapPin size={12} aria-hidden /> {d.address}</span>}
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
    </div>
  )
}
