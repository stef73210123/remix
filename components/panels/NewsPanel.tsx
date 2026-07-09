"use client";

import { useState, useEffect } from "react";
import {
  X,
  ExternalLink,
  TrendingUp,
  Building2,
  Landmark,
  DollarSign,
} from "lucide-react";
import { useCesium } from "@/components/cesium/CesiumContext";
import { cn } from "@/lib/utils";
import type { NewsItem } from "@/types/cesium";

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

// Category badge → icon (replaces the spelled-out "market/policy" label in the ticker)
const CATEGORY_ICONS: Record<NewsItem["category"], React.ElementType> = {
  market: TrendingUp,
  development: Building2,
  policy: Landmark,
  finance: DollarSign,
};

export default function NewsPanel() {
  const {
    leftPanelOpen,
    rightPanel,
    activeRegion,
    newsItems: news,
    setNewsItems: setNews,
    selectedNews: lightbox,
    setSelectedNews: setLightbox,
  } = useCesium();
  const [loading, setLoading] = useState(true);
  const [tickerIndex, setTickerIndex] = useState(0);

  // News localized to the metro of the active region (like the listings).
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    async function fetchNews() {
      try {
        const res = await fetch(`/api/news?limit=20&region=${encodeURIComponent(activeRegion)}`);
        if (!res.ok) throw new Error("Failed to fetch news");
        const data = await res.json();
        if (cancelled) return;
        const items: NewsItem[] = data.items.map(
          (item: { id: string; title: string; link: string; description: string; pubDate: string; source: string; category: string; lat?: number | null; lng?: number | null; location?: string | null }) => ({
            id: item.id,
            title: item.title,
            source: item.source,
            summary: item.description,
            url: item.link,
            timestamp: getRelativeTime(item.pubDate),
            category: VALID_CATEGORIES.has(item.category as NewsItem["category"])
              ? (item.category as NewsItem["category"])
              : "market",
            lat: item.lat ?? null,
            lng: item.lng ?? null,
            location: item.location ?? null,
          })
        );
        setNews(items);
        setTickerIndex(0);
      } catch {
        if (!cancelled) { setNews(FALLBACK_NEWS); setTickerIndex(0); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchNews();
    return () => { cancelled = true; };
    // setNews is a stable context setter; only re-fetch when the region changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRegion]);

  // Rotate the ticker headline every ~5s (paused while the lightbox is open).
  useEffect(() => {
    if (lightbox || news.length <= 1) return;
    const t = setInterval(() => {
      setTickerIndex((i) => (i + 1) % news.length);
    }, 5000);
    return () => clearInterval(t);
  }, [lightbox, news.length]);

  // Close the lightbox on Escape.
  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // setLightbox is a stable context setter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightbox]);

  const current = news.length ? news[tickerIndex % news.length] : null;

  return (
    <>
      {/* The right panel takes the whole bottom bar. A selected property is a
          full-width bottom sheet on phones (hide), but a left-side card on
          tablet/desktop — offset the ticker to sit beside it there. */}
      {!rightPanel && (
        <div
          className={cn(
            "absolute bottom-0 right-0 z-20 h-20",
            leftPanelOpen ? "left-0 max-md:hidden md:left-[390px]" : "left-0"
          )}
        >
          <button
            onClick={() => current && setLightbox(current)}
            aria-label="Open this headline"
            disabled={!current}
            className="w-full h-20 flex items-center gap-3 px-3 bg-[#161616]/95 backdrop-blur-sm border-t border-white/10 overflow-hidden text-left disabled:cursor-default"
          >
            <div className="flex-1 relative overflow-hidden self-stretch">
              {loading ? (
                <span className="absolute inset-0 flex items-center text-xs text-white/40">Loading headlines…</span>
              ) : !current ? (
                <span className="absolute inset-0 flex items-center text-xs text-white/40">No local headlines</span>
              ) : (() => {
                const CatIcon = CATEGORY_ICONS[current.category];
                return (
                  <div
                    key={tickerIndex}
                    className="absolute inset-0 flex items-center gap-3 animate-atlas-ticker-in lg:justify-center"
                  >
                    {/* Topic icon — the only icon on the bar, category label ABOVE it */}
                    <div className="shrink-0 flex flex-col items-center gap-1 w-12">
                      <span
                        className="text-[8px] font-bold uppercase tracking-wide leading-none"
                        style={{ color: CATEGORY_COLORS[current.category] }}
                      >
                        {current.category}
                      </span>
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: CATEGORY_COLORS[current.category] + "22" }}
                      >
                        <CatIcon className="w-4 h-4" style={{ color: CATEGORY_COLORS[current.category] }} />
                      </div>
                    </div>
                    <div className="min-w-0 flex flex-col justify-center lg:flex-none lg:max-w-[680px]">
                      <div className="text-[13px] sm:text-sm text-white font-semibold leading-snug line-clamp-2">
                        {current.title}
                      </div>
                      <div className="text-[10px] text-white/45 truncate mt-0.5">
                        {current.source} &middot; {current.timestamp}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
            <span className="hidden md:flex items-center gap-1 text-[8px] text-white/30 shrink-0 self-center">
              <span className="font-bold text-[#d4767a]">CESIUM</span>
              <span>&copy; OSM</span>
            </span>
          </button>
        </div>
      )}

      {/* Lightbox — the tapped article over the whole app, X to return. */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => setLightbox(null)}
        >
          <div
            className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto bg-white text-gray-900 rounded-2xl shadow-2xl select-text"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setLightbox(null)}
              aria-label="Close"
              className="absolute top-3 right-3 p-1.5 rounded-full bg-black/5 hover:bg-black/10 text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="p-6">
              <div className="flex items-center gap-2 mb-3">
                <span
                  className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded text-white"
                  style={{ backgroundColor: CATEGORY_COLORS[lightbox.category] }}
                >
                  {lightbox.category}
                </span>
                <span className="text-xs text-gray-500">
                  {lightbox.source} &middot; {lightbox.timestamp}
                  {lightbox.location ? ` · ${lightbox.location}` : ""}
                </span>
              </div>

              <h2 className="text-xl font-bold leading-tight mb-3 pr-6 normal-case tracking-normal">
                {lightbox.title}
              </h2>

              {lightbox.summary && (
                <p className="text-sm text-gray-600 leading-relaxed mb-5">
                  {lightbox.summary}
                </p>
              )}

              {lightbox.url && lightbox.url !== "#" && (
                <a
                  href={lightbox.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#ca615f] hover:text-[#d4767a]"
                >
                  Read full article
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
