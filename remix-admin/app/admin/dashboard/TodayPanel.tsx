'use client'

import { useState } from 'react'

/* Minimal, injection-safe Slack-mrkdwn line renderer: supports *bold* and
   leaves everything else literal. */
function renderLine(line: string, key: number) {
  const parts = line.split(/(\*[^*]+\*)/g).filter(Boolean)
  const isBullet = /^\s*[•\-*]\s+/.test(line)
  return (
    <div
      key={key}
      style={{
        padding: line.trim() === '' ? '4px 0' : '1px 0',
        paddingLeft: isBullet ? 14 : 0,
      }}
    >
      {parts.map((p, i) =>
        p.startsWith('*') && p.endsWith('*') && p.length > 2 ? (
          <strong key={i}>{p.slice(1, -1)}</strong>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </div>
  )
}

export default function TodayPanel({
  date,
  updatedAt,
  markdown,
  fitness,
  initialState,
}: {
  date: string
  updatedAt: string | null
  markdown: string | null
  fitness: string[]
  initialState: Record<string, boolean>
}) {
  const [state, setState] = useState<Record<string, boolean>>(initialState)
  const [pending, setPending] = useState<Record<string, boolean>>({})

  async function toggle(item: string) {
    const next = !state[item]
    setState((s) => ({ ...s, [item]: next }))
    setPending((p) => ({ ...p, [item]: true }))
    try {
      const res = await fetch('/admin/api/fitness', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ item, checked: next, date }),
      })
      if (!res.ok) throw new Error(String(res.status))
    } catch {
      // Roll back on failure.
      setState((s) => ({ ...s, [item]: !next }))
    } finally {
      setPending((p) => {
        const { [item]: _drop, ...rest } = p
        return rest
      })
    }
  }

  const done = fitness.filter((f) => state[f]).length

  return (
    <section
      className="card"
      style={{ padding: 20, marginBottom: 28, display: 'grid', gap: 16 }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <h2 style={{ fontSize: 16, margin: 0 }}>☀️ Today&rsquo;s Briefing</h2>
        <span className="muted" style={{ fontSize: 12 }}>
          {updatedAt ? `Updated ${new Date(updatedAt).toLocaleString('en-US', { timeZone: 'America/New_York' })}` : date}
        </span>
      </div>

      <div style={{ display: 'grid', gap: 20, gridTemplateColumns: 'minmax(0, 1fr) minmax(220px, 320px)' }}>
        {/* Briefing body */}
        <div style={{ fontSize: 13.5, lineHeight: 1.55, minWidth: 0 }}>
          {markdown ? (
            markdown.split('\n').map((l, i) => renderLine(l, i))
          ) : (
            <p className="muted" style={{ margin: 0 }}>
              No briefing yet today. It appears here each morning once the daily briefing task is
              wired to post to <code>/admin/api/briefing</code>.
            </p>
          )}
        </div>

        {/* Fitness checklist */}
        <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: 16, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ fontWeight: 600, fontSize: 13 }}>Fitness</div>
            <span className="muted" style={{ fontSize: 12 }}>
              {done}/{fitness.length}
            </span>
          </div>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
            {fitness.map((item) => (
              <li key={item}>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    cursor: 'pointer',
                    fontSize: 13.5,
                    opacity: pending[item] ? 0.6 : 1,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={!!state[item]}
                    onChange={() => toggle(item)}
                    style={{ width: 17, height: 17, accentColor: 'var(--primary)', cursor: 'pointer' }}
                  />
                  <span
                    style={{
                      textDecoration: state[item] ? 'line-through' : 'none',
                      color: state[item] ? 'var(--muted)' : 'inherit',
                    }}
                  >
                    {item}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
