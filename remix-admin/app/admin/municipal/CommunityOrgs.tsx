import { Phone, Mail, MapPin } from 'lucide-react'
import { getCommunityOrgs } from '@/lib/municipal/orgs'

/**
 * Local community organizations — the civic/cultural groups behind the
 * events in the calendar above, with a point of contact for each. Static
 * lookup (no fetch), renders instantly. Returns null for towns with none
 * configured.
 */
export default function CommunityOrgs({ muniKey }: { muniKey: string }) {
  const orgs = getCommunityOrgs(muniKey)
  if (orgs.length === 0) return null

  return (
    <div style={{ marginBottom: 30 }}>
      <h2 style={{ fontSize: 16, margin: '0 0 12px' }}>
        Community organizations
        <span className="muted" style={{ fontSize: 13, fontWeight: 400 }}> · {orgs.length}</span>
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
        {orgs.map((o) => (
          <div key={o.key} className="card" style={{ padding: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>{o.name}</div>
            <div className="muted" style={{ fontSize: 12.5, marginTop: 8, lineHeight: 1.55 }}>{o.blurb}</div>
            <div style={{ fontSize: 12.5, marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: '4px 14px' }}>
              {o.phone && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Phone size={12} aria-hidden /> {o.phone}</span>}
              {o.email && (
                <a href={`mailto:${o.email}`} style={{ color: 'var(--primary-light)', wordBreak: 'break-all', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Mail size={12} aria-hidden /> {o.email}
                </a>
              )}
              {o.address && <span className="muted" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><MapPin size={12} aria-hidden /> {o.address}</span>}
            </div>
            <div style={{ marginTop: 10 }}>
              <a href={o.website} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12.5, color: 'var(--primary-light)' }}>
                {o.websiteLabel} ↗
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
