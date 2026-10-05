/**
 * Who to write to about a board: its sitting members, and the municipal office
 * that keeps the board's correspondence file.
 *
 *   GET /admin/api/municipal/board-contacts?muni=nc&body=planning
 *
 * Member addresses come from the researched dossiers (the single source of
 * truth — the member profile pages render the same values), filtered to people
 * still serving and to those we actually hold an address for. The office is a
 * published municipal mailbox and is always safe to offer, so a board with no
 * member addresses on file still returns one.
 */
import { NextResponse } from 'next/server'
import { authorizeMunicipalRead } from '@/lib/municipal/auth'
import { findMunicipality } from '@/lib/municipal/registry'
import { loadAnalysis, loadBoardDossiers } from '@/lib/municipal/analysis'
import { getBoardOffice } from '@/lib/municipal/departments'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  if (!(await authorizeMunicipalRead())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(req.url)
  const muniKey = url.searchParams.get('muni') || ''
  const bodyKey = url.searchParams.get('body') || ''
  const cfg = findMunicipality(muniKey)
  const body = cfg?.bodies.find((b) => b.key === bodyKey)
  if (!cfg || !body) {
    return NextResponse.json({ error: 'unknown town or board' }, { status: 404 })
  }

  // Former members keep their dossier (their record of service stays on the
  // site) but must never land in a mailto for the sitting board.
  const meta = loadAnalysis(muniKey, bodyKey)?.meta
  const inactive = new Set((meta?.inactiveMembers || []).map((n) => n.trim().toLowerCase()))

  const dossiers = loadBoardDossiers(muniKey, bodyKey) || {}
  const members = Object.values(dossiers)
    .filter((d) => d.email && !inactive.has(d.member.trim().toLowerCase()))
    .map((d) => ({ name: d.member, role: d.role || '', email: d.email as string, note: d.emailNote || '' }))

  return NextResponse.json({
    board: { label: body.displayName, members },
    office: getBoardOffice(muniKey, bodyKey),
  })
}
