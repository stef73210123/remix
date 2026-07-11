import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifySession, SESSION_COOKIE } from '@/lib/auth'
import { isOpen } from '@/lib/flavor'
import { getBudget } from '@/lib/municipal/budget'
import BudgetClient from './BudgetClient'

export const dynamic = 'force-dynamic'

export default async function BudgetPage({
  searchParams,
}: {
  searchParams: Promise<{ town?: string }>
}) {
  const store = await cookies()
  const session = await verifySession(store.get(SESSION_COOKIE)?.value)
  if (!session && !isOpen) redirect('/admin/login')

  const sp = await searchParams
  const budget = getBudget(sp.town || 'nc') || getBudget('nc')!
  return <BudgetClient userName={(session?.name ?? '')} budget={budget} />
}
