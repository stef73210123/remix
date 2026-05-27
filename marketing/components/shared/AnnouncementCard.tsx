'use client'

import { useState } from 'react'

function extractYoutubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?/]+)/)
  return m ? m[1] : null
}

function isVideoUrl(url: string) {
  return /\.(mp4|webm|mov|ogg)(\?|$)/i.test(url)
}

function MediaCarousel({ urls }: { urls: string[] }) {
  const [idx, setIdx] = useState(0)
  if (urls.length === 0) return null

  const url = urls[idx]
  const ytId = extractYoutubeId(url)
  const isVid = !ytId && isVideoUrl(url)

  return (
    <div className="mt-3">
      <div className="rounded-lg overflow-hidden bg-muted aspect-video">
        {ytId ? (
          <iframe
            src={`https://www.youtube.com/embed/${ytId}`}
            title="Update video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full"
          />
        ) : isVid ? (
          // eslint-disable-next-line jsx-a11y/media-has-caption
          <video src={url} controls className="w-full h-full object-contain bg-black" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt=""
            className="w-full h-full object-cover"
          />
        )}
      </div>
      {urls.length > 1 && (
        <div className="flex items-center gap-1 mt-2 justify-center">
          {urls.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              className={`rounded-full transition-all ${
                i === idx ? 'w-4 h-1.5 bg-primary' : 'w-1.5 h-1.5 bg-muted-foreground/30'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface AnnouncementCardProps {
  title: string
  date?: string
  postedBy?: string
  body?: string
  bodyHtml?: string
  mediaUrls?: string[]
}

export function AnnouncementCard({
  title,
  date,
  postedBy,
  body,
  bodyHtml,
  mediaUrls = [],
}: AnnouncementCardProps) {
  return (
    <div className="rounded-lg border-l-4 border-primary bg-muted/30 px-5 py-4">
      <div className="flex items-start justify-between gap-2 mb-1">
        <h3 className="text-sm font-semibold">{title}</h3>
        {date && (
          <span className="text-xs text-muted-foreground shrink-0">{date}</span>
        )}
      </div>
      {postedBy && (
        <p className="text-xs text-muted-foreground mb-2">{postedBy}</p>
      )}
      {body && (
        <p className="text-sm text-muted-foreground whitespace-pre-line">{body}</p>
      )}
      {bodyHtml && (
        <div
          className="prose prose-sm max-w-none text-muted-foreground prose-headings:font-semibold prose-headings:tracking-tight"
          dangerouslySetInnerHTML={{ __html: bodyHtml }}
        />
      )}
      {mediaUrls.length > 0 && <MediaCarousel urls={mediaUrls} />}
    </div>
  )
}
