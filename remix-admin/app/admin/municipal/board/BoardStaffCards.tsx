import { getBoardDepartments } from '@/lib/municipal/departments'

/**
 * Departmental contact cards (the staff behind a board's business) — pulled
 * out of TranscriptAnalysis so they can sit at the very top of the page,
 * above the map and Meetings, on every page that has them. Static lookup
 * (no fetch), so unlike the map/analysis content below it, it renders
 * instantly with no loading flicker.
 */
export default function BoardStaffCards({ muni, bodyKey }: { muni: string; bodyKey: string }) {
  const departments = getBoardDepartments(muni, bodyKey)
  if (departments.length === 0) return null

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12, marginBottom: 24 }}>
      {departments.map((d) => (
        <div key={d.department} className="card" style={{ padding: 16 }}>
          <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{d.department}</div>
          <div style={{ fontSize: 15, fontWeight: 700, marginTop: 4 }}>{d.person}</div>
          <div className="muted" style={{ fontSize: 12.5 }}>{d.title}</div>
          <div className="muted" style={{ fontSize: 12.5, marginTop: 8, lineHeight: 1.55 }}>{d.blurb}</div>
          <div style={{ fontSize: 12.5, marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: '4px 14px' }}>
            {d.phone && <span>📞 {d.phone}</span>}
            {d.email && <a href={`mailto:${d.email}`} style={{ color: 'var(--primary-light)' }}>✉ {d.email}</a>}
            {d.address && <span className="muted">📍 {d.address}</span>}
          </div>
          {d.links.length > 0 && (
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 10 }}>
              {d.links.map((l) => (
                <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12.5, color: 'var(--primary-light)' }}>{l.label} ↗</a>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
