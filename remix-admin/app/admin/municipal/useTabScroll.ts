'use client'

import { useEffect, useRef } from 'react'

const KEY = 'muniTabsScrollLeft'

/**
 * Restores and persists the muni tab strip's horizontal scroll offset across
 * full-page navigations (sessionStorage-backed, shared across every page's
 * copy of the strip via one storage key). The tab strip's links are real
 * page loads, not client-side routing, so each click would otherwise remount
 * the strip at its default scroll-left-0 position — undoing whatever
 * scrolling it took to reach the tab that was just clicked.
 */
export function useTabScrollRestore<T extends HTMLElement>() {
  const ref = useRef<T | null>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const stored = sessionStorage.getItem(KEY)
    if (stored) el.scrollLeft = Number(stored)
    const onScroll = () => sessionStorage.setItem(KEY, String(el.scrollLeft))
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])
  return ref
}
