import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import {
  getBudgetWithRows,
  appendBudgetLine,
  updateBudgetLine,
  deleteBudgetLine,
} from '@/lib/sheets/budget'
import { getUser } from '@/lib/sheets/users'
import { appendSheetRow } from '@/lib/sheets/client'
import type { BudgetLine } from '@/types'

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
    console.error('[admin/budget] Failed to log activity:', e)
  }
}

export async function GET(req: NextRequest) {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth
  const asset = req.nextUrl.searchParams.get('asset')
  if (!asset) return NextResponse.json({ error: 'asset query param required' }, { status: 400 })
  try {
    const lines = await getBudgetWithRows(asset)
    return NextResponse.json(lines)
  } catch (error) {
    console.error('[admin/budget GET]', error)
    return NextResponse.json({ error: 'Failed to load budget' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth
  try {
    const body = await req.json()
    const { asset, ...rest } = body
    if (!asset || !rest.category) {
      return NextResponse.json({ error: 'asset and category are required' }, { status: 400 })
    }
    const line: BudgetLine = {
      category: rest.category,
      budgeted: parseFloat(rest.budgeted || '0'),
      actual_to_date: parseFloat(rest.actual_to_date || '0'),
      projected_final: parseFloat(rest.projected_final || '0'),
      notes: rest.notes || '',
      sort_order: parseInt(rest.sort_order || '0', 10),
    }
    await appendBudgetLine(asset, line)
    await logActivity(auth.email, 'budget.create', `${asset}/${line.category}`, { asset })
    return NextResponse.json({ message: 'Budget line created' }, { status: 201 })
  } catch (error) {
    console.error('[admin/budget POST]', error)
    return NextResponse.json({ error: 'Failed to create budget line' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth
  try {
    const body = await req.json()
    const { asset, rowIndex, ...rest } = body
    if (!asset || !rowIndex) {
      return NextResponse.json({ error: 'asset and rowIndex are required' }, { status: 400 })
    }
    const line: BudgetLine = {
      category: rest.category,
      budgeted: parseFloat(rest.budgeted || '0'),
      actual_to_date: parseFloat(rest.actual_to_date || '0'),
      projected_final: parseFloat(rest.projected_final || '0'),
      notes: rest.notes || '',
      sort_order: parseInt(rest.sort_order || '0', 10),
    }
    await updateBudgetLine(asset, rowIndex, line)
    await logActivity(auth.email, 'budget.update', `${asset}/${line.category}`, { asset, rowIndex })
    return NextResponse.json({ message: 'Budget line updated' })
  } catch (error) {
    console.error('[admin/budget PATCH]', error)
    return NextResponse.json({ error: 'Failed to update budget line' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth
  try {
    const { asset, rowIndex } = await req.json()
    if (!asset || !rowIndex) {
      return NextResponse.json({ error: 'asset and rowIndex are required' }, { status: 400 })
    }
    await deleteBudgetLine(asset, rowIndex)
    await logActivity(auth.email, 'budget.delete', `${asset}/row${rowIndex}`, { asset, rowIndex })
    return NextResponse.json({ message: 'Budget line deleted' })
  } catch (error) {
    console.error('[admin/budget DELETE]', error)
    return NextResponse.json({ error: 'Failed to delete budget line' }, { status: 500 })
  }
}
