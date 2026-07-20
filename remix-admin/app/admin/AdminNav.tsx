'use client'

/**
 * Global admin navigation — shown in the header of every admin screen.
 * Options: Dashboard · Muni · OpenDocket · Atlas · Circular (+ Sign out).
 */
export default function AdminNav() {
  async function logout() {
    await fetch('/admin/api/auth/logout', { method: 'POST' })
    window.location.href = '/admin/login'
  }
  return (
    <nav style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      <a className="btn secondary" href="/admin">Dashboard</a>
      <a className="btn secondary" href="/admin/municipal">Muni</a>
      <a className="btn secondary" href="/admin/opendocket">OpenDocket</a>
      <a className="btn secondary" href="https://atlas.remixcre.com" target="_blank" rel="noopener noreferrer">Atlas</a>
      <a className="btn secondary" href="https://investors.circular.enterprises/admin/feed" target="_blank" rel="noopener noreferrer">Circular</a>
      <button className="btn secondary" onClick={logout}>Sign out</button>
    </nav>
  )
}
