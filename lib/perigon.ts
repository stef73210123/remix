/**
 * Perigon news integration for the Atlas news feed.
 *
 * Fetches real-estate headlines from Perigon's `/v1/all` endpoint and maps each
 * article to the raw news shape the /api/news route already speaks (title,
 * link, description, pubDate, source). Where Perigon geo-tags the story we
 * resolve a lat/lng — first from any coordinates on the article, then by
 * looking the city/state up in a built-in gazetteer — so the map can pin it.
 *
 * Docs: https://docs.perigon.io/docs/overview  ·  GET https://api.perigon.io/v1/all
 * The API key is read from PERIGON_API_KEY (server-side only — never shipped to
 * the client).
 */

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

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Coerce assorted coordinate shapes into { lat, lng }, or null. */
function coordFromAny(v: any): { lat: number; lng: number } | null {
  if (!v) return null;
  // [lng, lat] (GeoJSON order) or [lat, lng] — Perigon uses GeoJSON [lng, lat].
  if (Array.isArray(v) && v.length >= 2 && typeof v[0] === "number" && typeof v[1] === "number") {
    const [a, b] = v;
    // Heuristic: longitude has |value| up to 180, latitude up to 90. If the
    // first number is out of latitude range it must be longitude.
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

// --- Gazetteer -------------------------------------------------------------
// City centroids for the platform's markets plus major US CRE metros. Keyed by
// lowercase city name. Enough to pin the vast majority of US real-estate news;
// anything unmatched falls back to the state centroid, and failing that no pin.
const CITY_COORDS: Record<string, [number, number]> = {
  // Platform regions — DC metro
  washington: [38.9072, -77.0369],
  arlington: [38.8799, -77.1068],
  alexandria: [38.8048, -77.0469],
  bethesda: [38.9847, -77.0947],
  "silver spring": [38.9959, -77.0269],
  reston: [38.9586, -77.357],
  tysons: [38.9187, -77.2311],
  // NYC + boroughs
  "new york": [40.7128, -74.006],
  manhattan: [40.7831, -73.9712],
  brooklyn: [40.6782, -73.9442],
  queens: [40.7282, -73.7949],
  bronx: [40.8448, -73.8648],
  "staten island": [40.5795, -74.1502],
  // Westchester
  "white plains": [41.034, -73.7629],
  yonkers: [40.9312, -73.8987],
  "new rochelle": [40.9115, -73.7824],
  "mount vernon": [40.9126, -73.8371],
  scarsdale: [40.9884, -73.7799],
  // Sullivan / Hudson Valley
  monticello: [41.6553, -74.6899],
  liberty: [41.8009, -74.7466],
  kingston: [41.9276, -73.9974],
  poughkeepsie: [41.7004, -73.9209],
  // Connecticut
  stamford: [41.0534, -73.5387],
  hartford: [41.7658, -72.6734],
  "new haven": [41.3083, -72.9279],
  greenwich: [41.0262, -73.6282],
  norwalk: [41.1177, -73.4079],
  bridgeport: [41.1792, -73.1894],
  danbury: [41.3948, -73.4540],
  // Boston metro
  boston: [42.3601, -71.0589],
  cambridge: [42.3736, -71.1097],
  somerville: [42.3876, -71.0995],
  quincy: [42.2529, -71.0023],
  worcester: [42.2626, -71.8023],
  // Major US CRE metros
  "los angeles": [34.0522, -118.2437],
  "san francisco": [37.7749, -122.4194],
  "san diego": [32.7157, -117.1611],
  "san jose": [37.3382, -121.8863],
  sacramento: [38.5816, -121.4944],
  seattle: [47.6062, -122.3321],
  portland: [45.5152, -122.6784],
  chicago: [41.8781, -87.6298],
  houston: [29.7604, -95.3698],
  dallas: [32.7767, -96.797],
  austin: [30.2672, -97.7431],
  "san antonio": [29.4241, -98.4936],
  "fort worth": [32.7555, -97.3308],
  atlanta: [33.749, -84.388],
  miami: [25.7617, -80.1918],
  orlando: [28.5383, -81.3792],
  tampa: [27.9506, -82.4572],
  jacksonville: [30.3322, -81.6557],
  charlotte: [35.2271, -80.8431],
  raleigh: [35.7796, -78.6382],
  nashville: [36.1627, -86.7816],
  denver: [39.7392, -104.9903],
  phoenix: [33.4484, -112.074],
  "las vegas": [36.1699, -115.1398],
  philadelphia: [39.9526, -75.1652],
  pittsburgh: [40.4406, -79.9959],
  baltimore: [39.2904, -76.6122],
  detroit: [42.3314, -83.0458],
  minneapolis: [44.9778, -93.265],
  columbus: [39.9612, -82.9988],
  cleveland: [41.4993, -81.6944],
  cincinnati: [39.1031, -84.512],
  indianapolis: [39.7684, -86.1581],
  "kansas city": [39.0997, -94.5786],
  "st. louis": [38.627, -90.1994],
  "saint louis": [38.627, -90.1994],
  "salt lake city": [40.7608, -111.891],
  newark: [40.7357, -74.1724],
  "jersey city": [40.7178, -74.0431],
};

// State centroids as the coarse fallback. Keyed by full name and USPS abbr.
const STATE_COORDS: Record<string, [number, number]> = {
  alabama: [32.8, -86.8], al: [32.8, -86.8],
  alaska: [64.2, -149.5], ak: [64.2, -149.5],
  arizona: [34.2, -111.7], az: [34.2, -111.7],
  arkansas: [34.8, -92.4], ar: [34.8, -92.4],
  california: [37.2, -119.4], ca: [37.2, -119.4],
  colorado: [39.0, -105.5], co: [39.0, -105.5],
  connecticut: [41.6, -72.7], ct: [41.6, -72.7],
  delaware: [39.0, -75.5], de: [39.0, -75.5],
  florida: [28.6, -82.4], fl: [28.6, -82.4],
  georgia: [32.6, -83.4], ga: [32.6, -83.4],
  hawaii: [20.3, -156.4], hi: [20.3, -156.4],
  idaho: [44.4, -114.6], id: [44.4, -114.6],
  illinois: [40.0, -89.2], il: [40.0, -89.2],
  indiana: [39.9, -86.3], in: [39.9, -86.3],
  iowa: [42.0, -93.5], ia: [42.0, -93.5],
  kansas: [38.5, -98.4], ks: [38.5, -98.4],
  kentucky: [37.5, -85.3], ky: [37.5, -85.3],
  louisiana: [31.0, -92.0], la: [31.0, -92.0],
  maine: [45.4, -69.2], me: [45.4, -69.2],
  maryland: [39.0, -76.8], md: [39.0, -76.8],
  massachusetts: [42.3, -71.8], ma: [42.3, -71.8],
  michigan: [44.3, -85.4], mi: [44.3, -85.4],
  minnesota: [46.3, -94.3], mn: [46.3, -94.3],
  mississippi: [32.7, -89.7], ms: [32.7, -89.7],
  missouri: [38.4, -92.5], mo: [38.4, -92.5],
  montana: [46.9, -110.0], mt: [46.9, -110.0],
  nebraska: [41.5, -99.8], ne: [41.5, -99.8],
  nevada: [39.3, -116.6], nv: [39.3, -116.6],
  "new hampshire": [43.7, -71.6], nh: [43.7, -71.6],
  "new jersey": [40.2, -74.7], nj: [40.2, -74.7],
  "new mexico": [34.4, -106.1], nm: [34.4, -106.1],
  "new york": [42.9, -75.5], ny: [42.9, -75.5],
  "north carolina": [35.6, -79.4], nc: [35.6, -79.4],
  "north dakota": [47.5, -100.5], nd: [47.5, -100.5],
  ohio: [40.4, -82.8], oh: [40.4, -82.8],
  oklahoma: [35.6, -97.5], ok: [35.6, -97.5],
  oregon: [44.0, -120.5], or: [44.0, -120.5],
  pennsylvania: [40.9, -77.8], pa: [40.9, -77.8],
  "rhode island": [41.7, -71.5], ri: [41.7, -71.5],
  "south carolina": [33.9, -80.9], sc: [33.9, -80.9],
  "south dakota": [44.4, -100.2], sd: [44.4, -100.2],
  tennessee: [35.9, -86.4], tn: [35.9, -86.4],
  texas: [31.5, -99.3], tx: [31.5, -99.3],
  utah: [39.3, -111.7], ut: [39.3, -111.7],
  vermont: [44.0, -72.7], vt: [44.0, -72.7],
  virginia: [37.5, -78.9], va: [37.5, -78.9],
  washington: [47.4, -120.5], wa: [47.4, -120.5],
  "west virginia": [38.6, -80.6], wv: [38.6, -80.6],
  wisconsin: [44.6, -89.9], wi: [44.6, -89.9],
  wyoming: [43.0, -107.6], wy: [43.0, -107.6],
  "district of columbia": [38.9, -77.0], dc: [38.9, -77.0],
};

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
    // "New York, NY" style — take the first two comma parts.
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

/** Resolve an article's geo: explicit coordinates first, then the gazetteer. */
export function resolveArticleGeo(
  article: any
): { lat: number; lng: number; location: string | null } | null {
  const locs: any[] = Array.isArray(article?.locations) ? article.locations : [];

  // 1) Explicit coordinates on a location object or the article itself.
  for (const loc of locs) {
    const c = inRange(coordFromAny(loc?.coordinates) || coordFromAny(loc?.geo) || coordFromAny(loc));
    if (c) {
      const { city, state } = locNames(loc);
      return { ...c, location: label(city, state) };
    }
  }
  const direct = inRange(
    coordFromAny(article?.coordinates) ||
      coordFromAny(article?.geo) ||
      (typeof article?.latitude === "number" && typeof article?.longitude === "number"
        ? { lat: article.latitude, lng: article.longitude }
        : null)
  );

  // 2) Gazetteer by city, then state.
  for (const loc of locs) {
    const { city, state } = locNames(loc);
    if (city) {
      const hit = CITY_COORDS[city.toLowerCase()];
      if (hit) return { lat: hit[0], lng: hit[1], location: label(city, state) };
    }
  }
  for (const loc of locs) {
    const { state } = locNames(loc);
    if (state) {
      const hit = STATE_COORDS[state.toLowerCase()];
      // State centroid only — don't imply city-level precision with the label.
      if (hit) return { lat: hit[0], lng: hit[1], location: label("", state) };
    }
  }

  // 3) Explicit coordinates with no name.
  if (direct) return { ...direct, location: null };
  return null;
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
 * request fails, so the caller can fall back to RSS.
 */
export async function fetchPerigonNews(size = 50): Promise<RawNewsItem[]> {
  const key = process.env.PERIGON_API_KEY;
  if (!key) return [];

  const url = new URL("https://api.perigon.io/v1/all");
  url.searchParams.set("q", RE_QUERY);
  url.searchParams.set("language", "en");
  url.searchParams.set("country", "us");
  url.searchParams.set("sortBy", "date");
  url.searchParams.set("size", String(Math.min(Math.max(size, 1), 100)));
  url.searchParams.set("showReprints", "false");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url.toString(), {
      signal: controller.signal,
      headers: { "x-api-key": key, Accept: "application/json" },
    });
    if (!res.ok) {
      console.error(`[news] Perigon returned ${res.status}`);
      return [];
    }
    const data = await res.json();
    const articles: any[] = Array.isArray(data?.articles) ? data.articles : [];
    return articles
      .filter((a) => str(a?.title) && str(a?.url))
      .map((a) => {
        const geo = resolveArticleGeo(a);
        return {
          id: str(a.articleId) || str(a.clusterId) || str(a.url),
          title: str(a.title),
          link: str(a.url),
          description: (str(a.description) || str(a.summary)).slice(0, 500),
          pubDate: str(a.pubDate) || str(a.addDate),
          source: sourceName(a),
          lat: geo?.lat ?? null,
          lng: geo?.lng ?? null,
          location: geo?.location ?? null,
        };
      });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[news] Perigon error: ${message}`);
    return [];
  } finally {
    clearTimeout(timeout);
  }
}
