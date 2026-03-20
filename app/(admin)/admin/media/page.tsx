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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import type { AssetMediaType, AssetMediaWithRow } from '@/types'

const ASSETS = [
  { slug: 'livingstonfarm', name: 'Livingston Farm' },
  { slug: 'wrenofthewoods', name: 'Wren of the Woods' },
]

interface FormState {
  id: string
  type: AssetMediaType
  url: string
  caption: string
  sort_order: string
}

const emptyForm = (): FormState => ({
  id: '',
  type: 'image',
  url: '',
  caption: '',
  sort_order: '0',
})

function youtubeId(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{11})/)
  return m ? m[1] : null
}

export default function AdminMediaPage() {
  const [asset, setAsset] = useState('livingstonfarm')
  const [items, setItems] = useState<AssetMediaWithRow[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingRow, setEditingRow] = useState<number | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm())
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<AssetMediaWithRow | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/media?asset=${asset}`)
      if (!res.ok) throw new Error()
      setItems(await res.json())
    } catch {
      toast.error('Failed to load media')
    } finally {
      setLoading(false)
    }
  }, [asset])

  useEffect(() => { load() }, [load])

  const openCreate = () => {
    setEditingRow(null)
    setForm({ ...emptyForm(), sort_order: String(items.length) })
    setDialogOpen(true)
  }

  const openEdit = (item: AssetMediaWithRow) => {
    setEditingRow(item._rowIndex)
    setForm({
      id: item.id,
      type: item.type,
      url: item.url,
      caption: item.caption || '',
      sort_order: String(item.sort_order),
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.url) { toast.error('URL is required'); return }
    setSaving(true)
    try {
      const method = editingRow ? 'PATCH' : 'POST'
      const body = editingRow
        ? { rowIndex: editingRow, asset, ...form }
        : { asset, ...form }
      const res = await fetch('/api/admin/media', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Save failed'); return }
      toast.success(editingRow ? 'Updated' : 'Added')
      setDialogOpen(false)
      load()
    } catch {
      toast.error('Network error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (item: AssetMediaWithRow) => {
    try {
      const res = await fetch('/api/admin/media', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rowIndex: item._rowIndex, id: item.id }),
      })
      if (!res.ok) { toast.error('Delete failed'); return }
      toast.success('Deleted')
      setDeleteTarget(null)
      load()
    } catch {
      toast.error('Network error')
    }
  }

  return (
    <div className="container mx-auto max-w-5xl px-4 py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Property Media</h1>
        <p className="text-muted-foreground mt-1">
          Add photos and videos to the public asset pages. Paste any public image URL or a YouTube link.
        </p>
      </div>

      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex gap-2">
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
        <Button onClick={openCreate}>Add Photo / Video</Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No media yet. Add photos or videos to show on the public asset page.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {items.map((item) => (
            <div key={item._rowIndex} className="group relative rounded-lg border overflow-hidden bg-muted/20">
              {item.type === 'image' ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.url}
                  alt={item.caption || ''}
                  className="w-full aspect-video object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="60"><rect width="100" height="60" fill="%23eee"/><text x="50" y="35" text-anchor="middle" font-size="10" fill="%23999">Image error</text></svg>'
                  }}
                />
              ) : (
                <div className="w-full aspect-video bg-black flex items-center justify-center">
                  {youtubeId(item.url) ? (
                    <img
                      src={`https://img.youtube.com/vi/${youtubeId(item.url)}/hqdefault.jpg`}
                      alt={item.caption || 'Video'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-white text-xs">YouTube</span>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>
                </div>
              )}
              {item.caption && (
                <div className="px-2 py-1 text-xs text-muted-foreground truncate">{item.caption}</div>
              )}
              <div className="absolute top-1 right-1 hidden group-hover:flex gap-1">
                <button
                  onClick={() => openEdit(item)}
                  className="rounded bg-white/90 px-2 py-0.5 text-xs font-medium shadow hover:bg-white"
                >
                  Edit
                </button>
                <button
                  onClick={() => setDeleteTarget(item)}
                  className="rounded bg-white/90 px-2 py-0.5 text-xs font-medium text-red-600 shadow hover:bg-white"
                >
                  ✕
                </button>
              </div>
              <div className="absolute top-1 left-1">
                <span className="rounded bg-black/50 px-1.5 py-0.5 text-xs text-white">
                  {item.type === 'youtube' ? '▶ Video' : '📷'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingRow ? 'Edit Media' : 'Add Photo / Video'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v as AssetMediaType }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="image">Photo (image URL)</SelectItem>
                  <SelectItem value="youtube">YouTube Video</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>
                {form.type === 'youtube' ? 'YouTube URL' : 'Image URL'}
              </Label>
              <Input
                value={form.url}
                onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                placeholder={
                  form.type === 'youtube'
                    ? 'https://www.youtube.com/watch?v=…'
                    : 'https://example.com/photo.jpg'
                }
              />
              {form.type === 'image' && (
                <p className="text-xs text-muted-foreground">
                  Must be a publicly accessible image URL. You can host images on any service (Squarespace, Dropbox public link, etc.).
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label>Caption (optional)</Label>
              <Input
                value={form.caption}
                onChange={(e) => setForm((f) => ({ ...f, caption: e.target.value }))}
                placeholder="Short description"
              />
            </div>
            <div className="space-y-1">
              <Label>Sort Order</Label>
              <Input
                type="number"
                value={form.sort_order}
                onChange={(e) => setForm((f) => ({ ...f, sort_order: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Remove Media</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Remove this {deleteTarget?.type === 'youtube' ? 'video' : 'photo'} from the page?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteTarget && handleDelete(deleteTarget)}>Remove</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
