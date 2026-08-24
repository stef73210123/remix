'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Sparkles, Send } from 'lucide-react'
import { useLockBodyScroll } from './useLockBodyScroll'
import ClearableInput from '@/app/ClearableInput'

interface AskSource { title: string; date: string | null; url: string | null }
interface ChatTurn { role: 'user' | 'assistant'; content: string; sources?: AskSource[] }

const STARTERS = [
  "What's in the 2026 budget?",
  'Who do I call about a pothole?',
  'What boards and committees does the Town have?',
]

/**
 * "Ask" chat lightbox — same visual shell as ContactLightbox, but a running
 * conversation instead of a form. Answers come from /admin/api/municipal/ask,
 * which grounds the model in OpenNorthCastle's own committed data
 * (lib/municipal/askContext.ts) rather than an open-ended guess, so this is a
 * real first version of the assistant, not a mockup.
 */
export default function AskLightbox({ muni, onClose }: { muni: string; onClose: () => void }) {
  const [turns, setTurns] = useState<ChatTurn[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  // The overlay is `position: fixed`, which mobile Safari/Chrome anchor to
  // the *layout* viewport — that doesn't shrink when the on-screen keyboard
  // opens, only the *visual* viewport does. Without this, the flex-centered
  // card keeps centering (and sizing its maxHeight) against the full,
  // keyboard-obscured layout viewport, so the input row at the card's
  // bottom ends up hidden behind the keyboard instead of pinned above it.
  // Tracking visualViewport directly (same fix as PinBottomBar.tsx) keeps
  // the overlay's own rect — and the card's max height — matched to
  // whatever's actually visible at all times.
  const [viewportRect, setViewportRect] = useState<{ top: number; height: number } | null>(null)

  useLockBodyScroll()

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const update = () => setViewportRect({ top: vv.offsetTop, height: vv.height })
    update()
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
    }
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [turns, sending])

  async function ask(question: string) {
    const q = question.trim()
    if (!q || sending) return
    const nextTurns: ChatTurn[] = [...turns, { role: 'user', content: q }]
    setTurns(nextTurns)
    setInput('')
    setSending(true)
    setError(null)
    try {
      const res = await fetch('/admin/api/municipal/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ muni, question: q, history: turns }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Something went wrong.')
      const sources = Array.isArray(data.sources) ? (data.sources as AskSource[]) : undefined
      setTurns([...nextTurns, { role: 'assistant', content: data.answer as string, sources }])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
    } finally {
      setSending(false)
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    ask(input)
  }

  const fieldStyle: React.CSSProperties = {
    fontSize: 13.5, padding: '9px 12px', borderRadius: 8,
    background: 'var(--panel-2)', border: '1px solid var(--border)', color: 'var(--text)',
  }

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed', zIndex: 4000,
        ...(viewportRect
          ? { top: viewportRect.top, height: viewportRect.height, left: 0, right: 0 }
          : { inset: 0 }),
        background: 'rgba(0,0,0,0.66)', backdropFilter: 'blur(3px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3dvh 2vw',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(480px, 100%)',
          maxHeight: viewportRect ? Math.round(viewportRect.height * 0.92) : '88dvh',
          display: 'flex', flexDirection: 'column',
          background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 14,
          boxShadow: '0 24px 80px rgba(0,0,0,0.55)', overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '16px 18px 4px', flexShrink: 0 }}>
          <div
            style={{
              width: 28, height: 28, borderRadius: 8, flexShrink: 0, marginTop: 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)', color: '#fff',
            }}
          >
            <Sparkles size={15} aria-hidden />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 17, lineHeight: 1.3 }}>Ask</div>
            <div className="muted" style={{ fontSize: 11.5, lineHeight: 1.4, marginTop: 2 }}>
              An AI assistant answering from the public records collected on this site. It can be incomplete or
              wrong, and it doesn&rsquo;t speak for the Town — confirm anything that matters with the Town directly.
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" className="btn secondary" style={{ padding: '4px 10px', fontSize: 14, lineHeight: 1, flexShrink: 0 }}>✕</button>
        </div>

        <div ref={scrollRef} data-scroll-lock-allow style={{ padding: '10px 18px', overflowY: 'auto', minHeight: 160, flex: 1 }}>
          {turns.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 6 }}>
              {STARTERS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => ask(s)}
                  className="btn secondary"
                  style={{ fontSize: 12.5, padding: '8px 12px', textAlign: 'left', justifyContent: 'flex-start' }}
                >
                  {s}
                </button>
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {turns.map((t, i) => (
                <div
                  key={i}
                  style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: t.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '88%' }}
                >
                  <div
                    style={{
                      background: t.role === 'user' ? 'var(--primary)' : 'var(--panel-2)',
                      color: t.role === 'user' ? '#fff' : 'var(--text)',
                      border: t.role === 'user' ? 'none' : '1px solid var(--border)',
                      borderRadius: 12,
                      padding: '8px 12px',
                      fontSize: 13.5,
                      lineHeight: 1.5,
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {t.content}
                  </div>
                  {t.sources && t.sources.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '0 4px', maxWidth: '100%' }}>
                      <span className="muted" style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Sources</span>
                      {t.sources.map((s, si) => (
                        <span key={si} className="muted" style={{ fontSize: 11, lineHeight: 1.4 }}>
                          {s.url ? (
                            <a href={s.url} target="_blank" rel="noreferrer" style={{ color: 'inherit' }}>{s.title}</a>
                          ) : s.title}
                          {s.date ? ` (${s.date})` : ''}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {sending && (
                <div
                  style={{
                    alignSelf: 'flex-start', background: 'var(--panel-2)', border: '1px solid var(--border)',
                    borderRadius: 12, padding: '8px 12px', fontSize: 13.5, color: 'var(--muted)',
                  }}
                >
                  Thinking…
                </div>
              )}
            </div>
          )}
          {error && <div style={{ fontSize: 12.5, color: '#b91c1c', marginTop: 10 }}>{error}</div>}
        </div>

        <form onSubmit={submit} style={{ display: 'flex', gap: 8, padding: '10px 18px 18px', flexShrink: 0 }}>
          <ClearableInput
            autoFocus
            value={input}
            onChange={setInput}
            placeholder="Ask about budgets, boards, permits…"
            wrapperStyle={{ flex: 1 }}
            style={fieldStyle}
          />
          <button type="submit" className="btn" disabled={sending || !input.trim()} aria-label="Send" style={{ padding: '9px 14px' }}>
            <Send size={15} aria-hidden />
          </button>
        </form>
      </div>
    </div>,
    document.body,
  )
}
