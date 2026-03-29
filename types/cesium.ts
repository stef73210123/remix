export type PropertyType =
  | "Apartment"
  | "Condo/Co-op"
  | "Flats"
  | "Single Family"
  | "Retail"
  | "Mixed Use"
  | "Lodging"
  | "Vacant"
  | "Government"
  | "Health/Education"
  | "Cultural/Religious"
  | "Recreation/Misc"
  | "Office"
  | "Industrial"
  | "Parking"
  | "Special Purpose"
  | "Empty Parcel";

// Land use category groupings
export type LandUseCategory =
  | "Commercial"
  | "Residential"
  | "Mixed Use"
  | "Industrial"
  | "Special Purpose"
  | "Institutional"
  | "Vacant";

export const LAND_USE_COLORS: Record<LandUseCategory, string> = {
  Commercial: "#F05959",
  Residential: "#F0E059",
  "Mixed Use": "#F15A24",
  Industrial: "#662D91",
  "Special Purpose": "#C1B9B0",
  Institutional: "#00A99D",
  Vacant: "#2A364A",
};

export const PROPERTY_TYPE_TO_LAND_USE: Record<PropertyType, LandUseCategory> = {
  Retail: "Commercial",
  Office: "Commercial",
  Lodging: "Commercial",
  "Special Purpose": "Commercial",
  Apartment: "Residential",
  "Condo/Co-op": "Residential",
  Flats: "Residential",
  "Single Family": "Residential",
  "Mixed Use": "Mixed Use",
  Industrial: "Industrial",
  Parking: "Special Purpose",
  Government: "Institutional",
  "Health/Education": "Institutional",
  "Cultural/Religious": "Institutional",
  "Recreation/Misc": "Institutional",
  Vacant: "Vacant",
  "Empty Parcel": "Vacant",
};

// Per-property-type colors derived from their land use category
export const PROPERTY_TYPE_COLORS: Record<PropertyType, string> = {
  // Commercial (red)
  Retail: "#F05959",
  Office: "#F05959",
  Lodging: "#F05959",
  "Special Purpose": "#C1B9B0",
  // Residential (gold/yellow)
  Apartment: "#F0E059",
  "Condo/Co-op": "#F0E059",
  Flats: "#F0E059",
  "Single Family": "#F0E059",
  // Mixed Use (orange)
  "Mixed Use": "#F15A24",
  // Industrial (purple)
  Industrial: "#662D91",
  // Institutional (teal)
  Government: "#00A99D",
  "Health/Education": "#00A99D",
  "Cultural/Religious": "#00A99D",
  "Recreation/Misc": "#00A99D",
  // Vacant (dark navy)
  Vacant: "#2A364A",
  "Empty Parcel": "#2A364A",
  // Other
  Parking: "#C1B9B0",
};

// Zoning district color mapping
export type ZoningCategory =
  | "commercial"
  | "residential"
  | "mixed"
  | "special"
  | "waterfront"
  | "unzoned";

export const ZONING_DISTRICTS: Record<
  string,
  { category: ZoningCategory; color: string }
> = {
  // Commercial zones (red)
  "C-1": { category: "commercial", color: "#F05959" },
  "C-2-A": { category: "commercial", color: "#F05959" },
  "C-2-B": { category: "commercial", color: "#F05959" },
  "C-2-C": { category: "commercial", color: "#F05959" },
  "C-3-A": { category: "commercial", color: "#F05959" },
  "C-3-B": { category: "commercial", color: "#F05959" },
  "C-3-C": { category: "commercial", color: "#F05959" },
  "C-4": { category: "commercial", color: "#F05959" },
  "C-5": { category: "commercial", color: "#F05959" },
  // Residential zones (gold)
  "R-1-A": { category: "residential", color: "#F0E059" },
  "R-1-B": { category: "residential", color: "#F0E059" },
  "R-3": { category: "residential", color: "#F0E059" },
  "R-4": { category: "residential", color: "#F0E059" },
  "R-5-A": { category: "residential", color: "#F0E059" },
  "R-5-B": { category: "residential", color: "#F0E059" },
  "R-5-C": { category: "residential", color: "#F0E059" },
  "R-5-D": { category: "residential", color: "#F0E059" },
  "R-5-E": { category: "residential", color: "#F0E059" },
  // Mixed/Other (orange/green)
  CR: { category: "mixed", color: "#F15A24" },
  "HE-1": { category: "mixed", color: "#00A99D" },
  "HE-2": { category: "mixed", color: "#00A99D" },
  "HE-3": { category: "mixed", color: "#00A99D" },
  "HE-4": { category: "mixed", color: "#00A99D" },
  "CM-1": { category: "mixed", color: "#F0E059" },
  M: { category: "mixed", color: "#F0E059" },
  // Special purpose (gray)
  "SP-1": { category: "special", color: "#C1B9B0" },
  "SP-2": { category: "special", color: "#C1B9B0" },
  // Waterfront (teal)
  "W-0": { category: "waterfront", color: "#00A99D" },
  "W-1": { category: "waterfront", color: "#00A99D" },
  "W-2": { category: "waterfront", color: "#00A99D" },
  "W-3": { category: "waterfront", color: "#00A99D" },
  "Un-zoned": { category: "unzoned", color: "#C1B9B0" },
};

export interface Property {
  id: string;
  address: string;
  lat: number;
  lng: number;
  propertyType: PropertyType;
  squareFeet: number;
  neighborhood: string;
  zoningDistrict: string;
  squareSuffixLot: string;
  neighborhoodCluster: string[];
  landArea: { sqft: number; acres: number };
  jurisdiction: string;
  bookPageNo: string;
  propertyUse: string;
  owner: { name: string; address: string };
  yearBuilt?: number;
  units?: number;
  bedrooms?: number;
  buildingSize?: number;
  stories?: number;
}

export interface DemographicData {
  radius: "1/4 mile" | "1/2 mile" | "1 mile" | "3 mile";
  totalPopulation: number;
  medianAge: number;
  maleFemaleRatio: [number, number];
  totalHouseholds: number;
  avgHouseholdSize: number;
  populationByYear: { year: number; population: number }[];
  populationByAge: { ageGroup: string; count: number }[];
}

export interface CityDemographics {
  totalPopulation: number;
  medianAge: number;
  maleFemaleRatio: [number, number];
  totalHouseholds: number;
  avgHouseholdSize: number;
}

export interface LayerConfig {
  id: string;
  label: string;
  shortLabel: string;
  color: string;
  category: "general" | "overlay" | "historic";
  active: boolean;
}

export interface FilterState {
  yearBuiltMin?: number;
  yearBuiltMax?: number;
  unitsMin?: number;
  unitsMax?: number;
  metroDistanceMin?: number;
  metroDistanceMax?: number;
  buildingSizeMin?: number;
  buildingSizeMax?: number;
  bedroomsMin?: number;
  bedroomsMax?: number;
  parcelSizeMin?: number;
  parcelSizeMax?: number;
  generalUses?: string[];
  neighborhood?: string;
  zoningDistrict?: string;
  propertyTypes?: PropertyType[];
}

export interface BrokerageListing {
  id: string;
  source: string;
  brokerageName: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  lat?: number;
  lng?: number;
  propertyType: string;
  listingType: "sale" | "lease" | "sale_or_lease";
  price?: number;
  pricePerSF?: number;
  squareFeet?: number;
  lotSize?: number;
  yearBuilt?: number;
  description?: string;
  url: string;
  broker?: string;
  brokerPhone?: string;
  scrapedAt: string;
  region: string;
}
