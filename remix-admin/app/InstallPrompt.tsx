'use client'

import { useEffect, useState } from 'react'
import { Share, Plus, X } from 'lucide-react'
import { track } from '@/lib/analytics'

/**
 * A slim bumper above the masthead offering to put the site on the reader's
 * home screen. Shown once per visit and dismissible; it never covers content,
 * it pushes the page down and scrolls away with it.
 *
 * The two platforms need different things:
 *   • Android/Chrome fires `beforeinstallprompt`, which we capture and replay
 *     when the reader taps Install, so they get the real system sheet.
 *   • iOS has no such API — Safari can only be driven by the reader through
 *     Share → Add to Home Screen, so there the bumper is instructions, and it
 *     is shown only in Safari, because no other iOS browser can install.
 *
 * It stays hidden for anyone already running the installed app, and on desktop,
 * where "home screen" means nothing.
 */

const DISMISS_KEY = 'onc:install-bumper-dismissed'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function alreadyInstalled(): boolean {
  if (typeof window === 'undefined') return true
  // iOS reports this on navigator; everyone else through the display-mode query.
  const iosStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone
  return !!iosStandalone || window.matchMedia('(display-mode: standalone)').matches
}

/** iOS Safari specifically — Chrome and Firefox on iOS cannot add to the home screen. */
function isIosSafari(): boolean {
  const ua = navigator.userAgent
  const ios = /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) // iPadOS
  if (!ios) return false
  return !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua)
}

export default function InstallPrompt() {
  const [mode, setMode] = useState<null | 'android' | 'ios'>(null)
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    // Dismissal lasts the visit, not forever: sessionStorage clears when the
    // tab closes, so the offer comes back next time they arrive rather than
    // being spent on one accidental tap.
    let dismissed = false
    try { dismissed = sessionStorage.getItem(DISMISS_KEY) === '1' } catch { /* private mode */ }
    if (dismissed || alreadyInstalled()) return

    if (isIosSafari()) { setMode('ios'); return }

    const onPrompt = (e: Event) => {
      // Keep the event: Chrome only lets it be replayed if we stop the
      // automatic mini-infobar here.
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
      setMode('android')
    }
    window.addEventListener('beforeinstallprompt', onPrompt)

    const onInstalled = () => { setMode(null); track('install_prompt', { action: 'installed' }) }
    window.addEventListener('appinstalled', onInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  useEffect(() => {
    if (mode) track('install_prompt', { action: 'shown', platform: mode })
  }, [mode])

  if (!mode) return null

  function close() {
    try { sessionStorage.setItem(DISMISS_KEY, '1') } catch { /* private mode */ }
    track('install_prompt', { action: 'dismissed', platform: mode })
    setMode(null)
  }

  async function install() {
    if (!deferred) return
    track('install_prompt', { action: 'accepted', platform: 'android' })
    await deferred.prompt()
    const { outcome } = await deferred.userChoice
    track('install_prompt', { action: `choice_${outcome}`, platform: 'android' })
    setMode(null)
  }

  return (
    <div
      role="region"
      aria-label="Add this site to your home screen"
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 14px', fontSize: 12.5, lineHeight: 1.4,
        background: 'var(--panel-2, #efece3)', borderBottom: '1px solid var(--border)',
      }}
    >
      <span style={{ flex: 1, minWidth: 0 }}>
        {mode === 'ios' ? (
          <>
            Add OpenNorthCastle to your home screen — tap{' '}
            <Share size={12} aria-label="Share" style={{ verticalAlign: '-2px' }} /> then{' '}
            <strong>Add to Home Screen</strong>.
          </>
        ) : (
          <>Add OpenNorthCastle to your home screen for quick access.</>
        )}
      </span>

      {mode === 'android' && (
        <button
          onClick={install}
          className="btn"
          style={{ padding: '4px 10px', fontSize: 12, flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 5 }}
        >
          <Plus size={12} aria-hidden /> Install
        </button>
      )}

      <button
        onClick={close}
        aria-label="Dismiss"
        style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: 4,
          lineHeight: 0, opacity: 0.6, flexShrink: 0,
        }}
      >
        <X size={15} />
      </button>
    </div>
  )
}
