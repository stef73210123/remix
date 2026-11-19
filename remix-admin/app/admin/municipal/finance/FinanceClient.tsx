'use client'

import { useMemo, useState } from 'react'
import MuniHeader from '@/app/admin/municipal/MuniHeader'
import MuniTabs from '@/app/admin/municipal/MuniTabs'
import Breadcrumbs, { type Crumb } from '@/app/admin/municipal/Breadcrumbs'
import BoardStaffCards from '@/app/admin/municipal/board/BoardStaffCards'
import BoardKeyDocs from '@/app/admin/municipal/board/BoardKeyDocs'
import DeptTimeline from '@/app/admin/municipal/DeptTimeline'
import BudgetPanel from '@/app/admin/municipal/budget/BudgetPanel'
import type { TownBudget } from '@/lib/municipal/budget'
import { MUNICIPALITIES } from '@/lib/municipal/registry'
import { isOpen } from '@/lib/flavor'
import {
  AppropriationsExplorer, FundBalanceChart, BondRatingProfile,
  NC_2026_BUDGET_SOURCE_NOTE, NC_BOND_SOURCE_NOTE,
} from './FinanceCharts'
import { BondSimulator } from './BondSimulator'
import Budget2027 from '../budget/Budget2027'
import { SectionHeading } from '../HelpToggle'

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
      <h1 className="page-title" style={{ marginBottom: 6 }}>Finance</h1>

      {/* The budget cycle in progress leads the page — it's what most people
          arrive here for. Staff, podium history and documents follow the
          numbers instead of sitting in front of them. */}
      {(activeTown || muni) === 'nc' && <Budget2027 />}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', margin: '0 0 12px' }}>
        <h2 style={{ fontSize: 16, margin: 0 }}>Where the money went · 2025 actuals</h2>
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

      {/* 2026 Adopted Budget — the town's own budget-as-adopted schedules,
          distinct from the FY2025 ACFR actuals driving the Sankey above. */}
      {activeTown === 'nc' && (
        <div style={{ marginBottom: 26 }}>
          <SectionHeading title="2026 Adopted Budget" help={NC_2026_BUDGET_SOURCE_NOTE} />

          <div style={{ marginBottom: 20 }}>
            <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
              Appropriations
            </div>
            <div className="card" style={{ padding: 16 }}>
              <AppropriationsExplorer />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 20 }}>
            <div>
              <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                Financial position — fund balance, 2019–2024
              </div>
              <div className="card" style={{ padding: 16 }}>
                <FundBalanceChart />
              </div>
            </div>
          </div>

          <div style={{ marginTop: 26 }}>
            <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
              Town bonds outstanding &amp; credit rating
            </div>
            <div className="card" style={{ padding: 16 }}>
              <BondRatingProfile />
            </div>
            <div className="muted" style={{ fontSize: 11, marginTop: 8, lineHeight: 1.5, maxWidth: 760 }}>{NC_BOND_SOURCE_NOTE}</div>
          </div>

          <div style={{ marginTop: 26 }}>
            <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
              Bondable Investment Simulator
            </div>
            <div className="card" style={{ padding: 16 }}>
              <BondSimulator />
            </div>
          </div>
        </div>
      )}

      <h2 style={{ fontSize: 16, margin: '8px 0 12px' }}>Finance Department</h2>
      <BoardStaffCards muni={activeTown || muni} bodyKey="finance" />
      <DeptTimeline muni={activeTown || muni} deptKey="finance" label="Finance" />
      <BoardKeyDocs muni={activeTown || muni} bodyKey="finance" />
    </div>
  )
}
