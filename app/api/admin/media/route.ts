import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import {
  getAssetMediaWithRows,
  appendMedia,
  updateMedia,
  deleteMedia,
} from '@/lib/sheets/media'
import { getUser } from '@/lib/sheets/users'
import { appendSheetRow } from '@/lib/sheets/client'
import type { AssetMediaType } from '@/types'

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
    console.error('[admin/media] Failed to log activity:', e)
  }
}

export async function GET(req: NextRequest) {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth
  const asset = req.nextUrl.searchParams.get('asset')
  if (!asset) return NextResponse.json({ error: 'asset param required' }, { status: 400 })
  try {
    const media = await getAssetMediaWithRows(asset)
    return NextResponse.json(media)
  } catch (error) {
    console.error('[admin/media GET]', error)
    return NextResponse.json({ error: 'Failed to load media' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth
  try {
    const body = await req.json()
    if (!body.asset || !body.url) {
      return NextResponse.json({ error: 'asset and url are required' }, { status: 400 })
    }
    const media = await appendMedia({
      asset: body.asset,
      type: (body.type || 'image') as AssetMediaType,
      url: body.url,
      caption: body.caption || '',
      sort_order: parseInt(body.sort_order || '0', 10),
    })
    await logActivity(auth.email, 'media.create', media.id, { asset: body.asset, type: body.type })
    return NextResponse.json({ message: 'Media added', media }, { status: 201 })
  } catch (error) {
    console.error('[admin/media POST]', error)
    return NextResponse.json({ error: 'Failed to add media' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth
  try {
    const body = await req.json()
    if (!body.rowIndex || !body.id) {
      return NextResponse.json({ error: 'rowIndex and id are required' }, { status: 400 })
    }
    await updateMedia(body.rowIndex, {
      id: body.id,
      asset: body.asset,
      type: body.type,
      url: body.url,
      caption: body.caption || '',
      sort_order: parseInt(body.sort_order || '0', 10),
    })
    await logActivity(auth.email, 'media.update', body.id, { asset: body.asset })
    return NextResponse.json({ message: 'Media updated' })
  } catch (error) {
    console.error('[admin/media PATCH]', error)
    return NextResponse.json({ error: 'Failed to update media' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth
  try {
    const { rowIndex, id } = await req.json()
    if (!rowIndex) return NextResponse.json({ error: 'rowIndex is required' }, { status: 400 })
    await deleteMedia(rowIndex)
    await logActivity(auth.email, 'media.delete', id || `row${rowIndex}`, {})
    return NextResponse.json({ message: 'Media deleted' })
  } catch (error) {
    console.error('[admin/media DELETE]', error)
    return NextResponse.json({ error: 'Failed to delete media' }, { status: 500 })
  }
}
