'use client'

import { useState } from 'react'

function extractYoutubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?/]+)/)
  return m ? m[1] : null
}

function isVideo(url: string) {
  return /\.(mp4|webm|mov|ogg)(\?|$)/i.test(url)
}

function MediaItem({ url }: { url: string }) {
  const ytId = extractYoutubeId(url)
  const vid = !ytId && isVideo(url)

  if (ytId) {
    return (
      <div className="rounded-lg overflow-hidden bg-muted aspect-video">
        <iframe
          src={`https://www.youtube.com/embed/${ytId}`}
          title="Video"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="w-full h-full"
        />
      </div>
    )
  }
  if (vid) {
    return (
      <div className="rounded-lg overflow-hidden bg-black aspect-video">
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video src={url} controls className="w-full h-full object-contain" />
      </div>
    )
  }
  return (
    <div className="rounded-lg overflow-hidden bg-muted">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="" className="w-full object-cover max-h-64" />
    </div>
  )
}

export function FeedMediaPreview({ urls }: { urls: string[] }) {
  const [expanded, setExpanded] = useState(false)
  if (urls.length === 0) return null

  const shown = expanded ? urls : urls.slice(0, 2)
  const extra = urls.length - 2

  if (urls.length === 1) {
    return (
      <div className="mt-1">
        <MediaItem url={urls[0]} />
      </div>
    )
  }

  return (
    <div className="mt-1 space-y-1.5">
      {/* Grid for images, stacked for video */}
      <div className="grid grid-cols-2 gap-1.5">
        {shown.map((url, i) => (
          <div key={i} className="relative">
            <MediaItem url={url} />
            {!expanded && i === 1 && extra > 0 && (
              <button
                onClick={() => setExpanded(true)}
                className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/50 text-white text-sm font-semibold"
              >
                +{extra} more
              </button>
            )}
          </div>
        ))}
      </div>
      {expanded && extra > 0 && (
        <button onClick={() => setExpanded(false)} className="text-xs text-muted-foreground hover:text-foreground">
          Show less
        </button>
      )}
    </div>
  )
}
