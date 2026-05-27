'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

interface GISLayerDef {
  id: string
  label: string
  service: string  // ArcGIS service path, e.g. "Parcels" or "MunicipalTaxParcels_WGS84"
  opacity: number
}

const SULLIVAN_LAYERS: GISLayerDef[] = [
  { id: 'parcels',            label: 'Parcels',                service: 'Parcels',               opacity: 0.55 },
  { id: 'ag_districts',       label: 'Agricultural Districts', service: 'Agricultural_Districts', opacity: 0.45 },
  { id: 'soils',              label: 'Soils',                  service: 'Soils',                  opacity: 0.5  },
  { id: 'building_footprints',label: 'Building Footprints',   service: 'Building_Footprints',    opacity: 0.8  },
  { id: 'wetlands',           label: 'Wetlands',               service: 'Wetlands',               opacity: 0.5  },
  { id: 'municipalities',     label: 'Municipalities',         service: 'Municipalities',         opacity: 0.5  },
]

const WESTCHESTER_LAYERS: GISLayerDef[] = [
  { id: 'parcels',       label: 'Tax Parcels',         service: 'MunicipalTaxParcels_WGS84',          opacity: 0.55 },
  { id: 'env',           label: 'Flood / Environment', service: 'DataHub_EnvironmentandPlanning',      opacity: 0.55 },
  { id: 'boundaries',    label: 'Boundaries',          service: 'DataHub_Boundaries',                 opacity: 0.6  },
  { id: 'infrastructure',label: 'Infrastructure',      service: 'DataHub_Infrastructure',             opacity: 0.65 },
  { id: 'transport',     label: 'Transportation',      service: 'DataHub_Transportation',             opacity: 0.65 },
]

interface Props {
  lat: number
  lng: number
  zoom: number
  label: string
  height?: number
  gisCounty?: 'sullivan' | 'westchester'
}

// Format ArcGIS attribute key names for display
function formatAttrKey(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

// Filter out noisy / technical GIS fields
const SKIP_KEYS = new Set([
  'OBJECTID', 'OBJECTID_1', 'Shape', 'Shape_Area', 'Shape_Length',
  'GlobalID', 'GLOBALID', 'created_user', 'created_date', 'last_edited_user',
  'last_edited_date', 'SE_ROW_ID', 'GIS_ID',
])

function buildPopupHtml(layerName: string, attributes: Record<string, unknown>): string {
  const rows = Object.entries(attributes)
    .filter(([k, v]) => !SKIP_KEYS.has(k) && v !== null && v !== undefined && String(v).trim() !== '' && String(v) !== '0')
    .slice(0, 12)
    .map(([k, v]) => `
      <tr>
        <td style="padding:2px 8px 2px 0;color:#888;white-space:nowrap;font-size:11px">${formatAttrKey(k)}</td>
        <td style="padding:2px 0;font-size:11px;font-weight:500">${v}</td>
      </tr>`)
    .join('')

  if (!rows) return `<div style="font-size:12px;color:#888">No data at this location</div>`

  return `
    <div style="font-size:12px;font-weight:600;margin-bottom:6px;color:#333">${layerName}</div>
    <table style="border-collapse:collapse;min-width:180px">${rows}</table>
  `
}

export default function PropertyMap({ lat, lng, zoom, label, height = 480, gisCounty }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<unknown>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wmsLayersRef = useRef<Record<string, any>>({})
  const [activeLayers, setActiveLayers] = useState<Set<string>>(new Set())
  const [panelOpen, setPanelOpen] = useState(false)

  // Refs so click handler always sees current state without re-attaching
  const activeLayersRef = useRef(activeLayers)
  const gisCountyRef = useRef(gisCounty)
  useEffect(() => { activeLayersRef.current = activeLayers }, [activeLayers])
  useEffect(() => { gisCountyRef.current = gisCounty }, [gisCounty])

  const gisLayers = gisCounty === 'sullivan' ? SULLIVAN_LAYERS
    : gisCounty === 'westchester' ? WESTCHESTER_LAYERS
    : []

  // Ref to always-current gisLayers without re-attaching handler
  const gisLayersRef = useRef(gisLayers)
  useEffect(() => { gisLayersRef.current = gisLayers }, [gisLayers])

  const toggleLayer = useCallback((id: string) => {
    setActiveLayers((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const resetView = useCallback(() => {
    if (!mapRef.current) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(mapRef.current as any).setView([lat, lng], zoom)
  }, [lat, lng, zoom])

  // Initialize map (runs once)
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    import('leaflet').then((L) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      const map = L.map(containerRef.current!, {
        center: [lat, lng],
        zoom,
        zoomControl: true,
        scrollWheelZoom: false,
        attributionControl: false,
      })

      // ESRI satellite tiles
      L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        { maxZoom: 20 }
      ).addTo(map)

      // ESRI transportation layer (roads, streets)
      L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}',
        { maxZoom: 20 }
      ).addTo(map)

      // ESRI labels + POIs + boundaries overlay
      L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
        { maxZoom: 20 }
      ).addTo(map)

      // Custom labeled marker
      const icon = L.divIcon({
        className: '',
        iconAnchor: [0, 0],
        html: `
          <div style="display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-100%)">
            <div style="
              background:rgba(255,255,255,0.92);
              backdrop-filter:blur(4px);
              border-radius:8px;
              padding:4px 10px;
              font-size:13px;
              font-weight:600;
              color:#1a1a1a;
              box-shadow:0 2px 8px rgba(0,0,0,0.25);
              white-space:nowrap;
              margin-bottom:4px;
            ">${label}</div>
            <svg width="12" height="16" viewBox="0 0 12 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6 0C2.686 0 0 2.686 0 6c0 4.5 6 10 6 10s6-5.5 6-10c0-3.314-2.686-6-6-6z" fill="#e53935"/>
              <circle cx="6" cy="6" r="2.5" fill="white"/>
            </svg>
          </div>
        `,
      })

      L.marker([lat, lng], { icon }).addTo(map)

      // Fetch nearby POIs from Overpass (OpenStreetMap) — free, no API key
      const radius = 600
      const query = `
        [out:json][timeout:15];
        (
          node["amenity"~"^(restaurant|cafe|fast_food|bar|pub|bakery|food_court)$"](around:${radius},${lat},${lng});
          node["shop"~"^(supermarket|grocery|convenience|butcher|deli|seafood|bakery|greengrocer|farm|department_store|clothes|shoes|books|gift|florist|pharmacy|hardware|electronics|furniture)$"](around:${radius},${lat},${lng});
        );
        out body;
      `
      fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: query,
      })
        .then((r) => r.json())
        .then((data: { elements: Array<{ lat: number; lng?: number; lon?: number; tags?: Record<string, string> }> }) => {
          const ICONS: Record<string, string> = {
            restaurant: '🍽️', cafe: '☕', fast_food: '🍔', bar: '🍺', pub: '🍺',
            bakery: '🥐', food_court: '🍽️',
            supermarket: '🛒', grocery: '🛒', convenience: '🏪', butcher: '🥩',
            deli: '🥗', seafood: '🐟', greengrocer: '🥦', farm: '🌾',
            department_store: '🏬', clothes: '👕', shoes: '👟', books: '📚',
            gift: '🎁', florist: '💐', pharmacy: '💊', hardware: '🔧',
            electronics: '📱', furniture: '🛋️',
          }
          data.elements.forEach((el) => {
            if (!el.lat || (!el.lng && !el.lon)) return
            const tags = el.tags || {}
            const category = tags.amenity || tags.shop || ''
            const name = tags.name
            if (!name) return
            const emoji = ICONS[category] || '📍'
            const poiIcon = L.divIcon({
              className: '',
              iconAnchor: [12, 12],
              html: `<div title="${name}" style="font-size:18px;line-height:1;cursor:default;">${emoji}</div>`,
            })
            L.marker([el.lat, el.lon ?? el.lng!], { icon: poiIcon })
              .bindPopup(`<strong>${name}</strong><br/><span style="color:#666;font-size:12px">${category}</span>`)
              .addTo(map)
          })
        })
        .catch(() => { /* silently skip if Overpass unavailable */ })

      // GIS identify: click on map when a layer is active
      map.on('click', async (e: { latlng: { lat: number; lng: number } }) => {
        const currentLayers = activeLayersRef.current
        const currentGisLayers = gisLayersRef.current
        const currentServer = gisCountyRef.current === 'sullivan' ? 'sullivan' : 'westchester'

        if (currentLayers.size === 0 || currentGisLayers.length === 0) return

        // Use the first active layer
        const activeLayerId = [...currentLayers][0]
        const layerDef = currentGisLayers.find((l) => l.id === activeLayerId)
        if (!layerDef) return

        const bounds = map.getBounds()
        const size = map.getSize()
        const mapExtent = `${bounds.getWest()},${bounds.getSouth()},${bounds.getEast()},${bounds.getNorth()}`
        const imageDisplay = `${size.x},${size.y},96`

        // Show loading popup
        const popup = L.popup({ maxWidth: 320 })
          .setLatLng(e.latlng)
          .setContent('<div style="font-size:12px;color:#888;padding:4px">Identifying…</div>')
          .openOn(map)

        try {
          const params = new URLSearchParams({
            server: currentServer,
            service: layerDef.service,
            lat: String(e.latlng.lat),
            lng: String(e.latlng.lng),
            mapExtent,
            imageDisplay,
          })
          const res = await fetch(`/api/gis/identify?${params}`)
          const data = await res.json()

          if (data.results?.length > 0) {
            const result = data.results[0]
            const html = buildPopupHtml(
              result.layerName || layerDef.label,
              result.attributes || {}
            )
            popup.setContent(html)
          } else {
            popup.setContent('<div style="font-size:12px;color:#888;padding:4px">No data at this location</div>')
          }
        } catch {
          popup.setContent('<div style="font-size:12px;color:#888;padding:4px">Could not load layer data</div>')
        }
      })

      mapRef.current = map
    })

    return () => {
      if (mapRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(mapRef.current as any).remove()
        mapRef.current = null
        wmsLayersRef.current = {}
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sync GIS layers whenever activeLayers changes — proxied through /api/gis/tile to avoid CORS
  useEffect(() => {
    if (!mapRef.current || gisLayers.length === 0) return
    const server = gisCounty === 'sullivan' ? 'sullivan' : 'westchester'
    import('leaflet').then((L) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const map = mapRef.current as any
      gisLayers.forEach((layer) => {
        const isActive = activeLayers.has(layer.id)
        const existing = wmsLayersRef.current[layer.id]
        if (isActive && !existing) {
          // Use Next.js API proxy so the county GIS request is server-side (no CORS)
          const tileLayer = L.tileLayer(
            `/api/gis/tile?server=${server}&service=${encodeURIComponent(layer.service)}&z={z}&x={x}&y={y}`,
            { maxZoom: 20, opacity: layer.opacity, tileSize: 256 }
          )
          tileLayer.addTo(map)
          wmsLayersRef.current[layer.id] = tileLayer
        } else if (!isActive && existing) {
          map.removeLayer(existing)
          delete wmsLayersRef.current[layer.id]
        }
      })
    })
  }, [activeLayers, gisLayers, gisCounty])

  return (
    <>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" crossOrigin="" />
      <div style={{ position: 'relative', width: '100%', height }}>
        <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

        {/* Home / reset view button */}
        <button
          onClick={resetView}
          title="Reset map view"
          style={{
            position: 'absolute',
            top: 12,
            left: 52,
            zIndex: 1000,
            background: 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(6px)',
            border: '1px solid rgba(0,0,0,0.12)',
            borderRadius: 6,
            boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
            width: 30,
            height: 30,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            fontSize: 16,
          }}
        >
          ⌂
        </button>

        {/* GIS layer toggle panel */}
        {gisLayers.length > 0 && (
          <div style={{
            position: 'absolute',
            bottom: 12,
            right: 12,
            zIndex: 1000,
            fontFamily: 'system-ui, sans-serif',
          }}>
            {panelOpen ? (
              <div style={{
                background: 'rgba(255,255,255,0.97)',
                backdropFilter: 'blur(6px)',
                borderRadius: 10,
                boxShadow: '0 2px 12px rgba(0,0,0,0.18)',
                padding: '10px 14px',
                minWidth: 200,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#555' }}>
                    {gisCounty === 'sullivan' ? 'Sullivan County' : 'Westchester County'} GIS
                  </span>
                  <button onClick={() => setPanelOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#888', padding: '0 0 0 8px' }}>✕</button>
                </div>
                <p style={{ fontSize: 10, color: '#999', marginBottom: 8, lineHeight: 1.4 }}>
                  Click any active layer on the map to identify features.
                </p>
                {gisLayers.map((layer) => (
                  <label key={layer.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, cursor: 'pointer', fontSize: 13 }}>
                    <input
                      type="checkbox"
                      checked={activeLayers.has(layer.id)}
                      onChange={() => toggleLayer(layer.id)}
                      style={{ width: 14, height: 14, cursor: 'pointer' }}
                    />
                    <span style={{ color: '#222' }}>{layer.label}</span>
                  </label>
                ))}
              </div>
            ) : (
              <button
                onClick={() => setPanelOpen(true)}
                style={{
                  background: 'rgba(255,255,255,0.95)',
                  backdropFilter: 'blur(6px)',
                  border: '1px solid rgba(0,0,0,0.12)',
                  borderRadius: 8,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.14)',
                  padding: '6px 12px',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  color: '#333',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span>🗂</span> GIS Layers
                {activeLayers.size > 0 && (
                  <span style={{
                    background: '#3b82f6',
                    color: '#fff',
                    borderRadius: 999,
                    padding: '0 6px',
                    fontSize: 10,
                    fontWeight: 700,
                    lineHeight: '18px',
                  }}>{activeLayers.size}</span>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </>
  )
}
