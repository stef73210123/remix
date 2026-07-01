'use client'

import { useState } from 'react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/admin/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      if (res.ok) {
        window.location.href = '/admin'
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Login failed')
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-wrap">
      <form className="card auth-card" onSubmit={onSubmit}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://remix-admin-omega.vercel.app/remix-wordmark.png"
          alt="Remix Properties"
          className="wordmark"
        />
        <p className="muted" style={{ margin: '6px 0 24px', fontSize: 13 }}>
          Properties — Admin
        </p>

        <label className="label" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          className="input"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ marginBottom: 14 }}
          required
        />

        <label className="label" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          className="input"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ marginBottom: 8 }}
          required
        />

        <div style={{ textAlign: 'right', marginBottom: 16 }}>
          <a href="/admin/forgot-password" className="muted" style={{ fontSize: 13 }}>
            Forgot password?
          </a>
        </div>

        {error && <p className="error" style={{ marginTop: 0 }}>{error}</p>}

        <button className="btn" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}
