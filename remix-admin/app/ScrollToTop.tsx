'use client'

import { useEffect, useState } from 'react'

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

  if (!visible) return null

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Back to top"
      className="scroll-to-top-btn"
    >
      ↑
    </button>
  )
}
