/**
 * Transcript-analysis dataset for a board.
 *
 *   GET /admin/api/municipal/transcript-analysis?muni=nc&body=planning
 *   → AnalysisDataset | { available: false }
 *
 * Currently only the North Castle Planning Board has a dataset (12 months of
 * meeting-video transcripts analyzed for cases, themes, and member sentiment).
 */
import { NextResponse } from 'next/server'
import { authorizeMunicipalRead } from '@/lib/municipal/auth'
import { loadAnalysis } from '@/lib/municipal/analysis'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  if (!(await authorizeMunicipalRead())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const url = new URL(req.url)
  const muni = url.searchParams.get('muni') || ''
  const body = url.searchParams.get('body') || ''
  const data = loadAnalysis(muni, body)
  if (!data) return NextResponse.json({ available: false })
  return NextResponse.json(data)
}
