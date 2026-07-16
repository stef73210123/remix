'use client'

import { useEffect, useState } from 'react'
import MuniHeader from '@/app/admin/municipal/MuniHeader'
import MuniTabs from '@/app/admin/municipal/MuniTabs'
import Breadcrumbs, { type Crumb } from '../Breadcrumbs'
import BoardStaffCards from '../board/BoardStaffCards'
import BoardKeyDocs from '../board/BoardKeyDocs'
import { getDeptPage } from '@/lib/municipal/deptPages'
import { isOpen } from '@/lib/flavor'

/**
 * Lightweight info page for single-head operational departments (Police,
 * Highway, Receiver of Taxes, Water & Sewer) — a contact card plus key
 * documents, no Meetings/timeline section, since these aren't multi-member
 * bodies that hold public deliberative meetings the way the boards do.
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
