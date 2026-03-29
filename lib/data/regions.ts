export interface Region {
  id: string;
  name: string;
  shortName: string;
  defaultCamera: {
    lat: number;
    lng: number;
    height: number;
    heading: number;
    pitch: number;
  };
  boundingBox: {
    west: number;
    south: number;
    east: number;
    north: number;
  };
  searchPlaceholder: string;
  nominatimViewbox: string;
}

export const REGIONS: Region[] = [
  {
    id: "dc",
    name: "Washington, D.C.",
    shortName: "DC",
    defaultCamera: { lat: 38.9072, lng: -77.0369, height: 800, heading: 0, pitch: -45 },
    boundingBox: { west: -77.12, south: 38.79, east: -76.91, north: 38.99 },
    searchPlaceholder: "Enter a location in Washington D.C.",
    nominatimViewbox: "-77.12,38.99,-76.91,38.79",
  },
  {
    id: "nyc",
    name: "New York City",
    shortName: "NYC",
    defaultCamera: { lat: 40.7128, lng: -74.006, height: 1200, heading: 0, pitch: -45 },
    boundingBox: { west: -74.26, south: 40.49, east: -73.70, north: 40.92 },
    searchPlaceholder: "Enter a location in New York City",
    nominatimViewbox: "-74.26,40.92,-73.70,40.49",
  },
  {
    id: "sullivan",
    name: "Sullivan County, NY",
    shortName: "Sullivan",
    defaultCamera: { lat: 41.72, lng: -74.78, height: 15000, heading: 0, pitch: -45 },
    boundingBox: { west: -75.14, south: 41.42, east: -74.37, north: 41.87 },
    searchPlaceholder: "Enter a location in Sullivan County",
    nominatimViewbox: "-75.14,41.87,-74.37,41.42",
  },
  {
    id: "westchester",
    name: "Westchester County, NY",
    shortName: "Westchester",
    defaultCamera: { lat: 41.12, lng: -73.76, height: 10000, heading: 0, pitch: -45 },
    boundingBox: { west: -73.98, south: 40.87, east: -73.48, north: 41.37 },
    searchPlaceholder: "Enter a location in Westchester County",
    nominatimViewbox: "-73.98,41.37,-73.48,40.87",
  },
  {
    id: "ct",
    name: "Connecticut",
    shortName: "CT",
    defaultCamera: { lat: 41.6032, lng: -73.0877, height: 50000, heading: 0, pitch: -45 },
    boundingBox: { west: -73.73, south: 40.98, east: -71.79, north: 42.05 },
    searchPlaceholder: "Enter a location in Connecticut",
    nominatimViewbox: "-73.73,42.05,-71.79,40.98",
  },
  {
    id: "boston",
    name: "Boston, MA",
    shortName: "Boston",
    defaultCamera: { lat: 42.3601, lng: -71.0589, height: 1500, heading: 0, pitch: -45 },
    boundingBox: { west: -71.19, south: 42.23, east: -70.92, north: 42.40 },
    searchPlaceholder: "Enter a location in Boston",
    nominatimViewbox: "-71.19,42.40,-70.92,42.23",
  },
];

export function getRegion(id: string): Region {
  return REGIONS.find((r) => r.id === id) || REGIONS[0];
}
