'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

/**
 * Every North Castle tax parcel — the county- and state-wide "Westchester
 * County Parcels" feature service (2024-2025 parcel data joined to the NYS
 * ORPTS assessment roll), filtered to just this town and paginated
 * server-side so a 4,800+ row town never has to load at once. Two views:
 * ranked by parcel (largest assessed value first) or rolled up by owner
 * (owners with multiple parcels combined). Search matches owner name or
 * address. Tapping a row expands it in place with fuller parcel detail;
 * tapping a parcel on the Assessment map above jumps this list to the page
 * that parcel falls on (switching to parcel mode and clearing any search)
 * and expands its row automatically.
 */
const PARCELS_BASE = 'https://services6.arcgis.com/EbVsqZ18sv1kVJ3k/arcgis/rest/services/Westchester_County_Parcels/FeatureServer/0'
const NC_WHERE = "MUNI_NAME='North Castle'"
const PAGE_SIZE = 50

type ViewMode = 'parcel' | 'owner'

interface ParcelRow {
  sbl: string
  address: string
  owner: string
  assessedValue: number
}

interface OwnerRow {
  owner: string
  parcels: number
  assessedValue: number
}

/** Raw attributes as they come back from a click on the map's Assessment
 *  layer (either the centroid or parcel-boundary layer) — both query
 *  `outFields=*`, so this is a loose subset. */
export interface SelectedParcelInfo {
  SBL?: unknown
  PARCEL_ADDR?: unknown
  PRIMARY_OWNER?: unknown
  TOTAL_AV?: unknown
  [key: string]: unknown
}

function fmtUSD(v: number): string {
  return `$${Math.round(v).toLocaleString('en-US')}`
}

/** Escapes single quotes for a single-quoted SQL string literal — the only
 *  special character these `where=` clauses need to worry about, since these
 *  values only ever feed a LIKE pattern against ArcGIS's own query endpoint. */
function sqlEscape(s: string): string {
  return s.replace(/'/g, "''")
}

/** Fuller parcel detail shown when a row (or the map-linked row) is expanded —
 *  fields beyond the four the base list query fetches, loaded on demand. */
function ParcelDetailPanel({ attrs, rollTotal }: { attrs: Record<string, unknown>; rollTotal: number | null }) {
  const sbl = attrs.SBL != null ? String(attrs.SBL) : null
  const propClass = attrs.PROP_CLASS != null ? String(attrs.PROP_CLASS).trim() : null
  const acres = typeof attrs.ACRES === 'number' ? attrs.ACRES : Number(attrs.ACRES ?? NaN)
  const landAv = typeof attrs.LAND_AV === 'number' ? attrs.LAND_AV : Number(attrs.LAND_AV ?? NaN)
  const fullMarket = typeof attrs.FULL_MARKET_VAL === 'number' ? attrs.FULL_MARKET_VAL : Number(attrs.FULL_MARKET_VAL ?? NaN)
  const totalAv = Number(attrs.TOTAL_AV ?? 0)
  const fields: { label: string; value: string }[] = [
    ...(sbl ? [{ label: 'SBL', value: sbl }] : []),
    ...(propClass ? [{ label: 'Property class', value: propClass }] : []),
    ...(!isNaN(acres) && acres > 0 ? [{ label: 'Acres', value: acres.toFixed(2) }] : []),
    ...(!isNaN(landAv) && landAv > 0 ? [{ label: 'Land value', value: fmtUSD(landAv) }] : []),
    ...(!isNaN(fullMarket) && fullMarket > 0 ? [{ label: 'Full market value', value: fmtUSD(fullMarket) }] : []),
    ...(rollTotal ? [{ label: '% of Roll', value: `${((totalAv / rollTotal) * 100).toFixed(2)}%` }] : []),
  ]
  return (
    <div style={{ padding: '4px 10px 12px 10px', background: 'var(--panel-2)', display: 'flex', flexWrap: 'wrap', gap: '4px 20px' }}>
      {fields.length === 0 ? (
        <span className="muted" style={{ fontSize: 12 }}>No additional detail available.</span>
      ) : fields.map((f) => (
        <div key={f.label} style={{ fontSize: 12 }}>
          <span className="muted">{f.label}: </span>
          <span style={{ fontWeight: 600 }}>{f.value}</span>
        </div>
      ))}
    </div>
  )
}

export default function AllTaxParcelsList({ selectedParcel }: { selectedParcel?: SelectedParcelInfo | null }) {
  const [mode, setMode] = useState<ViewMode>('parcel')
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [total, setTotal] = useState<number | null>(null)
  const [rollTotal, setRollTotal] = useState<number | null>(null)
  const [parcelRows, setParcelRows] = useState<ParcelRow[] | null>(null)
  const [ownerRows, setOwnerRows] = useState<OwnerRow[] | null>(null)
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading')
  const [expandedSbl, setExpandedSbl] = useState<string | null>(null)
  const [detailCache, setDetailCache] = useState<Record<string, Record<string, unknown>>>({})
  const containerRef = useRef<HTMLDivElement | null>(null)

  // Debounce the search box so every keystroke doesn't fire a query — skipped
  // once searchInput already matches the committed `search` (true right after
  // a programmatic clear from a map click, so that doesn't also reset the page).
  useEffect(() => {
    const trimmed = searchInput.trim()
    if (trimmed === search) return
    const t = setTimeout(() => { setSearch(trimmed); setPage(0) }, 350)
    return () => clearTimeout(t)
  }, [searchInput, search])

  // Town-wide roll total (all North Castle parcels' assessed value, unfiltered
  // by search) — the denominator for every row's "% of Roll", fetched once.
  useEffect(() => {
    let cancelled = false
    fetch(`${PARCELS_BASE}/query?where=${encodeURIComponent(NC_WHERE)}&outStatistics=${encodeURIComponent(JSON.stringify([{ statisticType: 'sum', onStatisticField: 'TOTAL_AV', outStatisticFieldName: 'total' }]))}&f=json`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('roll total'))))
      .then((j: { features?: { attributes: { total?: number } }[] }) => {
        if (!cancelled) setRollTotal(j.features?.[0]?.attributes.total ?? null)
      })
      .catch(() => { /* % of Roll just won't render */ })
    return () => { cancelled = true }
  }, [])

  // A tap on the map: jump the list to that parcel's page (by rank in the
  // unfiltered, value-sorted order) and expand its row once loaded.
  useEffect(() => {
    if (!selectedParcel) return
    const sbl = selectedParcel.SBL != null ? String(selectedParcel.SBL) : ''
    if (!sbl) return
    const value = Number(selectedParcel.TOTAL_AV ?? 0)
    setMode('parcel')
    setSearchInput('')
    setSearch('')
    setDetailCache((prev) => ({ ...prev, [sbl]: selectedParcel }))
    setExpandedSbl(sbl)
    containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    let cancelled = false
    // Rank = how many parcels (townwide, unfiltered) have a strictly greater
    // assessed value — same order the list itself sorts by, so this lands on
    // (or, for parcels tied on assessed value, very near) the right page.
    fetch(`${PARCELS_BASE}/query?where=${encodeURIComponent(`${NC_WHERE} AND TOTAL_AV > ${value}`)}&returnCountOnly=true&f=json`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('rank'))))
      .then((j: { count?: number }) => {
        if (cancelled) return
        setPage(Math.floor((j.count ?? 0) / PAGE_SIZE))
      })
      .catch(() => { /* leave page as-is */ })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fires per distinct click, not per render
  }, [selectedParcel])

  const whereClause = useMemo(() => {
    if (!search) return NC_WHERE
    const esc = sqlEscape(search)
    return `${NC_WHERE} AND (UPPER(PRIMARY_OWNER) LIKE UPPER('%${esc}%') OR UPPER(PARCEL_ADDR) LIKE UPPER('%${esc}%'))`
  }, [search])

  // Total row count for the active mode+search (drives pagination) — parcel
  // mode only; a distinct-owner count isn't a plain ArcGIS statistic, so
  // owner mode just disables Next once a page comes back short instead.
  useEffect(() => {
    let cancelled = false
    if (mode !== 'parcel') { setTotal(null); return }
    fetch(`${PARCELS_BASE}/query?where=${encodeURIComponent(whereClause)}&returnCountOnly=true&f=json`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('count'))))
      .then((j: { count?: number }) => { if (!cancelled) setTotal(j.count ?? null) })
      .catch(() => { /* total stays null; pagination still works page-by-page */ })
    return () => { cancelled = true }
  }, [mode, whereClause])

  useEffect(() => {
    let cancelled = false
    setStatus('loading')
    if (mode === 'parcel') {
      const url =
        `${PARCELS_BASE}/query?where=${encodeURIComponent(whereClause)}` +
        `&outFields=SBL,PARCEL_ADDR,PRIMARY_OWNER,TOTAL_AV` +
        `&orderByFields=TOTAL_AV+DESC&resultOffset=${page * PAGE_SIZE}&resultRecordCount=${PAGE_SIZE}` +
        `&returnGeometry=false&f=json`
      fetch(url)
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error('query'))))
        .then((j: { features?: { attributes: Record<string, unknown> }[] }) => {
          if (cancelled) return
          const feats = j.features ?? []
          setParcelRows(feats.map((f) => ({
            sbl: String(f.attributes.SBL ?? ''),
            address: String(f.attributes.PARCEL_ADDR ?? '').trim() || '—',
            owner: String(f.attributes.PRIMARY_OWNER ?? '').trim() || '—',
            assessedValue: Number(f.attributes.TOTAL_AV ?? 0),
          })))
          setStatus('ok')
        })
        .catch(() => { if (!cancelled) setStatus('error') })
    } else {
      const url =
        `${PARCELS_BASE}/query?where=${encodeURIComponent(whereClause)}` +
        `&groupByFieldsForStatistics=PRIMARY_OWNER` +
        `&outStatistics=${encodeURIComponent(JSON.stringify([
          { statisticType: 'sum', onStatisticField: 'TOTAL_AV', outStatisticFieldName: 'total' },
          { statisticType: 'count', onStatisticField: 'OBJECTID', outStatisticFieldName: 'cnt' },
        ]))}` +
        `&orderByFields=total+DESC&resultOffset=${page * PAGE_SIZE}&resultRecordCount=${PAGE_SIZE}&f=json`
      fetch(url)
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error('query'))))
        .then((j: { features?: { attributes: { PRIMARY_OWNER?: string; total?: number; cnt?: number } }[] }) => {
          if (cancelled) return
          const feats = j.features ?? []
          setOwnerRows(feats.map((f) => ({
            owner: String(f.attributes.PRIMARY_OWNER ?? '').trim() || '—',
            parcels: f.attributes.cnt ?? 0,
            assessedValue: f.attributes.total ?? 0,
          })))
          setStatus('ok')
        })
        .catch(() => { if (!cancelled) setStatus('error') })
    }
    return () => { cancelled = true }
  }, [mode, whereClause, page])

  async function ensureDetail(sbl: string) {
    if (!sbl || detailCache[sbl]) return
    try {
      const r = await fetch(`${PARCELS_BASE}/query?where=${encodeURIComponent(`SBL='${sqlEscape(sbl)}'`)}&outFields=*&returnGeometry=false&f=json`)
      if (!r.ok) return
      const j = (await r.json()) as { features?: { attributes: Record<string, unknown> }[] }
      const attrs = j.features?.[0]?.attributes
      if (attrs) setDetailCache((prev) => ({ ...prev, [sbl]: attrs }))
    } catch { /* expand panel just shows what little the row already has */ }
  }

  function toggleRow(sbl: string) {
    if (!sbl) return
    if (expandedSbl === sbl) { setExpandedSbl(null); return }
    setExpandedSbl(sbl)
    ensureDetail(sbl)
  }

  const rows = mode === 'parcel' ? parcelRows : ownerRows
  const pageCount = mode === 'parcel' && total != null ? Math.max(1, Math.ceil(total / PAGE_SIZE)) : null
  const rangeStart = page * PAGE_SIZE + 1
  const rangeEnd = mode === 'parcel' && total != null ? Math.min(total, rangeStart + PAGE_SIZE - 1) : rangeStart + (rows?.length ?? 0) - 1
  const hasNext = mode === 'parcel'
    ? (pageCount != null ? page + 1 < pageCount : (rows?.length ?? 0) >= PAGE_SIZE)
    : (rows?.length ?? 0) >= PAGE_SIZE

  return (
    <div ref={containerRef}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
        <div style={{ display: 'inline-flex', borderRadius: 8, border: '1px solid var(--border)', overflow: 'hidden' }}>
          {(['parcel', 'owner'] as ViewMode[]).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setPage(0) }}
              style={{
                padding: '5px 12px', fontSize: 12.5, fontWeight: 600, border: 'none', cursor: 'pointer',
                background: mode === m ? 'var(--primary)' : 'transparent',
                color: mode === m ? '#fff' : 'var(--text)',
              }}
            >
              {m === 'parcel' ? 'By parcel' : 'By owner'}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search owner or address…"
          className="input"
          style={{ flex: '1 1 220px', maxWidth: 320, fontSize: 12.5, padding: '5px 10px' }}
        />
      </div>

      <div className="muted" style={{ fontSize: 11.5, marginBottom: 8 }}>
        {status === 'loading' && !rows
          ? 'Loading…'
          : mode === 'parcel' && total != null
            ? <>Showing {rangeStart.toLocaleString()}–{Math.max(rangeStart, rangeEnd).toLocaleString()} of {total.toLocaleString()} parcels, largest assessed value first.</>
            : mode === 'owner' && rows
              ? <>Owners {rangeStart.toLocaleString()}–{Math.max(rangeStart, rangeEnd).toLocaleString()}, largest total assessed value first.</>
              : 'Loading…'}
      </div>

      <div style={{ maxHeight: 480, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 8 }}>
        <div
          style={{
            position: 'sticky', top: 0, zIndex: 1, display: 'flex', gap: 8, alignItems: 'center',
            padding: '7px 10px', fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em',
            color: 'var(--muted)', background: 'var(--panel)', borderBottom: '1px solid var(--border)',
          }}
        >
          <span style={{ flex: 1.3 }}>Owner</span>
          <span style={{ flex: 1 }}>{mode === 'parcel' ? 'Address' : 'Parcels'}</span>
          <span style={{ width: 100, textAlign: 'right', flexShrink: 0 }}>{mode === 'parcel' ? 'Assessed' : 'Total assessed'}</span>
          <span style={{ width: 66, textAlign: 'right', flexShrink: 0 }}>% of Roll</span>
        </div>

        {status === 'loading' && !rows && (
          <div className="muted" style={{ padding: 20, fontSize: 12.5, textAlign: 'center' }}>Loading…</div>
        )}
        {status === 'error' && (
          <div className="muted" style={{ padding: 20, fontSize: 12.5, textAlign: 'center' }}>Unable to load parcel data right now.</div>
        )}
        {status === 'ok' && rows && rows.length === 0 && (
          <div className="muted" style={{ padding: 20, fontSize: 12.5, textAlign: 'center' }}>No matches.</div>
        )}

        {mode === 'parcel' && parcelRows?.map((row, i) => (
          <div key={row.sbl || i}>
            <div
              onClick={() => toggleRow(row.sbl)}
              style={{
                display: 'flex', gap: 8, alignItems: 'flex-start', padding: '7px 10px', fontSize: 12.5, cursor: row.sbl ? 'pointer' : 'default',
                borderBottom: expandedSbl === row.sbl || i < parcelRows.length - 1 ? '1px solid var(--border)' : 'none',
                background: row.sbl && row.sbl === expandedSbl ? 'var(--panel-2)' : 'transparent',
              }}
            >
              <span style={{ flex: 1.3, minWidth: 0 }}>{row.owner}</span>
              <span className="muted" style={{ flex: 1, minWidth: 0 }}>{row.address}</span>
              <span style={{ width: 100, textAlign: 'right', flexShrink: 0, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                {fmtUSD(row.assessedValue)}
              </span>
              <span className="muted" style={{ width: 66, textAlign: 'right', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
                {rollTotal ? `${((row.assessedValue / rollTotal) * 100).toFixed(2)}%` : '—'}
              </span>
            </div>
            {row.sbl && expandedSbl === row.sbl && (
              <ParcelDetailPanel attrs={detailCache[row.sbl] ?? { ...row, TOTAL_AV: row.assessedValue }} rollTotal={rollTotal} />
            )}
          </div>
        ))}

        {mode === 'owner' && ownerRows?.map((row, i) => (
          <div
            key={`${row.owner}-${i}`}
            style={{
              display: 'flex', gap: 8, alignItems: 'flex-start', padding: '7px 10px', fontSize: 12.5,
              borderBottom: i < ownerRows.length - 1 ? '1px solid var(--border)' : 'none',
            }}
          >
            <span style={{ flex: 1.3, minWidth: 0 }}>{row.owner}</span>
            <span className="muted" style={{ flex: 1, minWidth: 0 }}>{row.parcels} parcel{row.parcels === 1 ? '' : 's'}</span>
            <span style={{ width: 100, textAlign: 'right', flexShrink: 0, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
              {fmtUSD(row.assessedValue)}
            </span>
            <span className="muted" style={{ width: 66, textAlign: 'right', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
              {rollTotal ? `${((row.assessedValue / rollTotal) * 100).toFixed(2)}%` : '—'}
            </span>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>
        <button
          className="btn secondary"
          disabled={page === 0}
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          style={{ padding: '4px 10px', fontSize: 12.5 }}
        >
          ← Prev
        </button>
        <span className="muted" style={{ fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>
          Page {page + 1}{pageCount != null ? ` of ${pageCount}` : ''}
        </span>
        <button
          className="btn secondary"
          disabled={!hasNext}
          onClick={() => setPage((p) => p + 1)}
          style={{ padding: '4px 10px', fontSize: 12.5 }}
        >
          Next →
        </button>
      </div>

      <div className="muted" style={{ fontSize: 10.5, marginTop: 10 }}>
        Source: NYS ITS Geospatial Services / Westchester County — 2024-2025 parcel data joined to the NYS ORPTS assessment
        roll. Includes exempt parcels (schools, government land), which don&rsquo;t actually pay property tax despite
        carrying an assessed value. Tap a row for more detail. &ldquo;% of Roll&rdquo; is each row&rsquo;s share of the
        Town&rsquo;s entire{rollTotal ? ` ${fmtUSD(rollTotal)}` : ''} taxable assessment roll.
      </div>
    </div>
  )
}
