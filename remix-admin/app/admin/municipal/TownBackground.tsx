'use client'

import { useEffect, useState } from 'react'
import { Landmark, Briefcase, Building2, Trees, Home, Tent, Palette, TrainFront, Bike, Plane } from 'lucide-react'
import { getTownBackground, type CarouselSlide, type TownIcon } from '@/lib/municipal/townBackground'

const ICONS: Record<TownIcon, typeof Landmark> = {
  landmark: Landmark,
  briefcase: Briefcase,
  'building-2': Building2,
  trees: Trees,
  home: Home,
  tent: Tent,
  palette: Palette,
  'train-front': TrainFront,
  bike: Bike,
  plane: Plane,
}

/**
 * Auto-advancing photo carousel. Photos are hotlinked from third-party CDNs
 * (Tripadvisor, a fabricator's project page, local event sites, …) — if one
 * ever breaks, that slide falls back to a gradient + glyph "postcard" instead
 * of a broken-image icon. Pauses on hover.
 */
function Carousel({ slides }: { slides: CarouselSlide[] }) {
  const [i, setI] = useState(0)
  const [paused, setPaused] = useState(false)
  const [failed, setFailed] = useState<Record<string, boolean>>({})
  const n = slides.length

  useEffect(() => {
    if (paused || n <= 1) return
    const t = setInterval(() => setI((v) => (v + 1) % n), 5000)
    return () => clearInterval(t)
  }, [paused, n])

  const s = slides[i]
  const showImg = s.img && !failed[s.key]
  const SlideIcon = ICONS[s.icon]
  return (
    <div
      className="card"
      style={{ padding: 0, overflow: 'hidden', position: 'relative', height: '100%', minHeight: 200 }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div style={{ position: 'relative', height: '100%', minHeight: 200, background: `linear-gradient(155deg, ${s.from}, ${s.to})`, transition: 'background 0.4s ease' }}>
        {showImg ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={s.img}
            alt={s.caption}
            onError={() => setFailed((f) => ({ ...f, [s.key]: true }))}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <SlideIcon size={52} strokeWidth={1.5} color="rgba(255,255,255,0.85)" aria-hidden />
          </div>
        )}
        <div
          style={{
            position: 'absolute', left: 0, right: 0, bottom: 0, padding: '32px 20px 16px',
            background: 'linear-gradient(to top, rgba(10,14,20,0.82), rgba(10,14,20,0))',
          }}
        >
          <div style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>{s.caption}</div>
          <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12.5, marginTop: 3 }}>{s.sub}</div>
        </div>
      </div>

      {n > 1 && (
        <>
          <button
            onClick={() => setI((v) => (v - 1 + n) % n)}
            aria-label="Previous"
            style={navBtnStyle('left')}
          >
            ‹
          </button>
          <button
            onClick={() => setI((v) => (v + 1) % n)}
            aria-label="Next"
            style={navBtnStyle('right')}
          >
            ›
          </button>
          <div style={{ position: 'absolute', bottom: 10, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 6 }}>
            {slides.map((slide, idx) => (
              <button
                key={slide.key}
                onClick={() => setI(idx)}
                aria-label={`Show ${slide.caption}`}
                aria-current={idx === i}
                style={{
                  width: idx === i ? 16 : 6, height: 6, borderRadius: 999, border: 'none', padding: 0, cursor: 'pointer',
                  background: idx === i ? '#fff' : 'rgba(255,255,255,0.5)', transition: 'width 0.2s ease',
                }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function navBtnStyle(side: 'left' | 'right'): React.CSSProperties {
  return {
    position: 'absolute', top: '50%', [side]: 8, transform: 'translateY(-50%)',
    width: 30, height: 30, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.35)',
    background: 'rgba(20,24,28,0.45)', color: '#fff', fontSize: 18, lineHeight: '28px',
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
  }
}

/**
 * Short editorial "about the town" panel — history / economy / key industries
 * / character — paired with a photo carousel, above the jurisdiction map.
 * Renders on both flavors (Remix admin and OpenNorthCastle); returns null for
 * towns without curated copy.
 */
export default function TownBackground({ muniKey, townName }: { muniKey: string; townName: string }) {
  const bg = getTownBackground(muniKey)
  // Four paragraphs of background pushed the map and meetings a full phone
  // screen down. Show the first section; the rest is one tap away.
  const [expanded, setExpanded] = useState(false)
  if (!bg) return null
  const shown = expanded ? bg.sections : bg.sections.slice(0, 1)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 30 }}>
      <div className="town-carousel">
        <Carousel slides={bg.slides} />
      </div>
      <div className="card" style={{ padding: 20 }}>
        <h2 style={{ fontSize: 16, margin: '0 0 14px' }}>About {townName}</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {shown.map((sec) => {
            const SectionIcon = ICONS[sec.icon]
            return (
            <div key={sec.key}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 13.5 }}>
                <SectionIcon size={15} aria-hidden /> {sec.label}
              </div>
              <div className="muted" style={{ fontSize: 13, lineHeight: 1.6, marginTop: 4 }}>{sec.text}</div>
            </div>
            )
          })}
        </div>
        {bg.sections.length > 1 && (
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            aria-expanded={expanded}
            style={{ marginTop: 10, font: 'inherit', fontSize: 13, color: 'var(--primary-light)', background: 'none', border: 'none', padding: 0, cursor: 'pointer', textDecoration: 'underline' }}
          >
            {expanded ? 'Show less' : `More about ${townName.replace(/^Town of /, '')} — ${bg.sections.slice(1).map((s) => s.label.toLowerCase()).join(', ')}`}
          </button>
        )}
      </div>
    </div>
  )
}
