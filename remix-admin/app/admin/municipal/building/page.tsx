import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifySession, SESSION_COOKIE } from '@/lib/auth'
import { isOpen } from '@/lib/flavor'
import BuildingClient from './BuildingClient'

export const dynamic = 'force-dynamic'

export default async function BuildingPage({
  searchParams,
}: {
  searchParams: Promise<{ muni?: string }>
}) {
  const store = await cookies()
  const session = await verifySession(store.get(SESSION_COOKIE)?.value)
  if (!session && !isOpen) redirect('/admin/login')

  const sp = await searchParams
  return <BuildingClient userName={session?.name ?? ''} muni={sp.muni || 'nc'} />
}
