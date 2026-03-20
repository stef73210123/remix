import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import {
  listPipelineLeads,
  appendPipelineLead,
  updatePipelineLead,
  deletePipelineLead,
} from '@/lib/sheets/pipeline'
import { getUser } from '@/lib/sheets/users'
import { appendSheetRow } from '@/lib/sheets/client'
import type { PipelineStage } from '@/lib/sheets/pipeline'

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
    console.error('[admin/pipeline] Failed to log activity:', e)
  }
}

export async function GET() {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth
  try {
    const leads = await listPipelineLeads()
    return NextResponse.json(leads)
  } catch (error) {
    console.error('[admin/pipeline GET]', error)
    return NextResponse.json({ error: 'Failed to load pipeline' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth
  try {
    const body = await req.json()
    if (!body.name || !body.asset) {
      return NextResponse.json({ error: 'name and asset are required' }, { status: 400 })
    }
    const lead = await appendPipelineLead({
      name: body.name,
      email: body.email || '',
      phone: body.phone || '',
      asset: body.asset,
      target_amount: parseFloat(body.target_amount || '0'),
      actual_amount: parseFloat(body.actual_amount || '0'),
      stage: (body.stage || 'prospect') as PipelineStage,
      close_date: body.close_date || '',
      probability: parseFloat(body.probability || '0'),
      notes: body.notes || '',
    })
    await logActivity(auth.email, 'pipeline.create', lead.id, { name: body.name })
    return NextResponse.json({ message: 'Lead created', lead }, { status: 201 })
  } catch (error) {
    console.error('[admin/pipeline POST]', error)
    return NextResponse.json({ error: 'Failed to create lead' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth
  try {
    const body = await req.json()
    if (!body.id) return NextResponse.json({ error: 'id is required' }, { status: 400 })
    const { id, ...updates } = body
    if (updates.target_amount !== undefined) updates.target_amount = parseFloat(updates.target_amount)
    if (updates.actual_amount !== undefined) updates.actual_amount = parseFloat(updates.actual_amount)
    if (updates.probability !== undefined) updates.probability = parseFloat(updates.probability)
    await updatePipelineLead(id, updates)
    await logActivity(auth.email, 'pipeline.update', id, updates)
    return NextResponse.json({ message: 'Lead updated' })
  } catch (error) {
    console.error('[admin/pipeline PATCH]', error)
    return NextResponse.json({ error: 'Failed to update lead' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth
  try {
    const { id } = await req.json()
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })
    await deletePipelineLead(id)
    await logActivity(auth.email, 'pipeline.delete', id, {})
    return NextResponse.json({ message: 'Lead deleted' })
  } catch (error) {
    console.error('[admin/pipeline DELETE]', error)
    return NextResponse.json({ error: 'Failed to delete lead' }, { status: 500 })
  }
}
