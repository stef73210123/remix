/**
 * Perigon news integration for the Atlas news feed.
 *
 * Fetches real-estate headlines from Perigon's `/v1/all` endpoint and maps each
 * article to the raw news shape the /api/news route speaks. For the map pins we
 * resolve a PRECISE location only:
 *   1. coordinates Perigon attaches to the article, or
 *   2. a street address parsed from the headline/description, geocoded via the
 *      U.S. Census geocoder.
 * City-/state-only stories are NOT pinned (their `lat`/`lng` stay null) but they
 * still carry a `location` label so the ticker can show where they are.
 *
 * Docs: https://docs.perigon.io/docs/overview  ·  GET https://api.perigon.io/v1/all
 * The API key is read from PERIGON_API_KEY (server-side only — never shipped to
 * the client).
 */
import { geocodeUsAddress } from "@/lib/geocode";

export interface RawNewsItem {
  id: string;
  title: string;
  link: string;
  description: string;
  pubDate: string;
  source: string;
  lat: number | null;
  lng: number | null;
  location: string | null;
}

// Boolean query focusing the feed on commercial / residential real-estate news.
const RE_QUERY =
  '"commercial real estate" OR "real estate market" OR "office space" OR ' +
  'multifamily OR "industrial real estate" OR "retail real estate" OR REIT OR ' +
  '"property development" OR "commercial property" OR "housing market" OR ' +
  '"real estate development"';

/** True when a Perigon key is configured. */
export function perigonConfigured(): boolean {
  return Boolean(process.env.PERIGON_API_KEY);
}

// Last Perigon outcome, surfaced in the /api/news debug fields for diagnosis.
let lastPerigonDiag: string | null = null;
export function getPerigonDiag(): string | null {
  return lastPerigonDiag;
}

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Coerce assorted coordinate shapes into { lat, lng }, or null. */
function coordFromAny(v: any): { lat: number; lng: number } | null {
  if (!v) return null;
  // [lng, lat] (GeoJSON order) or [lat, lng] — Perigon uses GeoJSON [lng, lat].
  if (Array.isArray(v) && v.length >= 2 && typeof v[0] === "number" && typeof v[1] === "number") {
    const [a, b] = v;
    if (Math.abs(a) > 90 && Math.abs(b) <= 90) return { lat: b, lng: a };
    return { lat: a, lng: b };
  }
  if (typeof v === "object") {
    const lat = v.lat ?? v.latitude ?? v.Latitude;
    const lng = v.lng ?? v.lon ?? v.long ?? v.longitude ?? v.Longitude;
    if (typeof lat === "number" && typeof lng === "number") return { lat, lng };
  }
  return null;
}

function inRange(c: { lat: number; lng: number } | null): { lat: number; lng: number } | null {
  if (!c) return null;
  if (Math.abs(c.lat) > 90 || Math.abs(c.lng) > 180) return null;
  if (c.lat === 0 && c.lng === 0) return null;
  return c;
}

const STATE_ABBR: Record<string, string> = {
  alabama: "AL", alaska: "AK", arizona: "AZ", arkansas: "AR", california: "CA",
  colorado: "CO", connecticut: "CT", delaware: "DE", florida: "FL", georgia: "GA",
  hawaii: "HI", idaho: "ID", illinois: "IL", indiana: "IN", iowa: "IA",
  kansas: "KS", kentucky: "KY", louisiana: "LA", maine: "ME", maryland: "MD",
  massachusetts: "MA", michigan: "MI", minnesota: "MN", mississippi: "MS",
  missouri: "MO", montana: "MT", nebraska: "NE", nevada: "NV",
  "new hampshire": "NH", "new jersey": "NJ", "new mexico": "NM", "new york": "NY",
  "north carolina": "NC", "north dakota": "ND", ohio: "OH", oklahoma: "OK",
  oregon: "OR", pennsylvania: "PA", "rhode island": "RI", "south carolina": "SC",
  "south dakota": "SD", tennessee: "TN", texas: "TX", utah: "UT", vermont: "VT",
  virginia: "VA", washington: "WA", "west virginia": "WV", wisconsin: "WI",
  wyoming: "WY", "district of columbia": "DC",
};

function str(v: any): string {
  return typeof v === "string" ? v.trim() : "";
}

/** Pull the city/state names out of a Perigon location object (or string). */
function locNames(loc: any): { city: string; state: string } {
  if (typeof loc === "string") {
    const [a, b] = loc.split(",").map((s) => s.trim());
    return { city: a || "", state: b || "" };
  }
  if (loc && typeof loc === "object") {
    return {
      city: str(loc.city) || str(loc.area) || str(loc.name),
      state: str(loc.state) || str(loc.stateName) || str(loc.region),
    };
  }
  return { city: "", state: "" };
}

function label(city: string, state: string): string | null {
  const st = state ? STATE_ABBR[state.toLowerCase()] || state : "";
  if (city && st) return `${city}, ${st}`;
  if (city) return city;
  if (state) return state;
  return null;
}

/** The first Perigon location that carries a city or state name. */
function firstLocName(article: any): { city: string; state: string } {
  const locs: any[] = Array.isArray(article?.locations) ? article.locations : [];
  for (const loc of locs) {
    const n = locNames(loc);
    if (n.city || n.state) return n;
  }
  return { city: "", state: "" };
}

/** Precise coordinates Perigon attached to the article (or a location), if any. */
function extractPerigonCoords(article: any): { lat: number; lng: number } | null {
  const locs: any[] = Array.isArray(article?.locations) ? article.locations : [];
  for (const loc of locs) {
    const c = inRange(coordFromAny(loc?.coordinates) || coordFromAny(loc?.geo) || coordFromAny(loc));
    if (c) return c;
  }
  return inRange(
    coordFromAny(article?.coordinates) ||
      coordFromAny(article?.geo) ||
      (typeof article?.latitude === "number" && typeof article?.longitude === "number"
        ? { lat: article.latitude, lng: article.longitude }
        : null)
  );
}

// A US street address: a number followed by up to four name words and a street
// suffix (with an optional DC-style quadrant). Catches the addresses CRE
// headlines almost always name, e.g. "452 Lexington Ave", "1200 K Street NW".
const STREET_RE =
  /\b\d{1,6}(?:-\d{1,6})?\s+(?:[A-Za-z0-9][\w.'-]*\s+){1,4}(?:Avenue|Ave|Street|St|Boulevard|Blvd|Road|Rd|Drive|Dr|Lane|Ln|Way|Court|Ct|Place|Pl|Parkway|Pkwy|Terrace|Ter|Square|Sq|Highway|Hwy|Circle|Cir)\b\.?(?:\s+(?:NW|NE|SW|SE))?/i;

function extractStreetAddress(text: string): string | null {
  const m = text.match(STREET_RE);
  return m ? m[0].replace(/\s+/g, " ").trim() : null;
}

/** Run an async mapper over items with bounded concurrency. */
async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, i: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let idx = 0;
  async function worker() {
    while (idx < items.length) {
      const i = idx++;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => worker())
  );
  return results;
}

/** Prettify a source domain ("commercialobserver.com" → "Commercialobserver"). */
function sourceName(article: any): string {
  const name = str(article?.source?.name);
  if (name) return name;
  const domain = str(article?.source?.domain);
  if (!domain) return "Perigon";
  const main = domain.replace(/^www\./, "").split(".")[0];
  return main
    .split(/[-_]/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

/**
 * Fetch real-estate news from Perigon. Returns [] if no key is set or the
 * request fails, so the caller can fall back to RSS. Precise pins are resolved
 * by geocoding parsed addresses (bounded concurrency + an overall deadline so a
 * slow geocoder never stalls the feed).
 */
export async function fetchPerigonNews(size = 50): Promise<RawNewsItem[]> {
  const key = process.env.PERIGON_API_KEY;
  if (!key) return [];

  const url = new URL("https://api.perigon.io/v1/all");
  // Perigon authenticates via the apiKey query parameter (the documented
  // primary method); the x-api-key header is sent too for good measure.
  url.searchParams.set("apiKey", key);
  url.searchParams.set("q", RE_QUERY);
  url.searchParams.set("language", "en");
  url.searchParams.set("country", "us");
  url.searchParams.set("sortBy", "date");
  url.searchParams.set("size", String(Math.min(Math.max(size, 1), 100)));
  url.searchParams.set("showReprints", "false");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  let articles: any[] = [];
  try {
    const res = await fetch(url.toString(), {
      signal: controller.signal,
      headers: { "x-api-key": key, Accept: "application/json" },
    });
    if (!res.ok) {
      console.error(`[news] Perigon returned ${res.status}`);
      lastPerigonDiag = `http_${res.status}`;
      return [];
    }
    const data = await res.json();
    articles = Array.isArray(data?.articles) ? data.articles : [];
    lastPerigonDiag = `ok_${articles.length}`;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[news] Perigon error: ${message}`);
    lastPerigonDiag = `error_${message.slice(0, 60)}`;
    return [];
  } finally {
    clearTimeout(timeout);
  }

  const base = articles
    .filter((a) => str(a?.title) && str(a?.url))
    .map((a) => {
      const { city, state } = firstLocName(a);
      return {
        a,
        city,
        state,
        perigonCoords: extractPerigonCoords(a),
        street: extractStreetAddress(`${str(a.title)} ${str(a.description)}`),
      };
    });

  // Resolve precise geo. Perigon coordinates win; otherwise geocode the parsed
  // street address (city/state appended for disambiguation). Bounded by an
  // overall deadline so geocoding never stalls the feed.
  const geocodeDeadline = Date.now() + 6000;
  const resolved = await mapLimit(base, 8, async (b) => {
    let lat: number | null = null;
    let lng: number | null = null;
    let location: string | null = null;

    if (b.perigonCoords) {
      lat = b.perigonCoords.lat;
      lng = b.perigonCoords.lng;
      location = label(b.city, b.state);
    } else if (b.street && Date.now() < geocodeDeadline) {
      const query = [b.street, b.city, b.state].filter(Boolean).join(", ");
      const g = await geocodeUsAddress(query);
      if (g) {
        lat = g.lat;
        lng = g.lng;
        location = b.city ? `${b.street}, ${b.city}` : b.street;
      }
    }

    // City-/state-only (or unresolved): keep a label for the ticker, no pin.
    if (lat === null) location = label(b.city, b.state);

    return {
      id: str(b.a.articleId) || str(b.a.clusterId) || str(b.a.url),
      title: str(b.a.title),
      link: str(b.a.url),
      description: (str(b.a.description) || str(b.a.summary)).slice(0, 500),
      pubDate: str(b.a.pubDate) || str(b.a.addDate),
      source: sourceName(b.a),
      lat,
      lng,
      location,
    } as RawNewsItem;
  });

  return resolved;
}
