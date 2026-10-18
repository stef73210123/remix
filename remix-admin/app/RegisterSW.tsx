'use client'

import { useEffect } from 'react'

/**
 * Registers the service worker that makes the site installable (see
 * public/sw.js). Deliberately after load, so it never competes with the first
 * paint, and silent on failure — an unregistrable worker must not be allowed
 * to surface as an error to a reader who only came to read an agenda.
 */
export default function RegisterSW() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    const register = () => { navigator.serviceWorker.register('/sw.js').catch(() => {}) }
    if (document.readyState === 'complete') register()
    else {
      window.addEventListener('load', register, { once: true })
      return () => window.removeEventListener('load', register)
    }
  }, [])
  return null
}
