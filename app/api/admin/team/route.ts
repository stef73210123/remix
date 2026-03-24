import { NextRequest, NextResponse } from 'next/server'
import { listTeamMembers, upsertTeamMember, deleteTeamMember } from '@/lib/sheets/team'
import type { TeamMember } from '@/lib/sheets/team'

export const dynamic = 'force-dynamic'

function isAdmin(req: NextRequest) {
  return req.headers.get('x-user-role') === 'admin'
}

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { searchParams } = new URL(req.url)
  const asset = searchParams.get('asset') || undefined
  const members = await listTeamMembers(asset)
  return NextResponse.json(members)
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  try {
    const body = await req.json() as Omit<TeamMember, 'id' | 'created_at'>
    const member: TeamMember = {
      ...body,
      id: `team_${Date.now()}`,
      created_at: new Date().toISOString().split('T')[0],
    }
    await upsertTeamMember(member)
    return NextResponse.json(member)
  } catch (e) {
    console.error('[team POST]', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  try {
    const body = await req.json() as TeamMember
    if (!body.id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    await upsertTeamMember(body)
    return NextResponse.json(body)
  } catch (e) {
    console.error('[team PATCH]', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    await deleteTeamMember(id)
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[team DELETE]', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
