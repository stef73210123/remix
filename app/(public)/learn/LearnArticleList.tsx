'use client'

import { useState, useEffect, useCallback } from 'react'
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

// Minimal markdown → HTML for lightbox body
function renderMarkdown(md: string): string {
  return md
    .replace(/^### (.+)$/gm, '<h3 class="text-xl font-semibold mt-8 mb-3">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-2xl font-bold mt-10 mb-4">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-3xl font-bold mt-12 mb-5">$1</h1>')
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="w-full rounded-xl my-6 object-cover max-h-96" />')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" class="text-primary underline underline-offset-2">$1</a>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .split('\n\n')
    .map((block) => {
      if (block.startsWith('<h') || block.startsWith('<img')) return block
      if (block.startsWith('- ')) {
        const items = block.split('\n').filter((l) => l.startsWith('- '))
        return '<ul class="list-disc pl-6 space-y-1 my-4">' + items.map((i) => `<li>${i.slice(2)}</li>`).join('') + '</ul>'
      }
      return `<p class="mb-4 leading-relaxed">${block.replace(/\n/g, '<br/>')}</p>`
    })
    .join('\n')
}

export default function LearnArticleList({ grouped }: { grouped: GroupedCategory[] }) {
  const [open, setOpen] = useState<KnowledgeArticle | null>(null)

  const close = useCallback(() => setOpen(null), [])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    document.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [open, close])

  const catLabel = (cat: KnowledgeCategory) =>
    grouped.find((g) => g.value === cat)?.label || cat

  return (
    <>
      <div className="space-y-12">
        {grouped.map(({ value: cat, label, articles }) => (
          <section key={cat}>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">{label}</h2>
            <div className="divide-y rounded-lg border overflow-hidden">
              {articles.map((a) => {
                const img = a.image_url || extractFirstImage(a.body)
                return (
                  <button
                    key={a.id}
                    onClick={() => setOpen(a)}
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
                  </button>
                )
              })}
            </div>
          </section>
        ))}
      </div>

      {/* Lightbox */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm overflow-y-auto py-8 px-4"
          onClick={(e) => { if (e.target === e.currentTarget) close() }}
        >
          <div className="relative bg-white w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden">
            {/* Hero image */}
            {(open.image_url || extractFirstImage(open.body)) && (
              <div className="w-full h-64 bg-muted overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={open.image_url || extractFirstImage(open.body)!}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Close button */}
            <button
              onClick={close}
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center transition-colors z-10"
              aria-label="Close"
            >
              ✕
            </button>

            {/* Content */}
            <div className="px-8 py-8">
              <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                {catLabel(open.category)}
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-4">{open.title}</h1>

              {open.tags && (
                <div className="flex flex-wrap gap-2 mb-8">
                  {open.tags.split(',').map((t) => t.trim()).filter(Boolean).map((t) => (
                    <span key={t} className="text-xs bg-gray-100 rounded-full px-3 py-1 text-gray-500">{t}</span>
                  ))}
                </div>
              )}

              <div
                className="prose prose-zinc max-w-none text-gray-700 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(open.body) }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
