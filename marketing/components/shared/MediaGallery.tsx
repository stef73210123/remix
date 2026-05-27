'use client'

import { useState } from 'react'
import type { AssetMedia } from '@/types'

function youtubeId(url: string): string | null {
  const m = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{11})/
  )
  return m ? m[1] : null
}

function Lightbox({
  images,
  startIndex,
  onClose,
}: {
  images: AssetMedia[]
  startIndex: number
  onClose: () => void
}) {
  const [idx, setIdx] = useState(startIndex)
  const current = images[idx]

  const prev = () => setIdx((i) => (i - 1 + images.length) % images.length)
  const next = () => setIdx((i) => (i + 1) % images.length)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
      onClick={onClose}
    >
      {/* Inner panel — stop click propagation so clicking image doesn't close */}
      <div
        className="relative max-w-5xl w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute -top-10 right-0 text-white/70 hover:text-white text-sm tracking-widest uppercase"
        >
          Close ✕
        </button>

        {/* Image */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={current.url}
          alt={current.caption || ''}
          className="w-full max-h-[80vh] object-contain rounded"
        />

        {/* Caption */}
        {current.caption && (
          <p className="text-white/70 text-sm text-center mt-3">{current.caption}</p>
        )}

        {/* Nav arrows */}
        {images.length > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-12 text-white/70 hover:text-white text-3xl px-2"
            >
              ‹
            </button>
            <button
              onClick={next}
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-12 text-white/70 hover:text-white text-3xl px-2"
            >
              ›
            </button>

            {/* Dots */}
            <div className="flex justify-center gap-1.5 mt-4">
              {images.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setIdx(i)}
                  className={`h-1.5 rounded-full transition-all ${i === idx ? 'w-4 bg-white' : 'w-1.5 bg-white/40'}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function MediaGallery({ media }: { media: AssetMedia[] }) {
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null)

  const images = media.filter((m) => m.type === 'image')
  const videos = media.filter((m) => m.type === 'youtube')

  if (media.length === 0) return null

  return (
    <section className="border-b">
      <div className="container mx-auto max-w-6xl px-4 py-10">
        {/* Photo grid */}
        {images.length > 0 && (
          <div
            className={`grid gap-3 mb-6 ${
              images.length === 1
                ? 'grid-cols-1 max-w-2xl'
                : images.length === 2
                ? 'grid-cols-2'
                : 'grid-cols-2 md:grid-cols-3'
            }`}
          >
            {images.map((img, i) => (
              <div
                key={img.id}
                className={`overflow-hidden rounded-lg bg-muted cursor-pointer group relative ${
                  images.length >= 3 && i === 0 ? 'col-span-2 md:col-span-1' : ''
                }`}
                onClick={() => setLightboxIdx(i)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.url}
                  alt={img.caption || ''}
                  className="w-full h-64 object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                />
                {/* Expand hint */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                  <span className="text-white text-xs tracking-widest uppercase bg-black/40 px-3 py-1 rounded">
                    View
                  </span>
                </div>
                {img.caption && (
                  <p className="px-2 py-1 text-xs text-muted-foreground">{img.caption}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Videos */}
        {videos.length > 0 && (
          <div className={`grid gap-4 ${videos.length > 1 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 max-w-2xl'}`}>
            {videos.map((vid) => {
              const id = youtubeId(vid.url)
              if (!id) return null
              return (
                <div key={vid.id}>
                  <div className="relative aspect-video rounded-lg overflow-hidden bg-black">
                    <iframe
                      src={`https://www.youtube.com/embed/${id}`}
                      title={vid.caption || 'Property video'}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="absolute inset-0 w-full h-full"
                    />
                  </div>
                  {vid.caption && (
                    <p className="mt-1 text-xs text-muted-foreground">{vid.caption}</p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxIdx !== null && (
        <Lightbox
          images={images}
          startIndex={lightboxIdx}
          onClose={() => setLightboxIdx(null)}
        />
      )}
    </section>
  )
}
