import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getArticleBySlug, KNOWLEDGE_CATEGORIES } from '@/lib/sheets/knowledge'

export const dynamic = 'force-dynamic'

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const article = await getArticleBySlug(slug)

  if (!article || !article.published) notFound()

  const catLabel = KNOWLEDGE_CATEGORIES.find((c) => c.value === article.category)?.label || article.category

  // Simple markdown to HTML
  const renderMarkdown = (md: string) => {
    return md
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .split('\n\n')
      .map((block) => {
        if (block.startsWith('<h')) return block
        if (block.startsWith('- ')) {
          const items = block.split('\n').filter((l) => l.startsWith('- '))
          return '<ul>' + items.map((i) => `<li>${i.slice(2)}</li>`).join('') + '</ul>'
        }
        return `<p>${block.replace(/\n/g, '<br/>')}</p>`
      })
      .join('\n')
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 py-16">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
        <Link href="/learn" className="hover:text-foreground transition-colors">Knowledge Base</Link>
        <span>/</span>
        <span>{catLabel}</span>
      </nav>

      <article>
        <header className="mb-8">
          <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">{catLabel}</div>
          <h1 className="text-3xl font-bold tracking-tight">{article.title}</h1>
          {article.tags && (
            <div className="flex flex-wrap gap-2 mt-4">
              {article.tags.split(',').map((t) => t.trim()).filter(Boolean).map((t) => (
                <span key={t} className="text-xs bg-muted rounded-full px-3 py-1 text-muted-foreground">{t}</span>
              ))}
            </div>
          )}
        </header>

        <div
          className="prose prose-zinc max-w-none"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(article.body) }}
        />
      </article>

      <div className="mt-12 pt-6 border-t">
        <Link href="/learn" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Back to Knowledge Base
        </Link>
      </div>
    </div>
  )
}
