'use client'

import { useEffect, useState } from 'react'
import { useLockBodyScroll } from './useLockBodyScroll'

const RECIPIENTS = ['OpenNorthCastle team', 'Town Board', 'Planning Board', 'Building Department']

/**
 * Contact form lightbox — same visual/interaction shell as Lightbox.tsx and
 * EventLightbox.tsx (dark backdrop, rounded panel, ✕/backdrop/Escape to
 * close). All submissions route to a single inbox (sm@remix.properties);
 * the department/board dropdown is just routing context in the message
 * itself, since OpenNorthCastle is an independent tool, not an official
 * Town channel.
 */
export default function ContactLightbox({ onClose }: { onClose: () => void }) {
  const [recipient, setRecipient] = useState(RECIPIENTS[0])
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  useLockBodyScroll()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('sending')
    setError(null)
    try {
      const res = await fetch('/admin/api/municipal/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipient, name, email, message }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed to send message.')
      setStatus('sent')
    } catch (e) {
      setStatus('error')
      setError(e instanceof Error ? e.message : 'Failed to send message.')
    }
  }

  const fieldStyle: React.CSSProperties = {
    width: '100%', fontSize: 13.5, padding: '8px 10px', borderRadius: 7,
    background: 'var(--panel-2)', border: '1px solid var(--border)', color: 'var(--text)',
  }

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
          width: 'min(440px, 100%)', maxHeight: '88vh',
          display: 'flex', flexDirection: 'column',
          background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 14,
          boxShadow: '0 24px 80px rgba(0,0,0,0.55)', overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '16px 18px 4px', flexShrink: 0 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 17, lineHeight: 1.3 }}>Contact</div>
          </div>
          <button onClick={onClose} aria-label="Close" className="btn secondary" style={{ padding: '4px 10px', fontSize: 14, lineHeight: 1, flexShrink: 0 }}>✕</button>
        </div>
        <div style={{ padding: '10px 18px 18px', overflowY: 'auto', minHeight: 0 }}>
          {status === 'sent' ? (
            <div className="muted" style={{ fontSize: 13.5, lineHeight: 1.55, padding: '8px 0' }}>
              Thanks — your message has been sent. We&apos;ll get back to you as soon as we can.
            </div>
          ) : (
            <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12.5 }}>
                <span className="muted">Which department or board?</span>
                <select value={recipient} onChange={(e) => setRecipient(e.target.value)} style={fieldStyle}>
                  {RECIPIENTS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12.5 }}>
                <span className="muted">Your name</span>
                <input required value={name} onChange={(e) => setName(e.target.value)} style={fieldStyle} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12.5 }}>
                <span className="muted">Your email</span>
                <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={fieldStyle} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12.5 }}>
                <span className="muted">Message</span>
                <textarea required rows={4} value={message} onChange={(e) => setMessage(e.target.value)} style={{ ...fieldStyle, resize: 'vertical' }} />
              </label>
              {error && <div style={{ fontSize: 12.5, color: '#b91c1c' }}>{error}</div>}
              <button type="submit" className="btn" disabled={status === 'sending'} style={{ padding: '9px 14px', fontSize: 13.5, alignSelf: 'flex-start' }}>
                {status === 'sending' ? 'Sending…' : 'Send message'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
