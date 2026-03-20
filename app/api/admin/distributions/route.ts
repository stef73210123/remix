import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import {
  listAllDistributions,
  appendDistribution,
  updateDistribution,
  deleteDistribution,
} from '@/lib/sheets/distributions'
import { getUser } from '@/lib/sheets/users'
import { appendSheetRow } from '@/lib/sheets/client'
import type { DistributionType } from '@/types'

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
    console.error('[admin/distributions] Failed to log activity:', e)
  }
}

export async function GET() {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth
  try {
    const distributions = await listAllDistributions()
    return NextResponse.json(distributions)
  } catch (error) {
    console.error('[admin/distributions GET]', error)
    return NextResponse.json({ error: 'Failed to list distributions' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth
  try {
    const body = await req.json()
    if (!body.investor_id || !body.email || !body.asset || !body.date) {
      return NextResponse.json(
        { error: 'investor_id, email, asset, and date are required' },
        { status: 400 }
      )
    }
    const dist = await appendDistribution({
      investor_id: body.investor_id,
      email: body.email,
      asset: body.asset,
      date: body.date,
      amount: parseFloat(body.amount || '0'),
      type: (body.type || 'profit') as DistributionType,
      notes: body.notes || '',
    })
    await logActivity(auth.email, 'distribution.create', dist.id, {
      email: body.email,
      asset: body.asset,
      amount: body.amount,
    })
    return NextResponse.json({ message: 'Distribution created', distribution: dist }, { status: 201 })
  } catch (error) {
    console.error('[admin/distributions POST]', error)
    return NextResponse.json({ error: 'Failed to create distribution' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth
  try {
    const body = await req.json()
    if (!body.id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }
    const { id, ...updates } = body
    if (updates.amount !== undefined) updates.amount = parseFloat(updates.amount)
    await updateDistribution(id, updates)
    await logActivity(auth.email, 'distribution.update', id, updates)
    return NextResponse.json({ message: 'Distribution updated' })
  } catch (error) {
    console.error('[admin/distributions PATCH]', error)
    return NextResponse.json({ error: 'Failed to update distribution' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth
  try {
    const { id } = await req.json()
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }
    await deleteDistribution(id)
    await logActivity(auth.email, 'distribution.delete', id, {})
    return NextResponse.json({ message: 'Distribution deleted' })
  } catch (error) {
    console.error('[admin/distributions DELETE]', error)
    return NextResponse.json({ error: 'Failed to delete distribution' }, { status: 500 })
  }
}
