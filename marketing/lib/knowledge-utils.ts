// Client-safe knowledge base constants and utilities (no server imports)

export interface KnowledgeArticle {
  id: string
  category: KnowledgeCategory
  title: string
  slug: string
  body: string
  tags: string
  published: boolean
  sort_order: number
  created_at: string
  updated_at: string
  image_url?: string
}

export type KnowledgeCategory =
  | 'regenerative-agriculture'
  | 'armonk'
  | 'livingston-manor'
  | 'catskills-hotel-market'
  | 'westchester-restaurant-market'
  | 'team'

export const KNOWLEDGE_CATEGORIES: { value: KnowledgeCategory; label: string }[] = [
  { value: 'regenerative-agriculture', label: 'Regenerative Agriculture' },
  { value: 'armonk', label: 'Town of Armonk' },
  { value: 'livingston-manor', label: 'Town of Livingston Manor' },
  { value: 'catskills-hotel-market', label: 'Catskills Hotel Market' },
  { value: 'westchester-restaurant-market', label: 'Westchester Restaurant Market' },
  { value: 'team', label: 'Team' },
]

export function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}
