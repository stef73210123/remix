/**
 * Federated property data.
 *
 *   GET /admin/api/municipal/property?muni=nc           → { properties: PropertySummary[] }
 *   GET /admin/api/municipal/property?muni=nc&id=<slug> → Property | { available: false }
 */
import { NextResponse } from 'next/server'
import { authorizeMunicipalRead } from '@/lib/municipal/auth'
import { listProperties, getProperty } from '@/lib/municipal/property'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  if (!(await authorizeMunicipalRead())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const url = new URL(req.url)
  const muni = url.searchParams.get('muni') || ''
  const id = url.searchParams.get('id') || ''
  if (id) {
    const p = getProperty(muni, id)
    if (!p) return NextResponse.json({ available: false })
    return NextResponse.json(p)
  }
  return NextResponse.json({ properties: listProperties(muni) })
}
