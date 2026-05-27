import { headers } from 'next/headers'
import Navbar from '@/components/layout/Navbar'

export default async function DealRoomLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers()
  const role = headersList.get('x-user-role')

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar userRole={role} />
      <main className="flex-1">{children}</main>
    </div>
  )
}
