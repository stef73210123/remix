'use client'

import AdminNav from '@/app/admin/AdminNav'
import CivicActions from '@/app/admin/municipal/CivicActions'
import { BRAND, isOpen } from '@/lib/flavor'

/**
 * Shared municipal page header. Flavor-aware: the dark Remix app shows the Remix
 * wordmark, "Signed in as …", and the admin nav; the public OpenNorthCastle
 * skin shows a sticky civic masthead with a centered wordmark. The FOIL /
 * report-issue quick actions (CivicActions) live in a floating bar fixed to
 * the bottom of the page instead, reachable from anywhere without scrolling
 * back up. Remix (paywalled) markup is untouched.
 */
export default function MuniHeader({ userName }: { userName?: string }) {
  if (isOpen) {
    return (
      <>
        <header className="muni-header">
          <a href="/" style={{ display: 'block', lineHeight: 0, margin: '0 auto' }} aria-label={`${BRAND.name} — Dashboard`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={BRAND.wordmark} alt={BRAND.name} style={{ height: BRAND.wordmarkHeight, width: 'auto', display: 'block' }} />
          </a>
        </header>
        <div className="civic-bottom-bar">
          <CivicActions />
        </div>
      </>
    )
  }

  return (
    <>
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
      {/* Same floating civic-action bar as OpenNorthCastle, so FOIL / Report /
          Ask stay pinned to the bottom instead of wedged into the top menu. */}
      <div className="civic-bottom-bar">
        <CivicActions />
      </div>
    </>
  )
}
