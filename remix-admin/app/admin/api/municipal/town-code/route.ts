/**
 * Town Code dataset for a town.
 *
 *   GET /admin/api/municipal/town-code?muni=nc
 *   → TownCodeDataset | { available: false }
 */
import { NextResponse } from 'next/server'
import { authorizeMunicipalRead } from '@/lib/municipal/auth'
import { loadTownCode } from '@/lib/municipal/townCode'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  if (!(await authorizeMunicipalRead())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const url = new URL(req.url)
  const muni = url.searchParams.get('muni') || ''
  const data = loadTownCode(muni)
  if (!data) return NextResponse.json({ available: false })
  return NextResponse.json(data)
}
