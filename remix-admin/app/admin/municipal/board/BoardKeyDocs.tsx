'use client'

import { useState } from 'react'
import { getKeyDocs } from '@/lib/municipal/keyDocs'

/** Shown before the list expands. Enough to see what's there without a wall of
 *  text on a page whose main content is below. */
const COLLAPSED = 6

/**
 * The reference documents behind a board or department's business — the code
 * chapters, plans, budgets, reports and application forms the Town has
 * published — distinct from the departmental contact links in BoardStaffCards
 * (staff & portals, not documents).
 *
 * Each row carries the document's own date and a plain-language line about what
 * it is for, because the titles the Town publishes under ("Local Law 2 of
 * 2026", "SD2 Enhance Upgrade Consultant RFP Results") tell a resident almost
 * nothing on their own. Links go to the Town's copy — we don't rehost.
 *
 * Static lookup, so it renders instantly with no loading flicker.
 */
export default function BoardKeyDocs({ muni, bodyKey }: { muni: string; bodyKey: string }) {
  const docs = getKeyDocs(muni, bodyKey)
  const [expanded, setExpanded] = useState(false)
  if (docs.length === 0) return null

  const visible = expanded ? docs : docs.slice(0, COLLAPSED)
  const hidden = docs.length - visible.length

  return (
    <div className="card" style={{ padding: 16, marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 4 }}>
        <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Key documents
          <span style={{ textTransform: 'none', letterSpacing: 0 }}> · {docs.length}</span>
        </div>
      </div>
      <div className="muted" style={{ fontSize: 11.5, lineHeight: 1.5, marginBottom: 12, maxWidth: 680 }}>
        Published by the Town, except where a row is marked <em>obtained by FOIL</em> — those
        are records the Town does not publish anywhere, released on request and hosted here
        exactly as received. Nothing on this list has been edited.
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {visible.map((d) => (
          <div key={d.href} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
              <a
                href={d.href}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--primary-light)' }}
              >
                {d.label} ↗
              </a>
              {d.date && (
                <span className="badge state" style={{ fontSize: 10.5, flexShrink: 0 }}>{d.date}</span>
              )}
              {d.sub && <span className="muted" style={{ fontSize: 11.5 }}>{d.sub}</span>}
            </div>
            {d.note && (
              <div className="muted" style={{ fontSize: 12.5, lineHeight: 1.5, maxWidth: 720 }}>{d.note}</div>
            )}
          </div>
        ))}
      </div>

      {hidden > 0 && (
        <button
          onClick={() => setExpanded(true)}
          className="btn secondary"
          style={{ marginTop: 12, padding: '5px 11px', fontSize: 12 }}
        >
          Show {hidden} more
        </button>
      )}
      {expanded && docs.length > COLLAPSED && (
        <button
          onClick={() => setExpanded(false)}
          className="btn secondary"
          style={{ marginTop: 12, padding: '5px 11px', fontSize: 12 }}
        >
          Show fewer
        </button>
      )}
    </div>
  )
}
