import { NextRequest, NextResponse } from "next/server";
import type { BrokerageListing } from "@/types/cesium";
import { STATE_REGIONS } from "@/lib/scrapers/brokerage-config";
import { Redis } from "@upstash/redis";

export const dynamic = "force-dynamic";

/* ------------------------------------------------------------------ */
/*  Redis client (optional – falls back to in-memory when env is unset) */
/* ------------------------------------------------------------------ */

const REDIS_KEY = "listings:all";
const REDIS_TTL_SECONDS = 60 * 60 * 24; // 24 hours

function regionKey(region: string) {
  return `listings:region:${region}`;
}

let redis: Redis | null = null;
if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
}

/* ------------------------------------------------------------------ */
/*  In-memory fallback store                                          */
/* ------------------------------------------------------------------ */

let listingsStore: BrokerageListing[] = [];

export function setListingsStore(listings: BrokerageListing[]) {
  listingsStore = listings;
}

export function getListingsStore(): BrokerageListing[] {
  return listingsStore;
}

/* ------------------------------------------------------------------ */
/*  Redis helpers                                                     */
/* ------------------------------------------------------------------ */

async function getListingsFromRedis(): Promise<BrokerageListing[] | null> {
  if (!redis) return null;
  try {
    const data = await redis.get<BrokerageListing[]>(REDIS_KEY);
    return data ?? null;
  } catch (err) {
    console.error("[listings] Redis GET failed, falling back to memory:", err);
    return null;
  }
}

async function storeListingsToRedis(listings: BrokerageListing[]) {
  if (!redis) return;
  try {
    // Store the full listing set with TTL
    await redis.set(REDIS_KEY, listings, { ex: REDIS_TTL_SECONDS });

    // Also index by region for faster regional queries
    const byRegion = new Map<string, BrokerageListing[]>();
    for (const l of listings) {
      if (l.region) {
        const existing = byRegion.get(l.region) ?? [];
        existing.push(l);
        byRegion.set(l.region, existing);
      }
    }

    const pipeline = redis.pipeline();
    for (const [region, regionListings] of byRegion) {
      pipeline.set(regionKey(region), regionListings, { ex: REDIS_TTL_SECONDS });
    }
    await pipeline.exec();
  } catch (err) {
    console.error("[listings] Redis SET failed:", err);
  }
}

/* ------------------------------------------------------------------ */
/*  Resolve listings: Redis first, then in-memory                     */
/* ------------------------------------------------------------------ */

async function resolveListings(): Promise<BrokerageListing[]> {
  const fromRedis = await getListingsFromRedis();
  if (fromRedis && fromRedis.length > 0) {
    // Keep in-memory copy in sync so getListingsStore() stays useful
    listingsStore = fromRedis;
    return fromRedis;
  }
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
  let filtered = [...(await resolveListings())];

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

    // Resolve current listings (from Redis or memory)
    const current = await resolveListings();

    // Merge with existing, deduplicating by id
    const existingIds = new Set(current.map((l) => l.id));
    const toAdd = newListings.filter((l) => !existingIds.has(l.id));
    const merged = [...current, ...toAdd];

    // Update both in-memory and Redis
    listingsStore = merged;
    await storeListingsToRedis(merged);

    return NextResponse.json({
      added: toAdd.length,
      total: merged.length,
    });
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}
