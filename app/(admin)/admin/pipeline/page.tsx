'use client'

import { useEffect, useState, useCallback } from 'react'
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
import { formatCurrency } from '@/lib/utils/format'
import type { PipelineLead, PipelineStage } from '@/lib/sheets/pipeline'

const ASSETS = ['livingstonfarm', 'wrenofthewoods', 'all']

const STAGES: PipelineStage[] = [
  'prospect',
  'contacted',
  'interested',
  'soft-commit',
  'committed',
  'closed',
]

const STAGE_LABELS: Record<PipelineStage, string> = {
  prospect: 'Prospect',
  contacted: 'Contacted',
  interested: 'Interested',
  'soft-commit': 'Soft Commit',
  committed: 'Committed',
  closed: 'Closed',
}

const STAGE_COLORS: Record<PipelineStage, string> = {
  prospect: 'bg-zinc-100 text-zinc-700',
  contacted: 'bg-blue-100 text-blue-700',
  interested: 'bg-yellow-100 text-yellow-700',
  'soft-commit': 'bg-orange-100 text-orange-700',
  committed: 'bg-green-100 text-green-700',
  closed: 'bg-primary/10 text-primary',
}

type SortKey = keyof PipelineLead
type SortDir = 'asc' | 'desc'

interface FormState {
  name: string
  email: string
  phone: string
  asset: string
  target_amount: string
  actual_amount: string
  stage: PipelineStage
  close_date: string
  probability: string
  notes: string
}

const emptyForm = (): FormState => ({
  name: '',
  email: '',
  phone: '',
  asset: 'livingstonfarm',
  target_amount: '0',
  actual_amount: '0',
  stage: 'prospect',
  close_date: '',
  probability: '50',
  notes: '',
})

// ── Kanban card ───────────────────────────────────────────────────────────────

function KanbanCard({
  lead,
  onEdit,
  onStageChange,
}: {
  lead: PipelineLead
  onEdit: (l: PipelineLead) => void
  onStageChange: (id: string, stage: PipelineStage) => void
}) {
  return (
    <div
      className="bg-white rounded-lg border shadow-sm p-3 cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => onEdit(lead)}
    >
      <div className="font-medium text-sm">{lead.name}</div>
      {lead.email && <div className="text-xs text-muted-foreground truncate">{lead.email}</div>}
      <div className="mt-2 flex items-center justify-between gap-1">
        <span className="text-sm font-semibold">{formatCurrency(lead.target_amount, true)}</span>
        <span className="text-xs text-muted-foreground">{lead.probability}%</span>
      </div>
      {lead.asset && (
        <div className="mt-1 text-xs text-muted-foreground">{lead.asset}</div>
      )}
      {lead.close_date && (
        <div className="mt-1 text-xs text-muted-foreground">Close: {lead.close_date}</div>
      )}
      <div className="mt-2 flex gap-1 flex-wrap">
        {STAGES.filter((s) => s !== lead.stage).map((s) => (
          <button
            key={s}
            className="text-[10px] px-1.5 py-0.5 rounded border border-input hover:bg-muted transition-colors"
            onClick={(e) => { e.stopPropagation(); onStageChange(lead.id, s) }}
          >
            → {STAGE_LABELS[s]}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Kanban column ─────────────────────────────────────────────────────────────

function KanbanColumn({
  stage,
  leads,
  onEdit,
  onStageChange,
}: {
  stage: PipelineStage
  leads: PipelineLead[]
  onEdit: (l: PipelineLead) => void
  onStageChange: (id: string, stage: PipelineStage) => void
}) {
  const total = leads.reduce((s, l) => s + l.target_amount, 0)
  return (
    <div className="flex flex-col min-w-[200px] max-w-[240px] flex-shrink-0">
      <div className={`rounded-t-lg px-3 py-2 flex items-center justify-between ${STAGE_COLORS[stage]}`}>
        <span className="text-xs font-semibold uppercase tracking-wide">{STAGE_LABELS[stage]}</span>
        <span className="text-xs font-medium">{leads.length}</span>
      </div>
      <div className="bg-muted/30 rounded-b-lg p-2 flex flex-col gap-2 min-h-[120px]">
        {leads.map((lead) => (
          <KanbanCard key={lead.id} lead={lead} onEdit={onEdit} onStageChange={onStageChange} />
        ))}
        {total > 0 && (
          <div className="text-xs text-muted-foreground text-right pt-1 border-t border-muted mt-auto">
            {formatCurrency(total, true)} targeted
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AdminPipelinePage() {
  const [leads, setLeads] = useState<PipelineLead[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'table' | 'kanban'>('table')
  const [assetFilter, setAssetFilter] = useState('all')
  const [stageFilter, setStageFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm())
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<PipelineLead | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/pipeline')
      if (!res.ok) throw new Error()
      setLeads(await res.json())
    } catch {
      toast.error('Failed to load pipeline')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm())
    setDialogOpen(true)
  }

  const openEdit = (lead: PipelineLead) => {
    setEditingId(lead.id)
    setForm({
      name: lead.name,
      email: lead.email,
      phone: lead.phone || '',
      asset: lead.asset,
      target_amount: String(lead.target_amount),
      actual_amount: String(lead.actual_amount),
      stage: lead.stage,
      close_date: lead.close_date || '',
      probability: String(lead.probability),
      notes: lead.notes || '',
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.name) { toast.error('Name is required'); return }
    setSaving(true)
    try {
      const method = editingId ? 'PATCH' : 'POST'
      const body = editingId ? { id: editingId, ...form } : form
      const res = await fetch('/api/admin/pipeline', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Save failed'); return }
      toast.success(editingId ? 'Updated' : 'Lead added')
      setDialogOpen(false)
      load()
    } catch {
      toast.error('Network error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (lead: PipelineLead) => {
    try {
      const res = await fetch('/api/admin/pipeline', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: lead.id }),
      })
      if (!res.ok) { toast.error('Delete failed'); return }
      toast.success('Lead removed')
      setDeleteTarget(null)
      load()
    } catch {
      toast.error('Network error')
    }
  }

  const handleStageChange = async (id: string, stage: PipelineStage) => {
    try {
      const res = await fetch('/api/admin/pipeline', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, stage }),
      })
      if (!res.ok) { toast.error('Failed to update stage'); return }
      setLeads((prev) => prev.map((l) => l.id === id ? { ...l, stage } : l))
    } catch {
      toast.error('Network error')
    }
  }

  // ── Filtering + sorting ───────────────────────────────────────────────────

  const filtered = leads
    .filter((l) => assetFilter === 'all' || l.asset === assetFilter)
    .filter((l) => stageFilter === 'all' || l.stage === stageFilter)
    .filter((l) =>
      !search ||
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.email.toLowerCase().includes(search.toLowerCase())
    )

  const sorted = [...filtered].sort((a, b) => {
    const av = a[sortKey]
    const bv = b[sortKey]
    if (av === undefined || bv === undefined) return 0
    if (typeof av === 'number' && typeof bv === 'number') {
      return sortDir === 'asc' ? av - bv : bv - av
    }
    return sortDir === 'asc'
      ? String(av).localeCompare(String(bv))
      : String(bv).localeCompare(String(av))
  })

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('asc') }
  }

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey !== k ? (
      <span className="text-muted-foreground/40 ml-1">↕</span>
    ) : sortDir === 'asc' ? (
      <span className="ml-1">↑</span>
    ) : (
      <span className="ml-1">↓</span>
    )

  // pipeline totals
  const totalTarget = filtered.reduce((s, l) => s + l.target_amount, 0)
  const totalActual = filtered.reduce((s, l) => s + l.actual_amount, 0)
  const weightedProbable = filtered.reduce((s, l) => s + l.target_amount * (l.probability / 100), 0)

  return (
    <div className="container mx-auto max-w-7xl px-4 py-12">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Investor Pipeline</h1>
        <p className="text-muted-foreground mt-1">Track prospects from first contact to close</p>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="rounded-lg border bg-card p-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Total Targeted</div>
          <div className="text-xl font-semibold mt-1">{formatCurrency(totalTarget, true)}</div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Probability-Weighted</div>
          <div className="text-xl font-semibold mt-1">{formatCurrency(weightedProbable, true)}</div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Actual Committed</div>
          <div className="text-xl font-semibold mt-1">{formatCurrency(totalActual, true)}</div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="flex rounded-md border overflow-hidden">
          <button
            className={`px-4 py-1.5 text-sm transition-colors ${view === 'table' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
            onClick={() => setView('table')}
          >
            Table
          </button>
          <button
            className={`px-4 py-1.5 text-sm border-l transition-colors ${view === 'kanban' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
            onClick={() => setView('kanban')}
          >
            Kanban
          </button>
        </div>

        <Input
          placeholder="Search name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-48"
        />

        <Select value={assetFilter} onValueChange={setAssetFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All assets" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All assets</SelectItem>
            <SelectItem value="livingstonfarm">Livingston Farm</SelectItem>
            <SelectItem value="wrenofthewoods">Wren of the Woods</SelectItem>
          </SelectContent>
        </Select>

        {view === 'table' && (
          <Select value={stageFilter} onValueChange={setStageFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All stages" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All stages</SelectItem>
              {STAGES.map((s) => (
                <SelectItem key={s} value={s}>{STAGE_LABELS[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Button onClick={openCreate} className="ml-auto">Add Lead</Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : view === 'kanban' ? (
        /* ── Kanban ─────────────────────────────────────────────────────── */
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STAGES.map((stage) => (
            <KanbanColumn
              key={stage}
              stage={stage}
              leads={filtered.filter((l) => l.stage === stage)}
              onEdit={openEdit}
              onStageChange={handleStageChange}
            />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <p className="text-sm text-muted-foreground">No leads found.</p>
      ) : (
        /* ── Table ──────────────────────────────────────────────────────── */
        <div className="rounded-md border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                {([
                  ['name', 'Name'],
                  ['email', 'Email'],
                  ['asset', 'Asset'],
                  ['stage', 'Stage'],
                  ['target_amount', 'Target'],
                  ['actual_amount', 'Actual'],
                  ['probability', 'Prob %'],
                  ['close_date', 'Est. Close'],
                ] as [SortKey, string][]).map(([key, label]) => (
                  <th
                    key={key}
                    className="px-4 py-2 text-left font-medium cursor-pointer hover:text-foreground select-none whitespace-nowrap"
                    onClick={() => handleSort(key)}
                  >
                    {label}<SortIcon k={key} />
                  </th>
                ))}
                <th className="px-4 py-2 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((lead) => (
                <tr key={lead.id} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-2 font-medium">{lead.name}</td>
                  <td className="px-4 py-2 text-muted-foreground">{lead.email || '—'}</td>
                  <td className="px-4 py-2">
                    <Badge variant="outline">{lead.asset}</Badge>
                  </td>
                  <td className="px-4 py-2">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STAGE_COLORS[lead.stage]}`}>
                      {STAGE_LABELS[lead.stage]}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">{formatCurrency(lead.target_amount, true)}</td>
                  <td className="px-4 py-2 text-right">{formatCurrency(lead.actual_amount, true)}</td>
                  <td className="px-4 py-2 text-right">{lead.probability}%</td>
                  <td className="px-4 py-2 text-muted-foreground whitespace-nowrap">{lead.close_date || '—'}</td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(lead)}>Edit</Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget(lead)}
                      >
                        Remove
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Lead' : 'Add Lead'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1 col-span-2">
                <Label>Name *</Label>
                <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Investor name" />
              </div>
              <div className="space-y-1">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Phone</Label>
                <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Asset</Label>
                <Select value={form.asset} onValueChange={(v) => setForm((f) => ({ ...f, asset: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="livingstonfarm">Livingston Farm</SelectItem>
                    <SelectItem value="wrenofthewoods">Wren of the Woods</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Stage</Label>
                <Select value={form.stage} onValueChange={(v) => setForm((f) => ({ ...f, stage: v as PipelineStage }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STAGES.map((s) => <SelectItem key={s} value={s}>{STAGE_LABELS[s]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Target Amount ($)</Label>
                <Input type="number" value={form.target_amount} onChange={(e) => setForm((f) => ({ ...f, target_amount: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Actual Amount ($)</Label>
                <Input type="number" value={form.actual_amount} onChange={(e) => setForm((f) => ({ ...f, actual_amount: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Probability to Close (%)</Label>
                <Input type="number" min="0" max="100" value={form.probability} onChange={(e) => setForm((f) => ({ ...f, probability: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Est. Close Date</Label>
                <Input type="date" value={form.close_date} onChange={(e) => setForm((f) => ({ ...f, close_date: e.target.value }))} />
              </div>
              <div className="space-y-1 col-span-2">
                <Label>Notes</Label>
                <Input value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Optional" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Remove Lead</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Remove <span className="font-medium text-foreground">{deleteTarget?.name}</span> from the pipeline? This cannot be undone.
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
