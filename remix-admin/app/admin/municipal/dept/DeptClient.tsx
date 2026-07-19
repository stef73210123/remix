'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import MuniHeader from '@/app/admin/municipal/MuniHeader'
import MuniTabs from '@/app/admin/municipal/MuniTabs'
import Breadcrumbs, { type Crumb } from '../Breadcrumbs'
import BoardStaffCards from '../board/BoardStaffCards'
import BoardKeyDocs from '../board/BoardKeyDocs'
import { getDeptPage } from '@/lib/municipal/deptPages'
import { isOpen } from '@/lib/flavor'
import AllTaxParcelsList, { type SelectedParcelInfo } from './AllTaxParcelsList'
import AssessmentAnalytics from './AssessmentAnalytics'

// Leaflet touches `window`, so the map is client-only (no SSR).
const JurisdictionMap = dynamic(() => import('@/app/admin/municipal/JurisdictionMap'), {
  ssr: false,
  loading: () => <div className="card" style={{ height: 380, marginBottom: 20 }} />,
})

/**
 * Lightweight info page for single-head operational departments (Police,
 * Highway, Assessor, Water & Sewer) — a contact card plus key documents, no
 * Meetings/timeline section, since these aren't multi-member bodies that hold
 * public deliberative meetings the way the boards do.
 *
 * The Assessor page additionally gets the map's Assessment layer (parcels
 * colored by assessed value), analytics on the roll's composition, and the
 * full parcel/owner list — clicking a parcel on the map surfaces it in the
 * list via `selectedParcel`.
 */
export default function DeptClient({ userName }: { userName: string }) {
  const [muni, setMuni] = useState('')
  const [key, setKey] = useState('')
  const [selectedParcel, setSelectedParcel] = useState<SelectedParcelInfo | null>(null)
  const [flyToSbl, setFlyToSbl] = useState<string | null>(null)

  useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    setMuni(p.get('muni') || '')
    setKey(p.get('key') || '')
  }, [])

  const def = getDeptPage(key)

  const crumbs: Crumb[] = [
    { label: 'Dashboard', href: isOpen ? '/' : '/admin/municipal' },
    { label: def?.label || 'Department' },
  ]

  return (
    <div className="container">
      <MuniHeader userName={userName} />
      <MuniTabs muni={muni} active={key} />

      {!isOpen && def && (
        <div style={{ marginBottom: 12 }}>
          <Breadcrumbs items={crumbs} />
        </div>
      )}

      {!def && key && <div className="error" style={{ padding: 20 }}>Unknown department.</div>}

      {def && (
        <>
          <h1 className="page-title" style={{ marginBottom: 20 }}>{def.label}</h1>

          <BoardStaffCards muni={muni} bodyKey={def.key} />
          <BoardKeyDocs muni={muni} bodyKey={def.key} />

          {def.key === 'assessor' && (
            <div style={{ marginTop: 26 }}>
              <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                Assessment analytics
              </div>
              <div style={{ marginBottom: 22 }}>
                <AssessmentAnalytics />
              </div>

              <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                Assessment map
              </div>
              <JurisdictionMap
                muni={muni}
                defaultActive="assessment"
                showIssues={false}
                lightBasemapLayers={['parcel_boundaries']}
                height={380}
                onParcelClick={setSelectedParcel}
                focus={{ center: [41.1294, -73.7131], zoom: 16 }}
                onlyLayers={['assessment', 'parcel_boundaries']}
                flyToSbl={flyToSbl}
              />

              <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                Tax Parcels
              </div>
              <div className="card" style={{ padding: 16 }}>
                <AllTaxParcelsList selectedParcel={selectedParcel} onSelectParcel={setFlyToSbl} />
              </div>
            </div>
          )}

          {def.key === 'water_sewer' && (
            <div style={{ marginTop: 26 }}>
              <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                Water &amp; sewer districts
              </div>
              <JurisdictionMap muni={muni} showIssues={false} height={380} simultaneousLayers={['water_dist', 'sewer_dist']} forceLightBasemap />
              <div className="muted" style={{ fontSize: 11, marginTop: 8, lineHeight: 1.5, maxWidth: 760 }}>
                Sewer districts are drawn from the county&rsquo;s own dataset, which doesn&rsquo;t record which
                town each district sits in — that layer is clipped to the map&rsquo;s view instead of an exact
                town-line filter, unlike Water Districts.
              </div>
            </div>
          )}

          {!isOpen && (
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 26 }}>
              <Breadcrumbs items={crumbs} />
            </div>
          )}
        </>
      )}
    </div>
  )
}
