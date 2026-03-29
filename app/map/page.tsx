"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import { CesiumProvider, useCesium } from "@/components/cesium/CesiumContext";
import PropertyPanel from "@/components/panels/PropertyPanel";
import RightPanel from "@/components/panels/RightPanel";
import MapToolbar from "@/components/toolbar/MapToolbar";
import SearchBar from "@/components/search/SearchBar";
import NewsPanel from "@/components/panels/NewsPanel";
import { Home, ChevronDown } from "lucide-react";
import { REGIONS, getRegion } from "@/lib/data/regions";
import { parseURLState, updateURL } from "@/lib/url-state";
import { MOCK_PROPERTIES } from "@/lib/data/properties";

const CesiumViewer = dynamic(
  () => import("@/components/cesium/CesiumViewer"),
  {
    ssr: false,
    loading: () => (
      <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a0a]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#0088aa] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-400">Loading 3D viewer...</p>
        </div>
      </div>
    ),
  }
);

const MeasureTools = dynamic(
  () => import("@/components/toolbar/MeasureTools"),
  { ssr: false }
);

function URLStateSync() {
  const {
    selectedProperty,
    activeLayers,
    rightPanel,
    activeRegion,
  } = useCesium();

  useEffect(() => {
    const timer = setTimeout(() => {
      updateURL({
        propertyId: selectedProperty?.id,
        layers: activeLayers.size > 0 ? [...activeLayers] : undefined,
        panel: rightPanel || undefined,
        region: activeRegion !== "dc" ? activeRegion : undefined,
      });
    }, 500);
    return () => clearTimeout(timer);
  }, [selectedProperty, activeLayers, rightPanel, activeRegion]);

  return null;
}

function URLStateLoader() {
  const {
    setSelectedProperty,
    setLeftPanelOpen,
    setActiveLayers,
    setRightPanel,
    setActiveRegion,
    flyToProperty,
  } = useCesium();

  useEffect(() => {
    const state = parseURLState();

    if (state.region) {
      setActiveRegion(state.region);
    }

    if (state.layers && state.layers.length > 0) {
      setActiveLayers(new Set(state.layers));
    }

    if (state.panel) {
      setRightPanel(state.panel as "layers" | "filters" | "geo-query" | "comparison" | "listings");
    }

    if (state.propertyId) {
      const prop = MOCK_PROPERTIES.find((p) => p.id === state.propertyId);
      if (prop) {
        setSelectedProperty(prop);
        setLeftPanelOpen(true);
        setTimeout(() => flyToProperty(prop), 2000);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

function RegionSelector() {
  const { activeRegion, setActiveRegion, viewerRef } = useCesium();
  const region = getRegion(activeRegion);

  async function switchRegion(regionId: string) {
    setActiveRegion(regionId);
    const r = getRegion(regionId);
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
    <div className="relative group">
      <button className="flex items-center gap-1 px-3 py-1.5 bg-[#1a2332]/90 rounded-lg shadow-lg border border-white/10 text-white text-xs font-medium hover:bg-[#1a2332] transition-colors">
        {region.shortName}
        <ChevronDown className="w-3 h-3 text-white/60" />
      </button>
      <div className="hidden group-hover:block absolute top-full left-0 mt-1 bg-[#1a2332] rounded-lg shadow-xl border border-white/10 min-w-[160px] overflow-hidden z-50">
        {REGIONS.map((r) => (
          <button
            key={r.id}
            onClick={() => switchRegion(r.id)}
            className={`w-full text-left px-3 py-2 text-xs transition-colors ${
              r.id === activeRegion
                ? "bg-[#0088aa] text-white"
                : "text-white/70 hover:bg-white/10 hover:text-white"
            }`}
          >
            {r.name}
          </button>
        ))}
      </div>
    </div>
  );
}

function HomeButton() {
  const { activeRegion, viewerRef } = useCesium();

  async function flyHome() {
    const viewer = viewerRef.current;
    if (!viewer) return;
    const r = getRegion(activeRegion);
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
      duration: 1.5,
    });
  }

  return (
    <button
      onClick={flyHome}
      className="p-2 bg-[#1a2332]/90 rounded-lg shadow-lg border border-white/10 text-white hover:bg-[#1a2332] transition-colors"
      title="Home"
    >
      <Home className="w-4 h-4" />
    </button>
  );
}

export default function MapPage() {
  return (
    <CesiumProvider>
      <div className="relative w-full h-screen overflow-hidden">
        {/* Top-left controls */}
        <div className="absolute top-3 left-3 z-40 flex items-center gap-2">
          <HomeButton />
          <RegionSelector />
        </div>

        {/* Cesium 3D Viewer */}
        <CesiumViewer />

        {/* Measurement tools */}
        <MeasureTools />

        {/* URL state sync */}
        <URLStateSync />
        <URLStateLoader />

        {/* Left Panel - Property Details */}
        <PropertyPanel />

        {/* Right Panel - Layers / Filters / Comparison */}
        <RightPanel />

        {/* Search Bar + Action Buttons */}
        <SearchBar />

        {/* News Panel */}
        <NewsPanel />

        {/* Bottom Toolbar */}
        <MapToolbar />

        {/* Cesium attribution */}
        <div className="absolute bottom-4 left-4 z-20 flex items-center gap-1.5">
          <div className="bg-[#1a2332]/80 backdrop-blur-sm rounded px-2 py-1 text-[10px] text-white/70 flex items-center gap-1.5">
            <span className="font-bold text-[#6cc0e5]">CESIUM</span>
            <span>&copy; OpenStreetMap</span>
          </div>
        </div>
      </div>
    </CesiumProvider>
  );
}
