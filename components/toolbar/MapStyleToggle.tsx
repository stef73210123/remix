"use client";

import { useCesium, BasemapMode } from "@/components/cesium/CesiumContext";
import { Map, Building2, Footprints, Ban } from "lucide-react";
import { cn } from "@/lib/utils";

// Basemaps cycle on each click of the main button.
const BASEMAP_CYCLE: { mode: BasemapMode; label: string }[] = [
  { mode: "satellite", label: "SATELLITE" },
  { mode: "osm", label: "OSM" },
  { mode: "dark", label: "DARK" },
  { mode: "light", label: "LIGHT" },
  { mode: "terrain", label: "TERRAIN" },
  { mode: "hybrid", label: "HYBRID" },
];

type BuildingMode = "osm" | "google" | "footprints" | "off";

/**
 * Combined map-appearance control (replaces the old bottom button strip):
 * a single button that cycles the basemap, plus a small 3D sub-toggle that
 * cycles the building display. Detailed layers live in the Layers panel.
 */
export default function MapStyleToggle() {
  const {
    basemapMode,
    setBasemapMode,
    showBuildings,
    setShowBuildings,
    buildingSource,
    setBuildingSource,
    showOsmFootprints,
    setShowOsmFootprints,
    newsExpanded,
  } = useCesium();

  const basemapLabel =
    BASEMAP_CYCLE.find((b) => b.mode === basemapMode)?.label ?? "SATELLITE";

  const cycleBasemap = () => {
    const idx = BASEMAP_CYCLE.findIndex((b) => b.mode === basemapMode);
    const next = BASEMAP_CYCLE[(idx + 1) % BASEMAP_CYCLE.length];
    setBasemapMode(next.mode);
  };

  const buildingMode: BuildingMode = showOsmFootprints
    ? "footprints"
    : !showBuildings
      ? "off"
      : buildingSource === "google"
        ? "google"
        : "osm";

  const cycle3D = () => {
    switch (buildingMode) {
      case "osm":
        setShowOsmFootprints(false);
        setShowBuildings(true);
        setBuildingSource("google");
        break;
      case "google":
        setShowBuildings(false);
        setBuildingSource("osm");
        setShowOsmFootprints(true);
        break;
      case "footprints":
        setShowOsmFootprints(false);
        setShowBuildings(false);
        break;
      default:
        setShowOsmFootprints(false);
        setBuildingSource("osm");
        setShowBuildings(true);
        break;
    }
  };

  const buildingLabel: Record<BuildingMode, string> = {
    osm: "3D OSM",
    google: "3D GOOGLE",
    footprints: "FOOTPRINTS",
    off: "3D OFF",
  };
  const BuildingIcon =
    buildingMode === "footprints" ? Footprints : buildingMode === "off" ? Ban : Building2;

  return (
    <div
      className={cn(
        "absolute left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 bg-[#161616]/90 backdrop-blur-sm rounded-lg px-2 py-1.5 shadow-lg border border-white/10 transition-[bottom] duration-300",
        newsExpanded ? "bottom-[312px]" : "bottom-[72px]"
      )}
    >
      <button
        onClick={cycleBasemap}
        title="Cycle basemap"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-white/80 hover:text-white hover:bg-white/10 transition-colors"
      >
        <Map className="w-4 h-4" />
        {basemapLabel}
      </button>
      <div className="w-px h-6 bg-white/20 mx-0.5" />
      <button
        onClick={cycle3D}
        title="Cycle 3D buildings"
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
          buildingMode !== "off"
            ? "bg-white/20 text-white"
            : "text-white/60 hover:text-white hover:bg-white/10"
        )}
      >
        <BuildingIcon className="w-4 h-4" />
        {buildingLabel[buildingMode]}
      </button>
    </div>
  );
}
