'use client'

import { useState, useMemo, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { formatCurrency } from '@/lib/utils/format'
import type { ParsedBid } from '@/app/api/admin/budget/parse-bid/route'

// Market benchmarks: [low, high] per SF for restaurant, per key for hotel/resort
const BENCHMARKS: Record<string, { restaurant?: [number, number]; resort?: [number, number] }> = {
  'Site Work':             { restaurant: [8, 25],     resort: [5000, 15000] },
  'Foundation & Structure':{ restaurant: [30, 75],    resort: [20000, 50000] },
  'Exterior':              { restaurant: [20, 60],    resort: [15000, 40000] },
  'Interior Finishes':     { restaurant: [45, 120],   resort: [12000, 35000] },
  'MEP':                   { restaurant: [40, 90],    resort: [18000, 45000] },
  'FF&E':                  { restaurant: [20, 65],    resort: [8000, 25000] },
  'Kitchen Equipment':     { restaurant: [30, 85],    resort: [2000, 8000] },
  'Technology & AV':       { restaurant: [8, 25],     resort: [2000, 8000] },
  'Permits & Fees':        { restaurant: [5, 20],     resort: [2000, 8000] },
  'Soft Costs':            { restaurant: [15, 45],    resort: [8000, 20000] },
  'Contingency':           { restaurant: [10, 30],    resort: [5000, 15000] },
  'General Conditions':    { restaurant: [15, 40],    resort: [8000, 20000] },
}

const RESTAURANT_SF = 3500
const RESORT_KEYS = 70

const ALL_CATEGORIES = [
  'Site Work', 'Foundation & Structure', 'Exterior', 'Interior Finishes',
  'MEP', 'FF&E', 'Kitchen Equipment', 'Technology & AV',
  'General Conditions', 'Permits & Fees', 'Soft Costs', 'Contingency', 'Other',
]

type AssetType = 'restaurant' | 'resort' | 'other'

interface CategoryRow {
  category: string
  bids: (number | null)[]
  prevBids: (number | null)[]
}

export interface Props {
  open: boolean
  onClose: () => void
  bids: ParsedBid[]
  previousBids?: ParsedBid[]   // same contractor, earlier revision
  assetType: AssetType
  onConfirm: (lines: Array<{ category: string; description: string; budgeted: number }>) => void
}

function unitLabel(assetType: AssetType) {
  if (assetType === 'restaurant') return `/ SF (${RESTAURANT_SF.toLocaleString()} SF)`
  if (assetType === 'resort') return `/ key (${RESORT_KEYS} keys)`
  return ''
}

function perUnit(amount: number, assetType: AssetType): number {
  if (assetType === 'restaurant') return amount / RESTAURANT_SF
  if (assetType === 'resort') return amount / RESORT_KEYS
  return 0
}

function benchmarkRange(category: string, assetType: AssetType): string {
  const b = BENCHMARKS[category]
  if (!b) return '—'
  const range = assetType === 'restaurant' ? b.restaurant : assetType === 'resort' ? b.resort : undefined
  if (!range) return '—'
  return `$${range[0].toLocaleString()} – $${range[1].toLocaleString()}`
}

function benchmarkStatus(amount: number, category: string, assetType: AssetType): 'low' | 'ok' | 'high' | 'none' {
  const b = BENCHMARKS[category]
  if (!b) return 'none'
  const range = assetType === 'restaurant' ? b.restaurant : assetType === 'resort' ? b.resort : undefined
  if (!range) return 'none'
  const pu = perUnit(amount, assetType)
  if (pu < range[0] * 0.8) return 'low'
  if (pu > range[1] * 1.2) return 'high'
  return 'ok'
}

// ── Mini bar chart shown on variance hover ────────────────────────────────────
function VarianceMiniChart({ prev, curr, label }: { prev: number; curr: number; label: string }) {
  const max = Math.max(prev, curr, 1)
  const prevPct = (prev / max) * 100
  const currPct = (curr / max) * 100
  const delta = curr - prev
  const deltaPct = prev > 0 ? ((delta / prev) * 100).toFixed(1) : '—'
  const isUp = delta > 0

  return (
    <div className="bg-popover border rounded-lg shadow-lg p-3 min-w-[180px] text-xs space-y-2 pointer-events-none">
      <p className="font-semibold text-foreground">{label}</p>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="w-12 text-muted-foreground shrink-0">Previous</span>
          <div className="flex-1 bg-muted rounded-sm overflow-hidden h-4">
            <div
              className="h-full bg-blue-400 rounded-sm transition-all"
              style={{ width: `${prevPct}%` }}
            />
          </div>
          <span className="w-16 text-right font-mono">{formatCurrency(prev, true)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-12 text-muted-foreground shrink-0">Current</span>
          <div className="flex-1 bg-muted rounded-sm overflow-hidden h-4">
            <div
              className={`h-full rounded-sm transition-all ${isUp ? 'bg-red-400' : 'bg-green-400'}`}
              style={{ width: `${currPct}%` }}
            />
          </div>
          <span className="w-16 text-right font-mono">{formatCurrency(curr, true)}</span>
        </div>
      </div>
      <div className={`font-semibold ${isUp ? 'text-red-600' : 'text-green-600'}`}>
        {isUp ? '▲' : '▼'} {isUp ? '+' : ''}{formatCurrency(delta, true)} ({deltaPct}%)
      </div>
    </div>
  )
}

// ── Variance indicator cell ───────────────────────────────────────────────────
function VarianceCell({ prev, curr, category }: { prev: number | null; curr: number | null; category: string }) {
  const [hovered, setHovered] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  if (prev === null || curr === null || prev === 0) {
    return <td className="px-2 py-2 text-center text-muted-foreground/30 text-xs">—</td>
  }

  const delta = curr - prev
  const pct = ((delta / prev) * 100).toFixed(1)
  const isUp = delta > 0

  return (
    <td className="px-2 py-2 text-center relative">
      <div
        ref={ref}
        className="inline-flex items-center gap-0.5 cursor-default"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <span className={`text-xs font-semibold ${isUp ? 'text-red-600' : 'text-green-600'}`}>
          {isUp ? '▲' : '▼'} {isUp ? '+' : ''}{pct}%
        </span>
      </div>
      {hovered && (
        <div className="absolute z-50 left-1/2 -translate-x-1/2 bottom-full mb-1">
          <VarianceMiniChart prev={prev} curr={curr} label={category} />
        </div>
      )}
    </td>
  )
}

// ── Main dialog ───────────────────────────────────────────────────────────────
export function BidLevelingDialog({ open, onClose, bids, previousBids = [], assetType, onConfirm }: Props) {
  const [selections, setSelections] = useState<Record<string, number | 'avg'>>({})
  const hasPrevious = previousBids.length > 0

  // Build previous bid totals per category (keyed by vendor name match or index)
  const prevTotalByVendorAndCat = useMemo(() => {
    const map: Record<string, Record<string, number>> = {}
    previousBids.forEach((bid) => {
      const key = bid.vendor.toLowerCase().trim()
      map[key] = {}
      const cats: Record<string, number> = {}
      bid.items.forEach((item) => {
        cats[item.category] = (cats[item.category] || 0) + item.amount
      })
      map[key] = cats
    })
    return map
  }, [previousBids])

  // Merge all vendor keys from current + previous bids
  const allVendorKeys = useMemo(() => {
    const keys = new Set<string>()
    bids.forEach((b) => keys.add(b.vendor.toLowerCase().trim()))
    previousBids.forEach((b) => keys.add(b.vendor.toLowerCase().trim()))
    return Array.from(keys)
  }, [bids, previousBids])

  const categoryRows = useMemo((): CategoryRow[] => {
    const cats = new Set<string>()
    bids.forEach((bid) => bid.items.forEach((item) => cats.add(item.category)))
    if (hasPrevious) previousBids.forEach((bid) => bid.items.forEach((item) => cats.add(item.category)))

    return ALL_CATEGORIES
      .filter((c) => cats.has(c))
      .concat(Array.from(cats).filter((c) => !ALL_CATEGORIES.includes(c)))
      .map((cat) => ({
        category: cat,
        bids: bids.map((bid) => {
          const total = bid.items.filter((i) => i.category === cat).reduce((s, i) => s + i.amount, 0)
          return total || null
        }),
        prevBids: bids.map((bid) => {
          const vendorKey = bid.vendor.toLowerCase().trim()
          const prev = prevTotalByVendorAndCat[vendorKey]
          if (!prev) return null
          return prev[cat] || null
        }),
      }))
  }, [bids, previousBids, hasPrevious, prevTotalByVendorAndCat])

  const getSelection = (cat: string): number | 'avg' => selections[cat] ?? 0
  const setSelection = (cat: string, val: number | 'avg') =>
    setSelections((prev) => ({ ...prev, [cat]: val }))

  const getSelectedAmount = (row: CategoryRow): number => {
    const sel = getSelection(row.category)
    if (sel === 'avg') {
      const vals = row.bids.filter((v) => v !== null) as number[]
      return vals.length > 0 ? vals.reduce((s, v) => s + v, 0) / vals.length : 0
    }
    return row.bids[sel] ?? 0
  }

  // Grand total variance (all current selected vs all previous)
  const grandTotal = categoryRows.reduce((s, row) => s + getSelectedAmount(row), 0)
  const prevGrandTotal = useMemo(() => {
    if (!hasPrevious) return 0
    return categoryRows.reduce((s, row) => {
      const vals = row.prevBids.filter((v) => v !== null) as number[]
      return s + (vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0)
    }, 0)
  }, [categoryRows, hasPrevious])

  const buildLines = () =>
    categoryRows.map((row) => {
      const sel = getSelection(row.category)
      let description = ''
      if (sel === 'avg') {
        description = `Average of ${bids.map((b) => b.vendor).join(', ')}`
      } else {
        const bid = bids[sel]
        const items = bid.items.filter((i) => i.category === row.category)
        description = items.map((i) => i.description).filter(Boolean).join('; ') || bid.vendor
      }
      return { category: row.category, description, budgeted: Math.round(getSelectedAmount(row)) }
    }).filter((l) => l.budgeted > 0)

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Bid Leveling Analysis</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {bids.length === 1
              ? `Reviewing: ${bids[0].vendor}`
              : `Comparing ${bids.length} bids. Select which bid (or average) to use for each category.`}
            {hasPrevious && (
              <span className="ml-2 text-blue-700 font-medium">
                · Variance vs previous revision shown
              </span>
            )}
          </p>
        </DialogHeader>

        <div className="overflow-auto flex-1 -mx-6 px-6">
          {/* Bid header summary */}
          <div className="flex gap-3 mb-4 flex-wrap">
            {bids.map((bid, i) => {
              const prevKey = bid.vendor.toLowerCase().trim()
              const prevCats = prevTotalByVendorAndCat[prevKey]
              const prevTotal = prevCats ? Object.values(prevCats).reduce((s, v) => s + v, 0) : 0
              const bidTotal = bid.total || categoryRows.reduce((s, r) => s + (r.bids[i] || 0), 0)
              const delta = hasPrevious && prevTotal > 0 ? bidTotal - prevTotal : null
              const deltaPct = delta !== null && prevTotal > 0 ? ((delta / prevTotal) * 100).toFixed(1) : null

              return (
                <div key={i} className="flex-1 min-w-[160px] rounded-lg border bg-muted/30 p-3">
                  <div className="font-semibold text-sm truncate">{bid.vendor}</div>
                  <div className="text-xs text-muted-foreground truncate">{bid.fileName}</div>
                  <div className="text-lg font-bold mt-1">{formatCurrency(bidTotal, true)}</div>
                  {delta !== null && deltaPct !== null && (
                    <div className={`text-xs font-medium mt-0.5 ${delta > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {delta > 0 ? '▲' : '▼'} {delta > 0 ? '+' : ''}{formatCurrency(delta, true)} ({deltaPct}%) vs previous
                    </div>
                  )}
                  {hasPrevious && prevTotal > 0 && (
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Prev: {formatCurrency(prevTotal, true)}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Category comparison table */}
          <div className="rounded-md border overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-3 py-2 text-left font-medium w-40">Category</th>
                  {bids.map((bid, i) => (
                    <th key={i} className="px-3 py-2 text-right font-medium whitespace-nowrap">
                      {bid.vendor}
                    </th>
                  ))}
                  {bids.length > 1 && (
                    <th className="px-3 py-2 text-right font-medium text-blue-700 whitespace-nowrap">Avg</th>
                  )}
                  {hasPrevious && (
                    <th className="px-2 py-2 text-center font-medium text-purple-700 whitespace-nowrap text-xs">
                      Δ vs Prev
                    </th>
                  )}
                  <th className="px-3 py-2 text-right font-medium text-green-700 whitespace-nowrap">Selected</th>
                  {assetType !== 'other' && (
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground whitespace-nowrap">
                      {assetType === 'restaurant' ? '/ SF' : '/ Key'}
                    </th>
                  )}
                  {assetType !== 'other' && (
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground whitespace-nowrap">Benchmark</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {categoryRows.map((row) => {
                  const avg = (() => {
                    const vals = row.bids.filter((v) => v !== null) as number[]
                    return vals.length > 0 ? vals.reduce((s, v) => s + v, 0) / vals.length : 0
                  })()
                  const selectedAmt = getSelectedAmount(row)
                  const sel = getSelection(row.category)
                  const status = assetType !== 'other' ? benchmarkStatus(selectedAmt, row.category, assetType) : 'none'
                  // For variance: use selected bid's previous
                  const prevForSelected = sel === 'avg'
                    ? (() => {
                        const vals = row.prevBids.filter((v) => v !== null) as number[]
                        return vals.length > 0 ? vals.reduce((s, v) => s + v, 0) / vals.length : null
                      })()
                    : row.prevBids[sel as number] ?? null

                  return (
                    <tr key={row.category} className="border-b last:border-0 hover:bg-muted/10">
                      <td className="px-3 py-2 font-medium text-xs">{row.category}</td>
                      {row.bids.map((amount, i) => (
                        <td key={i} className="px-3 py-2 text-right">
                          {amount !== null ? (
                            <label className="flex items-center justify-end gap-2 cursor-pointer group">
                              <span className={`text-sm ${sel === i ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                                {formatCurrency(amount, true)}
                              </span>
                              <input
                                type="radio"
                                name={`sel-${row.category}`}
                                checked={sel === i}
                                onChange={() => setSelection(row.category, i)}
                                className="w-3.5 h-3.5"
                              />
                            </label>
                          ) : (
                            <span className="text-muted-foreground/40">—</span>
                          )}
                        </td>
                      ))}
                      {bids.length > 1 && (
                        <td className="px-3 py-2 text-right">
                          <label className="flex items-center justify-end gap-2 cursor-pointer">
                            <span className={`text-sm ${sel === 'avg' ? 'font-semibold text-blue-700' : 'text-muted-foreground'}`}>
                              {formatCurrency(avg, true)}
                            </span>
                            <input
                              type="radio"
                              name={`sel-${row.category}`}
                              checked={sel === 'avg'}
                              onChange={() => setSelection(row.category, 'avg')}
                              className="w-3.5 h-3.5"
                            />
                          </label>
                        </td>
                      )}
                      {hasPrevious && (
                        <VarianceCell
                          prev={prevForSelected}
                          curr={selectedAmt || null}
                          category={row.category}
                        />
                      )}
                      <td className="px-3 py-2 text-right">
                        <span className={`text-sm font-semibold ${status === 'high' ? 'text-red-600' : status === 'low' ? 'text-yellow-600' : 'text-green-700'}`}>
                          {formatCurrency(selectedAmt, true)}
                        </span>
                      </td>
                      {assetType !== 'other' && (
                        <td className="px-3 py-2 text-right text-xs text-muted-foreground">
                          ${perUnit(selectedAmt, assetType).toFixed(0)}
                        </td>
                      )}
                      {assetType !== 'other' && (
                        <td className="px-3 py-2 text-right text-xs">
                          <span className={`${status === 'high' ? 'text-red-500' : status === 'low' ? 'text-yellow-600' : 'text-muted-foreground'}`}>
                            {benchmarkRange(row.category, assetType)}
                            {status === 'high' && ' ▲'}
                            {status === 'low' && ' ▼'}
                          </span>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="bg-muted/30 font-semibold">
                  <td className="px-3 py-2">Total</td>
                  {bids.map((bid, i) => (
                    <td key={i} className="px-3 py-2 text-right text-sm">
                      {formatCurrency(bid.total || categoryRows.reduce((s, r) => s + (r.bids[i] || 0), 0), true)}
                    </td>
                  ))}
                  {bids.length > 1 && <td className="px-3 py-2 text-right text-sm text-blue-700">—</td>}
                  {hasPrevious && (
                    <td className="px-2 py-2 text-center">
                      {prevGrandTotal > 0 && grandTotal > 0 ? (
                        <span className={`text-xs font-bold ${grandTotal > prevGrandTotal ? 'text-red-600' : 'text-green-600'}`}>
                          {grandTotal > prevGrandTotal ? '▲' : '▼'}{' '}
                          {Math.abs(((grandTotal - prevGrandTotal) / prevGrandTotal) * 100).toFixed(1)}%
                        </span>
                      ) : '—'}
                    </td>
                  )}
                  <td className="px-3 py-2 text-right text-sm text-green-700">{formatCurrency(grandTotal, true)}</td>
                  {assetType !== 'other' && (
                    <td className="px-3 py-2 text-right text-xs text-muted-foreground">
                      ${perUnit(grandTotal, assetType).toFixed(0)}
                    </td>
                  )}
                  {assetType !== 'other' && (
                    <td className="px-3 py-2 text-right text-xs text-muted-foreground">
                      {unitLabel(assetType)}
                    </td>
                  )}
                </tr>
              </tfoot>
            </table>
          </div>

          {/* AI Commentary */}
          {bids.length > 1 && (
            <div className="mt-4 rounded-lg border bg-blue-50/50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-800 mb-2">Analysis</p>
              <div className="text-sm text-blue-900 space-y-1">
                {(() => {
                  const totals = bids.map((_, i) => categoryRows.reduce((s, r) => s + (r.bids[i] || 0), 0))
                  const min = Math.min(...totals)
                  const max = Math.max(...totals)
                  const spread = max - min
                  const spreadPct = min > 0 ? ((spread / min) * 100).toFixed(1) : '0'
                  const lowestIdx = totals.indexOf(min)
                  const highestIdx = totals.indexOf(max)
                  const highCats = categoryRows.filter((r) => {
                    const vals = r.bids.filter((v) => v !== null) as number[]
                    if (vals.length < 2) return false
                    const catMin = Math.min(...vals)
                    const catMax = Math.max(...vals)
                    return catMin > 0 && (catMax - catMin) / catMin > 0.25
                  })
                  return (
                    <>
                      <p>• Lowest bid: <strong>{bids[lowestIdx]?.vendor}</strong> at {formatCurrency(min, true)} — highest: <strong>{bids[highestIdx]?.vendor}</strong> at {formatCurrency(max, true)} ({spreadPct}% spread)</p>
                      {highCats.length > 0 && (
                        <p>• Significant variance in: {highCats.map((c) => c.category).join(', ')} — verify scope alignment before selecting.</p>
                      )}
                      {parseFloat(spreadPct) > 20 && (
                        <p>• Spread exceeds 20% — recommend requesting scope clarification from higher bidder before selection.</p>
                      )}
                      <p>• Selected budget total: <strong>{formatCurrency(grandTotal, true)}</strong>
                        {assetType !== 'other' && ` (${formatCurrency(perUnit(grandTotal, assetType), false)}${assetType === 'restaurant' ? '/SF' : '/key'})`}
                      </p>
                    </>
                  )
                })()}
              </div>
            </div>
          )}

          {/* Revision variance summary */}
          {hasPrevious && prevGrandTotal > 0 && (
            <div className="mt-4 rounded-lg border bg-purple-50/50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-purple-800 mb-2">Revision Variance Summary</p>
              <div className="text-sm text-purple-900 space-y-1">
                {(() => {
                  const delta = grandTotal - prevGrandTotal
                  const pct = ((delta / prevGrandTotal) * 100).toFixed(1)
                  const movedUp = categoryRows
                    .filter((r) => {
                      const curr = getSelectedAmount(r)
                      const sel = getSelection(r.category)
                      const prev = sel === 'avg'
                        ? (() => { const v = r.prevBids.filter((x) => x !== null) as number[]; return v.length > 0 ? v.reduce((a, b) => a + b, 0) / v.length : 0 })()
                        : r.prevBids[sel as number] ?? 0
                      return curr > 0 && prev > 0 && curr > prev
                    })
                    .map((r) => r.category)
                  const movedDown = categoryRows
                    .filter((r) => {
                      const curr = getSelectedAmount(r)
                      const sel = getSelection(r.category)
                      const prev = sel === 'avg'
                        ? (() => { const v = r.prevBids.filter((x) => x !== null) as number[]; return v.length > 0 ? v.reduce((a, b) => a + b, 0) / v.length : 0 })()
                        : r.prevBids[sel as number] ?? 0
                      return curr > 0 && prev > 0 && curr < prev
                    })
                    .map((r) => r.category)
                  return (
                    <>
                      <p>• Previous total: <strong>{formatCurrency(prevGrandTotal, true)}</strong> → Current: <strong>{formatCurrency(grandTotal, true)}</strong></p>
                      <p className={delta > 0 ? 'text-red-700' : 'text-green-700'}>
                        • Net change: {delta > 0 ? '▲ +' : '▼ '}{formatCurrency(delta, true)} ({delta > 0 ? '+' : ''}{pct}%)
                        {delta > 0 ? ' — costs increased from previous revision.' : ' — costs decreased from previous revision.'}
                      </p>
                      {movedUp.length > 0 && <p>• Increased categories: {movedUp.join(', ')}</p>}
                      {movedDown.length > 0 && <p>• Decreased categories: {movedDown.join(', ')}</p>}
                    </>
                  )
                })()}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="pt-4 border-t">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => { onConfirm(buildLines()); onClose() }}>
            Add {buildLines().length} line{buildLines().length !== 1 ? 's' : ''} to Budget
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
