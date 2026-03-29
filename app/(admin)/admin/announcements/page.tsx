'use client'

import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { Announcement } from '@/lib/sheets/announcements'
import { MediaUploader } from '@/components/shared/MediaUploader'
import { ASSETS } from '@/lib/data/assets'

function formatDateTime(iso: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function AnnouncementsPage() {
  const [asset, setAsset] = useState('livingstonfarm')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [notify, setNotify] = useState(true)
  const [mediaUrls, setMediaUrls] = useState<string[]>([])
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/announcements?asset=${asset}`)
      if (res.ok) {
        const data = await res.json()
        setAnnouncements(data.announcements || [])
      }
    } finally {
      setLoading(false)
    }
  }, [asset])

  useEffect(() => { fetchAnnouncements() }, [fetchAnnouncements])

  async function handlePost(e: React.FormEvent) {
    e.preventDefault()
    setPosting(true)
    setError('')
    setSuccess('')
    try {
      const res = await fetch('/api/admin/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asset, title, body, notify, media_urls: mediaUrls.join(',') }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to post')
      const { emailResults } = data
      if (notify && !emailResults.skipped) {
        setSuccess(`Posted! Emails sent to ${emailResults.sent} investor${emailResults.sent !== 1 ? 's' : ''}${emailResults.failed > 0 ? ` (${emailResults.failed} failed)` : ''}.`)
      } else if (notify && emailResults.skipped) {
        setSuccess('Posted! Email notifications skipped (Resend not configured).')
      } else {
        setSuccess('Posted successfully.')
      }
      setTitle('')
      setBody('')
      setMediaUrls([])
      fetchAnnouncements()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to post')
    } finally {
      setPosting(false)
    }
  }

  return (
    <div className="container mx-auto max-w-6xl px-4 py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Announcements</h1>
        <p className="text-muted-foreground mt-1">Post investor updates directly — investors see them in their portal and receive email notifications.</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Post form */}
        <Card>
          <CardHeader><CardTitle className="text-base">New Announcement</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handlePost} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1">Asset</label>
                <select value={asset} onChange={(e) => setAsset(e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm bg-background">
                  {ASSETS.map((a) => <option key={a.slug} value={a.slug}>{a.name}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1">Title</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  placeholder="e.g. Q1 2025 Construction Update"
                  className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1">Message</label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  required
                  rows={8}
                  placeholder="Write your update here..."
                  className="w-full border rounded-md px-3 py-2 text-sm bg-background resize-none"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-2">
                  Media <span className="normal-case font-normal">(optional)</span>
                </label>
                <MediaUploader value={mediaUrls} onChange={setMediaUrls} />
              </div>

              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={notify}
                  onChange={(e) => setNotify(e.target.checked)}
                  className="rounded"
                />
                Send email notification to investors
              </label>

              {error && <p className="text-sm text-destructive">{error}</p>}
              {success && <p className="text-sm text-green-600">{success}</p>}

              <Button type="submit" disabled={posting} className="w-full">
                {posting ? 'Posting...' : notify ? 'Post & Notify Investors' : 'Post Update'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Past announcements */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Past Announcements</CardTitle>
              <select value={asset} onChange={(e) => setAsset(e.target.value)} className="border rounded-md px-2 py-1 text-xs bg-background">
                {ASSETS.map((a) => <option key={a.slug} value={a.slug}>{a.name}</option>)}
              </select>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <p className="text-sm text-muted-foreground px-6 py-4">Loading...</p>
            ) : announcements.length === 0 ? (
              <p className="text-sm text-muted-foreground px-6 py-4">No announcements posted yet.</p>
            ) : (
              <div className="divide-y">
                {announcements.map((ann) => (
                  <div key={ann.id} className="px-6 py-4">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="text-sm font-medium">{ann.title}</p>
                      <Badge variant="outline" className="text-xs shrink-0">{ASSETS.find(a => a.slug === ann.asset)?.name || ann.asset}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">{formatDateTime(ann.posted_at)} · {ann.posted_by}</p>
                    <p className="text-sm text-muted-foreground line-clamp-3 whitespace-pre-line">{ann.body}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
