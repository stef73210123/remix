import { useEffect } from 'react'

/**
 * Locks background scroll while a modal/lightbox is open, and restores it on
 * close — used by Lightbox, ContactLightbox, and EventLightbox.
 *
 * `overflow: hidden` alone doesn't stop touch scrolling on iOS Safari, so the
 * body still rubber-bands behind the modal; combined with the fixed-position
 * bottom action bar, that manifests as the bar appearing to vanish and the
 * page getting stuck unable to scroll after the modal closes. Pinning the
 * body with `position: fixed` (restoring the scroll offset on cleanup) is
 * the standard fix for that iOS-specific case.
 */
export function useLockBodyScroll() {
  useEffect(() => {
    const scrollY = window.scrollY
    const body = document.body.style
    const prev = { position: body.position, top: body.top, left: body.left, right: body.right, width: body.width, overflow: body.overflow }
    body.position = 'fixed'
    body.top = `-${scrollY}px`
    body.left = '0'
    body.right = '0'
    body.width = '100%'
    body.overflow = 'hidden'
    return () => {
      body.position = prev.position
      body.top = prev.top
      body.left = prev.left
      body.right = prev.right
      body.width = prev.width
      body.overflow = prev.overflow
      window.scrollTo(0, scrollY)
    }
  }, [])
}
