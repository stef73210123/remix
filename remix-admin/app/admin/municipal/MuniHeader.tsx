'use client'

import AdminNav from '@/app/admin/AdminNav'
import { BRAND, isOpen } from '@/lib/flavor'

/**
 * Shared municipal page header. Flavor-aware: the dark Remix app shows the Remix
 * wordmark, "Signed in as …", and the admin nav; the public OpenNorthCastle
 * skin shows its own wordmark and a civic subtitle with no admin chrome.
 */
export default function MuniHeader({ userName }: { userName?: string }) {
  return (
    <header
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}
    >
      <div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={BRAND.wordmark} alt={BRAND.name} style={{ height: BRAND.wordmarkHeight, width: 'auto', display: 'block' }} />
        <div className="muted" style={{ fontSize: 13, marginTop: 6 }}>
          {isOpen ? 'North Castle, New York · public records dashboard' : `Municipal · Signed in as ${userName || ''}`}
        </div>
      </div>
      {!isOpen && <AdminNav />}
    </header>
  )
}
