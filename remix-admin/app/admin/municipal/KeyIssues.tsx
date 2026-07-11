'use client'

import { getKeyIssues } from '@/lib/municipal/keyIssues'

/**
 * Narrative "playbook" of a town's key civic issues — 6–8 cards, each an
 * INSIGHT + EVIDENCE synopsis grounded in the transcript analysis — shown above
 * the sorted theme charts so the qualitative story leads the quantitative bars.
 */
export default function KeyIssues({ muniKey }: { muniKey: string }) {
  const data = getKeyIssues(muniKey)
  if (!data || data.cards.length === 0) return null

  return (
    <div style={{ marginBottom: 30 }}>
      <h2 style={{ fontSize: 16, margin: '0 0 4px' }}>
        Key issues
        <span className="muted" style={{ fontSize: 13, fontWeight: 400 }}> · what the town is actually deliberating</span>
      </h2>
      <div className="muted" style={{ fontSize: 11, marginBottom: 12, lineHeight: 1.5, maxWidth: 720 }}>
        A plain-language read on the recurring issues, drawn from a year of Town Board and Planning Board meetings.
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
        {data.cards.map((c) => (
          <div key={c.n} className="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <span style={{ fontSize: 20, lineHeight: 1 }} aria-hidden>{c.icon}</span>
              <div style={{ fontWeight: 700, fontSize: 15, lineHeight: 1.25 }}>
                <span className="muted" style={{ fontWeight: 700 }}>{c.n}.</span> {c.title}
              </div>
            </div>
            <div>
              <div className="muted" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>Insight</div>
              <div style={{ fontSize: 13, lineHeight: 1.5 }}>{c.insight}</div>
            </div>
            <div>
              <div className="muted" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>Evidence</div>
              <div className="muted" style={{ fontSize: 12.5, lineHeight: 1.5 }}>{c.evidence}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
