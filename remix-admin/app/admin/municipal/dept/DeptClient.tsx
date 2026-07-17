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
import { TopTaxpayersList, NC_TOP_TAXPAYERS_SOURCE_NOTE } from '@/app/admin/municipal/finance/FinanceCharts'
import AllTaxParcelsList from './AllTaxParcelsList'

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
 * The Assessor page additionally gets the Top 50 Taxpayers schedule (drawn
 * from the Assessor's own Tentative Assessment Roll, so it belongs here
 * rather than on the Finance page) and the map's Assessment layer, opened by
 * default — parcels colored by assessed value instead of the old per-owner
 * pin map, which only a handful of the 50 owner names could ever be geocoded to.
 */
export default function DeptClient({ userName }: { userName: string }) {
  const [muni, setMuni] = useState('')
  const [key, setKey] = useState('')

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
                Assessment map
              </div>
              <JurisdictionMap muni={muni} defaultActive="assessment" showIssues={false} lightBasemap height={380} />

              <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                Top 50 Taxpayers
              </div>
              <div className="card" style={{ padding: 16 }}>
                <TopTaxpayersList />
              </div>
              <div className="muted" style={{ fontSize: 11, marginTop: 8, lineHeight: 1.5, maxWidth: 760 }}>{NC_TOP_TAXPAYERS_SOURCE_NOTE}</div>

              <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '22px 0 8px' }}>
                All Tax Parcels
              </div>
              <div className="card" style={{ padding: 16 }}>
                <AllTaxParcelsList />
              </div>
            </div>
          )}

          {def.key === 'water_sewer' && (
            <div style={{ marginTop: 26 }}>
              <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                Water &amp; sewer districts
              </div>
              <JurisdictionMap muni={muni} defaultActive="water_dist" showIssues={false} height={380} />
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
