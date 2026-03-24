'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
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
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils/format'
import type { Deal, DealStage } from '@/lib/sheets/deals'

const STAGES: DealStage[] = [
  'sourcing', 'screening', 'loi', 'due-diligence', 'negotiating', 'contracted', 'closed', 'passed', 'dead',
]

const STAGE_LABELS: Record<DealStage, string> = {
  sourcing: 'Sourcing',
  screening: 'Screening',
  loi: 'LOI',
  'due-diligence': 'Due Diligence',
  negotiating: 'Negotiating',
  contracted: 'Contracted',
  closed: 'Closed',
  passed: 'Passed',
  dead: 'Dead',
}

const STAGE_COLORS: Record<DealStage, string> = {
  sourcing: 'bg-zinc-100 text-zinc-700',
  screening: 'bg-blue-100 text-blue-700',
  loi: 'bg-purple-100 text-purple-700',
  'due-diligence': 'bg-yellow-100 text-yellow-800',
  negotiating: 'bg-orange-100 text-orange-700',
  contracted: 'bg-teal-100 text-teal-700',
  closed: 'bg-green-100 text-green-700',
  passed: 'bg-zinc-200 text-zinc-500',
  dead: 'bg-red-50 text-red-400',
}

const ACTIVE_STAGES = new Set<DealStage>(['sourcing', 'screening', 'loi', 'due-diligence', 'negotiating', 'contracted'])

const ASSET_TYPES = [
  'Hotel / Resort', 'Restaurant / F&B', 'Agriculture', 'Mixed-Use', 'Residential', 'Retail', 'Industrial', 'Other',
]

const SOURCE_OPTIONS = ['Broker', 'Off-Market', 'Direct Outreach', 'Referral', 'LoopNet / CoStar', 'Other']

interface FormState {
  name: string
  address: string
  asset_type: string
  market: string
  asking_price: string
  target_price: string
  size_sf: string
  units: string
  cap_rate: string
  irr_target: string
  source: string
  broker: string
  stage: DealStage
  probability: string
  close_date: string
  notes: string
}

const emptyForm = (): FormState => ({
  name: '',
  address: '',
  asset_type: 'Hotel / Resort',
  market: '',
  asking_price: '0',
  target_price: '0',
  size_sf: '0',
  units: '0',
  cap_rate: '0',
  irr_target: '0',
  source: 'Broker',
  broker: '',
  stage: 'sourcing',
  probability: '10',
  close_date: '',
  notes: '',
})

// ── Kanban card ───────────────────────────────────────────────────────────────

function KanbanCard({
  deal,
  onEdit,
  onDragStart,
}: {
  deal: Deal
  onEdit: (d: Deal) => void
  onDragStart: (id: string) => void
}) {
  return (
    <div
      draggable
      onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; onDragStart(deal.id) }}
      className="bg-white rounded-lg border shadow-sm p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
      onClick={() => onEdit(deal)}
    >
      <div className="font-medium text-sm leading-tight">{deal.name}</div>
      {deal.asset_type && <div className="text-xs text-muted-foreground mt-0.5">{deal.asset_type}</div>}
      {deal.market && <div className="text-xs text-muted-foreground">{deal.market}</div>}
      <div className="mt-2 flex items-center justify-between gap-1">
        <span className="text-sm font-semibold">{deal.asking_price > 0 ? formatCurrency(deal.asking_price, true) : '—'}</span>
        {deal.irr_target > 0 && <span className="text-xs text-muted-foreground">{deal.irr_target}% IRR</span>}
      </div>
      {(deal.size_sf > 0 || deal.units > 0) && (
        <div className="mt-1 text-xs text-muted-foreground">
          {deal.size_sf > 0 && `${deal.size_sf.toLocaleString()} SF`}
          {deal.size_sf > 0 && deal.units > 0 && ' · '}
          {deal.units > 0 && `${deal.units} units`}
        </div>
      )}
      {deal.source && <div className="mt-1 text-xs text-muted-foreground">{deal.source}{deal.broker ? ` · ${deal.broker}` : ''}</div>}
      <div className="mt-1 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{deal.probability}% prob</span>
        {deal.close_date && <span className="text-xs text-muted-foreground">{deal.close_date}</span>}
      </div>
    </div>
  )
}

// ── Kanban column ─────────────────────────────────────────────────────────────

function KanbanColumn({
  stage,
  deals,
  onEdit,
  onDragStart,
  onDrop,
}: {
  stage: DealStage
  deals: Deal[]
  onEdit: (d: Deal) => void
  onDragStart: (id: string) => void
  onDrop: (stage: DealStage) => void
}) {
  const [isDragOver, setIsDragOver] = useState(false)
  const totalValue = deals.reduce((s, d) => s + d.target_price, 0)

  return (
    <div className="flex flex-col min-w-[200px] max-w-[240px] flex-shrink-0">
      <div className={`rounded-t-lg px-3 py-2 flex items-center justify-between ${STAGE_COLORS[stage]}`}>
        <span className="text-xs font-semibold uppercase tracking-wide">{STAGE_LABELS[stage]}</span>
        <span className="text-xs font-medium">{deals.length}</span>
      </div>
      <div
        className={`rounded-b-lg p-2 flex flex-col gap-2 min-h-[120px] transition-colors ${isDragOver ? 'bg-primary/10 ring-2 ring-primary/30' : 'bg-muted/30'}`}
        onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setIsDragOver(true) }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={() => { setIsDragOver(false); onDrop(stage) }}
      >
        {deals.map((deal) => (
          <KanbanCard key={deal.id} deal={deal} onEdit={onEdit} onDragStart={onDragStart} />
        ))}
        {totalValue > 0 && (
          <div className="text-xs text-muted-foreground text-right pt-1 border-t border-muted mt-auto">
            {formatCurrency(totalValue, true)}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AdminDealsPage() {
  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'table' | 'kanban'>('table')
  const [stageFilter, setStageFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm())
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Deal | null>(null)
  const dragDealId = useRef<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/deals')
      if (!res.ok) throw new Error()
      setDeals(await res.json())
    } catch {
      toast.error('Failed to load deals')
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

  const openEdit = (deal: Deal) => {
    setEditingId(deal.id)
    setForm({
      name: deal.name,
      address: deal.address,
      asset_type: deal.asset_type,
      market: deal.market,
      asking_price: String(deal.asking_price),
      target_price: String(deal.target_price),
      size_sf: String(deal.size_sf),
      units: String(deal.units),
      cap_rate: String(deal.cap_rate),
      irr_target: String(deal.irr_target),
      source: deal.source,
      broker: deal.broker,
      stage: deal.stage,
      probability: String(deal.probability),
      close_date: deal.close_date,
      notes: deal.notes,
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const method = editingId ? 'PATCH' : 'POST'
      const body = editingId ? { id: editingId, ...form } : form
      const res = await fetch('/api/admin/deals', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Save failed'); return }
      toast.success(editingId ? 'Deal updated' : 'Deal added')
      setDialogOpen(false)
      load()
    } catch {
      toast.error('Network error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (deal: Deal) => {
    try {
      const res = await fetch('/api/admin/deals', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deal.id }),
      })
      if (!res.ok) { toast.error('Delete failed'); return }
      toast.success('Deal removed')
      setDeleteTarget(null)
      load()
    } catch {
      toast.error('Network error')
    }
  }

  const handleStageChange = async (id: string, stage: DealStage) => {
    const deal = deals.find((d) => d.id === id)
    if (!deal || deal.stage === stage) return
    const updates: Record<string, unknown> = { id, stage }
    if (stage === 'closed') { updates.probability = 100 }
    if (stage === 'passed' || stage === 'dead') { updates.probability = 0 }
    try {
      const res = await fetch('/api/admin/deals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (!res.ok) { toast.error('Failed to update stage'); return }
      setDeals((prev) => prev.map((d) =>
        d.id === id ? { ...d, stage, ...(stage === 'closed' ? { probability: 100 } : stage === 'passed' || stage === 'dead' ? { probability: 0 } : {}) } : d
      ))
      toast.success(`Moved to ${STAGE_LABELS[stage]}`)
    } catch {
      toast.error('Network error')
    }
  }

  // ── Filtering ─────────────────────────────────────────────────────────────

  const filtered = deals
    .filter((d) => stageFilter === 'all' || d.stage === stageFilter)
    .filter((d) => typeFilter === 'all' || d.asset_type === typeFilter)
    .filter((d) =>
      !search ||
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.market.toLowerCase().includes(search.toLowerCase()) ||
      d.address.toLowerCase().includes(search.toLowerCase())
    )

  // Summary stats
  const activeDeals = filtered.filter((d) => ACTIVE_STAGES.has(d.stage))
  const totalPipeline = activeDeals.reduce((s, d) => s + (d.target_price || d.asking_price), 0)
  const weightedPipeline = activeDeals.reduce((s, d) => s + (d.target_price || d.asking_price) * (d.probability / 100), 0)
  const closedDeals = filtered.filter((d) => d.stage === 'closed')
  const totalClosed = closedDeals.reduce((s, d) => s + (d.target_price || d.asking_price), 0)

  const sf = (v: string) => { const n = parseFloat(v); return isNaN(n) ? '' : v }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-12">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Deal Pipeline</h1>
        <p className="text-muted-foreground mt-1">Track potential acquisitions from sourcing to close</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="rounded-lg border bg-card p-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Active Pipeline</div>
          <div className="text-xl font-semibold mt-1">{formatCurrency(totalPipeline, true)}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{activeDeals.length} deal{activeDeals.length !== 1 ? 's' : ''}</div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Probability-Weighted</div>
          <div className="text-xl font-semibold mt-1">{formatCurrency(weightedPipeline, true)}</div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Closed</div>
          <div className="text-xl font-semibold mt-1">{formatCurrency(totalClosed, true)}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{closedDeals.length} deal{closedDeals.length !== 1 ? 's' : ''}</div>
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
            Board
          </button>
        </div>

        <Input
          placeholder="Search name, market, address…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-52"
        />

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {ASSET_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>

        {view === 'table' && (
          <Select value={stageFilter} onValueChange={setStageFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All stages" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All stages</SelectItem>
              {STAGES.map((s) => <SelectItem key={s} value={s}>{STAGE_LABELS[s]}</SelectItem>)}
            </SelectContent>
          </Select>
        )}

        <Button onClick={openCreate} className="ml-auto">Add Deal</Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : view === 'kanban' ? (
        /* ── Kanban board ───────────────────────────────────────────────── */
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STAGES.map((stage) => (
            <KanbanColumn
              key={stage}
              stage={stage}
              deals={filtered.filter((d) => d.stage === stage)}
              onEdit={openEdit}
              onDragStart={(id) => { dragDealId.current = id }}
              onDrop={(targetStage) => {
                if (dragDealId.current) {
                  handleStageChange(dragDealId.current, targetStage)
                  dragDealId.current = null
                }
              }}
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">No deals found.</p>
      ) : (
        /* ── Table ──────────────────────────────────────────────────────── */
        <div className="rounded-md border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-2 text-left font-medium">Name</th>
                <th className="px-4 py-2 text-left font-medium">Type</th>
                <th className="px-4 py-2 text-left font-medium">Market</th>
                <th className="px-4 py-2 text-left font-medium">Stage</th>
                <th className="px-4 py-2 text-right font-medium">Asking</th>
                <th className="px-4 py-2 text-right font-medium">Target</th>
                <th className="px-4 py-2 text-right font-medium">SF / Units</th>
                <th className="px-4 py-2 text-right font-medium">IRR</th>
                <th className="px-4 py-2 text-right font-medium">Prob %</th>
                <th className="px-4 py-2 text-left font-medium">Source</th>
                <th className="px-4 py-2 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((deal) => (
                <tr key={deal.id} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-2 font-medium">
                    <div>{deal.name}</div>
                    {deal.address && <div className="text-xs text-muted-foreground">{deal.address}</div>}
                  </td>
                  <td className="px-4 py-2 text-muted-foreground whitespace-nowrap">{deal.asset_type || '—'}</td>
                  <td className="px-4 py-2 text-muted-foreground">{deal.market || '—'}</td>
                  <td className="px-4 py-2">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STAGE_COLORS[deal.stage]}`}>
                      {STAGE_LABELS[deal.stage]}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">{deal.asking_price > 0 ? formatCurrency(deal.asking_price, true) : '—'}</td>
                  <td className="px-4 py-2 text-right">{deal.target_price > 0 ? formatCurrency(deal.target_price, true) : '—'}</td>
                  <td className="px-4 py-2 text-right text-muted-foreground whitespace-nowrap">
                    {deal.size_sf > 0 ? `${deal.size_sf.toLocaleString()} SF` : ''}
                    {deal.size_sf > 0 && deal.units > 0 ? ' / ' : ''}
                    {deal.units > 0 ? `${deal.units} u` : ''}
                    {!deal.size_sf && !deal.units ? '—' : ''}
                  </td>
                  <td className="px-4 py-2 text-right">{deal.irr_target > 0 ? `${deal.irr_target}%` : '—'}</td>
                  <td className="px-4 py-2 text-right">{deal.probability}%</td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {deal.source}
                    {deal.broker && <div className="text-xs">{deal.broker}</div>}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(deal)}>Edit</Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget(deal)}
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
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Deal' : 'Add Deal'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Basic info */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1 col-span-2">
                <Label>Property Name</Label>
                <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. The Elm Hotel, Catskills" />
              </div>
              <div className="space-y-1 col-span-2">
                <Label>Address</Label>
                <Input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} placeholder="Street address" />
              </div>
              <div className="space-y-1">
                <Label>Asset Type</Label>
                <Select value={form.asset_type} onValueChange={(v) => setForm((f) => ({ ...f, asset_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ASSET_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Market / Location</Label>
                <Input value={form.market} onChange={(e) => setForm((f) => ({ ...f, market: e.target.value }))} placeholder="e.g. Catskills, NY" />
              </div>
            </div>

            {/* Financials */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Financials</p>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label>Asking Price ($)</Label>
                  <Input type="number" value={form.asking_price} onChange={(e) => setForm((f) => ({ ...f, asking_price: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Target Price ($)</Label>
                  <Input type="number" value={form.target_price} onChange={(e) => setForm((f) => ({ ...f, target_price: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Cap Rate (%)</Label>
                  <Input type="number" step="0.1" value={form.cap_rate} onChange={(e) => setForm((f) => ({ ...f, cap_rate: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Size (SF)</Label>
                  <Input type="number" value={form.size_sf} onChange={(e) => setForm((f) => ({ ...f, size_sf: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Units / Keys</Label>
                  <Input type="number" value={form.units} onChange={(e) => setForm((f) => ({ ...f, units: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Target IRR (%)</Label>
                  <Input type="number" step="0.1" value={form.irr_target} onChange={(e) => setForm((f) => ({ ...f, irr_target: e.target.value }))} />
                </div>
              </div>
            </div>

            {/* Pipeline */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Pipeline</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Stage</Label>
                  <Select value={form.stage} onValueChange={(v) => setForm((f) => ({ ...f, stage: v as DealStage }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STAGES.map((s) => <SelectItem key={s} value={s}>{STAGE_LABELS[s]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Probability (%)</Label>
                  <Input type="number" min="0" max="100" value={form.probability} onChange={(e) => setForm((f) => ({ ...f, probability: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Source</Label>
                  <Select value={form.source} onValueChange={(v) => setForm((f) => ({ ...f, source: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SOURCE_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Broker / Contact</Label>
                  <Input value={form.broker} onChange={(e) => setForm((f) => ({ ...f, broker: e.target.value }))} placeholder="Name or firm" />
                </div>
                <div className="space-y-1">
                  <Label>Est. Close Date</Label>
                  <Input type="date" value={form.close_date} onChange={(e) => setForm((f) => ({ ...f, close_date: e.target.value }))} />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <Label>Notes</Label>
              <Textarea rows={3} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Deal notes, key considerations…" />
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
          <DialogHeader><DialogTitle>Remove Deal</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Remove <span className="font-medium text-foreground">{deleteTarget?.name}</span>? This cannot be undone.
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
