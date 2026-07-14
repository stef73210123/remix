'use client'

import { useRef } from 'react'
import { getPetitions } from '@/lib/municipal/petitions'

/**
 * Open resident petitions for the town, just above Community organizations.
 * Same horizontally-scrollable card layout as CommunityOrgs (scroll-snap +
 * arrow buttons), for visual consistency even though there's usually only a
 * handful of entries. Static lookup (no fetch), renders instantly. Returns
 * null for towns with none configured.
 */
export default function OpenPetitions({ muniKey }: { muniKey: string }) {
  const petitions = getPetitions(muniKey)
  const scrollRef = useRef<HTMLDivElement>(null)
  if (petitions.length === 0) return null

  const scrollByCard = (dir: 1 | -1) => {
    const el = scrollRef.current
    if (!el) return
    const card = el.querySelector<HTMLElement>('[data-petition-card]')
    const step = (card?.offsetWidth ?? 280) + 12
    el.scrollBy({ left: dir * step, behavior: 'smooth' })
  }

  return (
    <div style={{ marginBottom: 30 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', margin: '0 0 12px' }}>
        <h2 style={{ fontSize: 16, margin: 0 }}>
          Open petitions
          <span className="muted" style={{ fontSize: 13, fontWeight: 400 }}> · {petitions.length}</span>
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
        {petitions.map((p) => (
          <div
            key={p.key}
            data-petition-card
            className="card"
            style={{ padding: 16, flex: '0 0 280px', minWidth: 0, scrollSnapAlign: 'start' }}
          >
            <div style={{ fontSize: 15, fontWeight: 700 }}>{p.title}</div>
            <div className="muted" style={{ fontSize: 12.5, marginTop: 8, lineHeight: 1.55 }}>{p.summary}</div>
            <div style={{ marginTop: 10 }}>
              <a href={p.link} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12.5, color: 'var(--primary-light)' }}>
                {p.linkLabel} ↗
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
