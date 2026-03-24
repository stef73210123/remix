'use client'

import { useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import { MediaUploader } from '@/components/shared/MediaUploader'
import { toast } from 'sonner'
import type { TeamMember, TeamMemberType } from '@/lib/sheets/team'

const ASSETS = [
  { value: 'livingstonfarm', label: 'Livingston Farm' },
  { value: 'wrenofthewoods', label: 'Wren of the Woods' },
  { value: 'all', label: 'All Assets' },
]

const TABS: { key: string; label: string }[] = [
  { key: 'livingstonfarm', label: 'Livingston Farm' },
  { key: 'wrenofthewoods', label: 'Wren of the Woods' },
]

function emptyForm(type: TeamMemberType = 'principal'): Omit<TeamMember, 'id' | 'created_at'> {
  return {
    asset: 'livingstonfarm',
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

function MemberCard({
  member,
  onEdit,
  onDelete,
}: {
  member: TeamMember
  onEdit: () => void
  onDelete: () => void
}) {
  const isPrincipal = member.type === 'principal'
  const thumb = isPrincipal ? member.headshot_url : member.logo_url

  return (
    <div className="flex items-start gap-3 rounded-lg border bg-card p-4">
      {thumb && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumb}
          alt={member.name}
          className="w-14 h-14 rounded-full object-cover shrink-0 border"
        />
      )}
      {!thumb && (
        <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center text-xl shrink-0">
          {isPrincipal ? '👤' : '🏢'}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-medium">{member.name}</p>
            {member.title && (
              <p className="text-sm text-muted-foreground">{member.title}</p>
            )}
          </div>
          <div className="flex gap-1 shrink-0">
            <Button size="sm" variant="outline" onClick={onEdit}>Edit</Button>
            <Button size="sm" variant="outline" className="text-destructive" onClick={onDelete}>
              Delete
            </Button>
          </div>
        </div>
        {member.bio && (
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{member.bio}</p>
        )}
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

  const displayed = members.filter(
    (m) => (m.asset === activeTab || m.asset === 'all') && m.type === memberType
  )

  const openCreate = () => {
    setEditing(null)
    setForm({ ...emptyForm(memberType), asset: activeTab })
    setDialogOpen(true)
  }

  const openEdit = (m: TeamMember) => {
    setEditing(m)
    setForm({
      asset: m.asset,
      type: m.type,
      name: m.name,
      title: m.title,
      bio: m.bio,
      email: m.email,
      linkedin_url: m.linkedin_url,
      website: m.website,
      headshot_url: m.headshot_url,
      logo_url: m.logo_url,
      images: m.images,
      sort_order: m.sort_order,
      active: m.active,
    })
    setDialogOpen(true)
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
      if (!res.ok) throw new Error('Save failed')
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

  const isPrincipal = form.type === 'principal'

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Team</h1>
        <Button onClick={openCreate}>+ Add {memberType === 'principal' ? 'Principal' : 'Partner Firm'}</Button>
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
        <p className="text-muted-foreground text-sm">
          No {memberType === 'principal' ? 'principals' : 'partner firms'} yet.
        </p>
      ) : (
        <div className="space-y-3">
          {displayed
            .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name))
            .map((m) => (
              <MemberCard
                key={m.id}
                member={m}
                onEdit={() => openEdit(m)}
                onDelete={() => setDeleteTarget(m)}
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Asset</Label>
                <Select
                  value={form.asset}
                  onValueChange={(v) => setForm((f) => ({ ...f, asset: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ASSETS.map((a) => (
                      <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Type</Label>
                <Select
                  value={form.type}
                  onValueChange={(v) => setForm((f) => ({ ...f, type: v as TeamMemberType }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="principal">Principal</SelectItem>
                    <SelectItem value="firm">Partner Firm</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label>{isPrincipal ? 'Full Name' : 'Firm Name'} *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder={isPrincipal ? 'Jane Smith' : 'Acme Architecture'}
              />
            </div>

            {isPrincipal && (
              <div className="space-y-1">
                <Label>Title / Role</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Managing Principal"
                />
              </div>
            )}

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
                    placeholder="https://acmearch.com"
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
                  <Label>Image Carousel</Label>
                  <MediaUploader
                    value={form.images}
                    onChange={(urls) => setForm((f) => ({ ...f, images: urls }))}
                    maxFiles={10}
                    noUrl
                  />
                </div>
              </>
            )}

            <div className="space-y-1">
              <Label>Sort Order</Label>
              <Input
                type="number"
                value={form.sort_order}
                onChange={(e) => setForm((f) => ({ ...f, sort_order: parseInt(e.target.value, 10) || 0 }))}
                className="w-24"
              />
            </div>

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
              {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete "{deleteTarget?.name}"?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">This will permanently remove the record.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deleteTarget && handleDelete(deleteTarget)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
