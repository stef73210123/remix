'use client'

import { useState } from 'react'
import { FileText, MapPin, Mail } from 'lucide-react'
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

  const btnStyle: React.CSSProperties = {
    padding: '6px 8px', fontSize: 11.5, display: 'inline-flex', alignItems: 'center', gap: 4, textDecoration: 'none', whiteSpace: 'nowrap',
  }

  return (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', ...style }}>
      <a href={FOIL_URL} target="_blank" rel="noopener noreferrer" className="btn secondary" style={btnStyle}>
        <FileText size={13} aria-hidden /> FOIL Request
      </a>
      <button
        className="btn secondary"
        style={btnStyle}
        onClick={() => setOpen({ url: ISSUE_URL, title: 'Report an issue — North Castle (SeeClickFix)' })}
      >
        <MapPin size={13} aria-hidden /> Report Issue
      </button>
      {isOpen && (
        <button className="btn secondary" style={btnStyle} onClick={() => setContactOpen(true)}>
          <Mail size={13} aria-hidden /> Contact
        </button>
      )}
      {open && <Lightbox url={open.url} title={open.title} onClose={() => setOpen(null)} />}
      {contactOpen && <ContactLightbox onClose={() => setContactOpen(false)} />}
    </div>
  )
}
