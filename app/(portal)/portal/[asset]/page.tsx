import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import DocRenderer from '@/components/shared/DocRenderer'
import DistributionChartClient from './DistributionChartClient'
import { getInvestorPositionForAsset } from '@/lib/sheets/investors'
import { getDistributionsForUser } from '@/lib/sheets/distributions'
import { getDocumentsForUser } from '@/lib/sheets/documents'
import { getTimeline } from '@/lib/sheets/timeline'
import { getBudget } from '@/lib/sheets/budget'
import { getAssetUpdates } from '@/lib/gdocs/updates'
import { getAssetConfig } from '@/lib/sheets/config'
import {
  formatCurrency,
  formatPercent,
  formatMultiple,
  formatDate,
  formatDistributionType,
} from '@/lib/utils/format'
import { ASSET_NAMES } from '@/types'
import type { AssetSlug, UserRole, MilestoneStatus } from '@/types'

const VALID_SLUGS: AssetSlug[] = ['livingstonfarm', 'wrenofthewoods']

const STATUS_COLORS: Record<MilestoneStatus, string> = {
  upcoming: 'text-muted-foreground',
  'in-progress': 'text-blue-600',
  complete: 'text-green-600',
  delayed: 'text-red-600',
}

const STATUS_BADGES: Record<MilestoneStatus, string> = {
  upcoming: 'secondary',
  'in-progress': 'default',
  complete: 'outline',
  delayed: 'destructive',
}

export default async function PortalAssetPage({
  params,
}: {
  params: Promise<{ asset: string }>
}) {
  const { asset } = await params

  if (!VALID_SLUGS.includes(asset as AssetSlug)) {
    notFound()
  }

  const headersList = await headers()
  const email = headersList.get('x-user-email') || ''
  const role = (headersList.get('x-user-role') || 'lp') as UserRole
  const userAssets = headersList.get('x-user-assets')?.split(',').filter(Boolean) || []

  // Access check
  if (role === 'lp' && !userAssets.includes(asset)) {
    notFound()
  }

  const assetName = ASSET_NAMES[asset as AssetSlug] || asset

  // Fetch all data in parallel
  const [positionRes, distributionsRes, docsRes, timelineRes, budgetRes, updatesRes, configRes] =
    await Promise.allSettled([
      getInvestorPositionForAsset(email, asset),
      getDistributionsForUser(email, asset),
      getDocumentsForUser(email, asset, role),
      getTimeline(asset),
      getBudget(asset),
      getAssetUpdates(asset),
      getAssetConfig(asset),
    ])

  const position = positionRes.status === 'fulfilled' ? positionRes.value : null
  const distributions = distributionsRes.status === 'fulfilled' ? distributionsRes.value : []
  const docs = docsRes.status === 'fulfilled' ? docsRes.value : []
  const timeline = timelineRes.status === 'fulfilled' ? timelineRes.value : []
  const budget = budgetRes.status === 'fulfilled' ? budgetRes.value : []
  const updates = updatesRes.status === 'fulfilled' ? updatesRes.value : []
  const config = configRes.status === 'fulfilled' ? configRes.value : null

  const latestUpdate = updates[0] || null
  const olderUpdates = updates.slice(1)

  // Budget totals
  const budgetTotals = {
    budgeted: budget.reduce((s, b) => s + b.budgeted, 0),
    actual: budget.reduce((s, b) => s + b.actual_to_date, 0),
    projected: budget.reduce((s, b) => s + b.projected_final, 0),
  }

  // Upcoming milestones
  const upcomingMilestones = timeline
    .filter((m) => m.status === 'upcoming' || m.status === 'in-progress')
    .slice(0, 3)

  // Chart data for distributions
  let cumulative = 0
  const chartData = distributions.map((d) => {
    cumulative += d.amount
    return { date: d.date, cumulative, amount: d.amount }
  })

  return (
    <div className="container mx-auto max-w-6xl px-4 py-12">
      {/* Header */}
      <div className="mb-2 text-sm text-muted-foreground">
        <Link href="/portal" className="hover:underline">Portfolio</Link>
        <span className="mx-2">/</span>
        {assetName}
      </div>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{assetName}</h1>
          {config && <Badge className="mt-1">{config.status}</Badge>}
        </div>
      </div>

      <Tabs defaultValue="position">
        <TabsList className="mb-6">
          <TabsTrigger value="position">My Position</TabsTrigger>
          <TabsTrigger value="status">Project Status</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="budget">Budget</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        {/* ── Tab 1: My Position ── */}
        <TabsContent value="position">
          {position ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <Card>
                  <CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground uppercase tracking-wide">Equity Invested</CardTitle></CardHeader>
                  <CardContent><div className="text-xl font-semibold">{formatCurrency(position.equity_invested)}</div></CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground uppercase tracking-wide">Ownership</CardTitle></CardHeader>
                  <CardContent><div className="text-xl font-semibold">{formatPercent(position.ownership_pct, 2)}</div></CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground uppercase tracking-wide">NAV Estimate</CardTitle></CardHeader>
                  <CardContent><div className="text-xl font-semibold">{formatCurrency(position.nav_estimate)}</div></CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground uppercase tracking-wide">Capital Account</CardTitle></CardHeader>
                  <CardContent><div className="text-xl font-semibold">{formatCurrency(position.capital_account_balance)}</div></CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground uppercase tracking-wide">IRR Estimate</CardTitle></CardHeader>
                  <CardContent><div className="text-xl font-semibold">{formatPercent(position.irr_estimate)}</div></CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground uppercase tracking-wide">Equity Multiple</CardTitle></CardHeader>
                  <CardContent><div className="text-xl font-semibold">{formatMultiple(position.equity_multiple)}</div></CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground uppercase tracking-wide">Total Distributions</CardTitle></CardHeader>
                  <CardContent><div className="text-xl font-semibold">{formatCurrency(position.distributions_total)}</div></CardContent>
                </Card>
              </div>

              {/* Distribution history */}
              <div>
                <h2 className="text-lg font-semibold mb-3">Distribution History</h2>
                {distributions.length > 0 ? (
                  <>
                    <DistributionChartClient data={chartData} />
                    <div className="mt-4 rounded-md border">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-muted/50">
                            <th className="px-4 py-2 text-left font-medium">Date</th>
                            <th className="px-4 py-2 text-left font-medium">Amount</th>
                            <th className="px-4 py-2 text-left font-medium">Type</th>
                          </tr>
                        </thead>
                        <tbody>
                          {distributions.map((d) => (
                            <tr key={d.id} className="border-b last:border-0">
                              <td className="px-4 py-2">{formatDate(d.date)}</td>
                              <td className="px-4 py-2 font-medium">{formatCurrency(d.amount)}</td>
                              <td className="px-4 py-2 text-muted-foreground">{formatDistributionType(d.type)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No distributions have been made yet. You&apos;ll receive a notification when your first distribution is processed.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">Position data will appear here once your investment is recorded.</p>
          )}
        </TabsContent>

        {/* ── Tab 2: Project Status ── */}
        <TabsContent value="status">
          {config && (
            <div className="mb-6 flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Status:</span>
              <Badge>{config.status}</Badge>
            </div>
          )}
          {latestUpdate ? (
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-3">{latestUpdate.heading}</h2>
              <DocRenderer html={latestUpdate.html} />
            </div>
          ) : (
            <p className="text-muted-foreground mb-6">Project updates will appear here as progress is made.</p>
          )}
          {olderUpdates.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wide">Previous Updates</h3>
              <Accordion type="multiple" className="space-y-2">
                {olderUpdates.map((update, idx) => (
                  <AccordionItem key={idx} value={`update-${idx}`} className="border rounded-md px-4">
                    <AccordionTrigger className="text-sm font-medium">{update.heading}</AccordionTrigger>
                    <AccordionContent>
                      <DocRenderer html={update.html} />
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          )}
        </TabsContent>

        {/* ── Tab 3: Timeline ── */}
        <TabsContent value="timeline">
          {timeline.length > 0 ? (
            <div className="space-y-6">
              {upcomingMilestones.length > 0 && (
                <div className="rounded-lg border bg-muted/30 p-4">
                  <h3 className="text-sm font-semibold mb-3">Upcoming Milestones</h3>
                  <div className="space-y-2">
                    {upcomingMilestones.map((m, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm">
                        <span className={STATUS_COLORS[m.status]}>{m.milestone}</span>
                        <span className="text-muted-foreground">{formatDate(m.planned_date)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="rounded-md border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-2 text-left font-medium">Milestone</th>
                      <th className="px-4 py-2 text-left font-medium">Planned</th>
                      <th className="px-4 py-2 text-left font-medium">Actual</th>
                      <th className="px-4 py-2 text-left font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {timeline.map((m, idx) => (
                      <tr key={idx} className="border-b last:border-0">
                        <td className="px-4 py-2">{m.milestone}</td>
                        <td className="px-4 py-2 text-muted-foreground">{formatDate(m.planned_date)}</td>
                        <td className="px-4 py-2 text-muted-foreground">{m.actual_date ? formatDate(m.actual_date) : '—'}</td>
                        <td className="px-4 py-2">
                          <Badge variant={STATUS_BADGES[m.status] as 'default' | 'secondary' | 'outline' | 'destructive'} className="capitalize">
                            {m.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">The project timeline will appear here once milestones are established.</p>
          )}
        </TabsContent>

        {/* ── Tab 4: Budget ── */}
        <TabsContent value="budget">
          {budget.length > 0 ? (
            <div className="space-y-4">
              <div className="rounded-md border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-2 text-left font-medium">Category</th>
                      <th className="px-4 py-2 text-right font-medium">Budgeted</th>
                      <th className="px-4 py-2 text-right font-medium">Actual to Date</th>
                      <th className="px-4 py-2 text-right font-medium">Projected Final</th>
                      <th className="px-4 py-2 text-right font-medium">Variance ($)</th>
                      <th className="px-4 py-2 text-right font-medium">Variance (%)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {budget.map((line, idx) => {
                      const varianceDollar = line.budgeted - line.projected_final
                      const variancePct = line.budgeted > 0 ? varianceDollar / line.budgeted : 0
                      const isOver = varianceDollar < 0
                      return (
                        <tr key={idx} className="border-b last:border-0">
                          <td className="px-4 py-2">{line.category}</td>
                          <td className="px-4 py-2 text-right">{formatCurrency(line.budgeted)}</td>
                          <td className="px-4 py-2 text-right">{formatCurrency(line.actual_to_date)}</td>
                          <td className="px-4 py-2 text-right">{formatCurrency(line.projected_final)}</td>
                          <td className={`px-4 py-2 text-right font-medium ${isOver ? 'text-red-600' : 'text-green-600'}`}>
                            {isOver ? '-' : '+'}{formatCurrency(Math.abs(varianceDollar))}
                          </td>
                          <td className={`px-4 py-2 text-right ${isOver ? 'text-red-600' : 'text-green-600'}`}>
                            {isOver ? '-' : '+'}{formatPercent(Math.abs(variancePct))}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t bg-muted/50 font-semibold">
                      <td className="px-4 py-2">Total</td>
                      <td className="px-4 py-2 text-right">{formatCurrency(budgetTotals.budgeted)}</td>
                      <td className="px-4 py-2 text-right">{formatCurrency(budgetTotals.actual)}</td>
                      <td className="px-4 py-2 text-right">{formatCurrency(budgetTotals.projected)}</td>
                      <td className="px-4 py-2 text-right"></td>
                      <td className="px-4 py-2 text-right"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">Budget details will appear here once entered.</p>
          )}
        </TabsContent>

        {/* ── Tab 5: Documents ── */}
        <TabsContent value="documents">
          {docs.length > 0 ? (
            <div className="space-y-2">
              {docs.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <div className="text-sm font-medium">{doc.doc_name}</div>
                    <div className="text-xs text-muted-foreground capitalize">
                      {doc.doc_type.replace('_', ' ')} · {formatDate(doc.date)}
                    </div>
                  </div>
                  <a href={`/api/sheets/documents/${doc.id}`} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm">Download</Button>
                  </a>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">Documents will be available here once uploaded.</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
