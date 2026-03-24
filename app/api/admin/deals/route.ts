import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { listDeals, appendDeal, updateDeal, deleteDeal } from '@/lib/sheets/deals'
import { getUser } from '@/lib/sheets/users'

export const dynamic = 'force-dynamic'

async function requireAdmin(): Promise<{ email: string } | NextResponse> {
  const headersList = await headers()
  const email = headersList.get('x-user-email')
  const role = headersList.get('x-user-role')
  if (!email || role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const user = await getUser(email)
  if (!user || !user.active || user.role !== 'admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  return { email }
}

export async function GET() {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth
  try {
    const deals = await listDeals()
    return NextResponse.json(deals)
  } catch (e) {
    console.error('deals GET', e)
    return NextResponse.json({ error: 'Failed to load deals' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth
  try {
    const body = await req.json()
    const deal = await appendDeal({
      name: body.name || '',
      address: body.address || '',
      asset_type: body.asset_type || '',
      market: body.market || '',
      asking_price: parseFloat(body.asking_price || '0'),
      target_price: parseFloat(body.target_price || '0'),
      size_sf: parseFloat(body.size_sf || '0'),
      units: parseInt(body.units || '0'),
      cap_rate: parseFloat(body.cap_rate || '0'),
      irr_target: parseFloat(body.irr_target || '0'),
      source: body.source || '',
      broker: body.broker || '',
      stage: body.stage || 'sourcing',
      probability: parseFloat(body.probability || '0'),
      close_date: body.close_date || '',
      notes: body.notes || '',
    })
    return NextResponse.json(deal, { status: 201 })
  } catch (e) {
    console.error('deals POST', e)
    return NextResponse.json({ error: 'Failed to create deal' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth
  try {
    const body = await req.json()
    const { id, ...updates } = body
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    const numFields = ['asking_price', 'target_price', 'size_sf', 'units', 'cap_rate', 'irr_target', 'probability']
    for (const f of numFields) {
      if (updates[f] !== undefined) updates[f] = parseFloat(updates[f])
    }
    await updateDeal(id, updates)
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('deals PATCH', e)
    return NextResponse.json({ error: 'Failed to update deal' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth
  try {
    const { id } = await req.json()
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    await deleteDeal(id)
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('deals DELETE', e)
    return NextResponse.json({ error: 'Failed to delete deal' }, { status: 500 })
  }
}
