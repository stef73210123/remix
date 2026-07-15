'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Landmark, HardHat, Shield, GraduationCap, Trophy, CloudRain, Flower2, Users, Newspaper } from 'lucide-react'
import { fmtDateShort } from '@/lib/municipal/date'

type NewsCategoryIcon =
  | 'landmark' | 'hard-hat' | 'shield' | 'graduation-cap' | 'trophy' | 'cloud-rain' | 'flower' | 'users' | 'newspaper'

interface NewsItem {
  key: string
  title: string
  source: string
  url: string
  summary: string
  publishedAt: string
  category: string
  categoryIcon: NewsCategoryIcon
}

const CATEGORY_ICONS: Record<NewsCategoryIcon, typeof Landmark> = {
  landmark: Landmark,
  'hard-hat': HardHat,
  shield: Shield,
  'graduation-cap': GraduationCap,
  trophy: Trophy,
  'cloud-rain': CloudRain,
  flower: Flower2,
  users: Users,
  newspaper: Newspaper,
}

/**
 * "In the news" — live local coverage of the town and its hamlets (Perigon
 * News API, scoped to The Examiner News + lohud), right after Community
 * organizations. Fetched like KeyIssues; renders nothing while loading or if
 * no key is configured server-side. Same square-tile card language and
 * horizontally-scrollable pattern as CommunityOrgs (a plain, non-underlined
 * body with only the card itself as the link), plus a category icon and a
 * client-side search over the fetched batch.
 */
export default function InTheNews({ muniKey }: { muniKey: string }) {
  const [items, setItems] = useState<NewsItem[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
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

  const filtered = useMemo(() => {
    if (!items) return []
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter((n) => [n.title, n.summary, n.source, n.category].some((s) => s.toLowerCase().includes(q)))
  }, [items, query])

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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', margin: '0 0 12px' }}>
        <h2 style={{ fontSize: 16, margin: 0 }}>
          In the news
          <span className="muted" style={{ fontSize: 13, fontWeight: 400 }}> · {filtered.length}</span>
        </h2>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search news…"
            aria-label="Search news"
            style={{ fontSize: 13, padding: '5px 10px', borderRadius: 6, background: 'var(--panel-2)', border: '1px solid var(--border)', color: 'var(--text)', minWidth: 150 }}
          />
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            <button onClick={() => scrollByCard(-1)} aria-label="Previous" className="btn secondary" style={{ padding: '4px 10px', fontSize: 14 }}>‹</button>
            <button onClick={() => scrollByCard(1)} aria-label="Next" className="btn secondary" style={{ padding: '4px 10px', fontSize: 14 }}>›</button>
          </div>
        </div>
      </div>
      {filtered.length === 0 ? (
        <div className="card"><div className="muted" style={{ padding: 20, fontSize: 13 }}>No news items match &ldquo;{query}&rdquo;.</div></div>
      ) : (
        <div
          ref={scrollRef}
          style={{
            display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4,
            scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch',
          }}
        >
          {filtered.map((n) => {
            const d = n.publishedAt ? new Date(n.publishedAt) : null
            const dateLabel = d && !isNaN(d.getTime()) ? fmtDateShort(d) : null
            const Icon = CATEGORY_ICONS[n.categoryIcon] || Newspaper
            return (
              <a
                key={n.key}
                href={n.url}
                target="_blank"
                rel="noopener noreferrer"
                data-news-card
                className="card"
                style={{ padding: 16, flex: '0 0 280px', minWidth: 0, scrollSnapAlign: 'start', display: 'block', color: 'inherit', textDecoration: 'none' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <Icon size={14} aria-hidden style={{ flexShrink: 0, color: 'var(--muted)' }} />
                  <span className="muted" style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{n.category}</span>
                </div>
                <div style={{
                  fontSize: 14, fontWeight: 700, lineHeight: 1.3,
                  display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                }}>
                  {n.title}
                </div>
                {n.summary && (
                  <div className="muted" style={{
                    fontSize: 12.5, marginTop: 8, lineHeight: 1.5,
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                  }}>
                    {n.summary}
                  </div>
                )}
                <div className="muted" style={{ fontSize: 11.5, marginTop: 10 }}>
                  {n.source}{dateLabel ? ` · ${dateLabel}` : ''} ↗
                </div>
              </a>
            )
          })}
        </div>
      )}
      <p className="muted" style={{ fontSize: 11, marginTop: 8 }}>
        Local news coverage of North Castle and its hamlets (Armonk, Banksville, North White Plains).
      </p>
    </div>
  )
}
