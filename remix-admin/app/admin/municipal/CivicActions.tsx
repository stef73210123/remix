'use client'

import { useEffect, useState } from 'react'
import { FileText, MapPin, Mail, Sparkles } from 'lucide-react'
import Lightbox from './Lightbox'
import ContactLightbox from './ContactLightbox'
import AskLightbox from './AskLightbox'
import { isOpen } from '@/lib/flavor'

/**
 * Resident quick-actions: file a FOIL (records) request, report a local
 * issue, ask the site's AI assistant a question, and (OpenNorthCastle only)
 * contact the site's OpenNorthCastle/board inbox. FOIL/Report open the
 * relevant Town portal in a lightbox (with an open-in-new-tab fallback);
 * Contact opens an in-page form instead, since there's no external portal to
 * link to. Rendered on the dashboard and the Building Department page.
 *
 * FOIL/Report/Contact are all styled as equal secondary actions — Ask is the
 * one deliberately made to stand out (blue shimmer + AI glyph), since it's
 * the newest and least self-explanatory of the four.
 */
const FOIL_URL = 'https://townofnorthcastleny.nextrequest.com/requests/new'
const ISSUE_URL = 'https://seeclickfix.com/web_portal/xySqEvzKUB7M2o5JGPYaBdMG/report/category'

export default function CivicActions({ style }: { style?: React.CSSProperties }) {
  const [open, setOpen] = useState<null | { url: string; title: string }>(null)
  const [contactOpen, setContactOpen] = useState(false)
  const [askOpen, setAskOpen] = useState(false)
  const [muni, setMuni] = useState('nc')

  useEffect(() => {
    setMuni(new URLSearchParams(window.location.search).get('muni') || 'nc')
  }, [])

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
      <button className="btn-ask" style={btnStyle} onClick={() => setAskOpen(true)}>
        <Sparkles size={13} aria-hidden /> Ask
      </button>
      {open && <Lightbox url={open.url} title={open.title} onClose={() => setOpen(null)} />}
      {contactOpen && <ContactLightbox onClose={() => setContactOpen(false)} />}
      {askOpen && <AskLightbox muni={muni} onClose={() => setAskOpen(false)} />}
    </div>
  )
}
