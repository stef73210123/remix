import { NextRequest, NextResponse } from "next/server";
import type { BrokerageListing } from "@/types/cesium";
import { STATE_REGIONS } from "@/lib/scrapers/brokerage-config";

export const dynamic = "force-dynamic";

/**
 * In-memory listing store. In production this would be backed by a database.
 * Listings are populated by the /api/listings/scrape endpoint.
 */
let listingsStore: BrokerageListing[] = [];

export function setListingsStore(listings: BrokerageListing[]) {
  listingsStore = listings;
}

export function getListingsStore(): BrokerageListing[] {
  return listingsStore;
}

/**
 * GET /api/listings
 *
 * Query params:
 *   region=dc|nyc|sullivan|westchester|ct|boston
 *   state=DC|NY|CT|MA
 *   type=office|retail|industrial|...
 *   minPrice=100000
 *   maxPrice=5000000
 *   minSF=1000
 *   maxSF=50000
 *   brokerage=cbre
 *   limit=50
 *   offset=0
 */
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  let filtered = [...listingsStore];

  // Filter by region
  const region = params.get("region");
  if (region) {
    // Map region to states
    const regionToState: Record<string, string> = {};
    for (const [state, regions] of Object.entries(STATE_REGIONS)) {
      for (const r of regions) {
        regionToState[r] = state;
      }
    }
    const state = regionToState[region];
    if (state) {
      filtered = filtered.filter((l) => l.state === state || l.region === region);
    }
  }

  // Filter by state
  const state = params.get("state")?.toUpperCase();
  if (state) {
    filtered = filtered.filter((l) => l.state === state);
  }

  // Filter by property type
  const type = params.get("type");
  if (type) {
    filtered = filtered.filter(
      (l) => l.propertyType.toLowerCase().includes(type.toLowerCase())
    );
  }

  // Filter by price range
  const minPrice = params.get("minPrice");
  const maxPrice = params.get("maxPrice");
  if (minPrice) filtered = filtered.filter((l) => (l.price ?? 0) >= Number(minPrice));
  if (maxPrice) filtered = filtered.filter((l) => (l.price ?? Infinity) <= Number(maxPrice));

  // Filter by square feet
  const minSF = params.get("minSF");
  const maxSF = params.get("maxSF");
  if (minSF) filtered = filtered.filter((l) => (l.squareFeet ?? 0) >= Number(minSF));
  if (maxSF) filtered = filtered.filter((l) => (l.squareFeet ?? Infinity) <= Number(maxSF));

  // Filter by brokerage
  const brokerage = params.get("brokerage");
  if (brokerage) {
    filtered = filtered.filter((l) => l.source === brokerage);
  }

  // Only return listings with coordinates for map display
  const mapOnly = params.get("mapOnly") === "true";
  if (mapOnly) {
    filtered = filtered.filter((l) => l.lat != null && l.lng != null);
  }

  // Pagination
  const limit = Math.min(parseInt(params.get("limit") || "100", 10), 500);
  const offset = parseInt(params.get("offset") || "0", 10);
  const total = filtered.length;
  filtered = filtered.slice(offset, offset + limit);

  return NextResponse.json({
    total,
    limit,
    offset,
    listings: filtered,
  });
}

/**
 * POST /api/listings
 * Store scraped listings (called internally after a scrape)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const newListings: BrokerageListing[] = body.listings || [];

    // Merge with existing, deduplicating by id
    const existingIds = new Set(listingsStore.map((l) => l.id));
    const toAdd = newListings.filter((l) => !existingIds.has(l.id));
    listingsStore = [...listingsStore, ...toAdd];

    return NextResponse.json({
      added: toAdd.length,
      total: listingsStore.length,
    });
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}
