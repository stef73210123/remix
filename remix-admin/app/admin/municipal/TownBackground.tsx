'use client'

import { useEffect, useState } from 'react'
import { getTownBackground, type CarouselSlide } from '@/lib/municipal/townBackground'

/**
 * Auto-advancing illustrated carousel. Panels are gradient + glyph "postcards"
 * rather than photographs — the app has no image-hosting/fetch capability, so
 * this stays fully self-contained (no external requests, nothing to ever
 * 404) while still reading as a set of town scenes. Pauses on hover.
 */
function Carousel({ slides }: { slides: CarouselSlide[] }) {
  const [i, setI] = useState(0)
  const [paused, setPaused] = useState(false)
  const n = slides.length

  useEffect(() => {
    if (paused || n <= 1) return
    const t = setInterval(() => setI((v) => (v + 1) % n), 5000)
    return () => clearInterval(t)
  }, [paused, n])

  const s = slides[i]
  return (
    <div
      className="card"
      style={{ padding: 0, overflow: 'hidden', position: 'relative', height: '100%', minHeight: 260 }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        style={{
          height: '100%', minHeight: 260, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          background: `linear-gradient(155deg, ${s.from}, ${s.to})`, transition: 'background 0.4s ease', padding: 24, textAlign: 'center',
        }}
      >
        <span style={{ fontSize: 52, lineHeight: 1, marginBottom: 14 }} aria-hidden>{s.icon}</span>
        <div style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>{s.caption}</div>
        <div style={{ color: 'rgba(255,255,255,0.82)', fontSize: 12.5, marginTop: 4 }}>{s.sub}</div>
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
 * / character — paired with an illustrated carousel, above the jurisdiction
 * map. Renders on both flavors (Remix admin and OpenNorthCastle); returns
 * null for towns without curated copy.
 */
export default function TownBackground({ muniKey, townName }: { muniKey: string; townName: string }) {
  const bg = getTownBackground(muniKey)
  if (!bg) return null

  return (
    <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 30, alignItems: 'stretch' }}>
      <div className="card" style={{ padding: 20, flex: '2 1 380px', minWidth: 320 }}>
        <h2 style={{ fontSize: 16, margin: '0 0 14px' }}>About {townName}</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {bg.sections.map((sec) => (
            <div key={sec.key}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 13.5 }}>
                <span aria-hidden>{sec.icon}</span> {sec.label}
              </div>
              <div className="muted" style={{ fontSize: 13, lineHeight: 1.6, marginTop: 4 }}>{sec.text}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ flex: '1 1 280px', minWidth: 260, maxWidth: 420 }}>
        <Carousel slides={bg.slides} />
      </div>
    </div>
  )
}
