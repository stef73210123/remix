'use client'

import AdminNav from '@/app/admin/AdminNav'
import CivicActions from '@/app/admin/municipal/CivicActions'
import { BRAND, isOpen } from '@/lib/flavor'

/**
 * Shared municipal page header. Flavor-aware: the dark Remix app shows the Remix
 * wordmark, "Signed in as …", and the admin nav; the public OpenNorthCastle
 * skin shows a sticky civic masthead — larger wordmark plus the FOIL / issue
 * quick-action buttons (CivicActions). Remix (paywalled) markup is untouched.
 */
export default function MuniHeader({ userName }: { userName?: string }) {
  if (isOpen) {
    return (
      <header className="muni-header">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={BRAND.wordmark} alt={BRAND.name} style={{ height: BRAND.wordmarkHeight, width: 'auto', display: 'block' }} />
        <span style={{ flex: 1 }} />
        <CivicActions />
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
