'use client'

import { useState } from 'react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await fetch('/admin/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
    } catch {
      // ignore — we always show the same confirmation
    } finally {
      setLoading(false)
      setSent(true)
    }
  }

  return (
    <div className="auth-wrap">
      <form className="card auth-card" onSubmit={onSubmit}>
        <h1 style={{ margin: '0 0 16px', fontSize: 18 }}>Reset password</h1>

        {sent ? (
          <p className="success">
            If an account exists for that email, a reset link is on its way.
            Check your inbox.
          </p>
        ) : (
          <>
            <label className="label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ marginBottom: 16 }}
              required
            />
            <button
              className="btn"
              type="submit"
              disabled={loading}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              {loading ? 'Sending…' : 'Send reset link'}
            </button>
          </>
        )}

        <div style={{ marginTop: 16 }}>
          <a href="/admin/login" className="muted" style={{ fontSize: 13 }}>
            ← Back to sign in
          </a>
        </div>
      </form>
    </div>
  )
}
