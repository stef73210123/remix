import { listArticles } from '@/lib/sheets/knowledge'
import { KNOWLEDGE_CATEGORIES } from '@/lib/sheets/knowledge'
import LearnArticleList from './LearnArticleList'

export const revalidate = 60

export default async function LearnPage() {
  const articles = await listArticles(true)

  const grouped = KNOWLEDGE_CATEGORIES.map((cat) => ({
    ...cat,
    articles: articles.filter((a) => a.category === cat.value),
  })).filter((g) => g.articles.length > 0)

  return (
    <div className="container mx-auto max-w-4xl px-4 py-16">
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight">Knowledge Base</h1>
        <p className="text-muted-foreground mt-2 text-lg">
          Markets, context, and team — everything you need to understand the Circular opportunity.
        </p>
      </div>

      {grouped.length === 0 ? (
        <p className="text-muted-foreground">Articles coming soon.</p>
      ) : (
        <LearnArticleList grouped={grouped} />
      )}
    </div>
  )
}
