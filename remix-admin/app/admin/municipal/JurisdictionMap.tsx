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
function PoiLayers({ active }: { active: string | null }) {
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

// ── Westchester County GIS overlays (one active at a time) ───────────────────
// North Castle bounding box (WGS84) to clip county-wide layers.
const NC_BBOX = { xmin: -73.74, ymin: 41.09, xmax: -73.64, ymax: 41.19 }
const GIS_HOST = 'https://giswww.westchestergov.com/arcgis/rest/services'

interface GisLayer {
  key: string
  label: string
  color: string
  geom: 'point' | 'line' | 'polygon'
  service: string
  /** Matches the layer's name in the service's /layers list (ids aren't stable). */
  match: RegExp
  labelField?: string
}
const GIS: GisLayer[] = [
  { key: 'school_dist', label: 'School districts', color: '#a855f7', geom: 'polygon', service: 'Datahub_Boundaries', match: /school\s*district/i, labelField: 'DISTNAME' },
  { key: 'water_dist', label: 'Water districts', color: '#0ea5e9', geom: 'polygon', service: 'Datahub_Boundaries', match: /water\s*district/i, labelField: 'PWS_NAME' },
  { key: 'fire_station', label: 'Fire stations', color: '#ef4444', geom: 'point', service: 'DataHub_CommunityFacilities', match: /fire\s*(station|dept|department|ems)/i, labelField: 'NAME' },
  { key: 'police', label: 'Police', color: '#3b82f6', geom: 'point', service: 'DataHub_CommunityFacilities', match: /police/i, labelField: 'NAME' },
  { key: 'park', label: 'Parks', color: '#22a06b', geom: 'point', service: 'DataHub_CommunityFacilities', match: /park/i, labelField: 'NAME' },
  { key: 'historic', label: 'Historic sites', color: '#c084a6', geom: 'point', service: 'DataHub_CommunityFacilities', match: /historic/i, labelField: 'RESNAME' },
  { key: 'trails', label: 'Trails', color: '#84cc16', geom: 'line', service: 'DataHub_EnvironmentandPlanning', match: /trail/i, labelField: 'NAME' },
  { key: 'flood', label: 'Flood plains', color: '#38bdf8', geom: 'polygon', service: 'MunicipalTaxParcels_Query', match: /flood/i },
]

// Resolve a layer id by name from the service's /layers list (cached per service).
const layerIdCache = new Map<string, { id: number; name: string }[]>()
async function resolveLayerId(service: string, match: RegExp): Promise<number | null> {
  let layers = layerIdCache.get(service)
  if (!layers) {
    const r = await fetch(`${GIS_HOST}/${service}/MapServer/layers?f=json`)
    if (!r.ok) return null
    const j = (await r.json()) as { layers?: { id: number; name: string }[] }
    layers = (j.layers || []).map((l) => ({ id: l.id, name: l.name }))
    layerIdCache.set(service, layers)
  }
  const hit = layers.find((l) => match.test(l.name))
  return hit ? hit.id : null
}

/** Fetches the single active county-GIS layer (clipped to North Castle) and
 *  draws it. Resolves the layer id by name at runtime and fails silently if the
 *  service/CORS is unavailable, so the map never breaks. */
function GisLayers({ active, onState }: { active: string | null; onState?: (s: 'loading' | 'ok' | 'empty' | 'error' | null) => void }) {
  const map = useMap()
  const groupRef = useRef<LayerGroup | null>(null)

  useEffect(() => {
    if (groupRef.current) { groupRef.current.remove(); groupRef.current = null }
    const cfg = GIS.find((g) => g.key === active)
    if (!cfg) { onState?.(null); return }
    let cancelled = false
    const group = L.layerGroup().addTo(map)
    groupRef.current = group
    onState?.('loading')
    ;(async () => {
      try {
        const id = await resolveLayerId(cfg.service, cfg.match)
        if (cancelled) return
        if (id == null) { onState?.('error'); return }
        const b = NC_BBOX
        const url =
          `${GIS_HOST}/${cfg.service}/MapServer/${id}/query` +
          `?where=1%3D1&outFields=*&outSR=4326` +
          `&geometry=${b.xmin}%2C${b.ymin}%2C${b.xmax}%2C${b.ymax}` +
          `&geometryType=esriGeometryEnvelope&inSR=4326&spatialRel=esriSpatialRelIntersects&f=geojson`
        const r = await fetch(url)
        if (!r.ok || cancelled) { if (!cancelled) onState?.('error'); return }
        const data = (await r.json()) as GeoJSON.FeatureCollection
        if (cancelled) return
        const count = data?.features?.length ?? 0
        L.geoJSON(data as GeoJSON.GeoJsonObject, {
          style: () =>
            cfg.geom === 'point'
              ? {}
              : { color: cfg.color, weight: cfg.geom === 'line' ? 3 : 1.8, fillColor: cfg.color, fillOpacity: cfg.geom === 'polygon' ? 0.14 : 0 },
          pointToLayer: (_f, latlng) => L.circleMarker(latlng, { radius: 5, color: '#0a0a0a', weight: 1, fillColor: cfg.color, fillOpacity: 0.95 }),
          onEachFeature: (f, layer) => {
            const v = cfg.labelField && f.properties ? (f.properties as Record<string, unknown>)[cfg.labelField] : null
            layer.bindPopup(`<strong>${v ? String(v) : cfg.label}</strong><br>${cfg.label}`)
          },
        }).addTo(group)
        onState?.(count > 0 ? 'ok' : 'empty')
      } catch {
        if (!cancelled) onState?.('error')
      }
    })()
    return () => {
      cancelled = true
      if (groupRef.current) { groupRef.current.remove(); groupRef.current = null }
    }
  }, [active, map, onState])
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
  const [active, setActive] = useState<string | null>(null)
  const [gisState, setGisState] = useState<'loading' | 'ok' | 'empty' | 'error' | null>(null)

  if (!cfg) return null

  function toggle(k: string) {
    setActive((cur) => (cur === k ? null : k))
  }

  // County GIS civic layers (North Castle only) come first, then the OSM POIs.
  const chips: { key: string; label: string; color: string }[] = [
    ...(muni === 'nc' ? GIS.map((g) => ({ key: g.key, label: g.label, color: g.color })) : []),
    ...POI.map((c) => ({ key: c.key, label: c.label, color: c.color })),
  ]
  const activeIsGis = GIS.some((g) => g.key === active)

  return (
    <div style={{ marginBottom: 30 }}>
      <div className="card" style={{ padding: 0, overflow: 'hidden', position: 'relative' }}>
        {/* Interactive legend overlaid on the map — each pill toggles one layer. */}
        <div
          className="pill-strip"
          style={{
            position: 'absolute', top: 10, left: 10, zIndex: 1000,
            display: 'flex', gap: 4, flexWrap: 'wrap', maxWidth: 'calc(100% - 20px)',
          }}
        >
          {chips.map((c) => {
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
          {activeIsGis && gisState && gisState !== 'ok' && (
            <span
              style={{
                padding: '5px 10px', fontSize: 11, fontWeight: 600, color: '#fff', borderRadius: 999,
                background: 'rgba(20,24,28,0.72)', border: '1px solid rgba(255,255,255,0.25)', backdropFilter: 'blur(4px)',
                display: 'inline-flex', alignItems: 'center',
              }}
            >
              {gisState === 'loading' ? 'Loading county layer…' : gisState === 'empty' ? 'No features here' : 'Layer unavailable'}
            </span>
          )}
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
          <GisLayers active={active} onState={setGisState} />
          <ResizeFix />
        </MapContainer>
      </div>
    </div>
  )
}
