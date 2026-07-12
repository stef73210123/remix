/**
 * Building Department permits.
 *
 *   GET /admin/api/municipal/permits?muni=nc            → { dataset, department }
 *   GET /admin/api/municipal/permits?muni=nc&id=<num>   → PermitRecord | { available:false }
 *   GET /admin/api/municipal/permits?muni=nc&all=1      → { permits: PermitRecord[] }
 */
import { NextResponse } from 'next/server'
import { authorizeMunicipalRead } from '@/lib/municipal/auth'
import { getPermitData, getPermitsFull, getPermit, getDepartment } from '@/lib/municipal/permits'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  if (!(await authorizeMunicipalRead())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const url = new URL(req.url)
  const muni = url.searchParams.get('muni') || ''
  const id = url.searchParams.get('id') || ''
  const all = url.searchParams.get('all')

  if (id) {
    const p = getPermit(muni, id)
    if (!p) return NextResponse.json({ available: false })
    return NextResponse.json(p)
  }
  if (all) {
    return NextResponse.json({ permits: getPermitsFull(muni) ?? [] })
  }
  const dataset = getPermitData(muni)
  if (!dataset) return NextResponse.json({ available: false })
  return NextResponse.json({ dataset, department: getDepartment(muni) })
}
