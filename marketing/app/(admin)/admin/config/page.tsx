'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import type { ConfigMap, AssetMediaType, AssetMediaWithRow, InvestorDocument } from '@/types'
import type { Announcement } from '@/lib/sheets/announcements'
import { useGoogleDrivePicker } from '@/components/shared/useGoogleDrivePicker'
import type { DriveFile } from '@/components/shared/useGoogleDrivePicker'
import PropertyMap from '@/components/shared/PropertyMap'
import { ASSETS } from '@/lib/data/assets'

const CONFIG_FIELDS = [
  { key: 'raise_target', label: 'Raise Target ($)', type: 'number' },
  { key: 'raise_to_date', label: 'Raised to Date ($)', type: 'number' },
  { key: 'status', label: 'Status', type: 'select', options: ['Raising', 'Active', 'Stabilized', 'Exited'] },
  { key: 'target_irr', label: 'Target IRR', type: 'text' },
  { key: 'target_multiple', label: 'Target Multiple', type: 'text' },
  { key: 'hold_period', label: 'Hold Period', type: 'text' },
  { key: 'minimum', label: 'Minimum Investment ($)', type: 'number' },
  { key: 'asset_type', label: 'Asset Type', type: 'text' },
  { key: 'location', label: 'Location', type: 'text' },
]

function normalizeHeroUrl(url: string): { url: string; type: 'image' | 'video' } {
  const trimmed = url.trim()
  // YouTube watch → embed
  const ytMatch = trimmed.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{11})/)
  if (ytMatch) {
    return { url: `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&mute=1&loop=1&playlist=${ytMatch[1]}`, type: 'video' }
  }
  // YouTube embed already
  if (trimmed.includes('youtube.com/embed')) return { url: trimmed, type: 'video' }
  // Video file
  if (/\.(mp4|webm|mov|ogg)(\?|$)/i.test(trimmed)) return { url: trimmed, type: 'video' }
  // Default → image
  return { url: trimmed, type: 'image' }
}

const DOC_TYPES = [
  { value: 'ppm', label: 'PPM' },
  { value: 'operating_agreement', label: 'Operating Agreement' },
  { value: 'k1', label: 'K-1' },
  { value: 'quarterly_report', label: 'Quarterly Report' },
  { value: 'other', label: 'Other' },
]

const VISIBILITY = [
  { value: 'lp', label: 'LP (all investors)' },
  { value: 'gp', label: 'GP & Admin only' },
  { value: 'admin', label: 'Admin only' },
]

interface ContentState { tagline: string; description: string; highlights: string }
interface MediaFormState {
  id: string; type: AssetMediaType; url: string; caption: string
  sort_order: string; uploadMode: 'url' | 'file' | 'drive'; file: File | null
  driveFile: DriveFile | null
}

function emptyMediaForm(): MediaFormState {
  return { id: '', type: 'image', url: '', caption: '', sort_order: '0', uploadMode: 'url', file: null, driveFile: null }
}

function youtubeId(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{11})/)
  return m ? m[1] : null
}

function formatDateTime(iso: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function AdminAssetsPage() {
  const [asset, setAsset] = useState('circularplatform')

  // Config
  const [config, setConfig] = useState<ConfigMap>({})
  const [edits, setEdits] = useState<ConfigMap>({})
  const [configLoading, setConfigLoading] = useState(true)
  const [configSaving, setConfigSaving] = useState(false)
  const [editingConfigField, setEditingConfigField] = useState<string | null>(null)

  // Writeup
  const [content, setContent] = useState<ContentState>({ tagline: '', description: '', highlights: '' })
  const [contentLoading, setContentLoading] = useState(true)
  const [contentSaving, setContentSaving] = useState(false)

  // Media
  const [media, setMedia] = useState<AssetMediaWithRow[]>([])
  const [mediaLoading, setMediaLoading] = useState(true)
  const [mediaDialogOpen, setMediaDialogOpen] = useState(false)
  const [editingMediaRow, setEditingMediaRow] = useState<number | null>(null)
  const [mediaForm, setMediaForm] = useState<MediaFormState>(emptyMediaForm())
  const [mediaSaving, setMediaSaving] = useState(false)
  const [mediaDeleteTarget, setMediaDeleteTarget] = useState<AssetMediaWithRow | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Documents
  const [docs, setDocs] = useState<InvestorDocument[]>([])
  const [docsLoading, setDocsLoading] = useState(true)
  const [docUploadMode, setDocUploadMode] = useState<'file' | 'drive'>('file')
  const [docFile, setDocFile] = useState<File | null>(null)
  const [docDriveFile, setDocDriveFile] = useState<DriveFile | null>(null)
  const [docDragging, setDocDragging] = useState(false)
  const [docName, setDocName] = useState('')
  const [docType, setDocType] = useState('other')
  const [docVisibleTo, setDocVisibleTo] = useState('lp')
  const [docEmail, setDocEmail] = useState('')
  const [docUploading, setDocUploading] = useState(false)
  const docInputRef = useRef<HTMLInputElement>(null)
  const { openPicker } = useGoogleDrivePicker()

  // Hero media
  const [heroUploadMode, setHeroUploadMode] = useState<'url' | 'file' | 'drive'>('url')
  const [heroUrl, setHeroUrl] = useState('')
  const [heroFile, setHeroFile] = useState<File | null>(null)
  const [heroDriveFile, setHeroDriveFile] = useState<DriveFile | null>(null)
  const [heroUploading, setHeroUploading] = useState(false)
  const heroFileInputRef = useRef<HTMLInputElement>(null)

  // Announcements
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [annLoading, setAnnLoading] = useState(true)
  const [annTitle, setAnnTitle] = useState('')
  const [annBody, setAnnBody] = useState('')
  const [annMediaUrls, setAnnMediaUrls] = useState('')
  const [annNotify, setAnnNotify] = useState(true)
  const [annPosting, setAnnPosting] = useState(false)

  // ── Loaders ─────────────────────────────────────────────────────────────────

  const loadConfig = useCallback(async () => {
    setConfigLoading(true)
    try {
      const res = await fetch('/api/admin/config')
      if (!res.ok) throw new Error()
      const data = await res.json()
      setConfig(data); setEdits(data)
    } catch { toast.error('Failed to load config') }
    finally { setConfigLoading(false) }
  }, [])

  const loadContent = useCallback(async () => {
    setContentLoading(true)
    try {
      const res = await fetch(`/api/admin/content?asset=${asset}`)
      if (!res.ok) throw new Error()
      setContent(await res.json())
    } catch { toast.error('Failed to load write-up') }
    finally { setContentLoading(false) }
  }, [asset])

  const loadMedia = useCallback(async () => {
    setMediaLoading(true)
    try {
      const res = await fetch(`/api/admin/media?asset=${asset}`)
      if (!res.ok) throw new Error()
      setMedia(await res.json())
    } catch { toast.error('Failed to load media') }
    finally { setMediaLoading(false) }
  }, [asset])

  const loadDocs = useCallback(async () => {
    setDocsLoading(true)
    try {
      const res = await fetch('/api/admin/documents')
      if (res.ok) {
        const data = await res.json()
        setDocs(data.documents || [])
      }
    } finally { setDocsLoading(false) }
  }, [])

  const loadAnnouncements = useCallback(async () => {
    setAnnLoading(true)
    try {
      const res = await fetch(`/api/admin/announcements?asset=${asset}`)
      if (res.ok) {
        const data = await res.json()
        setAnnouncements(data.announcements || [])
      }
    } finally { setAnnLoading(false) }
  }, [asset])

  useEffect(() => { loadConfig(); loadDocs() }, [loadConfig, loadDocs])
  useEffect(() => { loadContent(); loadMedia(); loadAnnouncements() }, [loadContent, loadMedia, loadAnnouncements])

  // ── Config handlers ──────────────────────────────────────────────────────────

  const getValue = (key: string) => edits[key] ?? config[key] ?? ''
  const setValue = (key: string, value: string) => setEdits((e) => ({ ...e, [key]: value }))

  const handleSaveConfig = async () => {
    setConfigSaving(true)
    try {
      const updates: ConfigMap = {}
      for (const field of CONFIG_FIELDS) {
        const fullKey = `${asset}_${field.key}`
        updates[fullKey] = getValue(fullKey)
      }
      const res = await fetch('/api/admin/config', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Save failed'); return }
      toast.success('Saved')
      loadConfig()
    } catch { toast.error('Network error') }
    finally { setConfigSaving(false) }
  }

  const saveSingleField = async (fullKey: string, value: string) => {
    setEdits((e) => ({ ...e, [fullKey]: value }))
    try {
      const res = await fetch('/api/admin/config', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates: { [fullKey]: value } }),
      })
      if (!res.ok) { toast.error('Save failed'); return }
      setConfig((c) => ({ ...c, [fullKey]: value }))
    } catch { toast.error('Network error') }
  }

  // ── Hero handlers ─────────────────────────────────────────────────────────────

  const handleSaveHero = async () => {
    setHeroUploading(true)
    try {
      let finalUrl = ''
      let mediaType: 'image' | 'video' = 'image'

      if (heroUploadMode === 'url') {
        const result = normalizeHeroUrl(heroUrl)
        finalUrl = result.url
        mediaType = result.type
      } else if (heroUploadMode === 'file' && heroFile) {
        const fd = new FormData()
        fd.append('file', heroFile)
        const res = await fetch('/api/admin/media-upload', { method: 'POST', body: fd })
        if (!res.ok) { toast.error('Upload failed'); return }
        const data = await res.json()
        finalUrl = data.url
        mediaType = heroFile.type.startsWith('video/') ? 'video' : 'image'
      } else if (heroUploadMode === 'drive' && heroDriveFile) {
        // Download from Drive then re-upload to R2
        const driveRes = await fetch(
          `https://www.googleapis.com/drive/v3/files/${heroDriveFile.fileId}?alt=media`,
          { headers: { Authorization: `Bearer ${heroDriveFile.accessToken}` } }
        )
        if (!driveRes.ok) { toast.error('Failed to fetch from Google Drive'); return }
        const blob = await driveRes.blob()
        const file = new File([blob], heroDriveFile.fileName, { type: heroDriveFile.mimeType })
        const fd = new FormData()
        fd.append('file', file)
        const res = await fetch('/api/admin/media-upload', { method: 'POST', body: fd })
        if (!res.ok) { toast.error('Upload failed'); return }
        const data = await res.json()
        finalUrl = data.url
        mediaType = heroDriveFile.mimeType.startsWith('video/') ? 'video' : 'image'
      } else {
        toast.error('Please select a file or enter a URL')
        return
      }

      if (!finalUrl) { toast.error('No URL to save'); return }

      // Save the correct key and clear the other
      await Promise.all([
        saveSingleField(`${asset}_hero_image`, mediaType === 'image' ? finalUrl : ''),
        saveSingleField(`${asset}_hero_video`, mediaType === 'video' ? finalUrl : ''),
      ])
      toast.success('Hero media saved')
      setHeroFile(null)
      setHeroDriveFile(null)
      setHeroUrl('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setHeroUploading(false)
    }
  }

  // ── Content handlers ─────────────────────────────────────────────────────────

  const handleSaveContent = async () => {
    setContentSaving(true)
    try {
      const res = await fetch('/api/admin/content', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asset, ...content }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Save failed'); return }
      toast.success('Saved — public page updates within ~60s')
    } catch { toast.error('Network error') }
    finally { setContentSaving(false) }
  }

  // ── Media handlers ────────────────────────────────────────────────────────────

  const openCreateMedia = () => {
    setEditingMediaRow(null)
    setMediaForm({ ...emptyMediaForm(), sort_order: String(media.length) })
    setMediaDialogOpen(true)
  }
  const openEditMedia = (item: AssetMediaWithRow) => {
    setEditingMediaRow(item._rowIndex)
    setMediaForm({ id: item.id, type: item.type, url: item.url, caption: item.caption || '', sort_order: String(item.sort_order), uploadMode: 'url', file: null, driveFile: null })
    setMediaDialogOpen(true)
  }
  const handleSaveMedia = async () => {
    setMediaSaving(true)
    try {
      if (editingMediaRow) {
        if (!mediaForm.url) { toast.error('URL is required'); setMediaSaving(false); return }
        const res = await fetch('/api/admin/media', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rowIndex: editingMediaRow, asset, ...mediaForm }) })
        const data = await res.json()
        if (!res.ok) { toast.error(data.error || 'Save failed'); return }
        toast.success('Updated')
      } else if (mediaForm.uploadMode === 'drive') {
        if (!mediaForm.driveFile) { toast.error('Please select a file from Google Drive'); setMediaSaving(false); return }
        const fd = new FormData()
        fd.append('driveFileId', mediaForm.driveFile.fileId)
        fd.append('driveAccessToken', mediaForm.driveFile.accessToken)
        fd.append('driveFileName', mediaForm.driveFile.fileName)
        fd.append('asset', asset); fd.append('caption', mediaForm.caption); fd.append('sort_order', mediaForm.sort_order)
        const res = await fetch('/api/admin/media', { method: 'POST', body: fd })
        const data = await res.json()
        if (!res.ok) { toast.error(data.error || 'Drive import failed'); return }
        toast.success('Photo imported from Google Drive')
      } else if (mediaForm.uploadMode === 'file') {
        if (!mediaForm.file) { toast.error('Please select a file'); setMediaSaving(false); return }
        const fd = new FormData()
        fd.append('file', mediaForm.file); fd.append('asset', asset); fd.append('caption', mediaForm.caption); fd.append('sort_order', mediaForm.sort_order)
        const res = await fetch('/api/admin/media', { method: 'POST', body: fd })
        const data = await res.json()
        if (!res.ok) { toast.error(data.error || 'Upload failed'); return }
        toast.success('Photo uploaded')
      } else {
        if (!mediaForm.url) { toast.error('URL is required'); setMediaSaving(false); return }
        const res = await fetch('/api/admin/media', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ asset, ...mediaForm }) })
        const data = await res.json()
        if (!res.ok) { toast.error(data.error || 'Save failed'); return }
        toast.success('Added')
      }
      setMediaDialogOpen(false); loadMedia()
    } catch { toast.error('Network error') }
    finally { setMediaSaving(false) }
  }
  const handleDeleteMedia = async (item: AssetMediaWithRow) => {
    try {
      const res = await fetch('/api/admin/media', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rowIndex: item._rowIndex, id: item.id }) })
      if (!res.ok) { toast.error('Delete failed'); return }
      toast.success('Removed'); setMediaDeleteTarget(null); loadMedia()
    } catch { toast.error('Network error') }
  }

  // ── Document handlers ─────────────────────────────────────────────────────────

  const handleDocUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (docUploadMode === 'file' && !docFile) return
    if (docUploadMode === 'drive' && !docDriveFile) return
    setDocUploading(true)
    try {
      const fd = new FormData()
      fd.append('asset', asset); fd.append('doc_name', docName)
      fd.append('doc_type', docType); fd.append('visible_to', docVisibleTo)
      if (docEmail.trim()) fd.append('email', docEmail.trim())
      if (docUploadMode === 'drive' && docDriveFile) {
        fd.append('driveFileId', docDriveFile.fileId)
        fd.append('driveAccessToken', docDriveFile.accessToken)
        fd.append('driveFileName', docDriveFile.fileName)
      } else if (docFile) {
        fd.append('file', docFile)
      }
      const res = await fetch('/api/admin/upload', { method: 'POST', body: fd })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Upload failed') }
      toast.success('Document uploaded')
      setDocFile(null); setDocDriveFile(null); setDocName(''); setDocEmail('')
      loadDocs()
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Upload failed') }
    finally { setDocUploading(false) }
  }

  // ── Announcement handlers ─────────────────────────────────────────────────────

  const handlePostAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault()
    setAnnPosting(true)
    try {
      const res = await fetch('/api/admin/announcements', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asset, title: annTitle, body: annBody, notify: annNotify, media_urls: annMediaUrls }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to post')
      const { emailResults } = data
      if (annNotify && !emailResults?.skipped) {
        toast.success(`Posted! Emails sent to ${emailResults?.sent ?? 0} investor${emailResults?.sent !== 1 ? 's' : ''}`)
      } else {
        toast.success('Posted successfully.')
      }
      setAnnTitle(''); setAnnBody(''); setAnnMediaUrls('')
      loadAnnouncements()
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed to post') }
    finally { setAnnPosting(false) }
  }

  const assetDocs = docs.filter((d) => d.asset === asset)

  return (
    <div className="container mx-auto max-w-4xl px-4 py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Assets</h1>
        <p className="text-muted-foreground mt-1">Manage configuration, content, media, documents, and announcements</p>
      </div>

      {/* Asset pills + preview */}
      <div className="flex items-center justify-between gap-4 mb-10">
        <div className="flex gap-2">
          {ASSETS.map(({ slug, name }) => (
            <Button key={slug} variant={asset === slug ? 'default' : 'outline'} size="sm" onClick={() => setAsset(slug)}>
              {name}
            </Button>
          ))}
        </div>
        <a href={`/assets/${asset}`} target="_blank" rel="noopener noreferrer">
          <Button variant="outline" size="sm">Preview Public Page ↗</Button>
        </a>
      </div>

      <div className="space-y-14">

        {/* ── Configuration ── */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-5">Configuration</h2>
          {configLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : (
            <div className="grid grid-cols-1 gap-px sm:grid-cols-2 rounded-lg border overflow-hidden bg-border">
              {CONFIG_FIELDS.map((field) => {
                const fullKey = `${asset}_${field.key}`
                const value = getValue(fullKey)
                const isEditing = editingConfigField === fullKey

                const commitEdit = () => {
                  saveSingleField(fullKey, getValue(fullKey))
                  setEditingConfigField(null)
                }

                return (
                  <div key={field.key} className="bg-background px-4 py-3 group relative">
                    <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
                      {field.label}
                    </div>
                    {isEditing ? (
                      field.type === 'select' ? (
                        <select
                          autoFocus
                          value={value}
                          onChange={(e) => setValue(fullKey, e.target.value)}
                          onBlur={commitEdit}
                          className="w-full border-0 border-b border-primary bg-transparent text-sm font-medium focus:outline-none pb-0.5"
                        >
                          {field.options?.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                      ) : (
                        <input
                          autoFocus
                          type={field.type === 'number' ? 'number' : 'text'}
                          value={value}
                          onChange={(e) => setValue(fullKey, e.target.value)}
                          onBlur={commitEdit}
                          onKeyDown={(e) => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditingConfigField(null) }}
                          className="w-full border-0 border-b border-primary bg-transparent text-sm font-medium focus:outline-none pb-0.5"
                        />
                      )
                    ) : (
                      <div
                        className="flex items-center gap-2 cursor-text min-h-[1.5rem]"
                        onClick={() => setEditingConfigField(fullKey)}
                      >
                        <span className={`text-sm font-medium ${!value ? 'text-muted-foreground/50 italic' : ''}`}>
                          {value || 'Click to edit'}
                        </span>
                        <span className="opacity-0 group-hover:opacity-60 transition-opacity text-muted-foreground text-xs ml-auto">
                          ✏
                        </span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* ── Hero Media ── */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-5">Hero Media</h2>
          <div className="rounded-lg border p-5 space-y-4">
            {/* Current hero preview */}
            {(getValue(`${asset}_hero_image`) || getValue(`${asset}_hero_video`)) && (
              <div className="rounded-md overflow-hidden bg-muted aspect-video w-full max-w-md">
                {getValue(`${asset}_hero_video`) ? (
                  getValue(`${asset}_hero_video`).includes('youtube.com/embed') ? (
                    <iframe src={getValue(`${asset}_hero_video`)} className="w-full h-full" allow="autoplay" />
                  ) : (
                    // eslint-disable-next-line jsx-a11y/media-has-caption
                    <video src={getValue(`${asset}_hero_video`)} className="w-full h-full object-cover" muted />
                  )
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={getValue(`${asset}_hero_image`)} alt="Hero" className="w-full h-full object-cover" />
                )}
              </div>
            )}
            <p className="text-xs text-muted-foreground">Upload a photo or video to use as the hero background on the public asset page.</p>

            {/* Upload mode tabs */}
            <div className="flex gap-1 rounded-md border p-1 w-fit">
              {(['url', 'file', 'drive'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => { setHeroUploadMode(mode); setHeroFile(null); setHeroDriveFile(null); setHeroUrl('') }}
                  className={`rounded px-3 py-1 text-sm font-medium capitalize transition-colors ${heroUploadMode === mode ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  {mode === 'file' ? 'Computer' : mode === 'drive' ? 'Google Drive' : 'URL'}
                </button>
              ))}
            </div>

            {heroUploadMode === 'url' && (
              <div className="space-y-1.5">
                <Label>URL <span className="text-muted-foreground font-normal text-xs">(YouTube, MP4, or image URL)</span></Label>
                <Input
                  type="url"
                  placeholder="https://youtube.com/watch?v=… or https://…/hero.jpg"
                  value={heroUrl}
                  onChange={(e) => setHeroUrl(e.target.value)}
                />
              </div>
            )}

            {heroUploadMode === 'file' && (
              <div
                onClick={() => heroFileInputRef.current?.click()}
                className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
              >
                <input
                  ref={heroFileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={(e) => setHeroFile(e.target.files?.[0] ?? null)}
                />
                {heroFile ? (
                  <div>
                    <Badge variant="secondary" className="text-sm">{heroFile.name}</Badge>
                    <p className="text-xs text-muted-foreground mt-1">{(heroFile.size / 1024 / 1024).toFixed(1)} MB — {heroFile.type.startsWith('video/') ? 'Video' : 'Image'}</p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Drag & drop or click to browse (image or video)</p>
                )}
              </div>
            )}

            {heroUploadMode === 'drive' && (
              <div
                onClick={() => openPicker((df) => setHeroDriveFile(df), { imagesOnly: false })}
                className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
              >
                {heroDriveFile ? (
                  <div>
                    <Badge variant="secondary" className="text-sm">{heroDriveFile.fileName}</Badge>
                    <p className="text-xs text-muted-foreground mt-1">From Google Drive</p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Click to open Google Drive picker</p>
                )}
              </div>
            )}

            <div className="flex items-center gap-3">
              <Button
                onClick={handleSaveHero}
                disabled={heroUploading || (heroUploadMode === 'url' ? !heroUrl.trim() : heroUploadMode === 'file' ? !heroFile : !heroDriveFile)}
              >
                {heroUploading ? 'Saving…' : 'Save Hero Media'}
              </Button>
              {(getValue(`${asset}_hero_image`) || getValue(`${asset}_hero_video`)) && (
                <Button
                  variant="ghost"
                  className="text-destructive hover:text-destructive text-sm"
                  onClick={async () => {
                    await Promise.all([
                      saveSingleField(`${asset}_hero_image`, ''),
                      saveSingleField(`${asset}_hero_video`, ''),
                    ])
                    toast.success('Hero media cleared')
                  }}
                >
                  Clear hero
                </Button>
              )}
            </div>
          </div>
        </section>

        {/* ── Write-up ── */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-5">Write-up</h2>
          {contentLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : (
            <div className="space-y-5">
              <div className="space-y-1.5">
                <Label>Tagline</Label>
                <p className="text-xs text-muted-foreground">Short subtitle shown under the property name.</p>
                <Input value={content.tagline} onChange={(e) => setContent((c) => ({ ...c, tagline: e.target.value }))} placeholder="e.g. 121-acre regenerative agritourism destination in the Catskills" />
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <p className="text-xs text-muted-foreground">
                  Supports Markdown — blank lines between paragraphs, <code className="bg-muted px-1 rounded">**bold**</code>, <code className="bg-muted px-1 rounded">## Heading</code>.
                </p>
                <Textarea value={content.description} onChange={(e) => setContent((c) => ({ ...c, description: e.target.value }))} rows={14} className="font-mono text-sm leading-relaxed" placeholder="The mission behind this property is to..." />
              </div>
              <div className="space-y-1.5">
                <Label>Highlights</Label>
                <p className="text-xs text-muted-foreground">Key features shown as bullet points. One item per line.</p>
                <Textarea value={content.highlights} onChange={(e) => setContent((c) => ({ ...c, highlights: e.target.value }))} rows={7} placeholder={`Farm Stays\nPrivate Events\nRegenerative Farm`} />
              </div>
            </div>
          )}
          <Button onClick={handleSaveContent} disabled={contentSaving} className="mt-5">
            {contentSaving ? 'Saving…' : 'Save Write-up'}
          </Button>
        </section>

        {/* ── Media ── */}
        <section>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Media</h2>
            <Button size="sm" onClick={openCreateMedia}>Add Photo / Video</Button>
          </div>
          {mediaLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : media.length === 0 ? (
            <p className="text-sm text-muted-foreground">No media yet.</p>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
              {media.map((item) => (
                <div key={item._rowIndex} className="group relative rounded-lg border overflow-hidden bg-muted/20">
                  {item.type === 'image' ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.url} alt={item.caption || ''} className="w-full aspect-video object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="60"><rect width="100" height="60" fill="%23eee"/><text x="50" y="35" text-anchor="middle" font-size="10" fill="%23999">Image error</text></svg>' }} />
                  ) : (
                    <div className="w-full aspect-video bg-black flex items-center justify-center relative">
                      {youtubeId(item.url) ? <img src={`https://img.youtube.com/vi/${youtubeId(item.url)}/hqdefault.jpg`} alt={item.caption || 'Video'} className="w-full h-full object-cover" /> : <span className="text-white text-xs">YouTube</span>}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center">
                          <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                        </div>
                      </div>
                    </div>
                  )}
                  {item.caption && <div className="px-2 py-1 text-xs text-muted-foreground truncate">{item.caption}</div>}
                  <div className="absolute top-1 right-1 hidden group-hover:flex gap-1">
                    <button onClick={() => openEditMedia(item)} className="rounded bg-white/90 px-2 py-0.5 text-xs font-medium shadow hover:bg-white">Edit</button>
                    <button onClick={() => setMediaDeleteTarget(item)} className="rounded bg-white/90 px-2 py-0.5 text-xs font-medium text-red-600 shadow hover:bg-white">✕</button>
                  </div>
                  <div className="absolute top-1 left-1">
                    <span className="rounded bg-black/50 px-1.5 py-0.5 text-xs text-white">{item.type === 'youtube' ? '▶ Video' : '📷'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Documents ── */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-5">Documents</h2>
          <div className="grid gap-8 lg:grid-cols-2">
            {/* Upload form */}
            <form onSubmit={handleDocUpload} className="rounded-lg border p-5 space-y-4">
              <p className="text-sm font-medium">Upload Document</p>
              {/* Upload mode tabs */}
              <div className="flex gap-1 rounded-md border p-1 w-fit">
                <button type="button" onClick={() => { setDocUploadMode('file'); setDocDriveFile(null) }} className={`rounded px-3 py-1 text-sm font-medium transition-colors ${docUploadMode === 'file' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>Upload File</button>
                <button type="button" onClick={() => { setDocUploadMode('drive'); setDocFile(null) }} className={`rounded px-3 py-1 text-sm font-medium transition-colors ${docUploadMode === 'drive' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>Google Drive</button>
              </div>
              {docUploadMode === 'file' ? (
                <div
                  onClick={() => docInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setDocDragging(true) }}
                  onDragLeave={() => setDocDragging(false)}
                  onDrop={(e) => { e.preventDefault(); setDocDragging(false); const f = e.dataTransfer.files[0]; if (f) { setDocFile(f); if (!docName) setDocName(f.name.replace(/\.[^.]+$/, '')) } }}
                  className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${docDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
                >
                  <input ref={docInputRef} type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0] ?? null; if (f) { setDocFile(f); if (!docName) setDocName(f.name.replace(/\.[^.]+$/, '')) } }} />
                  {docFile ? (
                    <div><Badge variant="secondary" className="text-sm">{docFile.name}</Badge><p className="text-xs text-muted-foreground mt-1">{(docFile.size / 1024).toFixed(0)} KB</p></div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Drag & drop or click to browse</p>
                  )}
                </div>
              ) : (
                <div
                  onClick={() => openPicker((df) => { setDocDriveFile(df); if (!docName) setDocName(df.fileName.replace(/\.[^.]+$/, '')) })}
                  className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${docDriveFile ? 'border-primary/50 bg-primary/5' : 'border-border hover:border-primary/50'}`}
                >
                  {docDriveFile ? (
                    <div><Badge variant="secondary" className="text-sm">{docDriveFile.fileName}</Badge><p className="text-xs text-muted-foreground mt-1">From Google Drive</p></div>
                  ) : (
                    <div>
                      <p className="text-sm text-muted-foreground">Click to open Google Drive picker</p>
                      <p className="text-xs text-muted-foreground mt-1">File will be downloaded and stored securely</p>
                    </div>
                  )}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1">Document Type</label>
                  <select value={docType} onChange={(e) => setDocType(e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm bg-background">
                    {DOC_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1">Visible To</label>
                  <select value={docVisibleTo} onChange={(e) => setDocVisibleTo(e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm bg-background">
                    {VISIBILITY.map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1">Document Name</label>
                  <input value={docName} onChange={(e) => setDocName(e.target.value)} required placeholder="e.g. Q1 2025 Report" className="w-full border rounded-md px-3 py-2 text-sm bg-background" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1">Specific Investor Email <span className="normal-case font-normal">(leave blank for all)</span></label>
                  <input value={docEmail} onChange={(e) => setDocEmail(e.target.value)} type="email" placeholder="investor@example.com" className="w-full border rounded-md px-3 py-2 text-sm bg-background" />
                </div>
              </div>
              <Button type="submit" disabled={(docUploadMode === 'file' ? !docFile : !docDriveFile) || docUploading} className="w-full">
                {docUploading ? 'Uploading…' : docUploadMode === 'drive' ? 'Import from Drive' : 'Upload Document'}
              </Button>
            </form>

            {/* Doc list */}
            <div className="rounded-lg border overflow-hidden">
              <div className="px-4 py-3 border-b bg-muted/50">
                <p className="text-sm font-medium">Uploaded ({assetDocs.length})</p>
              </div>
              {docsLoading ? <p className="text-sm text-muted-foreground px-4 py-3">Loading…</p> : assetDocs.length === 0 ? (
                <p className="text-sm text-muted-foreground px-4 py-3">No documents yet.</p>
              ) : (
                <div className="divide-y">
                  {assetDocs.map((doc) => (
                    <div key={doc.id} className="px-4 py-3 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{doc.doc_name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{doc.date} · {doc.email === 'all' ? 'All investors' : doc.email}</p>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        <Badge variant="outline" className="text-xs">{DOC_TYPES.find(t => t.value === doc.doc_type)?.label || doc.doc_type}</Badge>
                        <Badge variant="secondary" className="text-xs">{doc.visible_to.toUpperCase()}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── Announcements ── */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-5">Announcements</h2>
          <div className="grid gap-8 lg:grid-cols-2">
            {/* Post form */}
            <form onSubmit={handlePostAnnouncement} className="rounded-lg border p-5 space-y-4">
              <p className="text-sm font-medium">New Announcement</p>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1">Title</label>
                <input value={annTitle} onChange={(e) => setAnnTitle(e.target.value)} required placeholder="e.g. Q1 2025 Construction Update" className="w-full border rounded-md px-3 py-2 text-sm bg-background" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1">Message</label>
                <textarea value={annBody} onChange={(e) => setAnnBody(e.target.value)} required rows={7} placeholder="Write your update here..." className="w-full border rounded-md px-3 py-2 text-sm bg-background resize-none" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1">
                  Media URLs <span className="normal-case font-normal">(optional — one per line)</span>
                </label>
                <textarea value={annMediaUrls} onChange={(e) => setAnnMediaUrls(e.target.value)} rows={2} placeholder="https://example.com/photo.jpg" className="w-full border rounded-md px-3 py-2 text-sm bg-background resize-none font-mono" />
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={annNotify} onChange={(e) => setAnnNotify(e.target.checked)} className="rounded" />
                Send email notification to investors
              </label>
              <Button type="submit" disabled={annPosting} className="w-full">
                {annPosting ? 'Posting…' : annNotify ? 'Post & Notify Investors' : 'Post Update'}
              </Button>
            </form>

            {/* Past announcements */}
            <div className="rounded-lg border overflow-hidden">
              <div className="px-4 py-3 border-b bg-muted/50">
                <p className="text-sm font-medium">Past Announcements ({announcements.length})</p>
              </div>
              {annLoading ? <p className="text-sm text-muted-foreground px-4 py-3">Loading…</p> : announcements.length === 0 ? (
                <p className="text-sm text-muted-foreground px-4 py-3">No announcements yet.</p>
              ) : (
                <div className="divide-y max-h-96 overflow-y-auto">
                  {announcements.map((ann) => (
                    <div key={ann.id} className="px-4 py-3">
                      <p className="text-sm font-medium">{ann.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{formatDateTime(ann.posted_at)} · {ann.posted_by}</p>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2 whitespace-pre-line">{ann.body}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* Location map */}
      {(asset === 'livingstonfarm' || asset === 'wrenofthewoods') && (
        <section className="border-t">
          <div className="container mx-auto max-w-6xl px-4 pt-8 pb-4">
            <h2 className="text-base font-semibold mb-3">Location</h2>
          </div>
          <PropertyMap
            key={asset}
            lat={asset === 'livingstonfarm' ? 41.901914 : 41.1267614}
            lng={asset === 'livingstonfarm' ? -74.837076 : -73.7133056}
            zoom={asset === 'livingstonfarm' ? 16 : 18}
            label={asset === 'livingstonfarm' ? 'Livingston Farm' : 'Wren of the Woods'}
            height={400}
            gisCounty={asset === 'livingstonfarm' ? 'sullivan' : 'westchester'}
          />
        </section>
      )}

      {/* Media add/edit dialog */}
      <Dialog open={mediaDialogOpen} onOpenChange={setMediaDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editingMediaRow ? 'Edit Media' : 'Add Photo / Video'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Type</Label>
              <Select value={mediaForm.type} onValueChange={(v) => setMediaForm((f) => ({ ...f, type: v as AssetMediaType, uploadMode: v === 'youtube' ? 'url' : f.uploadMode }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="image">Photo</SelectItem>
                  <SelectItem value="youtube">YouTube Video</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {mediaForm.type === 'image' && !editingMediaRow && (
              <div className="flex gap-1 rounded-md border p-1 w-fit">
                <button type="button" onClick={() => setMediaForm((f) => ({ ...f, uploadMode: 'file', url: '', driveFile: null }))} className={`rounded px-3 py-1 text-sm font-medium transition-colors ${mediaForm.uploadMode === 'file' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>Upload File</button>
                <button type="button" onClick={() => setMediaForm((f) => ({ ...f, uploadMode: 'drive', url: '', file: null }))} className={`rounded px-3 py-1 text-sm font-medium transition-colors ${mediaForm.uploadMode === 'drive' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>Google Drive</button>
                <button type="button" onClick={() => setMediaForm((f) => ({ ...f, uploadMode: 'url', file: null, driveFile: null }))} className={`rounded px-3 py-1 text-sm font-medium transition-colors ${mediaForm.uploadMode === 'url' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>Paste URL</button>
              </div>
            )}
            {mediaForm.uploadMode === 'file' && mediaForm.type === 'image' && !editingMediaRow ? (
              <div className="space-y-2">
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0] || null; setMediaForm((f) => ({ ...f, file, caption: f.caption || (file?.name.replace(/\.[^.]+$/, '') ?? '') })) }} />
                <div onClick={() => fileInputRef.current?.click()} className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${mediaForm.file ? 'border-primary/50 bg-primary/5' : 'hover:border-muted-foreground/50'}`}>
                  {mediaForm.file ? <div><p className="text-sm font-medium">{mediaForm.file.name}</p><p className="text-xs text-muted-foreground mt-1">{(mediaForm.file.size / 1024 / 1024).toFixed(1)} MB</p></div> : <div><p className="text-sm text-muted-foreground">Click to select a photo</p><p className="text-xs text-muted-foreground mt-1">JPG, PNG, WebP supported</p></div>}
                </div>
              </div>
            ) : mediaForm.uploadMode === 'drive' && mediaForm.type === 'image' && !editingMediaRow ? (
              <div
                onClick={() => openPicker((df) => setMediaForm((f) => ({ ...f, driveFile: df, caption: f.caption || df.fileName.replace(/\.[^.]+$/, '') })), { imagesOnly: true })}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${mediaForm.driveFile ? 'border-primary/50 bg-primary/5' : 'hover:border-muted-foreground/50'}`}
              >
                {mediaForm.driveFile ? (
                  <div><p className="text-sm font-medium">{mediaForm.driveFile.fileName}</p><p className="text-xs text-muted-foreground mt-1">From Google Drive · {mediaForm.driveFile.mimeType}</p></div>
                ) : (
                  <div><p className="text-sm text-muted-foreground">Click to open Google Drive picker</p><p className="text-xs text-muted-foreground mt-1">Selects images from your Drive</p></div>
                )}
              </div>
            ) : (
              <div className="space-y-1">
                <Label>{mediaForm.type === 'youtube' ? 'YouTube URL' : 'Image URL'}</Label>
                <Input value={mediaForm.url} onChange={(e) => setMediaForm((f) => ({ ...f, url: e.target.value }))} placeholder={mediaForm.type === 'youtube' ? 'https://www.youtube.com/watch?v=…' : 'https://example.com/photo.jpg'} />
              </div>
            )}
            <div className="space-y-1">
              <Label>Caption (optional)</Label>
              <Input value={mediaForm.caption} onChange={(e) => setMediaForm((f) => ({ ...f, caption: e.target.value }))} placeholder="Short description" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMediaDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveMedia} disabled={mediaSaving}>{mediaSaving ? (mediaForm.uploadMode === 'file' || mediaForm.uploadMode === 'drive' ? 'Uploading…' : 'Saving…') : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Media delete dialog */}
      <Dialog open={!!mediaDeleteTarget} onOpenChange={() => setMediaDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Remove Media</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground py-2">Remove this {mediaDeleteTarget?.type === 'youtube' ? 'video' : 'photo'}?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMediaDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => mediaDeleteTarget && handleDeleteMedia(mediaDeleteTarget)}>Remove</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
