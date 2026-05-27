import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import {
  getTimelineWithRows,
  appendMilestone,
  updateMilestone,
  deleteMilestone,
} from '@/lib/sheets/timeline'
import { getUser } from '@/lib/sheets/users'
import { appendSheetRow } from '@/lib/sheets/client'
import type { TimelineMilestone, MilestoneStatus } from '@/types'

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
    console.error('[admin/timeline] Failed to log activity:', e)
  }
}

export async function GET(req: NextRequest) {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth
  const asset = req.nextUrl.searchParams.get('asset')
  if (!asset) return NextResponse.json({ error: 'asset query param required' }, { status: 400 })
  try {
    const milestones = await getTimelineWithRows(asset)
    return NextResponse.json(milestones)
  } catch (error) {
    console.error('[admin/timeline GET]', error)
    return NextResponse.json({ error: 'Failed to load timeline' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth
  try {
    const body = await req.json()
    const { asset, ...rest } = body
    if (!asset || !rest.milestone || !rest.planned_date) {
      return NextResponse.json(
        { error: 'asset, milestone, and planned_date are required' },
        { status: 400 }
      )
    }
    const milestone: TimelineMilestone = {
      milestone: rest.milestone,
      planned_date: rest.planned_date,
      planned_end_date: rest.planned_end_date || undefined,
      actual_date: rest.actual_date || undefined,
      actual_end_date: rest.actual_end_date || undefined,
      status: (rest.status || 'upcoming') as MilestoneStatus,
      notes: rest.notes || '',
      sort_order: parseInt(rest.sort_order || '0', 10),
    }
    await appendMilestone(asset, milestone)
    await logActivity(auth.email, 'timeline.create', `${asset}/${milestone.milestone}`, { asset })
    return NextResponse.json({ message: 'Milestone created' }, { status: 201 })
  } catch (error) {
    console.error('[admin/timeline POST]', error)
    return NextResponse.json({ error: 'Failed to create milestone' }, { status: 500 })
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
    const milestone: TimelineMilestone = {
      milestone: rest.milestone,
      planned_date: rest.planned_date,
      planned_end_date: rest.planned_end_date || undefined,
      actual_date: rest.actual_date || undefined,
      actual_end_date: rest.actual_end_date || undefined,
      status: (rest.status || 'upcoming') as MilestoneStatus,
      notes: rest.notes || '',
      sort_order: parseInt(rest.sort_order || '0', 10),
    }
    await updateMilestone(asset, rowIndex, milestone)
    await logActivity(auth.email, 'timeline.update', `${asset}/${milestone.milestone}`, { asset, rowIndex })
    return NextResponse.json({ message: 'Milestone updated' })
  } catch (error) {
    console.error('[admin/timeline PATCH]', error)
    return NextResponse.json({ error: 'Failed to update milestone' }, { status: 500 })
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
    await deleteMilestone(asset, rowIndex)
    await logActivity(auth.email, 'timeline.delete', `${asset}/row${rowIndex}`, { asset, rowIndex })
    return NextResponse.json({ message: 'Milestone deleted' })
  } catch (error) {
    console.error('[admin/timeline DELETE]', error)
    return NextResponse.json({ error: 'Failed to delete milestone' }, { status: 500 })
  }
}
