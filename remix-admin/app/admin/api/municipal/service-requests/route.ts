/**
 * Citizen service requests and the Town's performance against its own targets.
 *
 *   GET /admin/api/municipal/service-requests?muni=nc
 *   → { available: false } | { meta, categories, summary }
 */
import { NextResponse } from 'next/server'
import { authorizeMunicipalRead } from '@/lib/municipal/auth'
import { loadServiceRequests, summarize } from '@/lib/municipal/serviceRequests'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  if (!(await authorizeMunicipalRead())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const muni = new URL(req.url).searchParams.get('muni') || ''
  const data = loadServiceRequests(muni)
  if (!data) return NextResponse.json({ available: false })
  return NextResponse.json({ ...data, summary: summarize(data) })
}
