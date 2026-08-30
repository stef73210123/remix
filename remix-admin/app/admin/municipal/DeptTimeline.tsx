'use client'

import { useEffect, useState } from 'react'
import type { StaffTimelineEntry } from '@/lib/municipal/staffTimeline'

/** Newest few, before the reader asks for the rest. */
const COLLAPSED = 5

/**
 * What this department's staff actually said at public meetings, newest first.
 *
 * The board pages answer "what happened at this meeting"; this answers the
 * question a resident is more likely to have — "what has the Water & Sewer
 * Superintendent been telling the Town Board, and when" — by pulling one
 * department's contributions out of three years of meetings and putting them in
 * one column.
 *
 * Renders nothing at all when a department's staff never appear. Several
 * departments here are run by a single official who simply doesn't attend, and
 * an empty section would read as a loading failure rather than the fact it is.
 */
export default function DeptTimeline({
  muni,
  deptKey,
  label,
}: {
  muni: string
  deptKey: string
  label: string
}) {
  const [entries, setEntries] = useState<StaffTimelineEntry[] | null>(null)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    if (!muni || !deptKey) return
    let live = true
    fetch(`/admin/api/municipal/dept-timeline?muni=${encodeURIComponent(muni)}&dept=${encodeURIComponent(deptKey)}`)
      .then((r) => (r.ok ? r.json() : { entries: [] }))
      .then((d) => live && setEntries(d.entries || []))
      .catch(() => live && setEntries([]))
    return () => {
      live = false
    }
  }, [muni, deptKey])

  // Nothing to show, or not loaded yet — stay out of the layout entirely
  // rather than reserving space for a section that may never fill.
  if (!entries || entries.length === 0) return null

  const visible = expanded ? entries : entries.slice(0, COLLAPSED)
  const hidden = entries.length - visible.length
  const people = [...new Set(entries.map((e) => e.person))]
  const span = `${fmtDate(entries[entries.length - 1].date)} – ${fmtDate(entries[0].date)}`

  return (
    <div className="card" style={{ padding: 16, marginBottom: 24 }}>
      <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
        At the podium
        <span style={{ textTransform: 'none', letterSpacing: 0 }}> · {entries.length}</span>
      </div>
      <div className="muted" style={{ fontSize: 11.5, lineHeight: 1.5, marginBottom: 14, maxWidth: 700 }}>
        Every time {people.length === 1 ? people[0] : `${label} staff`} spoke at a public meeting,
        newest first — {span}. Drawn from the meeting transcripts; each entry links back to the
        meeting it came from.
      </div>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {visible.map((e, i) => (
          <div
            key={`${e.date}-${e.bodyKey}-${i}`}
            style={{
              display: 'grid',
              gridTemplateColumns: '92px 1fr',
              gap: 12,
              paddingBottom: 14,
              marginBottom: 14,
              borderBottom: i < visible.length - 1 ? '1px solid var(--border)' : 'none',
            }}
          >
            <div>
              <a
                href={`/admin/municipal/board?muni=${muni}&body=${e.bodyKey}&date=${e.date}`}
                style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--primary-light)' }}
              >
                {fmtDate(e.date)}
              </a>
              <div className="muted" style={{ fontSize: 10.5, marginTop: 2, lineHeight: 1.35 }}>{e.board}</div>
            </div>
            <div>
              <div style={{ fontSize: 12.5, marginBottom: 3 }}>
                <span style={{ fontWeight: 600 }}>{e.person}</span>
                {people.length > 1 && <span className="muted"> · {e.role}</span>}
              </div>
              <div style={{ fontSize: 12.5, lineHeight: 1.55 }}>{e.summary}</div>
              {e.cases.length > 0 && (
                <div className="muted" style={{ fontSize: 11, marginTop: 5, lineHeight: 1.5 }}>
                  {e.cases.map((c) => c.name).join(' · ')}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {hidden > 0 && (
        <button
          onClick={() => setExpanded(true)}
          className="btn secondary"
          style={{ padding: '5px 11px', fontSize: 12 }}
        >
          Show {hidden} earlier
        </button>
      )}
      {expanded && entries.length > COLLAPSED && (
        <button
          onClick={() => setExpanded(false)}
          className="btn secondary"
          style={{ padding: '5px 11px', fontSize: 12 }}
        >
          Show fewer
        </button>
      )}
    </div>
  )
}

/** "2026-08-12" → "12 Aug 2026", parsed as a plain date (no timezone shift). */
function fmtDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${d} ${MONTHS[m - 1]} ${y}`
}
