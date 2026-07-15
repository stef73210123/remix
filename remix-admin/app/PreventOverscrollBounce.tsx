'use client'

import { useEffect } from 'react'
import { isOpen } from '@/lib/flavor'

/**
 * CSS `overscroll-behavior` (see opennorthcastle.css) only stops scroll
 * *chaining* into a parent/sibling scroller — it does not suppress iOS
 * Safari's native rubber-band bounce of the document's own root scroller.
 * With a fixed `.civic-bottom-bar`, that bounce reads as the bar (and the
 * SiteFooter text above it) floating/dragging along with the overscroll.
 * There's no CSS-only fix for the bounce itself; the standard remedy is to
 * intercept `touchmove` right at the true top/bottom of the document and
 * prevent only that.
 *
 * Two guards keep this from interfering with normal scrolling elsewhere:
 * - Only a predominantly *vertical* drag is ever prevented, so dragging a
 *   horizontal carousel (Meetings, Key Issues, In the news, ...) is untouched
 *   even when the page happens to be scrolled to its very top/bottom.
 * - Skipped entirely when the touch started inside an element with its own
 *   vertical scroll (a dropdown panel, a scrollable card list, ...), so
 *   scrolling those isn't cut off by this page-level listener.
 */
function hasVerticalScrollAncestor(el: Element | null): boolean {
  let node = el
  while (node && node !== document.body) {
    const style = getComputedStyle(node)
    if ((style.overflowY === 'auto' || style.overflowY === 'scroll') && node.scrollHeight > node.clientHeight) {
      return true
    }
    node = node.parentElement
  }
  return false
}

export default function PreventOverscrollBounce() {
  useEffect(() => {
    if (!isOpen) return

    let startX = 0
    let startY = 0
    let skip = false

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return
      startX = e.touches[0].clientX
      startY = e.touches[0].clientY
      skip = hasVerticalScrollAncestor(e.target as Element)
    }

    const onTouchMove = (e: TouchEvent) => {
      if (skip || e.touches.length !== 1) return
      const deltaX = e.touches[0].clientX - startX
      const deltaY = e.touches[0].clientY - startY
      if (Math.abs(deltaY) <= Math.abs(deltaX)) return

      const doc = document.documentElement
      const atTop = doc.scrollTop <= 0
      const atBottom = Math.ceil(doc.scrollTop + window.innerHeight) >= doc.scrollHeight
      if ((atTop && deltaY > 0) || (atBottom && deltaY < 0)) {
        e.preventDefault()
      }
    }

    document.addEventListener('touchstart', onTouchStart, { passive: true })
    document.addEventListener('touchmove', onTouchMove, { passive: false })
    return () => {
      document.removeEventListener('touchstart', onTouchStart)
      document.removeEventListener('touchmove', onTouchMove)
    }
  }, [])

  return null
}
