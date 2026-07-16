'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import MuniHeader from '@/app/admin/municipal/MuniHeader'
import MuniTabs from '@/app/admin/municipal/MuniTabs'
import Breadcrumbs, { type Crumb } from '../Breadcrumbs'
import BoardStaffCards from '../board/BoardStaffCards'
import BoardKeyDocs from '../board/BoardKeyDocs'
import { isOpen } from '@/lib/flavor'

const JurisdictionMap = dynamic(() => import('@/app/admin/municipal/JurisdictionMap'), {
  ssr: false,
  loading: () => <div className="card" style={{ height: 440, marginBottom: 20 }} />,
})

/**
 * Highway Department page — the first of the single-department pages to get
 * its own built-out feature beyond a contact card: a roads-by-jurisdiction
 * map (private/local/county/state/federal), since that classification is
 * exactly what a resident wants from Highway (who to call about a pothole
 * or plowing depends on who owns the road).
 */
export default function HighwayClient({ userName }: { userName: string }) {
  const [muni, setMuni] = useState('')

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
      {muni && <JurisdictionMap muni={muni} onlyRoads height={520} />}
      <p className="muted" style={{ fontSize: 11.5, marginTop: 8, marginBottom: 26 }}>
        Categorized automatically from public road data — a best-effort read, not the Town's official jurisdiction
        map. Federal and county classes will read empty in areas with none of that road type nearby.
      </p>

      {!isOpen && (
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 26 }}>
          <Breadcrumbs items={crumbs} />
        </div>
      )}
    </div>
  )
}
