'use client'

/**
 * Municipal breadcrumb trail. Rooted at the municipal Dashboard so you can
 * always climb back up the hierarchy — Dashboard › Town › Board › Member —
 * from anywhere in the drill-down, including the bottom of a long profile.
 *
 * The last crumb is the current page (rendered plain, no link); every earlier
 * crumb links up a level.
 */
export interface Crumb {
  label: string
  href?: string
}

export default function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav
      aria-label="Breadcrumb"
      style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6, fontSize: 13 }}
    >
      {items.map((c, i) => {
        const last = i === items.length - 1
        return (
          <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            {c.href && !last ? (
              <a href={c.href} className="muted" style={{ textDecoration: 'none' }}>
                {c.label}
              </a>
            ) : (
              <span style={{ fontWeight: last ? 600 : 400, color: last ? 'var(--text)' : 'var(--muted)' }}>
                {c.label}
              </span>
            )}
            {!last && <span className="muted" style={{ opacity: 0.6 }} aria-hidden>›</span>}
          </span>
        )
      })}
    </nav>
  )
}
