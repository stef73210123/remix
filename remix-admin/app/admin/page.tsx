import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifySession, SESSION_COOKIE } from '@/lib/auth'
import DashboardClient from './DashboardClient'

export default async function DashboardPage() {
  const store = await cookies()
  const session = await verifySession(store.get(SESSION_COOKIE)?.value)
  // On Vercel, redirect() does not prepend basePath, so target the full path.
  if (!session) redirect('/admin/login')
  return <DashboardClient userName={session.name} />
}
