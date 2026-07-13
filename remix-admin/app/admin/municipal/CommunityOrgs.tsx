'use client'

import { useRef } from 'react'
import { Phone, Mail, MapPin } from 'lucide-react'
import { getCommunityOrgs } from '@/lib/municipal/orgs'

/**
 * Local community organizations — the civic/cultural groups behind the
 * events in the calendar above, with a point of contact for each. Static
 * lookup (no fetch), renders instantly. Returns null for towns with none
 * configured. Horizontally scrollable (scroll-snap + arrow buttons), same
 * pattern as KeyIssues, since the town can have more organizations than
 * comfortably fit in a row.
 */
export default function CommunityOrgs({ muniKey }: { muniKey: string }) {
  const orgs = getCommunityOrgs(muniKey)
  const scrollRef = useRef<HTMLDivElement>(null)
  if (orgs.length === 0) return null

  const scrollByCard = (dir: 1 | -1) => {
    const el = scrollRef.current
    if (!el) return
    const card = el.querySelector<HTMLElement>('[data-org-card]')
    const step = (card?.offsetWidth ?? 280) + 12
    el.scrollBy({ left: dir * step, behavior: 'smooth' })
  }

  return (
    <div style={{ marginBottom: 30 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', margin: '0 0 12px' }}>
        <h2 style={{ fontSize: 16, margin: 0 }}>
          Community organizations
          <span className="muted" style={{ fontSize: 13, fontWeight: 400 }}> · {orgs.length}</span>
        </h2>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <button onClick={() => scrollByCard(-1)} aria-label="Previous" className="btn secondary" style={{ padding: '4px 10px', fontSize: 14 }}>‹</button>
          <button onClick={() => scrollByCard(1)} aria-label="Next" className="btn secondary" style={{ padding: '4px 10px', fontSize: 14 }}>›</button>
        </div>
      </div>
      <div
        ref={scrollRef}
        style={{
          display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4,
          scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch',
        }}
      >
        {orgs.map((o) => (
          <div
            key={o.key}
            data-org-card
            className="card"
            style={{ padding: 16, flex: '0 0 280px', minWidth: 0, scrollSnapAlign: 'start' }}
          >
            <div style={{ fontSize: 15, fontWeight: 700 }}>{o.name}</div>
            <div className="muted" style={{ fontSize: 12.5, marginTop: 8, lineHeight: 1.55 }}>{o.blurb}</div>
            <div style={{ fontSize: 12.5, marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: '4px 14px' }}>
              {o.phone && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Phone size={12} aria-hidden /> {o.phone}</span>}
              {o.email && (
                <a href={`mailto:${o.email}`} style={{ color: 'var(--primary-light)', wordBreak: 'break-all', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Mail size={12} aria-hidden /> {o.email}
                </a>
              )}
              {o.address && <span className="muted" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><MapPin size={12} aria-hidden /> {o.address}</span>}
            </div>
            <div style={{ marginTop: 10 }}>
              <a href={o.website} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12.5, color: 'var(--primary-light)' }}>
                {o.websiteLabel} ↗
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
