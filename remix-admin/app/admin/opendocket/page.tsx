import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifySession, SESSION_COOKIE } from '@/lib/auth'
import OpenDocketClient from './OpenDocketClient'

export const dynamic = 'force-dynamic'

export default async function OpenDocketPage() {
  const store = await cookies()
  const session = await verifySession(store.get(SESSION_COOKIE)?.value)
  if (!session) redirect('/admin/login')

  return <OpenDocketClient userName={session.name} />
}
