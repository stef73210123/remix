/**
 * What a department's staff have raised at public meetings, newest first.
 *
 *   GET /admin/api/municipal/dept-timeline?muni=nc&dept=water_sewer
 *   → { entries: StaffTimelineEntry[] }
 *
 * Its own route rather than a slice of transcript-analysis: a department page
 * needs a few dozen short entries, and the full board datasets it is derived
 * from run to several megabytes.
 */
import { NextResponse } from 'next/server'
import { authorizeMunicipalRead } from '@/lib/municipal/auth'
import { getStaffTimeline } from '@/lib/municipal/staffTimeline'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  if (!(await authorizeMunicipalRead())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const url = new URL(req.url)
  const muni = url.searchParams.get('muni') || ''
  const dept = url.searchParams.get('dept') || ''
  if (!muni || !dept) return NextResponse.json({ entries: [] })
  return NextResponse.json({ entries: getStaffTimeline(muni, dept) })
}
