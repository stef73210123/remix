import { getKeyDocs } from '@/lib/municipal/keyDocs'

/**
 * Quick links to the actual reference documents behind a board's business —
 * the Town Code, Zoning Code, Comprehensive Plan, etc. — distinct from the
 * departmental contact links in BoardStaffCards (staff & portals, not
 * documents). Static lookup, so it renders instantly with no loading flicker.
 */
export default function BoardKeyDocs({ muni, bodyKey }: { muni: string; bodyKey: string }) {
  const docs = getKeyDocs(muni, bodyKey)
  if (docs.length === 0) return null

  return (
    <div className="card" style={{ padding: '12px 16px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
      <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', flexShrink: 0 }}>Key documents</div>
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        {docs.map((d) => (
          <a key={d.href} href={d.href} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12.5, color: 'var(--primary-light)' }}>
            {d.label}{d.sub ? <span className="muted"> · {d.sub}</span> : null} ↗
          </a>
        ))}
      </div>
    </div>
  )
}
