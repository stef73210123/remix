"use client";

import { useCesium } from "@/components/cesium/CesiumContext";
import LayersPanel from "./LayersPanel";
import FiltersPanel from "./FiltersPanel";
import GeoFilterBuilder from "./GeoFilterBuilder";
import ComparisonPanel from "./ComparisonPanel";
import ListingsPanel from "./ListingsPanel";

export default function RightPanel() {
  const { rightPanel, setRightPanel } = useCesium();

  if (!rightPanel) return null;

  return (
    <div className="absolute right-0 top-0 bottom-0 z-30 w-[300px] bg-white shadow-xl border-l border-gray-200 overflow-hidden">
      {rightPanel === "layers" && (
        <LayersPanel onClose={() => setRightPanel(null)} />
      )}
      {rightPanel === "filters" && (
        <FiltersPanel onClose={() => setRightPanel(null)} />
      )}
      {rightPanel === "geo-query" && (
        <GeoFilterBuilder onClose={() => setRightPanel(null)} />
      )}
      {rightPanel === "comparison" && (
        <ComparisonPanel onClose={() => setRightPanel(null)} />
      )}
      {rightPanel === "listings" && (
        <ListingsPanel onClose={() => setRightPanel(null)} />
      )}
    </div>
  );
}
