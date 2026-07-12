import { useEffect } from 'react'

const ALLOW_SCROLL_ATTR = 'data-scroll-lock-allow'

/**
 * Locks background scroll while a modal/lightbox is open, and restores it on
 * close — used by Lightbox, ContactLightbox, and EventLightbox.
 *
 * `overflow: hidden` alone doesn't stop touch scrolling on iOS Safari, so the
 * body still rubber-bands behind the modal. An earlier version of this hook
 * "fixed" that by pinning `<body>` with `position: fixed`, but that also
 * pins Safari's dynamic toolbar in place and desyncs its viewport math from
 * the page's `vh` units — the visible symptom was the modal rendering
 * off-center/cut off behind the toolbar, and the fixed bottom action bar
 * looking like it vanished. Instead, block touchmove at the document level
 * (which does stop iOS rubber-banding) but let it through inside anything
 * marked `data-scroll-lock-allow` (a modal's own scrollable content), so
 * Safari's chrome never gets confused about the page's real height.
 */
export function useLockBodyScroll() {
  useEffect(() => {
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onTouchMove = (e: TouchEvent) => {
      const target = e.target as Element | null
      if (target?.closest(`[${ALLOW_SCROLL_ATTR}]`)) return
      e.preventDefault()
    }
    document.addEventListener('touchmove', onTouchMove, { passive: false })

    return () => {
      document.body.style.overflow = prevOverflow
      document.removeEventListener('touchmove', onTouchMove)
    }
  }, [])
}
