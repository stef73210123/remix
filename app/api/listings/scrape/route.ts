import { NextRequest, NextResponse } from "next/server";
import {
  scrapeBrokerage,
  scrapeState,
  scrapeAll,
  getBrokerageSummary,
} from "@/lib/scrapers/listing-scraper";
import {
  BROKERAGE_CONFIGS,
  TARGET_STATES,
  type TargetState,
} from "@/lib/scrapers/brokerage-config";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes for full scrape

/**
 * GET /api/listings/scrape
 *
 * Query params:
 *   action=summary  - Get list of all configured brokerages
 *   state=NY        - Scrape all brokerages for a specific state
 *   brokerage=cbre  - Scrape a specific brokerage (requires state)
 *   (no params)     - Scrape all brokerages across all states
 *   maxPages=3      - Max pages to scrape per brokerage (default 3)
 *   geocode=true    - Geocode addresses (slow, uses Nominatim)
 */
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const action = params.get("action");
  const state = params.get("state")?.toUpperCase() as TargetState | null;
  const brokerageId = params.get("brokerage");
  const maxPages = parseInt(params.get("maxPages") || "3", 10);
  const geocode = params.get("geocode") === "true";

  // Summary endpoint
  if (action === "summary") {
    const summary = getBrokerageSummary();
    return NextResponse.json({
      states: TARGET_STATES,
      brokerages: summary,
      totalBrokerages: BROKERAGE_CONFIGS.length,
    });
  }

  // Single brokerage + state
  if (brokerageId && state) {
    if (!TARGET_STATES.includes(state)) {
      return NextResponse.json(
        { error: `Invalid state. Must be one of: ${TARGET_STATES.join(", ")}` },
        { status: 400 }
      );
    }
    const brokerage = BROKERAGE_CONFIGS.find((b) => b.id === brokerageId);
    if (!brokerage) {
      return NextResponse.json(
        { error: `Unknown brokerage: ${brokerageId}` },
        { status: 400 }
      );
    }
    const result = await scrapeBrokerage(brokerage, state, { maxPages, geocode });
    return NextResponse.json(result);
  }

  // All brokerages for a state
  if (state) {
    if (!TARGET_STATES.includes(state)) {
      return NextResponse.json(
        { error: `Invalid state. Must be one of: ${TARGET_STATES.join(", ")}` },
        { status: 400 }
      );
    }
    const results = await scrapeState(state, { maxPages, geocode });
    const totalListings = results.reduce((s, r) => s + r.listings.length, 0);
    return NextResponse.json({
      state,
      brokeragesScraped: results.length,
      totalListings,
      results,
    });
  }

  // Full scrape across all states
  const results = await scrapeAll({ maxPages, geocode });
  const totalListings = results.reduce((s, r) => s + r.listings.length, 0);
  const byState: Record<string, number> = {};
  for (const r of results) {
    byState[r.state] = (byState[r.state] || 0) + r.listings.length;
  }

  return NextResponse.json({
    states: TARGET_STATES,
    brokeragesScraped: results.length,
    totalListings,
    listingsByState: byState,
    results,
  });
}
