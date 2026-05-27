'use client'

import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import { formatDate } from '@/lib/utils/format'
import { TimelineGantt } from '@/components/shared/TimelineGantt'
import type { MilestoneStatus } from '@/types'
import type { TimelineMilestoneWithRow } from '@/lib/sheets/timeline'
import type { Announcement } from '@/lib/sheets/announcements'
import type { Note } from '@/lib/sheets/notes'
import { Textarea } from '@/components/ui/textarea'
import { MediaUploader } from '@/components/shared/MediaUploader'
import { ASSETS } from '@/lib/data/assets'

const STATUSES: MilestoneStatus[] = ['upcoming', 'in-progress', 'complete', 'delayed']

const STATUS_COLORS: Record<MilestoneStatus, string> = {
  upcoming: 'outline',
  'in-progress': 'default',
  complete: 'secondary',
  delayed: 'destructive',
}

type SortMode = 'order' | 'date_asc' | 'date_desc'

interface FormState {
  milestone: string
  planned_date: string
  planned_end_date: string
  actual_date: string
  actual_end_date: string
  status: MilestoneStatus
  notes: string
  sort_order: string
}

const emptyForm = (): FormState => ({
  milestone: '',
  planned_date: new Date().toISOString().split('T')[0],
  planned_end_date: '',
  actual_date: '',
  actual_end_date: '',
  status: 'upcoming',
  notes: '',
  sort_order: '0',
})

const HOLDINGS = [
  { slug: 'livingstonfarm', name: 'Livingston Farm' },
  { slug: 'wrenofthewoods', name: 'Wren of the Woods' },
]

type MilestoneDisplay = TimelineMilestoneWithRow & { _source?: string }

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AdminTimelinePage() {
  const [asset, setAsset] = useState('circularplatform')
  const [milestones, setMilestones] = useState<TimelineMilestoneWithRow[]>([])
  const [loading, setLoading] = useState(true)
  const [includeHoldings, setIncludeHoldings] = useState<Set<string>>(new Set(HOLDINGS.map((h) => h.slug)))
  const [holdingMilestones, setHoldingMilestones] = useState<Record<string, TimelineMilestoneWithRow[]>>({})
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [holdingAnnouncements, setHoldingAnnouncements] = useState<Record<string, Announcement[]>>({})
  const [holdingNotes, setHoldingNotes] = useState<Record<string, Note[]>>({})
  const [noteDialogOpen, setNoteDialogOpen] = useState(false)
  const [noteTarget, setNoteTarget] = useState<{ ref_id: string; ref_label: string } | null>(null)
  const [noteForm, setNoteForm] = useState({ title: '', body: '' })
  const [noteMedia, setNoteMedia] = useState<string[]>([])
  const [savingNote, setSavingNote] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingRow, setEditingRow] = useState<number | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm())
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<TimelineMilestoneWithRow | null>(null)
  const [savingOrder, setSavingOrder] = useState(false)
  const [editingAsset, setEditingAsset] = useState(asset)
  const [sortMode, setSortMode] = useState<SortMode>('order')

  // Drag state
  const dragFromIdx = useRef<number | null>(null)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [timelineRes, annRes, notesRes] = await Promise.allSettled([
        fetch(`/api/admin/timeline?asset=${asset}`),
        fetch(`/api/admin/announcements?asset=${asset}`),
        fetch(`/api/admin/notes?asset=${asset}&type=timeline`),
      ])
      if (timelineRes.status === 'fulfilled' && timelineRes.value.ok) {
        setMilestones(await timelineRes.value.json())
      }
      if (annRes.status === 'fulfilled' && annRes.value.ok) {
        const annData = await annRes.value.json()
        setAnnouncements(Array.isArray(annData) ? annData : (annData.announcements ?? []))
      }
      if (notesRes.status === 'fulfilled' && notesRes.value.ok) {
        setNotes(await notesRes.value.json())
      }
    } catch {
      toast.error('Failed to load timeline')
    } finally {
      setLoading(false)
    }
  }, [asset])

  useEffect(() => { load() }, [load])

  const loadHolding = useCallback(async (slug: string) => {
    try {
      const [timelineRes, annRes, notesRes] = await Promise.allSettled([
        fetch(`/api/admin/timeline?asset=${slug}`),
        fetch(`/api/admin/announcements?asset=${slug}`),
        fetch(`/api/admin/notes?asset=${slug}&type=timeline`),
      ])
      if (timelineRes.status === 'fulfilled' && timelineRes.value.ok) {
        const data: TimelineMilestoneWithRow[] = await timelineRes.value.json()
        setHoldingMilestones((prev) => ({ ...prev, [slug]: data }))
      }
      if (annRes.status === 'fulfilled' && annRes.value.ok) {
        const annData = await annRes.value.json()
        const anns: Announcement[] = Array.isArray(annData) ? annData : (annData.announcements ?? [])
        setHoldingAnnouncements((prev) => ({ ...prev, [slug]: anns }))
      }
      if (notesRes.status === 'fulfilled' && notesRes.value.ok) {
        const notesData: Note[] = await notesRes.value.json()
        setHoldingNotes((prev) => ({ ...prev, [slug]: notesData }))
      }
    } catch {
      toast.error(`Failed to load ${slug} milestones`)
    }
  }, [])

  // Manage holdings when asset changes
  useEffect(() => {
    if (asset !== 'circularplatform') {
      setIncludeHoldings(new Set())
      setHoldingMilestones({})
      setHoldingAnnouncements({})
      setHoldingNotes({})
    } else {
      setIncludeHoldings(new Set(HOLDINGS.map((h) => h.slug)))
      HOLDINGS.forEach((h) => loadHolding(h.slug))
    }
  }, [asset, loadHolding])


  // All milestones for display: own (editable) + included holdings (read-only)
  const allDisplayMilestones = useMemo((): MilestoneDisplay[] => {
    const own: MilestoneDisplay[] = milestones.map((m) => ({ ...m }))
    const rollup: MilestoneDisplay[] = []
    for (const slug of includeHoldings) {
      const name = HOLDINGS.find((h) => h.slug === slug)?.name || slug
      for (const m of holdingMilestones[slug] || []) {
        rollup.push({ ...m, _source: name })
      }
    }
    const all = [...own, ...rollup]
    if (sortMode === 'date_asc') return all.sort((a, b) => new Date(a.planned_date).getTime() - new Date(b.planned_date).getTime())
    if (sortMode === 'date_desc') return all.sort((a, b) => new Date(b.planned_date).getTime() - new Date(a.planned_date).getTime())
    return all.sort((a, b) => a.sort_order - b.sort_order)
  }, [milestones, holdingMilestones, includeHoldings, sortMode])

  // Aggregate announcements + notes including included holdings
  const allAnnouncements = useMemo(() => {
    const holding = Array.from(includeHoldings).flatMap((slug) => holdingAnnouncements[slug] || [])
    return [...announcements, ...holding]
  }, [announcements, holdingAnnouncements, includeHoldings])

  const allNotes = useMemo(() => {
    const holding = Array.from(includeHoldings).flatMap((slug) => holdingNotes[slug] || [])
    return [...notes, ...holding]
  }, [notes, holdingNotes, includeHoldings])

  // Only own milestones (used for drag-drop ordering, excludes read-only holdings)
  const displayMilestones = allDisplayMilestones

  // ── Drag-and-drop ──────────────────────────────────────────────────────────

  const handleDragStart = (e: React.DragEvent, idx: number) => {
    dragFromIdx.current = idx
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverIdx(idx)
  }

  const handleDrop = (e: React.DragEvent, toIdx: number) => {
    e.preventDefault()
    const fromIdx = dragFromIdx.current
    if (fromIdx === null || fromIdx === toIdx) { setDragOverIdx(null); return }
    const reordered = [...displayMilestones]
    const [item] = reordered.splice(fromIdx, 1)
    reordered.splice(toIdx, 0, item)
    const updated = reordered.map((m, i) => ({ ...m, sort_order: i }))
    setMilestones(updated)
    setDragOverIdx(null)
    dragFromIdx.current = null
    saveOrder(updated)
  }

  const handleDragEnd = () => {
    dragFromIdx.current = null
    setDragOverIdx(null)
  }

  const saveOrder = async (ordered: TimelineMilestoneWithRow[]) => {
    setSavingOrder(true)
    try {
      await Promise.all(
        ordered.map((m) =>
          fetch('/api/admin/timeline', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              asset,
              rowIndex: m._rowIndex,
              milestone: m.milestone,
              planned_date: m.planned_date,
              planned_end_date: m.planned_end_date || '',
              actual_date: m.actual_date || '',
              actual_end_date: m.actual_end_date || '',
              status: m.status,
              notes: m.notes || '',
              sort_order: String(m.sort_order),
            }),
          })
        )
      )
      toast.success('Order saved')
    } catch {
      toast.error('Failed to save order')
    } finally {
      setSavingOrder(false)
    }
  }

  // ── Form handlers ──────────────────────────────────────────────────────────

  const openCreate = () => {
    setEditingRow(null)
    setEditingAsset(asset)
    setForm({ ...emptyForm(), sort_order: String(milestones.length) })
    setDialogOpen(true)
  }

  const openEdit = (m: MilestoneDisplay) => {
    const sourceSlug = m._source
      ? HOLDINGS.find((h) => h.name === m._source)?.slug || asset
      : asset
    setEditingAsset(sourceSlug)
    setEditingRow(m._rowIndex)
    setForm({
      milestone: m.milestone,
      planned_date: m.planned_date,
      planned_end_date: m.planned_end_date || '',
      actual_date: m.actual_date || '',
      actual_end_date: m.actual_end_date || '',
      status: m.status,
      notes: m.notes || '',
      sort_order: String(m.sort_order),
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.milestone || !form.planned_date) {
      toast.error('Milestone name and planned date are required')
      return
    }
    setSaving(true)
    try {
      const method = editingRow ? 'PATCH' : 'POST'
      const body = {
        asset: editingAsset,
        ...form,
        ...(editingRow ? { rowIndex: editingRow } : {}),
      }
      const res = await fetch('/api/admin/timeline', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Save failed'); return }
      toast.success(editingRow ? 'Milestone updated' : 'Milestone added')
      setDialogOpen(false)
      load()
    } catch {
      toast.error('Network error')
    } finally {
      setSaving(false)
    }
  }

  const openNoteDialog = (m: TimelineMilestoneWithRow) => {
    setNoteTarget({ ref_id: String(m._rowIndex), ref_label: m.milestone })
    setNoteForm({ title: '', body: '' })
    setNoteMedia([])
    setNoteDialogOpen(true)
  }

  const handleSaveNote = async () => {
    if (!noteForm.title || !noteTarget) { toast.error('Title is required'); return }
    setSavingNote(true)
    try {
      const res = await fetch('/api/admin/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'timeline',
          asset,
          ref_id: noteTarget.ref_id,
          ref_label: noteTarget.ref_label,
          title: noteForm.title,
          body: noteForm.body,
          media_urls: noteMedia,
        }),
      })
      if (!res.ok) { toast.error('Failed to save note'); return }
      toast.success('Note added')
      setNoteDialogOpen(false)
      load()
    } catch {
      toast.error('Network error')
    } finally {
      setSavingNote(false)
    }
  }

  const handleDelete = async (m: MilestoneDisplay) => {
    const deleteAsset = m._source
      ? HOLDINGS.find((h) => h.name === m._source)?.slug || asset
      : asset
    try {
      const res = await fetch('/api/admin/timeline', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asset: deleteAsset, rowIndex: m._rowIndex }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Delete failed'); return }
      toast.success('Milestone deleted')
      setDeleteTarget(null)
      load()
    } catch {
      toast.error('Network error')
    }
  }

  return (
    <div className="container mx-auto max-w-5xl px-4 py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Timeline</h1>
        <p className="text-muted-foreground mt-1">
          Manage project milestones.{' '}
          <span className="inline-flex items-center gap-1">Drag <GripIcon /> to reorder.</span>
        </p>
      </div>

      {/* Asset + controls */}
      <div className="flex items-center justify-between gap-4 mb-4">
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
        <div className="flex items-center gap-2">
          {savingOrder && <span className="text-xs text-muted-foreground">Saving order…</span>}
          <Button onClick={openCreate}>Add Milestone</Button>
        </div>
      </div>


      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : allDisplayMilestones.length === 0 ? (
        <p className="text-sm text-muted-foreground">No milestones yet.</p>
      ) : (
        <>
          {/* Gantt chart */}
          <div className="mb-8">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Timeline View</h2>
            <TimelineGantt milestones={displayMilestones} announcements={allAnnouncements} notes={allNotes} />
          </div>

          {/* Sort control */}
          <div className="flex items-center gap-2 mb-3 text-sm">
            <span className="text-muted-foreground">Sort by:</span>
            {([
              ['order', 'Custom order'],
              ['date_asc', 'Date ↑'],
              ['date_desc', 'Date ↓'],
            ] as [SortMode, string][]).map(([mode, label]) => (
              <button
                key={mode}
                onClick={() => setSortMode(mode)}
                className={`px-2 py-0.5 rounded text-xs border transition-colors ${
                  sortMode === mode ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:border-primary/50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Table */}
          <div className="rounded-md border overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-2 py-2 w-8" />
                  <th className="px-4 py-2 text-left font-medium">Milestone</th>
                  <th className="px-4 py-2 text-left font-medium">Planned</th>
                  <th className="px-4 py-2 text-left font-medium">Actual</th>
                  <th className="px-4 py-2 text-left font-medium">Status</th>
                  <th className="px-4 py-2 text-left font-medium">Notes</th>
                  <th className="px-4 py-2 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(displayMilestones as MilestoneDisplay[]).map((m, idx) => {
                  const isOwn = !m._source
                  return (
                    <tr
                      key={`${m._source || ''}-${m._rowIndex}`}
                      draggable={isOwn}
                      onDragStart={isOwn ? (e) => handleDragStart(e, idx) : undefined}
                      onDragOver={isOwn ? (e) => handleDragOver(e, idx) : undefined}
                      onDrop={isOwn ? (e) => handleDrop(e, idx) : undefined}
                      onDragEnd={isOwn ? handleDragEnd : undefined}
                      className={`border-b last:border-0 transition-colors ${
                        isOwn && dragOverIdx === idx ? 'bg-primary/10' : 'hover:bg-muted/20'
                      }`}
                    >
                      <td className="px-2 py-2 text-muted-foreground">
                        {isOwn && <GripIcon />}
                      </td>
                      <td className="px-4 py-2 font-medium">
                        {m.milestone}
                        {m._source && (
                          <span className="ml-2 text-xs font-normal text-muted-foreground border rounded px-1.5 py-0.5">{m._source}</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-muted-foreground whitespace-nowrap text-xs">
                        {formatDate(m.planned_date)}
                        {m.planned_end_date && (
                          <span className="block text-muted-foreground/60">→ {formatDate(m.planned_end_date)}</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-muted-foreground whitespace-nowrap text-xs">
                        {m.actual_date ? (
                          <>
                            {formatDate(m.actual_date)}
                            {m.actual_end_date && (
                              <span className="block text-muted-foreground/60">→ {formatDate(m.actual_end_date)}</span>
                            )}
                          </>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-2">
                        <Badge variant={STATUS_COLORS[m.status] as 'default' | 'secondary' | 'outline' | 'destructive'}>
                          {m.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-2 text-muted-foreground max-w-xs truncate">{m.notes || '—'}</td>
                      <td className="px-4 py-2 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => openNoteDialog(m)} title="Add note">Note</Button>
                          <Button variant="ghost" size="sm" onClick={() => openEdit(m)}>Edit</Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeleteTarget(m)}
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Add/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingRow ? 'Edit Milestone' : 'Add Milestone'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Milestone Name</Label>
              <Input value={form.milestone} onChange={(e) => setForm((f) => ({ ...f, milestone: e.target.value }))} placeholder="e.g. Construction Start" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Planned Start</Label>
                <Input type="date" value={form.planned_date} onChange={(e) => setForm((f) => ({ ...f, planned_date: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Planned End (optional)</Label>
                <Input type="date" value={form.planned_end_date} onChange={(e) => setForm((f) => ({ ...f, planned_end_date: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Actual Start (optional)</Label>
                <Input type="date" value={form.actual_date} onChange={(e) => setForm((f) => ({ ...f, actual_date: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Actual End (optional)</Label>
                <Input type="date" value={form.actual_end_date} onChange={(e) => setForm((f) => ({ ...f, actual_end_date: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v as MilestoneStatus }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Notes</Label>
              <Input value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Optional" />
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

      {/* Add Note dialog */}
      <Dialog open={noteDialogOpen} onOpenChange={setNoteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Note{noteTarget ? ` — ${noteTarget.ref_label}` : ''}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Title</Label>
              <Input value={noteForm.title} onChange={(e) => setNoteForm((f) => ({ ...f, title: e.target.value }))} placeholder="Brief note title" />
            </div>
            <div className="space-y-1">
              <Label>Body (optional)</Label>
              <Textarea value={noteForm.body} onChange={(e) => setNoteForm((f) => ({ ...f, body: e.target.value }))} placeholder="Details…" rows={3} />
            </div>
            <div className="space-y-1">
              <Label>Media (optional)</Label>
              <MediaUploader value={noteMedia} onChange={setNoteMedia} acceptAll />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoteDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveNote} disabled={savingNote}>{savingNote ? 'Saving…' : 'Add Note'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Delete Milestone</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Delete milestone &quot;{deleteTarget?.milestone}&quot;? This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteTarget && handleDelete(deleteTarget)}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function GripIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className="opacity-40">
      <circle cx="5" cy="4" r="1.2" />
      <circle cx="5" cy="8" r="1.2" />
      <circle cx="5" cy="12" r="1.2" />
      <circle cx="11" cy="4" r="1.2" />
      <circle cx="11" cy="8" r="1.2" />
      <circle cx="11" cy="12" r="1.2" />
    </svg>
  )
}
