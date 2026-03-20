import { headers } from 'next/headers'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { listUsers } from '@/lib/sheets/users'
import { listAllInvestorPositions } from '@/lib/sheets/investors'
import { readSheetRange } from '@/lib/sheets/client'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import type { AdminActivity } from '@/types'

export const revalidate = 0

function parseActivity(row: string[]): AdminActivity {
  return {
    timestamp: row[0] || '',
    admin_email: row[1] || '',
    action: row[2] || '',
    target: row[3] || '',
    details: row[4] || '',
  }
}

export default async function AdminDashboardPage() {
  const headersList = await headers()
  const role = headersList.get('x-user-role')

  if (role !== 'admin') {
    return (
      <div className="container mx-auto max-w-6xl px-4 py-12">
        <p className="text-muted-foreground">Access denied.</p>
      </div>
    )
  }

  const [usersResult, positionsResult, activityResult] = await Promise.allSettled([
    listUsers(),
    listAllInvestorPositions(),
    readSheetRange('Admin_Activity', undefined, true),
  ])

  const users = usersResult.status === 'fulfilled' ? usersResult.value : []
  const positions = positionsResult.status === 'fulfilled' ? positionsResult.value : []
  const activityRows = activityResult.status === 'fulfilled' ? activityResult.value : []

  // Skip header row — readSheetRange with includeHeader=true returns data rows only
  const activities: AdminActivity[] = activityRows
    .slice(0, 20)
    .map((row) => parseActivity(row as string[]))
    .filter((a) => a.timestamp)
    .reverse()

  const activeUsers = users.filter((u) => u.active)
  const lpUsers = activeUsers.filter((u) => u.role === 'lp')
  const totalInvested = positions.reduce((sum, p) => sum + p.equity_invested, 0)
  const totalNav = positions.reduce((sum, p) => sum + p.nav_estimate, 0)

  const assetCounts = positions.reduce<Record<string, number>>((acc, p) => {
    acc[p.asset] = (acc[p.asset] || 0) + 1
    return acc
  }, {})

  return (
    <div className="container mx-auto max-w-6xl px-4 py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-1">Platform overview and management</p>
      </div>

      {/* Quick links */}
      <div className="flex flex-wrap gap-3 mb-8">
        <Link href="/admin/users">
          <Button variant="outline">Manage Users</Button>
        </Link>
        <Link href="/admin/investors">
          <Button variant="outline">Investor Positions</Button>
        </Link>
        <Link href="/admin/pipeline">
          <Button variant="outline">Pipeline</Button>
        </Link>
        <Link href="/admin/distributions">
          <Button variant="outline">Distributions</Button>
        </Link>
        <Link href="/admin/config">
          <Button variant="outline">Asset Config</Button>
        </Link>
        <Link href="/admin/media">
          <Button variant="outline">Property Media</Button>
        </Link>
        <Link href="/admin/timeline">
          <Button variant="outline">Timeline</Button>
        </Link>
        <Link href="/admin/budget">
          <Button variant="outline">Budget</Button>
        </Link>
        <Link href="/admin/announcements">
          <Button variant="outline">Announcements</Button>
        </Link>
        <Link href="/admin/documents">
          <Button variant="outline">Documents</Button>
        </Link>
        <Link href="/admin/content">
          <Button variant="outline">Preview Content</Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-10">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Active Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{activeUsers.length}</div>
            <div className="text-xs text-muted-foreground mt-1">{lpUsers.length} LPs</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Investor Positions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{positions.length}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {Object.entries(assetCounts)
                .map(([asset, count]) => `${count} ${asset}`)
                .join(', ')}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Total Invested
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{formatCurrency(totalInvested)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Total NAV
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{formatCurrency(totalNav)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Activity log */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
        {activities.length === 0 ? (
          <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
        ) : (
          <div className="rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-2 text-left font-medium">Time</th>
                  <th className="px-4 py-2 text-left font-medium">Admin</th>
                  <th className="px-4 py-2 text-left font-medium">Action</th>
                  <th className="px-4 py-2 text-left font-medium">Target</th>
                  <th className="px-4 py-2 text-left font-medium">Details</th>
                </tr>
              </thead>
              <tbody>
                {activities.map((a, idx) => (
                  <tr key={idx} className="border-b last:border-0">
                    <td className="px-4 py-2 text-muted-foreground whitespace-nowrap">
                      {a.timestamp ? formatDate(a.timestamp.split('T')[0]) : '—'}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">{a.admin_email}</td>
                    <td className="px-4 py-2">
                      <Badge variant="outline" className="font-mono text-xs">{a.action}</Badge>
                    </td>
                    <td className="px-4 py-2">{a.target}</td>
                    <td className="px-4 py-2 text-muted-foreground max-w-xs truncate">{a.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
