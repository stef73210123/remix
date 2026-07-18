/**
 * Road-jurisdiction categories for the Highway page's roads map and mileage
 * chart. Plain data only (no Leaflet/react-leaflet) — kept separate from
 * JurisdictionMap.tsx so pages can import this without pulling in that
 * browser-only module during SSR (react-leaflet touches `window` at import
 * time, which breaks server rendering if it's imported statically).
 *
 * Ownership isn't a tag OSM carries directly, so each category is
 * approximated from the road's `highway` class + `ref` prefix — NY state
 * routes and US routes are tagged "NY 22"/"US 1" style refs, Interstates
 * "I 684", and `access=private` is explicit. County vs. town-local has no
 * clean OSM tag at all, so "county" is approximated as numbered `secondary`
 * roads (Westchester County's collector roads) and everything else
 * residential/tertiary/unclassified falls to "local" — a reasonable
 * best-effort read, not a legal jurisdiction record.
 */
export interface RoadCat { key: string; label: string; color: string; weight: number; dash?: string; filter: string }

export const ROAD_CATS: RoadCat[] = [
  { key: 'federal', label: 'Federal (Interstate)', color: '#7c3aed', weight: 4, filter: 'way["highway"]["ref"~"^I ", i]' },
  { key: 'state', label: 'State', color: '#ef4444', weight: 3.5, filter: 'way["highway"]["ref"~"^(NY|US) ", i]' },
  { key: 'county', label: 'County', color: '#f59e0b', weight: 3, filter: 'way["highway"="secondary"]["ref"!~"^(NY|US|I) ", i]["access"!="private"]' },
  { key: 'local', label: 'Local (Town)', color: '#3d9c72', weight: 2, filter: 'way["highway"~"^(tertiary|unclassified|residential)$"]["ref"!~"^(NY|US|I) ", i]["access"!="private"]' },
  { key: 'private', label: 'Private', color: '#9a9a9a', weight: 2, dash: '5 5', filter: 'way["highway"~"^(service|track|residential|unclassified)$"]["access"="private"]' },
]
