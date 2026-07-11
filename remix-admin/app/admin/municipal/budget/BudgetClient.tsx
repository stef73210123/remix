'use client'

import type { TownBudget } from '@/lib/municipal/budget'
import MuniHeader from '@/app/admin/municipal/MuniHeader'
import BudgetPanel from './BudgetPanel'


export default function BudgetClient({ userName, budget }: { userName: string; budget: TownBudget }) {
  return (
    <div className="container">
      <MuniHeader userName={userName} />

      <h1 className="page-title" style={{ marginBottom: 12 }}>Budget</h1>
      <BudgetPanel budget={budget} />
    </div>
  )
}
