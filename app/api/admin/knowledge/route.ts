import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { listArticles, appendArticle, updateArticle, deleteArticle } from '@/lib/sheets/knowledge'
import { slugify } from '@/lib/knowledge-utils'
import { getUser } from '@/lib/sheets/users'

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

export async function GET() {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth
  try {
    return NextResponse.json(await listArticles())
  } catch (e) {
    console.error('knowledge GET', e)
    return NextResponse.json({ error: 'Failed to load articles' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth
  try {
    const body = await req.json()
    const article = await appendArticle({
      category: body.category || 'team',
      title: body.title || '',
      slug: body.slug || slugify(body.title || `kb-${Date.now()}`),
      body: body.body || '',
      tags: body.tags || '',
      published: body.published ?? false,
      sort_order: parseInt(body.sort_order || '0'),
    })
    return NextResponse.json(article, { status: 201 })
  } catch (e) {
    console.error('knowledge POST', e)
    return NextResponse.json({ error: 'Failed to create article' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth
  try {
    const body = await req.json()
    const { id, ...updates } = body
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    if (updates.sort_order !== undefined) updates.sort_order = parseInt(updates.sort_order)
    if (updates.published !== undefined) updates.published = Boolean(updates.published)
    await updateArticle(id, updates)
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('knowledge PATCH', e)
    return NextResponse.json({ error: 'Failed to update article' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth
  try {
    const { id } = await req.json()
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    await deleteArticle(id)
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('knowledge DELETE', e)
    return NextResponse.json({ error: 'Failed to delete article' }, { status: 500 })
  }
}
