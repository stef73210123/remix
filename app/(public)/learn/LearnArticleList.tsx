import type { KnowledgeArticle, KnowledgeCategory } from '@/lib/knowledge-utils'

interface GroupedCategory {
  value: KnowledgeCategory
  label: string
  articles: KnowledgeArticle[]
}

// Parse first markdown image from body as a fallback
function extractFirstImage(body: string): string | null {
  const m = body.match(/!\[[^\]]*\]\(([^)]+)\)/)
  return m?.[1] || null
}

export default function LearnArticleList({ grouped }: { grouped: GroupedCategory[] }) {
  return (
    <div className="space-y-12">
      {grouped.map(({ value: cat, label, articles }) => (
        <section key={cat}>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">{label}</h2>
          <div className="divide-y rounded-lg border overflow-hidden">
            {articles.map((a) => {
              const img = a.image_url || extractFirstImage(a.body)
              return (
                <a
                  key={a.id}
                  href={`/learn/${a.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full text-left flex items-start gap-4 px-5 py-4 hover:bg-muted/30 transition-colors group"
                >
                  {/* Preview image */}
                  {img ? (
                    <div className="shrink-0 w-20 h-14 rounded-lg overflow-hidden bg-muted mt-0.5">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img}
                        alt=""
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                      />
                    </div>
                  ) : (
                    <div className="shrink-0 w-20 h-14 rounded-lg bg-muted/50 flex items-center justify-center mt-0.5">
                      <span className="text-2xl opacity-30">📄</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium group-hover:text-primary transition-colors">{a.title}</div>
                    {a.body && (
                      <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                        {a.body.replace(/!\[[^\]]*\]\([^)]+\)/g, '').replace(/[#*\[\]]/g, '').slice(0, 160)}
                      </p>
                    )}
                    {a.tags && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {a.tags.split(',').map((t) => t.trim()).filter(Boolean).map((t) => (
                          <span key={t} className="text-xs bg-muted rounded-full px-2 py-0.5 text-muted-foreground">{t}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="text-muted-foreground group-hover:text-primary mt-0.5 shrink-0 transition-colors">→</span>
                </a>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
