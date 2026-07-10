'use client'

import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Simple circular marker so we don't depend on Leaflet's image assets (which
// break under bundlers).
const dot = L.divIcon({
  className: '',
  html: '<div style="width:16px;height:16px;border-radius:50%;background:#ca615f;border:2px solid #fff;box-shadow:0 0 0 2px rgba(0,0,0,.4)"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
})

function Recenter({ lat, lng, zoom }: { lat: number; lng: number; zoom: number }) {
  const map = useMap()
  useEffect(() => {
    map.setView([lat, lng], zoom)
    const t = setTimeout(() => map.invalidateSize(), 150)
    return () => clearTimeout(t)
  }, [map, lat, lng, zoom])
  return null
}

function Sat({ lat, lng, zoom, height }: { lat: number; lng: number; zoom: number; height: number | string }) {
  return (
    <MapContainer center={[lat, lng]} zoom={zoom} scrollWheelZoom style={{ height, width: '100%', background: '#0a0a0a' }}>
      <TileLayer
        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        attribution="Tiles &copy; Esri"
        maxZoom={19}
      />
      <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}" maxZoom={19} />
      <Marker position={[lat, lng]} icon={dot} />
      <Recenter lat={lat} lng={lng} zoom={zoom} />
    </MapContainer>
  )
}

export default function PropertyMap({ address, muniHint = 'North Castle, NY' }: { address: string; muniHint?: string }) {
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null)
  const [status, setStatus] = useState<'loading' | 'ok' | 'fail'>('loading')
  const [expanded, setExpanded] = useState(false)

  const query = /\b(ny|new york)\b/i.test(address) ? address : `${address}, ${muniHint}`

  useEffect(() => {
    let cancelled = false
    setStatus('loading')
    fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`, {
      headers: { Accept: 'application/json' },
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('geo'))))
      .then((arr: Array<{ lat: string; lon: string }>) => {
        if (cancelled) return
        if (arr && arr[0]) { setPos({ lat: Number(arr[0].lat), lng: Number(arr[0].lon) }); setStatus('ok') }
        else setStatus('fail')
      })
      .catch(() => !cancelled && setStatus('fail'))
    return () => { cancelled = true }
  }, [query])

  // Escape closes the lightbox.
  useEffect(() => {
    if (!expanded) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setExpanded(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [expanded])

  const streetViewUrl = pos
    ? `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${pos.lat},${pos.lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`

  return (
    <div>
      <div className="card" style={{ padding: 0, overflow: 'hidden', position: 'relative' }}>
        {status === 'ok' && pos ? (
          <Sat lat={pos.lat} lng={pos.lng} zoom={18} height={300} />
        ) : (
          <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }} className="muted">
            {status === 'loading' ? 'Locating…' : 'Location not found — use Street View below.'}
          </div>
        )}
        {status === 'ok' && (
          <button
            onClick={() => setExpanded(true)}
            className="btn secondary"
            style={{ position: 'absolute', top: 10, right: 10, zIndex: 500, padding: '4px 10px', fontSize: 12 }}
            title="Expand map"
          >
            ⛶ Expand
          </button>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
        <a href={streetViewUrl} target="_blank" rel="noopener noreferrer" className="btn secondary" style={{ padding: '6px 12px', fontSize: 13, textDecoration: 'none' }}>
          Open in Google Street View ↗
        </a>
        <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`} target="_blank" rel="noopener noreferrer" className="btn secondary" style={{ padding: '6px 12px', fontSize: 13, textDecoration: 'none' }}>
          Open in Google Maps ↗
        </a>
      </div>

      {/* Full-screen lightbox */}
      {expanded && pos && (
        <div
          onClick={() => setExpanded(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ position: 'relative', width: 'min(1100px, 96vw)', height: 'min(80vh, 800px)' }}>
            <button
              onClick={() => setExpanded(false)}
              className="btn secondary"
              style={{ position: 'absolute', top: 10, right: 10, zIndex: 1200, padding: '6px 12px', fontSize: 14 }}
            >
              ✕ Close
            </button>
            <div style={{ height: '100%', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)' }}>
              <Sat lat={pos.lat} lng={pos.lng} zoom={19} height="100%" />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
