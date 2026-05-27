export interface GISService {
  id: string;
  name: string;
  state: string;
  county?: string;
  type: "arcgis" | "wms" | "wfs";
  baseUrl: string;
  layers: GISLayer[];
}

export interface GISLayer {
  id: string;
  name: string;
  serviceId: string;
  layerIndex?: number;
  category: "parcels" | "zoning" | "environment" | "transportation" | "buildings" | "boundaries" | "flood" | "land-use" | "utilities";
  opacity: number;
  visible: boolean;
}

export const GIS_SERVICES: GISService[] = [
  // ─── NEW YORK STATE ───
  {
    id: "nys-gis",
    name: "NYS GIS Clearinghouse",
    state: "NY",
    type: "arcgis",
    baseUrl: "https://gis.ny.gov/arcgis/rest/services/public",
    layers: [
      { id: "nys-wetlands", name: "NYS DEC Wetlands", serviceId: "nys-gis", category: "environment", opacity: 0.5, visible: false },
      { id: "nys-flood", name: "NYS Flood Inundation", serviceId: "nys-gis", category: "flood", opacity: 0.5, visible: false },
      { id: "nys-landuse", name: "NYS Land Use / Land Cover", serviceId: "nys-gis", category: "land-use", opacity: 0.5, visible: false },
    ],
  },
  {
    id: "nys-ortho",
    name: "NYS Orthoimagery",
    state: "NY",
    type: "wms",
    baseUrl: "https://ortho.dhses.ny.gov/wms",
    layers: [
      { id: "nys-ortho-latest", name: "NYS Orthoimagery (Latest)", serviceId: "nys-ortho", category: "land-use", opacity: 1.0, visible: false },
    ],
  },
  // NYC
  {
    id: "nyc-planning",
    name: "NYC Planning",
    state: "NY",
    county: "New York City",
    type: "arcgis",
    baseUrl: "https://services5.arcgisonline.com/arcgis/rest/services/NYC_Planning",
    layers: [
      { id: "nyc-pluto", name: "NYC MapPLUTO Parcels", serviceId: "nyc-planning", category: "parcels", opacity: 0.6, visible: false },
      { id: "nyc-buildings", name: "NYC Building Footprints", serviceId: "nyc-planning", category: "buildings", opacity: 0.6, visible: false },
      { id: "nyc-zoning", name: "NYC Zoning Districts", serviceId: "nyc-planning", category: "zoning", opacity: 0.5, visible: false },
      { id: "nyc-flood", name: "NYC FEMA Flood Maps", serviceId: "nyc-planning", category: "flood", opacity: 0.5, visible: false },
    ],
  },
  // Sullivan County
  {
    id: "sullivan-county",
    name: "Sullivan County",
    state: "NY",
    county: "Sullivan",
    type: "arcgis",
    baseUrl: "https://gis.sullivanny.us/arcgis/rest/services",
    layers: [
      { id: "sullivan-parcels", name: "Sullivan Co. Parcels", serviceId: "sullivan-county", category: "parcels", opacity: 0.6, visible: false },
      { id: "sullivan-ag", name: "Sullivan Co. Agricultural Districts", serviceId: "sullivan-county", category: "land-use", opacity: 0.5, visible: false },
      { id: "sullivan-soils", name: "Sullivan Co. Soils", serviceId: "sullivan-county", category: "environment", opacity: 0.5, visible: false },
      { id: "sullivan-buildings", name: "Sullivan Co. Building Footprints", serviceId: "sullivan-county", category: "buildings", opacity: 0.6, visible: false },
      { id: "sullivan-wetlands", name: "Sullivan Co. Wetlands", serviceId: "sullivan-county", category: "environment", opacity: 0.5, visible: false },
      { id: "sullivan-municipalities", name: "Sullivan Co. Municipalities", serviceId: "sullivan-county", category: "boundaries", opacity: 0.4, visible: false },
    ],
  },
  // Westchester County
  {
    id: "westchester-county",
    name: "Westchester County",
    state: "NY",
    county: "Westchester",
    type: "arcgis",
    baseUrl: "https://giswww.westchestergov.com/arcgis/rest/services",
    layers: [
      { id: "westchester-parcels", name: "Westchester Co. Tax Parcels", serviceId: "westchester-county", category: "parcels", opacity: 0.6, visible: false },
      { id: "westchester-env", name: "Westchester Co. Environment & Planning", serviceId: "westchester-county", category: "environment", opacity: 0.5, visible: false },
      { id: "westchester-boundaries", name: "Westchester Co. Boundaries", serviceId: "westchester-county", category: "boundaries", opacity: 0.4, visible: false },
      { id: "westchester-transport", name: "Westchester Co. Transportation", serviceId: "westchester-county", category: "transportation", opacity: 0.5, visible: false },
    ],
  },
  // Dutchess County
  {
    id: "dutchess-county",
    name: "Dutchess County",
    state: "NY",
    county: "Dutchess",
    type: "arcgis",
    baseUrl: "https://gis.dutchessny.gov/arcgis/rest/services",
    layers: [
      { id: "dutchess-parcels", name: "Dutchess Co. Tax Parcels", serviceId: "dutchess-county", category: "parcels", opacity: 0.6, visible: false },
    ],
  },
  // Orange County
  {
    id: "orange-county",
    name: "Orange County",
    state: "NY",
    county: "Orange",
    type: "arcgis",
    baseUrl: "https://gis.orangecountygov.com/arcgis/rest/services",
    layers: [
      { id: "orange-parcels", name: "Orange Co. Parcels", serviceId: "orange-county", category: "parcels", opacity: 0.6, visible: false },
    ],
  },

  // ─── CONNECTICUT ───
  {
    id: "ct-deep",
    name: "CT DEEP",
    state: "CT",
    type: "arcgis",
    baseUrl: "https://webgis.ct.gov/arcgis/rest/services/Pub",
    layers: [
      { id: "ct-wetlands", name: "CT Wetlands", serviceId: "ct-deep", category: "environment", opacity: 0.5, visible: false },
      { id: "ct-zoning", name: "CT Zoning", serviceId: "ct-deep", category: "zoning", opacity: 0.5, visible: false },
      { id: "ct-landuse", name: "CT Land Use", serviceId: "ct-deep", category: "land-use", opacity: 0.5, visible: false },
      { id: "ct-env", name: "CT Environmental Data", serviceId: "ct-deep", category: "environment", opacity: 0.5, visible: false },
      { id: "ct-flood", name: "CT Flood Hazard Areas", serviceId: "ct-deep", category: "flood", opacity: 0.5, visible: false },
    ],
  },

  // ─── MASSACHUSETTS ───
  {
    id: "massgis",
    name: "MassGIS",
    state: "MA",
    type: "arcgis",
    baseUrl: "https://giswebservices.mass.gov/arcgis/rest/services/massgis",
    layers: [
      { id: "ma-parcels", name: "MA Parcels (L3)", serviceId: "massgis", category: "parcels", opacity: 0.6, visible: false },
      { id: "ma-buildings", name: "MA Building Footprints", serviceId: "massgis", category: "buildings", opacity: 0.6, visible: false },
      { id: "ma-zoning", name: "MA Zoning", serviceId: "massgis", category: "zoning", opacity: 0.5, visible: false },
      { id: "ma-wetlands", name: "MA Wetlands", serviceId: "massgis", category: "environment", opacity: 0.5, visible: false },
      { id: "ma-landuse", name: "MA Land Use (LULC)", serviceId: "massgis", category: "land-use", opacity: 0.5, visible: false },
      { id: "ma-floodplain", name: "MA Floodplain Districts", serviceId: "massgis", category: "flood", opacity: 0.5, visible: false },
      { id: "ma-dem", name: "MA DEM (30m)", serviceId: "massgis", category: "environment", opacity: 0.5, visible: false },
    ],
  },

  // ─── FEDERAL / NATIONAL ───
  {
    id: "fema",
    name: "FEMA Flood Hazard",
    state: "US",
    type: "arcgis",
    baseUrl: "https://hazards.fema.gov/gis/rest/services/public",
    layers: [
      { id: "fema-nfhl", name: "FEMA National Flood Hazard", serviceId: "fema", category: "flood", opacity: 0.5, visible: false },
    ],
  },
  {
    id: "usgs",
    name: "USGS National Map",
    state: "US",
    type: "arcgis",
    baseUrl: "https://basemap.nationalmap.gov/arcgis/rest/services",
    layers: [
      { id: "usgs-hydro", name: "USGS Hydrography (NHD)", serviceId: "usgs", category: "environment", opacity: 0.5, visible: false },
      { id: "usgs-topo", name: "USGS Topographic", serviceId: "usgs", category: "land-use", opacity: 0.5, visible: false },
    ],
  },
  {
    id: "usgs-elevation",
    name: "USGS Elevation",
    state: "US",
    type: "arcgis",
    baseUrl: "https://elevation.nationalmap.gov/arcgis/rest/services/elevation",
    layers: [
      { id: "usgs-dem", name: "USGS DEM (30m)", serviceId: "usgs-elevation", category: "environment", opacity: 0.5, visible: false },
    ],
  },
  {
    id: "usda-soils",
    name: "USDA Soils",
    state: "US",
    type: "arcgis",
    baseUrl: "https://sdmdataaccess.sc.egov.usda.gov",
    layers: [
      { id: "usda-ssurgo", name: "USDA SSURGO Soils", serviceId: "usda-soils", category: "environment", opacity: 0.5, visible: false },
    ],
  },
];

export const LAYER_CATEGORIES = {
  parcels: { label: "Parcels", color: "#e67e22" },
  zoning: { label: "Zoning", color: "#9b59b6" },
  environment: { label: "Environment", color: "#27ae60" },
  transportation: { label: "Transportation", color: "#3498db" },
  buildings: { label: "Buildings", color: "#2980b9" },
  boundaries: { label: "Boundaries", color: "#95a5a6" },
  flood: { label: "Flood Hazard", color: "#e74c3c" },
  "land-use": { label: "Land Use", color: "#f39c12" },
  utilities: { label: "Utilities", color: "#1abc9c" },
} as const;

export function getLayersByState(state: string): GISLayer[] {
  return GIS_SERVICES.filter(
    (s) => s.state === state || s.state === "US"
  ).flatMap((s) => s.layers);
}

export function getLayersByCategory(category: GISLayer["category"]): GISLayer[] {
  return GIS_SERVICES.flatMap((s) => s.layers).filter(
    (l) => l.category === category
  );
}
