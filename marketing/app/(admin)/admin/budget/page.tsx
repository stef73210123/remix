'use client'

import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
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
import { ASSETS } from '@/lib/data/assets'

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

// ─── Bid mapping types ────────────────────────────────────────────────────────

interface BidLineMapping {
  // 'new' means add as new budget line, otherwise the _rowIndex of the existing budget line
  targetRowIndex: 'new' | number
  // which vendor sub-items are checked (for multi-vendor rows, keys are `${bidIndex}-${itemIndex}`)
  selectedKeys: Set<string>
}

// ─── Bid Mapping Screen ───────────────────────────────────────────────────────

function BidMappingScreen({
  bids,
  existingLines,
  onConfirm,
  onCancel,
}: {
  bids: ParsedBid[]
  existingLines: BudgetLineWithRow[]
  onConfirm: (entries: Array<{ targetRowIndex: 'new' | number; category: string; description: string; budgeted: number }>) => void
  onCancel: () => void
}) {
  // Flatten all items across all bids into a unified list, grouped by (category+description)
  // Items with same category+description from different vendors are merged into one row
  type GroupedItem = {
    key: string
    category: string
    description: string
    vendors: Array<{ bidIndex: number; itemIndex: number; vendor: string; amount: number; unit: string | null }>
  }

  const groupedItems = useMemo((): GroupedItem[] => {
    const map = new Map<string, GroupedItem>()
    bids.forEach((bid, bidIndex) => {
      bid.items.forEach((item, itemIndex) => {
        const key = `${item.category}||${item.description.toLowerCase().trim()}`
        if (!map.has(key)) {
          map.set(key, { key, category: item.category, description: item.description, vendors: [] })
        }
        map.get(key)!.vendors.push({ bidIndex, itemIndex, vendor: bid.vendor, amount: item.amount, unit: item.unit })
      })
    })
    return Array.from(map.values())
  }, [bids])

  // Mapping state: key = groupedItem.key → BidLineMapping
  const [mappings, setMappings] = useState<Map<string, BidLineMapping>>(() => {
    const m = new Map<string, BidLineMapping>()
    // Initialize: all vendor items selected, target = 'new'
    bids.forEach((bid, bidIndex) => {
      bid.items.forEach((item, itemIndex) => {
        const key = `${item.category}||${item.description.toLowerCase().trim()}`
        if (!m.has(key)) {
          m.set(key, { targetRowIndex: 'new', selectedKeys: new Set() })
        }
        m.get(key)!.selectedKeys.add(`${bidIndex}-${itemIndex}`)
      })
    })
    return m
  })

  const updateMapping = (key: string, patch: Partial<BidLineMapping>) => {
    setMappings((prev) => {
      const next = new Map(prev)
      const cur = next.get(key) || { targetRowIndex: 'new', selectedKeys: new Set<string>() }
      next.set(key, { ...cur, ...patch })
      return next
    })
  }

  const toggleVendorKey = (groupKey: string, vendorKey: string) => {
    setMappings((prev) => {
      const next = new Map(prev)
      const cur = next.get(groupKey) || { targetRowIndex: 'new', selectedKeys: new Set<string>() }
      const selectedKeys = new Set(cur.selectedKeys)
      if (selectedKeys.has(vendorKey)) {
        selectedKeys.delete(vendorKey)
      } else {
        selectedKeys.add(vendorKey)
      }
      next.set(groupKey, { ...cur, selectedKeys })
      return next
    })
  }

  const getSelectedAmount = (item: GroupedItem): number => {
    const mapping = mappings.get(item.key)
    if (!mapping) return 0
    return item.vendors
      .filter((v) => mapping.selectedKeys.has(`${v.bidIndex}-${v.itemIndex}`))
      .reduce((s, v) => s + v.amount, 0)
  }

  const handleConfirm = () => {
    const entries: Array<{ targetRowIndex: 'new' | number; category: string; description: string; budgeted: number }> = []
    for (const item of groupedItems) {
      const mapping = mappings.get(item.key)
      if (!mapping) continue
      const budgeted = getSelectedAmount(item)
      if (budgeted === 0) continue
      entries.push({
        targetRowIndex: mapping.targetRowIndex,
        category: item.category,
        description: item.description,
        budgeted,
      })
    }
    onConfirm(entries)
  }

  const totalSelected = groupedItems.reduce((s, item) => s + getSelectedAmount(item), 0)

  // Group items by category for display
  const byCategory = useMemo(() => {
    const cats = new Map<string, GroupedItem[]>()
    for (const item of groupedItems) {
      if (!cats.has(item.category)) cats.set(item.category, [])
      cats.get(item.category)!.push(item)
    }
    return cats
  }, [groupedItems])

  const vendorNames = bids.map((b) => b.vendor)

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold">Map Bid Items to Budget Lines</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Check the vendor prices you want to include, then map each line to an existing budget line or add as new.
          </p>
        </div>
        <div className="text-sm font-semibold text-green-700">
          Selected total: {formatCurrency(totalSelected, true)}
        </div>
      </div>

      <div className="overflow-auto flex-1 -mx-6 px-6 space-y-6">
        {Array.from(byCategory.entries()).map(([category, items]) => (
          <div key={category}>
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 pb-1 border-b">
              {category}
            </div>
            <div className="space-y-3">
              {items.map((item) => {
                const mapping = mappings.get(item.key) || { targetRowIndex: 'new' as const, selectedKeys: new Set<string>() }
                const selectedAmt = getSelectedAmount(item)
                return (
                  <div key={item.key} className="rounded-lg border bg-muted/20 p-3 space-y-2">
                    {/* Item header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-snug">{item.description}</p>
                        <p className="text-xs text-muted-foreground">{item.category}</p>
                      </div>
                      {selectedAmt > 0 && (
                        <span className="text-sm font-semibold text-green-700 shrink-0">{formatCurrency(selectedAmt, true)}</span>
                      )}
                    </div>

                    {/* Vendor price rows */}
                    <div className="space-y-1.5">
                      {item.vendors.map((v) => {
                        const vendorKey = `${v.bidIndex}-${v.itemIndex}`
                        const checked = mapping.selectedKeys.has(vendorKey)
                        return (
                          <label
                            key={vendorKey}
                            className="flex items-center gap-2 cursor-pointer group"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleVendorKey(item.key, vendorKey)}
                              className="w-4 h-4 rounded"
                            />
                            <span className={`text-xs flex-1 ${checked ? 'text-foreground' : 'text-muted-foreground'}`}>
                              {v.vendor}
                              {v.unit && <span className="ml-1 text-muted-foreground/60">({v.unit})</span>}
                            </span>
                            <span className={`text-sm font-mono ${checked ? 'font-semibold' : 'text-muted-foreground'}`}>
                              {formatCurrency(v.amount, true)}
                            </span>
                          </label>
                        )
                      })}
                    </div>

                    {/* Map to budget line */}
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-xs text-muted-foreground shrink-0">Map to:</span>
                      <select
                        className="flex-1 h-7 text-xs rounded border border-input bg-background px-2"
                        value={mapping.targetRowIndex === 'new' ? 'new' : String(mapping.targetRowIndex)}
                        onChange={(e) => updateMapping(item.key, {
                          targetRowIndex: e.target.value === 'new' ? 'new' : Number(e.target.value),
                        })}
                      >
                        <option value="new">+ Add as new budget line</option>
                        {existingLines.map((l) => (
                          <option key={l._rowIndex} value={String(l._rowIndex)}>
                            {l.group ? `${l.group} / ` : ''}{l.category} ({formatCurrency(l.budgeted, true)})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="pt-4 border-t flex items-center justify-between mt-4">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={handleConfirm} disabled={totalSelected === 0}>
          Confirm Selections
        </Button>
      </div>
    </div>
  )
}

// ─── Add / Import modal ───────────────────────────────────────────────────────

type ImportMode = 'choose' | 'manual' | 'budget' | 'budget_preview' | 'bid'
type BudgetImportMode = 'replace' | 'add'

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

  // Unified add/import modal state
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [importMode, setImportMode] = useState<ImportMode>('choose')

  // Budget file import state
  const [budgetFiles, setBudgetFiles] = useState<File[]>([])
  const [budgetImportMode, setBudgetImportMode] = useState<BudgetImportMode | null>(null)
  const [importingBudget, setImportingBudget] = useState(false)
  const budgetFileInputRef = useRef<HTMLInputElement>(null)

  // CSV preview state for budget file import
  const [csvPreview, setCsvPreview] = useState<Record<string, string>[] | null>(null)
  const [csvHeaders, setCsvHeaders] = useState<string[]>([])
  const [csvColumnMap, setCsvColumnMap] = useState<{ category: string; group: string; budgeted: string; actual_to_date: string; projected_final: string; notes: string }>({
    category: '', group: '', budgeted: '', actual_to_date: '', projected_final: '', notes: '',
  })

  // Bid parsing state
  const [bidFiles, setBidFiles] = useState<File[]>([])
  const [parsingBids, setParsingBids] = useState(false)
  const [parsedBids, setParsedBids] = useState<ParsedBid[]>([])
  const [bidMappingOpen, setBidMappingOpen] = useState(false)
  const bidFileInputRef = useRef<HTMLInputElement>(null)

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

  // ── Open the unified import modal ────────────────────────────────────────────

  const openImportModal = () => {
    setImportMode('choose')
    setBudgetFiles([])
    setBudgetImportMode(null)
    setBidFiles([])
    setImportModalOpen(true)
  }

  // ── Budget file import ───────────────────────────────────────────────────────

  const handleBudgetFileParse = async () => {
    if (!budgetFiles.length) return
    const file = budgetFiles[0]
    const text = await file.text()
    const Papa = (await import('papaparse')).default
    const result = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h: string) => h.trim(),
    })
    if (result.errors.length > 0 && result.data.length === 0) {
      toast.error('Failed to parse CSV: ' + result.errors[0].message)
      return
    }
    const headers = result.meta.fields || []
    setCsvHeaders(headers)
    setCsvPreview(result.data)
    // Auto-map columns by matching common names
    const lowerHeaders = headers.map((h) => h.toLowerCase())
    const autoMap = { category: '', group: '', budgeted: '', actual_to_date: '', projected_final: '', notes: '' }
    const findHeader = (candidates: string[]) =>
      headers[lowerHeaders.findIndex((h) => candidates.some((c) => h.includes(c)))] || ''
    autoMap.category = findHeader(['category', 'item', 'name', 'description', 'line item', 'line_item'])
    autoMap.group = findHeader(['group', 'division', 'section', 'phase'])
    autoMap.budgeted = findHeader(['budget', 'amount', 'cost', 'estimate', 'total'])
    autoMap.actual_to_date = findHeader(['actual', 'spent', 'paid'])
    autoMap.projected_final = findHeader(['projected', 'forecast', 'final'])
    autoMap.notes = findHeader(['note', 'comment', 'memo', 'remark'])
    setCsvColumnMap(autoMap)
    setImportMode('budget_preview' as ImportMode)
  }

  const handleBudgetFileImport = async () => {
    if (!csvPreview || !csvColumnMap.category) {
      toast.error('Please map at least the Category column')
      return
    }
    setImportingBudget(true)
    try {
      // If replace mode, delete existing lines first (in reverse row order to avoid index shifts)
      if (budgetImportMode === 'replace' && lines.length > 0) {
        const sortedByRow = [...lines].sort((a, b) => b._rowIndex - a._rowIndex)
        for (const line of sortedByRow) {
          await fetch('/api/admin/budget', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ asset, rowIndex: line._rowIndex }),
          })
        }
      }
      let added = 0
      for (const row of csvPreview) {
        const category = row[csvColumnMap.category]?.trim()
        if (!category) continue
        const parseCurrency = (val: string | undefined) => {
          if (!val) return 0
          return parseFloat(val.replace(/[^0-9.\-]/g, '')) || 0
        }
        const budgeted = parseCurrency(row[csvColumnMap.budgeted])
        const actual = parseCurrency(row[csvColumnMap.actual_to_date])
        const projected = csvColumnMap.projected_final ? parseCurrency(row[csvColumnMap.projected_final]) : budgeted
        const res = await fetch('/api/admin/budget', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            asset,
            category,
            group: row[csvColumnMap.group]?.trim() || '',
            budgeted,
            actual_to_date: actual,
            projected_final: projected,
            notes: row[csvColumnMap.notes]?.trim() || '',
            sort_order: added,
            csi_code: '',
          }),
        })
        if (res.ok) added++
      }
      toast.success(`Imported ${added} budget line${added !== 1 ? 's' : ''}`)
      setImportModalOpen(false)
      setCsvPreview(null)
      setCsvHeaders([])
      setBudgetFiles([])
      setBudgetImportMode(null)
      load()
    } catch (e) {
      toast.error('Import failed: ' + (e instanceof Error ? e.message : 'Unknown error'))
    } finally {
      setImportingBudget(false)
    }
  }

  // ── Bid parsing ──────────────────────────────────────────────────────────────

  const assetType = asset === 'wrenofthewoods' ? 'restaurant' : asset === 'livingstonfarm' ? 'resort' : 'other'

  const parseBidFiles = async (files: File[]): Promise<ParsedBid[]> => {
    const fd = new FormData()
    for (const f of files) fd.append('files', f)
    const res = await fetch('/api/admin/budget/parse-bid', { method: 'POST', body: fd })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Parsing failed')
    return data.bids as ParsedBid[]
  }

  const handleBidUploadSubmit = async () => {
    if (!bidFiles.length) { toast.error('Select at least one bid file'); return }
    setParsingBids(true)
    setImportModalOpen(false)
    try {
      const parsed = await parseBidFiles(bidFiles)
      setParsedBids(parsed)
      setBidMappingOpen(true)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to parse documents')
    } finally {
      setParsingBids(false)
      setBidFiles([])
    }
  }

  const handleBidConfirm = async (
    entries: Array<{ targetRowIndex: 'new' | number; category: string; description: string; budgeted: number }>
  ) => {
    setBidMappingOpen(false)
    let added = 0
    let updated = 0
    for (const entry of entries) {
      try {
        if (entry.targetRowIndex === 'new') {
          const res = await fetch('/api/admin/budget', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              asset,
              category: entry.description || entry.category,
              group: entry.category,
              budgeted: entry.budgeted,
              actual_to_date: 0,
              projected_final: entry.budgeted,
              notes: 'Imported from vendor quote',
              sort_order: 0,
              csi_code: CATEGORY_TO_CSI[entry.category] || '',
            }),
          })
          if (res.ok) added++
        } else {
          // Update existing line's budgeted amount
          const existing = lines.find((l) => l._rowIndex === entry.targetRowIndex)
          if (existing) {
            const res = await fetch('/api/admin/budget', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                asset,
                rowIndex: existing._rowIndex,
                category: existing.category,
                group: existing.group || '',
                budgeted: entry.budgeted,
                actual_to_date: existing.actual_to_date,
                projected_final: entry.budgeted,
                notes: existing.notes || '',
                sort_order: existing.sort_order,
                csi_code: existing.csi_code || '',
              }),
            })
            if (res.ok) updated++
          }
        }
      } catch { /* continue */ }
    }
    if (added > 0 || updated > 0) {
      toast.success(`Added ${added} line${added !== 1 ? 's' : ''}${updated > 0 ? `, updated ${updated}` : ''}`)
    }
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
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={openImportModal}
            disabled={parsingBids}
          >
            {parsingBids ? 'Parsing…' : '+ Add / Import'}
          </Button>
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

      {/* ── Unified Add / Import modal ──────────────────────────────────────────── */}
      <Dialog open={importModalOpen} onOpenChange={(o) => { if (!o) setImportModalOpen(false) }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {importMode === 'choose' && 'Add / Import'}
              {importMode === 'manual' && 'Add Budget Line'}
              {importMode === 'budget' && 'Import Budget File'}
              {importMode === 'bid' && 'Import Bid / Quote'}
            </DialogTitle>
          </DialogHeader>

          {/* ── Step 1: choose mode ─────────────────────────────────────────── */}
          {importMode === 'choose' && (
            <div className="space-y-3 py-2">
              <p className="text-sm text-muted-foreground">How would you like to add budget data?</p>
              <div className="grid gap-3">
                <button
                  className="flex flex-col items-start gap-0.5 rounded-lg border p-4 text-left hover:border-primary/60 hover:bg-muted/30 transition-colors"
                  onClick={() => { setImportModalOpen(false); openCreate() }}
                >
                  <span className="font-semibold text-sm">Manual entry</span>
                  <span className="text-xs text-muted-foreground">Add a single budget line with full control over all fields</span>
                </button>
                <button
                  className="flex flex-col items-start gap-0.5 rounded-lg border p-4 text-left hover:border-primary/60 hover:bg-muted/30 transition-colors"
                  onClick={() => setImportMode('budget')}
                >
                  <span className="font-semibold text-sm">Import budget file</span>
                  <span className="text-xs text-muted-foreground">Upload a CSV or spreadsheet to bulk-import budget lines</span>
                </button>
                <button
                  className="flex flex-col items-start gap-0.5 rounded-lg border p-4 text-left hover:border-primary/60 hover:bg-muted/30 transition-colors"
                  onClick={() => setImportMode('bid')}
                >
                  <span className="font-semibold text-sm">Import vendor bid / quote</span>
                  <span className="text-xs text-muted-foreground">Upload PDF or text bid files — AI parses line items and lets you map them to budget lines</span>
                </button>
              </div>
            </div>
          )}

          {/* ── Budget file import ──────────────────────────────────────────── */}
          {importMode === 'budget' && (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label className="font-medium">Budget File</Label>
                <p className="text-xs text-muted-foreground">CSV or spreadsheet with budget line data</p>
                <div
                  className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => budgetFileInputRef.current?.click()}
                >
                  {budgetFiles.length > 0 ? (
                    <div className="space-y-1">
                      {budgetFiles.map((f) => (
                        <div key={f.name} className="text-sm font-medium">{f.name}</div>
                      ))}
                      <button
                        type="button"
                        className="text-xs text-muted-foreground hover:text-foreground mt-1"
                        onClick={(e) => { e.stopPropagation(); setBudgetFiles([]) }}
                      >
                        Clear
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Click to select file</p>
                  )}
                </div>
                <input
                  ref={budgetFileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  multiple
                  className="hidden"
                  onChange={(e) => e.target.files && setBudgetFiles(Array.from(e.target.files))}
                />
              </div>

              {budgetFiles.length > 0 && (
                <div className="space-y-2">
                  <Label className="font-medium">Import mode</Label>
                  <div className="space-y-2">
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="budgetImportMode"
                        checked={budgetImportMode === 'replace'}
                        onChange={() => setBudgetImportMode('replace')}
                        className="mt-0.5"
                      />
                      <div>
                        <p className="text-sm font-medium">Replace all lines</p>
                        <p className="text-xs text-muted-foreground">Clears existing budget lines and imports from file</p>
                      </div>
                    </label>
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="budgetImportMode"
                        checked={budgetImportMode === 'add'}
                        onChange={() => setBudgetImportMode('add')}
                        className="mt-0.5"
                      />
                      <div>
                        <p className="text-sm font-medium">Add new lines only</p>
                        <p className="text-xs text-muted-foreground">Appends imported lines without removing existing ones</p>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={() => setImportMode('choose')}>Back</Button>
                <Button
                  disabled={budgetFiles.length === 0 || !budgetImportMode || importingBudget}
                  onClick={handleBudgetFileParse}
                >
                  {importingBudget ? 'Importing…' : 'Import'}
                </Button>
              </DialogFooter>
            </div>
          )}

          {/* ── Budget CSV preview & column mapping ─────────────────────── */}
          {importMode === 'budget_preview' && csvPreview && (
            <div className="space-y-4 py-2">
              <div className="space-y-3">
                <Label className="font-medium">Map CSV columns to budget fields</Label>
                <p className="text-xs text-muted-foreground">
                  Found {csvPreview.length} row{csvPreview.length !== 1 ? 's' : ''} in the file. Map at least the Category column.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {([
                    ['category', 'Category / Line Item *'],
                    ['group', 'Group / Division'],
                    ['budgeted', 'Budgeted Amount'],
                    ['actual_to_date', 'Actual to Date'],
                    ['projected_final', 'Projected Final'],
                    ['notes', 'Notes'],
                  ] as const).map(([field, label]) => (
                    <div key={field} className="space-y-1">
                      <Label className="text-xs">{label}</Label>
                      <select
                        className="w-full h-8 text-xs rounded border border-input bg-background px-2"
                        value={csvColumnMap[field]}
                        onChange={(e) => setCsvColumnMap((prev) => ({ ...prev, [field]: e.target.value }))}
                      >
                        <option value="">— skip —</option>
                        {csvHeaders.map((h) => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              {/* Preview table */}
              <div className="space-y-2">
                <Label className="font-medium text-xs">Preview (first 5 rows)</Label>
                <div className="overflow-auto max-h-48 rounded border text-xs">
                  <table className="w-full">
                    <thead className="bg-muted/50 sticky top-0">
                      <tr>
                        {csvColumnMap.category && <th className="px-2 py-1 text-left font-medium">Category</th>}
                        {csvColumnMap.group && <th className="px-2 py-1 text-left font-medium">Group</th>}
                        {csvColumnMap.budgeted && <th className="px-2 py-1 text-right font-medium">Budgeted</th>}
                        {csvColumnMap.actual_to_date && <th className="px-2 py-1 text-right font-medium">Actual</th>}
                        {csvColumnMap.projected_final && <th className="px-2 py-1 text-right font-medium">Projected</th>}
                        {csvColumnMap.notes && <th className="px-2 py-1 text-left font-medium">Notes</th>}
                        {!csvColumnMap.category && <th className="px-2 py-1 text-left font-medium text-muted-foreground">Select a Category column</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {csvPreview.slice(0, 5).map((row, i) => (
                        <tr key={i} className="border-t">
                          {csvColumnMap.category && <td className="px-2 py-1">{row[csvColumnMap.category]}</td>}
                          {csvColumnMap.group && <td className="px-2 py-1">{row[csvColumnMap.group]}</td>}
                          {csvColumnMap.budgeted && <td className="px-2 py-1 text-right font-mono">{row[csvColumnMap.budgeted]}</td>}
                          {csvColumnMap.actual_to_date && <td className="px-2 py-1 text-right font-mono">{row[csvColumnMap.actual_to_date]}</td>}
                          {csvColumnMap.projected_final && <td className="px-2 py-1 text-right font-mono">{row[csvColumnMap.projected_final]}</td>}
                          {csvColumnMap.notes && <td className="px-2 py-1 truncate max-w-[120px]">{row[csvColumnMap.notes]}</td>}
                          {!csvColumnMap.category && <td className="px-2 py-1 text-muted-foreground">—</td>}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => { setCsvPreview(null); setImportMode('budget') }}>Back</Button>
                <Button
                  disabled={!csvColumnMap.category || importingBudget}
                  onClick={handleBudgetFileImport}
                >
                  {importingBudget ? 'Importing…' : `Import ${csvPreview.length} line${csvPreview.length !== 1 ? 's' : ''}`}
                </Button>
              </DialogFooter>
            </div>
          )}

          {/* ── Bid file import ─────────────────────────────────────────────── */}
          {importMode === 'bid' && (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label className="font-medium">Bid / Quote File(s)</Label>
                <p className="text-xs text-muted-foreground">PDF, CSV, TXT, or Word — one or more vendor quotes to compare</p>
                <div
                  className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => bidFileInputRef.current?.click()}
                >
                  {bidFiles.length > 0 ? (
                    <div className="space-y-1">
                      {bidFiles.map((f) => (
                        <div key={f.name} className="text-sm font-medium">{f.name}</div>
                      ))}
                      <button
                        type="button"
                        className="text-xs text-muted-foreground hover:text-foreground mt-1"
                        onClick={(e) => { e.stopPropagation(); setBidFiles([]) }}
                      >
                        Clear
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Click to select files</p>
                  )}
                </div>
                <input
                  ref={bidFileInputRef}
                  type="file"
                  accept=".txt,.csv,.pdf,.xlsx,.xls,.doc,.docx"
                  multiple
                  className="hidden"
                  onChange={(e) => e.target.files && setBidFiles(Array.from(e.target.files))}
                />
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setImportMode('choose')}>Back</Button>
                <Button
                  disabled={bidFiles.length === 0 || parsingBids}
                  onClick={handleBidUploadSubmit}
                >
                  {parsingBids ? 'Parsing…' : 'Parse & Map'}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Bid Mapping dialog ──────────────────────────────────────────────────── */}
      <Dialog open={bidMappingOpen} onOpenChange={(o) => { if (!o) setBidMappingOpen(false) }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Map Bid Items</DialogTitle>
          </DialogHeader>
          {parsedBids.length > 0 && (
            <BidMappingScreen
              bids={parsedBids}
              existingLines={lines}
              onConfirm={handleBidConfirm}
              onCancel={() => setBidMappingOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

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
