'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { MediaUploader } from '@/components/shared/MediaUploader'
import { toast } from 'sonner'
import type { TeamMember, TeamMemberType } from '@/lib/sheets/team'

const ASSETS = [
  { value: 'livingstonfarm', label: 'Livingston Farm' },
  { value: 'wrenofthewoods', label: 'Wren of the Woods' },
  { value: 'circularplatform', label: 'Circular' },
]

const TABS = [
  { key: 'livingstonfarm', label: 'Livingston Farm' },
  { key: 'wrenofthewoods', label: 'Wren of the Woods' },
  { key: 'circularplatform', label: 'Circular' },
]

function emptyForm(type: TeamMemberType = 'principal', asset = 'livingstonfarm'): Omit<TeamMember, 'id' | 'created_at'> {
  return {
    asset,
    type,
    name: '',
    title: '',
    bio: '',
    email: '',
    linkedin_url: '',
    website: '',
    headshot_url: '',
    logo_url: '',
    images: [],
    sort_order: 0,
    active: true,
  }
}

// ── Drag-reorderable member card ──────────────────────────────────────────────
function MemberCard({
  member,
  onEdit,
  onDelete,
  onDragStart,
  onDragOver,
  onDrop,
}: {
  member: TeamMember
  onEdit: () => void
  onDelete: () => void
  onDragStart: (id: string) => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: (targetId: string) => void
}) {
  const isPrincipal = member.type === 'principal'
  const thumb = isPrincipal ? member.headshot_url : member.logo_url
  const [dragOver, setDragOver] = useState(false)

  return (
    <div
      draggable
      onDragStart={() => onDragStart(member.id)}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); onDragOver(e) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={() => { setDragOver(false); onDrop(member.id) }}
      className={`flex items-start gap-3 rounded-lg border bg-card p-4 cursor-grab active:cursor-grabbing transition-colors ${dragOver ? 'border-primary/60 bg-primary/5' : ''}`}
    >
      {/* Drag handle */}
      <div className="flex flex-col justify-center self-stretch pr-1 text-muted-foreground/30 hover:text-muted-foreground/60 shrink-0 cursor-grab select-none">
        ⣿
      </div>

      {thumb ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={thumb} alt={member.name} className="w-14 h-14 rounded-full object-cover shrink-0 border" />
      ) : (
        <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center text-xl shrink-0">
          {isPrincipal ? '👤' : '🏢'}
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-medium">{member.name}</p>
            {member.title && <p className="text-sm text-muted-foreground">{member.title}</p>}
          </div>
          <div className="flex gap-1 shrink-0">
            <Button size="sm" variant="outline" onClick={onEdit}>Edit</Button>
            <Button size="sm" variant="outline" className="text-destructive" onClick={onDelete}>Delete</Button>
          </div>
        </div>
        {member.bio && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{member.bio}</p>}
        <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
          {member.email && <span>{member.email}</span>}
          {member.linkedin_url && <span>LinkedIn</span>}
          {member.website && <span>{member.website}</span>}
          {member.images.length > 0 && <span>{member.images.length} carousel image{member.images.length > 1 ? 's' : ''}</span>}
          {!member.active && <span className="text-destructive">Inactive</span>}
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AdminTeamPage() {
  const [activeTab, setActiveTab] = useState('livingstonfarm')
  const [memberType, setMemberType] = useState<TeamMemberType>('principal')
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<TeamMember | null>(null)
  const [form, setForm] = useState<Omit<TeamMember, 'id' | 'created_at'>>(emptyForm())
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<TeamMember | null>(null)

  // URL enrichment
  const [enrichUrl, setEnrichUrl] = useState('')
  const [enriching, setEnriching] = useState(false)

  // Drag state
  const dragId = useRef<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/team')
      if (!res.ok) throw new Error('Failed')
      setMembers(await res.json())
    } catch {
      toast.error('Failed to load team members')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const displayed = members
    .filter((m) => (m.asset === activeTab || m.asset === 'all') && m.type === memberType)
    .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name))

  const openCreate = () => {
    setEditing(null)
    setEnrichUrl('')
    setForm({ ...emptyForm(memberType, activeTab) })
    setDialogOpen(true)
  }

  const openEdit = (m: TeamMember) => {
    setEditing(m)
    setEnrichUrl(m.website || '')
    setForm({
      asset: m.asset, type: m.type, name: m.name, title: m.title,
      bio: m.bio, email: m.email, linkedin_url: m.linkedin_url,
      website: m.website, headshot_url: m.headshot_url, logo_url: m.logo_url,
      images: m.images, sort_order: m.sort_order, active: m.active,
    })
    setDialogOpen(true)
  }

  // URL auto-populate
  const handleEnrich = async () => {
    if (!enrichUrl.startsWith('http')) { toast.error('Enter a valid URL'); return }
    setEnriching(true)
    try {
      const res = await fetch('/api/admin/team/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: enrichUrl }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Enrichment failed'); return }
      setForm((f) => ({
        ...f,
        name: data.name || f.name,
        bio: data.description || f.bio,
        website: data.website || enrichUrl || f.website,
        logo_url: data.logo_url || f.logo_url,
        images: data.images?.length ? data.images : f.images,
      }))
      toast.success('Fields populated from website')
    } catch {
      toast.error('Failed to fetch website info')
    } finally {
      setEnriching(false)
    }
  }

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Name is required'); return }
    setSaving(true)
    try {
      const payload = editing
        ? { ...form, id: editing.id, created_at: editing.created_at }
        : form
      const res = await fetch('/api/admin/team', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Save failed'); return }
      toast.success(editing ? 'Updated' : 'Added')
      setDialogOpen(false)
      load()
    } catch {
      toast.error('Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (m: TeamMember) => {
    try {
      const res = await fetch(`/api/admin/team?id=${m.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast.success('Deleted')
      setDeleteTarget(null)
      load()
    } catch {
      toast.error('Delete failed')
    }
  }

  // Drag reorder
  const handleDrop = async (targetId: string) => {
    if (!dragId.current || dragId.current === targetId) return
    const srcIdx = displayed.findIndex((m) => m.id === dragId.current)
    const dstIdx = displayed.findIndex((m) => m.id === targetId)
    if (srcIdx === -1 || dstIdx === -1) return

    // Rebuild sort_order for the displayed slice
    const reordered = [...displayed]
    const [moved] = reordered.splice(srcIdx, 1)
    reordered.splice(dstIdx, 0, moved)

    // Patch all affected members with new sort_order
    const updates = reordered.map((m, i) => ({ ...m, sort_order: i }))
    // Optimistic update
    setMembers((prev) => {
      const map = new Map(updates.map((u) => [u.id, u]))
      return prev.map((m) => map.get(m.id) ?? m)
    })

    await Promise.all(
      updates.map((m) =>
        fetch('/api/admin/team', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(m),
        })
      )
    )
    dragId.current = null
  }

  const isPrincipal = form.type === 'principal'
  const typeLabel = memberType === 'principal' ? 'Principal' : 'Partner Firm'

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Team</h1>
        <Button onClick={openCreate}>+ Add {typeLabel}</Button>
      </div>

      {/* Asset tabs */}
      <div className="flex gap-1 rounded-lg border p-1 w-fit">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === t.key ? 'bg-foreground text-background' : 'hover:bg-muted'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Type tabs */}
      <div className="flex gap-1 rounded-lg border p-1 w-fit">
        {(['principal', 'firm'] as TeamMemberType[]).map((t) => (
          <button
            key={t}
            onClick={() => setMemberType(t)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              memberType === t ? 'bg-foreground text-background' : 'hover:bg-muted'
            }`}
          >
            {t === 'principal' ? 'Principals' : 'Partner Firms'}
          </button>
        ))}
      </div>

      {/* Member list */}
      {loading ? (
        <p className="text-muted-foreground text-sm">Loading…</p>
      ) : displayed.length === 0 ? (
        <p className="text-muted-foreground text-sm">No {typeLabel.toLowerCase()}s yet.</p>
      ) : (
        <div className="space-y-3">
          {displayed.map((m) => (
            <MemberCard
              key={m.id}
              member={m}
              onEdit={() => openEdit(m)}
              onDelete={() => setDeleteTarget(m)}
              onDragStart={(id) => { dragId.current = id }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
            />
          ))}
        </div>
      )}

      {/* Add/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? 'Edit' : 'Add'} {form.type === 'principal' ? 'Principal' : 'Partner Firm'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Asset selector */}
            <div className="space-y-1">
              <Label>Asset</Label>
              <select
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm"
                value={form.asset}
                onChange={(e) => setForm((f) => ({ ...f, asset: e.target.value }))}
              >
                {ASSETS.map((a) => (
                  <option key={a.value} value={a.value}>{a.label}</option>
                ))}
              </select>
            </div>

            {/* URL enrich — firms only */}
            {!isPrincipal && (
              <div className="space-y-1">
                <Label>Website URL <span className="text-muted-foreground font-normal">(auto-populate from URL)</span></Label>
                <div className="flex gap-2">
                  <Input
                    type="url"
                    value={enrichUrl}
                    onChange={(e) => setEnrichUrl(e.target.value)}
                    placeholder="https://snohetta.com"
                    className="flex-1"
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleEnrich() } }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleEnrich}
                    disabled={enriching || !enrichUrl}
                  >
                    {enriching ? 'Fetching…' : 'Auto-fill'}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Enter the firm's homepage and click Auto-fill to populate name, description, logo and images.</p>
              </div>
            )}

            <div className="space-y-1">
              <Label>{isPrincipal ? 'Full Name' : 'Firm Name'} *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder={isPrincipal ? 'Jane Smith' : 'Snøhetta'}
              />
            </div>

            {/* Role / Title — both principals and firms */}
            <div className="space-y-1">
              <Label>{isPrincipal ? 'Title / Role' : 'Role / Discipline'}</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder={isPrincipal ? 'Managing Principal' : 'Landscape Architecture'}
              />
            </div>

            <div className="space-y-1">
              <Label>{isPrincipal ? 'Bio' : 'Description'}</Label>
              <Textarea
                value={form.bio}
                onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                rows={4}
                placeholder={isPrincipal ? 'Short bio…' : 'Firm description…'}
              />
            </div>

            {isPrincipal ? (
              <>
                <div className="space-y-1">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="jane@example.com"
                  />
                </div>
                <div className="space-y-1">
                  <Label>LinkedIn URL</Label>
                  <Input
                    type="url"
                    value={form.linkedin_url}
                    onChange={(e) => setForm((f) => ({ ...f, linkedin_url: e.target.value }))}
                    placeholder="https://linkedin.com/in/…"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Headshot</Label>
                  <MediaUploader
                    value={form.headshot_url ? [form.headshot_url] : []}
                    onChange={(urls) => setForm((f) => ({ ...f, headshot_url: urls[0] || '' }))}
                    maxFiles={1}
                    noUrl
                  />
                </div>
              </>
            ) : (
              <>
                <div className="space-y-1">
                  <Label>Homepage URL</Label>
                  <Input
                    type="url"
                    value={form.website}
                    onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
                    placeholder="https://snohetta.com"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Logo</Label>
                  <MediaUploader
                    value={form.logo_url ? [form.logo_url] : []}
                    onChange={(urls) => setForm((f) => ({ ...f, logo_url: urls[0] || '' }))}
                    maxFiles={1}
                    noUrl
                  />
                </div>
                <div className="space-y-1">
                  <Label>Image Carousel <span className="text-muted-foreground font-normal">(signature projects)</span></Label>
                  <MediaUploader
                    value={form.images}
                    onChange={(urls) => setForm((f) => ({ ...f, images: urls }))}
                    maxFiles={10}
                    noUrl
                  />
                </div>
              </>
            )}

            <div className="flex items-center gap-2">
              <input
                id="active"
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
                className="h-4 w-4"
              />
              <Label htmlFor="active">Active (visible on site)</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Save Changes' : `Add ${isPrincipal ? 'Principal' : 'Partner Firm'}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete &quot;{deleteTarget?.name}&quot;?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">This will permanently remove the record.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteTarget && handleDelete(deleteTarget)}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
