'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import Image from 'next/image'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const searchParams = useSearchParams()
  const urlError = searchParams.get('error')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Unable to sign in. Please try again.')
        return
      }
      window.location.href = data.redirectTo
    } catch {
      setError('Unable to sign in. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const displayError = error || (urlError === 'expired'
    ? 'This link has expired or is invalid.'
    : urlError
      ? 'Unable to sign in. Please try again.'
      : null)

  return (
    <>
      {displayError && (
        <div className="mb-4 rounded-md bg-red-500/20 border border-red-500/30 px-3 py-2 text-sm text-red-300">
          {displayError}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-white/80 text-xs tracking-wide uppercase" style={{ fontFamily: 'var(--font-josefin)' }}>Email address</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            autoFocus
            className="bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:border-white/50"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password" className="text-white/80 text-xs tracking-wide uppercase" style={{ fontFamily: 'var(--font-josefin)' }}>Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className="bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:border-white/50"
          />
          <div className="text-right">
            <a
              href="/forgot-password"
              className="text-xs text-white/40 underline-offset-4 hover:text-white/70 transition-colors"
            >
              Forgot password?
            </a>
          </div>
        </div>
        <Button
          type="submit"
          className="w-full mt-2 border border-white/30 bg-white/10 text-white hover:bg-white/20 transition-colors"
          style={{ fontFamily: 'var(--font-josefin)', letterSpacing: '0.1em' }}
          disabled={loading}
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </>
  )
}

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-4 overflow-hidden">
      {/* Video background */}
      <div className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true">
        <iframe
          src="https://www.youtube.com/embed/1_Fbu9hpAV4?autoplay=1&mute=1&loop=1&playlist=1_Fbu9hpAV4&controls=0&showinfo=0&rel=0&iv_load_policy=3&playsinline=1"
          allow="autoplay; encrypted-media"
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: '100vw',
            height: '56.25vw',
            minHeight: '100%',
            minWidth: '177.78vh',
            transform: 'translate(-50%, -50%)',
            border: 0,
          }}
        />
      </div>
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/60" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center w-full max-w-sm">
        {/* Logo + wordmark */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <Image src="/seed-of-life-white.png" alt="Circular" width={56} height={56} />
          <span
            className="text-white font-medium tracking-[0.1024em] uppercase"
            style={{ fontFamily: 'var(--font-josefin)', fontSize: '36px', lineHeight: 1, transform: 'translateY(3px)' }}
          >
            Circular
          </span>
          <p className="text-white/50 text-xs tracking-widest uppercase" style={{ fontFamily: 'var(--font-josefin)' }}>
            Private Investment Platform
          </p>
        </div>

        <Card className="w-full bg-black/40 border-white/20 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg text-white font-light tracking-widest uppercase" style={{ fontFamily: 'var(--font-josefin)' }}>
              Sign in
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Suspense>
              <LoginForm />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
