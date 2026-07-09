/**
 * Researched stakeholder dossier for one board member.
 *
 *   GET /admin/api/municipal/member-dossier?muni=nc&body=town_board&name=Barbara%20DiGiacinto
 *   → MemberDossier | { available: false }
 */
import { NextResponse } from 'next/server'
import { authorizeMunicipal } from '@/lib/municipal/auth'
import { loadDossier } from '@/lib/municipal/analysis'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  if (!(await authorizeMunicipal())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const url = new URL(req.url)
  const muni = url.searchParams.get('muni') || ''
  const body = url.searchParams.get('body') || ''
  const name = url.searchParams.get('name') || ''
  const dossier = name ? loadDossier(muni, body, name) : null
  if (!dossier) return NextResponse.json({ available: false })
  return NextResponse.json(dossier)
}
