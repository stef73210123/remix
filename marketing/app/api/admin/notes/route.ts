import { NextRequest, NextResponse } from 'next/server'
import { getAllNotes, getNotesForAsset, appendNote, deleteNote } from '@/lib/sheets/notes'
import { getAnnouncementsForAsset } from '@/lib/sheets/announcements'

export const dynamic = 'force-dynamic'

function requireAdmin(request: NextRequest) {
  const role = request.headers.get('x-user-role')
  if (role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return null
}

// GET /api/admin/notes?asset=...&type=...
// GET /api/admin/notes?feed=true  — all notes + announcements for the activity feed
export async function GET(request: NextRequest) {
  const err = requireAdmin(request)
  if (err) return err

  const { searchParams } = request.nextUrl
  const feed = searchParams.get('feed') === 'true'

  if (feed) {
    // Return all notes + all announcements — gracefully handle missing/empty sheet tabs
    const [notes, announcements] = await Promise.all([
      getAllNotes().catch(() => []),
      Promise.all(['livingstonfarm', 'wrenofthewoods', 'circularplatform'].map((a) =>
        getAnnouncementsForAsset(a).catch(() => [])
      )).then((res) => res.flat()),
    ])
    const feedItems = [
      ...notes.map((n) => ({ ...n, _kind: 'note' as const })),
      ...announcements.map((a) => ({
        id: a.id,
        type: 'announcement' as const,
        asset: a.asset,
        ref_id: '',
        ref_label: '',
        title: a.title,
        body: a.body,
        posted_by: a.posted_by,
        posted_at: a.posted_at,
        _kind: 'announcement' as const,
      })),
    ].sort((a, b) => b.posted_at.localeCompare(a.posted_at))
    return NextResponse.json(feedItems)
  }

  const asset = searchParams.get('asset') || ''
  const refId = searchParams.get('ref_id') || ''
  const type = searchParams.get('type') as 'timeline' | 'budget' | 'post' | null
  const notes = asset ? await getNotesForAsset(asset, type || undefined) : await getAllNotes()
  const filtered = refId ? notes.filter((n) => n.ref_id === refId) : notes
  return NextResponse.json(filtered)
}

// POST /api/admin/notes
export async function POST(request: NextRequest) {
  const err = requireAdmin(request)
  if (err) return err

  const adminEmail = request.headers.get('x-user-email') || 'admin'
  const { type, asset, ref_id, ref_label, title, body, media_urls } = await request.json()

  if (!type || !title) {
    return NextResponse.json({ error: 'type and title are required' }, { status: 400 })
  }

  const note = await appendNote({
    type,
    asset: asset || '',
    ref_id: ref_id || '',
    ref_label: ref_label || '',
    title,
    body: body || '',
    media_urls: Array.isArray(media_urls) ? media_urls.join(',') : (media_urls || ''),
    posted_by: adminEmail,
    posted_at: new Date().toISOString(),
  })

  return NextResponse.json(note)
}

// DELETE /api/admin/notes?id=...
export async function DELETE(request: NextRequest) {
  const err = requireAdmin(request)
  if (err) return err

  const id = request.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  await deleteNote(id)
  return NextResponse.json({ success: true })
}
