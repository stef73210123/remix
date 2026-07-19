'use client'

import dynamic from 'next/dynamic'
import { NC_PARKS } from '@/lib/municipal/parks'

const JurisdictionMap = dynamic(() => import('../JurisdictionMap'), {
  ssr: false,
  loading: () => <div className="card" style={{ height: 420, marginBottom: 20 }} />,
})

/** Parks & Recreation's map — the department runs facilities, not public
 *  deliberative meetings the way the boards do, so this replaces the
 *  Meetings section on that one board page with a map of the Town's parks
 *  (including the Town Pool, called out with its own color). */
export default function ParksMap({ muni }: { muni: string }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', margin: '0 0 12px' }}>
        <h2 style={{ fontSize: 16, margin: 0 }}>Parks &amp; facilities</h2>
        <span className="muted" style={{ fontSize: 12.5 }}>
          {NC_PARKS.length} town-run parks and facilities, including the Town Pool.
        </span>
      </div>
      <JurisdictionMap
        muni={muni}
        permits={NC_PARKS}
        permitsLabel="Parks & facilities"
        permitsGroup="Parks"
        onlyPermits
        showIssues={false}
        height={420}
      />
      <p className="muted" style={{ fontSize: 11.5, marginTop: 8 }}>
        Source: Town of North Castle Recreation &amp; Parks Department. A few facilities without a street address on
        the Town&rsquo;s site are geocoded by name and may land approximately.
      </p>
    </div>
  )
}
