import { NextRequest, NextResponse } from "next/server";
import { fetchPerigonNews, perigonConfigured } from "@/lib/perigon";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface NewsItem {
  id: string;
  title: string;
  link: string;
  description: string;
  pubDate: string;
  source: string;
  category: "market" | "development" | "policy" | "finance";
  // Present only when the story's location could be resolved (Perigon geo).
  lat: number | null;
  lng: number | null;
  location: string | null;
}

// Stable id from the article link (used to key map pins + dedupe).
function idFromLink(link: string): string {
  let h = 0;
  for (let i = 0; i < link.length; i++) {
    h = (h * 31 + link.charCodeAt(i)) | 0;
  }
  return `n${(h >>> 0).toString(36)}`;
}

// ---------------------------------------------------------------------------
// RSS feed sources
// ---------------------------------------------------------------------------

const RSS_FEEDS: { url: string; source: string }[] = [
  { url: "https://www.globest.com/feed/", source: "GlobeSt" },
  { url: "https://commercialobserver.com/feed/", source: "Commercial Observer" },
  { url: "https://www.connectcre.com/feed/", source: "ConnectCRE" },
];

// ---------------------------------------------------------------------------
// In-memory cache (1-hour TTL)
// ---------------------------------------------------------------------------

let cachedItems: NewsItem[] = [];
let cacheTimestamp = 0;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
// Which feed served the cached batch — surfaced in the response for debugging.
let feedSource: "perigon" | "rss" | "none" = "none";

// ---------------------------------------------------------------------------
// Category classification
// ---------------------------------------------------------------------------

const CATEGORY_KEYWORDS: Record<NewsItem["category"], RegExp> = {
  policy: /\b(regulat|legislat|zon(?:ing|e)|govern|tax|polic|law|ordinance|compliance|mandate|federal|state\s+bill|city\s+council|affordable\s+housing\s+act)\b/i,
  development: /\b(develop|construct|build|broke\s+ground|groundbreak|renovation|redevelop|mixed[\s-]use|high[\s-]rise|tower|project|plan(?:ned|s)|propos(?:ed|al)|permit|entitle)\b/i,
  finance: /\b(financ|loan|debt|mortgage|interest\s+rate|capital|invest|fund|equit|CMBS|securitiz|refinanc|yield|underwr|credit|lend|borrow|IPO|REIT)\b/i,
  market: /\b(market|leas(?:e|ing)|vacanc|occupan|rent|tenant|absorpt|demand|supply|forecast|trend|quarter|annual|report|survey|outlook|office\s+space|industrial|retail|multifamily)\b/i,
};

function categorize(title: string, description: string): NewsItem["category"] {
  const text = `${title} ${description}`;

  // Check in priority order: policy > development > finance > market (fallback)
  for (const cat of ["policy", "development", "finance", "market"] as const) {
    if (CATEGORY_KEYWORDS[cat].test(text)) {
      return cat;
    }
  }

  return "market"; // default
}

// ---------------------------------------------------------------------------
// XML helpers (regex-based, no external lib)
// ---------------------------------------------------------------------------

function extractTag(xml: string, tag: string): string {
  // Handle CDATA sections and plain text
  const re = new RegExp(
    `<${tag}[^>]*>\\s*(?:<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>|([\\s\\S]*?))\\s*</${tag}>`,
    "i"
  );
  const match = xml.match(re);
  if (!match) return "";
  const raw = match[1] ?? match[2] ?? "";
  // Strip any remaining HTML tags for description text
  return raw.replace(/<[^>]+>/g, "").trim();
}

function extractItems(xml: string): { title: string; link: string; description: string; pubDate: string }[] {
  const items: { title: string; link: string; description: string; pubDate: string }[] = [];
  const itemRegex = /<item[\s>]([\s\S]*?)<\/item>/gi;
  let match: RegExpExecArray | null;

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    items.push({
      title: extractTag(block, "title"),
      link: extractTag(block, "link"),
      description: extractTag(block, "description") || extractTag(block, "summary"),
      pubDate: extractTag(block, "pubDate") || extractTag(block, "dc:date") || extractTag(block, "published"),
    });
  }

  return items;
}

// ---------------------------------------------------------------------------
// Fetch a single feed with timeout
// ---------------------------------------------------------------------------

async function fetchFeed(url: string, source: string): Promise<NewsItem[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "CircularCRE-NewsBot/1.0",
        Accept: "application/rss+xml, application/xml, text/xml",
      },
    });

    clearTimeout(timeout);

    if (!res.ok) {
      console.error(`[news] Feed ${source} returned ${res.status}`);
      return [];
    }

    const xml = await res.text();
    const rawItems = extractItems(xml);

    return rawItems.map((item) => ({
      id: idFromLink(item.link),
      title: item.title,
      link: item.link,
      description: item.description.slice(0, 500), // cap length
      pubDate: item.pubDate,
      source,
      category: categorize(item.title, item.description),
      // RSS feeds carry no geo — no pin for these.
      lat: null,
      lng: null,
      location: null,
    }));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[news] Error fetching ${source}: ${message}`);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Fetch all feeds (parallel) and merge
// ---------------------------------------------------------------------------

async function fetchAllFeeds(): Promise<NewsItem[]> {
  const now = Date.now();

  if (cachedItems.length > 0 && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedItems;
  }

  // Prefer Perigon (real geo-tagged headlines). Map its raw items into our
  // shape and assign categories with the same keyword classifier used for RSS.
  let items: NewsItem[] = [];
  feedSource = "none";
  if (perigonConfigured()) {
    const perigon = await fetchPerigonNews(50);
    if (perigon.length > 0) feedSource = "perigon";
    items = perigon.map((p) => ({
      id: p.id || idFromLink(p.link),
      title: p.title,
      link: p.link,
      description: p.description,
      pubDate: p.pubDate,
      source: p.source,
      category: categorize(p.title, p.description),
      lat: p.lat,
      lng: p.lng,
      location: p.location,
    }));
  }

  // Fall back to (or backfill from) the RSS feeds if Perigon is unset or empty.
  if (items.length === 0) {
    const results = await Promise.all(
      RSS_FEEDS.map((feed) => fetchFeed(feed.url, feed.source))
    );
    items = results.flat();
    if (items.length > 0) feedSource = "rss";
  }

  // Dedupe by link, then sort by pubDate descending (most recent first).
  const seen = new Set<string>();
  items = items.filter((i) => {
    if (!i.link || seen.has(i.link)) return false;
    seen.add(i.link);
    return true;
  });
  items.sort((a, b) => {
    const da = a.pubDate ? new Date(a.pubDate).getTime() : 0;
    const db = b.pubDate ? new Date(b.pubDate).getTime() : 0;
    return db - da;
  });

  cachedItems = items;
  cacheTimestamp = Date.now();

  return items;
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

// Metro/state keywords per map region, so the ticker localizes to the jump.
const REGION_KEYWORDS: Record<string, RegExp> = {
  dc: /\b(washington,?\s*d\.?c\.?|d\.?c\.?\b|district of columbia|dmv\b|arlington|alexandria|bethesda|montgomery county|northern virginia|capitol hill|georgetown)\b/i,
  nyc: /\b(new york city|new york,?\s*ny|nyc\b|manhattan|brooklyn|queens|the bronx|bronx|staten island|hudson yards|midtown|downtown new york)\b/i,
  sullivan: /\b(sullivan county|catskill|monticello|liberty,?\s*ny|hudson valley|upstate new york)\b/i,
  westchester: /\b(westchester|white plains|yonkers|new rochelle|mount vernon|rye,?\s*ny|hudson valley)\b/i,
  ct: /\b(connecticut|\bct\b|stamford|hartford|new haven|greenwich|norwalk|bridgeport|fairfield county)\b/i,
  boston: /\b(boston|massachusetts|\bma\b|cambridge|somerville|suffolk county|greater boston|seaport|back bay)\b/i,
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const category = searchParams.get("category");
    const region = searchParams.get("region");
    const limit = Math.min(
      Math.max(parseInt(searchParams.get("limit") ?? "20", 10) || 20, 1),
      100
    );

    let items = await fetchAllFeeds();

    // Localize to the region's metro. If there are enough local hits use them;
    // otherwise lead with local and backfill with national so the ticker isn't empty.
    if (region && REGION_KEYWORDS[region]) {
      const re = REGION_KEYWORDS[region];
      const local = items.filter((i) => re.test(`${i.title} ${i.description}`));
      if (local.length >= 3) {
        items = local;
      } else {
        const seen = new Set(local.map((i) => i.link));
        items = [...local, ...items.filter((i) => !seen.has(i.link))];
      }
    }

    if (category && ["market", "development", "policy", "finance"].includes(category)) {
      items = items.filter((item) => item.category === category);
    }

    items = items.slice(0, limit);

    return NextResponse.json({
      count: items.length,
      cached: Date.now() - cacheTimestamp < 1000, // true if just fetched
      // Debug: which feed is live, whether the Perigon key is set, and how many
      // of the returned items resolved to map coordinates.
      source: feedSource,
      perigonConfigured: perigonConfigured(),
      geoCount: items.filter((i) => typeof i.lat === "number" && typeof i.lng === "number").length,
      items,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[news] Unhandled error:", message);
    return NextResponse.json(
      { error: "Failed to fetch news", detail: message },
      { status: 500 }
    );
  }
}
