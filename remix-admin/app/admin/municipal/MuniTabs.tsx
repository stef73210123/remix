'use client'

import { useEffect, useState } from 'react'
import { isOpen } from '@/lib/flavor'
import { DEPT_PAGES } from '@/lib/municipal/deptPages'

export interface TabDef { label: string; kind: 'board' | 'building' | 'finance' | 'dept'; key: string }

// Town Board and Planning Board stay pinned first (they're the two the site
// centers on); everything else is alphabetized by label so adding a new
// board/department doesn't require deciding where it "should" go in the list.
const PINNED_TABS: TabDef[] = [
  { label: 'Town Board', kind: 'board', key: 'town_board' },
  { label: 'Planning Board', kind: 'board', key: 'planning' },
]

// Exported so the dashboard's own (separately implemented) tab strip in
// MunicipalClient.tsx can render the same set in the same order, instead of
// hand-listing Building Dept/Finance and forgetting to add new entries here.
export const OTHER_TABS: TabDef[] = [
  { label: 'Building Dept', kind: 'building' as const, key: 'building' },
  { label: 'Finance', kind: 'finance' as const, key: 'finance' },
  { label: 'Parks and Rec', kind: 'board' as const, key: 'parks_rec' },
  ...DEPT_PAGES.map((d) => ({ label: d.label, kind: 'dept' as const, key: d.key })),
].sort((a, b) => a.label.localeCompare(b.label))

const ALL_TABS = [...PINNED_TABS, ...OTHER_TABS]

export function hrefFor(muni: string, t: TabDef): string {
  if (t.kind === 'building') return `/admin/municipal/building?muni=${muni}`
  if (t.kind === 'finance') return `/admin/municipal/finance?muni=${muni}`
  if (t.kind === 'dept') return `/admin/municipal/dept?muni=${muni}&key=${t.key}`
  return `/admin/municipal/board?muni=${muni}&body=${t.key}`
}

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
      {ALL_TABS.map((t) => (
        <a
          key={t.key}
          href={hrefFor(muni, t)}
          className={active === t.key ? 'btn' : 'btn secondary'}
          style={tabStyle(active === t.key)}
        >
          {t.label}
        </a>
      ))}
    </div>
  )
}
