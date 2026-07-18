'use client'

import { useEffect } from 'react'
import { isOpen } from '@/lib/flavor'

/**
 * iOS Safari positions `position: fixed` elements relative to the layout
 * viewport, not what's actually visible on screen — while its URL-bar chrome
 * animates in/out (which happens on almost every scroll, not just at the
 * top/bottom edges PreventOverscrollBounce guards), the two diverge and the
 * fixed .civic-bottom-bar visibly detaches from the true bottom edge,
 * floating over whatever content is mid-page at that moment until the
 * browser reconciles them a frame or more later. `window.visualViewport`
 * reports the real, currently-visible viewport, so this corrects the bar's
 * position directly from it on every visualViewport resize/scroll instead of
 * trusting `position: fixed` alone. Combined with translateZ(0) (already on
 * the element via CSS, for GPU-layer promotion) into one transform rather
 * than overwriting it.
 */
export default function PinBottomBar() {
  useEffect(() => {
    if (!isOpen) return
    const vv = window.visualViewport
    if (!vv) return

    const update = () => {
      const bar = document.querySelector('.civic-bottom-bar') as HTMLElement | null
      if (!bar) return
      const offset = Math.max(0, window.innerHeight - (vv.height + vv.offsetTop))
      bar.style.transform = offset > 0.5 ? `translate3d(0, -${offset}px, 0)` : 'translateZ(0)'
    }

    update()
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
    }
  }, [])

  return null
}
