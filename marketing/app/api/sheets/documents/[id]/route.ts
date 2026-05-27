import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { getDocumentById } from '@/lib/sheets/documents'
import { generateSignedDownloadUrl } from '@/lib/storage/r2'
import type { UserRole, DocVisibility } from '@/types'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const headersList = await headers()
    const email = headersList.get('x-user-email')
    const role = headersList.get('x-user-role') as UserRole | null

    if (!email || !role) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const doc = await getDocumentById(id)

    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Check visibility
    const visibilityOrder: Record<DocVisibility, number> = { lp: 0, gp: 1, admin: 2 }
    const roleOrder: Record<UserRole, number> = { lp: 0, dealroom: 0, gp: 1, admin: 2 }
    if (roleOrder[role] < visibilityOrder[doc.visible_to]) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Check document belongs to this user (or is shared)
    if (doc.email !== 'all' && doc.email.toLowerCase() !== email.toLowerCase()) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Generate signed URL — never expose the r2_key
    const signedUrl = await generateSignedDownloadUrl(doc.r2_key)

    return NextResponse.redirect(signedUrl)
  } catch (error) {
    console.error('[sheets/documents] Error:', error)
    return NextResponse.json({ error: 'Failed to generate download link' }, { status: 500 })
  }
}
