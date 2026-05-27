'use client'

import { useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { ASSET_NAMES } from '@/types'
import type { AssetSlug } from '@/types'
import { MediaUploader } from '@/components/shared/MediaUploader'
import { FeedMediaPreview } from '@/components/shared/FeedMediaPreview'

function BookmarkIcon({ filled }: { filled: boolean }) {
  return filled ? (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" className="text-amber-500">
      <path d="M5 3h14a1 1 0 0 1 1 1v17.27a.5.5 0 0 1-.78.42L12 17.27l-7.22 4.42A.5.5 0 0 1 4 21.27V4a1 1 0 0 1 1-1z"/>
    </svg>
  ) : (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21l-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
    </svg>
  )
}
import type { NewsItem } from '@/app/api/admin/news/route'
import type { KnowledgeArticle } from '@/lib/knowledge-utils'

interface FeedItem {
  id: string
  type: 'timeline' | 'budget' | 'post' | 'announcement'
  _kind: 'note' | 'announcement'
  asset: string
  ref_id: string
  ref_label: string
  title: string
  body: string
  posted_by: string
  posted_at: string
  media_urls?: string
}

interface DisplayItem {
  id: string
  kind: 'note' | 'news' | 'knowledge'
  type: string
  asset?: string
  ref_label?: string
  title: string
  body?: string
  posted_by?: string
  posted_at: string
  media_urls?: string
  link?: string
  source?: string
  imageUrl?: string | null
  topic?: string
  _kind?: 'note' | 'announcement'
  slug?: string
  category?: string
  tags?: string
}

const TYPE_LABEL: Record<string, string> = {
  bookmarked: 'Bookmarked',
  timeline: 'Timeline',
  budget: 'Budget',
  post: 'Post',
  announcement: 'Announcement',
  news: 'News',
  knowledge: 'Knowledge',
}

const TYPE_COLOR: Record<string, string> = {
  timeline: '#0ea5e9',
  budget: '#f59e0b',
  post: '#6b7280',
  announcement: '#8b5cf6',
  news: '#16a34a',
  knowledge: '#6366f1',
}

const FILTER_TYPES = ['all', 'bookmarked', 'news', 'knowledge', 'announcement', 'timeline', 'budget', 'post']

function timeAgo(iso: string) {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  const diff = (Date.now() - d.getTime()) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function parseMediaUrls(raw?: string): string[] {
  if (!raw) return []
  return raw.split(/[\n,]/).map((u) => u.trim()).filter(Boolean)
}

function categoryLabel(cat?: string): string {
  if (!cat) return 'Knowledge'
  return cat.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

export default function AdminFeedPage() {
  const [items, setItems] = useState<FeedItem[]>([])
  const [news, setNews] = useState<NewsItem[]>([])
  const [knowledgeArticles, setKnowledgeArticles] = useState<KnowledgeArticle[]>([])
  const [loading, setLoading] = useState(true)
  const [newsLoading, setNewsLoading] = useState(true)
  const [knowledgeLoading, setKnowledgeLoading] = useState(true)
  const [postDialogOpen, setPostDialogOpen] = useState(false)
  const [postForm, setPostForm] = useState({ title: '', body: '' })
  const [postMedia, setPostMedia] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set())

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('feed_bookmarks') || '[]')
      setBookmarks(new Set(saved))
    } catch { /* ignore */ }
  }, [])

  const toggleBookmark = (id: string) => {
    setBookmarks((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      try { localStorage.setItem('feed_bookmarks', JSON.stringify(Array.from(next))) } catch { /* ignore */ }
      return next
    })
  }

  const loadOnce = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/notes?feed=true')
      if (!res.ok) throw new Error()
      const data = await res.json()
      setItems(Array.isArray(data) ? data : [])
    } catch {
      toast.error('Failed to load feed')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadNews = useCallback(async () => {
    setNewsLoading(true)
    try {
      const res = await fetch('/api/admin/news')
      if (!res.ok) {
        console.warn('[Feed] News load failed:', res.status)
        return
      }
      const data = await res.json()
      setNews(Array.isArray(data) ? data : [])
    } catch (err) {
      console.warn('[Feed] News fetch error:', err)
    } finally {
      setNewsLoading(false)
    }
  }, [])

  const loadKnowledge = useCallback(async () => {
    setKnowledgeLoading(true)
    try {
      const res = await fetch('/api/admin/knowledge')
      if (!res.ok) return
      const all: KnowledgeArticle[] = await res.json()
      setKnowledgeArticles(all.filter((a) => a.published))
    } catch {
      // silently skip
    } finally {
      setKnowledgeLoading(false)
    }
  }, [])

  useEffect(() => { loadOnce(); loadNews(); loadKnowledge() }, [loadOnce, loadNews, loadKnowledge])

  const handlePost = async () => {
    if (!postForm.title) { toast.error('Title is required'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/admin/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'post',
          asset: '',
          ref_id: '',
          ref_label: '',
          title: postForm.title,
          body: postForm.body,
          media_urls: postMedia,
        }),
      })
      if (!res.ok) { toast.error('Failed to post'); return }
      toast.success('Posted')
      setPostDialogOpen(false)
      setPostForm({ title: '', body: '' })
      setPostMedia([])
      loadOnce()
    } catch {
      toast.error('Network error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string, kind: string) => {
    if (kind === 'announcement') { toast.error('Announcements cannot be deleted from the feed'); return }
    try {
      const res = await fetch(`/api/admin/notes?id=${id}`, { method: 'DELETE' })
      if (!res.ok) { toast.error('Failed to delete'); return }
      toast.success('Deleted')
      loadOnce()
    } catch {
      toast.error('Network error')
    }
  }

  const noteItems: DisplayItem[] = items.map((item) => ({
    id: item.id,
    kind: 'note' as const,
    type: item.type,
    asset: item.asset,
    ref_label: item.ref_label,
    title: item.title,
    body: item.body,
    posted_by: item.posted_by,
    posted_at: item.posted_at,
    media_urls: item.media_urls,
    _kind: item._kind,
  }))

  const newsItems: DisplayItem[] = news.map((n) => ({
    id: n.id,
    kind: 'news' as const,
    type: 'news',
    title: n.title,
    posted_at: n.pubDate,
    link: n.link,
    source: n.source,
    imageUrl: n.imageUrl,
    topic: n.topic,
  }))

  const kbItems: DisplayItem[] = knowledgeArticles.map((a) => ({
    id: `kb-${a.id}`,
    kind: 'knowledge' as const,
    type: 'knowledge',
    title: a.title,
    posted_at: a.id,
    imageUrl: a.image_url || null,
    slug: a.slug,
    category: a.category,
    tags: a.tags,
    body: a.body?.replace(/!\[[^\]]*\]\([^)]+\)/g, '').replace(/[#*[\]]/g, '').slice(0, 160),
  }))

  const allItems: DisplayItem[] = [...noteItems, ...newsItems, ...kbItems].sort(
    (a, b) => new Date(b.posted_at).getTime() - new Date(a.posted_at).getTime()
  )

  const q = search.toLowerCase()
  const displayed = allItems
    .filter((i) => filter === 'all' || (filter === 'bookmarked' ? bookmarks.has(i.id) : i.type === filter))
    .filter((i) =>
      !q ||
      i.title.toLowerCase().includes(q) ||
      (i.source || '').toLowerCase().includes(q) ||
      (i.topic || '').toLowerCase().includes(q) ||
      (i.ref_label || '').toLowerCase().includes(q)
    )

  const isLoading = loading || newsLoading || knowledgeLoading

  const counts: Record<string, number> = { all: allItems.length, bookmarked: bookmarks.size }
  for (const t of ['news', 'knowledge', 'announcement', 'timeline', 'budget', 'post']) {
    counts[t] = allItems.filter((i) => i.type === t).length
  }

  return (
    <div className="container mx-auto max-w-3xl px-4">
      <div className="sticky top-0 z-20 bg-background pt-10 pb-4 border-b mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Feed</h1>
            <p className="text-muted-foreground mt-0.5 text-sm">Activity, announcements, and industry news.</p>
          </div>
          <Button onClick={() => setPostDialogOpen(true)}>New Post</Button>
        </div>

        <Input
          placeholder="Search feed…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-3 h-8 text-sm"
        />

        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
          {FILTER_TYPES.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`shrink-0 flex items-center gap-1 px-3 py-1 rounded-full text-xs border transition-colors ${
                filter === f
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
              }`}
            >
              {f === 'all' ? 'All' : TYPE_LABEL[f]}
              {counts[f] > 0 && (
                <span className={`text-[10px] font-medium ${filter === f ? 'opacity-70' : 'opacity-50'}`}>
                  {counts[f]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="pb-12">
        {isLoading ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Loading…</p>
        ) : displayed.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            {search ? `No results for "${search}"` : 'No items yet.'}
          </p>
        ) : (
          <div className="space-y-3">
            {displayed.map((item) => {
              if (item.kind === 'news') {
                return (
                  <div key={item.id} className="rounded-xl border bg-background p-4 flex gap-4 hover:border-primary/40 hover:bg-muted/20 transition-colors group relative">
                    <button
                      onClick={() => toggleBookmark(item.id)}
                      className="absolute top-3 right-3 text-muted-foreground/40 hover:text-amber-500 transition-colors z-10"
                      title={bookmarks.has(item.id) ? 'Remove bookmark' : 'Bookmark'}
                    >
                      <BookmarkIcon filled={bookmarks.has(item.id)} />
                    </button>
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex gap-4 flex-1 min-w-0"
                    >
                      {item.imageUrl && (
                        <div className="shrink-0 w-24 h-16 rounded-lg overflow-hidden bg-muted">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={item.imageUrl}
                            alt=""
                            className="w-full h-full object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1.5 flex-wrap pr-6">
                          <span
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-white text-[10px] font-medium"
                            style={{ backgroundColor: TYPE_COLOR.news }}
                          >
                            {item.topic || 'News'}
                          </span>
                          <span className="ml-auto">{timeAgo(item.posted_at)}</span>
                        </div>
                        <div className="font-medium text-sm leading-snug group-hover:text-primary transition-colors line-clamp-2">
                          {item.title}
                        </div>
                        {item.source && (
                          <div className="text-xs text-muted-foreground mt-1">{item.source} ↗</div>
                        )}
                      </div>
                    </a>
                  </div>
                )
              }

              if (item.kind === 'knowledge') {
                return (
                  <div key={item.id} className="rounded-xl border bg-background p-4 flex gap-4 hover:border-primary/40 hover:bg-muted/20 transition-colors group relative">
                    <button
                      onClick={() => toggleBookmark(item.id)}
                      className="absolute top-3 right-3 text-muted-foreground/40 hover:text-amber-500 transition-colors z-10"
                      title={bookmarks.has(item.id) ? 'Remove bookmark' : 'Bookmark'}
                    >
                      <BookmarkIcon filled={bookmarks.has(item.id)} />
                    </button>
                    <a
                      href="/learn"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex gap-4 flex-1 min-w-0"
                    >
                      {item.imageUrl && (
                        <div className="shrink-0 w-24 h-16 rounded-lg overflow-hidden bg-muted">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={item.imageUrl}
                            alt=""
                            className="w-full h-full object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1.5 flex-wrap pr-6">
                          <span
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-white text-[10px] font-medium"
                            style={{ backgroundColor: TYPE_COLOR.knowledge }}
                          >
                            {categoryLabel(item.category)}
                          </span>
                          <span className="ml-auto text-muted-foreground/60">Knowledge Base</span>
                        </div>
                        <div className="font-medium text-sm leading-snug group-hover:text-primary transition-colors line-clamp-2">
                          {item.title}
                        </div>
                        {item.body && (
                          <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.body}</div>
                        )}
                        {item.tags && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {item.tags.split(',').map((t) => t.trim()).filter(Boolean).map((tag) => (
                              <span key={tag} className="text-[10px] bg-muted rounded-full px-1.5 py-0.5 text-muted-foreground">{tag}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </a>
                  </div>
                )
              }

              const mediaUrls = parseMediaUrls(item.media_urls)
              return (
                <div
                  key={item.id || item.posted_at}
                  className="rounded-xl border bg-background p-4 flex flex-col gap-1.5 relative"
                >
                  <button
                    onClick={() => toggleBookmark(item.id)}
                    className="absolute top-3 right-3 text-muted-foreground/40 hover:text-amber-500 transition-colors"
                    title={bookmarks.has(item.id) ? 'Remove bookmark' : 'Bookmark'}
                  >
                    <BookmarkIcon filled={bookmarks.has(item.id)} />
                  </button>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap pr-6">
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-white text-[10px] font-medium"
                      style={{ backgroundColor: TYPE_COLOR[item.type] || '#6b7280' }}
                    >
                      {TYPE_LABEL[item.type] || item.type}
                    </span>
                    {item.asset && (
                      <span className="border rounded px-1.5 py-0.5">
                        {ASSET_NAMES[item.asset as AssetSlug] || item.asset}
                      </span>
                    )}
                    {item.ref_label && (
                      <span className="text-muted-foreground/70">· {item.ref_label}</span>
                    )}
                    <span className="ml-auto">{timeAgo(item.posted_at)}</span>
                    {item.posted_by && (
                      <span className="text-muted-foreground/60">{item.posted_by}</span>
                    )}
                  </div>
                  <div className="font-medium text-sm">{item.title}</div>
                  {item.body && (
                    <div className="text-sm text-muted-foreground whitespace-pre-line">{item.body}</div>
                  )}
                  {mediaUrls.length > 0 && <FeedMediaPreview urls={mediaUrls} />}
                  {item._kind === 'note' && (
                    <div className="flex justify-end mt-1">
                      <button
                        className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                        onClick={() => handleDelete(item.id, item.type)}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <Dialog open={postDialogOpen} onOpenChange={setPostDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New Admin Post</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-xs text-muted-foreground">This post will only be visible to admins in the feed.</p>
            <div className="space-y-1">
              <Label>Title</Label>
              <Input value={postForm.title} onChange={(e) => setPostForm((f) => ({ ...f, title: e.target.value }))} placeholder="Post title" />
            </div>
            <div className="space-y-1">
              <Label>Body (optional)</Label>
              <Textarea value={postForm.body} onChange={(e) => setPostForm((f) => ({ ...f, body: e.target.value }))} placeholder="Details…" rows={4} />
            </div>
            <div className="space-y-1">
              <Label>Media (optional)</Label>
              <MediaUploader value={postMedia} onChange={setPostMedia} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPostDialogOpen(false)}>Cancel</Button>
            <Button onClick={handlePost} disabled={saving}>{saving ? 'Posting…' : 'Post'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
