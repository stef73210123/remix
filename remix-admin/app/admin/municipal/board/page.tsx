import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifySession, SESSION_COOKIE } from '@/lib/auth'
import BoardClient from './BoardClient'

export const dynamic = 'force-dynamic'

export default async function BoardPage() {
  const store = await cookies()
  const session = await verifySession(store.get(SESSION_COOKIE)?.value)
  if (!session) redirect('/admin/login')
  return <BoardClient userName={session.name} />
}
