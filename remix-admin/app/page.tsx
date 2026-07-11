import { redirect } from 'next/navigation'
import { isOpen } from '@/lib/flavor'

export const dynamic = 'force-dynamic'

/**
 * Root route. The dark Remix app is normally reached at remixcre.com/admin
 * (a rewrite), so its own root just points at the admin home. The public
 * OpenNorthCastle deployment is served at its domain root, so land visitors on
 * the municipal dashboard.
 */
export default function Home() {
  redirect(isOpen ? '/admin/municipal' : '/admin')
}
