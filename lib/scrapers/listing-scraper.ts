/**
 * Commercial real estate listing scraper.
 *
 * Scrapes public listing pages from major commercial brokerage firms
 * operating in DC, NY, CT, and MA. Extracts structured listing data
 * and geocodes addresses for map display.
 */

import {
  BrokerageConfig,
  BROKERAGE_CONFIGS,
  TARGET_STATES,
  type TargetState,
  getBrokeragesForState,
} from "./brokerage-config";
import type { BrokerageListing } from "@/types/cesium";

// Simple HTML tag stripper for extracting text
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

// Extract JSON-LD structured data from HTML (many brokerage sites include this)
function extractJsonLd(html: string): Record<string, unknown>[] {
  const results: Record<string, unknown>[] = [];
  const regex = /<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(match[1]);
      if (Array.isArray(parsed)) {
        results.push(...parsed);
      } else {
        results.push(parsed);
      }
    } catch {
      // skip malformed JSON-LD
    }
  }
  return results;
}

// Extract property listings from common HTML patterns
function extractListingsFromHtml(
  html: string,
  brokerage: BrokerageConfig,
  state: string
): Partial<BrokerageListing>[] {
  const listings: Partial<BrokerageListing>[] = [];

  // Strategy 1: JSON-LD RealEstateListing / Product schema
  const jsonLd = extractJsonLd(html);
  for (const item of jsonLd) {
    if (
      item["@type"] === "RealEstateListing" ||
      item["@type"] === "Product" ||
      item["@type"] === "Place" ||
      item["@type"] === "Offer"
    ) {
      const address =
        typeof item.address === "object" && item.address !== null
          ? item.address
          : {};
      const addr = address as Record<string, string>;

      listings.push({
        source: brokerage.id,
        brokerageName: brokerage.name,
        address: addr.streetAddress || String(item.name || ""),
        city: addr.addressLocality || "",
        state: addr.addressRegion || state,
        zip: addr.postalCode || "",
        propertyType: String(item.category || item.propertyType || "Commercial"),
        description: stripHtml(String(item.description || "")),
        url: String(item.url || ""),
        price: item.price ? Number(item.price) : undefined,
        squareFeet: item.floorSize
          ? Number(
              typeof item.floorSize === "object"
                ? (item.floorSize as Record<string, unknown>).value
                : item.floorSize
            )
          : undefined,
      });
    }
  }

  // Strategy 2: Parse common listing card patterns
  // Look for repeated property card elements with address/price info
  const cardPatterns = [
    // Pattern: data-listing or data-property attributes
    /data-(?:listing|property)[^>]*>[\s\S]*?<(?:h[2-4]|div)[^>]*class="[^"]*(?:address|title|name)[^"]*"[^>]*>([\s\S]*?)<\/(?:h[2-4]|div)>/gi,
    // Pattern: listing-card, property-card classes
    /class="[^"]*(?:listing|property)-card[^"]*"[\s\S]*?<(?:a|h[2-4]|div)[^>]*>([\s\S]*?)<\/(?:a|h[2-4]|div)>/gi,
  ];

  for (const pattern of cardPatterns) {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      const cardHtml = match[0];
      const title = stripHtml(match[1] || "");

      // Try to extract price
      const priceMatch = cardHtml.match(
        /\$[\d,]+(?:\.\d{2})?(?:\s*(?:\/\s*SF|PSF))?/i
      );
      // Try to extract SF
      const sfMatch = cardHtml.match(
        /([\d,]+)\s*(?:SF|sq\s*ft|square\s*feet)/i
      );
      // Try to extract link
      const linkMatch = cardHtml.match(/href="([^"]+)"/i);

      if (title && title.length > 5) {
        listings.push({
          source: brokerage.id,
          brokerageName: brokerage.name,
          address: title,
          state,
          propertyType: "Commercial",
          url: linkMatch ? linkMatch[1] : brokerage.searchUrl,
          price: priceMatch
            ? Number(priceMatch[0].replace(/[$,]/g, "").split("/")[0])
            : undefined,
          squareFeet: sfMatch
            ? Number(sfMatch[1].replace(/,/g, ""))
            : undefined,
        });
      }
    }
  }

  // Strategy 3: Look for structured data in meta tags
  const ogProps = html.match(
    /<meta[^>]*property="og:(?:title|description)"[^>]*content="([^"]*)"[^>]*>/gi
  );
  if (ogProps && listings.length === 0) {
    // This is likely a single-listing page
    const titleMatch = html.match(
      /<meta[^>]*property="og:title"[^>]*content="([^"]*)"[^>]*>/i
    );
    const descMatch = html.match(
      /<meta[^>]*property="og:description"[^>]*content="([^"]*)"[^>]*>/i
    );
    if (titleMatch) {
      listings.push({
        source: brokerage.id,
        brokerageName: brokerage.name,
        address: stripHtml(titleMatch[1]),
        state,
        propertyType: "Commercial",
        description: descMatch ? stripHtml(descMatch[1]) : undefined,
        url: brokerage.searchUrl,
      });
    }
  }

  return listings;
}

// Geocode an address using Nominatim (free, rate-limited)
async function geocodeAddress(
  address: string,
  city: string,
  state: string
): Promise<{ lat: number; lng: number } | null> {
  const query = [address, city, state, "USA"].filter(Boolean).join(", ");
  try {
    const params = new URLSearchParams({
      q: query,
      format: "json",
      limit: "1",
      countrycodes: "us",
    });
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?${params}`,
      {
        headers: { "User-Agent": "CircularRealEstate/1.0" },
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
      };
    }
  } catch {
    // Geocoding failed silently
  }
  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function generateListingId(listing: Partial<BrokerageListing>): string {
  const raw = `${listing.source}-${listing.address}-${listing.state}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

export interface ScrapeResult {
  brokerage: string;
  state: string;
  listings: BrokerageListing[];
  error?: string;
  scrapedAt: string;
}

export interface ScrapeProgress {
  total: number;
  completed: number;
  current: string;
  results: ScrapeResult[];
}

/**
 * Scrape a single brokerage for a single state.
 */
export async function scrapeBrokerage(
  brokerage: BrokerageConfig,
  state: TargetState,
  options?: { maxPages?: number; geocode?: boolean }
): Promise<ScrapeResult> {
  const maxPages = options?.maxPages ?? 3;
  const shouldGeocode = options?.geocode ?? false;
  const allListings: BrokerageListing[] = [];
  const now = new Date().toISOString();

  try {
    for (let page = 1; page <= maxPages; page++) {
      const url = brokerage.buildSearchUrl(state, page);

      const res = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; CircularRealEstate/1.0; +https://circular.dev)",
          Accept: "text/html,application/xhtml+xml,application/json",
        },
        signal: AbortSignal.timeout(15000),
      });

      if (!res.ok) {
        if (page === 1) {
          return {
            brokerage: brokerage.id,
            state,
            listings: [],
            error: `HTTP ${res.status}: ${res.statusText}`,
            scrapedAt: now,
          };
        }
        break; // No more pages
      }

      const contentType = res.headers.get("content-type") || "";
      const body = await res.text();

      let rawListings: Partial<BrokerageListing>[];

      if (contentType.includes("json")) {
        // API returned JSON directly
        try {
          const json = JSON.parse(body);
          const items = Array.isArray(json)
            ? json
            : json.results || json.listings || json.data || json.properties || [];
          rawListings = items.map(
            (item: Record<string, unknown>) =>
              ({
                source: brokerage.id,
                brokerageName: brokerage.name,
                address: String(
                  item.address || item.street_address || item.title || ""
                ),
                city: String(item.city || item.municipality || ""),
                state: String(item.state || state),
                zip: String(item.zip || item.postal_code || item.zipCode || ""),
                propertyType: String(
                  item.property_type ||
                    item.propertyType ||
                    item.type ||
                    "Commercial"
                ),
                listingType:
                  item.listing_type === "lease" || item.listingType === "lease"
                    ? "lease"
                    : "sale",
                price: item.price ? Number(item.price) : undefined,
                pricePerSF: item.price_per_sf
                  ? Number(item.price_per_sf)
                  : undefined,
                squareFeet: item.square_feet
                  ? Number(item.square_feet)
                  : item.sqft
                    ? Number(item.sqft)
                    : undefined,
                lotSize: item.lot_size ? Number(item.lot_size) : undefined,
                yearBuilt: item.year_built ? Number(item.year_built) : undefined,
                description: String(item.description || ""),
                url: String(item.url || item.detail_url || brokerage.searchUrl),
                broker: String(item.broker || item.agent || ""),
                brokerPhone: String(item.broker_phone || item.phone || ""),
                lat: item.latitude ? Number(item.latitude) : undefined,
                lng: item.longitude ? Number(item.longitude) : undefined,
              }) as Partial<BrokerageListing>
          );
        } catch {
          rawListings = [];
        }
      } else {
        // HTML response - parse it
        rawListings = extractListingsFromHtml(body, brokerage, state);
      }

      if (rawListings.length === 0 && page > 1) break; // No more results

      for (const raw of rawListings) {
        // Geocode if needed and not already geocoded
        if (shouldGeocode && !raw.lat && raw.address) {
          const coords = await geocodeAddress(
            raw.address,
            raw.city || "",
            raw.state || state
          );
          if (coords) {
            raw.lat = coords.lat;
            raw.lng = coords.lng;
          }
          await sleep(1100); // Nominatim rate limit: 1 req/sec
        }

        const listing: BrokerageListing = {
          id: generateListingId(raw),
          source: raw.source || brokerage.id,
          brokerageName: raw.brokerageName || brokerage.name,
          address: raw.address || "Unknown",
          city: raw.city || "",
          state: raw.state || state,
          zip: raw.zip || "",
          lat: raw.lat,
          lng: raw.lng,
          propertyType: raw.propertyType || "Commercial",
          listingType: raw.listingType || "sale",
          price: raw.price,
          pricePerSF: raw.pricePerSF,
          squareFeet: raw.squareFeet,
          lotSize: raw.lotSize,
          yearBuilt: raw.yearBuilt,
          description: raw.description,
          url: raw.url || brokerage.searchUrl,
          broker: raw.broker,
          brokerPhone: raw.brokerPhone,
          scrapedAt: now,
          region: state,
        };

        allListings.push(listing);
      }

      // Rate limit between pages
      if (page < maxPages) {
        await sleep(brokerage.delayMs);
      }
    }

    return {
      brokerage: brokerage.id,
      state,
      listings: allListings,
      scrapedAt: now,
    };
  } catch (err) {
    return {
      brokerage: brokerage.id,
      state,
      listings: allListings,
      error: err instanceof Error ? err.message : String(err),
      scrapedAt: now,
    };
  }
}

/**
 * Scrape all brokerages for a given state.
 */
export async function scrapeState(
  state: TargetState,
  options?: { maxPages?: number; geocode?: boolean }
): Promise<ScrapeResult[]> {
  const brokerages = getBrokeragesForState(state);
  const results: ScrapeResult[] = [];

  for (const brokerage of brokerages) {
    const result = await scrapeBrokerage(brokerage, state, options);
    results.push(result);
    // Delay between brokerages
    await sleep(1000);
  }

  return results;
}

/**
 * Scrape all brokerages across all target states.
 */
export async function scrapeAll(
  options?: { maxPages?: number; geocode?: boolean }
): Promise<ScrapeResult[]> {
  const allResults: ScrapeResult[] = [];

  for (const state of TARGET_STATES) {
    const stateResults = await scrapeState(state, options);
    allResults.push(...stateResults);
  }

  return allResults;
}

/**
 * Get a summary of all configured brokerages by state.
 */
export function getBrokerageSummary(): Record<
  string,
  { count: number; names: string[] }
> {
  const summary: Record<string, { count: number; names: string[] }> = {};

  for (const state of TARGET_STATES) {
    const brokerages = getBrokeragesForState(state);
    summary[state] = {
      count: brokerages.length,
      names: brokerages.map((b) => b.name),
    };
  }

  return summary;
}
