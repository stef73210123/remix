'use client'

import { useCallback, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import type { AnalysisDataset, CaseRollup, MemberProfile } from '@/lib/municipal/analysis'
import type { PermitMarker } from '../JurisdictionMap'
import { sentimentColor, sentimentChipStyle, fmtSent, dispositionLabel } from '../sentiment'
import { propertyId } from '@/lib/municipal/propertyId'
import { fmtDateShort } from '@/lib/municipal/date'
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

type SortKey = 'lastSeen' | 'firstSeen' | 'appearances' | 'name' | 'sentiment'

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'lastSeen', label: 'Most recent' },
  { key: 'firstSeen', label: 'Oldest' },
  { key: 'appearances', label: 'Most meetings' },
  { key: 'name', label: 'Name' },
  { key: 'sentiment', label: 'Most critical' },
]

/** Rows shown before the list asks you to load the rest. */
const PAGE = 40

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
 * year filters the map and the list together, clicking a pin opens the row and
 * clicking a row flies the map to the pin. The count in the header is always
 * the honest one — how many of the board's total this view is showing.
 *
 * Detail answers "what happened and what can I read". Each appearance carries
 * the board's own summary and, where the meeting has published documents, links
 * to that night's agenda packet and minutes. Note the limit: the Town publishes
 * one PDF per meeting, not per submittal, so an appearance links the packet the
 * item sat in rather than the item's own drawings. Cases are matched to
 * meetings by date, which is what the two datasets share.
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
  const [status, setStatus] = useState<Set<string>>(new Set())
  const [types, setTypes] = useState<Set<string>>(new Set())
  const [themes, setThemes] = useState<Set<string>>(new Set())
  const [years, setYears] = useState<Set<string>>(new Set())
  const [recurringOnly, setRecurringOnly] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)
  const [limit, setLimit] = useState(PAGE)
  const [showFilters, setShowFilters] = useState(false)

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

  const activeCount = status.size + types.size + themes.size + years.size + (recurringOnly ? 1 : 0)
  const shown = filtered.slice(0, limit)

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

  // Opening from the map has to reveal the row too — a selected case sitting
  // past the current page would otherwise highlight nothing.
  const handleMarkerClick = useCallback(
    (p: PermitMarker) => {
      setOpenId(p.id)
      const idx = filtered.findIndex((c) => c.id === p.id)
      if (idx >= limit) setLimit(Math.ceil((idx + 1) / PAGE) * PAGE)
    },
    [filtered, limit],
  )

  function reset() {
    setStatus(new Set())
    setTypes(new Set())
    setThemes(new Set())
    setYears(new Set())
    setRecurringOnly(false)
    setQuery('')
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
        onPermitClick={handleMarkerClick}
        flyToPermit={selectedMarker}
      />

      <div className="card" style={{ padding: 0, marginTop: 14 }}>
        {shown.length === 0 ? (
          <div className="muted" style={{ padding: 16, fontSize: 13 }}>
            Nothing matches. {activeCount > 0 || query ? 'Try clearing a filter.' : ''}
          </div>
        ) : (
          shown.map((c, i) => (
            <CaseRow
              key={c.id}
              c={c}
              members={data.members}
              muni={muni}
              first={i === 0}
              open={openId === c.id}
              docsByDate={docsByDate}
              onToggle={() => setOpenId(openId === c.id ? null : c.id)}
            />
          ))
        )}
      </div>
      {filtered.length > shown.length && (
        <button
          className="btn secondary"
          onClick={() => setLimit((n) => n + PAGE * 2)}
          style={{ marginTop: 10, padding: '5px 11px', fontSize: 12.5 }}
        >
          Show {Math.min(PAGE * 2, filtered.length - shown.length)} more of {filtered.length - shown.length}
        </button>
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

function toggle(s: Set<string>, v: string): Set<string> {
  const n = new Set(s)
  if (n.has(v)) n.delete(v)
  else n.add(v)
  return n
}

function comparator(sort: SortKey): (a: CaseRollup, b: CaseRollup) => number {
  switch (sort) {
    case 'name':
      return (a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
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

function fmtDate(iso: string): string {
  const d = new Date(iso + (iso.length === 10 ? 'T12:00:00Z' : ''))
  return isNaN(d.getTime()) ? iso : fmtDateShort(d)
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

function CaseRow({
  c,
  members,
  muni,
  first,
  open,
  docsByDate,
  onToggle,
}: {
  c: CaseRollup
  members: MemberProfile[]
  muni: string
  first: boolean
  open: boolean
  docsByDate: Map<string, MeetingDoc['assets']>
  onToggle: () => void
}) {
  const propId = c.address ? propertyId(c.address) : ''
  const tags = typeTags(c.applicationType)

  const stances = useMemo(
    () =>
      members
        .map((mem) => {
          const bc = mem.byCase.find((x) => x.caseId === c.id)
          if (!bc) return null
          return {
            member: mem.member,
            avgSentiment: bc.avgSentiment,
            count: bc.count,
            quotes: mem.evidence.filter((e) => e.caseId === c.id),
          }
        })
        .filter((x): x is NonNullable<typeof x> => x !== null)
        .sort((a, b) => b.avgSentiment - a.avgSentiment),
    [members, c.id],
  )

  return (
    <div style={{ borderTop: first ? 'none' : '1px solid var(--border)', background: open ? 'color-mix(in srgb, var(--primary) 4%, transparent)' : undefined }}>
      <div onClick={onToggle} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '12px 14px', cursor: 'pointer' }}>
        <span className="muted" style={{ fontSize: 13, lineHeight: '20px', width: 10, flexShrink: 0 }}>{open ? '▾' : '▸'}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 14, lineHeight: 1.35 }}>{c.name}</div>
          {c.address && <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{c.address}</div>}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 5, fontSize: 12, color: 'var(--muted)' }}>
            <StatusPill raw={c.lastStatus} />
            {c.applicationType && <span>{c.applicationType}</span>}
            <span>· {c.appearances} meeting{c.appearances === 1 ? '' : 's'}</span>
            {c.lastSeen && <span>· last {fmtDate(c.lastSeen)}</span>}
            <Spark points={c.trajectory.map((p) => p.sentiment)} />
          </div>
        </div>
        <span
          style={{ flexShrink: 0, ...sentimentChipStyle(c.avgSentiment) }}
          title={`${dispositionLabel(c.avgSentiment)} — how the board's recorded discussion read, not a decision`}
        >
          {fmtSent(c.avgSentiment)}
        </span>
      </div>

      {open && (
        <div style={{ background: 'var(--panel-2)', padding: '6px 14px 14px 32px' }}>
          {(c.applicant || tags.length > 0) && (
            <div className="muted" style={{ fontSize: 12, marginBottom: 8 }}>
              {c.applicant ? `Applicant: ${c.applicant}` : ''}
              {c.applicant && tags.length ? ' · ' : ''}
              {tags.join(' · ')}
            </div>
          )}
          {propId && (
            <a href={`/admin/municipal/property?muni=${muni}&id=${propId}`} style={{ display: 'inline-block', fontSize: 12, color: 'var(--primary-light)', marginBottom: 12 }}>
              Property profile →
            </a>
          )}
          {c.themes.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
              {c.themes.map((t) => <span key={t} className="badge" style={{ fontSize: 11 }}>{t}</span>)}
            </div>
          )}

          {stances.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <SubHead>How members talked about it</SubHead>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {stances.map((s) => (
                  <div key={s.member} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13 }}>
                    <span style={{ width: 130, flexShrink: 0, fontWeight: 600 }}>{s.member}</span>
                    <span style={{ ...sentimentChipStyle(s.avgSentiment), flexShrink: 0 }}>{fmtSent(s.avgSentiment)}</span>
                    <span style={{ flex: 1 }}>
                      {s.quotes.length > 0 ? (
                        <span className="muted">{s.quotes.map((q) => q.evidence).join(' ')}</span>
                      ) : (
                        <span className="muted" style={{ fontStyle: 'italic' }}>{s.count} remark{s.count === 1 ? '' : 's'}, no quote captured</span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <SubHead>Across meetings</SubHead>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {c.timeline.map((ap, i) => {
              const assets = docsByDate.get((ap.date || '').slice(0, 10)) || []
              return (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13 }}>
                  <span className="muted" style={{ width: 52, flexShrink: 0, whiteSpace: 'nowrap' }}>{fmtDate(ap.date)}</span>
                  <span style={{ ...sentimentChipStyle(ap.sentiment), flexShrink: 0 }}>{fmtSent(ap.sentiment)}</span>
                  <span style={{ flex: 1 }}>
                    {ap.status && <span style={{ fontWeight: 600 }}>{ap.status}. </span>}
                    <span className="muted">{ap.summary}</span>
                    {assets.length > 0 && (
                      <span style={{ display: 'inline-flex', gap: 6, flexWrap: 'wrap', marginLeft: 6, verticalAlign: 'middle' }}>
                        {assets.map((a, j) => {
                          const href = a.blobUrl || a.sourceUrl || ''
                          if (!href) return null
                          const label = a.kind.charAt(0).toUpperCase() + a.kind.slice(1)
                          return (
                            <a
                              key={j}
                              href={href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="badge state"
                              style={{ textDecoration: 'none', fontSize: 10.5 }}
                              title={`That meeting's ${a.kind}${a.pageCount ? ` — ${a.pageCount} pages` : ''}`}
                            >
                              {label} ↗
                            </a>
                          )
                        })}
                      </span>
                    )}
                  </span>
                </div>
              )
            })}
          </div>
          <div className="muted" style={{ fontSize: 10.5, marginTop: 10, lineHeight: 1.5, maxWidth: 680 }}>
            Document links open the whole agenda packet or minutes for that meeting — the Town
            publishes one file per meeting rather than one per submittal.
          </div>
        </div>
      )}
    </div>
  )
}

function SubHead({ children }: { children: React.ReactNode }) {
  return (
    <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
      {children}
    </div>
  )
}
