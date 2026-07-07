"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Search, X, Layers, Filter, MapPin, Star, Clock, Building2, Navigation, GitCompare } from "lucide-react";
import { useCesium } from "@/components/cesium/CesiumContext";
import { MOCK_PROPERTIES } from "@/lib/data/properties";
import { cn } from "@/lib/utils";
import { getFavorites, getRecents } from "@/lib/favorites";
import { getRegion, REGIONS } from "@/lib/data/regions";

interface GeocodingResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type: string;
  address?: {
    house_number?: string;
    road?: string;
    city?: string;
    state?: string;
    postcode?: string;
  };
}

export default function SearchBar() {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [geocodeResults, setGeocodeResults] = useState<GeocodingResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const {
    setSelectedProperty,
    setLeftPanelOpen,
    flyToProperty,
    flyToAddressOverhead,
    viewerRef,
    rightPanel,
    setRightPanel,
    activeRegion,
    setActiveRegion,
    comparisonProperties,
  } = useCesium();
  const region = getRegion(activeRegion);

  // Fetch API listings on mount
  const [apiListings, setApiListings] = useState<any[]>([]);
  useEffect(() => {
    fetch("/api/listings?mapOnly=true&limit=100")
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data) => setApiListings(Array.isArray(data) ? data : data.listings ?? []))
      .catch((err) => console.warn("Failed to fetch API listings:", err));
  }, []);

  // Combined properties: API listings + MOCK fallback, deduplicated by address
  const allProperties = (() => {
    const seen = new Set<string>();
    const combined: any[] = [];
    for (const p of apiListings) {
      const key = p.address?.toLowerCase();
      if (key && !seen.has(key)) {
        seen.add(key);
        combined.push(p);
      }
    }
    for (const p of MOCK_PROPERTIES) {
      const key = p.address?.toLowerCase();
      if (key && !seen.has(key)) {
        seen.add(key);
        combined.push(p);
      }
    }
    return combined;
  })();

  // Typeahead geocoding using Nominatim
  const geocode = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 3) {
      setGeocodeResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const params = new URLSearchParams({
        q: searchQuery,
        format: "json",
        addressdetails: "1",
        limit: "8",
        countrycodes: "us",
        viewbox: region.nominatimViewbox,
        bounded: "0",
      });
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?${params}`,
        {
          headers: { "User-Agent": "CesiumRealEstate/1.0" },
        }
      );
      if (res.ok) {
        const data: GeocodingResult[] = await res.json();
        setGeocodeResults(data);
      }
    } catch (e) {
      console.warn("Geocoding failed:", e);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      geocode(query);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, geocode]);

  // Match local properties too (API listings + MOCK fallback)
  const localResults = query.trim()
    ? allProperties.filter(
        (p) =>
          p.address?.toLowerCase().includes(query.toLowerCase()) ||
          (p.neighborhood && p.neighborhood.toLowerCase().includes(query.toLowerCase()))
      ).slice(0, 4)
    : [];

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsOpen(false);
        setQuery("");
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  function selectProperty(propertyId: string) {
    const property = apiListings.find((p) => p.id === propertyId)
      || MOCK_PROPERTIES.find((p) => p.id === propertyId);
    if (property) {
      setSelectedProperty(property);
      setLeftPanelOpen(true);
      flyToProperty(property);
    }
    setIsOpen(false);
    setQuery("");
  }

  function flyToGeocode(result: GeocodingResult) {
    // Address lookups land on a 2D overhead, north-up view of the location.
    flyToAddressOverhead(parseFloat(result.lon), parseFloat(result.lat));
    setIsOpen(false);
    setQuery("");
  }

  // Preloaded location jump-tos (the map's regions), flown to from the dropdown.
  async function jumpToRegion(regionId: string) {
    setActiveRegion(regionId);
    const r = getRegion(regionId);
    setIsOpen(false);
    setQuery("");
    const viewer = viewerRef.current;
    if (!viewer) return;
    const Cesium = await import("cesium");
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(
        r.defaultCamera.lng,
        r.defaultCamera.lat,
        r.defaultCamera.height
      ),
      orientation: {
        heading: Cesium.Math.toRadians(r.defaultCamera.heading),
        pitch: Cesium.Math.toRadians(r.defaultCamera.pitch),
        roll: 0,
      },
      duration: 2,
    });
  }

  return (
    <div className="absolute top-3 right-3 z-40 flex flex-nowrap items-start sm:items-center justify-end gap-2">
      {/* Search input */}
      <div className="relative shrink-0">
        <div className="flex items-center bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
          <Search className="w-4 h-4 text-gray-400 ml-2.5 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            placeholder={region.searchPlaceholder}
            // 16px on mobile so iOS Safari doesn't auto-zoom the page on focus;
            // shrink back to 12px from sm+ where zoom-on-focus isn't a concern.
            className="w-32 max-[350px]:w-20 sm:w-[260px] px-2 py-2 text-base sm:text-xs text-gray-800 placeholder-gray-400 outline-none"
          />
          {query && (
            <button
              onClick={() => {
                setQuery("");
                setIsOpen(false);
                setGeocodeResults([]);
              }}
              className="pr-2"
            >
              <X className="w-3.5 h-3.5 text-gray-400" />
            </button>
          )}
        </div>

        {/* Dropdown */}
        {isOpen && (
          <div className="absolute top-full right-0 mt-1 w-[280px] max-w-[calc(100vw-1.5rem)] bg-white rounded-lg shadow-xl border border-gray-200 max-h-72 overflow-y-auto">
            {/* Preloaded location jump-tos */}
            {!query.trim() && (
              <>
                <div className="px-3 py-1 bg-gray-50 text-[9px] font-bold text-gray-500 uppercase flex items-center gap-1">
                  <Navigation className="w-3 h-3" /> Jump to
                </div>
                {REGIONS.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => jumpToRegion(r.id)}
                    className={cn(
                      "w-full px-3 py-2 text-left hover:bg-blue-50 border-b border-gray-100 flex items-center gap-2",
                      r.id === activeRegion && "bg-blue-50/60"
                    )}
                  >
                    <MapPin className="w-3.5 h-3.5 text-[#ca615f] shrink-0" />
                    <span className="text-xs font-medium text-gray-800">{r.name}</span>
                    {r.id === activeRegion && (
                      <span className="ml-auto text-[9px] font-bold text-[#ca615f] uppercase">Current</span>
                    )}
                  </button>
                ))}
              </>
            )}

            {/* Favorites & Recents when no query */}
            {!query.trim() && (() => {
              const favIds = getFavorites();
              const recentIds = getRecents();
              const findById = (id: string) => apiListings.find((p) => p.id === id) || MOCK_PROPERTIES.find((p) => p.id === id);
              const favProps = favIds.map(findById).filter(Boolean);
              const recentProps = recentIds
                .filter((id) => !favIds.includes(id))
                .map(findById)
                .filter(Boolean)
                .slice(0, 4);
              if (favProps.length === 0 && recentProps.length === 0) return null;
              return (
                <>
                  {favProps.length > 0 && (
                    <>
                      <div className="px-3 py-1 bg-yellow-50 text-[9px] font-bold text-yellow-700 uppercase flex items-center gap-1">
                        <Star className="w-3 h-3" /> Favorites
                      </div>
                      {favProps.map((p) => p && (
                        <button
                          key={p.id}
                          onClick={() => selectProperty(p.id)}
                          className="w-full px-3 py-2 text-left hover:bg-blue-50 border-b border-gray-100"
                        >
                          <div className="text-xs font-medium text-gray-800">{p.address}</div>
                          <div className="text-[10px] text-gray-500">{p.propertyUse} &middot; {p.neighborhood}</div>
                        </button>
                      ))}
                    </>
                  )}
                  {recentProps.length > 0 && (
                    <>
                      <div className="px-3 py-1 bg-gray-50 text-[9px] font-bold text-gray-500 uppercase flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Recent
                      </div>
                      {recentProps.map((p) => p && (
                        <button
                          key={p.id}
                          onClick={() => selectProperty(p.id)}
                          className="w-full px-3 py-2 text-left hover:bg-blue-50 border-b border-gray-100"
                        >
                          <div className="text-xs font-medium text-gray-800">{p.address}</div>
                          <div className="text-[10px] text-gray-500">{p.propertyUse} &middot; {p.neighborhood}</div>
                        </button>
                      ))}
                    </>
                  )}
                </>
              );
            })()}

            {/* Local property matches */}
            {localResults.length > 0 && (
              <>
                <div className="px-3 py-1 bg-gray-50 text-[9px] font-bold text-gray-500 uppercase">
                  Properties
                </div>
                {localResults.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => selectProperty(p.id)}
                    className="w-full px-3 py-2 text-left hover:bg-blue-50 border-b border-gray-100"
                  >
                    <div className="text-xs font-medium text-gray-800">
                      {p.address}
                    </div>
                    <div className="text-[10px] text-gray-500">
                      {p.propertyUse} &middot; {p.neighborhood}
                    </div>
                  </button>
                ))}
              </>
            )}

            {/* Geocoded results */}
            {geocodeResults.length > 0 && (
              <>
                <div className="px-3 py-1 bg-gray-50 text-[9px] font-bold text-gray-500 uppercase">
                  Places
                </div>
                {geocodeResults.map((r) => (
                  <button
                    key={r.place_id}
                    onClick={() => flyToGeocode(r)}
                    className="w-full px-3 py-2 text-left hover:bg-blue-50 border-b border-gray-100"
                  >
                    <div className="text-xs font-medium text-gray-800 line-clamp-1">
                      {r.display_name}
                    </div>
                    <div className="text-[10px] text-gray-500">
                      {r.type} &middot; {parseFloat(r.lat).toFixed(4)},{" "}
                      {parseFloat(r.lon).toFixed(4)}
                    </div>
                  </button>
                ))}
              </>
            )}

            {isSearching && (
              <div className="px-3 py-3 text-xs text-gray-400 text-center">
                Searching...
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-1.5">
        <button
          onClick={() =>
            setRightPanel(rightPanel === "filters" ? null : "filters")
          }
          className={cn(
            "p-2 rounded-lg shadow-lg border transition-colors",
            rightPanel === "filters"
              ? "bg-[#ca615f] text-white border-[#ca615f]"
              : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
          )}
          title="Filters"
        >
          <Filter className="w-4 h-4" />
        </button>
        <button
          onClick={() =>
            setRightPanel(rightPanel === "layers" ? null : "layers")
          }
          className={cn(
            "p-2 rounded-lg shadow-lg border transition-colors",
            rightPanel === "layers"
              ? "bg-[#ca615f] text-white border-[#ca615f]"
              : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
          )}
          title="Layers"
        >
          <Layers className="w-4 h-4" />
        </button>
        <button
          onClick={() =>
            setRightPanel(rightPanel === "geo-query" ? null : "geo-query")
          }
          className={cn(
            "p-2 rounded-lg shadow-lg border transition-colors",
            rightPanel === "geo-query"
              ? "bg-[#ca615f] text-white border-[#ca615f]"
              : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
          )}
          title="Geo Query Builder"
        >
          <MapPin className="w-4 h-4" />
        </button>
        <button
          onClick={() =>
            setRightPanel(rightPanel === "listings" ? null : "listings")
          }
          className={cn(
            "p-2 rounded-lg shadow-lg border transition-colors",
            rightPanel === "listings"
              ? "bg-[#ca615f] text-white border-[#ca615f]"
              : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
          )}
          title="Brokerage Listings"
        >
          <Building2 className="w-4 h-4" />
        </button>
        {comparisonProperties.length > 0 && (
          <button
            onClick={() =>
              setRightPanel(rightPanel === "comparison" ? null : "comparison")
            }
            className={cn(
              "relative p-2 rounded-lg shadow-lg border transition-colors",
              rightPanel === "comparison"
                ? "bg-[#ca615f] text-white border-[#ca615f]"
                : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
            )}
            title={`Compare (${comparisonProperties.length})`}
          >
            <GitCompare className="w-4 h-4" />
            <span className="absolute -top-1 -right-1 min-w-[15px] h-[15px] px-0.5 rounded-full bg-[#ca615f] text-white text-[9px] font-bold leading-[15px] text-center">
              {comparisonProperties.length}
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
