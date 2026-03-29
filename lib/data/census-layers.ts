// Census data layers from US Census Bureau TIGERweb services
// These are publicly accessible ArcGIS REST services

export interface CensusLayer {
  id: string;
  name: string;
  description: string;
  serviceUrl: string;
  layerIndex: number;
  category: "boundaries" | "demographics" | "economic" | "housing";
  opacity: number;
}

export const CENSUS_LAYERS: CensusLayer[] = [
  // ─── BOUNDARY LAYERS ───
  {
    id: "census-tracts",
    name: "Census Tracts (2020)",
    description: "Statistical subdivisions of a county, typically 1,200-8,000 people",
    serviceUrl:
      "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/tigerWMS_Census2020/MapServer",
    layerIndex: 6,
    category: "boundaries",
    opacity: 0.4,
  },
  {
    id: "census-block-groups",
    name: "Block Groups (2020)",
    description: "Subdivisions of census tracts, typically 600-3,000 people",
    serviceUrl:
      "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/tigerWMS_Census2020/MapServer",
    layerIndex: 8,
    category: "boundaries",
    opacity: 0.35,
  },
  {
    id: "census-blocks",
    name: "Census Blocks (2020)",
    description: "Smallest geographic unit, bounded by visible features",
    serviceUrl:
      "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/tigerWMS_Census2020/MapServer",
    layerIndex: 10,
    category: "boundaries",
    opacity: 0.3,
  },
  {
    id: "census-zcta",
    name: "ZIP Code Tabulation Areas",
    description: "Generalized area representations of USPS ZIP Code service areas",
    serviceUrl:
      "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/tigerWMS_Census2020/MapServer",
    layerIndex: 2,
    category: "boundaries",
    opacity: 0.35,
  },
  {
    id: "census-county-subdivisions",
    name: "County Subdivisions (Towns/Cities)",
    description: "Primary divisions of counties (towns, cities, townships)",
    serviceUrl:
      "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/tigerWMS_Census2020/MapServer",
    layerIndex: 4,
    category: "boundaries",
    opacity: 0.3,
  },
  {
    id: "census-places",
    name: "Census Designated Places",
    description: "Incorporated places and census-designated places",
    serviceUrl:
      "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/tigerWMS_Census2020/MapServer",
    layerIndex: 28,
    category: "boundaries",
    opacity: 0.3,
  },
  {
    id: "census-cbsa",
    name: "Metropolitan/Micropolitan Areas",
    description: "Core Based Statistical Areas (MSAs, CBSAs)",
    serviceUrl:
      "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/tigerWMS_Census2020/MapServer",
    layerIndex: 0,
    category: "boundaries",
    opacity: 0.25,
  },

  // ─── ACS DEMOGRAPHIC LAYERS ───
  {
    id: "acs-income",
    name: "Median Household Income (ACS)",
    description: "American Community Survey 5-year estimates by tract",
    serviceUrl:
      "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/tigerWMS_ACS2023/MapServer",
    layerIndex: 6,
    category: "demographics",
    opacity: 0.5,
  },
  {
    id: "acs-population",
    name: "Population Density (ACS)",
    description: "Population per square mile by census tract",
    serviceUrl:
      "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/tigerWMS_ACS2023/MapServer",
    layerIndex: 6,
    category: "demographics",
    opacity: 0.5,
  },

  // ─── ECONOMIC LAYERS ───
  {
    id: "census-urban-areas",
    name: "Urban Areas",
    description: "Urbanized areas (50,000+ population) and urban clusters (2,500-49,999)",
    serviceUrl:
      "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/tigerWMS_Census2020/MapServer",
    layerIndex: 24,
    category: "economic",
    opacity: 0.3,
  },

  // ─── HOUSING LAYERS ───
  {
    id: "acs-housing-units",
    name: "Housing Units (ACS)",
    description: "Total housing units by census tract",
    serviceUrl:
      "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/tigerWMS_ACS2023/MapServer",
    layerIndex: 6,
    category: "housing",
    opacity: 0.5,
  },
];

export const CENSUS_CATEGORY_COLORS = {
  boundaries: "#3498db",
  demographics: "#e67e22",
  economic: "#27ae60",
  housing: "#9b59b6",
} as const;

// ─── PARCEL DATA SOURCES ───
// These are the primary parcel data endpoints by state

export interface ParcelDataSource {
  id: string;
  name: string;
  state: string;
  county?: string;
  serviceUrl: string;
  serviceType: "arcgis" | "wms" | "geojson";
  layerIndex?: number;
  description: string;
}

export const PARCEL_DATA_SOURCES: ParcelDataSource[] = [
  // National
  {
    id: "regrid-national",
    name: "National Parcel Data (Regrid/Loveland)",
    state: "US",
    serviceUrl: "https://tiles.regrid.com/api/v1/parcels",
    serviceType: "geojson",
    description: "Nationwide parcel boundaries (requires API key for full access)",
  },

  // New York State
  {
    id: "nys-parcels",
    name: "NYS Tax Parcels (Statewide)",
    state: "NY",
    serviceUrl:
      "https://gis.ny.gov/arcgis/rest/services/public/NYS_Tax_Parcels_Public/MapServer",
    serviceType: "arcgis",
    layerIndex: 0,
    description: "All NYS tax parcels from the Office of Real Property Tax Services",
  },
  {
    id: "nyc-pluto-parcels",
    name: "NYC PLUTO Parcels",
    state: "NY",
    county: "New York City",
    serviceUrl:
      "https://services5.arcgisonline.com/arcgis/rest/services/NYC_Planning/MapPLUTO/MapServer",
    serviceType: "arcgis",
    layerIndex: 0,
    description: "NYC lot-level land use data with zoning, FAR, and building class",
  },
  {
    id: "sullivan-parcels",
    name: "Sullivan County Parcels",
    state: "NY",
    county: "Sullivan",
    serviceUrl: "https://gis.sullivanny.us/arcgis/rest/services/Parcels/MapServer",
    serviceType: "arcgis",
    layerIndex: 0,
    description: "Sullivan County tax parcels with assessment data",
  },
  {
    id: "westchester-parcels",
    name: "Westchester County Parcels",
    state: "NY",
    county: "Westchester",
    serviceUrl:
      "https://giswww.westchestergov.com/arcgis/rest/services/MunicipalTaxParcels_WGS84/MapServer",
    serviceType: "arcgis",
    layerIndex: 0,
    description: "Westchester County municipal tax parcels",
  },
  {
    id: "dutchess-parcels",
    name: "Dutchess County Parcels",
    state: "NY",
    county: "Dutchess",
    serviceUrl:
      "https://gis.dutchessny.gov/arcgis/rest/services/Tax_Parcels/MapServer",
    serviceType: "arcgis",
    layerIndex: 0,
    description: "Dutchess County tax parcel boundaries",
  },
  {
    id: "orange-parcels",
    name: "Orange County Parcels",
    state: "NY",
    county: "Orange",
    serviceUrl:
      "https://gis.orangecountygov.com/arcgis/rest/services/Parcels/MapServer",
    serviceType: "arcgis",
    layerIndex: 0,
    description: "Orange County parcel boundaries with tax data",
  },
  {
    id: "ulster-parcels",
    name: "Ulster County Parcels",
    state: "NY",
    county: "Ulster",
    serviceUrl:
      "https://gis.ulstercountyny.gov/arcgis/rest/services/Parcels/MapServer",
    serviceType: "arcgis",
    layerIndex: 0,
    description: "Ulster County tax parcels",
  },

  // Connecticut
  {
    id: "ct-parcels",
    name: "CT Statewide Parcels",
    state: "CT",
    serviceUrl:
      "https://webgis.ct.gov/arcgis/rest/services/Pub/Parcels/MapServer",
    serviceType: "arcgis",
    layerIndex: 0,
    description: "Connecticut statewide parcel boundaries from OPM",
  },

  // Massachusetts
  {
    id: "ma-parcels",
    name: "MassGIS L3 Parcels",
    state: "MA",
    serviceUrl:
      "https://giswebservices.mass.gov/arcgis/rest/services/massgis/MassGIS_L3_Parcels/MapServer",
    serviceType: "arcgis",
    layerIndex: 0,
    description: "Massachusetts standardized Level 3 parcels for all 351 municipalities",
  },

  // Washington DC
  {
    id: "dc-parcels",
    name: "DC Tax Lots / Parcels",
    state: "DC",
    serviceUrl:
      "https://maps2.dcgis.dc.gov/dcgis/rest/services/DCGIS_DATA/Property_and_Land_702/MapServer",
    serviceType: "arcgis",
    layerIndex: 0,
    description: "DC Office of Tax and Revenue parcel boundaries with ownership data",
  },
];
