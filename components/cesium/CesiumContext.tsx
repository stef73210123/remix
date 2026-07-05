"use client";

import { createContext, useContext, useRef, useCallback, useState } from "react";
import { Property, FilterState } from "@/types/cesium";

/* eslint-disable @typescript-eslint/no-explicit-any */
export type BuildingSource = "osm" | "google" | "none";
export type BasemapMode = "satellite" | "osm" | "dark" | "light" | "terrain" | "hybrid";

interface CesiumContextValue {
  viewerRef: React.MutableRefObject<any>;
  buildingsTilesetRef: React.MutableRefObject<any>;
  msBuildingsTilesetRef: React.MutableRefObject<any>;
  selectedProperty: Property | null;
  setSelectedProperty: (property: Property | null) => void;
  showBuildings: boolean;
  setShowBuildings: (show: boolean) => void;
  buildingSource: BuildingSource;
  setBuildingSource: (source: BuildingSource) => void;
  showOsmFootprints: boolean;
  setShowOsmFootprints: (show: boolean) => void;
  showOsmPlaces: boolean;
  setShowOsmPlaces: (show: boolean) => void;
  osmPlaceCategories: Set<string>;
  setOsmPlaceCategories: React.Dispatch<React.SetStateAction<Set<string>>>;
  showParcels: boolean;
  setShowParcels: (show: boolean) => void;
  basemapMode: BasemapMode;
  setBasemapMode: (mode: BasemapMode) => void;
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
  // 11F: Measurement mode (unified: click points for distance, close for area)
  measureMode: "none" | "measure";
  setMeasureMode: (mode: "none" | "measure") => void;
  // 11I: Active region
  activeRegion: string;
  setActiveRegion: (region: string) => void;
  // 2D / 3D scene mode (lifted so the toggle button + search flow stay in sync)
  viewMode: "2D" | "3D";
  toggleViewMode: () => void;
  flyToAddressOverhead: (lng: number, lat: number) => void;
}

const CesiumContext = createContext<CesiumContextValue | null>(null);

export function CesiumProvider({ children }: { children: React.ReactNode }) {
  const viewerRef = useRef<any>(null);
  const buildingsTilesetRef = useRef<any>(null);
  const msBuildingsTilesetRef = useRef<any>(null);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(
    null
  );
  const [showBuildings, setShowBuildings] = useState(true);
  const [buildingSource, setBuildingSource] = useState<BuildingSource>("osm");
  const [showOsmFootprints, setShowOsmFootprints] = useState(false);
  const [showOsmPlaces, setShowOsmPlaces] = useState(false);
  const [osmPlaceCategories, setOsmPlaceCategories] = useState<Set<string>>(
    new Set(["amenity", "shop", "tourism"])
  );
  const [showParcels, setShowParcels] = useState(true);
  const [basemapMode, setBasemapMode] = useState<BasemapMode>(
    "satellite"
  );
  const [leftPanelOpen, setLeftPanelOpen] = useState(false);
  const [rightPanel, setRightPanel] = useState<"layers" | "filters" | "geo-query" | "comparison" | "listings" | null>(
    null
  );
  const [activeLayers, setActiveLayers] = useState<Set<string>>(new Set());
  const [filterState, setFilterState] = useState<FilterState | null>(null);
  const [comparisonProperties, setComparisonProperties] = useState<Property[]>([]);
  const [measureMode, setMeasureMode] = useState<"none" | "measure">("none");
  const [activeRegion, setActiveRegion] = useState("dc");
  const [viewMode, setViewMode] = useState<"2D" | "3D">("3D");

  // Toggle 2D/3D while keeping the current focal point (screen-center ground
  // point) and zoom — Cesium's default morph otherwise jumps the camera out.
  const toggleViewMode = useCallback(async () => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    const Cesium = await import("cesium");
    const scene = viewer.scene;
    const camera = viewer.camera;
    const canvas = scene.canvas;

    // Focal point under the middle of the screen + distance to it (≈ zoom).
    const centerPx = new Cesium.Cartesian2(
      canvas.clientWidth / 2,
      canvas.clientHeight / 2
    );
    const centerCart = camera.pickEllipsoid(centerPx, scene.globe.ellipsoid);
    let lon: number, lat: number, distance: number;
    if (centerCart) {
      const carto = Cesium.Cartographic.fromCartesian(centerCart);
      lon = carto.longitude;
      lat = carto.latitude;
      distance = Cesium.Cartesian3.distance(camera.positionWC, centerCart);
    } else {
      const pc = camera.positionCartographic;
      lon = pc.longitude;
      lat = pc.latitude;
      distance = pc.height;
    }
    const heading = camera.heading;
    const goingTo2D = scene.mode !== Cesium.SceneMode.SCENE2D;

    const restore = () => {
      camera.setView({
        destination: Cesium.Cartesian3.fromRadians(lon, lat, distance),
        orientation: { heading, pitch: -Cesium.Math.PI_OVER_TWO, roll: 0 },
      });
    };
    const remove = scene.morphComplete.addEventListener(() => {
      restore();
      remove();
    });
    if (goingTo2D) scene.morphTo2D(0.5);
    else scene.morphTo3D(0.5);
    setViewMode(goingTo2D ? "2D" : "3D");
  }, []);

  // Address search lands on a 2D overhead, north-up view centered on the result.
  const flyToAddressOverhead = useCallback(async (lng: number, lat: number) => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    const Cesium = await import("cesium");
    const scene = viewer.scene;
    const camera = viewer.camera;
    const height = 1200;
    const dest = Cesium.Cartesian3.fromDegrees(lng, lat, height);
    const overhead = { heading: 0, pitch: -Cesium.Math.PI_OVER_TWO, roll: 0 };

    if (scene.mode !== Cesium.SceneMode.SCENE2D) {
      const remove = scene.morphComplete.addEventListener(() => {
        camera.setView({ destination: dest, orientation: overhead });
        remove();
      });
      scene.morphTo2D(0.5);
      setViewMode("2D");
    } else {
      camera.flyTo({ destination: dest, orientation: overhead, duration: 1.5 });
    }
  }, []);

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
        msBuildingsTilesetRef,
        selectedProperty,
        setSelectedProperty,
        showBuildings,
        setShowBuildings,
        buildingSource,
        setBuildingSource,
        showOsmFootprints,
        setShowOsmFootprints,
        showOsmPlaces,
        setShowOsmPlaces,
        osmPlaceCategories,
        setOsmPlaceCategories,
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
        viewMode,
        toggleViewMode,
        flyToAddressOverhead,
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
