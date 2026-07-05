"use client";

import { useState } from "react";
import {
  Layers as LayersIcon,
  X,
  Ruler,
  Building2,
  Footprints,
  MapPin,
  Grid3x3,
  Map as MapIcon,
  LayoutGrid,
  Hash,
  Building,
  ChevronRight,
} from "lucide-react";
import { useCesium, BasemapMode } from "@/components/cesium/CesiumContext";
import ViewModeToggle from "@/components/toolbar/ViewModeToggle";
import { cn } from "@/lib/utils";

// Top row — map types (basemaps + Google Photorealistic 3D as a "type").
const MAP_TYPES: { key: BasemapMode | "google3d"; label: string; color: string }[] = [
  { key: "satellite", label: "Satellite", color: "#1a3a2a" },
  { key: "osm", label: "Streets", color: "#e8e4d8" },
  { key: "google3d", label: "Google 3D", color: "#38506e" },
  { key: "hybrid", label: "Hybrid", color: "#2a4a3a" },
  { key: "terrain", label: "Terrain", color: "#c4b99a" },
  { key: "dark", label: "Dark", color: "#1a1a2e" },
  { key: "light", label: "Light", color: "#f0f0f0" },
];

// Bottom grid — the 8 most-used layers. `bool` toggles use dedicated setters;
// the rest are catalog ids toggled via activeLayers (rendered by CesiumViewer).
type LayerTile =
  | { id: string; label: string; icon: React.ElementType; kind: "bool"; kindKey: BoolKey }
  | { id: string; label: string; icon: React.ElementType; kind: "layer" };
type BoolKey = "buildings" | "footprints" | "places" | "parcels";

const TOP_LAYERS: LayerTile[] = [
  { id: "buildings", label: "3D Buildings", icon: Building2, kind: "bool", kindKey: "buildings" },
  { id: "footprints", label: "Footprints", icon: Footprints, kind: "bool", kindKey: "footprints" },
  { id: "places", label: "Places", icon: MapPin, kind: "bool", kindKey: "places" },
  { id: "parcels", label: "Parcels", icon: Grid3x3, kind: "bool", kindKey: "parcels" },
  { id: "census-tracts", label: "Census Tracts", icon: MapIcon, kind: "layer" },
  { id: "census-block-groups", label: "Block Groups", icon: LayoutGrid, kind: "layer" },
  { id: "census-zcta", label: "ZIP Codes", icon: Hash, kind: "layer" },
  { id: "census-cbsa", label: "Metro Areas", icon: Building, kind: "layer" },
];

export default function MapTypePicker() {
  const {
    basemapMode,
    setBasemapMode,
    showBuildings,
    setShowBuildings,
    buildingSource,
    setBuildingSource,
    showOsmFootprints,
    setShowOsmFootprints,
    showOsmPlaces,
    setShowOsmPlaces,
    showParcels,
    setShowParcels,
    activeLayers,
    setActiveLayers,
    setRightPanel,
    measureMode,
    setMeasureMode,
    leftPanelOpen,
  } = useCesium();
  const [open, setOpen] = useState(false);

  const google3dActive = showBuildings && buildingSource === "google";

  const selectMapType = (key: BasemapMode | "google3d") => {
    if (key === "google3d") {
      setShowOsmFootprints(false);
      setBuildingSource("google");
      setShowBuildings(true);
    } else {
      // Switching to a flat basemap turns off the Google photorealistic mesh.
      if (google3dActive) {
        setShowBuildings(false);
        setBuildingSource("osm");
      }
      setBasemapMode(key);
    }
  };

  const isTypeActive = (key: BasemapMode | "google3d") =>
    key === "google3d" ? google3dActive : basemapMode === key && !google3dActive;

  const boolState: Record<BoolKey, boolean> = {
    buildings: showBuildings,
    footprints: showOsmFootprints,
    places: showOsmPlaces,
    parcels: showParcels,
  };

  const isLayerActive = (tile: LayerTile) =>
    tile.kind === "bool" ? boolState[tile.kindKey] : activeLayers.has(tile.id);

  const toggleLayer = (tile: LayerTile) => {
    if (tile.kind === "bool") {
      switch (tile.kindKey) {
        case "buildings":
          if (!showBuildings) setBuildingSource("osm");
          setShowBuildings(!showBuildings);
          break;
        case "footprints":
          setShowOsmFootprints(!showOsmFootprints);
          break;
        case "places":
          setShowOsmPlaces(!showOsmPlaces);
          break;
        case "parcels":
          setShowParcels(!showParcels);
          break;
      }
      return;
    }
    setActiveLayers((prev: Set<string>) => {
      const next = new Set(prev);
      if (next.has(tile.id)) next.delete(tile.id);
      else next.add(tile.id);
      return next;
    });
  };

  return (
    <div
      className={cn(
        "absolute left-1/2 -translate-x-1/2 z-30 flex items-end gap-2 bottom-[88px]",
        // The property sheet/card overlaps the bottom-center control until there's
        // room beside it (lg+) — hide while a property is open below lg.
        leftPanelOpen && "max-lg:hidden"
      )}
    >
      {open && (
        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-[340px] max-w-[92vw] bg-[#161616]/95 backdrop-blur-sm rounded-xl border border-white/10 shadow-2xl p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-white tracking-wide">Map type</span>
              <button onClick={() => setOpen(false)} className="text-white/50 hover:text-white" aria-label="Close">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Map types */}
            <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {MAP_TYPES.map((t) => {
                const active = isTypeActive(t.key);
                return (
                  <button
                    key={t.key}
                    onClick={() => selectMapType(t.key)}
                    className="flex flex-col items-center gap-1 shrink-0 w-12 group"
                  >
                    <div
                      className={cn(
                        "w-10 h-10 rounded-lg border-2 transition-colors relative flex items-center justify-center",
                        active ? "border-[#ca615f]" : "border-white/15 group-hover:border-white/40"
                      )}
                      style={{ backgroundColor: t.color }}
                    >
                      {t.key === "google3d" && <Building2 className="w-4 h-4 text-white/90" />}
                    </div>
                    <span className={cn("text-[9px] leading-tight text-center", active ? "text-[#ca615f] font-semibold" : "text-white/70")}>
                      {t.label}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="h-px bg-white/10 my-2.5" />

            {/* Map details / layers */}
            <div className="text-[10px] font-bold text-white/50 uppercase tracking-wide mb-2">Layers</div>
            <div className="grid grid-cols-4 gap-2">
              {TOP_LAYERS.map((tile) => {
                const active = isLayerActive(tile);
                const Icon = tile.icon;
                return (
                  <button
                    key={tile.id}
                    onClick={() => toggleLayer(tile)}
                    className="flex flex-col items-center gap-1 group"
                  >
                    <div
                      className={cn(
                        "w-full aspect-square rounded-lg border flex items-center justify-center transition-colors",
                        active
                          ? "bg-[#ca615f] border-[#ca615f] text-white"
                          : "bg-white/5 border-white/10 text-white/70 group-hover:bg-white/10"
                      )}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className={cn("text-[8px] leading-tight text-center", active ? "text-white" : "text-white/60")}>
                      {tile.label}
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => {
                setRightPanel("layers");
                setOpen(false);
              }}
              className="mt-3 w-full flex items-center justify-center gap-1 text-[11px] font-semibold text-[#ca615f] hover:text-[#d4767a] py-1.5 rounded-lg border border-white/10 hover:border-[#ca615f]/50 transition-colors"
            >
              See all layers
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <button
          onClick={() => setOpen((v) => !v)}
          title="Map type & layers"
          className={cn(
            "flex items-center gap-1.5 px-3 py-2 rounded-lg shadow-lg border text-xs font-medium transition-colors backdrop-blur-sm",
            open
              ? "bg-[#ca615f] text-white border-[#ca615f]"
              : "bg-[#161616]/90 text-white/90 border-white/10 hover:bg-[#161616]"
          )}
        >
          <LayersIcon className="w-4 h-4" />
          MAPS
        </button>

      {/* Measure — surfaced here for phones/tablets (desktop has it in Draw tools). */}
      <button
        onClick={() => setMeasureMode(measureMode === "measure" ? "none" : "measure")}
        title="Measure"
        className={cn(
          "lg:hidden flex items-center gap-1.5 px-3 py-2 rounded-lg shadow-lg border text-xs font-medium transition-colors backdrop-blur-sm",
          measureMode === "measure"
            ? "bg-[#ca615f] text-white border-[#ca615f]"
            : "bg-[#161616]/90 text-white/90 border-white/10 hover:bg-[#161616]"
        )}
      >
        <Ruler className="w-4 h-4" />
        MEASURE
      </button>

      {/* 2D / 3D globe view toggle */}
      <ViewModeToggle />
    </div>
  );
}
