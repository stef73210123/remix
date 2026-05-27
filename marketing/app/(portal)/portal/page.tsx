import { headers } from 'next/headers'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getUserPortfolioSummary } from '@/lib/sheets/portfolio'
import { getLatestUpdate } from '@/lib/gdocs/updates'
import { formatCurrency, formatPercent, formatMultiple } from '@/lib/utils/format'
import { ASSET_NAMES } from '@/types'
import type { AssetSlug } from '@/types'
import DocRenderer from '@/components/shared/DocRenderer'

export default async function PortalPage() {
  const headersList = await headers()
  const email = headersList.get('x-user-email') || ''
  const name = headersList.get('x-user-name') || ''
  const role = headersList.get('x-user-role') || ''
  const userAssets = headersList.get('x-user-assets')?.split(',').filter(Boolean) || []

  const assetsToShow: AssetSlug[] =
    role === 'admin' || role === 'gp'
      ? ['livingstonfarm', 'wrenofthewoods']
      : (userAssets as AssetSlug[])

  const [portfolioResult, ...updateResults] = await Promise.allSettled([
    getUserPortfolioSummary(email),
    ...assetsToShow.map((slug) => getLatestUpdate(slug).then((u) => ({ slug, update: u }))),
  ])

  const portfolio = portfolioResult.status === 'fulfilled' ? portfolioResult.value : null
  const recentUpdates = updateResults
    .filter((r) => r.status === 'fulfilled')
    .map((r) => (r as PromiseFulfilledResult<{ slug: AssetSlug; update: Awaited<ReturnType<typeof getLatestUpdate>> }>).value)
    .filter((u) => u.update !== null)
    .slice(0, 3)

  return (
    <div className="container mx-auto max-w-6xl px-4 py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">
          {name ? `Welcome back, ${name.split(' ')[0]}` : 'Investor Portal'}
        </h1>
        <p className="text-muted-foreground mt-1">Your portfolio overview</p>
      </div>

      {/* Portfolio summary row */}
      {portfolio && portfolio.total_invested > 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Invested</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{formatCurrency(portfolio.total_invested)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total NAV</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{formatCurrency(portfolio.total_nav)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Distributions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{formatCurrency(portfolio.total_distributions)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Blended IRR</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{formatPercent(portfolio.irr_blended)}</div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Asset position cards */}
      <div className="mb-10">
        <h2 className="text-lg font-semibold mb-4">Your Positions</h2>
        {assetsToShow.length === 0 ? (
          <p className="text-muted-foreground text-sm">No assets are currently assigned to your account.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {assetsToShow.map((slug) => {
              const position = portfolio?.positions.find((p) => p.asset === slug)
              return (
                <Card key={slug}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{ASSET_NAMES[slug]}</CardTitle>
                      {position && (
                        <Badge variant="outline">
                          {formatPercent(position.ownership_pct, 2)} ownership
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {position ? (
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <div className="text-muted-foreground">Invested</div>
                          <div className="font-semibold">{formatCurrency(position.equity_invested)}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">NAV</div>
                          <div className="font-semibold">{formatCurrency(position.nav_estimate)}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">IRR</div>
                          <div className="font-semibold">{formatPercent(position.irr_estimate)}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Multiple</div>
                          <div className="font-semibold">{formatMultiple(position.equity_multiple)}</div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Position data will appear here.</p>
                    )}
                    <Link href={`/portal/${slug}`}>
                      <Button variant="outline" size="sm" className="w-full mt-2">View Details</Button>
                    </Link>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Recent updates */}
      {recentUpdates.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Recent Updates</h2>
          <div className="space-y-4">
            {recentUpdates.map(({ slug, update }) =>
              update ? (
                <Card key={slug}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{ASSET_NAMES[slug]}</Badge>
                      <span className="text-sm font-medium">{update.heading}</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <DocRenderer html={update.html.slice(0, 500)} className="prose-sm" />
                    <Link href={`/portal/${slug}?tab=status`} className="text-sm text-primary hover:underline mt-2 inline-block">
                      Read more →
                    </Link>
                  </CardContent>
                </Card>
              ) : null
            )}
          </div>
        </div>
      )}
    </div>
  )
}
