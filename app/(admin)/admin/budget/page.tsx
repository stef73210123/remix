'use client'

import { useEffect, useState, useCallback } from 'react'
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

const ASSETS = [
  { slug: 'livingstonfarm', name: 'Livingston Farm' },
  { slug: 'wrenofthewoods', name: 'Wren of the Woods' },
  { slug: 'circularplatform', name: 'Circular Platform' },
]

interface FormState {
  category: string
  budgeted: string
  actual_to_date: string
  projected_final: string
  notes: string
  sort_order: string
}

const emptyForm = (): FormState => ({
  category: '',
  budgeted: '0',
  actual_to_date: '0',
  projected_final: '0',
  notes: '',
  sort_order: '0',
})

export default function AdminBudgetPage() {
  const [asset, setAsset] = useState('livingstonfarm')
  const [lines, setLines] = useState<BudgetLineWithRow[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingRow, setEditingRow] = useState<number | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm())
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<BudgetLineWithRow | null>(null)

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

  const openCreate = () => {
    setEditingRow(null)
    setForm(emptyForm())
    setDialogOpen(true)
  }

  const openEdit = (line: BudgetLineWithRow) => {
    setEditingRow(line._rowIndex)
    setForm({
      category: line.category,
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
      toast.error('Category is required')
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

  return (
    <div className="container mx-auto max-w-5xl px-4 py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Budget</h1>
        <p className="text-muted-foreground mt-1">Manage budget lines for each asset</p>
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
        <Button onClick={openCreate}>Add Line</Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : lines.length === 0 ? (
        <p className="text-sm text-muted-foreground">No budget lines yet.</p>
      ) : (
        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-2 text-left font-medium">Order</th>
                <th className="px-4 py-2 text-left font-medium">Category</th>
                <th className="px-4 py-2 text-right font-medium">Budgeted</th>
                <th className="px-4 py-2 text-right font-medium">Actual to Date</th>
                <th className="px-4 py-2 text-right font-medium">Projected Final</th>
                <th className="px-4 py-2 text-left font-medium">Notes</th>
                <th className="px-4 py-2 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => (
                <tr key={line._rowIndex} className="border-b last:border-0">
                  <td className="px-4 py-2 text-muted-foreground">{line.sort_order}</td>
                  <td className="px-4 py-2 font-medium">{line.category}</td>
                  <td className="px-4 py-2 text-right">{formatCurrency(line.budgeted)}</td>
                  <td className="px-4 py-2 text-right">{formatCurrency(line.actual_to_date)}</td>
                  <td className="px-4 py-2 text-right">{formatCurrency(line.projected_final)}</td>
                  <td className="px-4 py-2 text-muted-foreground max-w-xs truncate">{line.notes || '—'}</td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(line)}>Edit</Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget(line)}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              <tr className="border-t bg-muted/30 font-medium">
                <td className="px-4 py-2" colSpan={2}>Totals</td>
                <td className="px-4 py-2 text-right">{formatCurrency(totalBudgeted)}</td>
                <td className="px-4 py-2 text-right">{formatCurrency(totalActual)}</td>
                <td className="px-4 py-2 text-right">{formatCurrency(totalProjected)}</td>
                <td colSpan={2} />
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingRow ? 'Edit Budget Line' : 'Add Budget Line'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Category</Label>
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
            <div className="space-y-1">
              <Label>Sort Order</Label>
              <Input type="number" value={form.sort_order} onChange={(e) => setForm((f) => ({ ...f, sort_order: e.target.value }))} />
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
