'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'

function ResetForm() {
  const params = useSearchParams()
  const token = params.get('token') || ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/admin/api/auth/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      if (res.ok) {
        setDone(true)
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Could not reset password')
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return <p className="error">This reset link is missing its token.</p>
  }

  if (done) {
    return (
      <>
        <p className="success">Your password has been updated.</p>
        <a href="/admin/login" className="btn" style={{ marginTop: 12 }}>
          Sign in
        </a>
      </>
    )
  }

  return (
    <form onSubmit={onSubmit}>
      <h1 style={{ margin: '0 0 16px', fontSize: 18 }}>Choose a new password</h1>

      <label className="label" htmlFor="password">
        New password
      </label>
      <input
        id="password"
        className="input"
        type="password"
        autoComplete="new-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{ marginBottom: 14 }}
        required
      />

      <label className="label" htmlFor="confirm">
        Confirm password
      </label>
      <input
        id="confirm"
        className="input"
        type="password"
        autoComplete="new-password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        style={{ marginBottom: 16 }}
        required
      />

      {error && <p className="error" style={{ marginTop: 0 }}>{error}</p>}

      <button
        className="btn"
        type="submit"
        disabled={loading}
        style={{ width: '100%', justifyContent: 'center' }}
      >
        {loading ? 'Saving…' : 'Update password'}
      </button>
    </form>
  )
}

export default function ResetPage() {
  return (
    <div className="auth-wrap">
      <div className="card auth-card">
        <Suspense fallback={<p className="muted">Loading…</p>}>
          <ResetForm />
        </Suspense>
      </div>
    </div>
  )
}
