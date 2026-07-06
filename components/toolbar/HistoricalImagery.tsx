"use client";

import { useState, useRef, useCallback } from "react";
import { useCesium } from "@/components/cesium/CesiumContext";
import { History } from "lucide-react";

const AVAILABLE_YEARS = [
  2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025,
] as const;

// Esri World Imagery Wayback release dates (approximate first release per year)
const WAYBACK_RELEASE_MAP: Record<number, string> = {
  2014: "10",
  2015: "14",
  2016: "18",
  2017: "22",
  2018: "26",
  2019: "30",
  2020: "34",
  2021: "38",
  2022: "42",
  2023: "46",
  2024: "50",
  2025: "54",
};

function getWaybackUrl(year: number): string {
  const release = WAYBACK_RELEASE_MAP[year] ?? "54";
  return `https://wayback.maptiles.arcgis.com/arcgis/rest/services/World_Imagery/WMTS/1.0.0/default028mm/MapServer/tile/{z}/{y}/{x}?date=${release}`;
}

export default function HistoricalImagery() {
  const { viewerRef } = useCesium();
  const [active, setActive] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number>(2023);
  const layerRef = useRef<any>(null);

  const removeLayer = useCallback(() => {
    const viewer = viewerRef.current;
    if (!viewer || !layerRef.current) return;
    try {
      viewer.imageryLayers.remove(layerRef.current, true);
    } catch {
      // layer may already be removed
    }
    layerRef.current = null;
  }, [viewerRef]);

  const applyLayer = useCallback(
    async (year: number) => {
      const viewer = viewerRef.current;
      if (!viewer) return;

      // Remove any existing historical layer first
      removeLayer();

      // Cesium is an ES module here — window.Cesium is never set (that was the
      // bug that made the time slider a no-op). Import it directly.
      const Cesium = await import("cesium");
      if (viewer.isDestroyed?.()) return;

      const provider = new Cesium.UrlTemplateImageryProvider({
        url: getWaybackUrl(year),
        maximumLevel: 19,
        credit: new Cesium.Credit("Esri World Imagery Wayback"),
      });

      // Add above the base imagery (and hybrid road/label overlays) so the
      // historical aerial is what shows for the selected year.
      layerRef.current = viewer.imageryLayers.addImageryProvider(provider);
    },
    [viewerRef, removeLayer]
  );

  const handleToggle = useCallback(() => {
    if (active) {
      removeLayer();
      setActive(false);
    } else {
      applyLayer(selectedYear);
      setActive(true);
    }
  }, [active, selectedYear, applyLayer, removeLayer]);

  const handleYearChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const year = AVAILABLE_YEARS[parseInt(e.target.value, 10)];
      setSelectedYear(year);
      if (active) {
        applyLayer(year);
      }
    },
    [active, applyLayer]
  );

  const sliderIndex = AVAILABLE_YEARS.indexOf(selectedYear as any);

  return (
    <div className="hidden xl:block absolute top-3 left-1/2 -translate-x-1/2 z-30">
      <div className="bg-[#161616]/90 backdrop-blur-sm rounded-lg shadow-lg border border-white/10 px-3 py-2">
        {/* Header row with toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleToggle}
            className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-colors ${
              active
                ? "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30"
                : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-gray-300"
            }`}
          >
            <History className="w-3.5 h-3.5" />
            {active ? `HISTORICAL: ${selectedYear}` : "CURRENT"}
          </button>
        </div>

        {/* Slider (always visible for quick access) */}
        <div className="mt-2 flex items-center gap-2 min-w-[220px]">
          <span className="text-[10px] text-gray-500 tabular-nums">
            {AVAILABLE_YEARS[0]}
          </span>
          <input
            type="range"
            min={0}
            max={AVAILABLE_YEARS.length - 1}
            step={1}
            value={sliderIndex >= 0 ? sliderIndex : 0}
            onChange={handleYearChange}
            className="flex-1 h-1 accent-amber-500 cursor-pointer"
          />
          <span className="text-[10px] text-gray-500 tabular-nums">
            {AVAILABLE_YEARS[AVAILABLE_YEARS.length - 1]}
          </span>
        </div>
      </div>
    </div>
  );
}
