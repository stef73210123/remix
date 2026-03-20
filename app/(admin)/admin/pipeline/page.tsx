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
import { formatCurrency } from '@/lib/utils/format'
import type { PipelineLead, PipelineStage } from '@/lib/sheets/pipeline'

const ASSETS = ['livingstonfarm', 'wrenofthewoods', 'circularplatform', 'all']

const ASSET_LABELS: Record<string, string> = {
  livingstonfarm: 'Livingston Farm',
  wrenofthewoods: 'Wren of the Woods',
  circularplatform: 'Circular',
}

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

interface InlineEdit {
  id: string
  field: string
  value: string
}

// ── Kanban card ───────────────────────────────────────────────────────────────

function KanbanCard({
  lead,
  onEdit,
  onDragStart,
}: {
  lead: PipelineLead
  onEdit: (l: PipelineLead) => void
  onDragStart: (id: string) => void
}) {
  return (
    <div
      draggable
      onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; onDragStart(lead.id) }}
      className="bg-white rounded-lg border shadow-sm p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
      onClick={() => onEdit(lead)}
    >
      <div className="font-medium text-sm">{lead.name}</div>
      {lead.email && <div className="text-xs text-muted-foreground truncate">{lead.email}</div>}
      <div className="mt-2 flex items-center justify-between gap-1">
        <span className="text-sm font-semibold">{formatCurrency(lead.actual_amount || lead.target_amount, true)}</span>
        <span className="text-xs text-muted-foreground">{lead.probability}%</span>
      </div>
      {lead.asset && (
        <div className="mt-1 text-xs text-muted-foreground">{ASSET_LABELS[lead.asset] ?? lead.asset}</div>
      )}
      {lead.close_date && (
        <div className="mt-1 text-xs text-muted-foreground">Close: {lead.close_date}</div>
      )}
      {lead.notes && (
        <div className="mt-1 text-xs text-muted-foreground italic truncate">{lead.notes}</div>
      )}
    </div>
  )
}

// ── Kanban column ─────────────────────────────────────────────────────────────

function KanbanColumn({
  stage,
  leads,
  onEdit,
  onDragStart,
  onDrop,
}: {
  stage: PipelineStage
  leads: PipelineLead[]
  onEdit: (l: PipelineLead) => void
  onDragStart: (id: string) => void
  onDrop: (stage: PipelineStage) => void
}) {
  const [isDragOver, setIsDragOver] = useState(false)
  const total = leads.reduce((s, l) => s + (l.actual_amount || l.target_amount), 0)
  return (
    <div className="flex flex-col min-w-[200px] max-w-[240px] flex-shrink-0">
      <div className={`rounded-t-lg px-3 py-2 flex items-center justify-between ${STAGE_COLORS[stage]}`}>
        <span className="text-xs font-semibold uppercase tracking-wide">{STAGE_LABELS[stage]}</span>
        <span className="text-xs font-medium">{leads.length}</span>
      </div>
      <div
        className={`rounded-b-lg p-2 flex flex-col gap-2 min-h-[120px] transition-colors ${isDragOver ? 'bg-primary/10 ring-2 ring-primary/30' : 'bg-muted/30'}`}
        onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setIsDragOver(true) }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={() => { setIsDragOver(false); onDrop(stage) }}
      >
        {leads.map((lead) => (
          <KanbanCard key={lead.id} lead={lead} onEdit={onEdit} onDragStart={onDragStart} />
        ))}
        {total > 0 && (
          <div className="text-xs text-muted-foreground text-right pt-1 border-t border-muted mt-auto">
            {formatCurrency(total, true)}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Inline editable cell ──────────────────────────────────────────────────────

function InlineCell({
  lead,
  field,
  displayValue,
  inlineEdit,
  onStartEdit,
  onSave,
  inputType = 'text',
  className = '',
}: {
  lead: PipelineLead
  field: string
  displayValue: React.ReactNode
  inlineEdit: InlineEdit | null
  onStartEdit: (edit: InlineEdit) => void
  onSave: (id: string, field: string, value: string) => void
  inputType?: string
  className?: string
}) {
  const isEditing = inlineEdit?.id === lead.id && inlineEdit?.field === field
  if (isEditing) {
    return (
      <Input
        autoFocus
        type={inputType}
        value={inlineEdit.value}
        onChange={(e) => onStartEdit({ ...inlineEdit, value: e.target.value })}
        onBlur={() => onSave(lead.id, field, inlineEdit.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onSave(lead.id, field, inlineEdit.value)
          if (e.key === 'Escape') onStartEdit({ id: '', field: '', value: '' })
        }}
        className={`h-7 py-0 text-sm ${className}`}
      />
    )
  }
  const rawValue = lead[field as keyof PipelineLead]
  return (
    <span className="group flex items-center gap-1">
      {displayValue}
      <button
        onClick={() => onStartEdit({ id: lead.id, field, value: String(rawValue ?? '') })}
        className="opacity-0 group-hover:opacity-60 hover:!opacity-100 text-xs transition-opacity"
        title={`Edit ${field}`}
      >
        ✏
      </button>
    </span>
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
  const [inlineEdit, setInlineEdit] = useState<InlineEdit | null>(null)
  const dragLeadId = useRef<string | null>(null)

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

  // Inline save — single field update
  const saveInline = async (id: string, field: string, value: string) => {
    setInlineEdit(null)
    const lead = leads.find((l) => l.id === id)
    if (!lead) return
    const numFields = ['target_amount', 'actual_amount', 'probability']
    const parsed = numFields.includes(field) ? Number(value) : value
    try {
      const res = await fetch('/api/admin/pipeline', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, [field]: parsed }),
      })
      if (!res.ok) { toast.error('Save failed'); return }
      setLeads((prev) =>
        prev.map((l) => l.id === id ? { ...l, [field]: parsed } : l)
      )
    } catch {
      toast.error('Network error')
    }
  }

  // Stage change — with auto-close logic + investor position creation
  const handleStageChange = async (id: string, stage: PipelineStage) => {
    const lead = leads.find((l) => l.id === id)
    if (!lead) return

    const updates: Record<string, unknown> = { id, stage }

    // Auto-close: set probability to 100 and actual = target
    if (stage === 'closed') {
      updates.probability = 100
      updates.actual_amount = lead.target_amount
    }

    try {
      const res = await fetch('/api/admin/pipeline', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (!res.ok) { toast.error('Failed to update stage'); return }

      setLeads((prev) =>
        prev.map((l) =>
          l.id === id
            ? { ...l, stage, ...(stage === 'closed' ? { probability: 100, actual_amount: l.target_amount } : {}) }
            : l
        )
      )

      // Auto-create investor position when closed
      if (stage === 'closed' && lead.email) {
        const investorRes = await fetch('/api/admin/investors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: lead.email,
            name: lead.name,
            asset: lead.asset,
            equity_invested: lead.target_amount,
            ownership_pct: 0,
            capital_account_balance: lead.target_amount,
            nav_estimate: lead.target_amount,
            irr_estimate: 0,
            equity_multiple: 1,
            distributions_total: 0,
          }),
        })
        if (investorRes.ok) {
          toast.success(`Moved to Closed — investor position created for ${lead.name}`)
        } else {
          toast.success('Moved to Closed')
          toast.warning('Could not auto-create investor position — add manually in Investors')
        }
      } else {
        toast.success(`Moved to ${STAGE_LABELS[stage]}`)
      }
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
  const weightedProbable = filtered.reduce((s, l) => s + l.actual_amount * (l.probability / 100), 0)

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
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All assets" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All assets</SelectItem>
            <SelectItem value="livingstonfarm">Livingston Farm</SelectItem>
            <SelectItem value="wrenofthewoods">Wren of the Woods</SelectItem>
            <SelectItem value="circularplatform">Circular</SelectItem>
          </SelectContent>
        </Select>

        {view === 'table' && (
          <Select value={stageFilter} onValueChange={setStageFilter}>
            <SelectTrigger className="w-36">
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
              onDragStart={(id) => { dragLeadId.current = id }}
              onDrop={(targetStage) => {
                if (dragLeadId.current) {
                  const lead = leads.find(l => l.id === dragLeadId.current)
                  if (lead && lead.stage !== targetStage) {
                    handleStageChange(dragLeadId.current, targetStage)
                  }
                  dragLeadId.current = null
                }
              }}
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
                  <td className="px-4 py-2 font-medium">
                    <InlineCell lead={lead} field="name" displayValue={lead.name} inlineEdit={inlineEdit} onStartEdit={setInlineEdit} onSave={saveInline} />
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">
                    <InlineCell lead={lead} field="email" displayValue={lead.email || '—'} inlineEdit={inlineEdit} onStartEdit={setInlineEdit} onSave={saveInline} inputType="email" />
                  </td>
                  <td className="px-4 py-2">
                    <Badge variant="outline">{ASSET_LABELS[lead.asset] ?? lead.asset}</Badge>
                  </td>
                  <td className="px-4 py-2">
                    {inlineEdit?.id === lead.id && inlineEdit?.field === 'stage' ? (
                      <select
                        autoFocus
                        value={inlineEdit.value}
                        onChange={(e) => setInlineEdit({ ...inlineEdit, value: e.target.value })}
                        onBlur={() => saveInline(lead.id, 'stage', inlineEdit.value)}
                        className="text-xs border rounded px-1 py-0.5"
                      >
                        {STAGES.map((s) => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
                      </select>
                    ) : (
                      <span className="group flex items-center gap-1">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STAGE_COLORS[lead.stage]}`}>
                          {STAGE_LABELS[lead.stage]}
                        </span>
                        <button
                          onClick={() => setInlineEdit({ id: lead.id, field: 'stage', value: lead.stage })}
                          className="opacity-0 group-hover:opacity-60 hover:!opacity-100 text-xs"
                          title="Edit stage"
                        >✏</button>
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <InlineCell lead={lead} field="target_amount" displayValue={formatCurrency(lead.target_amount, true)} inlineEdit={inlineEdit} onStartEdit={setInlineEdit} onSave={saveInline} inputType="number" className="w-24 text-right" />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <InlineCell lead={lead} field="actual_amount" displayValue={formatCurrency(lead.actual_amount, true)} inlineEdit={inlineEdit} onStartEdit={setInlineEdit} onSave={saveInline} inputType="number" className="w-24 text-right" />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <InlineCell lead={lead} field="probability" displayValue={`${lead.probability}%`} inlineEdit={inlineEdit} onStartEdit={setInlineEdit} onSave={saveInline} inputType="number" className="w-16 text-right" />
                  </td>
                  <td className="px-4 py-2 text-muted-foreground whitespace-nowrap">
                    <InlineCell lead={lead} field="close_date" displayValue={lead.close_date || '—'} inlineEdit={inlineEdit} onStartEdit={setInlineEdit} onSave={saveInline} inputType="date" className="w-36" />
                  </td>
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
                    <SelectItem value="circularplatform">Circular</SelectItem>
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
