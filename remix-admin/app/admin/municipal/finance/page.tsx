import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifySession, SESSION_COOKIE } from '@/lib/auth'
import { isOpen } from '@/lib/flavor'
import { MUNICIPALITIES } from '@/lib/municipal/registry'
import { getBudget, type TownBudget } from '@/lib/municipal/budget'
import FinanceClient from './FinanceClient'

export const dynamic = 'force-dynamic'

export default async function FinancePage({
  searchParams,
}: {
  searchParams: Promise<{ muni?: string }>
}) {
  const store = await cookies()
  const session = await verifySession(store.get(SESSION_COOKIE)?.value)
  if (!session && !isOpen) redirect('/admin/login')

  const sp = await searchParams

  const budgets: Record<string, TownBudget> = {}
  for (const m of MUNICIPALITIES) {
    const b = getBudget(m.key)
    if (b) budgets[m.key] = b
  }

  return <FinanceClient userName={session?.name ?? ''} muni={sp.muni || 'nc'} budgets={budgets} />
}
