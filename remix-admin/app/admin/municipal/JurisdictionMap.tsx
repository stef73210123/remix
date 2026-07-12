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

type LayerState = 'loading' | 'ok' | 'empty' | 'error' | null

// ── OpenStreetMap (Overpass) layers ──────────────────────────────────────────
// Points of interest, plus real trails (paths/footways/tracks) as lines — the
// county GIS "trails" layer traced state-road corridors, so trails come from
// OSM where the geometry is tagged as an actual path.
interface OsmCat {
  key: string
  label: string
  color: string
  geom: 'point' | 'line'
  filter: string
}
const OSM: OsmCat[] = [
  { key: 'trails', label: 'Trails', color: '#84cc16', geom: 'line', filter: 'way["highway"~"^(path|footway|steps|bridleway|track)$"]' },
  { key: 'restaurant', label: 'Restaurants', color: '#e8813a', geom: 'point', filter: 'nwr["amenity"="restaurant"]' },
  { key: 'cafe', label: 'Cafés', color: '#c9973f', geom: 'point', filter: 'nwr["amenity"~"cafe|fast_food"]' },
  { key: 'attraction', label: 'Attractions', color: '#9b7fd4', geom: 'point', filter: 'nwr["tourism"~"attraction|museum|viewpoint|artwork|gallery"]' },
  { key: 'shop', label: 'Shops', color: '#5a9bd4', geom: 'point', filter: 'nwr["shop"]' },
  { key: 'osm_park', label: 'Parks', color: '#3d9c72', geom: 'point', filter: 'nwr["leisure"~"park|nature_reserve"]' },
]

// Overpass instances, tried in order — the main instance rate-limits browsers
// aggressively, so failures fall through to the mirrors.
const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
]

interface OverpassElement {
  type: string
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  geometry?: { lat: number; lon: number }[]
  tags?: Record<string, string>
}

/** POST an Overpass QL query (properly form-encoded — raw bodies are silently
 *  mis-parsed by some instances), falling through the mirror list. */
async function overpassFetch(query: string): Promise<OverpassElement[]> {
  let lastErr: unknown = new Error('overpass unavailable')
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const r = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(query)}`,
      })
      if (!r.ok) throw new Error(`overpass ${r.status}`)
      const data = (await r.json()) as { elements?: OverpassElement[] }
      return data.elements || []
    } catch (e) {
      lastErr = e
    }
  }
  throw lastErr
}

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

/** Lazily queries Overpass for the single active OSM category (POIs as dots,
 *  trails as polylines) within the town bbox. Keyless, on-demand. */
function OsmLayers({ active, onState }: { active: string | null; onState?: (s: LayerState) => void }) {
  const map = useMap()
  const groupRef = useRef<LayerGroup | null>(null)

  useEffect(() => {
    if (groupRef.current) { groupRef.current.remove(); groupRef.current = null }
    const cat = OSM.find((c) => c.key === active)
    if (!cat) return
    let cancelled = false
    const group = L.layerGroup().addTo(map)
    groupRef.current = group
    onState?.('loading')
    const b = map.getBounds()
    const bbox = `${b.getSouth()},${b.getWest()},${b.getNorth()},${b.getEast()}`
    const out = cat.geom === 'line' ? 'out geom 600;' : 'out center 200;'
    const q = `[out:json][timeout:25];(${cat.filter}(${bbox}););${out}`
    overpassFetch(q)
      .then((elements) => {
        if (cancelled) return
        let count = 0
        for (const el of elements) {
          if (cat.geom === 'line' && el.geometry && el.geometry.length > 1) {
            const line = L.polyline(el.geometry.map((p) => [p.lat, p.lon] as [number, number]), {
              color: cat.color, weight: 3, opacity: 0.9,
            })
            const name = el.tags?.name
            line.bindPopup(`<strong>${name || 'Trail'}</strong><br>${el.tags?.highway || 'path'}`)
            line.addTo(group)
            count++
          } else if (cat.geom === 'point') {
            const lat = el.lat ?? el.center?.lat
            const lon = el.lon ?? el.center?.lon
            if (lat == null || lon == null) continue
            const name = el.tags?.name
            const marker = L.circleMarker([lat, lon], {
              radius: 5, color: '#0a0a0a', weight: 1, fillColor: cat.color, fillOpacity: 0.95,
            })
            if (name) marker.bindPopup(`<strong>${name}</strong><br>${cat.label.replace(/s$/, '')}`)
            marker.addTo(group)
            count++
          }
        }
        onState?.(count > 0 ? 'ok' : 'empty')
      })
      .catch(() => { if (!cancelled) onState?.('error') })
    return () => {
      cancelled = true
      if (groupRef.current) { groupRef.current.remove(); groupRef.current = null }
    }
  }, [active, map, onState])
  return null
}

// ── SeeClickFix service requests ─────────────────────────────────────────────
// North Castle runs its 311-style intake on SeeClickFix
// (northcastleny.com/SeeClickFix). The public API is bbox-based, so border
// towns bleed in — filter to addresses inside the town/hamlets so the layer
// shows North Castle's own issues.
const SCF_STATUS_COLORS: Record<string, string> = {
  open: '#ef4444',
  acknowledged: '#f59e0b',
  closed: '#22a06b',
  archived: '#7a8590',
}
const NC_PLACE_RE = /north castle|armonk|banksville|north white plains/i

interface ScfIssue {
  id: number
  status: string
  summary: string
  address?: string
  lat: number
  lng: number
  html_url?: string
  created_at?: string
}

function ScfLayer({ active, muni, onState }: { active: boolean; muni: string; onState?: (s: LayerState) => void }) {
  const map = useMap()
  const groupRef = useRef<LayerGroup | null>(null)

  useEffect(() => {
    if (groupRef.current) { groupRef.current.remove(); groupRef.current = null }
    if (!active) return
    let cancelled = false
    const group = L.layerGroup().addTo(map)
    groupRef.current = group
    onState?.('loading')
    const b = map.getBounds()
    const url =
      'https://seeclickfix.com/api/v2/issues' +
      `?min_lat=${b.getSouth()}&min_lng=${b.getWest()}&max_lat=${b.getNorth()}&max_lng=${b.getEast()}` +
      '&per_page=100&status=open,acknowledged,closed'
    fetch(url, { headers: { Accept: 'application/json' } })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('scf'))))
      .then((data: { issues?: ScfIssue[] }) => {
        if (cancelled) return
        const all = data.issues || []
        // Keep the town's own reports; the bbox otherwise pulls Greenwich,
        // Mount Kisco, etc. If the address filter strips everything (address
        // formats vary), fall back to the raw bbox set rather than nothing.
        const own = muni === 'nc' ? all.filter((i) => NC_PLACE_RE.test(i.address || '')) : all
        const issues = own.length > 0 ? own : all
        let count = 0
        for (const i of issues) {
          if (i.lat == null || i.lng == null) continue
          const color = SCF_STATUS_COLORS[i.status?.toLowerCase?.() || ''] ?? '#7a8590'
          const marker = L.circleMarker([i.lat, i.lng], {
            radius: 6, color: '#0a0a0a', weight: 1, fillColor: color, fillOpacity: 0.95,
          })
          const link = i.html_url ? `<br><a href="${i.html_url}" target="_blank" rel="noopener noreferrer">View on SeeClickFix ↗</a>` : ''
          marker.bindPopup(
            `<strong>${(i.summary || 'Service request').replace(/</g, '&lt;')}</strong>` +
            `<br>${i.status || ''}${i.address ? ` · ${i.address.replace(/</g, '&lt;')}` : ''}${link}`
          )
          marker.addTo(group)
          count++
        }
        onState?.(count > 0 ? 'ok' : 'empty')
      })
      .catch(() => { if (!cancelled) onState?.('error') })
    return () => {
      cancelled = true
      if (groupRef.current) { groupRef.current.remove(); groupRef.current = null }
    }
  }, [active, map, muni, onState])
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
  { key: 'park', label: 'County parks', color: '#22a06b', geom: 'point', service: 'DataHub_CommunityFacilities', match: /park/i, labelField: 'NAME' },
  { key: 'historic', label: 'Historic sites', color: '#c084a6', geom: 'point', service: 'DataHub_CommunityFacilities', match: /historic/i, labelField: 'RESNAME' },
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
function GisLayers({ active, onState }: { active: string | null; onState?: (s: LayerState) => void }) {
  const map = useMap()
  const groupRef = useRef<LayerGroup | null>(null)

  useEffect(() => {
    if (groupRef.current) { groupRef.current.remove(); groupRef.current = null }
    const cfg = GIS.find((g) => g.key === active)
    if (!cfg) return
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

const SCF_KEY = 'scf_issues'

export default function JurisdictionMap({ muni }: { muni: string }) {
  const cfg = MAP[muni]
  // Single active overlay at a time (a toggle), shown over the always-on
  // jurisdiction + hamlet boundaries.
  const [active, setActive] = useState<string | null>(null)
  const [layerState, setLayerState] = useState<LayerState>(null)

  if (!cfg) return null

  function toggle(k: string) {
    setLayerState(null)
    setActive((cur) => (cur === k ? null : k))
  }

  // County GIS civic layers (North Castle only) come first, then reported
  // issues (SeeClickFix), then the OSM layers (trails + POIs).
  const chips: { key: string; label: string; color: string }[] = [
    ...(muni === 'nc' ? GIS.map((g) => ({ key: g.key, label: g.label, color: g.color })) : []),
    ...(muni === 'nc' ? [{ key: SCF_KEY, label: 'Reported issues', color: '#f97316' }] : []),
    ...OSM.map((c) => ({ key: c.key, label: c.label, color: c.color })),
  ]

  return (
    <div style={{ marginBottom: 30 }}>
      <div className="card" style={{ padding: 0, overflow: 'hidden', position: 'relative' }}>
        {/* Interactive legend along the bottom of the map — each pill toggles one
            layer at a time (single-select). */}
        <div
          className="pill-strip"
          style={{
            position: 'absolute', bottom: 10, left: 10, right: 10, zIndex: 1000,
            display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'center',
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
          {active && layerState && layerState !== 'ok' && (
            <span
              style={{
                padding: '5px 10px', fontSize: 11, fontWeight: 600, color: '#fff', borderRadius: 999,
                background: 'rgba(20,24,28,0.72)', border: '1px solid rgba(255,255,255,0.25)', backdropFilter: 'blur(4px)',
                display: 'inline-flex', alignItems: 'center',
              }}
            >
              {layerState === 'loading' ? 'Loading layer…' : layerState === 'empty' ? 'No features here' : 'Layer unavailable'}
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
          <OsmLayers active={active} onState={setLayerState} />
          <ScfLayer active={active === SCF_KEY} muni={muni} onState={setLayerState} />
          <GisLayers active={active} onState={setLayerState} />
          <ResizeFix />
        </MapContainer>
      </div>
    </div>
  )
}
