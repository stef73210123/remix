/**
 * Demographics for a town: live U.S. Census ACS when CENSUS_API_KEY is set,
 * otherwise the static approximate figures.
 *
 *   GET /admin/api/municipal/demographics?muni=nc
 *   → { demo: TownDemographics | null, live: boolean, error? }
 */
import { NextResponse } from 'next/server'
import { authorizeMunicipal } from '@/lib/municipal/auth'
import { getDemographics } from '@/lib/municipal/demographics'
import { findMunicipality } from '@/lib/municipal/registry'
import { fetchCensusDemographics } from '@/lib/municipal/census'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  if (!(await authorizeMunicipal())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const muni = new URL(req.url).searchParams.get('muni') || ''
  const fallback = getDemographics(muni) || null
  const townName = findMunicipality(muni)?.name || fallback?.townName || muni

  try {
    const live = await fetchCensusDemographics(muni, townName)
    if (live && live.population > 0) {
      return NextResponse.json({ demo: live, live: true })
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
