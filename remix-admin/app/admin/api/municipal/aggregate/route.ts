/**
 * Town-wide issue aggregate: theme volume + sentiment across ALL of a town's
 * boards and committees, grouped by calendar year.
 *
 *   GET /admin/api/municipal/aggregate?muni=nc
 *   → TownIssuesAggregate | { available: false }
 */
import { NextResponse } from 'next/server'
import { authorizeMunicipalRead } from '@/lib/municipal/auth'
import { aggregateTownIssues } from '@/lib/municipal/analysis'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  if (!(await authorizeMunicipalRead())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const muni = new URL(req.url).searchParams.get('muni') || ''
  const agg = aggregateTownIssues(muni)
  if (!agg) return NextResponse.json({ available: false })
  return NextResponse.json({ available: true, ...agg })
}
