'use client'

import { useEffect, useState } from 'react'
import { BRAND } from '@/lib/flavor'

const DISMISS_KEY = 'onc:intro-dismissed'

/**
 * A short "what is this, and who made it" note at the top of the public
 * dashboard. Most people arrive from a link with no idea what they're looking
 * at, and the single biggest source of friction (and of suspicion) is a page of
 * charts about their town government with no stated purpose. This says the
 * plain thing up front: it's unofficial, it's assembled from the Town's own
 * public records, and it doesn't take sides.
 *
 * Collapses to a one-liner once dismissed, per browser — never hidden outright,
 * because the disclaimer has to stay reachable.
 */
export default function SiteIntro() {
  const [dismissed, setDismissed] = useState<boolean | null>(null)

  useEffect(() => {
    try { setDismissed(localStorage.getItem(DISMISS_KEY) === '1') } catch { setDismissed(false) }
  }, [])

  // Render nothing until we know — avoids a flash of the full card for readers
  // who already dismissed it.
  if (dismissed === null) return null

  function dismiss() {
    try { localStorage.setItem(DISMISS_KEY, '1') } catch { /* private mode — fine */ }
    setDismissed(true)
  }

  if (dismissed) {
    return (
      <div className="muted" style={{ fontSize: 12, marginBottom: 16, lineHeight: 1.5 }}>
        An independent, unofficial guide to North Castle&apos;s public meeting records.{' '}
        <button
          onClick={() => { try { localStorage.removeItem(DISMISS_KEY) } catch {} setDismissed(false) }}
          className="link-button"
          style={{ font: 'inherit', color: 'var(--primary-light)', background: 'none', border: 'none', padding: 0, cursor: 'pointer', textDecoration: 'underline' }}
        >
          What is this?
        </button>
      </div>
    )
  }

  return (
    <div className="card" style={{ padding: 16, marginBottom: 20, maxWidth: 760 }}>
      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>What this site is</div>
      <p style={{ fontSize: 13.5, lineHeight: 1.6, margin: '0 0 10px' }}>
        {BRAND.name} gathers the Town of North Castle&apos;s own public records — meeting agendas,
        minutes, recordings and the municipal code — into one place, and adds plain-language summaries
        so you can find what happened without watching hours of video.
      </p>
      <p className="muted" style={{ fontSize: 12.5, lineHeight: 1.6, margin: '0 0 10px' }}>
        It is <strong>not an official Town website</strong> and is not affiliated with or endorsed by the
        Town. It doesn&apos;t take a position on any application, candidate or policy. Summaries,
        transcripts and charts are produced automatically, so they can be incomplete or wrong — the
        Town&apos;s own minutes and code are always the authority, and every page here points back to
        them. If you spot a mistake, tell us and we&apos;ll fix it.
      </p>
      <button onClick={dismiss} className="btn secondary" style={{ padding: '4px 10px', fontSize: 12 }}>
        Got it
      </button>
    </div>
  )
}
