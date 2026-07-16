'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import type { GeoJSON as LGeoJSON, LayerGroup } from 'leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { fmtDateShort } from '@/lib/municipal/date'

// Per-town map framing + the OSM/Nominatim query used to fetch the exact
// jurisdiction boundary at runtime (client-side, so it isn't proxy-blocked).
const MAP: Record<string, { center: [number, number]; zoom: number; query: string }> = {
  nc: { center: [41.13, -73.69], zoom: 12, query: 'Town of North Castle, Westchester County, New York' },
  rockland: { center: [41.86, -74.82], zoom: 12, query: 'Town of Rockland, Sullivan County, New York' },
}

type LayerState = 'loading' | 'ok' | 'empty' | 'error' | null

/** A permit rendered on the map. Geocoded lazily from its address. */
export interface PermitMarker {
  id: string
  address: string
  title: string
  sub?: string
  color: string
}

// ── OpenStreetMap (Overpass) layers ──────────────────────────────────────────
// Points of interest, plus real trails (paths/footways/tracks) as lines — the
// county GIS "trails" name-match resolved to road-corridor geometry (it drew
// what looked like State Roads), so trails come from OSM where the geometry is
// tagged as an actual path.
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
 *  trails as polylines) within the current view. Keyless, on-demand. */
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

// ── SeeClickFix civic issues (client-side; the portal's own map API) ─────────
const ISSUE_STATUS_COLOR: Record<string, string> = {
  Open: '#ef4444', Acknowledged: '#f59e0b', 'In Progress': '#f59e0b',
  Closed: '#3d9c72', Archived: '#9a9a9a',
}
interface ScfIssue {
  id: number; status?: string; summary?: string; description?: string; address?: string
  lat?: number; lng?: number; created_at?: string; acknowledged_at?: string | null; closed_at?: string | null
  html_url?: string
  request_type?: { title?: string }
}
// The API is bbox-based, so border towns (Greenwich, Mount Kisco, …) bleed in
// and can drown out the town's own reports — keep addresses inside the
// town/hamlets when any match.
const NC_PLACE_RE = /north castle|armonk|banksville|north white plains/i

/** Whole days between two ISO timestamps, floored at 0 (a same-day ack/close
 *  shouldn't read as negative from rounding). */
function daysBetween(fromIso: string, toIso: string): number {
  return Math.max(0, Math.round((new Date(toIso).getTime() - new Date(fromIso).getTime()) / 86400000))
}

/** Fetches SeeClickFix issues within the current view and plots them, colored by
 *  status. Fails silently (e.g. if the API is unreachable) so the map is fine. */
function IssueLayer({ active, muni, onState }: { active: boolean; muni: string; onState?: (s: LayerState) => void }) {
  const map = useMap()
  const groupRef = useRef<LayerGroup | null>(null)
  useEffect(() => {
    if (groupRef.current) { groupRef.current.remove(); groupRef.current = null }
    if (!active) { onState?.(null); return }
    let cancelled = false
    const group = L.layerGroup().addTo(map)
    groupRef.current = group
    onState?.('loading')
    const b = map.getBounds()
    const url =
      `https://seeclickfix.com/api/v2/issues?per_page=100&page=1&status=open,acknowledged,closed` +
      `&min_lat=${b.getSouth()}&min_lng=${b.getWest()}&max_lat=${b.getNorth()}&max_lng=${b.getEast()}`
    fetch(url, { headers: { Accept: 'application/json' }, cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('scf'))))
      .then((data: { issues?: ScfIssue[] }) => {
        if (cancelled) return
        const all = data.issues || []
        // North Castle's own reports first; but if the address regex only
        // catches a sliver of a much bigger bbox result (address formats vary
        // a lot in practice), that's a sign the filter is under-matching
        // rather than the bbox genuinely being mostly border-town noise — fall
        // back to the full set so real North Castle issues aren't silently
        // dropped.
        const own = muni === 'nc' ? all.filter((it) => NC_PLACE_RE.test(it.address || '')) : all
        const issues = own.length >= Math.max(3, all.length * 0.3) ? own : all
        let n = 0
        for (const it of issues) {
          if (it.lat == null || it.lng == null) continue
          const color = ISSUE_STATUS_COLOR[it.status || ''] || '#ef4444'
          const created = it.created_at ? fmtDateShort(new Date(it.created_at)) : ''
          const ackDays = it.created_at && it.acknowledged_at ? daysBetween(it.created_at, it.acknowledged_at) : null
          const closeDays = it.created_at && it.closed_at ? daysBetween(it.created_at, it.closed_at) : null
          const ackLine = ackDays != null ? `<br>Acknowledged in ${ackDays} day${ackDays === 1 ? '' : 's'}` : ''
          const closeLine = closeDays != null ? `<br>Closed in ${closeDays} day${closeDays === 1 ? '' : 's'}` : ''
          const link = it.html_url ? `<br><a href="${it.html_url}" target="_blank" rel="noopener">View / follow ↗</a>` : ''
          L.circleMarker([it.lat, it.lng], { radius: 6, color: '#0a0a0a', weight: 1, fillColor: color, fillOpacity: 0.95 })
            .bindPopup(
              `<strong>${it.summary || it.request_type?.title || 'Issue'}</strong>` +
              `<br><span style="color:${color};font-weight:600">${it.status || ''}</span>` +
              (it.address ? `<br>${it.address}` : '') + (created ? `<br>Reported ${created}` : '') +
              ackLine + closeLine + link,
            )
            .addTo(group)
          n++
        }
        onState?.(n > 0 ? 'ok' : 'empty')
      })
      .catch(() => { if (!cancelled) onState?.('error') })
    return () => { cancelled = true; if (groupRef.current) { groupRef.current.remove(); groupRef.current = null } }
  }, [active, map, muni, onState])
  return null
}

// ── Recent permits (client-side geocode; opt-in) ─────────────────────────────
function cachedGeocode(address: string): [number, number] | null {
  try {
    const v = localStorage.getItem(`geo:${address}`)
    if (v) { const [a, b] = JSON.parse(v); if (typeof a === 'number' && typeof b === 'number') return [a, b] }
  } catch { /* ignore */ }
  return null
}
/** Geocodes recent permits one-by-one (throttled + localStorage-cached) and adds
 *  markers as they resolve, so nothing blocks and re-opens are instant. */
function PermitLayer({ active, permits, onState }: { active: boolean; permits: PermitMarker[]; onState?: (s: LayerState) => void }) {
  const map = useMap()
  const groupRef = useRef<LayerGroup | null>(null)
  useEffect(() => {
    if (groupRef.current) { groupRef.current.remove(); groupRef.current = null }
    if (!active || permits.length === 0) { onState?.(null); return }
    let cancelled = false
    const group = L.layerGroup().addTo(map)
    groupRef.current = group
    onState?.('loading')
    const add = (p: PermitMarker, lat: number, lng: number) => {
      L.circleMarker([lat, lng], { radius: 5, color: '#0a0a0a', weight: 1, fillColor: p.color, fillOpacity: 0.95 })
        .bindPopup(`<strong>${p.title}</strong>${p.sub ? `<br>${p.sub}` : ''}<br>${p.address}`)
        .addTo(group)
    }
    ;(async () => {
      let placed = 0
      const subset = permits.slice(0, 90) // keep polite to the geocoder
      for (const p of subset) {
        if (cancelled) return
        const hit = cachedGeocode(p.address)
        if (hit) { add(p, hit[0], hit[1]); placed++; continue }
        try {
          const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(`${p.address}, North Castle, NY`)}`
          const r = await fetch(url, { headers: { Accept: 'application/json' } })
          if (r.ok) {
            const arr = (await r.json()) as Array<{ lat?: string; lon?: string }>
            const it = arr?.[0]
            if (it?.lat && it?.lon) {
              const lat = Number(it.lat), lng = Number(it.lon)
              try { localStorage.setItem(`geo:${p.address}`, JSON.stringify([lat, lng])) } catch { /* ignore */ }
              if (!cancelled) { add(p, lat, lng); placed++ }
            }
          }
        } catch { /* skip this one */ }
        if (!cancelled) { onState?.('loading'); await new Promise((res) => setTimeout(res, 340)) }
      }
      if (!cancelled) onState?.(placed > 0 ? 'ok' : 'empty')
    })()
    return () => { cancelled = true; if (groupRef.current) { groupRef.current.remove(); groupRef.current = null } }
  }, [active, permits, map, onState])
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
// "Trails" was removed from this list — the county name-match traced road
// corridors; the OSM 'trails' layer above renders actual paths instead.
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

// ── Highway: roads by jurisdiction (private/local/county/state/federal) ─────
// Ownership isn't a tag OSM carries directly, so each category is approximated
// from the road's `highway` class + `ref` prefix — NY state routes and US
// routes are tagged "NY 22"/"US 1" style refs, Interstates "I 684", and
// `access=private` is explicit. County vs. town-local has no clean OSM tag at
// all, so "county" is approximated as numbered `secondary` roads (Westchester
// County's collector roads) and everything else residential/tertiary/
// unclassified falls to "local" — a reasonable best-effort read, not a legal
// jurisdiction record.
interface RoadCat { key: string; label: string; color: string; weight: number; dash?: string; filter: string }
const ROAD_CATS: RoadCat[] = [
  { key: 'federal', label: 'Federal (Interstate)', color: '#7c3aed', weight: 4, filter: 'way["highway"]["ref"~"^I ", i]' },
  { key: 'state', label: 'State', color: '#ef4444', weight: 3.5, filter: 'way["highway"]["ref"~"^(NY|US) ", i]' },
  { key: 'county', label: 'County', color: '#f59e0b', weight: 3, filter: 'way["highway"="secondary"]["ref"!~"^(NY|US|I) ", i]["access"!="private"]' },
  { key: 'local', label: 'Local (Town)', color: '#3d9c72', weight: 2, filter: 'way["highway"~"^(tertiary|unclassified|residential)$"]["ref"!~"^(NY|US|I) ", i]["access"!="private"]' },
  { key: 'private', label: 'Private', color: '#9a9a9a', weight: 2, dash: '5 5', filter: 'way["highway"~"^(service|track|residential|unclassified)$"]["access"="private"]' },
]

/** One road-jurisdiction category, queried and drawn independently of the
 *  others — several are meant to be visible at once here (it's a
 *  classification map), unlike the rest of this file's single-select layers. */
function RoadLayer({ cat, active, onState }: { cat: RoadCat; active: boolean; onState?: (key: string, s: LayerState) => void }) {
  const map = useMap()
  const groupRef = useRef<LayerGroup | null>(null)
  useEffect(() => {
    if (groupRef.current) { groupRef.current.remove(); groupRef.current = null }
    if (!active) { onState?.(cat.key, null); return }
    let cancelled = false
    const group = L.layerGroup().addTo(map)
    groupRef.current = group
    onState?.(cat.key, 'loading')
    const b = map.getBounds()
    const bbox = `${b.getSouth()},${b.getWest()},${b.getNorth()},${b.getEast()}`
    const q = `[out:json][timeout:25];(${cat.filter}(${bbox}););out geom 800;`
    overpassFetch(q)
      .then((elements) => {
        if (cancelled) return
        let count = 0
        for (const el of elements) {
          if (!el.geometry || el.geometry.length < 2) continue
          const line = L.polyline(el.geometry.map((p) => [p.lat, p.lon] as [number, number]), {
            color: cat.color, weight: cat.weight, opacity: 0.9, dashArray: cat.dash,
          })
          const name = el.tags?.name || el.tags?.ref || cat.label
          line.bindPopup(
            `<strong>${name}</strong><br><span style="color:${cat.color};font-weight:600">${cat.label}</span>` +
            (el.tags?.ref && el.tags.ref !== name ? `<br>${el.tags.ref}` : ''),
          )
          line.addTo(group)
          count++
        }
        onState?.(cat.key, count > 0 ? 'ok' : 'empty')
      })
      .catch(() => { if (!cancelled) onState?.(cat.key, 'error') })
    return () => {
      cancelled = true
      if (groupRef.current) { groupRef.current.remove(); groupRef.current = null }
    }
  }, [active, cat, map, onState])
  return null
}

/** Always-visible legend for the roads map — each category has its own
 *  checkbox (rather than the single-select "Layers" menu used elsewhere),
 *  since the whole point is comparing several jurisdictions at once. */
function RoadsLegend({
  enabled, onToggle, states,
}: {
  enabled: Set<string>; onToggle: (key: string) => void; states: Record<string, LayerState>
}) {
  return (
    <div
      style={{
        position: 'absolute', top: 10, right: 10, zIndex: 1000, display: 'flex', flexDirection: 'column', gap: 7,
        padding: 10, borderRadius: 12, background: 'rgba(16,19,22,0.9)', border: '1px solid rgba(255,255,255,0.16)',
        backdropFilter: 'blur(10px)', boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
      }}
    >
      <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#8a8f96', fontWeight: 700 }}>
        Road jurisdiction
      </div>
      {ROAD_CATS.map((cat) => {
        const on = enabled.has(cat.key)
        const st = states[cat.key]
        return (
          <label key={cat.key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: '#fff', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            <input type="checkbox" checked={on} onChange={() => onToggle(cat.key)} style={{ margin: 0, accentColor: cat.color }} />
            <span style={{ width: 20, height: 0, display: 'inline-block', borderTop: `${Math.max(2, cat.weight - 1)}px ${cat.dash ? 'dashed' : 'solid'} ${cat.color}` }} />
            {cat.label}
            {on && st === 'loading' && <span style={{ opacity: 0.6, fontSize: 10.5 }}>…</span>}
            {on && st === 'empty' && <span style={{ opacity: 0.6, fontSize: 10.5 }}>none in view</span>}
          </label>
        )
      })}
    </div>
  )
}

interface MenuItem { key: string; label: string; color: string }
interface MenuGroup { group: string; items: MenuItem[] }

/** A single compact "Layers" dropdown that replaces the old wrap-around chip
 *  strip, so the controls stop covering the map. Single-select. */
function LayerMenu({
  groups, active, onPick, statusNote,
}: {
  groups: MenuGroup[]; active: string | null; onPick: (k: string | null) => void; statusNote?: string | null
}) {
  const [open, setOpen] = useState(false)
  const activeItem = groups.flatMap((g) => g.items).find((i) => i.key === active) || null
  return (
    <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 7, padding: '7px 12px', borderRadius: 999,
          fontSize: 12.5, fontWeight: 600, cursor: 'pointer', color: '#fff',
          background: 'rgba(20,24,28,0.82)', border: '1px solid rgba(255,255,255,0.28)',
          backdropFilter: 'blur(6px)', boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
        }}
      >
        {activeItem
          ? <><span style={{ width: 9, height: 9, borderRadius: '50%', background: activeItem.color, display: 'inline-block' }} />{activeItem.label}</>
          : <>▦ Layers</>}
        <span style={{ opacity: 0.7, fontSize: 10 }}>{open ? '▲' : '▼'}</span>
      </button>

      {activeItem && statusNote && (
        <span style={{ padding: '4px 9px', fontSize: 11, fontWeight: 600, color: '#fff', borderRadius: 999, background: 'rgba(20,24,28,0.82)', border: '1px solid rgba(255,255,255,0.28)', backdropFilter: 'blur(6px)' }}>
          {statusNote}
        </span>
      )}

      {open && (
        <div
          style={{
            width: 232, maxHeight: 360, overflowY: 'auto', padding: 6, borderRadius: 12,
            background: 'rgba(16,19,22,0.94)', border: '1px solid rgba(255,255,255,0.16)',
            backdropFilter: 'blur(10px)', boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
          }}
        >
          <button
            onClick={() => { onPick(null); setOpen(false) }}
            style={{ ...rowStyle, color: active ? '#cfcfcf' : '#fff', fontWeight: active ? 500 : 700 }}
          >
            <span style={{ width: 9, height: 9, borderRadius: '50%', border: '1px solid #888', display: 'inline-block' }} />
            None (boundaries only){!active && <span style={{ marginLeft: 'auto' }}>✓</span>}
          </button>
          {groups.map((g) => (
            <div key={g.group}>
              <div style={{ padding: '7px 10px 3px', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#8a8f96', fontWeight: 700 }}>{g.group}</div>
              {g.items.map((it) => {
                const on = active === it.key
                return (
                  <button
                    key={it.key}
                    onClick={() => { onPick(on ? null : it.key); setOpen(false) }}
                    style={{ ...rowStyle, background: on ? 'rgba(255,255,255,0.08)' : 'transparent', fontWeight: on ? 700 : 500 }}
                  >
                    <span style={{ width: 9, height: 9, borderRadius: '50%', background: it.color, display: 'inline-block' }} />
                    {it.label}
                    {on && <span style={{ marginLeft: 'auto' }}>✓</span>}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
const rowStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 9, width: '100%', textAlign: 'left',
  padding: '7px 10px', borderRadius: 8, border: 'none', background: 'transparent',
  color: '#fff', fontSize: 12.5, cursor: 'pointer',
}

export default function JurisdictionMap({
  muni, permits, permitsLabel = 'Recent permits', permitsGroup = 'Building', defaultActive = null, showIssues = true, onlyPermits = false, onlyRoads = false, height = 440,
}: {
  muni: string
  /** When provided, adds an opt-in address-marker layer (geocoded on demand). */
  permits?: PermitMarker[]
  /** Menu label / group for the address-marker layer (defaults suit permits). */
  permitsLabel?: string
  permitsGroup?: string
  /** Layer key to activate on mount (e.g. 'permits' to open with markers shown). */
  defaultActive?: string | null
  /** Include the SeeClickFix "Open issues" layer (default true). */
  showIssues?: boolean
  /** Locked single-layer mode: no layer menu, no GIS/OSM/SeeClickFix layers —
   *  just the boundary/hamlets and the permits/marker layer, always on. Used
   *  where the map has exactly one purpose (board agenda-item maps, the
   *  Building Department permit map). */
  onlyPermits?: boolean
  /** Locked multi-layer roads mode: the Highway Department's private/local/
   *  county/state/federal jurisdiction map, each independently toggleable —
   *  no other layers, no single-select menu. */
  onlyRoads?: boolean
  height?: number
}) {
  const cfg = MAP[muni]
  // Single active overlay at a time (a toggle), shown over the always-on
  // jurisdiction + hamlet boundaries. In onlyPermits mode this is permanently
  // 'permits' — there's no menu to change it. Unused in onlyRoads mode, which
  // has its own multi-select state below.
  const [active, setActive] = useState<string | null>(onlyPermits ? 'permits' : defaultActive)
  const [layerState, setLayerState] = useState<LayerState>(null)
  const [roadsEnabled, setRoadsEnabled] = useState<Set<string>>(() => new Set(ROAD_CATS.map((c) => c.key)))
  const [roadStates, setRoadStates] = useState<Record<string, LayerState>>({})
  // Stable across renders (unlike an inline arrow prop) — RoadLayer depends on
  // this identity in its effect, so a fresh function every render would
  // re-trigger the effect (and re-fetch) in a loop.
  const handleRoadState = useCallback((key: string, s: LayerState) => {
    setRoadStates((prev) => ({ ...prev, [key]: s }))
  }, [])

  if (!cfg) return null

  // Grouped menu: civic issues, permits (when supplied), county GIS, OSM
  // trails + points of interest. Empty (and hidden) in onlyPermits/onlyRoads mode.
  const groups: MenuGroup[] = onlyPermits || onlyRoads ? [] : [
    ...(showIssues ? [{ group: 'Civic', items: [{ key: 'issues', label: 'Open issues (SeeClickFix)', color: '#ef4444' }] }] : []),
    ...(permits && permits.length ? [{ group: permitsGroup, items: [{ key: 'permits', label: permitsLabel, color: '#d4767a' }] }] : []),
    ...(muni === 'nc' ? [{ group: 'County GIS', items: GIS.map((g) => ({ key: g.key, label: g.label, color: g.color })) }] : []),
    { group: 'Trails & points of interest', items: OSM.map((c) => ({ key: c.key, label: c.label, color: c.color })) },
  ]

  const note =
    layerState === 'loading' ? 'Loading…'
    : layerState === 'empty' ? 'No features in view'
    : layerState === 'error' ? 'Layer unavailable'
    : null

  return (
    <div style={{ marginBottom: 30 }}>
      <div className="card" style={{ padding: 0, overflow: 'hidden', position: 'relative' }}>
        {!onlyPermits && !onlyRoads && (
          <LayerMenu groups={groups} active={active} onPick={(k) => { setActive(k); setLayerState(null) }} statusNote={note} />
        )}
        {onlyPermits && note && (
          <div
            style={{
              position: 'absolute', top: 10, right: 10, zIndex: 1000,
              padding: '4px 9px', fontSize: 11, fontWeight: 600, color: '#fff', borderRadius: 999,
              background: 'rgba(20,24,28,0.82)', border: '1px solid rgba(255,255,255,0.28)', backdropFilter: 'blur(6px)',
            }}
          >
            {note}
          </div>
        )}
        {onlyRoads && (
          <RoadsLegend
            enabled={roadsEnabled}
            states={roadStates}
            onToggle={(key) => setRoadsEnabled((prev) => {
              const next = new Set(prev)
              if (next.has(key)) next.delete(key); else next.add(key)
              return next
            })}
          />
        )}
        <MapContainer
          center={cfg.center}
          zoom={cfg.zoom}
          scrollWheelZoom={false}
          style={{ height, width: '100%', background: '#0a0a0a' }}
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
          {!onlyPermits && !onlyRoads && <OsmLayers active={active} onState={setLayerState} />}
          {!onlyPermits && !onlyRoads && <GisLayers active={active} onState={setLayerState} />}
          {!onlyPermits && !onlyRoads && showIssues && <IssueLayer active={active === 'issues'} muni={muni} onState={setLayerState} />}
          {permits && permits.length > 0 && !onlyRoads && (
            <PermitLayer active={onlyPermits ? true : active === 'permits'} permits={permits} onState={setLayerState} />
          )}
          {onlyRoads && ROAD_CATS.map((cat) => (
            <RoadLayer
              key={cat.key}
              cat={cat}
              active={roadsEnabled.has(cat.key)}
              onState={handleRoadState}
            />
          ))}
          <ResizeFix />
        </MapContainer>
      </div>
    </div>
  )
}
