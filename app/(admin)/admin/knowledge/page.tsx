'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import type { KnowledgeArticle, KnowledgeCategory } from '@/lib/knowledge-utils'
import { KNOWLEDGE_CATEGORIES, slugify } from '@/lib/knowledge-utils'

// ─── Combobox with "Add new" ─────────────────────────────────────────────────

interface ComboOption { value: string; label: string }

function ComboboxWithAdd({
  value,
  options,
  onSelect,
  onAddNew,
  placeholder = 'Select…',
}: {
  value: string
  options: ComboOption[]
  onSelect: (v: string) => void
  onAddNew: (label: string) => void
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = options.filter((o) =>
    o.label.toLowerCase().includes(query.toLowerCase()) ||
    o.value.toLowerCase().includes(query.toLowerCase())
  )
  const hasExact = filtered.some(
    (o) => o.label.toLowerCase() === query.toLowerCase() || o.value.toLowerCase() === query.toLowerCase()
  )
  const showAdd = query.trim().length > 0 && !hasExact
  const currentLabel = options.find((o) => o.value === value)?.label || value

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleOpen = () => {
    setOpen((o) => !o)
    setQuery('')
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={handleOpen}
        className="w-full flex items-center justify-between border rounded-md px-3 py-2 text-sm bg-background hover:bg-muted/30 transition-colors text-left"
      >
        <span className={value ? '' : 'text-muted-foreground'}>{currentLabel || placeholder}</span>
        <svg className="w-4 h-4 text-muted-foreground shrink-0 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-md border bg-background shadow-lg">
          <div className="p-1.5 border-b">
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
              className="w-full px-2 py-1 text-sm outline-none bg-transparent"
            />
          </div>
          <div className="max-h-48 overflow-y-auto py-1">
            {filtered.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => { onSelect(o.value); setOpen(false); setQuery('') }}
                className={`w-full text-left px-3 py-1.5 text-sm hover:bg-muted/50 transition-colors ${
                  value === o.value ? 'font-medium text-primary' : ''
                }`}
              >
                {o.label}
              </button>
            ))}
            {showAdd && (
              <button
                type="button"
                onClick={() => { onAddNew(query.trim()); setOpen(false); setQuery('') }}
                className="w-full text-left px-3 py-1.5 text-sm text-primary hover:bg-primary/10 transition-colors border-t mt-1"
              >
                + Add &ldquo;{query.trim()}&rdquo;
              </button>
            )}
            {filtered.length === 0 && !showAdd && (
              <p className="text-sm text-muted-foreground px-3 py-2">No options found</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── URL Preview card ────────────────────────────────────────────────────────

interface UrlMeta { title: string; description: string; image: string; siteName: string; url: string }

// ─── Form state ──────────────────────────────────────────────────────────────

interface FormState {
  category: string
  title: string
  slug: string
  body: string
  tags: string
  published: boolean
  sort_order: string
  image_url: string
}

const emptyForm = (): FormState => ({
  category: 'team',
  title: '',
  slug: '',
  body: '',
  tags: '',
  published: false,
  sort_order: '0',
  image_url: '',
})

const CATEGORY_COLORS: Record<string, string> = {
  'regenerative-agriculture': 'bg-green-100 text-green-700',
  'armonk': 'bg-blue-100 text-blue-700',
  'livingston-manor': 'bg-amber-100 text-amber-700',
  'catskills-hotel-market': 'bg-purple-100 text-purple-700',
  'westchester-restaurant-market': 'bg-orange-100 text-orange-700',
  'team': 'bg-zinc-100 text-zinc-700',
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function AdminKnowledgePage() {
  const [articles, setArticles] = useState<KnowledgeArticle[]>([])
  const [loading, setLoading] = useState(true)
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm())
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<KnowledgeArticle | null>(null)
  const [preview, setPreview] = useState(false)

  // URL-first flow (new article only)
  const [newArticleMode, setNewArticleMode] = useState<'url' | 'editor'>('url')
  const [urlInput, setUrlInput] = useState('')
  const [urlMeta, setUrlMeta] = useState<UrlMeta | null>(null)
  const [urlFetching, setUrlFetching] = useState(false)

  // Extra categories added at runtime
  const [extraCategories, setExtraCategories] = useState<ComboOption[]>([])
  const allCategories: ComboOption[] = [
    ...KNOWLEDGE_CATEGORIES.map((c) => ({ value: c.value, label: c.label })),
    ...extraCategories,
  ]

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/knowledge')
      if (!res.ok) throw new Error()
      setArticles(await res.json())
    } catch {
      toast.error('Failed to load articles')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Derive any categories from existing articles that aren't in the base list
  useEffect(() => {
    const baseValues = new Set(KNOWLEDGE_CATEGORIES.map((c) => c.value))
    const custom: ComboOption[] = []
    for (const a of articles) {
      if (!baseValues.has(a.category) && !custom.find((c) => c.value === a.category)) {
        custom.push({ value: a.category, label: a.category.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) })
      }
    }
    if (custom.length > 0) setExtraCategories(custom)
  }, [articles])

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm())
    setUrlInput('')
    setUrlMeta(null)
    setPreview(false)
    setNewArticleMode('url')
    setDialogOpen(true)
  }

  const openEdit = (a: KnowledgeArticle) => {
    setEditingId(a.id)
    setForm({
      category: a.category,
      title: a.title,
      slug: a.slug,
      body: a.body,
      tags: a.tags,
      published: a.published,
      sort_order: String(a.sort_order),
      image_url: a.image_url || '',
    })
    setUrlInput('')
    setUrlMeta(null)
    setPreview(false)
    setDialogOpen(true)
  }

  const fetchUrlMeta = useCallback(async (url: string) => {
    if (!url.startsWith('http')) return
    setUrlFetching(true)
    try {
      const res = await fetch(`/api/admin/url-preview?url=${encodeURIComponent(url)}`)
      if (!res.ok) return
      const data: UrlMeta = await res.json()
      setUrlMeta(data)
      setForm((f) => ({
        ...f,
        title: f.title || data.title,
        slug: f.slug || slugify(data.title),
        body: f.body || (data.description ? `${data.description}\n\n[Read more](${url})` : `[Read more](${url})`),
      }))
    } catch {
      // ignore
    } finally {
      setUrlFetching(false)
    }
  }, [])

  const handleUrlChange = (val: string) => {
    setUrlInput(val)
    setUrlMeta(null)
    if (val.startsWith('http')) {
      const timer = setTimeout(() => fetchUrlMeta(val), 600)
      return () => clearTimeout(timer)
    }
  }

  const handleSave = async () => {
    const title = form.title.trim() || urlMeta?.title || ''
    if (!title) { toast.error('Title is required'); return }
    setSaving(true)
    try {
      const slug = form.slug.trim() || slugify(title)
      const method = editingId ? 'PATCH' : 'POST'
      const body = editingId
        ? { id: editingId, ...form, title, slug }
        : { ...form, title, slug }
      const res = await fetch('/api/admin/knowledge', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Save failed'); return }
      toast.success(editingId ? 'Article updated' : 'Article created')
      setDialogOpen(false)
      load()
    } catch {
      toast.error('Network error')
    } finally {
      setSaving(false)
    }
  }

  const togglePublished = async (a: KnowledgeArticle) => {
    try {
      const res = await fetch('/api/admin/knowledge', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: a.id, published: !a.published }),
      })
      if (!res.ok) { toast.error('Failed to update'); return }
      setArticles((prev) => prev.map((x) => x.id === a.id ? { ...x, published: !x.published } : x))
      toast.success(a.published ? 'Unpublished' : 'Published')
    } catch {
      toast.error('Network error')
    }
  }

  const handleDelete = async (a: KnowledgeArticle) => {
    try {
      const res = await fetch('/api/admin/knowledge', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: a.id }),
      })
      if (!res.ok) { toast.error('Delete failed'); return }
      toast.success('Article deleted')
      setDeleteTarget(null)
      load()
    } catch {
      toast.error('Network error')
    }
  }

  const filtered = articles
    .filter((a) => categoryFilter === 'all' || a.category === categoryFilter)
    .filter((a) => !search || a.title.toLowerCase().includes(search.toLowerCase()) || a.tags.toLowerCase().includes(search.toLowerCase()))

  const grouped = allCategories.map((cat) => ({
    ...cat,
    articles: filtered.filter((a) => a.category === cat.value),
  })).filter((g) => g.articles.length > 0)

  const renderMarkdown = (md: string) => {
    const html = md
      .replace(/^### (.+)$/gm, '<h3 class="text-base font-semibold mt-4 mb-1">$1</h3>')
      .replace(/^## (.+)$/gm, '<h2 class="text-lg font-semibold mt-5 mb-2">$1</h2>')
      .replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold mt-6 mb-2">$1</h1>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" class="text-primary underline">$1</a>')
      .replace(/\n\n/g, '</p><p class="mb-3">')
      .replace(/\n/g, '<br/>')
    return '<p class="mb-3">' + html + '</p>'
  }

  const handleAddCategory = (label: string) => {
    const val = slugify(label)
    const newCat = { value: val, label }
    setExtraCategories((prev) => [...prev.filter((c) => c.value !== val), newCat])
    setForm((f) => ({ ...f, category: val }))
  }

  return (
    <div className="container mx-auto max-w-6xl px-4 py-12">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Knowledge Base</h1>
          <p className="text-muted-foreground mt-1">Curated articles on markets, team, and context</p>
        </div>
        <Button onClick={openCreate}>New Article</Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <Input
          placeholder="Search title or tags…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-52"
        />
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {allCategories.map((c) => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground ml-auto">{filtered.length} article{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-4xl mb-3">📚</p>
          <p className="font-medium">No articles yet</p>
          <p className="text-sm mt-1">Click &ldquo;New Article&rdquo; to add content to the knowledge base.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {grouped.map(({ value: cat, label, articles: catArticles }) => (
            <div key={cat}>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">{label}</h2>
              <div className="rounded-md border divide-y">
                {catArticles.map((a) => (
                  <div key={a.id} className="flex items-center gap-4 px-4 py-3 hover:bg-muted/20">
                    {/* Preview image */}
                    {a.image_url && (
                      <div className="shrink-0 w-14 h-10 rounded overflow-hidden bg-muted">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={a.image_url} alt="" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <a
                          href={`/learn/${a.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-sm hover:text-primary hover:underline transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {a.title}
                        </a>
                        {!a.published && (
                          <span className="text-xs bg-zinc-100 text-zinc-500 rounded px-1.5 py-0.5">Draft</span>
                        )}
                      </div>
                      {a.tags && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {a.tags.split(',').map((t) => t.trim()).filter(Boolean).map((t) => (
                            <span key={t} className={`text-xs rounded px-1.5 py-0.5 ${CATEGORY_COLORS[a.category] || 'bg-muted text-muted-foreground'}`}>{t}</span>
                          ))}
                        </div>
                      )}
                      {a.body && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-lg">
                          {a.body.replace(/[#*\[\]]/g, '').slice(0, 120)}…
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        className={a.published ? 'text-green-600 hover:text-green-700' : 'text-muted-foreground'}
                        onClick={() => togglePublished(a)}
                      >
                        {a.published ? 'Published' : 'Publish'}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => openEdit(a)}>Edit</Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget(a)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Article dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Article' : 'New Article'}</DialogTitle>
          </DialogHeader>

          {!editingId ? (
            /* ── New article: URL-first or editor flow ── */
            <div className="space-y-4 py-2">
              {/* Mode toggle */}
              <div className="flex gap-1 rounded-md border p-1 w-fit">
                <button
                  type="button"
                  onClick={() => setNewArticleMode('url')}
                  className={`rounded px-3 py-1 text-sm font-medium transition-colors ${newArticleMode === 'url' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  From URL
                </button>
                <button
                  type="button"
                  onClick={() => setNewArticleMode('editor')}
                  className={`rounded px-3 py-1 text-sm font-medium transition-colors ${newArticleMode === 'editor' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  Write Article
                </button>
              </div>

              {newArticleMode === 'url' ? (
                <>
                  {/* URL input */}
                  <div className="space-y-1.5">
                    <Label>Paste a URL</Label>
                    <div className="flex gap-2 items-center">
                      <Input
                        value={urlInput}
                        onChange={(e) => handleUrlChange(e.target.value)}
                        placeholder="https://…"
                        className="flex-1"
                        type="url"
                      />
                      {urlFetching && (
                        <span className="text-xs text-muted-foreground shrink-0">Fetching…</span>
                      )}
                    </div>
                  </div>

                  {/* URL preview card */}
                  {urlMeta && (
                    <div className="rounded-lg border bg-muted/20 p-3 flex gap-3">
                      {urlMeta.image && (
                        <div className="shrink-0 w-24 h-16 rounded-md overflow-hidden bg-muted">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={urlMeta.image} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm line-clamp-2">{urlMeta.title}</div>
                        {urlMeta.description && <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{urlMeta.description}</div>}
                        <div className="text-xs text-muted-foreground/60 mt-1">{urlMeta.siteName}</div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Category</Label>
                      <ComboboxWithAdd value={form.category} options={allCategories} onSelect={(v) => setForm((f) => ({ ...f, category: v }))} onAddNew={handleAddCategory} placeholder="Select category…" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Tags</Label>
                      <Input value={form.tags} onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))} placeholder="sustainability, hospitality…" />
                    </div>
                  </div>

                  {(urlMeta || form.title) && (
                    <div className="space-y-1.5">
                      <Label>Title <span className="text-muted-foreground font-normal text-xs">(auto-filled from URL)</span></Label>
                      <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value, slug: slugify(e.target.value) }))} placeholder="Article title" />
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* Rich text editor for new article */}
                  <div className="space-y-1.5">
                    <Label>Title *</Label>
                    <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value, slug: f.slug || slugify(e.target.value) }))} placeholder="Article title" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Category</Label>
                      <ComboboxWithAdd value={form.category} options={allCategories} onSelect={(v) => setForm((f) => ({ ...f, category: v }))} onAddNew={handleAddCategory} placeholder="Select category…" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Tags</Label>
                      <Input value={form.tags} onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))} placeholder="sustainability, hospitality…" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Cover Image URL <span className="text-muted-foreground font-normal text-xs">(optional)</span></Label>
                    <Input value={form.image_url} onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))} placeholder="https://…" type="url" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Body (Markdown)</Label>
                      <button type="button" onClick={() => setPreview((p) => !p)} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                        {preview ? '← Edit' : 'Preview →'}
                      </button>
                    </div>
                    {preview ? (
                      <div className="min-h-[200px] rounded-md border bg-muted/20 p-4 text-sm prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: renderMarkdown(form.body) }} />
                    ) : (
                      <Textarea rows={10} value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} placeholder="Write in Markdown…" className="font-mono text-sm" />
                    )}
                  </div>
                </>
              )}

              <div className="flex items-center gap-2">
                <input type="checkbox" id="published-new" checked={form.published} onChange={(e) => setForm((f) => ({ ...f, published: e.target.checked }))} className="w-4 h-4" />
                <Label htmlFor="published-new">Published (visible to portal users)</Label>
              </div>
            </div>
          ) : (
            /* ── Edit article: full form ── */
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1 col-span-2">
                  <Label>Title *</Label>
                  <Input
                    value={form.title}
                    onChange={(e) => setForm((f) => ({
                      ...f,
                      title: e.target.value,
                      slug: f.slug || slugify(e.target.value),
                    }))}
                    placeholder="Article title"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Category</Label>
                  <ComboboxWithAdd
                    value={form.category}
                    options={allCategories}
                    onSelect={(v) => setForm((f) => ({ ...f, category: v }))}
                    onAddNew={handleAddCategory}
                    placeholder="Select category…"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Slug (URL)</Label>
                  <Input
                    value={form.slug}
                    onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                    placeholder="auto-generated from title"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Tags (comma-separated)</Label>
                  <Input
                    value={form.tags}
                    onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
                    placeholder="e.g. sustainability, hospitality"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Sort Order</Label>
                  <Input
                    type="number"
                    value={form.sort_order}
                    onChange={(e) => setForm((f) => ({ ...f, sort_order: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label>Cover Image URL <span className="text-muted-foreground font-normal text-xs">(optional — shown in list and lightbox)</span></Label>
                <Input
                  value={form.image_url}
                  onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))}
                  placeholder="https://…"
                  type="url"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Body (Markdown)</Label>
                  <button
                    type="button"
                    onClick={() => setPreview((p) => !p)}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {preview ? '← Edit' : 'Preview →'}
                  </button>
                </div>
                {preview ? (
                  <div
                    className="min-h-[300px] rounded-md border bg-muted/20 p-4 text-sm prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(form.body) }}
                  />
                ) : (
                  <Textarea
                    rows={14}
                    value={form.body}
                    onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                    placeholder="Write in Markdown…"
                    className="font-mono text-sm"
                  />
                )}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="published-edit"
                  checked={form.published}
                  onChange={(e) => setForm((f) => ({ ...f, published: e.target.checked }))}
                  className="w-4 h-4"
                />
                <Label htmlFor="published-edit">Published (visible to portal users)</Label>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || (!editingId && !urlInput && !form.title)}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Delete Article</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Delete <span className="font-medium text-foreground">{deleteTarget?.title}</span>? This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteTarget && handleDelete(deleteTarget)}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
