'use client'

import { useMemo, useState } from 'react'
import MuniHeader from '@/app/admin/municipal/MuniHeader'
import MuniTabs from '@/app/admin/municipal/MuniTabs'
import Breadcrumbs, { type Crumb } from '@/app/admin/municipal/Breadcrumbs'
import CivicActions from '@/app/admin/municipal/CivicActions'
import BoardStaffCards from '@/app/admin/municipal/board/BoardStaffCards'
import BoardKeyDocs from '@/app/admin/municipal/board/BoardKeyDocs'
import BudgetPanel from '@/app/admin/municipal/budget/BudgetPanel'
import type { TownBudget } from '@/lib/municipal/budget'
import { MUNICIPALITIES } from '@/lib/municipal/registry'
import { isOpen } from '@/lib/flavor'

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={active ? 'btn' : 'btn secondary'} style={{ padding: '6px 12px', fontSize: 13 }}>
      {children}
    </button>
  )
}

/**
 * Town budget / financial-analysis page — its own tab, split out from the
 * main dashboard so that heavier chart doesn't compete with the civic
 * overview for space there.
 */
export default function FinanceClient({ userName, muni, budgets }: {
  userName: string
  muni: string
  budgets: Record<string, TownBudget>
}) {
  const budgetTowns = useMemo(
    () => MUNICIPALITIES.filter((m) => budgets[m.key]),
    [budgets]
  )
  const [activeTown, setActiveTown] = useState(muni && budgets[muni] ? muni : (budgetTowns[0]?.key || ''))
  const activeBudget = activeTown ? budgets[activeTown] : undefined

  // OpenNorthCastle is single-jurisdiction, so the town crumb is implied and
  // skipped there; the paywalled Remix build keeps it (multiple towns).
  const crumbs: Crumb[] = [
    { label: 'Dashboard', href: isOpen ? '/' : `/admin/municipal?town=${muni}` },
    ...(isOpen ? [] : [{ label: 'Town of North Castle' }]),
    { label: 'Finance' },
  ]

  return (
    <div className="container">
      <MuniHeader userName={userName} />
      <MuniTabs muni={muni} active="finance" />
      {!isOpen && <div style={{ marginBottom: 12 }}><Breadcrumbs items={crumbs} /></div>}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <h1 className="page-title" style={{ marginBottom: 6 }}>Finance</h1>
        {!isOpen && <CivicActions style={{ marginTop: 6 }} />}
      </div>

      <BoardStaffCards muni={activeTown || muni} bodyKey="finance" />
      <BoardKeyDocs muni={activeTown || muni} bodyKey="finance" />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', margin: '0 0 12px' }}>
        <h2 style={{ fontSize: 16, margin: 0 }}>Financial analysis</h2>
        {budgetTowns.length > 1 && (
          <div className="pill-strip" style={{ display: 'flex', gap: 6, flexWrap: 'nowrap' }}>
            {budgetTowns.map((m) => (
              <Chip key={m.key} active={activeTown === m.key} onClick={() => setActiveTown(m.key)}>{m.name}</Chip>
            ))}
          </div>
        )}
      </div>
      {activeBudget ? (
        <div style={{ marginBottom: 26 }}>
          <BudgetPanel budget={activeBudget} />
        </div>
      ) : (
        <div className="card" style={{ marginBottom: 26 }}>
          <div className="muted" style={{ padding: 20, fontSize: 13 }}>
            No budget data for {MUNICIPALITIES.find((m) => m.key === muni)?.name || 'this town'} yet.
          </div>
        </div>
      )}
    </div>
  )
}
