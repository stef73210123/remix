'use client'

import { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import type { GeoJSON as LGeoJSON, LayerGroup } from 'leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Per-town map framing + the OSM/Nominatim query used to fetch the exact
// jurisdiction boundary at runtime (client-side, so it isn't proxy-blocked).
const MAP: Record<string, { center: [number, number]; zoom: number; query: string }> = {
  nc: { center: [41.13, -73.69], zoom: 12, query: 'Town of North Castle, Westchester County, New York' },
  rockland: { center: [41.86, -74.82], zoom: 12, query: 'Town of Rockland, Sullivan County, New York' },
}

type PoiKey = 'restaurant' | 'attraction' | 'cafe' | 'shop' | 'park'
const POI: { key: PoiKey; label: string; color: string; filter: string }[] = [
  { key: 'restaurant', label: 'Restaurants', color: '#e8813a', filter: 'node["amenity"="restaurant"]' },
  { key: 'cafe', label: 'Cafés', color: '#c9973f', filter: 'node["amenity"~"cafe|fast_food"]' },
  { key: 'attraction', label: 'Attractions', color: '#9b7fd4', filter: 'node["tourism"~"attraction|museum|viewpoint|artwork|gallery"]' },
  { key: 'shop', label: 'Shops', color: '#5a9bd4', filter: 'node["shop"]' },
  { key: 'park', label: 'Parks', color: '#3d9c72', filter: 'nwr["leisure"~"park|nature_reserve"]' },
]

/** Draws the jurisdiction boundary (fetched at runtime) and fits the map to it. */
function Boundary({ muni }: { muni: string }) {
  const map = useMap()
  const layerRef = useRef<LGeoJSON | null>(null)
  useEffect(() => {
    const cfg = MAP[muni]
    if (!cfg) return
    let cancelled = false
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&polygon_geojson=1&limit=1&q=${encodeURIComponent(cfg.query)}`
    fetch(url, { headers: { Accept: 'application/json' } })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('geo'))))
      .then((arr: Array<{ geojson?: GeoJSON.Geometry }>) => {
        if (cancelled) return
        const geom = arr?.[0]?.geojson
        if (!geom || (geom.type !== 'Polygon' && geom.type !== 'MultiPolygon')) return
        const layer = L.geoJSON({ type: 'Feature', properties: {}, geometry: geom } as GeoJSON.Feature, {
          style: { color: '#ffd24a', weight: 2.5, fill: false, dashArray: '4 3' },
        })
        layer.addTo(map)
        layerRef.current = layer
        try { map.fitBounds(layer.getBounds(), { padding: [16, 16] }) } catch { /* keep default view */ }
      })
      .catch(() => { /* fall back to the town-centered default view */ })
    return () => {
      cancelled = true
      if (layerRef.current) { layerRef.current.remove(); layerRef.current = null }
    }
  }, [map, muni])
  return null
}

/** Lazily queries Overpass for the enabled POI categories within the current
 *  view and renders them as labelled dots. Keyless, on-demand. */
function PoiLayers({ enabled }: { enabled: Set<PoiKey> }) {
  const map = useMap()
  const groups = useRef<Record<string, LayerGroup>>({})
  const loaded = useRef<Set<string>>(new Set())

  useEffect(() => {
    for (const cat of POI) {
      const on = enabled.has(cat.key)
      const g = groups.current[cat.key]
      if (on && !g) {
        const group = L.layerGroup().addTo(map)
        groups.current[cat.key] = group
        const b = map.getBounds()
        const bbox = `${b.getSouth()},${b.getWest()},${b.getNorth()},${b.getEast()}`
        const q = `[out:json][timeout:20];(${cat.filter}(${bbox}););out center 80;`
        fetch('https://overpass-api.de/api/interpreter', { method: 'POST', body: q })
          .then((r) => (r.ok ? r.json() : Promise.reject(new Error('overpass'))))
          .then((data: { elements?: Array<{ lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> }> }) => {
            for (const el of data.elements || []) {
              const lat = el.lat ?? el.center?.lat
              const lon = el.lon ?? el.center?.lon
              if (lat == null || lon == null) continue
              const name = el.tags?.name
              const marker = L.circleMarker([lat, lon], {
                radius: 5, color: '#0a0a0a', weight: 1, fillColor: cat.color, fillOpacity: 0.95,
              })
              if (name) marker.bindPopup(`<strong>${name}</strong><br>${cat.label.replace(/s$/, '')}`)
              marker.addTo(group)
            }
            loaded.current.add(cat.key)
          })
          .catch(() => { /* leave the category empty on failure */ })
      } else if (!on && g) {
        g.remove()
        delete groups.current[cat.key]
        loaded.current.delete(cat.key)
      }
    }
  }, [enabled, map])
  return null
}

function ResizeFix() {
  const map = useMap()
  useEffect(() => {
    // Leaflet miscomputes size when its container mounts hidden/animating.
    const t = setTimeout(() => map.invalidateSize(), 200)
    return () => clearTimeout(t)
  }, [map])
  return null
}

export default function JurisdictionMap({ muni }: { muni: string }) {
  const cfg = MAP[muni]
  const [enabled, setEnabled] = useState<Set<PoiKey>>(new Set())

  if (!cfg) return null

  function toggle(k: PoiKey) {
    setEnabled((prev) => {
      const next = new Set(prev)
      if (next.has(k)) next.delete(k)
      else next.add(k)
      return next
    })
  }

  return (
    <div style={{ marginBottom: 30 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', margin: '0 0 12px' }}>
        <h2 style={{ fontSize: 16, margin: 0 }}>Jurisdiction</h2>
        <div className="pill-strip" style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {POI.map((c) => (
            <button
              key={c.key}
              onClick={() => toggle(c.key)}
              className="btn secondary"
              style={{
                padding: '4px 10px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6,
                ...(enabled.has(c.key) ? { background: 'var(--primary)', color: '#fff', borderColor: 'var(--primary)' } : {}),
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.color, display: 'inline-block' }} />
              {c.label}
            </button>
          ))}
        </div>
      </div>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <MapContainer
          center={cfg.center}
          zoom={cfg.zoom}
          scrollWheelZoom={false}
          style={{ height: 420, width: '100%', background: '#0a0a0a' }}
        >
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution="Tiles &copy; Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community"
            maxZoom={19}
          />
          {/* Place/road labels over the imagery, so it reads like a normal map. */}
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
            maxZoom={19}
          />
          <Boundary muni={muni} />
          <PoiLayers enabled={enabled} />
          <ResizeFix />
        </MapContainer>
      </div>
    </div>
  )
}
