'use client'

import { useEffect, useRef, useState } from 'react'

/** Multi-select filter dropdown — a labeled set of checkboxes in a popover,
 *  "hidden" names excluded, everything shown (checked) by default. Shared by
 *  the Meetings widget's board/committee filter and any other all-on-by-
 *  default multi-select filter on the dashboard. */
export default function BoardFilterDropdown({
  label = 'Boards', options, hidden, onChange,
}: {
  label?: string
  options: string[]
  hidden: Set<string>
  onChange: (next: Set<string>) => void
}) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDocClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  const toggle = (b: string) => {
    const next = new Set(hidden)
    if (next.has(b)) next.delete(b); else next.add(b)
    onChange(next)
  }
  const shownCount = options.length - hidden.size

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="btn secondary"
        style={{ padding: '4px 10px', fontSize: 12.5, display: 'inline-flex', alignItems: 'center', gap: 6 }}
      >
        {label}
        <span className="muted">{shownCount}/{options.length}</span>
        <span style={{ fontSize: 9 }}>▾</span>
      </button>
      {open && (
        <div
          className="card"
          style={{
            position: 'absolute', top: '100%', right: 0, marginTop: 4, minWidth: 200, maxHeight: 280, zIndex: 20,
            padding: 8, display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto',
            boxShadow: '0 6px 20px rgba(0,0,0,0.25)',
          }}
        >
          <button
            onClick={() => onChange(new Set())}
            className="muted"
            style={{ all: 'unset', cursor: 'pointer', fontSize: 12, padding: '4px 6px' }}
          >
            Select all
          </button>
          {options.map((b) => (
            <label key={b} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, padding: '4px 6px', cursor: 'pointer' }}>
              <input type="checkbox" checked={!hidden.has(b)} onChange={() => toggle(b)} />
              {b}
            </label>
          ))}
        </div>
      )}
    </div>
  )
}
