'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'

const ASSET_OPTIONS = [
  { value: 'livingstonfarm', label: 'Livingston Farm' },
  { value: 'wrenofthewoods', label: 'Wren of the Woods' },
  { value: 'both', label: 'Both Assets' },
]

function RequestForm() {
  const searchParams = useSearchParams()
  const prefilledAsset = searchParams.get('asset') || ''

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    asset: ASSET_OPTIONS.find((o) => o.value === prefilledAsset)?.value || '',
    message: '',
  })
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/contact/request-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to submit. Please try again.')
        return
      }
      setSubmitted(true)
    } catch {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <Card className="w-full max-w-lg">
        <CardContent className="pt-6 text-center space-y-2">
          <div className="text-2xl">✓</div>
          <p className="font-medium">Request received</p>
          <p className="text-sm text-muted-foreground">
            Thanks, we&apos;ll be in touch shortly.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>Request Deal Room Access</CardTitle>
        <CardDescription>
          Fill out this form and we&apos;ll be in touch to discuss the opportunity.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Full name *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email address *</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone (optional)</Label>
              <Input
                id="phone"
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Asset interested in</Label>
              <Select
                value={form.asset}
                onValueChange={(v) => setForm({ ...form, asset: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select asset" />
                </SelectTrigger>
                <SelectContent>
                  {ASSET_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="message">Message (optional)</Label>
            <Textarea
              id="message"
              rows={4}
              placeholder="Tell us a bit about yourself and your investment interest."
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Submitting…' : 'Submit Request'}
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            For accredited investors only. We will never share your information.
          </p>
        </form>
      </CardContent>
    </Card>
  )
}

export default function RequestAccessPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 flex items-start justify-center py-16 px-4">
        <Suspense>
          <RequestForm />
        </Suspense>
      </main>
      <Footer />
    </div>
  )
}
