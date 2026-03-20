'use client'

import { useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import type { ConfigMap } from '@/types'

const ASSETS = [
  { slug: 'livingstonfarm', name: 'Livingston Farm' },
  { slug: 'wrenofthewoods', name: 'Wren of the Woods' },
]

const ASSET_FIELDS = [
  { key: 'raise_target', label: 'Raise Target ($)', type: 'number' },
  { key: 'raise_to_date', label: 'Raised to Date ($)', type: 'number' },
  { key: 'status', label: 'Status', type: 'select', options: ['Raising', 'Active', 'Stabilized', 'Exited'] },
  { key: 'target_irr', label: 'Target IRR', type: 'text' },
  { key: 'target_multiple', label: 'Target Multiple', type: 'text' },
  { key: 'hold_period', label: 'Hold Period', type: 'text' },
  { key: 'minimum', label: 'Minimum Investment ($)', type: 'number' },
  { key: 'asset_type', label: 'Asset Type', type: 'text' },
  { key: 'location', label: 'Location', type: 'text' },
]

export default function AdminConfigPage() {
  const [config, setConfig] = useState<ConfigMap>({})
  const [loading, setLoading] = useState(true)
  const [edits, setEdits] = useState<ConfigMap>({})
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/config')
      if (!res.ok) throw new Error()
      const data = await res.json()
      setConfig(data)
      setEdits(data)
    } catch {
      toast.error('Failed to load config')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const getValue = (key: string) => edits[key] ?? config[key] ?? ''
  const setValue = (key: string, value: string) => setEdits((e) => ({ ...e, [key]: value }))

  const handleSaveAsset = async (slug: string) => {
    setSaving(true)
    try {
      const updates: ConfigMap = {}
      for (const field of ASSET_FIELDS) {
        const fullKey = `${slug}_${field.key}`
        updates[fullKey] = getValue(fullKey)
      }
      const res = await fetch('/api/admin/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Save failed'); return }
      toast.success('Config saved')
      load()
    } catch {
      toast.error('Network error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="container mx-auto max-w-6xl px-4 py-12">
      <p className="text-sm text-muted-foreground">Loading config…</p>
    </div>
  )

  return (
    <div className="container mx-auto max-w-6xl px-4 py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Asset Configuration</h1>
        <p className="text-muted-foreground mt-1">Update raise targets, returns, and other asset details</p>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        {ASSETS.map(({ slug, name }) => (
          <Card key={slug}>
            <CardHeader>
              <CardTitle className="text-base">{name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {ASSET_FIELDS.map((field) => {
                const fullKey = `${slug}_${field.key}`
                return (
                  <div key={field.key} className="space-y-1">
                    <Label>{field.label}</Label>
                    {field.type === 'select' ? (
                      <Select
                        value={getValue(fullKey)}
                        onValueChange={(v) => setValue(fullKey, v)}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {field.options?.map((opt) => (
                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        type={field.type}
                        value={getValue(fullKey)}
                        onChange={(e) => setValue(fullKey, e.target.value)}
                      />
                    )}
                  </div>
                )
              })}
              <Button
                onClick={() => handleSaveAsset(slug)}
                disabled={saving}
                className="w-full mt-2"
              >
                {saving ? 'Saving…' : `Save ${name}`}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
