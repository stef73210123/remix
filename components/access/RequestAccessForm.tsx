'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const ASSET_OPTIONS = [
  { value: 'livingstonfarm', label: 'Livingston Farm' },
  { value: 'wrenofthewoods', label: 'Wren of the Woods' },
  { value: 'both', label: 'Both Assets' },
]

interface RequestAccessFormProps {
  /** Called after a successful submission (e.g. modal parent uses it to close). */
  onSuccess?: () => void
  /** Optional pre-selected asset slug, overrides the ?asset= URL param. */
  defaultAsset?: string
  /** When true, render the compact heading appropriate to a dialog. Defaults to false (page context). */
  compact?: boolean
}

export function RequestAccessForm({ onSuccess, defaultAsset, compact = false }: RequestAccessFormProps) {
  const searchParams = useSearchParams()
  const urlAsset = searchParams?.get('asset') || ''
  const initialAsset = ASSET_OPTIONS.find((o) => o.value === (defaultAsset || urlAsset))?.value || ''

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    asset: initialAsset,
    message: '',
  })
  const [accredited, setAccredited] = useState(false)
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!accredited) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/contact/request-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data?.error || 'Failed to submit. Please try again.')
        return
      }
      setSubmitted(true)
      if (onSuccess) {
        // Give the user a beat to see the confirmation before closing.
        setTimeout(onSuccess, 1400)
      }
    } catch {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="text-center space-y-2 py-4">
        <div className="text-3xl" aria-hidden="true">✓</div>
        <p className="font-medium">Request received</p>
        <p className="text-sm text-muted-foreground">
          Thanks, we&apos;ll be in touch shortly.
        </p>
      </div>
    )
  }

  const submitDisabled = !accredited || loading

  return (
    <div className="space-y-4">
      {!compact && (
        <div className="space-y-1">
          <h2 className="text-xl font-semibold tracking-tight">Request Deal Room Access</h2>
          <p className="text-sm text-muted-foreground">
            Fill out this form and we&apos;ll be in touch to discuss the opportunity.
          </p>
        </div>
      )}
      {compact && (
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight">Request Deal Room Access</h2>
          <p className="text-sm text-muted-foreground">
            We&apos;ll be in touch to discuss the opportunity.
          </p>
        </div>
      )}

      {error && (
        <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="ra-name">Full name *</Label>
            <Input
              id="ra-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              autoComplete="name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ra-email">Email address *</Label>
            <Input
              id="ra-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
              autoComplete="email"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="ra-phone">Phone (optional)</Label>
            <Input
              id="ra-phone"
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              autoComplete="tel"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ra-asset">Asset interested in</Label>
            <Select
              value={form.asset}
              onValueChange={(v) => setForm({ ...form, asset: v })}
            >
              <SelectTrigger id="ra-asset">
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
          <Label htmlFor="ra-message">Message (optional)</Label>
          <Textarea
            id="ra-message"
            rows={compact ? 3 : 4}
            placeholder="Tell us a bit about yourself and your investment interest."
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
          />
        </div>

        {/* Accreditation gate — required. Submit stays disabled until this is checked. */}
        <label
          htmlFor="ra-accredited"
          className="flex items-start gap-3 rounded-md border bg-muted/30 p-3 cursor-pointer text-sm select-none"
        >
          <input
            id="ra-accredited"
            type="checkbox"
            checked={accredited}
            onChange={(e) => setAccredited(e.target.checked)}
            required
            aria-required="true"
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-input accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring cursor-pointer"
          />
          <span>
            I certify that I am an accredited investor as defined by SEC Rule 501.
          </span>
        </label>

        <Button
          type="submit"
          className="w-full"
          disabled={submitDisabled}
          aria-disabled={submitDisabled}
          style={submitDisabled ? { cursor: 'not-allowed' } : undefined}
        >
          {loading ? 'Submitting…' : 'Submit Request'}
        </Button>
      </form>
    </div>
  )
}
