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
      <p className="muted" style={{ fontSize: 12, lineHeight: 1.5, maxWidth: 640, margin: '0 auto' }}>
        OpenNorthCastle is not an official website of the Town of North Castle. It is an independently
        developed tool made available for the public benefit. This site was built using AI, and its
        accuracy is not guaranteed —{' '}
        <button
          onClick={() => setContactOpen(true)}
          className="link-button"
          style={{
            font: 'inherit', color: 'var(--primary-light)', background: 'none', border: 'none',
            padding: 0, cursor: 'pointer', textDecoration: 'underline',
          }}
        >
          contact us
        </button>{' '}
        if you spot an issue.
      </p>
      {contactOpen && <ContactLightbox onClose={() => setContactOpen(false)} />}
    </footer>
  )
}
