'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Search, X } from 'lucide-react'
import { track } from '@/lib/analytics'

/**
 * Site-wide search, in the nav row on every municipal page.
 *
 * Covers applications and agenda items, the officials who decide them, the
 * addresses they sit at, boards and department staff. Results are keyboard
 * navigable (↑ ↓ Enter, Escape to dismiss) and "/" focuses the box from
 * anywhere, the way search behaves on sites people already use.
 *
 * A case result deep-links straight to its profile modal (`?case=`); an address
 * result pre-fills the board's own list filter (`?q=`) so every filing at that
 * address is on screen together.
 */

export interface SearchResult {
  kind: 'case' | 'person' | 'address' | 'board' | 'department'
  title: string
  subtitle: string
  href: string
}

const KIND_LABEL: Record<SearchResult['kind'], string> = {
  case: 'Application',
  person: 'Official',
  address: 'Address',
  board: 'Board',
  department: 'Staff',
}

export default function SiteSearch({ muni }: { muni: string }) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [open, setOpen] = useState(false)
  const [cursor, setCursor] = useState(0)
  const [loading, setLoading] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const seq = useRef(0)

  // "/" focuses search from anywhere, unless the caret is already in a field.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      const typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)
      if (e.key === '/' && !typing) { e.preventDefault(); inputRef.current?.focus() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  // Debounced, and guarded by a sequence number so a slow early response can
  // never overwrite the results for what was typed after it.
  useEffect(() => {
    const term = q.trim()
    if (term.length < 2 || !muni) { setResults([]); setLoading(false); return }
    setLoading(true)
    const mine = ++seq.current
    const t = setTimeout(() => {
      fetch(`/admin/api/municipal/search?muni=${encodeURIComponent(muni)}&q=${encodeURIComponent(term)}`)
        .then((r) => (r.ok ? r.json() : { results: [] }))
        .then((d) => {
          if (mine !== seq.current) return
          setResults(d.results || [])
          setCursor(0)
          setLoading(false)
          track('search', { muni, scope: 'site', results: (d.results || []).length === 0 ? '0' : 'some' })
        })
        .catch(() => { if (mine === seq.current) { setResults([]); setLoading(false) } })
    }, 220)
    return () => clearTimeout(t)
  }, [q, muni])

  const go = useCallback((r: SearchResult) => {
    track('search_result_click', { muni, kind: r.kind })
    window.location.href = r.href
  }, [muni])

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { setOpen(false); inputRef.current?.blur(); return }
    if (!open || results.length === 0) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor((c) => (c + 1) % results.length) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setCursor((c) => (c - 1 + results.length) % results.length) }
    else if (e.key === 'Enter') { e.preventDefault(); const r = results[cursor]; if (r) go(r) }
  }

  const showPanel = open && q.trim().length >= 2

  return (
    <div ref={boxRef} style={{ position: 'relative', flex: '1 1 220px', minWidth: 180, maxWidth: 360 }}>
      <div style={{ position: 'relative' }}>
        <Search
          size={14}
          aria-hidden
          style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', opacity: 0.55, pointerEvents: 'none' }}
        />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Search people, applications, addresses…"
          aria-label="Search this site"
          role="combobox"
          aria-expanded={showPanel}
          aria-controls="site-search-results"
          style={{
            width: '100%', padding: '6px 26px 6px 27px', fontSize: 13, borderRadius: 8,
            border: '1px solid var(--border)', background: 'var(--panel)', color: 'inherit',
          }}
        />
        {q && (
          <button
            onClick={() => { setQ(''); setResults([]); inputRef.current?.focus() }}
            aria-label="Clear search"
            style={{
              position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer', padding: 4, opacity: 0.6, lineHeight: 0,
            }}
          >
            <X size={13} />
          </button>
        )}
      </div>

      {showPanel && (
        <div
          id="site-search-results"
          role="listbox"
          className="card"
          style={{
            position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 60,
            maxHeight: 420, overflowY: 'auto', padding: 4, boxShadow: '0 10px 30px rgba(0,0,0,0.18)',
          }}
        >
          {loading && results.length === 0 && (
            <div className="muted" style={{ padding: '10px 10px', fontSize: 12.5 }}>Searching…</div>
          )}
          {!loading && results.length === 0 && (
            <div className="muted" style={{ padding: '10px 10px', fontSize: 12.5 }}>
              Nothing matches “{q.trim()}”.
            </div>
          )}
          {results.map((r, i) => (
            <button
              key={`${r.kind}-${r.href}-${i}`}
              role="option"
              aria-selected={i === cursor}
              onMouseEnter={() => setCursor(i)}
              onClick={() => go(r)}
              style={{
                display: 'block', width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer',
                borderRadius: 6, padding: '7px 9px',
                background: i === cursor ? 'var(--panel-2)' : 'transparent', color: 'inherit',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
                <span
                  className="badge state"
                  style={{ fontSize: 9.5, flexShrink: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}
                >
                  {KIND_LABEL[r.kind]}
                </span>
                <span style={{ fontWeight: 600, fontSize: 13, lineHeight: 1.35 }}>{r.title}</span>
              </div>
              {r.subtitle && (
                <div
                  className="muted"
                  style={{
                    fontSize: 11.5, marginTop: 2, lineHeight: 1.4,
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                  }}
                >
                  {r.subtitle}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
