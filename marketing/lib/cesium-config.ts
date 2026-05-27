export const CESIUM_ION_ASSETS = {
  OSM_BUILDINGS: 96188,
  WORLD_TERRAIN: 1,
  // Microsoft building footprints (global photorealistic 3D)
  GOOGLE_PHOTOREALISTIC: 2275207,
} as const;

export const DEFAULT_VIEW = {
  lat: 38.9072,
  lng: -77.0369,
  height: 800,
  heading: 0,
  pitch: -45,
} as const;

/**
 * OSM tile layer sources for building footprints, places, and overlays.
 */
export const OSM_TILE_SOURCES = {
  /** OpenStreetMap standard tiles */
  OSM_STANDARD: "https://tile.openstreetmap.org/",
  /** OpenMapTiles / MapTiler (requires key for production) */
  OSM_MAPNIK: "https://tile.openstreetmap.org/",
} as const;

/**
 * Overpass API endpoint for querying OSM features (buildings, places, POIs).
 */
export const OVERPASS_API = "https://overpass-api.de/api/interpreter";

/**
 * Microsoft Building Footprints - open dataset via Planetary Computer.
 * GeoJSON tiles served as flat 2D polygons.
 */
export const MS_BUILDING_FOOTPRINTS = {
  tileUrl:
    "https://planetarycomputer.microsoft.com/api/stac/v1/collections/ms-buildings/items",
  attribution: "Microsoft Building Footprints © Microsoft",
} as const;

/**
 * OSM Places categories for the POI layer.
 */
export const OSM_PLACE_CATEGORIES = [
  { key: "amenity", values: ["restaurant", "cafe", "bar", "bank", "hospital", "school", "pharmacy", "library", "theatre", "cinema", "fuel", "police", "fire_station", "post_office"], color: "#e74c3c", label: "Amenities" },
  { key: "shop", values: ["supermarket", "convenience", "clothes", "electronics", "hardware", "bakery", "butcher", "car", "mall"], color: "#3498db", label: "Shops" },
  { key: "tourism", values: ["hotel", "museum", "attraction", "viewpoint", "information", "artwork", "gallery"], color: "#2ecc71", label: "Tourism" },
  { key: "office", values: ["company", "government", "insurance", "lawyer", "estate_agent", "financial"], color: "#9b59b6", label: "Offices" },
  { key: "leisure", values: ["park", "playground", "sports_centre", "fitness_centre", "swimming_pool", "golf_course", "stadium"], color: "#27ae60", label: "Leisure" },
  { key: "building", values: ["commercial", "retail", "office", "industrial", "warehouse"], color: "#e67e22", label: "Commercial Buildings" },
] as const;

