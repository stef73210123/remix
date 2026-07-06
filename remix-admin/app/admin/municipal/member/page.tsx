import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifySession, SESSION_COOKIE } from '@/lib/auth'
import MemberClient from './MemberClient'

export const dynamic = 'force-dynamic'

export default async function MemberPage() {
  const store = await cookies()
  const session = await verifySession(store.get(SESSION_COOKIE)?.value)
  if (!session) redirect('/admin/login')
  return <MemberClient userName={session.name} />
}
