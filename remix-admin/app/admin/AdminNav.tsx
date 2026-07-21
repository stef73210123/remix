'use client'

/**
 * Global admin navigation — a hamburger button in the top-right that opens a
 * compact dropdown with the section links (Dashboard · CRM · OpenDocket ·
 * Atlas · Circular · PlayGM) and Sign out. Keeps the header clean on mobile
 * instead of a wide button strip.
 */
import { useEffect, useRef, useState } from 'react'
import { Menu, X } from 'lucide-react'

const LINKS: { label: string; href: string; external?: boolean }[] = [
  { label: 'Dashboard', href: '/admin/dashboard' },
  { label: 'CRM', href: '/admin' },
  { label: 'OpenDocket', href: '/admin/municipal' },
  { label: 'Atlas', href: 'https://atlas.remixcre.com', external: true },
  { label: 'Circular', href: 'https://investors.circular.enterprises/admin/feed', external: true },
  { label: 'PlayGM', href: 'https://playgm-server.vercel.app/admin/dashboard', external: true },
]

export default function AdminNav() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click or Escape.
  useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  async function logout() {
    await fetch('/admin/api/auth/logout', { method: 'POST' })
    window.location.href = '/admin/login'
  }

  const itemStyle: React.CSSProperties = { justifyContent: 'flex-start', width: '100%' }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        className="btn secondary"
        aria-label="Menu"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        style={{ padding: '8px 10px' }}
      >
        {open ? <X size={18} /> : <Menu size={18} />}
      </button>

      {open && (
        <div
          role="menu"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            zIndex: 50,
            minWidth: 180,
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            padding: 8,
            background: 'var(--panel)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            boxShadow: '0 12px 32px rgba(0, 0, 0, 0.5)',
          }}
        >
          {LINKS.map((l) => (
            <a
              key={l.label}
              role="menuitem"
              className="btn secondary"
              href={l.href}
              {...(l.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              onClick={() => setOpen(false)}
              style={itemStyle}
            >
              {l.label}
            </a>
          ))}
          <button role="menuitem" className="btn secondary" onClick={logout} style={itemStyle}>
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}
