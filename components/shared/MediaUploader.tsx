'use client'

import { useRef, useState } from 'react'
import { toast } from 'sonner'

function isVideo(url: string) {
  return /\.(mp4|webm|mov|ogg)(\?|$)/i.test(url)
}

function isYoutube(url: string) {
  return /youtube\.com|youtu\.be/.test(url)
}

function extractYoutubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?/]+)/)
  return m ? m[1] : null
}

function isImageUrl(url: string) {
  return /\.(jpg|jpeg|png|gif|webp|svg|avif)(\?|$)/i.test(url)
}

function extractFilename(url: string): string {
  const match = url.match(/[?&]key=media\/[^-]+-(.+)$/)
  if (match) return decodeURIComponent(match[1])
  const parts = url.split(/[/?]/)
  return parts[parts.length - 1] || 'file'
}

function MediaThumb({ url, onRemove }: { url: string; onRemove: () => void }) {
  const ytId = isYoutube(url) ? extractYoutubeId(url) : null
  const vid = !ytId && isVideo(url)
  const img = !ytId && !vid && isImageUrl(url)
  const isFile = !ytId && !vid && !img

  if (isFile) {
    return (
      <div className="relative group flex items-center gap-2 rounded-lg border bg-muted px-3 py-2" style={{ maxWidth: 220, flexShrink: 0 }}>
        <span className="text-lg shrink-0">📄</span>
        <span className="text-xs text-muted-foreground truncate">{extractFilename(url)}</span>
        <button
          type="button"
          onClick={onRemove}
          className="ml-auto shrink-0 text-muted-foreground hover:text-destructive text-sm leading-none"
          title="Remove"
        >
          ×
        </button>
      </div>
    )
  }

  return (
    <div className="relative group rounded-lg overflow-hidden bg-muted" style={{ width: 96, height: 72, flexShrink: 0 }}>
      {ytId ? (
        <img
          src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`}
          alt="YouTube thumbnail"
          className="w-full h-full object-cover"
        />
      ) : vid ? (
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <video src={url} className="w-full h-full object-cover" />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="w-full h-full object-cover" />
      )}
      {ytId && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="bg-black/60 rounded-full p-1 text-white text-xs">▶</span>
        </div>
      )}
      <button
        type="button"
        onClick={onRemove}
        className="absolute top-0.5 right-0.5 bg-black/60 hover:bg-black/80 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] leading-none opacity-0 group-hover:opacity-100 transition-opacity"
        title="Remove"
      >
        ×
      </button>
    </div>
  )
}

interface Props {
  value: string[]
  onChange: (urls: string[]) => void
  maxFiles?: number
  acceptAll?: boolean
  noUrl?: boolean
}

export function MediaUploader({ value, onChange, maxFiles = 10, acceptAll = false, noUrl = false }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [urlInput, setUrlInput] = useState('')
  const [dragOver, setDragOver] = useState(false)

  const uploadFile = async (file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch('/api/admin/media-upload', { method: 'POST', body: fd })
    if (!res.ok) throw new Error('Upload failed')
    const { url } = await res.json()
    return url as string
  }

  const handleFiles = async (files: FileList | File[]) => {
    const arr = acceptAll
      ? Array.from(files)
      : Array.from(files).filter((f) => f.type.startsWith('image/') || f.type.startsWith('video/'))
    if (arr.length === 0) return
    setUploading(true)
    try {
      const urls = await Promise.all(arr.map(uploadFile))
      onChange([...value, ...urls].slice(0, maxFiles))
    } catch {
      toast.error('Upload failed — check your R2 configuration.')
    } finally {
      setUploading(false)
    }
  }

  const addUrl = () => {
    const u = urlInput.trim()
    if (!u || value.includes(u)) return
    onChange([...value, u].slice(0, maxFiles))
    setUrlInput('')
  }

  const remove = (idx: number) => {
    const next = [...value]
    next.splice(idx, 1)
    onChange(next)
  }

  return (
    <div className="space-y-2">
      {/* Previews */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((url, i) => (
            <MediaThumb key={i} url={url} onRemove={() => remove(i)} />
          ))}
        </div>
      )}

      {/* Drop zone */}
      <div
        className={`relative flex items-center justify-center gap-3 rounded-lg border-2 border-dashed px-4 py-3 text-sm transition-colors cursor-pointer ${
          dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
        } ${uploading ? 'opacity-60 pointer-events-none' : ''}`}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          handleFiles(e.dataTransfer.files)
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptAll ? '*' : 'image/*,video/*'}
          multiple
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
        {uploading ? (
          <span className="text-muted-foreground">Uploading…</span>
        ) : (
          <span className="text-muted-foreground">
            {acceptAll ? 'Drop files here or' : 'Drop photos/videos here or'} <span className="text-primary underline">browse</span>
          </span>
        )}
      </div>

      {/* External URL input (YouTube etc.) */}
      {!noUrl && (
        <div className="flex gap-1.5">
          <input
            type="url"
            placeholder="Or paste a YouTube / image URL…"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addUrl() } }}
            className="flex-1 h-8 rounded-md border border-input bg-background px-3 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            type="button"
            onClick={addUrl}
            className="px-3 h-8 rounded-md border border-border text-xs hover:bg-muted transition-colors"
          >
            Add
          </button>
        </div>
      )}
    </div>
  )
}
