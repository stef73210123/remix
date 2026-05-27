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
import { formatCurrency, formatDate } from '@/lib/utils/format'
import type { Distribution, DistributionType } from '@/types'

const ASSETS = ['livingstonfarm', 'wrenofthewoods']
const DIST_TYPES: DistributionType[] = ['profit', 'preferred_return', 'return_of_capital']

interface FormState {
  id: string
  investor_id: string
  email: string
  asset: string
  date: string
  amount: string
  type: DistributionType
  notes: string
}

const emptyForm = (): FormState => ({
  id: '',
  investor_id: '',
  email: '',
  asset: 'livingstonfarm',
  date: new Date().toISOString().split('T')[0],
  amount: '0',
  type: 'profit',
  notes: '',
})

export default function AdminDistributionsPage() {
  const [distributions, setDistributions] = useState<Distribution[]>([])
  const [loading, setLoading] = useState(true)
  const [assetFilter, setAssetFilter] = useState('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm())
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Distribution | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/distributions')
      if (!res.ok) throw new Error()
      setDistributions(await res.json())
    } catch {
      toast.error('Failed to load distributions')
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

  const openEdit = (d: Distribution) => {
    setEditingId(d.id)
    setForm({
      id: d.id,
      investor_id: d.investor_id,
      email: d.email,
      asset: d.asset,
      date: d.date,
      amount: String(d.amount),
      type: d.type,
      notes: d.notes || '',
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.investor_id || !form.email || !form.asset || !form.date) {
      toast.error('investor_id, email, asset, and date are required')
      return
    }
    setSaving(true)
    try {
      const method = editingId ? 'PATCH' : 'POST'
      const res = await fetch('/api/admin/distributions', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Save failed'); return }
      toast.success(editingId ? 'Distribution updated' : 'Distribution created')
      setDialogOpen(false)
      load()
    } catch {
      toast.error('Network error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (d: Distribution) => {
    try {
      const res = await fetch('/api/admin/distributions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: d.id }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Delete failed'); return }
      toast.success('Distribution deleted')
      setDeleteTarget(null)
      load()
    } catch {
      toast.error('Network error')
    }
  }

  const filtered = assetFilter === 'all'
    ? distributions
    : distributions.filter((d) => d.asset === assetFilter)

  return (
    <div className="container mx-auto max-w-6xl px-4 py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Distributions</h1>
        <p className="text-muted-foreground mt-1">Record and manage investor distributions</p>
      </div>

      <div className="flex items-center justify-between gap-4 mb-6">
        <Select value={assetFilter} onValueChange={setAssetFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All assets" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All assets</SelectItem>
            {ASSETS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button onClick={openCreate}>Add Distribution</Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">No distributions found.</p>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-2 text-left font-medium">Date</th>
                <th className="px-4 py-2 text-left font-medium">Investor</th>
                <th className="px-4 py-2 text-left font-medium">Asset</th>
                <th className="px-4 py-2 text-left font-medium">Type</th>
                <th className="px-4 py-2 text-right font-medium">Amount</th>
                <th className="px-4 py-2 text-left font-medium">Notes</th>
                <th className="px-4 py-2 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d) => (
                <tr key={d.id} className="border-b last:border-0">
                  <td className="px-4 py-2 text-muted-foreground whitespace-nowrap">{formatDate(d.date)}</td>
                  <td className="px-4 py-2">
                    <div className="font-medium">{d.email}</div>
                    <div className="text-xs text-muted-foreground">{d.investor_id}</div>
                  </td>
                  <td className="px-4 py-2">
                    <Badge variant="outline">{d.asset}</Badge>
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">{d.type}</td>
                  <td className="px-4 py-2 text-right font-medium">{formatCurrency(d.amount)}</td>
                  <td className="px-4 py-2 text-muted-foreground max-w-xs truncate">{d.notes || '—'}</td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(d)}>Edit</Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget(d)}
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
            <DialogTitle>{editingId ? 'Edit Distribution' : 'Add Distribution'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Investor ID</Label>
              <Input value={form.investor_id} onChange={(e) => setForm((f) => ({ ...f, investor_id: e.target.value }))} placeholder="inv_..." />
            </div>
            <div className="space-y-1">
              <Label>Investor Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Asset</Label>
              <Select value={form.asset} onValueChange={(v) => setForm((f) => ({ ...f, asset: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ASSETS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Date</Label>
              <Input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Amount ($)</Label>
              <Input type="number" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v as DistributionType }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DIST_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
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
          <DialogHeader><DialogTitle>Delete Distribution</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Delete {deleteTarget ? formatCurrency(deleteTarget.amount) : ''} distribution for {deleteTarget?.email}? This cannot be undone.
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
