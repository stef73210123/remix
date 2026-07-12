'use client'

import { useEffect, useState } from 'react'
import { isOpen } from '@/lib/flavor'

const BOARD_TABS: { label: string; bodyKey: string }[] = [
  { label: 'Town Board', bodyKey: 'town_board' },
  { label: 'Planning Board', bodyKey: 'planning' },
]

/**
 * Sticky sub-nav shown on every ONC municipal page — the dashboard, board
 * pages, and Building Dept — so it stays reachable no matter which page a
 * link lands on, instead of only existing on the dashboard. Board/Building
 * pages are real routes (not client-side state), so every entry here is a
 * plain link; `active` just controls which one highlights.
 */
export default function MuniTabs({ muni, active }: { muni: string; active: 'dashboard' | 'building' | 'finance' | string }) {
  const [headerH, setHeaderH] = useState(0)
  useEffect(() => {
    if (!isOpen) return
    const el = document.querySelector('.muni-header') as HTMLElement | null
    if (!el) return
    const update = () => setHeaderH(el.getBoundingClientRect().height)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  if (!isOpen) return null

  const tabStyle = (isActive: boolean): React.CSSProperties => ({
    padding: '6px 12px', fontSize: 13, textDecoration: 'none', whiteSpace: 'nowrap',
  })

  return (
    <div className="pill-strip board-tabs-sticky" style={{ display: 'flex', gap: 6, flexWrap: 'nowrap', marginBottom: 22, top: headerH }}>
      <a href="/" className={active === 'dashboard' ? 'btn' : 'btn secondary'} style={tabStyle(active === 'dashboard')}>
        Dashboard
      </a>
      {BOARD_TABS.map((b) => (
        <a
          key={b.bodyKey}
          href={`/admin/municipal/board?muni=${muni}&body=${b.bodyKey}`}
          className={active === b.bodyKey ? 'btn' : 'btn secondary'}
          style={tabStyle(active === b.bodyKey)}
        >
          {b.label}
        </a>
      ))}
      <a
        href={`/admin/municipal/building?muni=${muni}`}
        className={active === 'building' ? 'btn' : 'btn secondary'}
        style={tabStyle(active === 'building')}
      >
        Building Dept
      </a>
      <a
        href={`/admin/municipal/finance?muni=${muni}`}
        className={active === 'finance' ? 'btn' : 'btn secondary'}
        style={tabStyle(active === 'finance')}
      >
        Finance
      </a>
    </div>
  )
}
