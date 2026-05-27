'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { cn } from '@/lib/utils'

interface NavbarProps {
  userRole?: string | null
}

export default function Navbar({ userRole }: NavbarProps) {
  const pathname = usePathname()
  const isPortal = pathname.startsWith('/portal') || pathname.startsWith('/admin')
  const isDealRoom = pathname.startsWith('/deal-room')
  const [mobileOpen, setMobileOpen] = useState(false)

  const linkClass = (active: boolean) =>
    cn(
      'text-white/80 hover:text-white text-xs tracking-widest uppercase transition-colors',
      active && 'text-white'
    )

  return (
    <header className="sticky top-0 z-50 w-full" style={{ backgroundColor: '#6B7A58' }}>
      <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 shrink-0" onClick={() => setMobileOpen(false)}>
          <Image src="/seed-of-life-white.png" alt="Circular" width={38} height={38} />
          <span
            className="text-white font-medium tracking-[0.1024em] uppercase hidden sm:block"
            style={{ fontFamily: 'var(--font-josefin)', fontSize: '38px', lineHeight: 1, transform: 'translateY(3px)' }}
          >
            Circular
          </span>
          <span
            className="text-white font-medium tracking-[0.1024em] uppercase sm:hidden"
            style={{ fontFamily: 'var(--font-josefin)', fontSize: '28px', lineHeight: 1, transform: 'translateY(3px)' }}
          >
            Circular
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6">
          {!userRole && (
            <>
              <Link href="/assets/circularplatform" className={linkClass(pathname.includes('circularplatform'))} style={{ fontFamily: 'var(--font-josefin)' }}>
                Platform
              </Link>
              <Link href="/assets/livingstonfarm" className={linkClass(pathname.includes('livingstonfarm'))} style={{ fontFamily: 'var(--font-josefin)' }}>
                Livingston Farm
              </Link>
              <Link href="/assets/wrenofthewoods" className={linkClass(pathname.includes('wrenofthewoods'))} style={{ fontFamily: 'var(--font-josefin)' }}>
                Wren of the Woods
              </Link>
              <Link href="/learn" className={linkClass(pathname.startsWith('/learn'))} style={{ fontFamily: 'var(--font-josefin)' }}>
                Learn
              </Link>
              <Link href="/login">
                <button className="border border-white/60 text-white text-xs tracking-widest uppercase px-5 py-2 hover:bg-white/10 transition-colors" style={{ fontFamily: 'var(--font-josefin)' }}>
                  Login
                </button>
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
                <Link href="/portal" className={linkClass(pathname.startsWith('/portal'))} style={{ fontFamily: 'var(--font-josefin)' }}>
                  Portfolio
                </Link>
              )}
              {userRole === 'admin' && (
                <Link href="/admin" className={linkClass(pathname.startsWith('/admin'))} style={{ fontFamily: 'var(--font-josefin)' }}>
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

        {/* Mobile hamburger */}
        <button
          className="md:hidden flex flex-col gap-1.5 p-2 text-white"
          onClick={() => setMobileOpen((o) => !o)}
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
        >
          <span className={cn('block h-0.5 w-6 bg-white transition-all', mobileOpen && 'translate-y-2 rotate-45')} />
          <span className={cn('block h-0.5 w-6 bg-white transition-all', mobileOpen && 'opacity-0')} />
          <span className={cn('block h-0.5 w-6 bg-white transition-all', mobileOpen && '-translate-y-2 -rotate-45')} />
        </button>
      </div>

      {/* Mobile menu dropdown */}
      {mobileOpen && (
        <div className="md:hidden border-t border-white/20" style={{ backgroundColor: '#6B7A58' }}>
          <div className="container mx-auto max-w-7xl px-6 py-4 flex flex-col gap-4">
            {!userRole && (
              <>
                <Link href="/assets/circularplatform" className={linkClass(pathname.includes('circularplatform'))} style={{ fontFamily: 'var(--font-josefin)' }} onClick={() => setMobileOpen(false)}>
                  Platform
                </Link>
                <Link href="/assets/livingstonfarm" className={linkClass(pathname.includes('livingstonfarm'))} style={{ fontFamily: 'var(--font-josefin)' }} onClick={() => setMobileOpen(false)}>
                  Livingston Farm
                </Link>
                <Link href="/assets/wrenofthewoods" className={linkClass(pathname.includes('wrenofthewoods'))} style={{ fontFamily: 'var(--font-josefin)' }} onClick={() => setMobileOpen(false)}>
                  Wren of the Woods
                </Link>
                <Link href="/learn" className={linkClass(pathname.startsWith('/learn'))} style={{ fontFamily: 'var(--font-josefin)' }} onClick={() => setMobileOpen(false)}>
                  Learn
                </Link>
                <div className="flex flex-col gap-3 pt-2">
                  <Link href="/login" onClick={() => setMobileOpen(false)}>
                    <button className="w-full border border-white/60 text-white text-xs tracking-widest uppercase px-5 py-2.5 hover:bg-white/10 transition-colors" style={{ fontFamily: 'var(--font-josefin)' }}>
                      Login
                    </button>
                  </Link>
                  <Link href="/request-access" onClick={() => setMobileOpen(false)}>
                    <button className="w-full bg-black text-white text-xs tracking-widest uppercase px-5 py-2.5 hover:bg-black/80 transition-colors" style={{ fontFamily: 'var(--font-josefin)' }}>
                      Request Access
                    </button>
                  </Link>
                </div>
              </>
            )}

            {userRole && (isPortal || isDealRoom) && (
              <>
                {(userRole === 'lp' || userRole === 'gp' || userRole === 'admin') && (
                  <Link href="/portal" className={linkClass(pathname.startsWith('/portal'))} style={{ fontFamily: 'var(--font-josefin)' }} onClick={() => setMobileOpen(false)}>
                    Portfolio
                  </Link>
                )}
                {userRole === 'admin' && (
                  <Link href="/admin" className={linkClass(pathname.startsWith('/admin'))} style={{ fontFamily: 'var(--font-josefin)' }} onClick={() => setMobileOpen(false)}>
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
          </div>
        </div>
      )}
    </header>
  )
}
