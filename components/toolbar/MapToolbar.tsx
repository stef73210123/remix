"use client";

import { useCesium } from "@/components/cesium/CesiumContext";
import { Map, Building2, Grid3x3, Ruler, GitCompare, MapPin, Footprints, Ban } from "lucide-react";
import { cn } from "@/lib/utils";

type BuildingMode = "osm" | "google" | "footprints" | "off";

export default function MapToolbar() {
  const {
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
    basemapMode,
    setBasemapMode,
    measureMode,
    setMeasureMode,
    comparisonProperties,
    rightPanel,
    setRightPanel,
    newsExpanded,
  } = useCesium();

  // Single cycle through the building-display options.
  const buildingMode: BuildingMode = showOsmFootprints
    ? "footprints"
    : !showBuildings
      ? "off"
      : buildingSource === "google"
        ? "google"
        : "osm";

  const cycleBuilding = () => {
    switch (buildingMode) {
      case "osm": // OSM 3D → Google 3D
        setShowOsmFootprints(false);
        setShowBuildings(true);
        setBuildingSource("google");
        break;
      case "google": // Google 3D → 2D footprints
        setShowBuildings(false);
        setBuildingSource("osm");
        setShowOsmFootprints(true);
        break;
      case "footprints": // footprints → off
        setShowOsmFootprints(false);
        setShowBuildings(false);
        break;
      default: // off → OSM 3D
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
  const buildingIcon =
    buildingMode === "footprints" ? (
      <Footprints className="w-4 h-4" />
    ) : buildingMode === "off" ? (
      <Ban className="w-4 h-4" />
    ) : (
      <Building2 className="w-4 h-4" />
    );

  return (
    <div
      className={cn(
        "absolute left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 bg-[#161616]/90 backdrop-blur-sm rounded-lg px-2 py-1.5 shadow-lg border border-white/10 max-w-[calc(100vw-1rem)] overflow-x-auto [&>*]:shrink-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden transition-[bottom] duration-300",
        // Ride above the news ticker (collapsed) or the expanded news panel.
        newsExpanded ? "bottom-[312px]" : "bottom-[72px]"
      )}
    >
      <ToolbarButton
        icon={<Map className="w-4 h-4" />}
        label="BASE MAP"
        active={basemapMode === "satellite"}
        onClick={() =>
          setBasemapMode(basemapMode === "satellite" ? "osm" : "satellite")
        }
      />
      <div className="w-px h-6 bg-white/20 mx-1" />
      <ToolbarButton
        icon={buildingIcon}
        label={buildingLabel[buildingMode]}
        active={buildingMode !== "off"}
        onClick={cycleBuilding}
      />
      <ToolbarButton
        icon={<MapPin className="w-4 h-4" />}
        label="PLACES"
        active={showOsmPlaces}
        onClick={() => setShowOsmPlaces(!showOsmPlaces)}
      />
      <div className="w-px h-6 bg-white/20 mx-1" />
      <ToolbarButton
        icon={<Grid3x3 className="w-4 h-4" />}
        label="PARCELS"
        active={showParcels}
        onClick={() => setShowParcels(!showParcels)}
      />
      <div className="w-px h-6 bg-white/20 mx-1" />
      <ToolbarButton
        icon={<Ruler className="w-4 h-4" />}
        label="MEASURE"
        active={measureMode === "measure"}
        onClick={() => setMeasureMode(measureMode === "measure" ? "none" : "measure")}
      />
      {comparisonProperties.length > 0 && (
        <>
          <div className="w-px h-6 bg-white/20 mx-1" />
          <ToolbarButton
            icon={<GitCompare className="w-4 h-4" />}
            label={`COMPARE (${comparisonProperties.length})`}
            active={rightPanel === "comparison"}
            onClick={() => setRightPanel(rightPanel === "comparison" ? null : "comparison")}
          />
        </>
      )}
    </div>
  );
}

function ToolbarButton({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
        active
          ? "bg-white/20 text-white"
          : "text-white/60 hover:text-white hover:bg-white/10"
      )}
    >
      {icon}
      {label}
    </button>
  );
}
