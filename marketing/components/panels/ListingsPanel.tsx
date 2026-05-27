"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Building2,
  RefreshCw,
  ExternalLink,
  MapPin,
  DollarSign,
  Ruler,
  Filter,
  X,
  ChevronDown,
} from "lucide-react";
import { useCesium } from "@/components/cesium/CesiumContext";
import type { BrokerageListing } from "@/types/cesium";
import { cn } from "@/lib/utils";

interface ListingsPanelProps {
  onClose: () => void;
}

const LISTING_TYPE_COLORS: Record<string, string> = {
  sale: "#27ae60",
  lease: "#2980b9",
  sale_or_lease: "#e67e22",
};

export default function ListingsPanel({ onClose }: ListingsPanelProps) {
  const { activeRegion, viewerRef } = useCesium();
  const [listings, setListings] = useState<BrokerageListing[]>([]);
  const [loading, setLoading] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [brokerageFilter, setBrokerageFilter] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);

  const fetchListings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/listings?region=${activeRegion}&limit=200`);
      if (!res.ok) throw new Error("Failed to fetch listings");
      const data = await res.json();
      setListings(data.listings);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load listings");
    } finally {
      setLoading(false);
    }
  }, [activeRegion]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  async function runScrape() {
    setScraping(true);
    setError(null);
    try {
      // Map region to state
      const regionStateMap: Record<string, string> = {
        dc: "DC",
        nyc: "NY",
        sullivan: "NY",
        westchester: "NY",
        ct: "CT",
        boston: "MA",
      };
      const state = regionStateMap[activeRegion] || "NY";
      const res = await fetch(
        `/api/listings/scrape?state=${state}&maxPages=2`
      );
      if (!res.ok) throw new Error("Scrape failed");
      const data = await res.json();

      // Store the scraped listings
      const allListings = data.results?.flatMap(
        (r: { listings: BrokerageListing[] }) => r.listings
      ) || [];
      if (allListings.length > 0) {
        await fetch("/api/listings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ listings: allListings }),
        });
      }

      // Refresh
      await fetchListings();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scrape failed");
    } finally {
      setScraping(false);
    }
  }

  async function flyToListing(listing: BrokerageListing) {
    if (!listing.lat || !listing.lng) return;
    const viewer = viewerRef.current;
    if (!viewer) return;

    const Cesium = await import("cesium");
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(listing.lng, listing.lat, 500),
      orientation: {
        heading: Cesium.Math.toRadians(0),
        pitch: Cesium.Math.toRadians(-45),
        roll: 0,
      },
      duration: 1.5,
    });
  }

  // Get unique brokerages for filter
  const brokerages = [...new Set(listings.map((l) => l.brokerageName))].sort();

  // Apply filters
  let filtered = listings;
  if (typeFilter !== "all") {
    filtered = filtered.filter((l) => l.listingType === typeFilter);
  }
  if (brokerageFilter !== "all") {
    filtered = filtered.filter((l) => l.brokerageName === brokerageFilter);
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2 bg-[#f0f0f0] border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-[#0088aa]" />
          <h3 className="text-sm font-bold text-gray-800">
            BROKERAGE LISTINGS
          </h3>
          <span className="text-[10px] text-gray-500 bg-gray-200 px-1.5 py-0.5 rounded">
            {total}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "p-1 rounded hover:bg-gray-300",
              showFilters && "bg-gray-300"
            )}
          >
            <Filter className="w-3.5 h-3.5 text-gray-600" />
          </button>
          <button
            onClick={runScrape}
            disabled={scraping}
            className="p-1 rounded hover:bg-gray-300 disabled:opacity-50"
            title="Scrape listings"
          >
            <RefreshCw
              className={cn(
                "w-3.5 h-3.5 text-gray-600",
                scraping && "animate-spin"
              )}
            />
          </button>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-300">
            <X className="w-3.5 h-3.5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="px-3 py-2 bg-gray-50 border-b space-y-2">
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-[9px] text-gray-500 block mb-0.5">
                Listing Type
              </label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full text-[10px] border rounded px-1.5 py-1"
              >
                <option value="all">All Types</option>
                <option value="sale">For Sale</option>
                <option value="lease">For Lease</option>
                <option value="sale_or_lease">Sale or Lease</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="text-[9px] text-gray-500 block mb-0.5">
                Brokerage
              </label>
              <select
                value={brokerageFilter}
                onChange={(e) => setBrokerageFilter(e.target.value)}
                className="w-full text-[10px] border rounded px-1.5 py-1"
              >
                <option value="all">All Brokerages</option>
                {brokerages.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Status */}
      {scraping && (
        <div className="px-3 py-2 bg-blue-50 border-b text-[10px] text-blue-700 flex items-center gap-2">
          <RefreshCw className="w-3 h-3 animate-spin" />
          Scraping brokerage listings...
        </div>
      )}
      {error && (
        <div className="px-3 py-2 bg-red-50 border-b text-[10px] text-red-700">
          {error}
        </div>
      )}

      {/* Listing cards */}
      <div className="flex-1 overflow-y-auto">
        {loading && listings.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <RefreshCw className="w-5 h-5 animate-spin text-gray-400 mx-auto mb-2" />
              <p className="text-xs text-gray-500">Loading listings...</p>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 px-4 text-center">
            <Building2 className="w-6 h-6 text-gray-300 mb-2" />
            <p className="text-xs text-gray-500 mb-1">No listings yet</p>
            <p className="text-[10px] text-gray-400 mb-3">
              Click the refresh button to scrape commercial brokerage websites
              for the current region.
            </p>
            <button
              onClick={runScrape}
              disabled={scraping}
              className="text-[10px] font-medium text-[#0088aa] hover:text-[#006b88] disabled:opacity-50"
            >
              Scrape Now
            </button>
          </div>
        ) : (
          filtered.map((listing) => (
            <div
              key={listing.id}
              className="px-3 py-2 border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
              onClick={() => flyToListing(listing)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span
                      className="text-[8px] font-bold uppercase px-1 py-0.5 rounded text-white"
                      style={{
                        backgroundColor:
                          LISTING_TYPE_COLORS[listing.listingType] || "#666",
                      }}
                    >
                      {listing.listingType === "sale_or_lease"
                        ? "SALE/LEASE"
                        : listing.listingType.toUpperCase()}
                    </span>
                    <span className="text-[9px] text-gray-400">
                      {listing.propertyType}
                    </span>
                  </div>
                  <p className="text-[11px] font-semibold text-gray-800 truncate">
                    {listing.address}
                  </p>
                  {(listing.city || listing.state) && (
                    <p className="text-[10px] text-gray-500 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {[listing.city, listing.state, listing.zip]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-1">
                    {listing.price && (
                      <span className="text-[10px] font-semibold text-green-700 flex items-center gap-0.5">
                        <DollarSign className="w-3 h-3" />
                        {listing.price.toLocaleString()}
                      </span>
                    )}
                    {listing.squareFeet && (
                      <span className="text-[10px] text-gray-500 flex items-center gap-0.5">
                        <Ruler className="w-3 h-3" />
                        {listing.squareFeet.toLocaleString()} SF
                      </span>
                    )}
                    {listing.pricePerSF && (
                      <span className="text-[10px] text-gray-500">
                        ${listing.pricePerSF.toFixed(2)}/SF
                      </span>
                    )}
                  </div>
                </div>
                <a
                  href={listing.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="p-1 text-gray-400 hover:text-[#0088aa]"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-[9px] text-[#0088aa] font-medium">
                  {listing.brokerageName}
                </span>
                {listing.broker && (
                  <span className="text-[9px] text-gray-400">
                    {listing.broker}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-1.5 bg-gray-50 border-t text-[9px] text-gray-400 flex items-center justify-between">
        <span>
          Showing {filtered.length} of {total} listings
        </span>
        <span>
          DC &middot; NY &middot; CT &middot; MA
        </span>
      </div>
    </div>
  );
}
