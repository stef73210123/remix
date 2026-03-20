'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

interface NavbarProps {
  userRole?: string | null
}

export default function Navbar({ userRole }: NavbarProps) {
  const pathname = usePathname()
  const isPortal = pathname.startsWith('/portal') || pathname.startsWith('/admin')
  const isDealRoom = pathname.startsWith('/deal-room')

  return (
    <header className="sticky top-0 z-50 w-full" style={{ backgroundColor: '#6B7A58' }}>
      <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-3">
          <Image src="/seed-of-life-white.png" alt="Circular" width={32} height={32} />
          <span className="text-white text-sm font-semibold tracking-[0.2em] uppercase" style={{ fontFamily: 'var(--font-josefin)' }}>
            Circular
          </span>
        </Link>

        <nav className="flex items-center gap-6">
          {!userRole && (
            <>
              <Link href="/assets/livingstonfarm" className={cn(
                'text-white/80 hover:text-white text-xs tracking-widest uppercase transition-colors',
                pathname.includes('livingstonfarm') && 'text-white'
              )} style={{ fontFamily: 'var(--font-josefin)' }}>
                Livingston Farm
              </Link>
              <Link href="/assets/wrenofthewoods" className={cn(
                'text-white/80 hover:text-white text-xs tracking-widest uppercase transition-colors',
                pathname.includes('wrenofthewoods') && 'text-white'
              )} style={{ fontFamily: 'var(--font-josefin)' }}>
                Wren of the Woods
              </Link>
              <Link href="/request-access">
                <button className="bg-black text-white text-xs tracking-widest uppercase px-5 py-2 hover:bg-black/80 transition-colors" style={{ fontFamily: 'var(--font-josefin)' }}>
                  Request Access
                </button>
              </Link>
            </>
          )}

          {userRole && (isPortal || isDealRoom) && (
            <>
              {(userRole === 'lp' || userRole === 'gp' || userRole === 'admin') && (
                <Link href="/portal" className={cn(
                  'text-white/80 hover:text-white text-xs tracking-widest uppercase transition-colors',
                  pathname.startsWith('/portal') && 'text-white'
                )} style={{ fontFamily: 'var(--font-josefin)' }}>
                  Portfolio
                </Link>
              )}
              {userRole === 'admin' && (
                <Link href="/admin" className={cn(
                  'text-white/80 hover:text-white text-xs tracking-widest uppercase transition-colors',
                  pathname.startsWith('/admin') && 'text-white'
                )} style={{ fontFamily: 'var(--font-josefin)' }}>
                  Admin
                </Link>
              )}
              <form action="/api/auth/logout" method="POST">
                <button type="submit" className="text-white/80 hover:text-white text-xs tracking-widest uppercase transition-colors" style={{ fontFamily: 'var(--font-josefin)' }}>
                  Sign out
                </button>
              </form>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
