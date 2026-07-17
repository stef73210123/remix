'use client'

import { useEffect, useState } from 'react'

/**
 * Every North Castle tax parcel, ranked by assessed value — the county- and
 * state-wide "Westchester County Parcels" feature service (2024-2025 parcel
 * data joined to the NYS ORPTS assessment roll), filtered to just this town
 * and paginated server-side so a 4,800+ row town never has to load at once.
 * Complements the curated Top 50 Taxpayers schedule above with the complete,
 * parcel-level (not owner-rolled-up) picture — including exempt parcels
 * (schools, government land), which is why this is titled "parcels" rather
 * than "taxpayers".
 */
const PARCELS_BASE = 'https://services6.arcgis.com/EbVsqZ18sv1kVJ3k/arcgis/rest/services/Westchester_County_Parcels/FeatureServer/0'
const NC_WHERE = "MUNI_NAME='North Castle'"
const PAGE_SIZE = 50

interface ParcelRow {
  sbl: string
  address: string
  owner: string
  propClass: string
  assessedValue: number
  acres: number
}

function fmtUSD(v: number): string {
  return `$${Math.round(v).toLocaleString('en-US')}`
}

export default function AllTaxParcelsList() {
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState<number | null>(null)
  const [rows, setRows] = useState<ParcelRow[] | null>(null)
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading')

  useEffect(() => {
    let cancelled = false
    fetch(`${PARCELS_BASE}/query?where=${encodeURIComponent(NC_WHERE)}&returnCountOnly=true&f=json`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('count'))))
      .then((j: { count?: number }) => { if (!cancelled) setTotal(j.count ?? null) })
      .catch(() => { /* total stays null; pagination still works page-by-page */ })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    let cancelled = false
    setStatus('loading')
    const url =
      `${PARCELS_BASE}/query?where=${encodeURIComponent(NC_WHERE)}` +
      `&outFields=SBL,PARCEL_ADDR,PRIMARY_OWNER,PROP_CLASS,TOTAL_AV,ACRES` +
      `&orderByFields=TOTAL_AV+DESC&resultOffset=${page * PAGE_SIZE}&resultRecordCount=${PAGE_SIZE}` +
      `&returnGeometry=false&f=json`
    fetch(url)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('query'))))
      .then((j: { features?: { attributes: Record<string, unknown> }[] }) => {
        if (cancelled) return
        const feats = j.features ?? []
        setRows(feats.map((f) => ({
          sbl: String(f.attributes.SBL ?? ''),
          address: String(f.attributes.PARCEL_ADDR ?? '').trim() || '—',
          owner: String(f.attributes.PRIMARY_OWNER ?? '').trim() || '—',
          propClass: String(f.attributes.PROP_CLASS ?? '—'),
          assessedValue: Number(f.attributes.TOTAL_AV ?? 0),
          acres: Number(f.attributes.ACRES ?? 0),
        })))
        setStatus('ok')
      })
      .catch(() => { if (!cancelled) setStatus('error') })
    return () => { cancelled = true }
  }, [page])

  const pageCount = total != null ? Math.max(1, Math.ceil(total / PAGE_SIZE)) : null
  const rangeStart = page * PAGE_SIZE + 1
  const rangeEnd = total != null ? Math.min(total, rangeStart + PAGE_SIZE - 1) : rangeStart + (rows?.length ?? 0) - 1

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 10 }}>
        <div className="muted" style={{ fontSize: 11.5 }}>
          {total != null
            ? <>Showing {rangeStart.toLocaleString()}–{rangeEnd.toLocaleString()} of {total.toLocaleString()} parcels, largest assessed value first.</>
            : 'Loading parcel count…'}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
            disabled={pageCount != null ? page + 1 >= pageCount : (rows?.length ?? 0) < PAGE_SIZE}
            onClick={() => setPage((p) => p + 1)}
            style={{ padding: '4px 10px', fontSize: 12.5 }}
          >
            Next →
          </button>
        </div>
      </div>

      <div style={{ maxHeight: 420, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 8 }}>
        <div
          style={{
            position: 'sticky', top: 0, zIndex: 1, display: 'flex', gap: 8, alignItems: 'center',
            padding: '7px 10px', fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em',
            color: 'var(--muted)', background: 'var(--panel)', borderBottom: '1px solid var(--border)',
          }}
        >
          <span style={{ width: 32, flexShrink: 0 }}>#</span>
          <span style={{ flex: 1 }}>Address</span>
          <span style={{ flex: 1 }}>Owner</span>
          <span style={{ width: 60, textAlign: 'right', flexShrink: 0 }}>Class</span>
          <span style={{ width: 60, textAlign: 'right', flexShrink: 0 }}>Acres</span>
          <span style={{ width: 100, textAlign: 'right', flexShrink: 0 }}>Assessed</span>
        </div>

        {status === 'loading' && !rows && (
          <div className="muted" style={{ padding: 20, fontSize: 12.5, textAlign: 'center' }}>Loading parcels…</div>
        )}
        {status === 'error' && (
          <div className="muted" style={{ padding: 20, fontSize: 12.5, textAlign: 'center' }}>Unable to load parcel data right now.</div>
        )}
        {rows && rows.map((row, i) => (
          <div
            key={row.sbl || i}
            style={{
              display: 'flex', gap: 8, alignItems: 'flex-start', padding: '7px 10px', fontSize: 12.5,
              borderBottom: i < rows.length - 1 ? '1px solid var(--border)' : 'none',
            }}
          >
            <span className="muted" style={{ width: 32, flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>{rangeStart + i}</span>
            <span style={{ flex: 1, minWidth: 0 }}>{row.address}</span>
            <span style={{ flex: 1, minWidth: 0 }}>{row.owner}</span>
            <span className="muted" style={{ width: 60, textAlign: 'right', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>{row.propClass}</span>
            <span className="muted" style={{ width: 60, textAlign: 'right', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>{row.acres ? row.acres.toFixed(2) : '—'}</span>
            <span style={{ width: 100, textAlign: 'right', flexShrink: 0, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{fmtUSD(row.assessedValue)}</span>
          </div>
        ))}
      </div>
      <div className="muted" style={{ fontSize: 10.5, marginTop: 6 }}>
        Source: NYS ITS Geospatial Services / Westchester County — 2024-2025 parcel data joined to the NYS ORPTS assessment
        roll. &ldquo;Class&rdquo; is the NYS property classification code; includes exempt parcels (schools, government
        land), which don&rsquo;t actually pay property tax despite carrying an assessed value.
      </div>
    </div>
  )
}
