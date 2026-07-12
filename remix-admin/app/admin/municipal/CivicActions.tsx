'use client'

import { useState } from 'react'
import Lightbox from './Lightbox'
import ContactLightbox from './ContactLightbox'
import { isOpen } from '@/lib/flavor'

/**
 * Resident quick-actions: file a FOIL (records) request, report a local
 * issue, and (OpenNorthCastle only) contact the site's OpenNorthCastle/board
 * inbox. FOIL/Report open the relevant Town portal in a lightbox (with an
 * open-in-new-tab fallback); Contact opens an in-page form instead, since
 * there's no external portal to link to. Rendered on the dashboard and the
 * Building Department page.
 */
const FOIL_URL = 'https://townofnorthcastleny.nextrequest.com/requests/new'
const ISSUE_URL = 'https://seeclickfix.com/web_portal/xySqEvzKUB7M2o5JGPYaBdMG/report/category'

export default function CivicActions({ style }: { style?: React.CSSProperties }) {
  const [open, setOpen] = useState<null | { url: string; title: string }>(null)
  const [contactOpen, setContactOpen] = useState(false)
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', ...style }}>
      <a
        href={FOIL_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="btn"
        style={{ padding: '8px 14px', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 7, textDecoration: 'none' }}
      >
        <span aria-hidden>📄</span> FOIL Request ↗
      </a>
      <button
        className="btn secondary"
        style={{ padding: '8px 14px', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 7 }}
        onClick={() => setOpen({ url: ISSUE_URL, title: 'Report an issue — North Castle (SeeClickFix)' })}
      >
        <span aria-hidden>📍</span> Report Issue
      </button>
      {isOpen && (
        <button
          className="btn secondary"
          style={{ padding: '8px 14px', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 7 }}
          onClick={() => setContactOpen(true)}
        >
          <span aria-hidden>✉</span> Contact
        </button>
      )}
      {open && <Lightbox url={open.url} title={open.title} onClose={() => setOpen(null)} />}
      {contactOpen && <ContactLightbox onClose={() => setContactOpen(false)} />}
    </div>
  )
}
