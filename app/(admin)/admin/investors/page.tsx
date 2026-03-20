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
import type { InvestorPosition } from '@/types'

const ASSETS = ['livingstonfarm', 'wrenofthewoods']

interface FormState {
  investor_id: string
  email: string
  name: string
  asset: string
  equity_invested: string
  ownership_pct: string
  capital_account_balance: string
  nav_estimate: string
  irr_estimate: string
  equity_multiple: string
  distributions_total: string
  last_updated: string
}

const emptyForm = (): FormState => ({
  investor_id: '',
  email: '',
  name: '',
  asset: 'livingstonfarm',
  equity_invested: '0',
  ownership_pct: '0',
  capital_account_balance: '0',
  nav_estimate: '0',
  irr_estimate: '0',
  equity_multiple: '1',
  distributions_total: '0',
  last_updated: new Date().toISOString().split('T')[0],
})

export default function AdminInvestorsPage() {
  const [positions, setPositions] = useState<InvestorPosition[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm())
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<InvestorPosition | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/investors')
      if (!res.ok) throw new Error()
      setPositions(await res.json())
    } catch {
      toast.error('Failed to load investor positions')
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

  const openEdit = (pos: InvestorPosition) => {
    setEditingId(pos.investor_id)
    setForm({
      investor_id: pos.investor_id,
      email: pos.email,
      name: pos.name,
      asset: pos.asset,
      equity_invested: String(pos.equity_invested),
      ownership_pct: String(pos.ownership_pct),
      capital_account_balance: String(pos.capital_account_balance),
      nav_estimate: String(pos.nav_estimate),
      irr_estimate: String(pos.irr_estimate),
      equity_multiple: String(pos.equity_multiple),
      distributions_total: String(pos.distributions_total),
      last_updated: pos.last_updated,
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.email || !form.name || !form.asset) {
      toast.error('Email, name, and asset are required')
      return
    }
    setSaving(true)
    try {
      const method = editingId ? 'PATCH' : 'POST'
      const res = await fetch('/api/admin/investors', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Save failed'); return }
      toast.success(editingId ? 'Position updated' : 'Position created')
      setDialogOpen(false)
      load()
    } catch {
      toast.error('Network error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (pos: InvestorPosition) => {
    try {
      const res = await fetch('/api/admin/investors', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ investor_id: pos.investor_id }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Delete failed'); return }
      toast.success('Position deleted')
      setDeleteTarget(null)
      load()
    } catch {
      toast.error('Network error')
    }
  }

  const field = (key: keyof FormState, label: string, type = 'text') => (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Input
        type={type}
        value={form[key]}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
      />
    </div>
  )

  const filtered = positions.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.email.toLowerCase().includes(search.toLowerCase()) ||
      p.asset.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="container mx-auto max-w-6xl px-4 py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Investor Positions</h1>
        <p className="text-muted-foreground mt-1">Manage LP and GP positions across all assets</p>
      </div>

      <div className="flex items-center justify-between gap-4 mb-6">
        <Input
          placeholder="Search by name, email, or asset…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Button onClick={openCreate}>Add Position</Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">No positions found.</p>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-2 text-left font-medium">Name</th>
                <th className="px-4 py-2 text-left font-medium">Email</th>
                <th className="px-4 py-2 text-left font-medium">Asset</th>
                <th className="px-4 py-2 text-right font-medium">Invested</th>
                <th className="px-4 py-2 text-right font-medium">NAV Est.</th>
                <th className="px-4 py-2 text-right font-medium">IRR %</th>
                <th className="px-4 py-2 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((pos) => (
                <tr key={pos.investor_id} className="border-b last:border-0">
                  <td className="px-4 py-2 font-medium">{pos.name}</td>
                  <td className="px-4 py-2 text-muted-foreground">{pos.email}</td>
                  <td className="px-4 py-2">
                    <Badge variant="outline">{pos.asset}</Badge>
                  </td>
                  <td className="px-4 py-2 text-right">{formatCurrency(pos.equity_invested)}</td>
                  <td className="px-4 py-2 text-right">{formatCurrency(pos.nav_estimate)}</td>
                  <td className="px-4 py-2 text-right">{pos.irr_estimate}%</td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(pos)}>Edit</Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget(pos)}
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
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Position' : 'Add Position'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {!editingId && field('investor_id', 'Investor ID (leave blank to auto-generate)')}
            {field('email', 'Email', 'email')}
            {field('name', 'Full Name')}
            <div className="space-y-1">
              <Label>Asset</Label>
              <Select value={form.asset} onValueChange={(v) => setForm((f) => ({ ...f, asset: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ASSETS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {field('equity_invested', 'Equity Invested ($)', 'number')}
            {field('ownership_pct', 'Ownership %', 'number')}
            {field('capital_account_balance', 'Capital Account Balance ($)', 'number')}
            {field('nav_estimate', 'NAV Estimate ($)', 'number')}
            {field('irr_estimate', 'IRR Estimate (%)', 'number')}
            {field('equity_multiple', 'Equity Multiple', 'number')}
            {field('distributions_total', 'Total Distributions ($)', 'number')}
            {field('last_updated', 'Last Updated', 'date')}
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
          <DialogHeader><DialogTitle>Delete Position</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Delete position for <span className="font-medium text-foreground">{deleteTarget?.name}</span> ({deleteTarget?.asset})? This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteTarget && handleDelete(deleteTarget)}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
