'use client'

import { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import type { LayerGroup } from 'leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { NC_TOP_TAXPAYERS, type TopTaxpayer } from '@/lib/municipal/budget2026'

function fmtUSDFull(v: number): string {
  return `$${Math.round(v).toLocaleString('en-US')}`
}

const CENTER: [number, number] = [41.13, -73.69]

function cachedGeocode(query: string): [number, number] | null {
  try {
    const v = localStorage.getItem(`geotax:${query}`)
    if (v) { const [a, b] = JSON.parse(v); if (typeof a === 'number' && typeof b === 'number') return [a, b] }
  } catch { /* ignore */ }
  return null
}

/** A single-purpose real-estate LLC is often literally named after its
 *  property's street address (e.g. "154 Bedford Road LLC") — try the owner
 *  name first. Failing that, an address embedded at the start of the notes
 *  field (e.g. "175 King St — Swiss Re North American HQ office campus")
 *  is used instead. Rows that are plainly a person's or company's name with
 *  no address-shaped text (e.g. "Pinkus Scott M") won't resolve, and are
 *  silently skipped rather than guessed at. */
function geocodeQueryFor(row: TopTaxpayer): string {
  const ownerAddress = row.owner.split('/')[0].replace(/\b(LLC|Inc\.?|Corporation|Holdings|Trust)\b/gi, '').trim()
  if (/^\d/.test(ownerAddress)) return ownerAddress
  const fromNotes = row.notes?.match(/^(\d+[^—]+?)\s*—/)
  if (fromNotes) return fromNotes[1].trim()
  return ownerAddress
}

type MapState = 'loading' | 'ok' | 'empty'

/** Geocodes each taxpayer's address one-by-one (throttled + localStorage-
 *  cached, same pattern as JurisdictionMap's permit layer) and drops a pin
 *  as each resolves. Most owner names/notes aren't address-shaped and simply
 *  won't resolve — this plots whichever do, rather than trying to place all 50. */
function TaxpayerMarkers({ onState }: { onState: (s: MapState) => void }) {
  const map = useMap()
  const groupRef = useRef<LayerGroup | null>(null)
  useEffect(() => {
    let cancelled = false
    const group = L.layerGroup().addTo(map)
    groupRef.current = group
    onState('loading')
    ;(async () => {
      let placed = 0
      for (const row of NC_TOP_TAXPAYERS) {
        if (cancelled) return
        const q = geocodeQueryFor(row)
        const place = (lat: number, lng: number) => {
          L.circleMarker([lat, lng], { radius: 5, color: '#0a0a0a', weight: 1, fillColor: '#5a9bd4', fillOpacity: 0.9 })
            .bindPopup(`<strong>#${row.rank} ${row.owner}</strong><br>${fmtUSDFull(row.assessedValue)} assessed`)
            .addTo(group)
          placed++
        }
        const hit = cachedGeocode(q)
        if (hit) { place(hit[0], hit[1]); continue }
        try {
          const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(`${q}, North Castle, NY`)}`
          const r = await fetch(url, { headers: { Accept: 'application/json' } })
          if (r.ok) {
            const arr = (await r.json()) as Array<{ lat?: string; lon?: string }>
            const it = arr?.[0]
            if (it?.lat && it?.lon) {
              const lat = Number(it.lat), lng = Number(it.lon)
              try { localStorage.setItem(`geotax:${q}`, JSON.stringify([lat, lng])) } catch { /* ignore */ }
              if (!cancelled) place(lat, lng)
            }
          }
        } catch { /* skip this one */ }
        if (!cancelled) await new Promise((res) => setTimeout(res, 320))
      }
      if (!cancelled) onState(placed > 0 ? 'ok' : 'empty')
    })()
    return () => { cancelled = true; group.remove() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map])
  return null
}

/** Best-effort map of the Top 50 taxpayers' properties — plots whichever
 *  resolve from a public geocoder (most single-purpose real-estate LLCs are
 *  named after their street address; a few notes carry one too), and skips
 *  the rest rather than guessing coordinates. */
export default function TopTaxpayersMap() {
  const [state, setState] = useState<MapState>('loading')
  return (
    <div style={{ position: 'relative', height: 240, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)', marginBottom: 12 }}>
      <MapContainer center={CENTER} zoom={12} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
        <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <TaxpayerMarkers onState={setState} />
      </MapContainer>
      {state !== 'ok' && (
        <div
          className="muted"
          style={{ position: 'absolute', bottom: 6, left: 8, fontSize: 11, background: 'var(--panel)', padding: '2px 6px', borderRadius: 4, zIndex: 1000 }}
        >
          {state === 'loading' ? 'Locating properties…' : 'Most owner names on this list aren’t street addresses, so few could be located.'}
        </div>
      )}
    </div>
  )
}
