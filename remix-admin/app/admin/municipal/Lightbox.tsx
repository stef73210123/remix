'use client'

import { useEffect, useState } from 'react'

/**
 * Full-screen lightbox that embeds an external URL in an iframe. Some civic
 * portals (NextRequest FOIL, SeeClickFix) may refuse framing via
 * X-Frame-Options; the header always carries an "Open in new tab" affordance so
 * the action still works, and a short delay reveals a fallback note if the frame
 * hasn't loaded. Closes on the ✕, a backdrop click, or Escape.
 */
export default function Lightbox({
  url,
  title,
  onClose,
}: {
  url: string
  title: string
  onClose: () => void
}) {
  const [loaded, setLoaded] = useState(false)
  const [slow, setSlow] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const t = setTimeout(() => setSlow(true), 2500)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
      clearTimeout(t)
    }
  }, [onClose])

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 4000,
        background: 'rgba(0,0,0,0.66)', backdropFilter: 'blur(3px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3vh 2vw',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(1000px, 100%)', height: 'min(88vh, 100%)',
          background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 14,
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          boxShadow: '0 24px 80px rgba(0,0,0,0.55)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontWeight: 700, fontSize: 14, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {title}
          </div>
          <a href={url} target="_blank" rel="noopener noreferrer" className="btn secondary" style={{ padding: '6px 12px', fontSize: 13, textDecoration: 'none' }}>
            Open in new tab ↗
          </a>
          <button onClick={onClose} aria-label="Close" className="btn secondary" style={{ padding: '6px 11px', fontSize: 15, lineHeight: 1 }}>✕</button>
        </div>
        <div style={{ position: 'relative', flex: 1, background: '#fff' }}>
          {!loaded && (
            <div className="muted" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8, textAlign: 'center', padding: 24, background: 'var(--panel)' }}>
              <div>Loading form…</div>
              {slow && (
                <div style={{ fontSize: 12, maxWidth: 420, lineHeight: 1.5 }}>
                  If the form doesn’t appear, the portal may block embedding —
                  use <strong>Open in new tab ↗</strong> above.
                </div>
              )}
            </div>
          )}
          <iframe
            src={url}
            title={title}
            onLoad={() => setLoaded(true)}
            style={{ border: 0, width: '100%', height: '100%', display: 'block' }}
          />
        </div>
      </div>
    </div>
  )
}
