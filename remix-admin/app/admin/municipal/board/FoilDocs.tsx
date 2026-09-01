'use client'

import { getFoilRequests } from '@/lib/municipal/foilDocs'

/**
 * Records obtained from the Town under the Freedom of Information Law.
 *
 * Kept separate from BoardKeyDocs on purpose. That section's promise is that
 * every link opens the Town's own copy and nothing is rehosted; these documents
 * break that promise by necessity, because the Town publishes them nowhere. A
 * reader deserves to know which of the two they are looking at, so the
 * provenance is stated here rather than blended into the same list.
 */
export default function FoilDocs({ muni, bodyKey }: { muni: string; bodyKey: string }) {
  const requests = getFoilRequests(muni, bodyKey)
  if (requests.length === 0) return null
  const total = requests.reduce((n, r) => n + r.docs.length, 0)

  return (
    <div className="card" style={{ padding: 16, marginBottom: 24 }}>
      <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
        Released under FOIL
        <span style={{ textTransform: 'none', letterSpacing: 0 }}> · {total}</span>
      </div>
      <div className="muted" style={{ fontSize: 11.5, lineHeight: 1.5, marginBottom: 14, maxWidth: 700 }}>
        Records the Town does not publish anywhere. They were requested under the Freedom of
        Information Law and are hosted here exactly as released — no compression, no edits.
      </div>

      {requests.map((r, ri) => (
        <div key={r.id} style={{ marginTop: ri === 0 ? 0 : 18 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 2 }}>
            {r.title}
            <span className="muted" style={{ fontWeight: 400 }}> · request {r.id}</span>
          </div>
          <div className="muted" style={{ fontSize: 11.5, lineHeight: 1.5, marginBottom: 10, maxWidth: 720 }}>
            {r.summary}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {r.docs.map((d) => (
              <div key={d.href} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                  <a
                    href={d.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--primary-light)' }}
                  >
                    {d.label} ↗
                  </a>
                  {d.date && <span className="badge state" style={{ fontSize: 10.5, flexShrink: 0 }}>{d.date}</span>}
                  {d.sub && <span className="muted" style={{ fontSize: 11.5 }}>{d.sub}</span>}
                </div>
                {d.note && (
                  <div className="muted" style={{ fontSize: 12.5, lineHeight: 1.5, maxWidth: 720 }}>{d.note}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
