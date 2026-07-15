/**
 * Curated local news for a town, live from the Perigon News API.
 *
 *   GET /admin/api/municipal/news?muni=nc
 *   → { available: true, items: NewsItem[] } | { available: false, error? }
 */
import { NextResponse } from 'next/server'
import { authorizeMunicipalRead } from '@/lib/municipal/auth'
import { fetchLocalNews } from '@/lib/municipal/news'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  if (!(await authorizeMunicipalRead())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const muni = new URL(req.url).searchParams.get('muni') || ''
  try {
    const items = await fetchLocalNews(muni)
    if (!items) return NextResponse.json({ available: false })
    return NextResponse.json({ available: true, items })
  } catch (e) {
    return NextResponse.json({ available: false, error: e instanceof Error ? e.message : String(e) })
  }
}
