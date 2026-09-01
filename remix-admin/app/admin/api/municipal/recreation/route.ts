/**
 * Recreation programme enrolment and facility use.
 *
 *   GET /admin/api/municipal/recreation?muni=nc
 *   → { available: false } | { meta, years, mostWaitlisted, topFacilities, summary }
 */
import { NextResponse } from 'next/server'
import { authorizeMunicipalRead } from '@/lib/municipal/auth'
import { loadRecreation, summarizeRecreation } from '@/lib/municipal/recreation'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  if (!(await authorizeMunicipalRead())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const muni = new URL(req.url).searchParams.get('muni') || ''
  const data = loadRecreation(muni)
  if (!data) return NextResponse.json({ available: false })
  return NextResponse.json({ ...data, summary: summarizeRecreation(data) })
}
