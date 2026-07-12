import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifySession, SESSION_COOKIE } from '@/lib/auth'
import { isOpen } from '@/lib/flavor'
import MunicipalClient from './MunicipalClient'

export const dynamic = 'force-dynamic'

export default async function MunicipalPage() {
  const store = await cookies()
  const session = await verifySession(store.get(SESSION_COOKIE)?.value)
  if (!session && !isOpen) redirect('/admin/login')

  return <MunicipalClient userName={session?.name ?? ''} />
}
