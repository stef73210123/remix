'use client'

import type { TownBudget } from '@/lib/municipal/budget'
import BudgetPanel from './BudgetPanel'
import AdminNav from '@/app/admin/AdminNav'

const WORDMARK = 'https://remix-admin-omega.vercel.app/remix-wordmark.png'

export default function BudgetClient({ userName, budget }: { userName: string; budget: TownBudget }) {
  return (
    <div className="container">
      <header
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}
      >
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={WORDMARK} alt="Remix Properties" style={{ height: 34, display: 'block' }} />
          <div className="muted" style={{ fontSize: 13, marginTop: 6 }}>Municipal · Signed in as {userName}</div>
        </div>
        <AdminNav />
      </header>

      <h1 className="page-title" style={{ marginBottom: 12 }}>Budget</h1>
      <BudgetPanel budget={budget} />
    </div>
  )
}
