'use client'

import { useEffect, useMemo, useState } from 'react'

/**
 * Every North Castle tax parcel — the county- and state-wide "Westchester
 * County Parcels" feature service (2024-2025 parcel data joined to the NYS
 * ORPTS assessment roll), filtered to just this town and paginated
 * server-side so a 4,800+ row town never has to load at once. Two views:
 * ranked by parcel (largest assessed value first) or rolled up by owner
 * (owners with multiple parcels combined). Search matches owner name or
 * address; clicking a parcel on the Assessment map above surfaces it here
 * via `selectedParcel`, regardless of the current search/page.
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
 *  layer — that layer queries `outFields=*`, so this is a loose subset. */
export interface SelectedParcelInfo {
  SBL?: unknown
  PARCEL_ADDR?: unknown
  PRIMARY_OWNER?: unknown
  TOTAL_AV?: unknown
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

  // Debounce the search box so every keystroke doesn't fire a query.
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput.trim()); setPage(0) }, 350)
    return () => clearTimeout(t)
  }, [searchInput])

  useEffect(() => { setPage(0) }, [mode])

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

  const rows = mode === 'parcel' ? parcelRows : ownerRows
  const pageCount = mode === 'parcel' && total != null ? Math.max(1, Math.ceil(total / PAGE_SIZE)) : null
  const rangeStart = page * PAGE_SIZE + 1
  const rangeEnd = mode === 'parcel' && total != null ? Math.min(total, rangeStart + PAGE_SIZE - 1) : rangeStart + (rows?.length ?? 0) - 1
  const hasNext = mode === 'parcel'
    ? (pageCount != null ? page + 1 < pageCount : (rows?.length ?? 0) >= PAGE_SIZE)
    : (rows?.length ?? 0) >= PAGE_SIZE

  const selected = useMemo(() => {
    if (!selectedParcel) return null
    return {
      sbl: selectedParcel.SBL != null ? String(selectedParcel.SBL) : '',
      address: selectedParcel.PARCEL_ADDR != null ? String(selectedParcel.PARCEL_ADDR).trim() || '—' : '—',
      owner: selectedParcel.PRIMARY_OWNER != null ? String(selectedParcel.PRIMARY_OWNER).trim() || '—' : '—',
      assessedValue: Number(selectedParcel.TOTAL_AV ?? 0),
    }
  }, [selectedParcel])

  return (
    <div>
      {selected && (
        <div
          style={{
            display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10,
            padding: '10px 12px', marginBottom: 12, borderRadius: 8,
            background: 'var(--panel-2)', border: '1px solid var(--border)',
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div className="muted" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>
              Selected from map
            </div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{selected.owner}</div>
            <div className="muted" style={{ fontSize: 12.5 }}>{selected.address}</div>
            <div style={{ fontSize: 13, marginTop: 2 }}>
              {fmtUSD(selected.assessedValue)} assessed
              {rollTotal ? <span className="muted"> · {((selected.assessedValue / rollTotal) * 100).toFixed(2)}% of roll</span> : null}
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
        <div style={{ display: 'inline-flex', borderRadius: 8, border: '1px solid var(--border)', overflow: 'hidden' }}>
          {(['parcel', 'owner'] as ViewMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
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

      <div style={{ maxHeight: 420, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 8 }}>
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
          <div
            key={row.sbl || i}
            style={{
              display: 'flex', gap: 8, alignItems: 'flex-start', padding: '7px 10px', fontSize: 12.5,
              borderBottom: i < parcelRows.length - 1 ? '1px solid var(--border)' : 'none',
              background: selected && row.sbl && row.sbl === selected.sbl ? 'var(--panel-2)' : 'transparent',
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
        carrying an assessed value. &ldquo;% of Roll&rdquo; is each row&rsquo;s share of the Town&rsquo;s entire
        {rollTotal ? ` ${fmtUSD(rollTotal)}` : ''} taxable assessment roll.
      </div>
    </div>
  )
}
