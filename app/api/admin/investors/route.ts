import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import {
  listAllInvestorPositions,
  upsertInvestorPosition,
  deleteInvestorPosition,
} from '@/lib/sheets/investors'
import { getUser } from '@/lib/sheets/users'
import { appendSheetRow } from '@/lib/sheets/client'
import type { InvestorPosition } from '@/types'

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

async function logActivity(adminEmail: string, action: string, target: string, details: object) {
  try {
    await appendSheetRow('Admin_Activity', [
      new Date().toISOString(),
      adminEmail,
      action,
      target,
      JSON.stringify(details),
    ])
  } catch (e) {
    console.error('[admin/investors] Failed to log activity:', e)
  }
}

function bodyToPosition(body: Record<string, unknown>): InvestorPosition {
  return {
    investor_id: String(body.investor_id || ''),
    email: String(body.email || ''),
    name: String(body.name || ''),
    asset: String(body.asset || ''),
    equity_invested: parseFloat(String(body.equity_invested || '0')),
    ownership_pct: parseFloat(String(body.ownership_pct || '0')),
    capital_account_balance: parseFloat(String(body.capital_account_balance || '0')),
    nav_estimate: parseFloat(String(body.nav_estimate || '0')),
    irr_estimate: parseFloat(String(body.irr_estimate || '0')),
    equity_multiple: parseFloat(String(body.equity_multiple || '0')),
    distributions_total: parseFloat(String(body.distributions_total || '0')),
    last_updated: String(body.last_updated || new Date().toISOString().split('T')[0]),
  }
}

export async function GET() {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth
  try {
    const positions = await listAllInvestorPositions()
    return NextResponse.json(positions)
  } catch (error) {
    console.error('[admin/investors GET]', error)
    return NextResponse.json({ error: 'Failed to list positions' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth
  try {
    const body = await req.json()
    if (!body.email || !body.name || !body.asset) {
      return NextResponse.json({ error: 'email, name, and asset are required' }, { status: 400 })
    }
    const pos = bodyToPosition({
      ...body,
      investor_id: body.investor_id || `inv_${Date.now()}`,
    })
    await upsertInvestorPosition(pos)
    await logActivity(auth.email, 'investor.create', pos.investor_id, {
      email: pos.email,
      asset: pos.asset,
    })
    return NextResponse.json({ message: 'Position created', position: pos }, { status: 201 })
  } catch (error) {
    console.error('[admin/investors POST]', error)
    return NextResponse.json({ error: 'Failed to create position' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth
  try {
    const body = await req.json()
    if (!body.investor_id) {
      return NextResponse.json({ error: 'investor_id is required' }, { status: 400 })
    }
    const pos = bodyToPosition(body)
    await upsertInvestorPosition(pos)
    await logActivity(auth.email, 'investor.update', pos.investor_id, { email: pos.email })
    return NextResponse.json({ message: 'Position updated', position: pos })
  } catch (error) {
    console.error('[admin/investors PATCH]', error)
    return NextResponse.json({ error: 'Failed to update position' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth
  try {
    const { investor_id } = await req.json()
    if (!investor_id) {
      return NextResponse.json({ error: 'investor_id is required' }, { status: 400 })
    }
    await deleteInvestorPosition(investor_id)
    await logActivity(auth.email, 'investor.delete', investor_id, {})
    return NextResponse.json({ message: 'Position deleted' })
  } catch (error) {
    console.error('[admin/investors DELETE]', error)
    return NextResponse.json({ error: 'Failed to delete position' }, { status: 500 })
  }
}
