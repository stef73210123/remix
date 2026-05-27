import { readSheetRange, appendSheetRow, updateSheetRow, deleteSheetRow, findRowIndex } from './client'
import type { KnowledgeCategory, KnowledgeArticle } from '@/lib/knowledge-utils'
export type { KnowledgeCategory, KnowledgeArticle } from '@/lib/knowledge-utils'
export { KNOWLEDGE_CATEGORIES } from '@/lib/knowledge-utils'

const TAB = 'Knowledge'

function rowToArticle(row: string[]): KnowledgeArticle {
  return {
    id: row[0] || '',
    category: (row[1] || 'team') as KnowledgeCategory,
    title: row[2] || '',
    slug: row[3] || '',
    body: row[4] || '',
    tags: row[5] || '',
    published: row[6] === 'true',
    sort_order: parseInt(row[7] || '0'),
    created_at: row[8] || '',
    updated_at: row[9] || '',
    image_url: row[10] || '',
  }
}

function articleToRow(a: KnowledgeArticle): string[] {
  return [
    a.id, a.category, a.title, a.slug, a.body, a.tags,
    String(a.published), String(a.sort_order), a.created_at, a.updated_at,
    a.image_url || '',
  ]
}


export async function listArticles(publishedOnly = false): Promise<KnowledgeArticle[]> {
  const rows = await readSheetRange(TAB)
  const articles = rows.filter((r) => r[0]).map(rowToArticle)
  return (publishedOnly ? articles.filter((a) => a.published) : articles)
    .sort((a, b) => a.sort_order - b.sort_order || a.title.localeCompare(b.title))
}

export async function getArticleBySlug(slug: string): Promise<KnowledgeArticle | null> {
  const rows = await readSheetRange(TAB)
  const row = rows.find((r) => r[3] === slug)
  return row ? rowToArticle(row) : null
}

export async function appendArticle(data: Omit<KnowledgeArticle, 'id' | 'created_at' | 'updated_at'>): Promise<KnowledgeArticle> {
  const now = new Date().toISOString().split('T')[0]
  const article: KnowledgeArticle = {
    ...data,
    id: `kb_${Date.now()}`,
    created_at: now,
    updated_at: now,
  }
  await appendSheetRow(TAB, articleToRow(article))
  return article
}

export async function updateArticle(id: string, updates: Partial<KnowledgeArticle>): Promise<void> {
  const rowIndex = await findRowIndex(TAB, id)
  if (rowIndex === -1) throw new Error('Article not found')
  const rows = await readSheetRange(TAB, undefined, true)
  const row = rows.find((r) => r[0] === id)
  if (!row) throw new Error('Article not found')
  const current = rowToArticle(row)
  const updated = { ...current, ...updates, id, updated_at: new Date().toISOString().split('T')[0] }
  await updateSheetRow(TAB, rowIndex, articleToRow(updated))
}

export async function deleteArticle(id: string): Promise<void> {
  const rowIndex = await findRowIndex(TAB, id)
  if (rowIndex !== -1) await deleteSheetRow(TAB, rowIndex)
}
