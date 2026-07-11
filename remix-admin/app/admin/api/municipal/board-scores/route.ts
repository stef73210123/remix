/**
 * Consolidated per-board "progress scores" for a town — powers the dashboard
 * roll-up spectrum and each board page's header.
 *
 *   GET /admin/api/municipal/board-scores?muni=nc
 *   → { town, boards: [ { key, displayName, score|null, positions, members } ] }
 *
 * Every configured board is returned (in registry order); boards without a
 * transcript-analysis dataset come back with score: null.
 */
import { NextResponse } from 'next/server'
import { authorizeMunicipalRead } from '@/lib/municipal/auth'
import { findMunicipality } from '@/lib/municipal/registry'
import { boardProgressScore } from '@/lib/municipal/analysis'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  if (!(await authorizeMunicipalRead())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const muni = new URL(req.url).searchParams.get('muni') || ''
  const town = findMunicipality(muni)
  if (!town) return NextResponse.json({ town: null, boards: [] })

  const boards = town.bodies.map((b) => {
    const s = boardProgressScore(muni, b.key)
    return {
      key: b.key,
      displayName: b.displayName,
      score: s ? s.score : null,
      positions: s ? s.positions : 0,
      members: s ? s.members : 0,
    }
  })

  return NextResponse.json({ town: town.name, boards })
}
