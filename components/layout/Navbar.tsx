'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface NavbarProps {
  userRole?: string | null
}

export default function Navbar({ userRole }: NavbarProps) {
  const pathname = usePathname()

  const isPortal = pathname.startsWith('/portal') || pathname.startsWith('/admin')
  const isDealRoom = pathname.startsWith('/deal-room')

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-lg font-semibold tracking-tight">Circular</span>
        </Link>

        <nav className="flex items-center gap-1">
          {!userRole && (
            <>
              <Link href="/assets/livingstonfarm">
                <Button variant="ghost" size="sm" className={cn(pathname.includes('livingstonfarm') && 'bg-accent')}>
                  Livingston Farm
                </Button>
              </Link>
              <Link href="/assets/wrenofthewoods">
                <Button variant="ghost" size="sm" className={cn(pathname.includes('wrenofthewoods') && 'bg-accent')}>
                  Wren of the Woods
                </Button>
              </Link>
              <Link href="/request-access">
                <Button size="sm">Request Access</Button>
              </Link>
            </>
          )}

          {userRole && (isPortal || isDealRoom) && (
            <>
              {(userRole === 'lp' || userRole === 'gp' || userRole === 'admin') && (
                <Link href="/portal">
                  <Button variant="ghost" size="sm" className={cn(pathname.startsWith('/portal') && 'bg-accent')}>
                    Portfolio
                  </Button>
                </Link>
              )}
              {userRole === 'admin' && (
                <Link href="/admin">
                  <Button variant="ghost" size="sm" className={cn(pathname.startsWith('/admin') && 'bg-accent')}>
                    Admin
                  </Button>
                </Link>
              )}
              <form action="/api/auth/logout" method="POST">
                <Button variant="ghost" size="sm" type="submit">
                  Sign out
                </Button>
              </form>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
