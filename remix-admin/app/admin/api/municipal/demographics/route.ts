/**
 * Demographics for a town: live U.S. Census ACS when CENSUS_API_KEY is set,
 * otherwise the static approximate figures.
 *
 *   GET /admin/api/municipal/demographics?muni=nc
 *   → { demo: TownDemographics | null, live: boolean, error? }
 */
import { NextResponse } from 'next/server'
import { authorizeMunicipalRead } from '@/lib/municipal/auth'
import { getDemographics } from '@/lib/municipal/demographics'
import { findMunicipality } from '@/lib/municipal/registry'
import { fetchCensusDemographics, fetchCensusSeries } from '@/lib/municipal/census'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  if (!(await authorizeMunicipalRead())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const muni = new URL(req.url).searchParams.get('muni') || ''
  const fallback = getDemographics(muni) || null
  const townName = findMunicipality(muni)?.name || fallback?.townName || muni

  try {
    // Snapshot + trend series in parallel; the series drives the sparklines.
    const [live, series] = await Promise.all([
      fetchCensusDemographics(muni, townName),
      fetchCensusSeries(muni).catch(() => []),
    ])
    if (live && live.population > 0) {
      return NextResponse.json({ demo: { ...live, series: series.length ? series : undefined }, live: true })
    }
  } catch (e) {
    return NextResponse.json({
      demo: fallback,
      live: false,
      error: e instanceof Error ? e.message : String(e),
    })
  }

  return NextResponse.json({ demo: fallback, live: false })
}
