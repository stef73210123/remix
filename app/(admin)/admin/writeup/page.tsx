'use client'

import { useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

const ASSETS = [
  { slug: 'livingstonfarm', name: 'Livingston Farm' },
  { slug: 'wrenofthewoods', name: 'Wren of the Woods' },
  { slug: 'circularplatform', name: 'Circular Platform' },
]

interface ContentState {
  tagline: string
  description: string
  highlights: string
}

const emptyContent = (): ContentState => ({ tagline: '', description: '', highlights: '' })

export default function AdminWriteupPage() {
  const [asset, setAsset] = useState('livingstonfarm')
  const [content, setContent] = useState<ContentState>(emptyContent())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/content?asset=${asset}`)
      if (!res.ok) throw new Error()
      setContent(await res.json())
    } catch {
      toast.error('Failed to load content')
    } finally {
      setLoading(false)
    }
  }, [asset])

  useEffect(() => { load() }, [load])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/content', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asset, ...content }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Save failed'); return }
      toast.success('Saved — changes appear on the public page within ~60 seconds')
    } catch {
      toast.error('Network error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Property Write-up</h1>
        <p className="text-muted-foreground mt-1">
          Edit the tagline, description, and highlights shown on the public property page.
        </p>
      </div>

      <div className="flex gap-2 mb-8">
        {ASSETS.map(({ slug, name }) => (
          <Button
            key={slug}
            variant={asset === slug ? 'default' : 'outline'}
            size="sm"
            onClick={() => setAsset(slug)}
          >
            {name}
          </Button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="tagline">Tagline</Label>
            <p className="text-xs text-muted-foreground">
              Short subtitle shown under the property name in the hero section.
            </p>
            <Input
              id="tagline"
              value={content.tagline}
              onChange={(e) => setContent((c) => ({ ...c, tagline: e.target.value }))}
              placeholder="e.g. 121-acre regenerative agritourism destination in the Catskills"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Write-up</Label>
            <p className="text-xs text-muted-foreground">
              Full property description. Supports Markdown formatting — leave a blank line between
              paragraphs, use <code className="bg-muted px-1 rounded">**bold**</code> for{' '}
              <strong>bold</strong>, <code className="bg-muted px-1 rounded">*italic*</code> for{' '}
              <em>italic</em>, and <code className="bg-muted px-1 rounded">## Heading</code> for
              section headings.
            </p>
            <Textarea
              id="description"
              value={content.description}
              onChange={(e) => setContent((c) => ({ ...c, description: e.target.value }))}
              rows={16}
              className="font-mono text-sm leading-relaxed"
              placeholder={`The mission behind this property is to...\n\nThe property features 121 acres of...\n\nLocated steps from downtown...`}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="highlights">Highlights</Label>
            <p className="text-xs text-muted-foreground">
              Key features shown as bullet points on the public page. One item per line.
            </p>
            <Textarea
              id="highlights"
              value={content.highlights}
              onChange={(e) => setContent((c) => ({ ...c, highlights: e.target.value }))}
              rows={8}
              placeholder={`Farm Stays\nPrivate Events (May–October)\nRegenerative Farm & Market Garden\nAgroforestry & Rotational Grazing\nHemlock & Hardwood Forests\nWalkable to Livingston Manor`}
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
            <span className="text-xs text-muted-foreground">
              Changes appear on the public page within ~60 seconds.
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
