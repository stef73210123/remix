'use client'

import { useState } from 'react'
import ContactLightbox from './admin/municipal/ContactLightbox'

export default function SiteFooter() {
  const [contactOpen, setContactOpen] = useState(false)

  return (
    <footer
      style={{
        borderTop: '1px solid var(--border)',
        marginTop: 40,
        padding: '16px 20px calc(68px + env(safe-area-inset-bottom, 0px))',
        textAlign: 'center',
      }}
    >
      <p className="muted" style={{ fontSize: 12, lineHeight: 1.6, maxWidth: 660, margin: '0 auto' }}>
        <strong>OpenNorthCastle is not affiliated with, endorsed by, or speaking for the Town of North
        Castle.</strong> It is an independent, volunteer-built tool that gathers the Town&apos;s own public
        records — agendas, minutes, meeting recordings and the municipal code — into one place so
        they&apos;re easier to find and read. It doesn&apos;t take positions on applications or policy.
      </p>
      <p className="muted" style={{ fontSize: 12, lineHeight: 1.6, maxWidth: 660, margin: '10px auto 0' }}>
        Much of what you see here — summaries, transcripts, and the topic and tone breakdowns — is
        produced automatically by software, so it can be incomplete or wrong, and it is never the
        official record. For anything that matters, use the Town&apos;s own minutes, resolutions and
        code as the authority. Found a mistake?{' '}
        <button
          onClick={() => setContactOpen(true)}
          className="link-button"
          style={{
            font: 'inherit', color: 'var(--primary-light)', background: 'none', border: 'none',
            padding: 0, cursor: 'pointer', textDecoration: 'underline',
          }}
        >
          Tell us
        </button>{' '}
        and we&apos;ll correct it.
      </p>
      {contactOpen && <ContactLightbox onClose={() => setContactOpen(false)} />}
    </footer>
  )
}
