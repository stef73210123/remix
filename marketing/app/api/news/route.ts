import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface NewsItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  source: string;
  category: "market" | "development" | "policy" | "finance";
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
      title: item.title,
      link: item.link,
      description: item.description.slice(0, 500), // cap length
      pubDate: item.pubDate,
      source,
      category: categorize(item.title, item.description),
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

  const results = await Promise.all(
    RSS_FEEDS.map((feed) => fetchFeed(feed.url, feed.source))
  );

  const items = results.flat();

  // Sort by pubDate descending (most recent first)
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const category = searchParams.get("category");
    const limit = Math.min(
      Math.max(parseInt(searchParams.get("limit") ?? "20", 10) || 20, 1),
      100
    );

    let items = await fetchAllFeeds();

    if (category && ["market", "development", "policy", "finance"].includes(category)) {
      items = items.filter((item) => item.category === category);
    }

    items = items.slice(0, limit);

    return NextResponse.json({
      count: items.length,
      cached: Date.now() - cacheTimestamp < 1000, // true if just fetched
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
