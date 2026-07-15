'use client'

import { useRef } from 'react'
import { getNewsItems } from '@/lib/municipal/news'

/**
 * "In the news" — curated local coverage of the town and its hamlets, right
 * after Community organizations. Static lookup like CommunityOrgs (no fetch,
 * renders instantly); returns null for towns with none configured. Same
 * horizontally-scrollable card pattern as CommunityOrgs/KeyIssues.
 */
export default function InTheNews({ muniKey }: { muniKey: string }) {
  const items = getNewsItems(muniKey)
  const scrollRef = useRef<HTMLDivElement>(null)
  if (items.length === 0) return null

  const scrollByCard = (dir: 1 | -1) => {
    const el = scrollRef.current
    if (!el) return
    const card = el.querySelector<HTMLElement>('[data-news-card]')
    const step = (card?.offsetWidth ?? 280) + 12
    el.scrollBy({ left: dir * step, behavior: 'smooth' })
  }

  return (
    <div style={{ marginBottom: 30 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', margin: '0 0 12px' }}>
        <h2 style={{ fontSize: 16, margin: 0 }}>
          In the news
          <span className="muted" style={{ fontSize: 13, fontWeight: 400 }}> · {items.length}</span>
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
        {items.map((n) => (
          <a
            key={n.key}
            href={n.url}
            target="_blank"
            rel="noopener noreferrer"
            data-news-card
            className="card"
            style={{ padding: 16, flex: '0 0 280px', minWidth: 0, scrollSnapAlign: 'start', display: 'block', color: 'inherit' }}
          >
            <span className="badge" style={{ fontSize: 10.5 }}>{n.tag}</span>
            <div style={{ fontSize: 14.5, fontWeight: 700, marginTop: 8, lineHeight: 1.35 }}>{n.title}</div>
            <div className="muted" style={{ fontSize: 12.5, marginTop: 8, lineHeight: 1.55 }}>{n.summary}</div>
            <div className="muted" style={{ fontSize: 11.5, marginTop: 10 }}>{n.source} ↗</div>
          </a>
        ))}
      </div>
      <p className="muted" style={{ fontSize: 11, marginTop: 8 }}>
        A curated roundup of local coverage of North Castle and its hamlets (Armonk, Banksville, North White Plains) from outlets that report on the town — not an automated feed.
      </p>
    </div>
  )
}
