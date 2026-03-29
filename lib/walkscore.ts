export interface WalkabilityData {
  walkScore: number;
  walkDescription: string;
  transitScore: number;
  transitDescription: string;
  bikeScore: number;
  bikeDescription: string;
  nearbyTransit: Array<{ name: string; type: string; distance: string }>;
  nearbyAmenities: {
    restaurants: number;
    groceries: number;
    parks: number;
    schools: number;
  };
}

const OVERPASS_API = "https://overpass-api.de/api/interpreter";
const SEARCH_RADIUS = 1000; // 1km in meters
const TIMEOUT_MS = 8000;

function scoreToDescription(score: number): string {
  if (score >= 90) return "Walker's Paradise";
  if (score >= 70) return "Very Walkable";
  if (score >= 50) return "Somewhat Walkable";
  if (score >= 25) return "Car-Dependent";
  return "Almost All Errands Require a Car";
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function buildOverpassQuery(lat: number, lng: number): string {
  return `
[out:json][timeout:8];
(
  node["amenity"="restaurant"](around:${SEARCH_RADIUS},${lat},${lng});
  node["amenity"="fast_food"](around:${SEARCH_RADIUS},${lat},${lng});
  node["amenity"="cafe"](around:${SEARCH_RADIUS},${lat},${lng});
  node["shop"="supermarket"](around:${SEARCH_RADIUS},${lat},${lng});
  node["shop"="grocery"](around:${SEARCH_RADIUS},${lat},${lng});
  node["leisure"="park"](around:${SEARCH_RADIUS},${lat},${lng});
  way["leisure"="park"](around:${SEARCH_RADIUS},${lat},${lng});
  node["amenity"="school"](around:${SEARCH_RADIUS},${lat},${lng});
  node["highway"="bus_stop"](around:${SEARCH_RADIUS},${lat},${lng});
  node["public_transport"="station"](around:${SEARCH_RADIUS},${lat},${lng});
  node["railway"="station"](around:${SEARCH_RADIUS},${lat},${lng});
  node["railway"="tram_stop"](around:${SEARCH_RADIUS},${lat},${lng});
);
out body;
`.trim();
}

function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
}

function getEmptyResult(): WalkabilityData {
  return {
    walkScore: 0,
    walkDescription: scoreToDescription(0),
    transitScore: 0,
    transitDescription: scoreToDescription(0),
    bikeScore: 0,
    bikeDescription: scoreToDescription(0),
    nearbyTransit: [],
    nearbyAmenities: { restaurants: 0, groceries: 0, parks: 0, schools: 0 },
  };
}

interface OverpassElement {
  type: string;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

export async function getWalkabilityData(
  lat: number,
  lng: number
): Promise<WalkabilityData> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const query = buildOverpassQuery(lat, lng);
    const response = await fetch(OVERPASS_API, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `data=${encodeURIComponent(query)}`,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(`Overpass API error: ${response.status}`);
      return getEmptyResult();
    }

    const data = await response.json();
    const elements: OverpassElement[] = data.elements ?? [];

    // Categorize elements
    let restaurants = 0;
    let groceries = 0;
    let parks = 0;
    let schools = 0;
    const transitStops: Array<{ name: string; type: string; distance: string }> =
      [];

    for (const el of elements) {
      const tags = el.tags ?? {};
      const elLat = el.lat ?? el.center?.lat;
      const elLng = el.lon ?? el.center?.lon;
      const dist =
        elLat != null && elLng != null
          ? haversineDistance(lat, lng, elLat, elLng)
          : SEARCH_RADIUS;

      // Restaurants / cafes / fast food
      if (
        tags.amenity === "restaurant" ||
        tags.amenity === "fast_food" ||
        tags.amenity === "cafe"
      ) {
        restaurants++;
      }

      // Grocery / supermarket
      if (tags.shop === "supermarket" || tags.shop === "grocery") {
        groceries++;
      }

      // Parks
      if (tags.leisure === "park") {
        parks++;
      }

      // Schools
      if (tags.amenity === "school") {
        schools++;
      }

      // Transit stops
      if (
        tags.highway === "bus_stop" ||
        tags.public_transport === "station" ||
        tags.railway === "station" ||
        tags.railway === "tram_stop"
      ) {
        let type = "bus_stop";
        if (tags.railway === "station") type = "station";
        else if (tags.railway === "tram_stop") type = "tram_stop";
        else if (tags.public_transport === "station") type = "station";

        transitStops.push({
          name: tags.name ?? "Unnamed Stop",
          type,
          distance: formatDistance(dist),
        });
      }
    }

    // Sort transit stops by distance (parse numeric part)
    transitStops.sort((a, b) => {
      const aDist = parseFloat(a.distance);
      const bDist = parseFloat(b.distance);
      return aDist - bDist;
    });

    const totalAmenities = restaurants + groceries + parks + schools;
    const transitCount = transitStops.length;

    // Calculate scores
    const walkScore = clamp(Math.round((totalAmenities / 50) * 100), 0, 100);
    const transitScore = clamp(Math.round((transitCount / 10) * 100), 0, 100);
    const bikeScore = 60; // Default when cycling infrastructure data is unknown

    return {
      walkScore,
      walkDescription: scoreToDescription(walkScore),
      transitScore,
      transitDescription: scoreToDescription(transitScore),
      bikeScore,
      bikeDescription: scoreToDescription(bikeScore),
      nearbyTransit: transitStops,
      nearbyAmenities: { restaurants, groceries, parks, schools },
    };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      console.error("Overpass API request timed out after 8s");
    } else {
      console.error("Failed to fetch walkability data:", error);
    }
    return getEmptyResult();
  }
}
