'use client'

import { useRef } from 'react'
import { Landmark, Droplet, HardHat, TreePine, Shield, DollarSign } from 'lucide-react'
import { getKeyIssues, type KeyIssueIcon } from '@/lib/municipal/keyIssues'

const ICONS: Record<KeyIssueIcon, typeof Landmark> = {
  landmark: Landmark,
  droplet: Droplet,
  'hard-hat': HardHat,
  'tree-pine': TreePine,
  shield: Shield,
  'dollar-sign': DollarSign,
}

/**
 * Narrative "playbook" of a town's key civic issues — 6–8 cards, each an
 * INSIGHT + EVIDENCE synopsis grounded in the transcript analysis — shown above
 * the sorted theme charts so the qualitative story leads the quantitative bars.
 * Horizontally scrollable (scroll-snap + arrow buttons) rather than a grid, so
 * a handful of longer cards don't crowd the page vertically.
 */
export default function KeyIssues({ muniKey }: { muniKey: string }) {
  const data = getKeyIssues(muniKey)
  const scrollRef = useRef<HTMLDivElement>(null)
  if (!data || data.cards.length === 0) return null

  const scrollByCard = (dir: 1 | -1) => {
    const el = scrollRef.current
    if (!el) return
    const card = el.querySelector<HTMLElement>('[data-key-issue-card]')
    const step = (card?.offsetWidth ?? 300) + 12
    el.scrollBy({ left: dir * step, behavior: 'smooth' })
  }

  return (
    <div style={{ marginBottom: 30 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', margin: '0 0 12px' }}>
        <h2 style={{ fontSize: 16, margin: 0 }}>Key issues</h2>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <button onClick={() => scrollByCard(-1)} aria-label="Previous" className="btn secondary" style={{ padding: '4px 10px', fontSize: 14 }}>‹</button>
          <button onClick={() => scrollByCard(1)} aria-label="Next" className="btn secondary" style={{ padding: '4px 10px', fontSize: 14 }}>›</button>
        </div>
      </div>
      <div className="muted" style={{ fontSize: 12, lineHeight: 1.5, maxWidth: 660, margin: '-4px 0 12px' }}>
        Themes that keep coming up across the public record, with the meetings or documents they came
        from. These are summaries written by software, not the Town&apos;s positions — read the underlying
        records before relying on any of them.
      </div>
      <div
        ref={scrollRef}
        style={{
          display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4,
          scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch',
        }}
      >
        {data.cards.map((c) => {
          const Icon = ICONS[c.icon]
          return (
          <div
            key={c.n}
            data-key-issue-card
            className="card"
            style={{
              padding: 16, display: 'flex', flexDirection: 'column', gap: 10,
              flex: '0 0 300px', minWidth: 0, scrollSnapAlign: 'start',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <Icon size={20} aria-hidden style={{ flexShrink: 0, marginTop: 1 }} />
              <div style={{ fontWeight: 700, fontSize: 15, lineHeight: 1.25 }}>
                <span className="muted" style={{ fontWeight: 700 }}>{c.n}.</span> {c.title}
              </div>
            </div>
            <div>
              <div className="muted" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>What comes up</div>
              <div style={{ fontSize: 13, lineHeight: 1.5 }}>{c.insight}</div>
            </div>
            <div>
              <div className="muted" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>Where we saw it</div>
              <div className="muted" style={{ fontSize: 12.5, lineHeight: 1.5 }}>{c.evidence}</div>
            </div>
          </div>
          )
        })}
      </div>
    </div>
  )
}
