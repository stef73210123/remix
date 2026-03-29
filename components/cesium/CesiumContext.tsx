"use client";

import { createContext, useContext, useRef, useCallback, useState } from "react";
import { Property, FilterState } from "@/types/cesium";

/* eslint-disable @typescript-eslint/no-explicit-any */
interface CesiumContextValue {
  viewerRef: React.MutableRefObject<any>;
  buildingsTilesetRef: React.MutableRefObject<any>;
  selectedProperty: Property | null;
  setSelectedProperty: (property: Property | null) => void;
  showBuildings: boolean;
  setShowBuildings: (show: boolean) => void;
  showParcels: boolean;
  setShowParcels: (show: boolean) => void;
  basemapMode: "satellite" | "street";
  setBasemapMode: (mode: "satellite" | "street") => void;
  flyToProperty: (property: Property) => void;
  leftPanelOpen: boolean;
  setLeftPanelOpen: (open: boolean) => void;
  rightPanel: "layers" | "filters" | "geo-query" | "comparison" | "listings" | null;
  setRightPanel: (panel: "layers" | "filters" | "geo-query" | "comparison" | "listings" | null) => void;
  // 11A: Active map layers
  activeLayers: Set<string>;
  setActiveLayers: React.Dispatch<React.SetStateAction<Set<string>>>;
  // 11B: Filter state
  filterState: FilterState | null;
  setFilterState: (state: FilterState | null) => void;
  // 11D: Comparison properties
  comparisonProperties: Property[];
  setComparisonProperties: React.Dispatch<React.SetStateAction<Property[]>>;
  addToComparison: (property: Property) => void;
  removeFromComparison: (propertyId: string) => void;
  // 11F: Measurement mode
  measureMode: "none" | "distance" | "area";
  setMeasureMode: (mode: "none" | "distance" | "area") => void;
  // 11I: Active region
  activeRegion: string;
  setActiveRegion: (region: string) => void;
}

const CesiumContext = createContext<CesiumContextValue | null>(null);

export function CesiumProvider({ children }: { children: React.ReactNode }) {
  const viewerRef = useRef<any>(null);
  const buildingsTilesetRef = useRef<any>(null);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(
    null
  );
  const [showBuildings, setShowBuildings] = useState(true);
  const [showParcels, setShowParcels] = useState(true);
  const [basemapMode, setBasemapMode] = useState<"satellite" | "street">(
    "satellite"
  );
  const [leftPanelOpen, setLeftPanelOpen] = useState(false);
  const [rightPanel, setRightPanel] = useState<"layers" | "filters" | "geo-query" | "comparison" | "listings" | null>(
    null
  );
  const [activeLayers, setActiveLayers] = useState<Set<string>>(new Set());
  const [filterState, setFilterState] = useState<FilterState | null>(null);
  const [comparisonProperties, setComparisonProperties] = useState<Property[]>([]);
  const [measureMode, setMeasureMode] = useState<"none" | "distance" | "area">("none");
  const [activeRegion, setActiveRegion] = useState("dc");

  const flyToProperty = useCallback(async (property: Property) => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    const Cesium = await import("cesium");
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(
        property.lng,
        property.lat,
        400
      ),
      orientation: {
        heading: Cesium.Math.toRadians(0),
        pitch: Cesium.Math.toRadians(-45),
        roll: 0,
      },
      duration: 1.5,
    });
  }, []);

  const addToComparison = useCallback((property: Property) => {
    setComparisonProperties((prev) => {
      if (prev.length >= 4) return prev;
      if (prev.find((p) => p.id === property.id)) return prev;
      return [...prev, property];
    });
  }, []);

  const removeFromComparison = useCallback((propertyId: string) => {
    setComparisonProperties((prev) => prev.filter((p) => p.id !== propertyId));
  }, []);

  return (
    <CesiumContext.Provider
      value={{
        viewerRef,
        buildingsTilesetRef,
        selectedProperty,
        setSelectedProperty,
        showBuildings,
        setShowBuildings,
        showParcels,
        setShowParcels,
        basemapMode,
        setBasemapMode,
        flyToProperty,
        leftPanelOpen,
        setLeftPanelOpen,
        rightPanel,
        setRightPanel,
        activeLayers,
        setActiveLayers,
        filterState,
        setFilterState,
        comparisonProperties,
        setComparisonProperties,
        addToComparison,
        removeFromComparison,
        measureMode,
        setMeasureMode,
        activeRegion,
        setActiveRegion,
      }}
    >
      {children}
    </CesiumContext.Provider>
  );
}

export function useCesium() {
  const ctx = useContext(CesiumContext);
  if (!ctx) throw new Error("useCesium must be used within CesiumProvider");
  return ctx;
}
