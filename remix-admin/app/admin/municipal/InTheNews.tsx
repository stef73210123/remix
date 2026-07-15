'use client'

import { useEffect, useRef, useState } from 'react'
import { fmtDateShort } from '@/lib/municipal/date'

interface NewsItem {
  key: string
  title: string
  source: string
  url: string
  summary: string
  publishedAt: string
}

/**
 * "In the news" — live local coverage of the town and its hamlets (Perigon
 * News API), right after Community organizations. Fetched like KeyIssues;
 * renders nothing while loading or if no key is configured server-side.
 * Same horizontally-scrollable card pattern as CommunityOrgs.
 */
export default function InTheNews({ muniKey }: { muniKey: string }) {
  const [items, setItems] = useState<NewsItem[] | null>(null)
  const [loading, setLoading] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setLoading(true)
    setItems(null)
    fetch(`/admin/api/municipal/news?muni=${encodeURIComponent(muniKey)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('load'))))
      .then((d: { available?: boolean; items?: NewsItem[] }) => setItems(d.available ? d.items ?? [] : null))
      .catch(() => setItems(null))
      .finally(() => setLoading(false))
  }, [muniKey])

  if (loading) return null
  if (!items || items.length === 0) return null

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
        {items.map((n) => {
          const d = n.publishedAt ? new Date(n.publishedAt) : null
          const dateLabel = d && !isNaN(d.getTime()) ? fmtDateShort(d) : null
          return (
            <a
              key={n.key}
              href={n.url}
              target="_blank"
              rel="noopener noreferrer"
              data-news-card
              className="card"
              style={{ padding: 16, flex: '0 0 280px', minWidth: 0, scrollSnapAlign: 'start', display: 'block', color: 'inherit' }}
            >
              <div style={{ fontSize: 14.5, fontWeight: 700, lineHeight: 1.35 }}>{n.title}</div>
              {n.summary && <div className="muted" style={{ fontSize: 12.5, marginTop: 8, lineHeight: 1.55 }}>{n.summary}</div>}
              <div className="muted" style={{ fontSize: 11.5, marginTop: 10 }}>
                {n.source}{dateLabel ? ` · ${dateLabel}` : ''} ↗
              </div>
            </a>
          )
        })}
      </div>
      <p className="muted" style={{ fontSize: 11, marginTop: 8 }}>
        Local news coverage of North Castle and its hamlets (Armonk, Banksville, North White Plains).
      </p>
    </div>
  )
}
