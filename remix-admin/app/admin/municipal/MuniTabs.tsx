'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { isOpen } from '@/lib/flavor'
import { DEPT_PAGES } from '@/lib/municipal/deptPages'

export interface TabDef { label: string; kind: 'board' | 'building' | 'finance' | 'highway' | 'dept'; key: string }

// Fixed order (not alphabetized) — Town Board and Planning Board are the two
// the site centers on, then the two land-use-adjacent boards.
const BOARD_TABS: TabDef[] = [
  { label: 'Town Board', kind: 'board', key: 'town_board' },
  { label: 'Planning Board', kind: 'board', key: 'planning' },
  { label: 'Architectural Review Board', kind: 'board', key: 'arb' },
  { label: 'Zoning Board of Appeals', kind: 'board', key: 'zba' },
]

// No committee pages exist yet — the dropdown still renders (with a
// placeholder message) so the nav slot is reserved for when they do.
const COMMITTEE_TABS: TabDef[] = []

// Everything that isn't a Town Board/Planning Board/ARB/ZBA meeting body:
// alphabetized, so adding a new department doesn't require deciding where it
// "should" go in the list. Exported so MunicipalClient's dashboard-only strip
// can render the same set.
export const DEPARTMENT_TABS: TabDef[] = [
  { label: 'Building', kind: 'building' as const, key: 'building' },
  { label: 'Finance', kind: 'finance' as const, key: 'finance' },
  { label: 'Highway', kind: 'highway' as const, key: 'highway' },
  { label: 'Parks & Rec', kind: 'board' as const, key: 'parks_rec' },
  ...DEPT_PAGES.map((d) => ({ label: d.label, kind: 'dept' as const, key: d.key })),
].sort((a, b) => a.label.localeCompare(b.label))

export function hrefFor(muni: string, t: TabDef): string {
  if (t.kind === 'building') return `/admin/municipal/building?muni=${muni}`
  if (t.kind === 'finance') return `/admin/municipal/finance?muni=${muni}`
  if (t.kind === 'highway') return `/admin/municipal/highway?muni=${muni}`
  if (t.kind === 'dept') return `/admin/municipal/dept?muni=${muni}&key=${t.key}`
  return `/admin/municipal/board?muni=${muni}&body=${t.key}`
}

/** One "Group ▾" button that opens a dropdown of real page links on tap —
 *  closes on an outside click, Escape, or picking an item. The trigger
 *  itself renders filled (`.btn`) when the current page's `active` key is
 *  inside this group, same as a single always-visible tab used to. */
function TabGroupDropdown({
  label, tabs, muni, active, placeholder,
}: {
  label: string
  tabs: TabDef[]
  muni: string
  active: string
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const isGroupActive = tabs.some((t) => t.key === active)

  useEffect(() => {
    if (!open) return
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('click', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('click', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      <button
        type="button"
        className={isGroupActive ? 'btn' : 'btn secondary'}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        style={{ padding: '6px 10px', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}
      >
        {label}
        <ChevronDown size={13} aria-hidden style={{ transform: open ? 'rotate(180deg)' : undefined, transition: 'transform 0.15s ease' }} />
      </button>
      {open && (
        <div
          style={{
            position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 1300,
            minWidth: 210, display: 'flex', flexDirection: 'column', gap: 2, padding: 6,
            background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10,
            boxShadow: '0 12px 32px rgba(0,0,0,0.4)',
          }}
        >
          {tabs.length === 0 ? (
            <div className="muted" style={{ padding: '8px 10px', fontSize: 12.5, maxWidth: 200 }}>
              {placeholder}
            </div>
          ) : (
            tabs.map((t) => (
              <a
                key={t.key}
                href={hrefFor(muni, t)}
                onClick={() => setOpen(false)}
                className={`tabnav-item${active === t.key ? ' active' : ''}`}
              >
                {t.label}
              </a>
            ))
          )}
        </div>
      )}
    </div>
  )
}

/** The Boards ▾ / Departments ▾ pair — factored out so MunicipalClient's
 *  dashboard-only strip can append the same groups after its own
 *  board-analysis chip row, without duplicating the dropdown logic.
 *  Committees stays hidden from the menu (see COMMITTEE_TABS above) until
 *  there's at least one real committee page to link to. */
export function TabDropdownGroups({ muni, active, showBoards = true }: { muni: string; active: string; showBoards?: boolean }) {
  return (
    <>
      {/* The Remix dashboard keeps its own Town Board/Planning Board analysis
          chips, so it opts out of the Boards (and Committees) dropdown to avoid
          listing those boards twice; Departments is always shown. */}
      {showBoards && <TabGroupDropdown label="Boards" tabs={BOARD_TABS} muni={muni} active={active} />}
      {showBoards && COMMITTEE_TABS.length > 0 && (
        <TabGroupDropdown label="Committees" tabs={COMMITTEE_TABS} muni={muni} active={active} placeholder="Committee pages are coming soon." />
      )}
      <TabGroupDropdown label="Departments" tabs={DEPARTMENT_TABS} muni={muni} active={active} />
    </>
  )
}

/**
 * Sticky sub-nav shown on every ONC municipal page — the dashboard, board
 * pages, and Building — so it stays reachable no matter which page a
 * link lands on. Collapsed into Dashboard / Boards ▾ / Committees ▾ /
 * Departments ▾ instead of one long flat row of buttons, since the flat row
 * got crowded as departments were added one at a time.
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

  return (
    <div className="board-tabs-sticky" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 22, top: headerH }}>
      <a href="/" className={active === 'dashboard' ? 'btn' : 'btn secondary'} style={{ padding: '6px 12px', fontSize: 13, textDecoration: 'none', whiteSpace: 'nowrap' }}>
        Dashboard
      </a>
      <a
        href={`/admin/municipal/towncode?muni=${muni}`}
        className={active === 'towncode' ? 'btn' : 'btn secondary'}
        style={{ padding: '6px 12px', fontSize: 13, textDecoration: 'none', whiteSpace: 'nowrap' }}
      >
        Town Code
      </a>
      <TabDropdownGroups muni={muni} active={active} />
    </div>
  )
}
