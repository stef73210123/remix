import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { listUsersWithStatus, getUser, upsertUser, deleteUser } from '@/lib/sheets/users'
import { appendSheetRow } from '@/lib/sheets/client'
import { createInviteToken } from '@/lib/auth/magic-link'
import { sendInviteEmail } from '@/lib/email/send'
import type { User, UserRole } from '@/types'

async function requireAdmin(): Promise<{ email: string } | NextResponse> {
  const headersList = await headers()
  const email = headersList.get('x-user-email')
  const role = headersList.get('x-user-role')

  if (!email || role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Re-verify from source of truth (not just JWT)
  const user = await getUser(email)
  if (!user || !user.active || user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return { email }
}

async function logActivity(
  adminEmail: string,
  action: string,
  target: string,
  details: object
) {
  try {
    await appendSheetRow('Admin_Activity', [
      new Date().toISOString(),
      adminEmail,
      action,
      target,
      JSON.stringify(details),
    ])
  } catch (e) {
    console.error('[admin/users] Failed to log activity:', e)
  }
}

export async function GET() {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth

  try {
    const users = await listUsersWithStatus()
    return NextResponse.json(users)
  } catch (error) {
    console.error('[admin/users GET] Error:', error)
    return NextResponse.json({ error: 'Failed to list users' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth

  try {
    const body = await req.json()
    const { email, name, role, asset_access, active, notes } = body

    if (!email || !name || !role) {
      return NextResponse.json({ error: 'email, name, and role are required' }, { status: 400 })
    }

    const validRoles: UserRole[] = ['admin', 'gp', 'lp', 'dealroom']
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    const existing = await getUser(email)
    if (existing) {
      return NextResponse.json({ error: 'User already exists' }, { status: 409 })
    }

    const newUser: User = {
      email: email.trim().toLowerCase(),
      name: name.trim(),
      role,
      asset_access: Array.isArray(asset_access) ? asset_access : [],
      active: active !== false,
      created_at: new Date().toISOString().split('T')[0],
      notes: notes || '',
    }

    await upsertUser(newUser)
    await logActivity(auth.email, 'user.create', email, { name, role })

    // Send invite email so user can set their password
    try {
      const inviteToken = await createInviteToken(newUser.email)
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://circular.enterprises'
      const inviteUrl = `${siteUrl}/auth/set-password?token=${encodeURIComponent(inviteToken)}`
      await sendInviteEmail(newUser.email, newUser.name, inviteUrl)
    } catch (emailError) {
      console.error('[admin/users POST] Failed to send invite email:', emailError)
    }

    return NextResponse.json({ message: 'User created', user: newUser }, { status: 201 })
  } catch (error) {
    console.error('[admin/users POST] Error:', error)
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth

  try {
    const body = await req.json()
    const { email, ...updates } = body

    if (!email) {
      return NextResponse.json({ error: 'email is required' }, { status: 400 })
    }

    const existing = await getUser(email)
    if (!existing) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const updated: User = {
      ...existing,
      ...updates,
      email: existing.email, // Don't allow email changes
    }

    await upsertUser(updated)
    await logActivity(auth.email, 'user.update', email, updates)

    return NextResponse.json({ message: 'User updated', user: updated })
  } catch (error) {
    console.error('[admin/users PATCH] Error:', error)
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth

  try {
    const { email } = await req.json()
    if (!email) {
      return NextResponse.json({ error: 'email is required' }, { status: 400 })
    }

    await deleteUser(email)
    await logActivity(auth.email, 'user.delete', email, {})

    return NextResponse.json({ message: 'User deactivated' })
  } catch (error) {
    console.error('[admin/users DELETE] Error:', error)
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 })
  }
}
