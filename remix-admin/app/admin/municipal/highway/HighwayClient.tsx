'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import MuniHeader from '@/app/admin/municipal/MuniHeader'
import MuniTabs from '@/app/admin/municipal/MuniTabs'
import Breadcrumbs, { type Crumb } from '../Breadcrumbs'
import BoardStaffCards from '../board/BoardStaffCards'
import BoardKeyDocs from '../board/BoardKeyDocs'
import { ROAD_CATS } from '@/lib/municipal/roadCats'
import { isOpen } from '@/lib/flavor'

const JurisdictionMap = dynamic(() => import('@/app/admin/municipal/JurisdictionMap'), {
  ssr: false,
  loading: () => <div className="card" style={{ height: 440, marginBottom: 20 }} />,
})

/** Horizontal bar chart of the same in-view road data the map above just
 *  drew, totaled to miles per category — one flat color per bar since it's
 *  a single series (category is already the axis, not the identity
 *  channel), sized against the largest bar rather than a fixed scale. */
function RoadMilesChart({ miles }: { miles: Record<string, number> }) {
  const rows = ROAD_CATS
    .map((cat) => ({ ...cat, miles: miles[cat.key] ?? 0 }))
    .sort((a, b) => b.miles - a.miles)
  const max = Math.max(...rows.map((r) => r.miles), 1)
  const haveAny = Object.keys(miles).length > 0

  return (
    <div className="card" style={{ padding: 16, marginBottom: 26 }}>
      <div className="muted" style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
        Road miles by jurisdiction
      </div>
      {!haveAny ? (
        <div className="muted" style={{ padding: 12, fontSize: 12.5, textAlign: 'center' }}>Loading…</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {rows.map((r) => (
            <div key={r.key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 130, fontSize: 12, color: 'var(--muted)', textAlign: 'right', flexShrink: 0 }}>{r.label}</div>
              <div style={{ flex: 1, background: 'var(--panel-2)', borderRadius: 5, height: 16, overflow: 'hidden' }}>
                <div style={{ width: `${(r.miles / max) * 100}%`, background: r.color, height: '100%', borderRadius: 5, minWidth: r.miles > 0 ? 4 : 0 }} />
              </div>
              <div style={{ width: 60, fontSize: 12, fontWeight: 600, textAlign: 'right', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
                {r.miles.toFixed(1)} mi
              </div>
            </div>
          ))}
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
      <BoardKeyDocs muni={muni} bodyKey="highway" />

      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', margin: '0 0 12px' }}>
        <h2 style={{ fontSize: 16, margin: 0 }}>Roads by jurisdiction</h2>
        <span className="muted" style={{ fontSize: 12.5 }}>
          Who maintains a road determines who to call about it — private roads and driveways are the owner's
          responsibility, not the Town's.
        </span>
      </div>
      {muni && <JurisdictionMap muni={muni} onlyRoads height={520} onRoadMiles={setRoadMiles} forceLightBasemap zoomBoost={1} />}
      <p className="muted" style={{ fontSize: 11.5, marginTop: 8, marginBottom: 26 }}>
        Categorized automatically from public road data — a best-effort read, not the Town's official jurisdiction
        map. Federal and county classes will read empty in areas with none of that road type nearby.
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
