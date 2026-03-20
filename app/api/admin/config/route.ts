import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { getConfig, upsertConfigKey } from '@/lib/sheets/config'
import { getUser } from '@/lib/sheets/users'
import { appendSheetRow } from '@/lib/sheets/client'

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
    console.error('[admin/config] Failed to log activity:', e)
  }
}

export async function GET() {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth
  try {
    const config = await getConfig()
    return NextResponse.json(config)
  } catch (error) {
    console.error('[admin/config GET]', error)
    return NextResponse.json({ error: 'Failed to load config' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth
  try {
    // Body: { key: string, value: string } or { updates: Record<string, string> }
    const body = await req.json()

    if (body.updates && typeof body.updates === 'object') {
      // Bulk update
      const entries = Object.entries(body.updates as Record<string, string>)
      for (const [key, value] of entries) {
        await upsertConfigKey(key, String(value))
      }
      await logActivity(auth.email, 'config.bulk_update', 'Config', {
        keys: Object.keys(body.updates),
      })
      return NextResponse.json({ message: 'Config updated', count: entries.length })
    }

    if (!body.key) {
      return NextResponse.json({ error: 'key is required' }, { status: 400 })
    }
    await upsertConfigKey(body.key, String(body.value ?? ''))
    await logActivity(auth.email, 'config.update', body.key, { value: body.value })
    return NextResponse.json({ message: 'Config key updated' })
  } catch (error) {
    console.error('[admin/config PATCH]', error)
    return NextResponse.json({ error: 'Failed to update config' }, { status: 500 })
  }
}
