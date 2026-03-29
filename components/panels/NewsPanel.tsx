"use client";

import { useState } from "react";
import { ChevronUp, ChevronDown, Newspaper, ExternalLink, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface NewsItem {
  id: string;
  title: string;
  source: string;
  summary: string;
  url: string;
  timestamp: string;
  category: "market" | "development" | "policy" | "finance";
}

const MOCK_NEWS: NewsItem[] = [
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
    title: "Connecticut Multifamily Cap Rates Compress to 5.2%",
    source: "Real Capital Analytics",
    summary: "Strong demand for suburban multifamily assets in Fairfield County pushes cap rates to post-pandemic lows.",
    url: "#",
    timestamp: "8h ago",
    category: "finance",
  },
  {
    id: "5",
    title: "MassGIS Releases Updated Statewide Parcel Data for 2026",
    source: "Mass.gov",
    summary: "The Commonwealth of Massachusetts has published its annual Level 3 parcel dataset covering all 351 municipalities.",
    url: "#",
    timestamp: "12h ago",
    category: "policy",
  },
  {
    id: "6",
    title: "Hudson Valley Industrial Market Attracts NYC Investors",
    source: "Real Estate Weekly",
    summary: "Warehouse and distribution properties in Dutchess and Orange counties see 35% YoY transaction volume increase.",
    url: "#",
    timestamp: "1d ago",
    category: "market",
  },
  {
    id: "7",
    title: "Federal Interest Rate Decision Impacts CRE Lending",
    source: "CBRE Research",
    summary: "Latest Fed decision to hold rates steady provides cautious optimism for commercial real estate refinancing activity.",
    url: "#",
    timestamp: "1d ago",
    category: "finance",
  },
  {
    id: "8",
    title: "New York State Expands Wetland Buffer Requirements",
    source: "NY DEC",
    summary: "Updated regulations increase required setbacks from freshwater wetlands, impacting development in rural counties.",
    url: "#",
    timestamp: "2d ago",
    category: "policy",
  },
];

const CATEGORY_COLORS: Record<NewsItem["category"], string> = {
  market: "#2980b9",
  development: "#27ae60",
  policy: "#8e44ad",
  finance: "#e67e22",
};

export default function NewsPanel() {
  const [expanded, setExpanded] = useState(false);
  const [filter, setFilter] = useState<NewsItem["category"] | "all">("all");

  const filtered =
    filter === "all" ? MOCK_NEWS : MOCK_NEWS.filter((n) => n.category === filter);

  return (
    <div
      className={cn(
        "absolute bottom-12 left-0 right-0 z-20 transition-all duration-300",
        expanded ? "h-[280px]" : "h-[52px]"
      )}
    >
      {/* Header bar */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-2 bg-[#1a2332]/95 backdrop-blur-sm border-t border-white/10"
      >
        <div className="flex items-center gap-2">
          <Newspaper className="w-4 h-4 text-[#0088aa]" />
          <span className="text-xs font-bold text-white">
            REAL ESTATE NEWS
          </span>
          <span className="text-[10px] text-white/50">
            {MOCK_NEWS.length} articles
          </span>
        </div>
        <div className="flex items-center gap-3">
          {/* Category filters */}
          {expanded && (
            <div className="flex items-center gap-1 mr-2">
              <FilterChip
                label="All"
                active={filter === "all"}
                onClick={() => setFilter("all")}
              />
              <FilterChip
                label="Market"
                color={CATEGORY_COLORS.market}
                active={filter === "market"}
                onClick={() => setFilter("market")}
              />
              <FilterChip
                label="Development"
                color={CATEGORY_COLORS.development}
                active={filter === "development"}
                onClick={() => setFilter("development")}
              />
              <FilterChip
                label="Policy"
                color={CATEGORY_COLORS.policy}
                active={filter === "policy"}
                onClick={() => setFilter("policy")}
              />
              <FilterChip
                label="Finance"
                color={CATEGORY_COLORS.finance}
                active={filter === "finance"}
                onClick={() => setFilter("finance")}
              />
            </div>
          )}
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-white/60" />
          ) : (
            <ChevronUp className="w-4 h-4 text-white/60" />
          )}
        </div>
      </button>

      {/* News content - horizontal scrollable cards */}
      {expanded && (
        <div className="bg-[#111b27]/95 backdrop-blur-sm h-[calc(100%-36px)] overflow-x-auto overflow-y-hidden">
          <div className="flex gap-3 p-3 h-full">
            {filtered.map((item) => (
              <article
                key={item.id}
                className="flex-shrink-0 w-[280px] bg-white/5 border border-white/10 rounded-lg p-3 flex flex-col hover:bg-white/10 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span
                    className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded text-white"
                    style={{
                      backgroundColor: CATEGORY_COLORS[item.category],
                    }}
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
                  <span className="text-[9px] text-[#0088aa] font-medium">
                    {item.source}
                  </span>
                  <ExternalLink className="w-3 h-3 text-white/30 group-hover:text-[#0088aa] transition-colors" />
                </div>
              </article>
            ))}
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
