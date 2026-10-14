/**
 * Site-wide search: applications, officials, addresses, boards, departments.
 *
 *   GET /admin/api/municipal/search?muni=nc&q=maple
 *
 * Backed by the committed datasets rather than the database, so it keeps
 * working when the DB is unreachable (see lib/municipal/search.ts).
 */
import { NextResponse } from 'next/server'
import { authorizeMunicipalRead } from '@/lib/municipal/auth'
import { findMunicipality } from '@/lib/municipal/registry'
import { searchSite } from '@/lib/municipal/search'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  if (!(await authorizeMunicipalRead())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const url = new URL(req.url)
  const muni = url.searchParams.get('muni') || ''
  const q = url.searchParams.get('q') || ''
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get('limit')) || 24))

  if (!findMunicipality(muni)) {
    return NextResponse.json({ error: 'unknown town' }, { status: 404 })
  }
  return NextResponse.json({ q, results: searchSite(muni, q, limit) })
}
