import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifySession, SESSION_COOKIE } from '@/lib/auth'
import { isOpen } from '@/lib/flavor'
import { MUNICIPALITIES } from '@/lib/municipal/registry'
import { getBudget, type TownBudget } from '@/lib/municipal/budget'
import MunicipalClient from './MunicipalClient'

export const dynamic = 'force-dynamic'

export default async function MunicipalPage() {
  const store = await cookies()
  const session = await verifySession(store.get(SESSION_COOKIE)?.value)
  if (!session && !isOpen) redirect('/admin/login')

  // Per-town budgets for the inline financial-analysis section (static data).
  const budgets: Record<string, TownBudget> = {}
  for (const m of MUNICIPALITIES) {
    const b = getBudget(m.key)
    if (b) budgets[m.key] = b
  }

  return <MunicipalClient userName={(session?.name ?? '')} budgets={budgets} />
}
