import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifySession, SESSION_COOKIE } from '@/lib/auth'
import { isOpen } from '@/lib/flavor'
import HighwayClient from './HighwayClient'

export const dynamic = 'force-dynamic'

export default async function HighwayPage() {
  const store = await cookies()
  const session = await verifySession(store.get(SESSION_COOKIE)?.value)
  if (!session && !isOpen) redirect('/admin/login')
  return <HighwayClient userName={(session?.name ?? '')} />
}
