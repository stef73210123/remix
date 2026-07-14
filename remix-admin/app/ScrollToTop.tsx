'use client'

import { Suspense, useEffect, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

// Reset scroll on every route change. A plain full-page navigation already
// starts at the top, but any client-side transition (e.g. a tab that only
// updates search params without remounting the page) otherwise leaves the
// previous page's scroll position in place. Split out because useSearchParams()
// requires a Suspense boundary (else the few statically-rendered pages, e.g.
// /admin/login, fail to build) — isolating it here keeps that boundary from
// affecting the back-to-top button below.
function ScrollResetOnNavigate() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname, searchParams])
  return null
}

// Floating "back to top" button, shared by both flavors (unlike SiteFooter/
// the civic bottom bar, which are OpenNorthCastle-only). Renders unconditionally
// from RootLayout and only shows itself once the page has scrolled a bit.
export default function ScrollToTop() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <>
      <Suspense fallback={null}>
        <ScrollResetOnNavigate />
      </Suspense>
      {visible && (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="Back to top"
          className="scroll-to-top-btn"
        >
          ↑
        </button>
      )}
    </>
  )
}
