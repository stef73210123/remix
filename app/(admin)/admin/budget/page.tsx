'use client'

import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { BidLevelingDialog } from '@/components/admin/BidLevelingDialog'
import { CsiCombobox, CATEGORY_TO_CSI } from '@/components/admin/CsiCombobox'
import type { ParsedBid } from '@/app/api/admin/budget/parse-bid/route'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils/format'
import type { BudgetLineWithRow } from '@/lib/sheets/budget'
import { Textarea } from '@/components/ui/textarea'
import { MediaUploader } from '@/components/shared/MediaUploader'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

const ASSETS = [
  { slug: 'circularplatform', name: 'Circular' },
  { slug: 'livingstonfarm', name: 'Livingston Farm' },
  { slug: 'wrenofthewoods', name: 'Wren of the Woods' },
]

const HOLDINGS = [
  { slug: 'livingstonfarm', name: 'Livingston Farm' },
  { slug: 'wrenofthewoods', name: 'Wren of the Woods' },
]

type BudgetLineDisplay = BudgetLineWithRow & { _source?: string }

type SortField = 'sort_order' | 'budgeted' | 'actual_to_date' | 'projected_final'

interface FormState {
  category: string
  group: string
  budgeted: string
  actual_to_date: string
  projected_final: string
  notes: string
  sort_order: string
  csi_code: string
}

const emptyForm = (): FormState => ({
  category: '',
  group: '',
  budgeted: '0',
  actual_to_date: '0',
  projected_final: '0',
  notes: '',
  sort_order: '0',
  csi_code: '',
})

// ─── Group combobox with localStorage persistence ─────────────────────────────

const LS_KEY = 'circular_budget_groups'

function loadSavedGroups(): string[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || '[]')
  } catch {
    return []
  }
}

function saveGroup(name: string) {
  if (!name) return
  const existing = loadSavedGroups()
  if (!existing.includes(name)) {
    localStorage.setItem(LS_KEY, JSON.stringify([...existing, name]))
  }
}

function GroupSelect({
  value,
  onChange,
  groups,
}: {
  value: string
  onChange: (v: string) => void
  groups: string[]
}) {
  const [addingNew, setAddingNew] = useState(false)
  const [newVal, setNewVal] = useState('')
  const [savedGroups, setSavedGroups] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setSavedGroups(loadSavedGroups())
  }, [])

  // Merge sheet-derived groups and locally saved ones, deduplicated
  const allGroups = Array.from(new Set([...groups, ...savedGroups])).sort()

  const handleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (e.target.value === '__new__') {
      setAddingNew(true)
      setNewVal('')
      onChange('')
      setTimeout(() => inputRef.current?.focus(), 0)
    } else {
      setAddingNew(false)
      onChange(e.target.value)
    }
  }

  const confirmNew = (val: string) => {
    if (val) {
      saveGroup(val)
      setSavedGroups(loadSavedGroups())
      onChange(val)
    }
    setAddingNew(false)
  }

  return (
    <div className="space-y-1">
      <select
        className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
        value={addingNew ? '__new__' : value}
        onChange={handleSelect}
      >
        <option value="">No group</option>
        {allGroups.map((g) => (
          <option key={g} value={g}>{g}</option>
        ))}
        <option value="__new__">+ Add new group…</option>
      </select>
      {addingNew && (
        <input
          ref={inputRef}
          placeholder="New group name"
          value={newVal}
          onChange={(e) => setNewVal(e.target.value)}
          onBlur={() => confirmNew(newVal)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); confirmNew(newVal) }
            if (e.key === 'Escape') { setAddingNew(false) }
          }}
          className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        />
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AdminBudgetPage() {
  const [asset, setAsset] = useState('circularplatform')
  const [lines, setLines] = useState<BudgetLineWithRow[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingRow, setEditingRow] = useState<number | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm())
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<BudgetLineWithRow | null>(null)
  const [sortField, setSortField] = useState<SortField>('sort_order')
  const [editingAsset, setEditingAsset] = useState(asset)
  const [noteDialogOpen, setNoteDialogOpen] = useState(false)
  const [noteTarget, setNoteTarget] = useState<{ ref_id: string; ref_label: string } | null>(null)
  const [noteForm, setNoteForm] = useState({ title: '', body: '' })
  const [noteMedia, setNoteMedia] = useState<string[]>([])
  const [savingNote, setSavingNote] = useState(false)

  // Bid leveling state
  const [parsedBids, setParsedBids] = useState<ParsedBid[]>([])
  const [previousBids, setPreviousBids] = useState<ParsedBid[]>([])
  const [bidLevelingOpen, setBidLevelingOpen] = useState(false)
  const [parsingBids, setParsingBids] = useState(false)
  const [parsingPrevBids, setParsingPrevBids] = useState(false)
  const quoteInputRef = useRef<HTMLInputElement>(null)
  const prevQuoteInputRef = useRef<HTMLInputElement>(null)

  // Circular holding roll-up state
  const [includeHoldings, setIncludeHoldings] = useState<Set<string>>(new Set(HOLDINGS.map((h) => h.slug)))
  const [holdingLines, setHoldingLines] = useState<Record<string, BudgetLineWithRow[]>>({})

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/budget?asset=${asset}`)
      if (!res.ok) throw new Error()
      setLines(await res.json())
    } catch {
      toast.error('Failed to load budget')
    } finally {
      setLoading(false)
    }
  }, [asset])

  const loadHoldingLines = useCallback(async (slug: string) => {
    try {
      const res = await fetch(`/api/admin/budget?asset=${slug}`)
      if (!res.ok) throw new Error()
      const data: BudgetLineWithRow[] = await res.json()
      setHoldingLines((prev) => ({ ...prev, [slug]: data }))
    } catch {
      toast.error(`Failed to load ${slug} budget lines`)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Pre-load all holdings on mount so default Circular view has data
  useEffect(() => {
    HOLDINGS.forEach((h) => loadHoldingLines(h.slug))
  }, [loadHoldingLines])

  // Reset holdings when switching away from / back to circularplatform
  useEffect(() => {
    if (asset !== 'circularplatform') {
      setIncludeHoldings(new Set())
      setHoldingLines({})
    } else {
      const defaultHoldings = new Set(HOLDINGS.map((h) => h.slug))
      setIncludeHoldings(defaultHoldings)
      HOLDINGS.forEach((h) => loadHoldingLines(h.slug))
    }
  }, [asset, loadHoldingLines])


  // All groups derived from own lines
  const allGroups = useMemo(() => {
    const g = new Set(lines.map((l) => l.group).filter(Boolean) as string[])
    return Array.from(g).sort()
  }, [lines])

  // Merge own lines + included holding lines (tagged with _source)
  const allDisplayLines = useMemo((): BudgetLineDisplay[] => {
    const own: BudgetLineDisplay[] = lines.map((l) => ({ ...l }))
    const holding: BudgetLineDisplay[] = []
    for (const { slug, name } of HOLDINGS) {
      if (includeHoldings.has(slug) && holdingLines[slug]) {
        for (const l of holdingLines[slug]) {
          holding.push({ ...l, _source: name })
        }
      }
    }
    return [...own, ...holding]
  }, [lines, includeHoldings, holdingLines])

  // Sort lines
  const sortedLines = useMemo(() => {
    if (sortField === 'sort_order') return [...allDisplayLines]
    return [...allDisplayLines].sort((a, b) => (b[sortField] as number) - (a[sortField] as number))
  }, [allDisplayLines, sortField])

  // Group the lines — prefix holding group names with source asset name
  const grouped = useMemo(() => {
    const groups = new Map<string, BudgetLineDisplay[]>()
    for (const line of sortedLines) {
      const rawGroup = line.group || '(Ungrouped)'
      const g = line._source ? `${line._source} · ${rawGroup}` : rawGroup
      if (!groups.has(g)) groups.set(g, [])
      groups.get(g)!.push(line)
    }
    return groups
  }, [sortedLines])

  // Chart data: one entry per group
  const chartData = useMemo(() => {
    return Array.from(grouped.entries()).map(([name, grpLines]) => ({
      name: name === '(Ungrouped)' ? 'Other' : name,
      Budgeted: grpLines.reduce((s, l) => s + l.budgeted, 0),
      Actual: grpLines.reduce((s, l) => s + l.actual_to_date, 0),
      Projected: grpLines.reduce((s, l) => s + l.projected_final, 0),
    }))
  }, [grouped])

  const openCreate = () => {
    setEditingRow(null)
    setEditingAsset(asset)
    setForm(emptyForm())
    setDialogOpen(true)
  }

  // ── Bid parsing ─────────────────────────────────────────────────────────────

  const assetType = asset === 'wrenofthewoods' ? 'restaurant' : asset === 'livingstonfarm' ? 'resort' : 'other'

  const handleQuoteFiles = async (files: FileList) => {
    if (!files.length) return
    setParsingBids(true)
    try {
      const documents: Array<{ fileName: string; content: string; mimeType: string }> = []
      for (const file of Array.from(files)) {
        const isText = file.type.startsWith('text/') || file.name.endsWith('.csv') || file.name.endsWith('.txt')
        if (isText) {
          const text = await file.text()
          documents.push({ fileName: file.name, content: text, mimeType: file.type || 'text/plain' })
        } else {
          // Binary files (PDF, docx, etc.) — send as base64 (chunked to avoid stack overflow)
          const buf = await file.arrayBuffer()
          const bytes = new Uint8Array(buf)
          const chunks: string[] = []
          for (let i = 0; i < bytes.length; i += 8192) {
            chunks.push(String.fromCharCode(...bytes.subarray(i, i + 8192)))
          }
          const b64 = btoa(chunks.join(''))
          documents.push({ fileName: file.name, content: b64, mimeType: file.type || 'application/octet-stream' })
        }
      }
      const res = await fetch('/api/admin/budget/parse-bid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documents }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Parsing failed'); return }
      setParsedBids(data.bids)
      setBidLevelingOpen(true)
    } catch {
      toast.error('Failed to parse documents')
    } finally {
      setParsingBids(false)
      if (quoteInputRef.current) quoteInputRef.current.value = ''
    }
  }

  // Parse previous bid revision for variance comparison
  const parseBidFiles = async (files: FileList): Promise<ParsedBid[]> => {
    const documents: Array<{ fileName: string; content: string; mimeType: string }> = []
    for (const file of Array.from(files)) {
      const isText = file.type.startsWith('text/') || file.name.endsWith('.csv') || file.name.endsWith('.txt')
      if (isText) {
        documents.push({ fileName: file.name, content: await file.text(), mimeType: file.type || 'text/plain' })
      } else {
        const buf = await file.arrayBuffer()
        const bytes = new Uint8Array(buf)
        const chunks: string[] = []
        for (let i = 0; i < bytes.length; i += 8192) chunks.push(String.fromCharCode(...bytes.subarray(i, i + 8192)))
        documents.push({ fileName: file.name, content: btoa(chunks.join('')), mimeType: file.type || 'application/octet-stream' })
      }
    }
    const res = await fetch('/api/admin/budget/parse-bid', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documents }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Parsing failed')
    return data.bids as ParsedBid[]
  }

  const handlePreviousQuoteFiles = async (files: FileList) => {
    if (!files.length) return
    setParsingPrevBids(true)
    try {
      const bids = await parseBidFiles(files)
      setPreviousBids(bids)
      toast.success(`Previous bid loaded: ${bids.map((b) => b.vendor).join(', ')}`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to parse previous bid')
    } finally {
      setParsingPrevBids(false)
      if (prevQuoteInputRef.current) prevQuoteInputRef.current.value = ''
    }
  }

  const handleBidConfirm = async (lines: Array<{ category: string; description: string; budgeted: number }>) => {
    let added = 0
    for (const line of lines) {
      try {
        const res = await fetch('/api/admin/budget', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            asset,
            category: line.description || line.category,
            group: line.category,
            budgeted: line.budgeted,
            actual_to_date: 0,
            projected_final: line.budgeted,
            notes: `Imported from vendor quote`,
            sort_order: 0,
            csi_code: CATEGORY_TO_CSI[line.category] || '',
          }),
        })
        if (res.ok) added++
      } catch { /* continue */ }
    }
    toast.success(`Added ${added} line${added !== 1 ? 's' : ''} to budget`)
    load()
  }

  const openEdit = (line: BudgetLineDisplay) => {
    const sourceSlug = (line as BudgetLineDisplay)._source
      ? HOLDINGS.find((h) => h.name === (line as BudgetLineDisplay)._source)?.slug || asset
      : asset
    setEditingAsset(sourceSlug)
    setEditingRow(line._rowIndex)
    setForm({
      category: line.category,
      group: line.group || '',
      budgeted: String(line.budgeted),
      actual_to_date: String(line.actual_to_date),
      projected_final: String(line.projected_final),
      notes: line.notes || '',
      sort_order: String(line.sort_order),
      csi_code: line.csi_code || '',
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.category) {
      toast.error('Line item name is required')
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
      const res = await fetch('/api/admin/budget', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Save failed'); return }
      toast.success(editingRow ? 'Budget line updated' : 'Budget line added')
      setDialogOpen(false)
      load()
    } catch {
      toast.error('Network error')
    } finally {
      setSaving(false)
    }
  }

  const openNoteDialog = (line: BudgetLineWithRow) => {
    setNoteTarget({ ref_id: String(line._rowIndex), ref_label: line.category })
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
          type: 'budget',
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
    } catch {
      toast.error('Network error')
    } finally {
      setSavingNote(false)
    }
  }

  const handleDelete = async (line: BudgetLineDisplay) => {
    const deleteAsset = line._source
      ? HOLDINGS.find((h) => h.name === line._source)?.slug || asset
      : asset
    try {
      const res = await fetch('/api/admin/budget', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asset: deleteAsset, rowIndex: line._rowIndex }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Delete failed'); return }
      toast.success('Budget line deleted')
      setDeleteTarget(null)
      load()
    } catch {
      toast.error('Network error')
    }
  }

  const totalBudgeted = allDisplayLines.reduce((s, l) => s + l.budgeted, 0)
  const totalActual = allDisplayLines.reduce((s, l) => s + l.actual_to_date, 0)
  const totalProjected = allDisplayLines.reduce((s, l) => s + l.projected_final, 0)

  const formatYAxis = (v: number) =>
    v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M`
    : v >= 1_000 ? `$${(v / 1_000).toFixed(0)}K`
    : `$${v}`

  return (
    <div className="container mx-auto max-w-6xl px-4 py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Budget</h1>
        <p className="text-muted-foreground mt-1">Manage budget lines for each asset</p>
      </div>

      {/* Asset tabs */}
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
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => quoteInputRef.current?.click()}
            disabled={parsingBids}
          >
            {parsingBids ? 'Parsing…' : '📄 Upload Quote'}
          </Button>
          <input
            ref={quoteInputRef}
            type="file"
            accept=".txt,.csv,.pdf,.xlsx,.xls,.doc,.docx"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && handleQuoteFiles(e.target.files)}
          />
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => prevQuoteInputRef.current?.click()}
              disabled={parsingPrevBids}
              className={previousBids.length > 0 ? 'border-purple-400 text-purple-700' : ''}
              title="Load a previous revision of the same bid to see variance"
            >
              {parsingPrevBids ? 'Parsing…' : previousBids.length > 0 ? `↩ Prev: ${previousBids.map(b => b.vendor).join(', ')}` : '↩ Load Previous Bid'}
            </Button>
            {previousBids.length > 0 && (
              <button
                onClick={() => setPreviousBids([])}
                className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-muted-foreground/30 text-[10px] flex items-center justify-center hover:bg-muted-foreground/50"
                title="Clear previous bid"
              >✕</button>
            )}
          </div>
          <input
            ref={prevQuoteInputRef}
            type="file"
            accept=".txt,.csv,.pdf,.xlsx,.xls,.doc,.docx"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && handlePreviousQuoteFiles(e.target.files)}
          />
          <Button onClick={openCreate}>Add Line</Button>
        </div>
      </div>


      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : allDisplayLines.length === 0 ? (
        <p className="text-sm text-muted-foreground">No budget lines yet.</p>
      ) : (
        <>
          {/* Chart */}
          {chartData.length > 0 && (
            <div className="mb-8 rounded-xl border p-4">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">Cost Breakdown by Group</h2>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={chartData} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={formatYAxis} tick={{ fontSize: 11 }} width={60} />
                  <Tooltip
                    formatter={(v: number | undefined) => (v !== undefined ? formatCurrency(v) : '')}
                    contentStyle={{ fontSize: 12 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="Budgeted" fill="#94a3b8" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Actual" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Projected" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Sort control */}
          <div className="flex items-center gap-2 mb-3 text-sm">
            <span className="text-muted-foreground">Sort by:</span>
            {([
              ['sort_order', 'Default'],
              ['budgeted', 'Budgeted'],
              ['actual_to_date', 'Actual'],
              ['projected_final', 'Projected'],
            ] as [SortField, string][]).map(([f, label]) => (
              <button
                key={f}
                onClick={() => setSortField(f)}
                className={`px-2 py-0.5 rounded text-xs border transition-colors ${
                  sortField === f ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:border-primary/50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Grouped table */}
          <div className="rounded-md border overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-2 text-left font-medium">Line Item</th>
                  <th className="px-4 py-2 text-right font-medium">Budgeted</th>
                  <th className="px-4 py-2 text-right font-medium">Actual to Date</th>
                  <th className="px-4 py-2 text-right font-medium">Projected Final</th>
                  <th className="px-4 py-2 text-left font-medium">Notes</th>
                  <th className="px-4 py-2 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {Array.from(grouped.entries()).map(([groupName, grpLines]) => {
                  const subBudgeted = grpLines.reduce((s, l) => s + l.budgeted, 0)
                  const subActual = grpLines.reduce((s, l) => s + l.actual_to_date, 0)
                  const subProjected = grpLines.reduce((s, l) => s + l.projected_final, 0)
                  return (
                    <GroupSection
                      key={groupName}
                      groupName={groupName}
                      lines={grpLines}
                      subBudgeted={subBudgeted}
                      subActual={subActual}
                      subProjected={subProjected}
                      onEdit={openEdit}
                      onDelete={setDeleteTarget}
                      onNote={openNoteDialog}
                    />
                  )
                })}
                {/* Grand total */}
                <tr className="border-t-2 bg-muted/30 font-semibold">
                  <td className="px-4 py-2">Total</td>
                  <td className="px-4 py-2 text-right">{formatCurrency(totalBudgeted)}</td>
                  <td className="px-4 py-2 text-right">{formatCurrency(totalActual)}</td>
                  <td className="px-4 py-2 text-right">{formatCurrency(totalProjected)}</td>
                  <td colSpan={2} />
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Add/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingRow ? 'Edit Budget Line' : 'Add Budget Line'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Group</Label>
              <GroupSelect
                value={form.group}
                onChange={(v) => setForm((f) => ({ ...f, group: v }))}
                groups={allGroups}
              />
            </div>
            <div className="space-y-1">
              <Label>Line Item Name</Label>
              <Input value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} placeholder="e.g. Land Acquisition" />
            </div>
            <div className="space-y-1">
              <Label>Budgeted ($)</Label>
              <Input type="number" value={form.budgeted} onChange={(e) => setForm((f) => ({ ...f, budgeted: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Actual to Date ($)</Label>
              <Input type="number" value={form.actual_to_date} onChange={(e) => setForm((f) => ({ ...f, actual_to_date: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Projected Final ($)</Label>
              <Input type="number" value={form.projected_final} onChange={(e) => setForm((f) => ({ ...f, projected_final: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>CSI MasterFormat Code <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <CsiCombobox
                value={form.csi_code}
                onChange={(code) => setForm((f) => ({ ...f, csi_code: code }))}
              />
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
          <DialogHeader><DialogTitle>Delete Budget Line</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Delete &quot;{deleteTarget?.category}&quot;? This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteTarget && handleDelete(deleteTarget)}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bid Leveling Dialog */}
      <BidLevelingDialog
        open={bidLevelingOpen}
        onClose={() => setBidLevelingOpen(false)}
        bids={parsedBids}
        previousBids={previousBids}
        assetType={assetType as 'restaurant' | 'resort' | 'other'}
        onConfirm={handleBidConfirm}
      />
    </div>
  )
}

// ─── Collapsible group section ────────────────────────────────────────────────

function GroupSection({
  groupName,
  lines,
  subBudgeted,
  subActual,
  subProjected,
  onEdit,
  onDelete,
  onNote,
}: {
  groupName: string
  lines: BudgetLineDisplay[]
  subBudgeted: number
  subActual: number
  subProjected: number
  onEdit: (l: BudgetLineDisplay) => void
  onDelete: (l: BudgetLineDisplay) => void
  onNote: (l: BudgetLineWithRow) => void
}) {
  const [open, setOpen] = useState(true)

  return (
    <>
      {/* Group header row */}
      <tr
        className="border-b bg-muted/60 cursor-pointer select-none hover:bg-muted/80 transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        <td className="px-4 py-2 font-semibold text-xs uppercase tracking-wider text-muted-foreground" colSpan={1}>
          <span className="mr-2">{open ? '▾' : '▸'}</span>
          {groupName}
          <span className="ml-2 font-normal text-muted-foreground/70">({lines.length})</span>
        </td>
        <td className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">{formatCurrency(subBudgeted)}</td>
        <td className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">{formatCurrency(subActual)}</td>
        <td className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">{formatCurrency(subProjected)}</td>
        <td colSpan={2} />
      </tr>

      {/* Line items */}
      {open && lines.map((line) => (
        <tr key={`${line._source || 'own'}-${line._rowIndex}`} className="border-b last:border-0 hover:bg-muted/20">
          <td className="px-4 py-2 pl-8">
            {line.category}
            {line._source && (
              <span className="ml-2 text-xs text-muted-foreground/60">({line._source})</span>
            )}
          </td>
          <td className="px-4 py-2 text-right">{formatCurrency(line.budgeted)}</td>
          <td className="px-4 py-2 text-right">{formatCurrency(line.actual_to_date)}</td>
          <td className="px-4 py-2 text-right">{formatCurrency(line.projected_final)}</td>
          <td className="px-4 py-2 text-muted-foreground max-w-xs truncate">{line.notes || '—'}</td>
          <td className="px-4 py-2 text-right">
            <div className="flex items-center justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => onNote(line)} title="Add note">Note</Button>
              <Button variant="ghost" size="sm" onClick={() => onEdit(line)}>Edit</Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => onDelete(line)}
              >
                Delete
              </Button>
            </div>
          </td>
        </tr>
      ))}
    </>
  )
}
