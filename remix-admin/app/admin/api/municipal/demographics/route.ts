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
import { fetchCensusDemographics, fetchCensusSeries, fetchCensusAgeDistribution } from '@/lib/municipal/census'

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
    // Snapshot + trend series + age distribution in parallel.
    const [live, series, ageDistribution] = await Promise.all([
      fetchCensusDemographics(muni, townName),
      fetchCensusSeries(muni).catch(() => []),
      fetchCensusAgeDistribution(muni).catch(() => []),
    ])
    if (live && live.population > 0) {
      return NextResponse.json({
        demo: {
          ...live,
          series: series.length ? series : undefined,
          // Fall back to the town's static age distribution if the live pull came
          // back empty, so the chart still renders.
          ageDistribution: ageDistribution.length ? ageDistribution : fallback?.ageDistribution,
        },
        live: true,
      })
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
