import { headers } from 'next/headers'
import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'

const ADMIN_NAV = [
  { href: '/admin/feed', label: 'Feed' },
  { href: '/admin/pipeline', label: 'Fundraising' },
  { href: '/admin/investors', label: 'Investors' },
  { href: '/admin/config', label: 'Assets' },
  { href: '/admin/budget', label: 'Budget' },
  { href: '/admin/timeline', label: 'Timeline' },
  { href: '/admin/deals', label: 'Deals' },
  { href: '/admin/knowledge', label: 'Knowledge' },
  { href: '/admin/team', label: 'Team' },
  { href: '/admin/users', label: 'Users' },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers()
  const role = headersList.get('x-user-role')

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar userRole={role} />
      <nav className="sticky top-16 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="flex items-center gap-1 py-2 overflow-x-auto">
            {ADMIN_NAV.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="shrink-0 rounded-md border bg-background px-4 py-1.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      </nav>
      <main className="flex-1">{children}</main>
    </div>
  )
}
