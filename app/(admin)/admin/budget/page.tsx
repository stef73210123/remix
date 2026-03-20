'use client'

import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
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

type SortField = 'sort_order' | 'budgeted' | 'actual_to_date' | 'projected_final'

interface FormState {
  category: string
  group: string
  budgeted: string
  actual_to_date: string
  projected_final: string
  notes: string
  sort_order: string
}

const emptyForm = (): FormState => ({
  category: '',
  group: '',
  budgeted: '0',
  actual_to_date: '0',
  projected_final: '0',
  notes: '',
  sort_order: '0',
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
  const [asset, setAsset] = useState('livingstonfarm')
  const [lines, setLines] = useState<BudgetLineWithRow[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingRow, setEditingRow] = useState<number | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm())
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<BudgetLineWithRow | null>(null)
  const [sortField, setSortField] = useState<SortField>('sort_order')
  const [showChart, setShowChart] = useState(true)

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

  useEffect(() => { load() }, [load])

  // All groups derived from lines
  const allGroups = useMemo(() => {
    const g = new Set(lines.map((l) => l.group).filter(Boolean) as string[])
    return Array.from(g).sort()
  }, [lines])

  // Sort lines within groups
  const sortedLines = useMemo(() => {
    if (sortField === 'sort_order') return [...lines]
    return [...lines].sort((a, b) => (b[sortField] as number) - (a[sortField] as number))
  }, [lines, sortField])

  // Group the lines
  const grouped = useMemo(() => {
    const groups = new Map<string, BudgetLineWithRow[]>()
    for (const line of sortedLines) {
      const g = line.group || '(Ungrouped)'
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
    setForm(emptyForm())
    setDialogOpen(true)
  }

  const openEdit = (line: BudgetLineWithRow) => {
    setEditingRow(line._rowIndex)
    setForm({
      category: line.category,
      group: line.group || '',
      budgeted: String(line.budgeted),
      actual_to_date: String(line.actual_to_date),
      projected_final: String(line.projected_final),
      notes: line.notes || '',
      sort_order: String(line.sort_order),
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
        asset,
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

  const handleDelete = async (line: BudgetLineWithRow) => {
    try {
      const res = await fetch('/api/admin/budget', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asset, rowIndex: line._rowIndex }),
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

  const totalBudgeted = lines.reduce((s, l) => s + l.budgeted, 0)
  const totalActual = lines.reduce((s, l) => s + l.actual_to_date, 0)
  const totalProjected = lines.reduce((s, l) => s + l.projected_final, 0)

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
          <Button variant="outline" size="sm" onClick={() => setShowChart((v) => !v)}>
            {showChart ? 'Hide Chart' : 'Show Chart'}
          </Button>
          <Button onClick={openCreate}>Add Line</Button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : lines.length === 0 ? (
        <p className="text-sm text-muted-foreground">No budget lines yet.</p>
      ) : (
        <>
          {/* Chart */}
          {showChart && chartData.length > 0 && (
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
          <div className="rounded-md border overflow-hidden">
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
}: {
  groupName: string
  lines: BudgetLineWithRow[]
  subBudgeted: number
  subActual: number
  subProjected: number
  onEdit: (l: BudgetLineWithRow) => void
  onDelete: (l: BudgetLineWithRow) => void
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
        <tr key={line._rowIndex} className="border-b last:border-0 hover:bg-muted/20">
          <td className="px-4 py-2 pl-8">{line.category}</td>
          <td className="px-4 py-2 text-right">{formatCurrency(line.budgeted)}</td>
          <td className="px-4 py-2 text-right">{formatCurrency(line.actual_to_date)}</td>
          <td className="px-4 py-2 text-right">{formatCurrency(line.projected_final)}</td>
          <td className="px-4 py-2 text-muted-foreground max-w-xs truncate">{line.notes || '—'}</td>
          <td className="px-4 py-2 text-right">
            <div className="flex items-center justify-end gap-2">
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
