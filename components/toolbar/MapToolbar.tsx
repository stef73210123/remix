"use client";

import { useCesium } from "@/components/cesium/CesiumContext";
import { Map, Building2, Grid3x3, Ruler, Pentagon, GitCompare, MapPin, Footprints } from "lucide-react";
import { cn } from "@/lib/utils";

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
  } = useCesium();

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 bg-[#1a2332]/90 backdrop-blur-sm rounded-lg px-2 py-1.5 shadow-lg border border-white/10">
      <ToolbarButton
        icon={<Map className="w-4 h-4" />}
        label="BASE MAP"
        active={basemapMode === "satellite"}
        onClick={() =>
          setBasemapMode(basemapMode === "satellite" ? "street" : "satellite")
        }
      />
      <div className="w-px h-6 bg-white/20 mx-1" />
      <ToolbarButton
        icon={<Building2 className="w-4 h-4" />}
        label={`3D ${buildingSource === "osm" ? "OSM" : "MS"}`}
        active={showBuildings}
        onClick={() => {
          if (!showBuildings) {
            setShowBuildings(true);
          } else if (buildingSource === "osm") {
            setBuildingSource("microsoft");
          } else {
            setShowBuildings(false);
            setBuildingSource("osm");
          }
        }}
      />
      <ToolbarButton
        icon={<Footprints className="w-4 h-4" />}
        label="FOOTPRINTS"
        active={showOsmFootprints}
        onClick={() => setShowOsmFootprints(!showOsmFootprints)}
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
        label="DISTANCE"
        active={measureMode === "distance"}
        onClick={() => setMeasureMode(measureMode === "distance" ? "none" : "distance")}
      />
      <ToolbarButton
        icon={<Pentagon className="w-4 h-4" />}
        label="AREA"
        active={measureMode === "area"}
        onClick={() => setMeasureMode(measureMode === "area" ? "none" : "area")}
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
