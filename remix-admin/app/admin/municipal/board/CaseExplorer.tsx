'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import type { AnalysisDataset, CaseRollup } from '@/lib/municipal/analysis'
import type { PermitMarker } from '../JurisdictionMap'
import { sentimentColor, sentimentChipStyle, fmtSent, dispositionLabel } from '../sentiment'
import { parseAddress, compareAddress, sortableName, hasStreetSuffix, type ParsedAddress } from '@/lib/municipal/address'
import { fmtDate } from './caseFormat'
import CaseProfile from './CaseProfile'
import {
  buildFacets,
  statusBucket,
  typeTags,
  caseYears,
  isConditional,
  STATUS_LABELS,
  type StatusBucket,
} from '@/lib/municipal/caseFacets'

const JurisdictionMap = dynamic(() => import('../JurisdictionMap'), {
  ssr: false,
  loading: () => <div className="card" style={{ height: 380, marginBottom: 20 }} />,
})

/** One meeting's published documents, for attaching packets to appearances. */
export interface MeetingDoc {
  /** YYYY-MM-DD. */
  date: string
  assets: { kind: string; sourceUrl: string | null; blobUrl: string | null; pageCount: number | null }[]
}

type SortKey = 'lastSeen' | 'firstSeen' | 'appearances' | 'name' | 'address' | 'sentiment'
type GroupKey = 'none' | 'street' | 'alpha'

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'lastSeen', label: 'Most recent' },
  { key: 'firstSeen', label: 'Oldest' },
  { key: 'appearances', label: 'Most meetings' },
  { key: 'name', label: 'Name A–Z' },
  { key: 'address', label: 'Street & number' },
  { key: 'sentiment', label: 'Most critical' },
]

const GROUPS: { key: GroupKey; label: string }[] = [
  { key: 'none', label: 'No grouping' },
  { key: 'street', label: 'By street' },
  { key: 'alpha', label: 'By name A–Z' },
]

/** Picking a grouping implies the order that makes it readable. */
const GROUP_SORT: Record<GroupKey, SortKey | null> = {
  none: null,
  street: 'address',
  alpha: 'name',
}

/** Rows shown before the list asks you to load the rest. */
const PAGE = 40

/** Heading for the cases whose record carries no address at all. */
const NO_ADDRESS = 'No address in the record'

/**
 * Everything in front of a board, in one place.
 *
 * This replaces a split that never made sense to a reader: a map of every case
 * at the top of the page and, far below it, a table that defaulted to only the
 * cases seen twice or more. On the Planning Board that default hid 256 of 399
 * applications — the single-appearance ones, which is most of what a resident
 * looking for their neighbour's application is actually trying to find.
 *
 * So: one filtered set drives both views. Narrowing by status, type, theme or
 * year filters the map and the list together, clicking a pin opens the case and
 * the count in the header is always the honest one — how many of the board's
 * total this view is showing.
 *
 * Two ways in, because people arrive knowing two different things. Someone who
 * knows *where* groups by street: every matter on Bedford Road under one
 * heading, in house-number order, which also quietly reveals the shape of a
 * street's history. Someone who knows *what it's called* groups by name and
 * jumps by letter. The index bar above the list moves between headings without
 * scrolling through several hundred rows.
 *
 * Opening a case opens its profile rather than expanding the row, so detail
 * gets the room it needs and the list keeps its place — and the profile's
 * ‹ › walk the same filtered order, so a street reads straight through.
 */
export default function CaseExplorer({
  data,
  muni,
  meetings = [],
}: {
  data: AnalysisDataset
  muni: string
  meetings?: MeetingDoc[]
}) {
  const isTownBoard = data.meta.bodyKey === 'town_board'
  const noun = isTownBoard ? 'agenda items' : 'applications'
  const Noun = noun[0].toUpperCase() + noun.slice(1)

  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortKey>('lastSeen')
  const [group, setGroup] = useState<GroupKey>('none')
  const [status, setStatus] = useState<Set<string>>(new Set())
  const [types, setTypes] = useState<Set<string>>(new Set())
  const [themes, setThemes] = useState<Set<string>>(new Set())
  const [years, setYears] = useState<Set<string>>(new Set())
  const [recurringOnly, setRecurringOnly] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)
  const [limit, setLimit] = useState(PAGE)
  const [showFilters, setShowFilters] = useState(false)
  const listRef = useRef<HTMLDivElement | null>(null)
  /** Group id to scroll to once it has actually been rendered. */
  const pendingJump = useRef<string | null>(null)

  const facets = useMemo(() => buildFacets(data.cases), [data.cases])

  // Documents keyed by meeting date, so an appearance can find its packet.
  const docsByDate = useMemo(() => {
    const m = new Map<string, MeetingDoc['assets']>()
    for (const mt of meetings) {
      const d = (mt.date || '').slice(0, 10)
      if (d && mt.assets?.length) m.set(d, mt.assets)
    }
    return m
  }, [meetings])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const out = data.cases.filter((c) => {
      if (recurringOnly && c.appearances < 2) return false
      if (status.size && !status.has(statusBucket(c.lastStatus))) return false
      if (types.size && !typeTags(c.applicationType).some((t) => types.has(t))) return false
      if (themes.size && !(c.themes || []).some((t) => themes.has(t))) return false
      if (years.size && !caseYears(c).some((y) => years.has(y))) return false
      if (!q) return true
      // Search the whole record a reader can see, including what the board said
      // at each appearance — people search for "the barn on Cox Ave", not an id.
      const hay = [
        c.name,
        c.address,
        c.applicant,
        c.applicationType,
        c.lastStatus,
        ...(c.themes || []),
        ...(c.timeline || []).map((ap) => `${ap.status} ${ap.summary}`),
      ]
      return hay.filter(Boolean).some((s) => String(s).toLowerCase().includes(q))
    })
    return out.sort(comparator(sort))
  }, [data.cases, query, sort, status, types, themes, years, recurringOnly])

  // Sections, in the order they render. Ungrouped is one nameless section, so
  // the list below has a single shape to walk regardless of mode.
  const sections = useMemo(() => buildSections(filtered, group), [filtered, group])

  // Sections trimmed to the current page, counted in cases rather than
  // headings — a heading shouldn't spend part of someone's "show 80 more".
  const visible = useMemo(() => {
    if (group === 'none') return [{ ...sections[0], cases: sections[0].cases.slice(0, limit) }]
    const out: typeof sections = []
    let n = 0
    for (const s of sections) {
      if (n >= limit) break
      const take = s.cases.slice(0, limit - n)
      out.push({ ...s, cases: take })
      n += take.length
    }
    return out
  }, [sections, group, limit])

  const activeCount = status.size + types.size + themes.size + years.size + (recurringOnly ? 1 : 0)
  const shownCount = visible.reduce((n, s) => n + s.cases.length, 0)

  const markers = useMemo<PermitMarker[]>(
    () =>
      filtered
        .filter((c) => c.address && /\d/.test(c.address))
        .map((c) => ({
          id: c.id,
          address: c.address as string,
          title: c.name,
          sub: [c.applicationType, c.lastStatus, `seen ${c.appearances}×`].filter(Boolean).join(' · '),
          color: sentimentColor(c.avgSentiment),
        })),
    [filtered],
  )

  const selectedMarker = useMemo(
    () => (openId ? markers.find((m) => m.id === openId) ?? null : null),
    [markers, openId],
  )

  const openIndex = useMemo(
    () => (openId ? filtered.findIndex((c) => c.id === openId) : -1),
    [filtered, openId],
  )
  const openCase = openIndex >= 0 ? filtered[openIndex] : null

  // A case opened from a pin, or arrived at by link, has to survive the list
  // not having rendered that far yet — otherwise closing the profile returns
  // to a list that never showed it.
  const reveal = useCallback(
    (id: string) => {
      const idx = filtered.findIndex((c) => c.id === id)
      if (idx >= limit) setLimit(Math.ceil((idx + 1) / PAGE) * PAGE)
    },
    [filtered, limit],
  )

  const openCaseById = useCallback(
    (id: string) => { setOpenId(id); reveal(id) },
    [reveal],
  )

  // The open case lives in the URL, so a profile can be linked to and a reload
  // or a back button lands on the same case rather than the top of the list.
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('case')
    if (id) setOpenId(id)
  }, [])

  // Skipped on the first pass, which still has `openId` at its initial null:
  // writing then would strip the very `?case=` the effect above is reading.
  const urlSynced = useRef(false)
  useEffect(() => {
    if (!urlSynced.current) { urlSynced.current = true; return }
    const url = new URL(window.location.href)
    if (openId) url.searchParams.set('case', openId)
    else url.searchParams.delete('case')
    window.history.replaceState(null, '', url)
  }, [openId])

  useEffect(() => { if (openId) reveal(openId) }, [openId, reveal])

  // Jumping to a heading can need rows that aren't rendered yet, so the scroll
  // waits for the render that the raised limit triggers.
  useEffect(() => {
    const id = pendingJump.current
    if (!id) return
    const el = listRef.current?.querySelector(`[data-group="${cssEscape(id)}"]`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      pendingJump.current = null
    }
  }, [visible])

  const jumpTo = useCallback(
    (key: string) => {
      const idx = sections.findIndex((s) => s.key === key)
      if (idx < 0) return
      const before = sections.slice(0, idx).reduce((n, s) => n + s.cases.length, 0)
      pendingJump.current = key
      setLimit((cur) => Math.max(cur, before + PAGE))
    },
    [sections],
  )

  function changeGroup(g: GroupKey) {
    setGroup(g)
    setLimit(PAGE)
    const s = GROUP_SORT[g]
    if (s) setSort(s)
  }

  function reset() {
    setStatus(new Set())
    setTypes(new Set())
    setThemes(new Set())
    setYears(new Set())
    setRecurringOnly(false)
    setQuery('')
    setLimit(PAGE)
  }

  const unplaced = filtered.length - markers.length

  return (
    <div style={{ marginBottom: 30 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', margin: '0 0 10px' }}>
        <h2 style={{ fontSize: 16, margin: 0 }}>
          {Noun}
          <span className="muted" style={{ fontSize: 13, fontWeight: 400 }}>
            {' '}· {filtered.length === data.cases.length
              ? `all ${data.cases.length}`
              : `${filtered.length} of ${data.cases.length}`}
          </span>
        </h2>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="search"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setLimit(PAGE) }}
            placeholder={`Search ${noun}, addresses, what was said…`}
            aria-label={`Search ${noun}`}
            style={inputStyle}
          />
          <select value={group} onChange={(e) => changeGroup(e.target.value as GroupKey)} aria-label="Group" style={inputStyle}>
            {GROUPS.map((g) => <option key={g.key} value={g.key}>{g.label}</option>)}
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} aria-label="Sort" style={inputStyle}>
            {SORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
          <button
            className="btn secondary"
            onClick={() => setShowFilters((v) => !v)}
            style={{ padding: '5px 11px', fontSize: 12.5 }}
            aria-expanded={showFilters}
          >
            Filters{activeCount > 0 ? ` · ${activeCount}` : ''}
          </button>
          {(activeCount > 0 || query) && (
            <button className="btn secondary" onClick={reset} style={{ padding: '5px 11px', fontSize: 12.5 }}>
              Clear
            </button>
          )}
        </div>
      </div>

      {showFilters && (
        <div className="card" style={{ padding: '12px 14px', marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <FacetRow
            title="Outcome"
            values={facets.statuses}
            selected={status}
            onToggle={(v) => { setStatus(toggle(status, v)); setLimit(PAGE) }}
          />
          {facets.types.length > 0 && (
            <FacetRow
              title="Type"
              values={facets.types}
              selected={types}
              onToggle={(v) => { setTypes(toggle(types, v)); setLimit(PAGE) }}
            />
          )}
          {facets.themes.length > 0 && (
            <FacetRow
              title="Issue raised"
              values={facets.themes}
              selected={themes}
              onToggle={(v) => { setThemes(toggle(themes, v)); setLimit(PAGE) }}
            />
          )}
          <FacetRow
            title="Year before the board"
            values={facets.years}
            selected={years}
            onToggle={(v) => { setYears(toggle(years, v)); setLimit(PAGE) }}
          />
          <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, cursor: 'pointer' }}>
            <input type="checkbox" checked={recurringOnly} onChange={(e) => { setRecurringOnly(e.target.checked); setLimit(PAGE) }} />
            Only those seen at more than one meeting
          </label>
        </div>
      )}

      <div className="muted" style={{ fontSize: 11.5, lineHeight: 1.5, marginBottom: 8, maxWidth: 760 }}>
        Pin colour shows whether the board&apos;s recorded discussion read critical or supportive —
        it is not a decision. {markers.length} of these {filtered.length} sit at an address we could
        place{unplaced > 0 ? `; the other ${unplaced} have no street address in the record` : ''}.
      </div>
      <JurisdictionMap
        muni={muni}
        permits={markers}
        permitsLabel={Noun}
        permitsGroup="This board"
        onlyPermits
        showZoning={data.meta.bodyKey === 'planning'}
        height={380}
        onPermitClick={(p) => openCaseById(p.id)}
        flyToPermit={selectedMarker}
      />

      {group !== 'none' && sections.length > 1 && (
        <JumpBar sections={sections} onJump={jumpTo} />
      )}

      <div ref={listRef} className="card" style={{ padding: 0, marginTop: group === 'none' ? 14 : 8 }}>
        {shownCount === 0 ? (
          <div className="muted" style={{ padding: 16, fontSize: 13 }}>
            Nothing matches. {activeCount > 0 || query ? 'Try clearing a filter.' : ''}
          </div>
        ) : (
          visible.map((s, si) => (
            <div key={s.key || 'all'} data-group={s.key}>
              {group !== 'none' && (
                <div
                  style={{
                    position: 'sticky', top: 0, zIndex: 1,
                    display: 'flex', alignItems: 'baseline', gap: 8,
                    padding: '7px 14px',
                    background: 'var(--panel-2)',
                    borderTop: si === 0 ? 'none' : '1px solid var(--border)',
                    borderBottom: '1px solid var(--border)',
                    fontSize: 11.5, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase',
                  }}
                >
                  {s.label}
                  <span className="muted" style={{ fontWeight: 400, letterSpacing: 0 }}>{s.total}</span>
                </div>
              )}
              {s.cases.map((c, i) => (
                <CaseRow
                  key={c.id}
                  c={c}
                  group={group}
                  first={si === 0 && i === 0 && group === 'none'}
                  active={openId === c.id}
                  onOpen={() => openCaseById(c.id)}
                />
              ))}
            </div>
          ))
        )}
      </div>
      {filtered.length > shownCount && (
        <button
          className="btn secondary"
          onClick={() => setLimit((n) => n + PAGE * 2)}
          style={{ marginTop: 10, padding: '5px 11px', fontSize: 12.5 }}
        >
          Show {Math.min(PAGE * 2, filtered.length - shownCount)} more of {filtered.length - shownCount}
        </button>
      )}

      {openCase && (
        <CaseProfile
          c={openCase}
          members={data.members}
          muni={muni}
          docsByDate={docsByDate}
          position={{ index: openIndex + 1, total: filtered.length }}
          onPrev={openIndex > 0 ? () => openCaseById(filtered[openIndex - 1].id) : null}
          onNext={openIndex < filtered.length - 1 ? () => openCaseById(filtered[openIndex + 1].id) : null}
          onClose={() => setOpenId(null)}
        />
      )}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  fontSize: 13,
  padding: '5px 10px',
  borderRadius: 6,
  background: 'var(--panel-2)',
  border: '1px solid var(--border)',
  color: 'var(--text)',
}

interface Section {
  /** Empty for the single ungrouped section. */
  key: string
  label: string
  /** Size of the whole section, which the heading reports even when paged. */
  total: number
  cases: CaseRollup[]
}

/**
 * Split the filtered list into the sections a grouping implies, preserving the
 * order the sort already put the cases in.
 *
 * Street sections are headed by whatever the address parses to — a street or a
 * named place, since both answer "where" — and the cases with no address at all
 * collect in one section that always sorts last, so the list ends with its gaps
 * rather than opening on them.
 */
function buildSections(cases: CaseRollup[], group: GroupKey): Section[] {
  if (group === 'none') return [{ key: '', label: '', total: cases.length, cases }]

  const byKey = new Map<string, Section>()
  for (const c of cases) {
    const { key, label } = group === 'street' ? streetSection(c) : alphaSection(c)
    let s = byKey.get(key)
    if (!s) byKey.set(key, (s = { key, label, total: 0, cases: [] }))
    s.cases.push(c)
    s.total += 1
  }

  if (group === 'street') mergeShortStreets(byKey, cases)

  return [...byKey.values()].sort((a, b) => {
    if (a.key === NO_ADDRESS) return 1
    if (b.key === NO_ADDRESS) return -1
    return a.label.localeCompare(b.label, undefined, { numeric: true, sensitivity: 'base' })
  })
}

/**
 * Fold a street written without its suffix into the full one — "9 Barnard" and
 * "13 Barnard Road" are the same street, and separate headings for each help
 * nobody.
 *
 * Only a section whose own name carries no suffix is a candidate, and only when
 * exactly one longer street name extends it. That second condition is what
 * keeps this safe: a bare "Whippoorwill" could be the Road or the Lane, and
 * both exist here, so it is left where it is rather than guessed at. Merged
 * cases are put back into the order the list is sorted in.
 */
function mergeShortStreets(byKey: Map<string, Section>, ordered: CaseRollup[]) {
  const keys = [...byKey.keys()]
  const rank = new Map(ordered.map((c, i) => [c.id, i]))

  for (const key of keys) {
    if (key === NO_ADDRESS || hasStreetSuffix(key)) continue
    const targets = keys.filter((k) => k !== key && k.startsWith(key + ' ') && hasStreetSuffix(k))
    if (targets.length !== 1) continue
    const from = byKey.get(key)
    const into = byKey.get(targets[0])
    if (!from || !into) continue
    into.cases = [...into.cases, ...from.cases].sort((a, b) => (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0))
    into.total += from.total
    byKey.delete(key)
  }
}

function streetSection(c: CaseRollup): { key: string; label: string } {
  const p = parseAddress(c.address)
  if (!p) return { key: NO_ADDRESS, label: NO_ADDRESS }
  return { key: p.key, label: p.name }
}

function alphaSection(c: CaseRollup): { key: string; label: string } {
  const ch = sortableName(c.name).charAt(0).toUpperCase()
  const letter = /[A-Z]/.test(ch) ? ch : '#'
  return { key: letter, label: letter }
}

/**
 * Initials of the section headings, as a row of jump targets. With 250-odd
 * streets a reader should not have to scroll to reach the S's, and with 737
 * matters the same is true of the letters.
 */
function JumpBar({ sections, onJump }: { sections: Section[]; onJump: (key: string) => void }) {
  const stops = useMemo(() => {
    const seen = new Map<string, string>()
    for (const s of sections) {
      if (s.key === NO_ADDRESS) continue
      const ch = s.label.trim().charAt(0).toUpperCase()
      const letter = /[A-Z]/.test(ch) ? ch : '#'
      if (!seen.has(letter)) seen.set(letter, s.key)
    }
    return [...seen.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [sections])

  if (stops.length < 2) return null
  return (
    <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', marginTop: 12 }}>
      <span className="muted" style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.05em', marginRight: 4 }}>
        Jump to
      </span>
      {stops.map(([letter, key]) => (
        <button
          key={letter}
          onClick={() => onJump(key)}
          style={{
            fontSize: 11.5, fontFamily: 'inherit', cursor: 'pointer',
            minWidth: 21, padding: '2px 4px', borderRadius: 5,
            border: '1px solid var(--border)', background: 'transparent', color: 'var(--text)',
          }}
        >
          {letter}
        </button>
      ))}
    </div>
  )
}

function toggle(s: Set<string>, v: string): Set<string> {
  const n = new Set(s)
  if (n.has(v)) n.delete(v)
  else n.add(v)
  return n
}

function comparator(sort: SortKey): (a: CaseRollup, b: CaseRollup) => number {
  switch (sort) {
    case 'name':
      return (a, b) =>
        sortableName(a.name).localeCompare(sortableName(b.name), undefined, { numeric: true, sensitivity: 'base' })
    case 'address':
      return (a, b) => compareAddress(a.address, b.address) || a.name.localeCompare(b.name)
    case 'firstSeen':
      return (a, b) => (a.firstSeen || '').localeCompare(b.firstSeen || '')
    case 'appearances':
      return (a, b) => b.appearances - a.appearances || (b.lastSeen || '').localeCompare(a.lastSeen || '')
    case 'sentiment':
      return (a, b) => a.avgSentiment - b.avgSentiment
    default:
      return (a, b) => (b.lastSeen || '').localeCompare(a.lastSeen || '')
  }
}

/** `CSS.escape` isn't on every target; the keys here only need quotes handled. */
function cssEscape(s: string): string {
  return s.replace(/["\\]/g, '\\$&')
}

function FacetRow({
  title,
  values,
  selected,
  onToggle,
}: {
  title: string
  values: { value: string; label: string; count: number }[]
  selected: Set<string>
  onToggle: (v: string) => void
}) {
  if (values.length === 0) return null
  return (
    <div>
      <div className="muted" style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
        {title}
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {values.map((v) => {
          const on = selected.has(v.value)
          return (
            <button
              key={v.value}
              onClick={() => onToggle(v.value)}
              aria-pressed={on}
              style={{
                fontSize: 12,
                padding: '3px 9px',
                borderRadius: 999,
                cursor: 'pointer',
                fontFamily: 'inherit',
                border: `1px solid ${on ? 'var(--primary)' : 'var(--border)'}`,
                background: on ? 'color-mix(in srgb, var(--primary) 14%, transparent)' : 'transparent',
                color: 'var(--text)',
              }}
            >
              {v.label} <span className="muted">{v.count}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/** Tiny sentiment trajectory sparkline (points over time). */
function Spark({ points, w = 88, h = 22 }: { points: number[]; w?: number; h?: number }) {
  if (points.length === 0) return null
  const n = points.length
  const x = (i: number) => (n === 1 ? w / 2 : (i / (n - 1)) * w)
  const y = (v: number) => h / 2 - (Math.max(-1, Math.min(1, v)) * (h / 2 - 2))
  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p).toFixed(1)}`).join(' ')
  return (
    <svg width={w} height={h} style={{ display: 'block' }} aria-hidden>
      <line x1={0} y1={h / 2} x2={w} y2={h / 2} stroke="var(--border)" strokeWidth={1} />
      {n > 1 && <path d={d} fill="none" stroke="var(--muted)" strokeWidth={1.5} />}
      {points.map((p, i) => (
        <circle key={i} cx={x(i)} cy={y(p)} r={2.5} fill={sentimentColor(p)} />
      ))}
    </svg>
  )
}

function StatusPill({ raw }: { raw: string | null }) {
  const b = statusBucket(raw)
  const cond = b === 'approved' && isConditional(raw)
  return (
    <span className="badge" style={{ fontSize: 10.5, flexShrink: 0 }} title={raw || undefined}>
      {STATUS_LABELS[b as StatusBucket]}
      {cond ? ' · with conditions' : ''}
    </span>
  )
}

/**
 * What a row is called under a street heading.
 *
 * Matters are usually named after their address, so with the street in the
 * heading and the number in the gutter, "45 Bedford Road — NCD Acquisitions /
 * Gateway Residential" spends most of its width saying what the reader can
 * already see. Trimming the repeated part leaves what actually distinguishes
 * the matter. A name that is *nothing but* an address keeps it, because there
 * would be nothing left to show.
 *
 * Only an exact match on the parsed street name is trimmed. A name that
 * abbreviates it ("45 Bedford Rd — …") is left alone rather than risk cutting
 * in the wrong place and stranding the abbreviation at the front.
 */
function rowTitle(c: CaseRollup, parsed: ParsedAddress | null): string {
  if (!parsed || parsed.kind !== 'street') return c.name
  const rest = sortableName(c.name)
  if (!rest.toLowerCase().startsWith(parsed.name.toLowerCase())) return c.name
  const cut = rest.slice(parsed.name.length).replace(/^[\s—–\-:,./|]+/, '').trim()
  return cut || c.name
}

/**
 * One line in the list. Under a street heading the house number leads, so the
 * numbers down the gutter read as a walk up the street.
 */
function CaseRow({
  c,
  group,
  first,
  active,
  onOpen,
}: {
  c: CaseRollup
  group: GroupKey
  first: boolean
  active: boolean
  onOpen: () => void
}) {
  const parsed = group === 'street' ? parseAddress(c.address) : null
  const lead = parsed?.number

  return (
    <button
      onClick={onOpen}
      style={{
        display: 'flex', gap: 10, alignItems: 'flex-start', width: '100%', textAlign: 'left',
        padding: '11px 14px', cursor: 'pointer', font: 'inherit', color: 'var(--text)',
        border: 'none', borderTop: first ? 'none' : '1px solid var(--border)',
        background: active ? 'color-mix(in srgb, var(--primary) 6%, transparent)' : 'transparent',
      }}
    >
      {lead && (
        <span style={{ fontSize: 13, fontWeight: 700, minWidth: 34, flexShrink: 0, lineHeight: 1.35 }}>{lead}</span>
      )}
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontWeight: 600, fontSize: 14, lineHeight: 1.35 }}>{rowTitle(c, parsed)}</span>
        {c.address && group !== 'street' && (
          <span className="muted" style={{ display: 'block', fontSize: 12, marginTop: 2 }}>{c.address}</span>
        )}
        <span style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 5, fontSize: 12, color: 'var(--muted)' }}>
          <StatusPill raw={c.lastStatus} />
          {c.applicationType && <span>{c.applicationType}</span>}
          <span>· {c.appearances} meeting{c.appearances === 1 ? '' : 's'}</span>
          {c.lastSeen && <span>· last {fmtDate(c.lastSeen)}</span>}
          <Spark points={c.trajectory.map((p) => p.sentiment)} />
        </span>
      </span>
      <span
        style={{ flexShrink: 0, ...sentimentChipStyle(c.avgSentiment) }}
        title={`${dispositionLabel(c.avgSentiment)} — how the board's recorded discussion read, not a decision`}
      >
        {fmtSent(c.avgSentiment)}
      </span>
    </button>
  )
}
