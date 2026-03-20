'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
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
import type { MilestoneStatus } from '@/types'
import type { TimelineMilestoneWithRow } from '@/lib/sheets/timeline'

const ASSETS = [
  { slug: 'livingstonfarm', name: 'Livingston Farm' },
  { slug: 'wrenofthewoods', name: 'Wren of the Woods' },
]

const STATUSES: MilestoneStatus[] = ['upcoming', 'in-progress', 'complete', 'delayed']

const STATUS_COLORS: Record<MilestoneStatus, string> = {
  upcoming: 'outline',
  'in-progress': 'default',
  complete: 'secondary',
  delayed: 'destructive',
}

interface FormState {
  milestone: string
  planned_date: string
  actual_date: string
  status: MilestoneStatus
  notes: string
  sort_order: string
}

const emptyForm = (): FormState => ({
  milestone: '',
  planned_date: new Date().toISOString().split('T')[0],
  actual_date: '',
  status: 'upcoming',
  notes: '',
  sort_order: '0',
})

export default function AdminTimelinePage() {
  const [asset, setAsset] = useState('livingstonfarm')
  const [milestones, setMilestones] = useState<TimelineMilestoneWithRow[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingRow, setEditingRow] = useState<number | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm())
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<TimelineMilestoneWithRow | null>(null)
  const [savingOrder, setSavingOrder] = useState(false)

  // Drag state
  const dragFromIdx = useRef<number | null>(null)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/timeline?asset=${asset}`)
      if (!res.ok) throw new Error()
      setMilestones(await res.json())
    } catch {
      toast.error('Failed to load timeline')
    } finally {
      setLoading(false)
    }
  }, [asset])

  useEffect(() => { load() }, [load])

  // ── Drag-and-drop handlers ──────────────────────────────────────────────────

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
    if (fromIdx === null || fromIdx === toIdx) {
      setDragOverIdx(null)
      return
    }
    const reordered = [...milestones]
    const [item] = reordered.splice(fromIdx, 1)
    reordered.splice(toIdx, 0, item)
    // Assign new sort_order values
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
              actual_date: m.actual_date || '',
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

  // ── Form handlers ───────────────────────────────────────────────────────────

  const openCreate = () => {
    setEditingRow(null)
    setForm({ ...emptyForm(), sort_order: String(milestones.length) })
    setDialogOpen(true)
  }

  const openEdit = (m: TimelineMilestoneWithRow) => {
    setEditingRow(m._rowIndex)
    setForm({
      milestone: m.milestone,
      planned_date: m.planned_date,
      actual_date: m.actual_date || '',
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
        asset,
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

  const handleDelete = async (m: TimelineMilestoneWithRow) => {
    try {
      const res = await fetch('/api/admin/timeline', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asset, rowIndex: m._rowIndex }),
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
          Manage project milestones. <span className="inline-flex items-center gap-1">Drag <GripIcon /> to reorder.</span>
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
        <div className="flex items-center gap-2">
          {savingOrder && <span className="text-xs text-muted-foreground">Saving order…</span>}
          <Button onClick={openCreate}>Add Milestone</Button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : milestones.length === 0 ? (
        <p className="text-sm text-muted-foreground">No milestones yet.</p>
      ) : (
        <div className="rounded-md border">
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
              {milestones.map((m, idx) => (
                <tr
                  key={m._rowIndex}
                  draggable
                  onDragStart={(e) => handleDragStart(e, idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDrop={(e) => handleDrop(e, idx)}
                  onDragEnd={handleDragEnd}
                  className={`border-b last:border-0 transition-colors ${
                    dragOverIdx === idx ? 'bg-primary/10' : 'hover:bg-muted/20'
                  }`}
                >
                  <td className="px-2 py-2 cursor-grab active:cursor-grabbing text-muted-foreground">
                    <GripIcon />
                  </td>
                  <td className="px-4 py-2 font-medium">{m.milestone}</td>
                  <td className="px-4 py-2 text-muted-foreground whitespace-nowrap">{formatDate(m.planned_date)}</td>
                  <td className="px-4 py-2 text-muted-foreground whitespace-nowrap">
                    {m.actual_date ? formatDate(m.actual_date) : '—'}
                  </td>
                  <td className="px-4 py-2">
                    <Badge variant={STATUS_COLORS[m.status] as 'default' | 'secondary' | 'outline' | 'destructive'}>
                      {m.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-2 text-muted-foreground max-w-xs truncate">{m.notes || '—'}</td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex items-center justify-end gap-2">
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
              ))}
            </tbody>
          </table>
        </div>
      )}

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
            <div className="space-y-1">
              <Label>Planned Date</Label>
              <Input type="date" value={form.planned_date} onChange={(e) => setForm((f) => ({ ...f, planned_date: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Actual Date (optional)</Label>
              <Input type="date" value={form.actual_date} onChange={(e) => setForm((f) => ({ ...f, actual_date: e.target.value }))} />
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
