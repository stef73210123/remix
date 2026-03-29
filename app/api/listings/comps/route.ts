import { NextRequest, NextResponse } from "next/server";
import { getListingsStore } from "../route";
import type { BrokerageListing } from "@/types/cesium";

export const dynamic = "force-dynamic";

/** Earth's radius in miles */
const EARTH_RADIUS_MILES = 3958.8;

/** Haversine distance between two lat/lng points in miles */
function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_MILES * c;
}

/**
 * Typical NOI ratio by property type, used to estimate cap rates.
 * NOI ratio = net operating income / gross revenue (approximated from price).
 * Cap rate = NOI / price. We model this as a flat estimate per type.
 */
const CAP_RATE_BY_TYPE: Record<string, number> = {
  apartment: 0.055,
  "condo/co-op": 0.045,
  flats: 0.055,
  "single family": 0.05,
  retail: 0.065,
  "mixed use": 0.06,
  lodging: 0.07,
  office: 0.065,
  industrial: 0.07,
  parking: 0.08,
  "special purpose": 0.06,
  vacant: 0.0,
  "empty parcel": 0.0,
  government: 0.0,
  "health/education": 0.05,
  "cultural/religious": 0.0,
  "recreation/misc": 0.05,
};

const DEFAULT_CAP_RATE = 0.06;

function estimateCapRate(propertyType: string): number {
  return CAP_RATE_BY_TYPE[propertyType.toLowerCase()] ?? DEFAULT_CAP_RATE;
}

/** Groups of similar property types for loose matching */
const SIMILAR_TYPES: string[][] = [
  ["apartment", "condo/co-op", "flats", "single family"],
  ["retail", "mixed use"],
  ["office", "mixed use"],
  ["industrial", "parking"],
  ["lodging"],
  ["vacant", "empty parcel"],
  ["government", "health/education", "cultural/religious", "recreation/misc"],
];

function isSimilarType(a: string, b: string): boolean {
  const aLower = a.toLowerCase();
  const bLower = b.toLowerCase();
  if (aLower === bLower) return true;
  for (const group of SIMILAR_TYPES) {
    if (group.includes(aLower) && group.includes(bLower)) return true;
  }
  return false;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

interface CompResult {
  id: string;
  address: string;
  price: number;
  squareFeet: number;
  pricePerSF: number;
  propertyType: string;
  distance: number;
  capRate: number;
}

/**
 * GET /api/listings/comps
 *
 * Find comparable property sales near a given location.
 *
 * Query params:
 *   lat          - latitude (required)
 *   lng          - longitude (required)
 *   propertyType - filter to matching/similar property types (optional)
 *   radiusMiles  - search radius in miles (default 1)
 *   limit        - max results to return (default 5)
 */
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;

  const latStr = params.get("lat");
  const lngStr = params.get("lng");

  if (!latStr || !lngStr) {
    return NextResponse.json(
      { error: "lat and lng query parameters are required" },
      { status: 400 }
    );
  }

  const lat = parseFloat(latStr);
  const lng = parseFloat(lngStr);

  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return NextResponse.json(
      { error: "lat and lng must be valid numbers" },
      { status: 400 }
    );
  }

  const propertyType = params.get("propertyType");
  const radiusMiles = parseFloat(params.get("radiusMiles") || "1");
  const limit = parseInt(params.get("limit") || "5", 10);

  const listings = getListingsStore();

  // Filter and compute distance
  const candidates: { listing: BrokerageListing; distance: number }[] = [];

  for (const listing of listings) {
    // Must have coordinates, price, and squareFeet
    if (
      listing.lat == null ||
      listing.lng == null ||
      listing.price == null ||
      listing.price <= 0 ||
      listing.squareFeet == null ||
      listing.squareFeet <= 0
    ) {
      continue;
    }

    // Property type filter (match or similar)
    if (propertyType && !isSimilarType(propertyType, listing.propertyType)) {
      continue;
    }

    const distance = haversineDistance(lat, lng, listing.lat, listing.lng);
    if (distance > radiusMiles) {
      continue;
    }

    candidates.push({ listing, distance });
  }

  // Sort by distance (closest first)
  candidates.sort((a, b) => a.distance - b.distance);

  // Take the top N
  const topComps = candidates.slice(0, limit);

  // Build comp results with derived metrics
  const comps: CompResult[] = topComps.map(({ listing, distance }) => {
    const price = listing.price!;
    const sqft = listing.squareFeet!;
    const pricePerSF = price / sqft;
    const capRate = estimateCapRate(listing.propertyType);

    return {
      id: listing.id,
      address: listing.address,
      price,
      squareFeet: sqft,
      pricePerSF: Math.round(pricePerSF * 100) / 100,
      propertyType: listing.propertyType,
      distance: Math.round(distance * 1000) / 1000,
      capRate,
    };
  });

  // Summary statistics
  const prices = comps.map((c) => c.price);
  const pricePerSFs = comps.map((c) => c.pricePerSF);

  const summary = {
    avgPricePerSF:
      pricePerSFs.length > 0
        ? Math.round(
            (pricePerSFs.reduce((s, v) => s + v, 0) / pricePerSFs.length) * 100
          ) / 100
        : 0,
    medianPrice: median(prices),
    priceRange:
      prices.length > 0
        ? { min: Math.min(...prices), max: Math.max(...prices) }
        : { min: 0, max: 0 },
  };

  return NextResponse.json({
    comps,
    summary,
    meta: {
      lat,
      lng,
      radiusMiles,
      propertyType: propertyType ?? null,
      totalCandidates: candidates.length,
      returned: comps.length,
    },
  });
}
