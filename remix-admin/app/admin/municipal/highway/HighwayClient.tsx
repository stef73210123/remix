'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import MuniHeader from '@/app/admin/municipal/MuniHeader'
import MuniTabs from '@/app/admin/municipal/MuniTabs'
import Breadcrumbs, { type Crumb } from '../Breadcrumbs'
import BoardStaffCards from '../board/BoardStaffCards'
import BoardKeyDocs from '../board/BoardKeyDocs'
import DeptTimeline from '../DeptTimeline'
import ServiceRequests from '../ServiceRequests'
import { ROAD_CATS } from '@/lib/municipal/roadCats'
import { NC_PUBLIC_PARKING } from '@/lib/municipal/parking'
import { isOpen } from '@/lib/flavor'

const JurisdictionMap = dynamic(() => import('@/app/admin/municipal/JurisdictionMap'), {
  ssr: false,
  loading: () => <div className="card" style={{ height: 440, marginBottom: 20 }} />,
})

/** Donut chart of the same in-view road data the map above just drew,
 *  totaled to miles per category — categorical color assigned by entity
 *  identity (each category's fixed `ROAD_CATS` color, matching the map's own
 *  legend), with a center total and a legend giving miles + share so
 *  identity is never color-alone. */
function RoadMilesChart({ miles }: { miles: Record<string, number> }) {
  const rows = ROAD_CATS
    .map((cat) => ({ ...cat, miles: miles[cat.key] ?? 0 }))
    .sort((a, b) => b.miles - a.miles)
  const total = rows.reduce((s, r) => s + r.miles, 0)
  const haveAny = Object.keys(miles).length > 0
  const size = 148
  const thickness = 24
  const r = (size - thickness) / 2
  const cx = size / 2
  const cy = size / 2
  const circumference = 2 * Math.PI * r
  const gap = total > 0 ? 2 : 0
  let offset = 0

  return (
    <div className="card" style={{ padding: 16, marginBottom: 26 }}>
      <div className="muted" style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
        Road miles by jurisdiction
      </div>
      {!haveAny ? (
        <div className="muted" style={{ padding: 12, fontSize: 12.5, textAlign: 'center' }}>Loading…</div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--panel-2)" strokeWidth={thickness} />
            <g transform={`rotate(-90 ${cx} ${cy})`}>
              {rows.map((row) => {
                const frac = total > 0 ? row.miles / total : 0
                const len = frac * circumference
                const dash = Math.max(len - gap, 0)
                const el = (
                  <circle
                    key={row.key}
                    cx={cx}
                    cy={cy}
                    r={r}
                    fill="none"
                    stroke={row.color}
                    strokeWidth={thickness}
                    strokeDasharray={`${dash} ${circumference - dash}`}
                    strokeDashoffset={-offset}
                  >
                    <title>{`${row.label}: ${row.miles.toFixed(1)} mi (${total > 0 ? ((row.miles / total) * 100).toFixed(1) : '0'}%)`}</title>
                  </circle>
                )
                offset += len
                return el
              })}
            </g>
            <text x={cx} y={cy - 5} textAnchor="middle" style={{ fontSize: 15, fontWeight: 700, fill: 'var(--fg)' }}>
              {total.toFixed(1)}
            </text>
            <text x={cx} y={cy + 13} textAnchor="middle" style={{ fontSize: 9.5, fill: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              total miles
            </text>
          </svg>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12, flex: '1 1 200px', minWidth: 180 }}>
            {rows.map((row) => (
              <div key={row.key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 9, height: 9, borderRadius: 2, background: row.color, display: 'inline-block', flexShrink: 0 }} />
                <span style={{ flex: 1, color: 'var(--muted)' }}>{row.label}</span>
                <span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                  {row.miles.toFixed(1)} mi <span style={{ color: 'var(--muted)', fontWeight: 400 }}>({total > 0 ? ((row.miles / total) * 100).toFixed(1) : '0'}%)</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="muted" style={{ fontSize: 10.5, marginTop: 12 }}>
        Straight-line distance summed from the same public road data as the map above, within its current view —
        an estimate, not the Town's official mileage inventory.
      </div>
    </div>
  )
}

/**
 * Highway Department page — the first of the single-department pages to get
 * its own built-out feature beyond a contact card: a roads-by-jurisdiction
 * map (private/local/county/state/federal), since that classification is
 * exactly what a resident wants from Highway (who to call about a pothole
 * or plowing depends on who owns the road).
 */
export default function HighwayClient({ userName }: { userName: string }) {
  const [muni, setMuni] = useState('')
  const [roadMiles, setRoadMiles] = useState<Record<string, number>>({})

  useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    setMuni(p.get('muni') || 'nc')
  }, [])

  const crumbs: Crumb[] = [
    { label: 'Dashboard', href: isOpen ? '/' : '/admin/municipal' },
    { label: 'Highway' },
  ]

  return (
    <div className="container">
      <MuniHeader userName={userName} />
      <MuniTabs muni={muni} active="highway" />

      {!isOpen && (
        <div style={{ marginBottom: 12 }}>
          <Breadcrumbs items={crumbs} />
        </div>
      )}

      <h1 className="page-title" style={{ marginBottom: 20 }}>Highway</h1>

      <BoardStaffCards muni={muni} bodyKey="highway" />
      <ServiceRequests muni={muni} />
      <DeptTimeline muni={muni} deptKey="highway" label="Highway" />
      <BoardKeyDocs muni={muni} bodyKey="highway" />

      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', margin: '0 0 12px' }}>
        <h2 style={{ fontSize: 16, margin: 0 }}>Roads by jurisdiction</h2>
        <span className="muted" style={{ fontSize: 12.5 }}>
          Who maintains a road determines who to call about it — private roads and driveways are the owner's
          responsibility, not the Town's.
        </span>
      </div>
      {muni && (
        <JurisdictionMap
          muni={muni}
          onlyRoads
          height={520}
          onRoadMiles={setRoadMiles}
          zoomBoost={1}
          permits={NC_PUBLIC_PARKING}
          permitsLabel="Public parking"
        />
      )}
      <p className="muted" style={{ fontSize: 11.5, marginTop: 8, marginBottom: 26 }}>
        Categorized automatically from public road data — a best-effort read, not the Town's official jurisdiction
        map. Federal and county classes will read empty in areas with none of that road type nearby. Public parking
        pins cover downtown Armonk's Town-owned lots, Main Street's on-street spaces, and the Armonk Square
        shopping-center lot, per the Town's Nelson\Nygaard parking study and the parking district work that
        followed — not every lot's exact space count is published by the Town.
      </p>

      <RoadMilesChart miles={roadMiles} />

      {!isOpen && (
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 26 }}>
          <Breadcrumbs items={crumbs} />
        </div>
      )}
    </div>
  )
}
