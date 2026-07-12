import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifySession, SESSION_COOKIE } from '@/lib/auth'
import { isOpen } from '@/lib/flavor'
import { MUNICIPALITIES } from '@/lib/municipal/registry'
import { getBudget, type TownBudget } from '@/lib/municipal/budget'
import MunicipalClient from './admin/municipal/MunicipalClient'

export const dynamic = 'force-dynamic'

/**
 * Root route. The dark Remix app is normally reached at remixcre.com/admin
 * (a rewrite), so its own root just points at the admin home. The public
 * OpenNorthCastle deployment is served at its domain root — it renders the
 * dashboard directly here (not a redirect to /admin/municipal) so the address
 * bar stays at the bare domain instead of jumping to a /admin/municipal path.
 * /admin/municipal itself still works (deep links, the Remix build) and
 * renders the identical page.
 */
export default async function Home() {
  if (!isOpen) redirect('/admin')

  const store = await cookies()
  const session = await verifySession(store.get(SESSION_COOKIE)?.value)

  const budgets: Record<string, TownBudget> = {}
  for (const m of MUNICIPALITIES) {
    const b = getBudget(m.key)
    if (b) budgets[m.key] = b
  }

  return <MunicipalClient userName={session?.name ?? ''} budgets={budgets} />
}
