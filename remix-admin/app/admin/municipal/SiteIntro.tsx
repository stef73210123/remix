'use client'

import { useState } from 'react'
import { BRAND } from '@/lib/flavor'

/**
 * "What is this, and who made it" note at the top of the public dashboard.
 *
 * The key disclaimer — unofficial, not the Town, automated summaries can be
 * wrong, the Town's records are the authority — is always on screen as one
 * short line. The longer explanation used to be an open card that took most
 * of a phone's first screen; it now sits behind "More". The full disclaimer
 * also lives in SiteFooter on every page.
 */
export default function SiteIntro() {
  const [open, setOpen] = useState(false)

  return (
    <div className="site-intro" style={{ marginBottom: 14, maxWidth: 760 }}>
      <div style={{ fontSize: 12.5, lineHeight: 1.5 }}>
        <strong>Independent and unofficial</strong> — not a Town of North Castle website. Summaries are
        automated and can be wrong; the Town&apos;s own records are the authority.{' '}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          style={{ font: 'inherit', color: 'var(--primary-light)', background: 'none', border: 'none', padding: 0, cursor: 'pointer', textDecoration: 'underline' }}
        >
          {open ? 'Less' : 'More'}
        </button>
      </div>
      {open && (
        <div className="muted" style={{ fontSize: 12.5, lineHeight: 1.6, marginTop: 8 }}>
          <p style={{ margin: '0 0 8px' }}>
            {BRAND.name} gathers the Town of North Castle&apos;s own public records — meeting agendas,
            minutes, recordings and the municipal code — into one place, and adds plain-language summaries
            so you can find what happened without watching hours of video.
          </p>
          <p style={{ margin: 0 }}>
            It is not affiliated with or endorsed by the Town, and doesn&apos;t take a position on any
            application, candidate or policy. Summaries, transcripts and charts are produced automatically,
            so they can be incomplete or wrong — every page points back to the Town&apos;s own minutes and
            code. If you spot a mistake, tell us and we&apos;ll fix it.
          </p>
        </div>
      )}
    </div>
  )
}
