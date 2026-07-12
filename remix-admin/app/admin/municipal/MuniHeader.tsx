'use client'

import AdminNav from '@/app/admin/AdminNav'
import { BRAND, isOpen } from '@/lib/flavor'

// Civic quick actions shown in the public OpenNorthCastle header. FOIL goes to
// the town's NextRequest records portal; issues go to the town's SeeClickFix.
const CIVIC_ACTIONS = [
  { label: 'FOIL Request', href: 'https://townofnorthcastleny.nextrequest.com/', primary: true },
  { label: 'Report an Issue', href: 'https://seeclickfix.com/north-castle-ny', primary: false },
]

/**
 * Shared municipal page header. Flavor-aware: the dark Remix app shows the Remix
 * wordmark, "Signed in as …", and the admin nav; the public OpenNorthCastle
 * skin shows a sticky civic masthead — larger wordmark plus the FOIL / issue
 * quick-action buttons. Remix (paywalled) markup is untouched.
 */
export default function MuniHeader({ userName }: { userName?: string }) {
  if (isOpen) {
    return (
      <header className="muni-header">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={BRAND.wordmark} alt={BRAND.name} style={{ height: BRAND.wordmarkHeight, width: 'auto', display: 'block' }} />
        <span style={{ flex: 1 }} />
        {CIVIC_ACTIONS.map((a) => (
          <a
            key={a.label}
            href={a.href}
            target="_blank"
            rel="noopener noreferrer"
            className={a.primary ? 'btn' : 'btn secondary'}
            style={{ whiteSpace: 'nowrap' }}
          >
            {a.label}
          </a>
        ))}
      </header>
    )
  }

  return (
    <header
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}
    >
      <div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={BRAND.wordmark} alt={BRAND.name} style={{ height: BRAND.wordmarkHeight, width: 'auto', display: 'block' }} />
        <div className="muted" style={{ fontSize: 13, marginTop: 6 }}>
          {`Municipal · Signed in as ${userName || ''}`}
        </div>
      </div>
      <AdminNav />
    </header>
  )
}
