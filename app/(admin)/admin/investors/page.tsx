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
import type { InvestorPosition, Distribution, DistributionType } from '@/types'

const ASSETS = [
  { slug: 'circularplatform', name: 'Circular' },
  { slug: 'livingstonfarm', name: 'Livingston Farm' },
  { slug: 'wrenofthewoods', name: 'Wren of the Woods' },
]

const DIST_TYPES: DistributionType[] = ['profit', 'preferred_return', 'return_of_capital']

// ─── Position form ─────────────────────────────────────────────────────────────

interface PosForm {
  investor_id: string; email: string; name: string; asset: string
  equity_invested: string; ownership_pct: string; capital_account_balance: string
  nav_estimate: string; irr_estimate: string; equity_multiple: string
  distributions_total: string; last_updated: string
}

const emptyPosForm = (): PosForm => ({
  investor_id: '', email: '', name: '', asset: 'livingstonfarm',
  equity_invested: '0', ownership_pct: '0', capital_account_balance: '0',
  nav_estimate: '0', irr_estimate: '0', equity_multiple: '1',
  distributions_total: '0', last_updated: new Date().toISOString().split('T')[0],
})

// ─── Distribution form ─────────────────────────────────────────────────────────

interface DistForm {
  id: string; investor_id: string; email: string; asset: string
  date: string; amount: string; type: DistributionType; notes: string
}

const emptyDistForm = (): DistForm => ({
  id: '', investor_id: '', email: '', asset: 'livingstonfarm',
  date: new Date().toISOString().split('T')[0], amount: '0', type: 'profit', notes: '',
})

// ──────────────────────────────────────────────────────────────────────────────

export default function AdminInvestorsPage() {
  const [search, setSearch] = useState('')

  // Positions
  const [positions, setPositions] = useState<InvestorPosition[]>([])
  const [posLoading, setPosLoading] = useState(true)
  const [posDialogOpen, setPosDialogOpen] = useState(false)
  const [editingPosId, setEditingPosId] = useState<string | null>(null)
  const [posForm, setPosForm] = useState<PosForm>(emptyPosForm())
  const [posSaving, setPosSaving] = useState(false)
  const [posDeleteTarget, setPosDeleteTarget] = useState<InvestorPosition | null>(null)

  // Distributions
  const [distributions, setDistributions] = useState<Distribution[]>([])
  const [distLoading, setDistLoading] = useState(true)
  const [distAssetFilter, setDistAssetFilter] = useState('all')
  const [distDialogOpen, setDistDialogOpen] = useState(false)
  const [editingDistId, setEditingDistId] = useState<string | null>(null)
  const [distForm, setDistForm] = useState<DistForm>(emptyDistForm())
  const [distSaving, setDistSaving] = useState(false)
  const [distDeleteTarget, setDistDeleteTarget] = useState<Distribution | null>(null)

  // ── Loaders ──────────────────────────────────────────────────────────────────

  const loadPositions = useCallback(async () => {
    setPosLoading(true)
    try {
      const res = await fetch('/api/admin/investors')
      if (!res.ok) throw new Error()
      setPositions(await res.json())
    } catch { toast.error('Failed to load investor positions') }
    finally { setPosLoading(false) }
  }, [])

  const loadDistributions = useCallback(async () => {
    setDistLoading(true)
    try {
      const res = await fetch('/api/admin/distributions')
      if (!res.ok) throw new Error()
      setDistributions(await res.json())
    } catch { toast.error('Failed to load distributions') }
    finally { setDistLoading(false) }
  }, [])

  useEffect(() => { loadPositions(); loadDistributions() }, [loadPositions, loadDistributions])

  // ── Position handlers ─────────────────────────────────────────────────────────

  const openCreatePos = () => { setEditingPosId(null); setPosForm(emptyPosForm()); setPosDialogOpen(true) }
  const openEditPos = (pos: InvestorPosition) => {
    setEditingPosId(pos.investor_id)
    setPosForm({
      investor_id: pos.investor_id, email: pos.email, name: pos.name, asset: pos.asset,
      equity_invested: String(pos.equity_invested), ownership_pct: String(pos.ownership_pct),
      capital_account_balance: String(pos.capital_account_balance), nav_estimate: String(pos.nav_estimate),
      irr_estimate: String(pos.irr_estimate), equity_multiple: String(pos.equity_multiple),
      distributions_total: String(pos.distributions_total), last_updated: pos.last_updated,
    })
    setPosDialogOpen(true)
  }

  const handleSavePos = async () => {
    setPosSaving(true)
    try {
      const res = await fetch('/api/admin/investors', {
        method: editingPosId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(posForm),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Save failed'); return }
      toast.success(editingPosId ? 'Position updated' : 'Position created')
      setPosDialogOpen(false); loadPositions()
    } catch { toast.error('Network error') }
    finally { setPosSaving(false) }
  }

  const handleDeletePos = async (pos: InvestorPosition) => {
    try {
      const res = await fetch('/api/admin/investors', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ investor_id: pos.investor_id }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Delete failed'); return }
      toast.success('Position deleted'); setPosDeleteTarget(null); loadPositions()
    } catch { toast.error('Network error') }
  }

  // ── Distribution handlers ─────────────────────────────────────────────────────

  const openCreateDist = () => { setEditingDistId(null); setDistForm(emptyDistForm()); setDistDialogOpen(true) }
  const openEditDist = (d: Distribution) => {
    setEditingDistId(d.id)
    setDistForm({ id: d.id, investor_id: d.investor_id, email: d.email, asset: d.asset, date: d.date, amount: String(d.amount), type: d.type, notes: d.notes || '' })
    setDistDialogOpen(true)
  }

  const handleSaveDist = async () => {
    setDistSaving(true)
    try {
      const res = await fetch('/api/admin/distributions', {
        method: editingDistId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(distForm),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Save failed'); return }
      toast.success(editingDistId ? 'Distribution updated' : 'Distribution created')
      setDistDialogOpen(false); loadDistributions()
    } catch { toast.error('Network error') }
    finally { setDistSaving(false) }
  }

  const handleDeleteDist = async (d: Distribution) => {
    try {
      const res = await fetch('/api/admin/distributions', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: d.id }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Delete failed'); return }
      toast.success('Distribution deleted'); setDistDeleteTarget(null); loadDistributions()
    } catch { toast.error('Network error') }
  }

  // ── Filtered data ─────────────────────────────────────────────────────────────

  const filteredPositions = positions.filter(
    (p) => p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.email.toLowerCase().includes(search.toLowerCase()) ||
      p.asset.toLowerCase().includes(search.toLowerCase())
  )

  const filteredDistributions = distAssetFilter === 'all'
    ? distributions
    : distributions.filter((d) => d.asset === distAssetFilter)

  // ── Position form field helper ────────────────────────────────────────────────

  const posField = (key: keyof PosForm, label: string, type = 'text') => (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Input type={type} value={posForm[key]} onChange={(e) => setPosForm((f) => ({ ...f, [key]: e.target.value }))} />
    </div>
  )

  return (
    <div className="container mx-auto max-w-6xl px-4 py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Investors</h1>
        <p className="text-muted-foreground mt-1">Manage LP and GP positions and distributions</p>
      </div>

      {/* ── Positions ── */}
      <section className="mb-14">
        <div className="flex items-center justify-between gap-4 mb-5">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Positions</h2>
          </div>
          <div className="flex items-center gap-3">
            <Input placeholder="Search by name, email, asset…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
            <Button onClick={openCreatePos}>Add Position</Button>
          </div>
        </div>

        {posLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : filteredPositions.length === 0 ? (
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
                {filteredPositions.map((pos) => (
                  <tr key={pos.investor_id} className="border-b last:border-0">
                    <td className="px-4 py-2 font-medium">{pos.name}</td>
                    <td className="px-4 py-2 text-muted-foreground">{pos.email}</td>
                    <td className="px-4 py-2"><Badge variant="outline">{pos.asset}</Badge></td>
                    <td className="px-4 py-2 text-right">{formatCurrency(pos.equity_invested)}</td>
                    <td className="px-4 py-2 text-right">{formatCurrency(pos.nav_estimate)}</td>
                    <td className="px-4 py-2 text-right">{pos.irr_estimate}%</td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => openEditPos(pos)}>Edit</Button>
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setPosDeleteTarget(pos)}>Delete</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Distributions ── */}
      <section>
        <div className="flex items-center justify-between gap-4 mb-5">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Distributions</h2>
          <div className="flex items-center gap-3">
            <Select value={distAssetFilter} onValueChange={setDistAssetFilter}>
              <SelectTrigger className="w-44"><SelectValue placeholder="All assets" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All assets</SelectItem>
                {ASSETS.map((a) => <SelectItem key={a.slug} value={a.slug}>{a.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={openCreateDist}>Add Distribution</Button>
          </div>
        </div>

        {distLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : filteredDistributions.length === 0 ? (
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
                {filteredDistributions.map((d) => (
                  <tr key={d.id} className="border-b last:border-0">
                    <td className="px-4 py-2 text-muted-foreground whitespace-nowrap">{formatDate(d.date)}</td>
                    <td className="px-4 py-2 font-medium">{d.email}</td>
                    <td className="px-4 py-2"><Badge variant="outline">{d.asset}</Badge></td>
                    <td className="px-4 py-2 text-muted-foreground">{d.type}</td>
                    <td className="px-4 py-2 text-right font-medium">{formatCurrency(d.amount)}</td>
                    <td className="px-4 py-2 text-muted-foreground max-w-xs truncate">{d.notes || '—'}</td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => openEditDist(d)}>Edit</Button>
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDistDeleteTarget(d)}>Delete</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Position dialog */}
      <Dialog open={posDialogOpen} onOpenChange={setPosDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingPosId ? 'Edit Position' : 'Add Position'}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            {posField('email', 'Email', 'email')}
            {posField('name', 'Full Name')}
            <div className="space-y-1">
              <Label>Asset</Label>
              <Select value={posForm.asset} onValueChange={(v) => setPosForm((f) => ({ ...f, asset: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ASSETS.map((a) => <SelectItem key={a.slug} value={a.slug}>{a.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {posField('equity_invested', 'Equity Invested ($)', 'number')}
            {posField('ownership_pct', 'Ownership %', 'number')}
            {posField('capital_account_balance', 'Capital Account Balance ($)', 'number')}
            {posField('nav_estimate', 'NAV Estimate ($)', 'number')}
            {posField('irr_estimate', 'IRR Estimate (%)', 'number')}
            {posField('equity_multiple', 'Equity Multiple', 'number')}
            {posField('distributions_total', 'Total Distributions ($)', 'number')}
            {posField('last_updated', 'Last Updated', 'date')}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPosDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSavePos} disabled={posSaving}>{posSaving ? 'Saving…' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Position delete dialog */}
      <Dialog open={!!posDeleteTarget} onOpenChange={() => setPosDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Delete Position</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground py-2">Delete position for <span className="font-medium text-foreground">{posDeleteTarget?.name}</span> ({posDeleteTarget?.asset})? This cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPosDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => posDeleteTarget && handleDeletePos(posDeleteTarget)}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Distribution dialog */}
      <Dialog open={distDialogOpen} onOpenChange={setDistDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editingDistId ? 'Edit Distribution' : 'Add Distribution'}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1"><Label>Investor Email</Label><Input type="email" value={distForm.email} onChange={(e) => setDistForm((f) => ({ ...f, email: e.target.value }))} /></div>
            <div className="space-y-1">
              <Label>Asset</Label>
              <Select value={distForm.asset} onValueChange={(v) => setDistForm((f) => ({ ...f, asset: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ASSETS.map((a) => <SelectItem key={a.slug} value={a.slug}>{a.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>Date</Label><Input type="date" value={distForm.date} onChange={(e) => setDistForm((f) => ({ ...f, date: e.target.value }))} /></div>
            <div className="space-y-1"><Label>Amount ($)</Label><Input type="number" value={distForm.amount} onChange={(e) => setDistForm((f) => ({ ...f, amount: e.target.value }))} /></div>
            <div className="space-y-1">
              <Label>Type</Label>
              <Select value={distForm.type} onValueChange={(v) => setDistForm((f) => ({ ...f, type: v as DistributionType }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{DIST_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>Notes</Label><Input value={distForm.notes} onChange={(e) => setDistForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Optional" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDistDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveDist} disabled={distSaving}>{distSaving ? 'Saving…' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Distribution delete dialog */}
      <Dialog open={!!distDeleteTarget} onOpenChange={() => setDistDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Delete Distribution</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground py-2">Delete {distDeleteTarget ? formatCurrency(distDeleteTarget.amount) : ''} distribution for {distDeleteTarget?.email}? This cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDistDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => distDeleteTarget && handleDeleteDist(distDeleteTarget)}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
