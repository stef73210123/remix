"use client";

import { useState } from "react";
import { Map } from "lucide-react";
import { useCesium, BasemapMode } from "@/components/cesium/CesiumContext";

const BASEMAP_OPTIONS: { mode: BasemapMode; label: string; color: string }[] = [
  { mode: "satellite", label: "Satellite", color: "#1a3a2a" },
  { mode: "osm", label: "OSM", color: "#e8e4d8" },
  { mode: "dark", label: "Dark", color: "#1a1a2e" },
  { mode: "light", label: "Light", color: "#f0f0f0" },
  { mode: "terrain", label: "Terrain", color: "#c4b99a" },
  { mode: "hybrid", label: "Hybrid", color: "#2a4a3a" },
];

export default function BasemapSelector() {
  const { basemapMode, setBasemapMode } = useCesium();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      {open && (
        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-[#1a2332]/90 backdrop-blur-sm rounded-lg border border-white/10 p-3 w-[200px]">
          <div className="grid grid-cols-3 gap-2">
            {BASEMAP_OPTIONS.map(({ mode, label, color }) => (
              <button
                key={mode}
                onClick={() => {
                  setBasemapMode(mode);
                  setOpen(false);
                }}
                className="flex flex-col items-center gap-1 group"
              >
                <div
                  className={`w-12 h-12 rounded-md border-2 transition-colors ${
                    basemapMode === mode
                      ? "border-blue-400"
                      : "border-white/20 group-hover:border-white/40"
                  }`}
                  style={{ backgroundColor: color }}
                />
                <span className="text-[10px] text-white/80 leading-tight">
                  {label}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((prev) => !prev)}
        className="flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-md hover:bg-white/10 transition-colors text-white"
        title="Basemap"
      >
        <Map className="w-4 h-4" />
        <span className="text-[9px] font-medium tracking-wider">BASEMAP</span>
      </button>
    </div>
  );
}
