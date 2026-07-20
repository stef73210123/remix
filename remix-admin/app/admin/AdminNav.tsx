'use client'

/**
 * Global admin navigation — shown in the header of every admin screen.
 * Options: Dashboard · Muni · Atlas · Circular.
 */
export default function AdminNav() {
  return (
    <nav style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      <a className="btn secondary" href="/admin">Dashboard</a>
      <a className="btn secondary" href="/admin/municipal">Muni</a>
      <a className="btn secondary" href="https://atlas.remixcre.com" target="_blank" rel="noopener noreferrer">Atlas</a>
      <a className="btn secondary" href="https://investors.circular.enterprises/admin/feed" target="_blank" rel="noopener noreferrer">Circular</a>
    </nav>
  )
}
