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

/** Lazily queries Overpass for the single active POI category within the current
 *  view and renders it as labelled dots. Keyless, on-demand. */
function PoiLayers({ active }: { active: PoiKey | null }) {
  const map = useMap()
  const groups = useRef<Record<string, LayerGroup>>({})
  const loaded = useRef<Set<string>>(new Set())

  useEffect(() => {
    for (const cat of POI) {
      const on = active === cat.key
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
  }, [active, map])
  return null
}

// North Castle's three hamlets — drawn as secondary boundaries over the town.
const HAMLETS: Record<string, string[]> = {
  nc: ['Armonk, New York', 'Banksville, New York', 'North White Plains, New York'],
}

/** Draws the town's hamlet/CDP boundaries (fetched at runtime) with labels, so
 *  Armonk, Banksville and North White Plains read on the map alongside the town
 *  outline. Fetched sequentially to stay gentle on Nominatim. */
function Hamlets({ muni }: { muni: string }) {
  const map = useMap()
  const groupRef = useRef<LayerGroup | null>(null)
  useEffect(() => {
    const names = HAMLETS[muni]
    if (!names) return
    let cancelled = false
    const group = L.layerGroup().addTo(map)
    groupRef.current = group
    const label = (text: string) =>
      L.divIcon({
        className: '',
        html: `<div style="font:600 11px system-ui,-apple-system,sans-serif;color:#fff;white-space:nowrap;text-shadow:0 1px 3px rgba(0,0,0,0.9),0 0 2px rgba(0,0,0,0.9);pointer-events:none;">${text}</div>`,
        iconSize: [0, 0],
      })
    ;(async () => {
      for (const q of names) {
        if (cancelled) return
        try {
          const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&polygon_geojson=1&limit=1&q=${encodeURIComponent(q)}`
          const r = await fetch(url, { headers: { Accept: 'application/json' } })
          if (!r.ok) continue
          const arr = (await r.json()) as Array<{ geojson?: GeoJSON.Geometry; lat?: string; lon?: string }>
          const item = arr?.[0]
          const name = q.split(',')[0]
          const geom = item?.geojson
          if (geom && (geom.type === 'Polygon' || geom.type === 'MultiPolygon')) {
            const layer = L.geoJSON({ type: 'Feature', properties: {}, geometry: geom } as GeoJSON.Feature, {
              style: { color: '#ffffff', weight: 1.5, fill: false, dashArray: '2 4', opacity: 0.9 },
            }).addTo(group)
            L.marker(layer.getBounds().getCenter(), { icon: label(name), interactive: false }).addTo(group)
          } else if (item?.lat && item?.lon) {
            L.marker([Number(item.lat), Number(item.lon)], { icon: label(name), interactive: false }).addTo(group)
          }
        } catch { /* skip this hamlet on failure */ }
        if (!cancelled) await new Promise((res) => setTimeout(res, 350))
      }
    })()
    return () => {
      cancelled = true
      if (groupRef.current) { groupRef.current.remove(); groupRef.current = null }
    }
  }, [map, muni])
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
  // Single active overlay at a time (a toggle), shown over the always-on
  // jurisdiction + hamlet boundaries.
  const [active, setActive] = useState<PoiKey | null>(null)

  if (!cfg) return null

  function toggle(k: PoiKey) {
    setActive((cur) => (cur === k ? null : k))
  }

  return (
    <div style={{ marginBottom: 30 }}>
      <div className="card" style={{ padding: 0, overflow: 'hidden', position: 'relative' }}>
        {/* Interactive legend overlaid on the map — each pill toggles a POI layer. */}
        <div
          className="pill-strip"
          style={{
            position: 'absolute', top: 10, left: 10, zIndex: 1000,
            display: 'flex', gap: 4, flexWrap: 'wrap', maxWidth: 'calc(100% - 20px)',
          }}
        >
          {POI.map((c) => {
            const on = active === c.key
            return (
              <button
                key={c.key}
                onClick={() => toggle(c.key)}
                aria-pressed={on}
                style={{
                  padding: '5px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 999,
                  border: '1px solid rgba(255,255,255,0.25)',
                  color: '#fff',
                  background: on ? c.color : 'rgba(20,24,28,0.72)',
                  backdropFilter: 'blur(4px)',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.35)',
                  transition: 'background 0.12s',
                }}
              >
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.color, display: 'inline-block', border: on ? '1px solid #fff' : 'none' }} />
                {c.label}
              </button>
            )
          })}
        </div>
        <MapContainer
          center={cfg.center}
          zoom={cfg.zoom}
          scrollWheelZoom={false}
          style={{ height: 440, width: '100%', background: '#0a0a0a' }}
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
          <Hamlets muni={muni} />
          <PoiLayers active={active} />
          <ResizeFix />
        </MapContainer>
      </div>
    </div>
  )
}
