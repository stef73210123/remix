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
  { slug: 'circularplatform', name: 'Circular' },
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

const STATUS_DOT: Record<MilestoneStatus, string> = {
  upcoming: '#94a3b8',
  'in-progress': '#3b82f6',
  complete: '#22c55e',
  delayed: '#ef4444',
}

type SortMode = 'order' | 'date_asc' | 'date_desc'

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

// ─── Gantt chart ─────────────────────────────────────────────────────────────

function GanttChart({ milestones }: { milestones: TimelineMilestoneWithRow[] }) {
  const scrollRef = useRef<HTMLDivElement>(null)

  // Scroll to right on mount / data change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth
    }
  }, [milestones])

  if (milestones.length === 0) return null

  const allDates: Date[] = []
  for (const m of milestones) {
    if (m.planned_date) allDates.push(new Date(m.planned_date))
    if (m.actual_date) allDates.push(new Date(m.actual_date))
  }
  allDates.push(new Date()) // always include today

  const minDate = new Date(Math.min(...allDates.map((d) => d.getTime())))
  const maxDate = new Date(Math.max(...allDates.map((d) => d.getTime())))

  // Pad 6 weeks on each side
  const startDate = new Date(minDate)
  startDate.setDate(startDate.getDate() - 42)
  const endDate = new Date(maxDate)
  endDate.setDate(endDate.getDate() + 42)

  const PX_PER_DAY = 14
  const LABEL_W = 180
  const ROW_H = 34
  const HEADER_H = 28
  const totalDays = (endDate.getTime() - startDate.getTime()) / 86_400_000
  const chartW = Math.round(totalDays * PX_PER_DAY)
  const svgW = LABEL_W + chartW + 24
  const svgH = HEADER_H + milestones.length * ROW_H + 4

  const dateToX = (d: Date) =>
    LABEL_W + ((d.getTime() - startDate.getTime()) / 86_400_000) * PX_PER_DAY

  // Monthly grid lines
  const months: { label: string; x: number }[] = []
  const cur = new Date(startDate.getFullYear(), startDate.getMonth(), 1)
  while (cur <= endDate) {
    months.push({
      label: cur.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      x: dateToX(cur),
    })
    cur.setMonth(cur.getMonth() + 1)
  }

  const todayX = dateToX(new Date())

  return (
    <div
      ref={scrollRef}
      className="overflow-x-auto rounded-xl border bg-background"
      style={{ maxHeight: 420 }}
    >
      <svg
        width={svgW}
        height={svgH}
        style={{ display: 'block', minWidth: svgW }}
        aria-label="Project timeline"
      >
        {/* Month grid */}
        {months.map((m, i) => (
          <g key={i}>
            <line x1={m.x} y1={0} x2={m.x} y2={svgH} stroke="#e2e8f0" strokeWidth={1} />
            <text x={m.x + 4} y={18} fontSize={10} fill="#94a3b8" fontFamily="inherit">
              {m.label}
            </text>
          </g>
        ))}

        {/* Today */}
        <line
          x1={todayX}
          y1={HEADER_H}
          x2={todayX}
          y2={svgH}
          stroke="#f59e0b"
          strokeWidth={1.5}
          strokeDasharray="4 2"
        />
        <text x={todayX + 3} y={HEADER_H - 6} fontSize={9} fill="#f59e0b" fontFamily="inherit">
          Today
        </text>

        {/* Milestone rows */}
        {milestones.map((m, i) => {
          const y = HEADER_H + i * ROW_H + ROW_H / 2
          const plannedX = m.planned_date ? dateToX(new Date(m.planned_date)) : null
          const actualX = m.actual_date ? dateToX(new Date(m.actual_date)) : null
          const color = STATUS_DOT[m.status]

          return (
            <g key={m._rowIndex}>
              {/* Alternating row bg */}
              <rect
                x={0}
                y={HEADER_H + i * ROW_H}
                width={svgW}
                height={ROW_H}
                fill={i % 2 === 0 ? 'transparent' : '#f8fafc'}
              />

              {/* Milestone label */}
              <text
                x={8}
                y={y + 4}
                fontSize={11}
                fill="#374151"
                fontFamily="inherit"
                style={{ fontWeight: 500 }}
              >
                {m.milestone.length > 20 ? m.milestone.slice(0, 18) + '…' : m.milestone}
              </text>

              {/* Connector line between planned and actual */}
              {plannedX !== null && actualX !== null && (
                <line
                  x1={plannedX}
                  y1={y}
                  x2={actualX}
                  y2={y}
                  stroke={color}
                  strokeWidth={1.5}
                  strokeOpacity={0.35}
                />
              )}

              {/* Planned dot (circle) */}
              {plannedX !== null && (
                <circle cx={plannedX} cy={y} r={7} fill={color} />
              )}

              {/* Actual dot (diamond) */}
              {actualX !== null && (
                <polygon
                  points={`${actualX},${y - 7} ${actualX + 7},${y} ${actualX},${y + 7} ${actualX - 7},${y}`}
                  fill={color}
                  stroke="white"
                  strokeWidth={1.5}
                />
              )}
            </g>
          )
        })}
      </svg>

      {/* Legend */}
      <div className="flex items-center gap-4 px-4 py-2 border-t text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <svg width="14" height="14"><circle cx="7" cy="7" r="6" fill="#94a3b8" /></svg>
          Planned date
        </span>
        <span className="flex items-center gap-1">
          <svg width="14" height="14">
            <polygon points="7,0 14,7 7,14 0,7" fill="#94a3b8" stroke="white" strokeWidth="1" />
          </svg>
          Actual date
        </span>
        <span className="flex items-center gap-1">
          <svg width="14" height="4"><line x1="0" y1="2" x2="14" y2="2" stroke="#f59e0b" strokeWidth="2" strokeDasharray="3 2" /></svg>
          Today
        </span>
        {[...STATUSES].map((s) => (
          <span key={s} className="flex items-center gap-1">
            <svg width="10" height="10"><circle cx="5" cy="5" r="5" fill={STATUS_DOT[s]} /></svg>
            {s}
          </span>
        ))}
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

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
  const [sortMode, setSortMode] = useState<SortMode>('order')

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

  // Sorted milestones for display
  const displayMilestones = [...milestones].sort((a, b) => {
    if (sortMode === 'date_asc') return new Date(a.planned_date).getTime() - new Date(b.planned_date).getTime()
    if (sortMode === 'date_desc') return new Date(b.planned_date).getTime() - new Date(a.planned_date).getTime()
    return a.sort_order - b.sort_order
  })

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

  // ── Form handlers ──────────────────────────────────────────────────────────

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
          Manage project milestones.{' '}
          <span className="inline-flex items-center gap-1">Drag <GripIcon /> to reorder.</span>
        </p>
      </div>

      {/* Asset + controls */}
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
        <>
          {/* Gantt chart */}
          <div className="mb-8">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Timeline View</h2>
            <GanttChart milestones={displayMilestones} />
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
                {displayMilestones.map((m, idx) => (
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
