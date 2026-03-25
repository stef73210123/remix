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
import { formatCurrency } from '@/lib/utils/format'
import type { PipelineLead, PipelineStage, InvestorCategory, PointOfContact } from '@/lib/sheets/pipeline'
import type { Note } from '@/lib/sheets/notes'
import { Textarea } from '@/components/ui/textarea'
import { MediaUploader } from '@/components/shared/MediaUploader'

const ASSETS = ['livingstonfarm', 'wrenofthewoods', 'circularplatform', 'all']

const CATEGORY_LABELS: Record<InvestorCategory | 'all' | 'uncategorized', string> = {
  all: 'All categories',
  institutional: 'Institutional',
  'co-gp': 'Co-GP',
  'family-office': 'Family Office',
  individual: 'Individual',
  'new-contact': 'New Contact',
  uncategorized: 'Uncategorized',
  '': 'Uncategorized', // satisfies InvestorCategory which includes ''
}

const ASSET_LABELS: Record<string, string> = {
  livingstonfarm: 'Livingston Farm',
  wrenofthewoods: 'Wren of the Woods',
  circularplatform: 'Circular',
}

const STAGES: PipelineStage[] = [
  'backlog',
  'prospect',
  'contacted',
  'interested',
  'soft-commit',
  'committed',
  'closed',
  'passed',
  'unqualified',
]

// Stages that count toward probability-weighted totals
const ACTIVE_STAGES = new Set<PipelineStage>(['prospect', 'contacted', 'interested', 'soft-commit', 'committed', 'closed'])

const STAGE_LABELS: Record<PipelineStage, string> = {
  backlog: 'Backlog',
  prospect: 'Prospect',
  contacted: 'Contacted',
  interested: 'Interested',
  'soft-commit': 'Soft Commit',
  committed: 'Committed',
  closed: 'Closed',
  passed: 'Passed',
  unqualified: 'Unqualified',
}

const POC_LABELS: Record<PointOfContact | 'all', string> = {
  all: 'All POCs',
  stefan: 'Stefan',
  joe: 'Joe',
  roxanne: 'Roxanne',
  '': 'Unassigned',
}

const STAGE_COLORS: Record<PipelineStage, string> = {
  backlog: 'bg-slate-100 text-slate-500',
  prospect: 'bg-zinc-100 text-zinc-700',
  contacted: 'bg-blue-100 text-blue-700',
  interested: 'bg-yellow-100 text-yellow-700',
  'soft-commit': 'bg-orange-100 text-orange-700',
  committed: 'bg-green-100 text-green-700',
  closed: 'bg-primary/10 text-primary',
  passed: 'bg-zinc-200 text-zinc-500',
  unqualified: 'bg-red-50 text-red-400',
}

// ── Column system ─────────────────────────────────────────────────────────────

interface ColDef {
  key: string
  label: string
  visible: boolean
}

const DEFAULT_COLUMNS: ColDef[] = [
  { key: 'name', label: 'Name', visible: true },
  { key: 'firm', label: 'Firm', visible: true },
  { key: 'category', label: 'Type', visible: true },
  { key: 'point_of_contact', label: 'POC', visible: true },
  { key: 'email', label: 'Email', visible: true },
  { key: 'stage', label: 'Stage', visible: true },
  { key: 'priority_tier', label: 'Priority', visible: true },
  { key: 'target_amount', label: 'Target', visible: true },
  { key: 'close_date', label: 'Est. Close', visible: true },
]

const COLUMNS_KEY = 'pipeline_cols_v2'

function persistColumns(cols: ColDef[]) {
  try { localStorage.setItem(COLUMNS_KEY, JSON.stringify(cols)) } catch {}
}

function initColumns(): ColDef[] {
  if (typeof window === 'undefined') return DEFAULT_COLUMNS
  try {
    const s = localStorage.getItem(COLUMNS_KEY)
    if (!s) return DEFAULT_COLUMNS
    const saved: { key: string; visible: boolean }[] = JSON.parse(s)
    const ordered: ColDef[] = []
    for (const { key, visible } of saved) {
      const def = DEFAULT_COLUMNS.find(c => c.key === key)
      if (def) ordered.push({ ...def, visible })
    }
    for (const def of DEFAULT_COLUMNS) {
      if (!ordered.find(c => c.key === def.key)) ordered.push(def)
    }
    return ordered
  } catch { return DEFAULT_COLUMNS }
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
  category: InvestorCategory
  point_of_contact: PointOfContact
  firm: string
  title: string
  linkedin_url: string
  priority_tier: string
  investment_rationale: string
  is_company: boolean
  parent_id: string
  documents: string[] // array of uploaded URLs
}

const emptyForm = (): FormState => ({
  name: '',
  email: '',
  phone: '',
  asset: 'livingstonfarm',
  target_amount: '0',
  actual_amount: '0',
  stage: 'backlog',
  close_date: '',
  probability: '0',
  notes: '',
  category: '',
  point_of_contact: '',
  firm: '',
  title: '',
  linkedin_url: '',
  priority_tier: '',
  investment_rationale: '',
  is_company: false,
  parent_id: '',
  documents: [],
})

interface InlineEdit {
  id: string
  field: string
  value: string
}

// ── Lead detail modal ─────────────────────────────────────────────────────────

function LeadDetailModal({
  lead,
  allLeads,
  onClose,
  onUpdate,
  onDelete,
}: {
  lead: PipelineLead
  allLeads: PipelineLead[]
  onClose: () => void
  onUpdate: (l: PipelineLead) => void
  onDelete: (l: PipelineLead) => void
}) {
  const [local, setLocal] = useState<PipelineLead>(lead)
  const [editField, setEditField] = useState<string | null>(null)
  const [editVal, setEditVal] = useState('')
  const [saving, setSaving] = useState(false)
  const [notes, setNotes] = useState<Note[]>([])
  const [notesLoading, setNotesLoading] = useState(true)
  const [noteForm, setNoteForm] = useState({ title: '', body: '' })
  const [noteMedia, setNoteMedia] = useState<string[]>([])
  const [savingNote, setSavingNote] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [mergeSearch, setMergeSearch] = useState('')
  const [mergeTarget, setMergeTarget] = useState<PipelineLead | null>(null)
  const [merging, setMerging] = useState(false)

  useEffect(() => {
    setNotesLoading(true)
    fetch(`/api/admin/notes?ref_id=${lead.id}`)
      .then((r) => r.json())
      .then((d) => { setNotes(Array.isArray(d) ? d : []); setNotesLoading(false) })
      .catch(() => setNotesLoading(false))
  }, [lead.id])

  const startEdit = (field: string, val: string | number | undefined) => {
    setEditField(field)
    setEditVal(String(val ?? ''))
  }

  const commitEdit = async () => {
    if (!editField) return
    setSaving(true)
    try {
      const numFields = ['target_amount', 'actual_amount', 'probability']
      const parsed: string | number = numFields.includes(editField) ? Number(editVal) : editVal
      const res = await fetch('/api/admin/pipeline', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: local.id, [editField]: parsed }),
      })
      if (!res.ok) { toast.error('Save failed'); return }
      const updated = { ...local, [editField]: parsed } as PipelineLead
      setLocal(updated)
      onUpdate(updated)
      setEditField(null)
    } catch { toast.error('Network error') }
    finally { setSaving(false) }
  }

  const saveNote = async () => {
    if (!noteForm.title && !noteForm.body) return
    setSavingNote(true)
    try {
      const res = await fetch('/api/admin/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'post',
          asset: local.asset,
          ref_id: local.id,
          ref_label: local.name,
          title: noteForm.title || local.name,
          body: noteForm.body,
          media_urls: noteMedia.join(','),
        }),
      })
      if (!res.ok) { toast.error('Failed to save note'); return }
      const saved = await res.json()
      setNotes((prev) => [saved, ...prev])
      setNoteForm({ title: '', body: '' })
      setNoteMedia([])
      toast.success('Note saved')
    } catch { toast.error('Network error') }
    finally { setSavingNote(false) }
  }

  const handleMerge = async () => {
    if (!mergeTarget) return
    setMerging(true)
    try {
      // Copy non-empty fields from local to target if target lacks them
      const patches: Record<string, unknown> = {}
      const fields: (keyof PipelineLead)[] = ['email', 'phone', 'firm', 'title', 'linkedin_url', 'website', 'notes', 'investment_rationale', 'target_amount', 'actual_amount']
      for (const f of fields) {
        const lv = local[f]; const tv = mergeTarget[f]
        if ((lv !== undefined && lv !== '' && lv !== 0) && (tv === undefined || tv === '' || tv === 0)) patches[f] = lv
      }
      if (local.notes && mergeTarget.notes && local.notes !== mergeTarget.notes) {
        patches.notes = mergeTarget.notes + '\n\n' + local.notes
      }
      if (Object.keys(patches).length > 0) {
        await fetch('/api/admin/pipeline', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: mergeTarget.id, ...patches }) })
      }
      // Delete this lead
      await fetch(`/api/admin/pipeline?id=${local.id}`, { method: 'DELETE' })
      toast.success(`Merged into ${mergeTarget.name}`)
      onDelete(local)
    } catch { toast.error('Merge failed') }
    finally { setMerging(false) }
  }

  const mergeOptions = mergeSearch.length > 1
    ? allLeads.filter(l => l.id !== local.id && (l.name.toLowerCase().includes(mergeSearch.toLowerCase()) || (l.firm || '').toLowerCase().includes(mergeSearch.toLowerCase()))).slice(0, 8)
    : []

  // Editable field — click the value to edit, blur/Enter to save
  function EF({
    label, field, value, type = 'text', multiline = false, asSelect, options,
  }: {
    label: string; field: string; value: string | number | undefined
    type?: string; multiline?: boolean
    asSelect?: boolean; options?: { value: string; label: string }[]
  }) {
    const isEditing = editField === field
    const display = value !== undefined && value !== '' ? String(value) : undefined
    return (
      <div className="group">
        <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-0.5">{label}</div>
        {isEditing ? (
          asSelect ? (
            <select
              autoFocus
              value={editVal}
              onChange={(e) => setEditVal(e.target.value)}
              onBlur={commitEdit}
              className="w-full border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          ) : multiline ? (
            <textarea
              autoFocus
              rows={3}
              value={editVal}
              onChange={(e) => setEditVal(e.target.value)}
              onBlur={commitEdit}
              className="w-full border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            />
          ) : (
            <input
              autoFocus
              type={type}
              value={editVal}
              onChange={(e) => setEditVal(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={(e) => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditField(null) }}
              className="w-full border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          )
        ) : (
          <div
            onClick={() => startEdit(field, value)}
            className="text-sm px-2 py-1 -mx-2 rounded cursor-pointer hover:bg-muted/50 min-h-[28px] transition-colors"
          >
            {display ?? <span className="text-muted-foreground/40 italic">—</span>}
            {saving && editField === field && <span className="ml-1 text-xs text-muted-foreground">saving…</span>}
          </div>
        )}
      </div>
    )
  }

  const stageOptions = STAGES.map((s) => ({ value: s, label: STAGE_LABELS[s] }))
  const assetOptions = [
    { value: 'livingstonfarm', label: 'Livingston Farm' },
    { value: 'wrenofthewoods', label: 'Wren of the Woods' },
    { value: 'circularplatform', label: 'Circular' },
  ]

  return (
    <>
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col p-0">
          {/* Header */}
          <div className="flex items-center gap-3 px-6 py-4 border-b shrink-0 pr-14">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold truncate">{local.name}</h2>
                {local.firm && <p className="text-sm text-muted-foreground truncate">{local.firm}{local.title ? ` · ${local.title}` : ''}</p>}
              </div>
              <span className={`shrink-0 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STAGE_COLORS[local.stage]}`}>
                {STAGE_LABELS[local.stage]}
              </span>
              {local.priority_tier && (
                <span className="shrink-0 text-xs text-muted-foreground border rounded-full px-2 py-0.5">{local.priority_tier}</span>
              )}
            </div>
            <button
              onClick={() => setConfirmDelete(true)}
              className="shrink-0 text-muted-foreground/50 hover:text-destructive transition-colors text-lg"
              title="Remove lead"
            >
              🗑
            </button>
          </div>

          {/* Body — scrollable */}
          <div className="flex-1 overflow-y-auto">
            <div className="flex flex-col divide-y">

              {/* Lead fields */}
              <div className="p-6 space-y-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Contact Info</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-4">
                  <div className="col-span-2"><EF label="Name" field="name" value={local.name} /></div>
                  <div className="col-span-2"><EF label="Email" field="email" value={local.email} type="email" /></div>
                  <EF label="Phone" field="phone" value={local.phone} />
                  <EF label="LinkedIn" field="linkedin_url" value={local.linkedin_url} type="url" />
                  <div className="col-span-2"><EF label="Firm / Organization" field="firm" value={local.firm} /></div>
                  <EF label="Title / Role" field="title" value={local.title} />
                  <EF label="Website" field="website" value={local.website} type="url" />
                </div>

                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground pt-2">Deal Info</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-4">
                  <EF label="Stage" field="stage" value={local.stage} asSelect options={stageOptions} />
                  <EF label="Asset" field="asset" value={local.asset} asSelect options={assetOptions} />
                  <EF label="Target Amount ($)" field="target_amount" value={local.target_amount} type="number" />
                  <EF label="Actual Amount ($)" field="actual_amount" value={local.actual_amount} type="number" />
                  <EF label="Probability (%)" field="probability" value={local.probability} type="number" />
                  <EF label="Est. Close Date" field="close_date" value={local.close_date} type="date" />
                  <EF
                    label="Type" field="category" value={local.category}
                    asSelect options={[
                      { value: '', label: '—' }, { value: 'institutional', label: 'Institutional' },
                      { value: 'co-gp', label: 'Co-GP' }, { value: 'family-office', label: 'Family Office' },
                      { value: 'individual', label: 'Individual' }, { value: 'new-contact', label: 'New Contact' },
                    ]}
                  />
                  <EF
                    label="Point of Contact" field="point_of_contact" value={local.point_of_contact}
                    asSelect options={[
                      { value: '', label: '—' }, { value: 'stefan', label: 'Stefan' },
                      { value: 'joe', label: 'Joe' }, { value: 'roxanne', label: 'Roxanne' },
                    ]}
                  />
                  <EF
                    label="Priority" field="priority_tier" value={local.priority_tier}
                    asSelect options={[
                      { value: '', label: '—' }, { value: 'High', label: 'High' },
                      { value: 'Medium', label: 'Medium' }, { value: 'Low', label: 'Low' },
                    ]}
                  />
                </div>

                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground pt-2">Notes & Rationale</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                  <EF label="Notes" field="notes" value={local.notes} multiline />
                  <EF label="Investment Rationale" field="investment_rationale" value={local.investment_rationale} multiline />
                </div>
              </div>

              {/* Contact activity + add note — below fields */}
              <div className="p-6 flex flex-col gap-6 sm:flex-row sm:gap-10">
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-3">Contact Activity</p>

                  {/* Static timeline entry: added */}
                  <div className="flex gap-3 pb-3 border-b border-dashed">
                    <div className="w-2 h-2 rounded-full bg-muted-foreground/30 mt-1.5 shrink-0" />
                    <div>
                      <p className="text-xs font-medium">Added to pipeline</p>
                      <p className="text-xs text-muted-foreground">{local.created_at || 'Unknown date'}</p>
                    </div>
                  </div>

                  {/* Contacted indicator */}
                  {local.stage !== 'backlog' && (
                    <div className="flex gap-3 py-3 border-b border-dashed">
                      <div className="w-2 h-2 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                      <div>
                        <p className="text-xs font-medium">In contact — stage: {STAGE_LABELS[local.stage]}</p>
                        {local.email && (
                          <a
                            href={`https://mail.google.com/mail/u/0/#search/${encodeURIComponent(local.email)}`}
                            target="_blank" rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline"
                          >
                            View in Gmail →
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Notes as timeline */}
                  {notesLoading ? (
                    <p className="text-xs text-muted-foreground py-3">Loading…</p>
                  ) : notes.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-3">No activity notes yet.</p>
                  ) : (
                    <div className="space-y-0">
                      {notes.map((n) => (
                        <div key={n.id} className="flex gap-3 py-3 border-b border-dashed last:border-0">
                          <div className="w-2 h-2 rounded-full bg-primary/60 mt-1.5 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs font-medium truncate">{n.title}</p>
                            {n.body && <p className="text-xs text-muted-foreground mt-0.5 whitespace-pre-wrap">{n.body}</p>}
                            <p className="text-[11px] text-muted-foreground/60 mt-1">{n.posted_by} · {n.posted_at?.slice(0, 10)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Merge control */}
                <div className="border rounded-lg p-4 space-y-3 bg-muted/20 sm:w-80 shrink-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Merge Into</p>
                  <div className="relative">
                    <Input
                      placeholder="Search by name or firm…"
                      value={mergeTarget ? mergeTarget.name : mergeSearch}
                      onChange={(e) => { setMergeSearch(e.target.value); setMergeTarget(null) }}
                      className="text-sm"
                    />
                    {mergeOptions.length > 0 && !mergeTarget && (
                      <div className="absolute z-50 mt-1 w-full bg-popover border rounded-md shadow-md overflow-hidden">
                        {mergeOptions.map(l => (
                          <button
                            key={l.id}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 transition-colors"
                            onClick={() => { setMergeTarget(l); setMergeSearch('') }}
                          >
                            <span className="font-medium">{l.name}</span>
                            {l.firm && <span className="text-muted-foreground text-xs ml-1">· {l.firm}</span>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {mergeTarget && (
                    <div className="text-xs text-muted-foreground">
                      Merge <span className="font-medium text-foreground">{local.name}</span> → <span className="font-medium text-foreground">{mergeTarget.name}</span> (fields copied, this record deleted)
                    </div>
                  )}
                  <Button size="sm" variant="destructive" onClick={handleMerge} disabled={!mergeTarget || merging}>
                    {merging ? 'Merging…' : 'Merge & Delete'}
                  </Button>
                </div>

                {/* Add note */}
                <div className="border rounded-lg p-4 space-y-3 bg-muted/20 sm:w-80 shrink-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Add Note</p>
                  <Input
                    placeholder="Title (optional)"
                    value={noteForm.title}
                    onChange={(e) => setNoteForm((f) => ({ ...f, title: e.target.value }))}
                    className="text-sm"
                  />
                  <Textarea
                    placeholder="Note…"
                    rows={3}
                    value={noteForm.body}
                    onChange={(e) => setNoteForm((f) => ({ ...f, body: e.target.value }))}
                    className="text-sm"
                  />
                  <MediaUploader value={noteMedia} onChange={setNoteMedia} acceptAll noUrl />
                  <Button size="sm" onClick={saveNote} disabled={savingNote || (!noteForm.title && !noteForm.body)}>
                    {savingNote ? 'Saving…' : 'Save Note'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Remove Lead</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Remove <span className="font-medium text-foreground">{local.name}</span> from the pipeline? This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => { onDelete(local); setConfirmDelete(false) }}>Remove</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ── Board card ───────────────────────────────────────────────────────────────

function BoardCard({
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

// ── Board column ─────────────────────────────────────────────────────────────

function BoardColumn({
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
          <BoardCard key={lead.id} lead={lead} onEdit={onEdit} onDragStart={onDragStart} />
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

// ── Icons ─────────────────────────────────────────────────────────────────────

function PersonIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <circle cx="8" cy="4.5" r="2.5" />
      <path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6H2z" />
    </svg>
  )
}

function PeopleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 16" fill="currentColor" aria-hidden="true">
      <circle cx="6" cy="4.5" r="2.5" />
      <path d="M1 14c0-2.8 2.2-5 5-5s5 2.2 5 5H1z" />
      <circle cx="14" cy="4.5" r="2.5" />
      <path d="M10 14c0-2.8 2.2-5 5-5h4v5h-9z" />
    </svg>
  )
}

function BuildingIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <rect x="1" y="3" width="14" height="11" rx="1" />
      <rect x="4" y="6" width="2" height="2" fill="white" opacity="0.6" />
      <rect x="7" y="6" width="2" height="2" fill="white" opacity="0.6" />
      <rect x="10" y="6" width="2" height="2" fill="white" opacity="0.6" />
      <rect x="4" y="10" width="2" height="2" fill="white" opacity="0.6" />
      <rect x="7" y="10" width="2" height="2" fill="white" opacity="0.6" />
      <rect x="10" y="10" width="2" height="2" fill="white" opacity="0.6" />
      <path d="M5 14V9h6v5" fill="white" opacity="0.3" />
    </svg>
  )
}

function LeadIcon({ lead }: { lead: PipelineLead }) {
  if (lead.is_company) return <BuildingIcon className="w-3.5 h-3.5 text-blue-400" />
  if (lead.category === 'family-office') return <PeopleIcon className="w-4 h-3.5 text-violet-400" />
  if (lead.category === 'institutional' || lead.category === 'co-gp') return <BuildingIcon className="w-3.5 h-3.5 text-blue-400" />
  return <PersonIcon className="w-3 h-3 text-muted-foreground/50" />
}

function buildMailto(lead: PipelineLead): string {
  if (!lead.email) return ''
  const firstName = lead.name.split(' ')[0]
  const rationale = lead.investment_rationale
  const rationaleText = rationale
    ? `\n\nGiven your background${lead.firm ? ` at ${lead.firm}` : ''} and focus on ${rationale}, I thought Circular would be a natural fit.`
    : ''
  const subject = encodeURIComponent('Introduction to Circular – Regenerative Agritourism Investment Platform')
  const body = encodeURIComponent(
`Hi ${firstName},

I wanted to reach out and introduce you to Circular, a regenerative agritourism investment platform offering institutional-grade returns through carbon-positive hospitality assets.${rationaleText}

We're currently raising for Livingston Farm, our flagship project — a 121-acre regenerative agritourism destination in the Catskills designed for scalable, repeatable deployment.

I'd love to share more — please find our materials below:

Offering Overview: circular.enterprises/offering
Teaser Video: circular.enterprises/video

Would you be open to a brief call to explore fit?`
  )
  return `mailto:${lead.email}?subject=${subject}&body=${body}`
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AdminPipelinePage() {
  const [leads, setLeads] = useState<PipelineLead[]>([])
  const [loading, setLoading] = useState(true)
  // Tier checkboxes: 'active' = non-backlog, 'high/medium/low/none' = backlog by priority_tier
  const [selectedTiers, setSelectedTiers] = useState<Set<string>>(new Set(['active']))
  const [view, setView] = useState<'table' | 'board'>('table')
  const [assetFilter, setAssetFilter] = useState('all')
  const [stageFilter, setStageFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [pocFilter, setPocFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm())
  const [saving, setSaving] = useState(false)
  const [detailLead, setDetailLead] = useState<PipelineLead | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<PipelineLead | null>(null)
  const [collapsedCompanies, setCollapsedCompanies] = useState<Set<string>>(new Set())
  const dragLeadId = useRef<string | null>(null)
  const [columns, setColumns] = useState<ColDef[]>(DEFAULT_COLUMNS)
  const [colMenuOpen, setColMenuOpen] = useState(false)
  const dragColRef = useRef<string | null>(null)

  useEffect(() => { setColumns(initColumns()) }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const tiersParam = [...selectedTiers].join(',') || 'active'
      const res = await fetch(`/api/admin/pipeline?tiers=${tiersParam}`)
      if (!res.ok) throw new Error()
      const data: PipelineLead[] = await res.json()
      setLeads(data)
      // Default-collapse all companies that have children
      const parentIds = new Set(data.filter(l => l.parent_id).map(l => l.parent_id as string))
      setCollapsedCompanies(parentIds)
    } catch {
      toast.error('Failed to load pipeline')
    } finally {
      setLoading(false)
    }
  }, [selectedTiers])

  useEffect(() => { load() }, [load])

  const openCreate = () => {
    setForm(emptyForm())
    setDialogOpen(true)
  }

  const handleCreate = async () => {
    setSaving(true)
    try {
      const today = new Date().toISOString().split('T')[0]
      const docsJson = JSON.stringify(
        form.documents.map((url) => {
          const keyMatch = url.match(/[?&]key=([^&]+)/)
          const rawName = keyMatch
            ? decodeURIComponent(keyMatch[1]).split('/').pop() || 'attachment'
            : url.split('/').pop()?.split('?')[0] || 'attachment'
          return { url, name: rawName.replace(/^\d+-/, ''), uploaded_at: today }
        })
      )
      const res = await fetch('/api/admin/pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, documents: docsJson }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Save failed'); return }
      toast.success('Lead added')
      setDialogOpen(false)
      load()
    } catch { toast.error('Network error') }
    finally { setSaving(false) }
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
      setDetailLead(null)
      setLeads((prev) => prev.filter((l) => l.id !== lead.id))
    } catch { toast.error('Network error') }
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
        prev.map((l) => {
          if (l.id === id) return { ...l, stage, ...(stage === 'closed' ? { probability: 100, actual_amount: l.target_amount } : {}) }
          if (l.parent_id === id) return { ...l, stage }
          return l
        })
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
    .filter((l) => categoryFilter === 'all' || (categoryFilter === 'uncategorized' ? !l.category : l.category === categoryFilter))
    .filter((l) => pocFilter === 'all' || (pocFilter === 'unassigned' ? !l.point_of_contact : l.point_of_contact === pocFilter))
    .filter((l) => {
      if (!search) return true
      const q = search.toLowerCase()
      return (
        l.name.toLowerCase().includes(q) ||
        l.email.toLowerCase().includes(q) ||
        (l.firm || '').toLowerCase().includes(q) ||
        (l.notes || '').toLowerCase().includes(q)
      )
    })

  const baseSorted = [...filtered].sort((a, b) => {
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

  // Build children map
  const childrenByParent = useMemo(() => {
    const map = new Map<string, PipelineLead[]>()
    for (const l of leads) {
      if (l.parent_id) {
        const arr = map.get(l.parent_id) || []
        arr.push(l)
        map.set(l.parent_id, arr)
      }
    }
    return map
  }, [leads])

  // Nest contacts under their parent company rows, respecting collapse state
  const sorted: (PipelineLead & { _depth?: number; _childCount?: number })[] = []
  for (const l of baseSorted) {
    if (!l.parent_id) {
      const children = childrenByParent.get(l.id) || []
      sorted.push({ ...l, _childCount: children.length })
      if (!collapsedCompanies.has(l.id)) {
        // Show children that also pass the current filters
        const filteredChildren = children.filter(c => baseSorted.some(b => b.id === c.id))
        for (const child of filteredChildren) {
          sorted.push({ ...child, _depth: 1 })
        }
      }
    }
  }

  const toggleCollapse = (id: string) => {
    setCollapsedCompanies(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

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
  const weightedProbable = filtered.reduce((s, l) => {
    if (l.stage === 'closed') return s + l.actual_amount
    if (l.stage === 'passed' || l.stage === 'unqualified') return s
    return s + l.target_amount * (l.probability / 100)
  }, 0)

  return (
    <div className="container mx-auto max-w-7xl px-4 py-12">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Investor Pipeline</h1>
        <p className="text-muted-foreground mt-1">Track prospects from first contact to close</p>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
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
            className={`px-4 py-1.5 text-sm border-l transition-colors ${view === 'board' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
            onClick={() => setView('board')}
          >
            Board
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

        {/* Priority / tier filter */}
        <Select
          value={[...selectedTiers][0] || 'active'}
          onValueChange={(v) => setSelectedTiers(new Set([v]))}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Active Pipeline" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active Pipeline</SelectItem>
            <SelectItem value="high">High Priority Backlog</SelectItem>
            <SelectItem value="medium">Medium Priority Backlog</SelectItem>
            <SelectItem value="low">Low Priority Backlog</SelectItem>
            <SelectItem value="none">Untiered Backlog</SelectItem>
          </SelectContent>
        </Select>

        <div className="relative">
          <Button variant="outline" size="sm" onClick={() => setColMenuOpen(o => !o)}>
            Columns ▾
          </Button>
          {colMenuOpen && (
            <div className="absolute right-0 top-full mt-1 z-50 bg-popover border rounded-md shadow-md p-2 min-w-[160px]">
              {columns.map(col => (
                <label key={col.key} className="flex items-center gap-2 px-2 py-1 text-sm cursor-pointer hover:bg-muted/50 rounded">
                  <input
                    type="checkbox"
                    checked={col.visible}
                    onChange={e => {
                      setColumns(prev => {
                        const next = prev.map(c => c.key === col.key ? { ...c, visible: e.target.checked } : c)
                        persistColumns(next)
                        return next
                      })
                    }}
                  />
                  {col.label}
                </label>
              ))}
            </div>
          )}
        </div>

        <span className="text-xs text-muted-foreground">{filtered.length.toLocaleString()} leads</span>

        <Button onClick={openCreate} className="ml-auto">Add Lead</Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : view === 'board' ? (
        /* ── Board ─────────────────────────────────────────────────────── */
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STAGES.map((stage) => (
            <BoardColumn
              key={stage}
              stage={stage}
              leads={filtered.filter((l) => l.stage === stage)}
              onEdit={setDetailLead}
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
                {columns.filter(c => c.visible).map((col) => {
                  const isName = col.key === 'name'
                  const filterEl = col.key === 'stage' ? (
                    <select
                      className="ml-1 text-[10px] border rounded px-0.5 py-0 bg-background cursor-pointer"
                      value={stageFilter}
                      onChange={e => setStageFilter(e.target.value)}
                      onClick={e => e.stopPropagation()}
                      title="Filter by stage"
                    >
                      <option value="all">All</option>
                      {STAGES.map(s => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
                    </select>
                  ) : col.key === 'category' ? (
                    <select
                      className="ml-1 text-[10px] border rounded px-0.5 py-0 bg-background cursor-pointer"
                      value={categoryFilter}
                      onChange={e => setCategoryFilter(e.target.value)}
                      onClick={e => e.stopPropagation()}
                      title="Filter by type"
                    >
                      <option value="all">All</option>
                      <option value="institutional">Institutional</option>
                      <option value="co-gp">Co-GP</option>
                      <option value="family-office">Family Office</option>
                      <option value="individual">Individual</option>
                      <option value="new-contact">New Contact</option>
                      <option value="uncategorized">Uncategorized</option>
                    </select>
                  ) : col.key === 'point_of_contact' ? (
                    <select
                      className="ml-1 text-[10px] border rounded px-0.5 py-0 bg-background cursor-pointer"
                      value={pocFilter}
                      onChange={e => setPocFilter(e.target.value)}
                      onClick={e => e.stopPropagation()}
                      title="Filter by POC"
                    >
                      <option value="all">All</option>
                      <option value="stefan">Stefan</option>
                      <option value="joe">Joe</option>
                      <option value="roxanne">Roxanne</option>
                      <option value="unassigned">Unassigned</option>
                    </select>
                  ) : null
                  return (
                    <th
                      key={col.key}
                      className={`px-4 py-2 text-left font-medium select-none whitespace-nowrap ${isName ? 'sticky left-0 z-10 bg-muted/50' : ''}`}
                      draggable
                      onDragStart={() => { dragColRef.current = col.key }}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => {
                        if (!dragColRef.current || dragColRef.current === col.key) return
                        setColumns(prev => {
                          const next = [...prev]
                          const fromIdx = next.findIndex(c => c.key === dragColRef.current)
                          const toIdx = next.findIndex(c => c.key === col.key)
                          const [moved] = next.splice(fromIdx, 1)
                          next.splice(toIdx, 0, moved)
                          persistColumns(next)
                          return next
                        })
                        dragColRef.current = null
                      }}
                      style={{ cursor: 'grab' }}
                    >
                      <div className="flex items-center">
                        <span
                          className="cursor-pointer hover:text-foreground"
                          onClick={() => handleSort(col.key as SortKey)}
                        >
                          {col.label}<SortIcon k={col.key as SortKey} />
                        </span>
                        {filterEl}
                      </div>
                    </th>
                  )
                })}
                <th className="px-4 py-2 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((lead) => {
                const depth = (lead as PipelineLead & { _depth?: number })._depth || 0
                const childCount = (lead as PipelineLead & { _childCount?: number })._childCount || 0
                const hasChildren = childCount > 0
                const isCollapsed = collapsedCompanies.has(lead.id)
                const mailto = buildMailto(lead)
                return (
                <tr
                  key={lead.id}
                  className={`border-b last:border-0 hover:bg-muted/20 cursor-pointer ${depth ? 'bg-muted/5' : ''}`}
                  onClick={() => setDetailLead(lead)}
                >
                  {columns.filter(c => c.visible).map(col => {
                    const isName = col.key === 'name'
                    if (isName) return (
                      <td key="name" className="px-4 py-2 font-medium whitespace-nowrap sticky left-0 z-10 bg-inherit">
                        <div className="flex items-center gap-1.5" style={{ paddingLeft: depth ? '1.5rem' : undefined }}>
                          {hasChildren && (
                            <button
                              className="text-muted-foreground/50 hover:text-foreground transition-colors w-4 text-center leading-none"
                              onClick={(e) => { e.stopPropagation(); toggleCollapse(lead.id) }}
                              title={isCollapsed ? `Expand ${childCount} contacts` : 'Collapse'}
                            >
                              {isCollapsed ? '▶' : '▼'}
                            </button>
                          )}
                          {!hasChildren && !depth && <span className="w-4" />}
                          <LeadIcon lead={lead} />
                          <span>{lead.name}</span>
                          {hasChildren && isCollapsed && (
                            <span className="text-xs text-muted-foreground/40 font-normal">({childCount})</span>
                          )}
                        </div>
                      </td>
                    )
                    if (col.key === 'firm') return (
                      <td key="firm" className="px-4 py-2 text-muted-foreground max-w-[160px] truncate text-sm">{lead.firm || '—'}</td>
                    )
                    if (col.key === 'category') return (
                      <td key="category" className="px-4 py-2 text-xs text-muted-foreground whitespace-nowrap">
                        {lead.category ? CATEGORY_LABELS[lead.category] || lead.category : '—'}
                      </td>
                    )
                    if (col.key === 'point_of_contact') return (
                      <td key="point_of_contact" className="px-4 py-2 text-xs text-muted-foreground whitespace-nowrap capitalize">{lead.point_of_contact || '—'}</td>
                    )
                    if (col.key === 'email') return (
                      <td key="email" className="px-4 py-2 text-muted-foreground text-xs truncate max-w-[160px]">{lead.email || '—'}</td>
                    )
                    if (col.key === 'stage') return (
                      <td key="stage" className="px-4 py-2">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STAGE_COLORS[lead.stage]}`}>
                          {STAGE_LABELS[lead.stage]}
                        </span>
                      </td>
                    )
                    if (col.key === 'priority_tier') return (
                      <td key="priority_tier" className="px-4 py-2 text-xs text-muted-foreground whitespace-nowrap">{lead.priority_tier || '—'}</td>
                    )
                    if (col.key === 'target_amount') return (
                      <td key="target_amount" className="px-4 py-2 text-right text-sm">{lead.target_amount > 0 ? formatCurrency(lead.target_amount, true) : '—'}</td>
                    )
                    if (col.key === 'close_date') return (
                      <td key="close_date" className="px-4 py-2 text-muted-foreground whitespace-nowrap text-sm">{lead.close_date || '—'}</td>
                    )
                    return null
                  })}
                  <td className="px-4 py-2 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      {mailto && (
                        <a
                          href={mailto}
                          className="text-muted-foreground/40 hover:text-primary transition-colors text-sm px-1"
                          title="Send intro email"
                        >
                          ✉
                        </a>
                      )}
                      <button
                        className="text-muted-foreground/40 hover:text-destructive transition-colors text-base px-1"
                        title="Remove lead"
                        onClick={() => setDeleteTarget(lead)}
                      >
                        🗑
                      </button>
                    </div>
                  </td>
                </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Lead detail modal */}
      {detailLead && (
        <LeadDetailModal
          lead={detailLead}
          allLeads={leads}
          onClose={() => setDetailLead(null)}
          onUpdate={(updated) => {
            setLeads((prev) => prev.map((l) => l.id === updated.id ? updated : l))
            setDetailLead(updated)
          }}
          onDelete={(lead) => handleDelete(lead)}
        />
      )}

      {/* Add Lead dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Lead</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1 col-span-2">
                <Label>Name *</Label>
                <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Investor name" />
              </div>
              <div className="space-y-1">
                <Label>Firm / Organization</Label>
                <Input value={form.firm} onChange={(e) => setForm((f) => ({ ...f, firm: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Title</Label>
                <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Point of Contact</Label>
                <Select value={form.point_of_contact || 'none'} onValueChange={(v) => setForm((f) => ({ ...f, point_of_contact: v === 'none' ? '' : v as PointOfContact }))}>
                  <SelectTrigger><SelectValue placeholder="POC" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    <SelectItem value="stefan">Stefan</SelectItem>
                    <SelectItem value="joe">Joe</SelectItem>
                    <SelectItem value="roxanne">Roxanne</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Type</Label>
                <Select value={form.category || 'none'} onValueChange={(v) => setForm((f) => ({ ...f, category: v === 'none' ? '' : v as InvestorCategory }))}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    <SelectItem value="institutional">Institutional</SelectItem>
                    <SelectItem value="co-gp">Co-GP</SelectItem>
                    <SelectItem value="family-office">Family Office</SelectItem>
                    <SelectItem value="individual">Individual</SelectItem>
                    <SelectItem value="new-contact">New Contact</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Priority</Label>
                <Select value={form.priority_tier || 'none'} onValueChange={(v) => setForm((f) => ({ ...f, priority_tier: v === 'none' ? '' : v }))}>
                  <SelectTrigger><SelectValue placeholder="Priority" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="Low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Phone</Label>
                <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
              </div>
              <div className="space-y-1 col-span-2">
                <Label>LinkedIn URL</Label>
                <Input value={form.linkedin_url} onChange={(e) => setForm((f) => ({ ...f, linkedin_url: e.target.value }))} placeholder="https://linkedin.com/in/..." />
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
              <div className="space-y-1 col-span-2">
                <Label>Investment Rationale</Label>
                <Textarea value={form.investment_rationale} onChange={(e) => setForm((f) => ({ ...f, investment_rationale: e.target.value }))} placeholder="Why this investor fits Circular..." rows={3} />
              </div>
              <div className="space-y-1 col-span-2">
                <Label>Attachments</Label>
                <p className="text-xs text-muted-foreground">PDFs, decks, agreements. Carry over to investor file when deal closes.</p>
                <MediaUploader
                  value={form.documents}
                  onChange={(urls) => setForm((f) => ({ ...f, documents: urls }))}
                  acceptAll
                  noUrl
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving}>{saving ? 'Saving…' : 'Add Lead'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Trash-icon delete confirm (from table row) */}
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
