"use client";

import { useState, useEffect } from "react";
import { ChevronUp, ChevronDown, Newspaper, ExternalLink, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCesium } from "@/components/cesium/CesiumContext";

interface NewsItem {
  id: string;
  title: string;
  source: string;
  summary: string;
  url: string;
  timestamp: string;
  category: "market" | "development" | "policy" | "finance";
}

const FALLBACK_NEWS: NewsItem[] = [
  {
    id: "1",
    title: "DC Office Market Sees Highest Vacancy Rate in a Decade",
    source: "Commercial Observer",
    summary: "Downtown Washington D.C. office vacancy climbs to 21.3% as remote work continues to reshape the commercial landscape.",
    url: "#",
    timestamp: "2h ago",
    category: "market",
  },
  {
    id: "2",
    title: "Navy Yard Mixed-Use Development Breaks Ground on 450-Unit Project",
    source: "Washington Business Journal",
    summary: "A new $180M mixed-use development at Half Street SW will add 450 apartments and 25,000 SF of retail.",
    url: "#",
    timestamp: "4h ago",
    category: "development",
  },
  {
    id: "3",
    title: "Zoning Commission Approves Height Increase for NoMA District",
    source: "Greater Greater Washington",
    summary: "The DC Zoning Commission voted 4-1 to allow buildings up to 200 feet in the NoMA Business Improvement District.",
    url: "#",
    timestamp: "6h ago",
    category: "policy",
  },
  {
    id: "4",
    title: "Federal Interest Rate Decision Impacts CRE Lending",
    source: "CBRE Research",
    summary: "Latest Fed decision to hold rates steady provides cautious optimism for commercial real estate refinancing activity.",
    url: "#",
    timestamp: "1d ago",
    category: "finance",
  },
];

function getRelativeTime(pubDate: string): string {
  const now = Date.now();
  const then = new Date(pubDate).getTime();
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

const VALID_CATEGORIES = new Set<NewsItem["category"]>(["market", "development", "policy", "finance"]);

const CATEGORY_COLORS: Record<NewsItem["category"], string> = {
  market: "#2980b9",
  development: "#27ae60",
  policy: "#8e44ad",
  finance: "#e67e22",
};

export default function NewsPanel() {
  const { leftPanelOpen, rightPanel, newsExpanded: expanded, setNewsExpanded: setExpanded } = useCesium();
  const [filter, setFilter] = useState<NewsItem["category"] | "all">("all");
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function fetchNews() {
      try {
        const res = await fetch("/api/news?limit=20");
        if (!res.ok) throw new Error("Failed to fetch news");
        const data = await res.json();
        if (cancelled) return;
        const items: NewsItem[] = data.items.map(
          (item: { id: string; title: string; link: string; description: string; pubDate: string; source: string; category: string }) => ({
            id: item.id,
            title: item.title,
            source: item.source,
            summary: item.description,
            url: item.link,
            timestamp: getRelativeTime(item.pubDate),
            category: VALID_CATEGORIES.has(item.category as NewsItem["category"])
              ? (item.category as NewsItem["category"])
              : "market",
          })
        );
        setNews(items);
      } catch {
        if (!cancelled) setNews(FALLBACK_NEWS);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchNews();
    return () => { cancelled = true; };
  }, []);

  const filtered =
    filter === "all" ? news : news.filter((n) => n.category === filter);

  // A side panel occupies the full-width bottom bar's space when open.
  if (leftPanelOpen || rightPanel) return null;

  return (
    <div
      className={cn(
        "absolute bottom-0 left-0 right-0 z-20 transition-[height] duration-300",
        expanded ? "h-[300px]" : "h-9"
      )}
    >
      {!expanded ? (
        /* Collapsed: scrolling headline ticker */
        <button
          onClick={() => setExpanded(true)}
          aria-label="Open real estate news"
          className="w-full h-9 flex items-center gap-3 px-3 bg-[#161616]/95 backdrop-blur-sm border-t border-white/10 overflow-hidden text-left"
        >
          <div className="flex items-center gap-1.5 shrink-0">
            <Newspaper className="w-4 h-4 text-[#ca615f]" />
            <span className="hidden sm:inline text-[11px] font-bold text-white tracking-wide">
              NEWS
            </span>
          </div>
          <div className="flex-1 overflow-hidden">
            {loading ? (
              <span className="text-[11px] text-white/40">Loading headlines…</span>
            ) : news.length === 0 ? (
              <span className="text-[11px] text-white/40">No news available</span>
            ) : (
              <div className="flex w-max gap-10 animate-atlas-marquee">
                {[...news, ...news].map((item, i) => (
                  <span
                    key={`${item.id}-${i}`}
                    className="flex items-center gap-2 text-[11px] text-white/80 whitespace-nowrap"
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: CATEGORY_COLORS[item.category] }}
                    />
                    {item.title}
                    <span className="text-white/30">·</span>
                    <span className="text-white/40">{item.source}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="hidden sm:flex items-center gap-1 text-[9px] text-white/40">
              <span className="font-bold text-[#d4767a]">CESIUM</span>
              <span>&copy; OSM</span>
            </span>
            <ChevronUp className="w-4 h-4 text-white/60" />
          </div>
        </button>
      ) : (
        /* Expanded: header + horizontal cards */
        <div className="h-full flex flex-col">
          <div className="flex items-center justify-between px-4 h-9 shrink-0 bg-[#161616]/95 backdrop-blur-sm border-t border-white/10">
            <div className="flex items-center gap-2">
              <Newspaper className="w-4 h-4 text-[#ca615f]" />
              <span className="text-xs font-bold text-white">REAL ESTATE NEWS</span>
              <span className="text-[10px] text-white/50">
                {loading ? "..." : `${news.length} articles`}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-1 mr-2">
                <FilterChip label="All" active={filter === "all"} onClick={() => setFilter("all")} />
                <FilterChip label="Market" color={CATEGORY_COLORS.market} active={filter === "market"} onClick={() => setFilter("market")} />
                <FilterChip label="Development" color={CATEGORY_COLORS.development} active={filter === "development"} onClick={() => setFilter("development")} />
                <FilterChip label="Policy" color={CATEGORY_COLORS.policy} active={filter === "policy"} onClick={() => setFilter("policy")} />
                <FilterChip label="Finance" color={CATEGORY_COLORS.finance} active={filter === "finance"} onClick={() => setFilter("finance")} />
              </div>
              <button onClick={() => setExpanded(false)} aria-label="Collapse news" className="p-0.5">
                <ChevronDown className="w-4 h-4 text-white/60" />
              </button>
            </div>
          </div>

          <div className="bg-[#0a0a0a]/95 backdrop-blur-sm flex-1 overflow-x-auto overflow-y-hidden">
            <div className="flex gap-3 p-3 h-full">
              {loading ? (
                <div className="flex items-center justify-center w-full text-white/50 text-xs">Loading...</div>
              ) : filtered.length === 0 ? (
                <div className="flex items-center justify-center w-full text-white/50 text-xs">No news available</div>
              ) : filtered.map((item) => (
                <a
                  key={item.id}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-shrink-0 w-[280px] max-w-[85vw] bg-white/5 border border-white/10 rounded-lg p-3 flex flex-col hover:bg-white/10 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span
                      className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded text-white"
                      style={{ backgroundColor: CATEGORY_COLORS[item.category] }}
                    >
                      {item.category}
                    </span>
                    <div className="flex items-center gap-1 text-white/40">
                      <Clock className="w-3 h-3" />
                      <span className="text-[9px]">{item.timestamp}</span>
                    </div>
                  </div>
                  <h4 className="text-xs font-semibold text-white leading-tight mb-1 line-clamp-2">
                    {item.title}
                  </h4>
                  <p className="text-[10px] text-white/60 leading-relaxed flex-1 line-clamp-3">
                    {item.summary}
                  </p>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/10">
                    <span className="text-[9px] text-[#ca615f] font-medium">{item.source}</span>
                    <ExternalLink className="w-3 h-3 text-white/30 group-hover:text-[#ca615f] transition-colors" />
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterChip({
  label,
  color,
  active,
  onClick,
}: {
  label: string;
  color?: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        "text-[9px] font-medium px-2 py-0.5 rounded-full transition-colors",
        active
          ? "bg-white/20 text-white"
          : "text-white/40 hover:text-white/70"
      )}
      style={active && color ? { backgroundColor: color } : undefined}
    >
      {label}
    </button>
  );
}
