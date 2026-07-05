"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { CesiumProvider, useCesium } from "@/components/cesium/CesiumContext";
import PropertyPanel from "@/components/panels/PropertyPanel";
import RightPanel from "@/components/panels/RightPanel";
import MapTypePicker from "@/components/toolbar/MapTypePicker";
import SearchBar from "@/components/search/SearchBar";
import NewsPanel from "@/components/panels/NewsPanel";
import { Home, LocateFixed, ArrowLeft } from "lucide-react";
import { getRegion } from "@/lib/data/regions";
import { parseURLState, updateURL } from "@/lib/url-state";
import { MOCK_PROPERTIES } from "@/lib/data/properties";

const CesiumViewer = dynamic(
  () => import("@/components/cesium/CesiumViewer"),
  {
    ssr: false,
    loading: () => (
      <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a0a]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#ca615f] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
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

const DrawTools = dynamic(
  () => import("@/components/toolbar/DrawTools"),
  { ssr: false }
);

const HistoricalImagery = dynamic(
  () => import("@/components/toolbar/HistoricalImagery"),
  { ssr: false }
);

const CoordinateDisplay = dynamic(
  () => import("@/components/toolbar/CoordinateDisplay"),
  { ssr: false }
);

const KeyboardShortcuts = dynamic(
  () => import("@/components/toolbar/KeyboardShortcuts"),
  { ssr: false }
);

const CompassControl = dynamic(
  () => import("@/components/toolbar/CompassControl"),
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
    viewerRef,
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

    if (state.address) {
      geocodeAndFly(state.address);
    }

    async function geocodeAndFly(address: string) {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(address)}`
        );
        const data = await res.json();
        if (!data || data.length === 0) return;
        const { lat, lon } = data[0];
        const latitude = parseFloat(lat);
        const longitude = parseFloat(lon);

        const tryFly = () => {
          const viewer = viewerRef.current;
          if (!viewer) {
            setTimeout(tryFly, 500);
            return;
          }
          import("cesium").then((Cesium) => {
            viewer.camera.flyTo({
              destination: Cesium.Cartesian3.fromDegrees(longitude, latitude, 800),
              orientation: {
                heading: Cesium.Math.toRadians(0),
                pitch: Cesium.Math.toRadians(-45),
                roll: 0,
              },
              duration: 2,
            });
          });
        };
        setTimeout(tryFly, 2000);
      } catch {
        // Geocoding failed silently
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

function BackToDashboard() {
  const [back, setBack] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("embed") === "1") {
      // One-time read of the embed target on mount; not a cascading update.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBack(params.get("back") || "/");
    }
  }, []);

  if (!back) return null;

  return (
    <a
      href={back}
      target="_top"
      className="flex items-center gap-1.5 px-3 py-2 bg-[#161616]/90 rounded-lg shadow-lg border border-white/10 text-white text-xs font-medium hover:bg-[#161616] hover:border-[#ca615f] transition-colors"
      title="Back to Dashboard"
    >
      <ArrowLeft className="w-4 h-4" />
      <span className="hidden sm:inline">Dashboard</span>
    </a>
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
      className="p-2 bg-[#161616]/90 rounded-lg shadow-lg border border-white/10 text-white hover:bg-[#161616] transition-colors"
      title="Home"
    >
      <Home className="w-4 h-4" />
    </button>
  );
}

function MyLocationButton() {
  const { viewerRef } = useCesium();

  async function goToMyLocation() {
    if (!navigator.geolocation) {
      console.warn("Geolocation is not supported by this browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const viewer = viewerRef.current;
        if (!viewer) return;

        const { latitude, longitude } = position.coords;
        const Cesium = await import("cesium");

        viewer.camera.flyTo({
          destination: Cesium.Cartesian3.fromDegrees(longitude, latitude, 500),
          orientation: {
            heading: Cesium.Math.toRadians(0),
            pitch: Cesium.Math.toRadians(-45),
            roll: 0,
          },
          duration: 1.5,
        });

        // Add a pulsing blue point entity
        const entityId = "__my_location__";
        const existing = viewer.entities.getById(entityId);
        if (existing) {
          viewer.entities.remove(existing);
        }

        viewer.entities.add({
          id: entityId,
          position: Cesium.Cartesian3.fromDegrees(longitude, latitude),
          point: {
            pixelSize: 12,
            color: Cesium.Color.DODGERBLUE,
            outlineColor: Cesium.Color.WHITE,
            outlineWidth: 2,
            scaleByDistance: new Cesium.NearFarScalar(1.0e2, 1.5, 1.0e5, 0.5),
          },
        });
      },
      (error) => {
        console.warn("Geolocation error:", error.message);
      }
    );
  }

  return (
    <button
      onClick={goToMyLocation}
      className="p-2 bg-[#161616]/90 rounded-lg shadow-lg border border-white/10 text-white hover:bg-[#161616] transition-colors"
      title="My Location"
    >
      <LocateFixed className="w-4 h-4" />
    </button>
  );
}

export default function MapPage() {
  return (
    <CesiumProvider>
      <div className="relative w-full h-dvh overflow-hidden">
        {/* Top-left controls */}
        <div className="absolute top-3 left-3 z-40 flex items-center gap-2">
          <BackToDashboard />
          <HomeButton />
          <MyLocationButton />
        </div>

        {/* Compass control (large screens only; below the search cluster) */}
        <CompassSlot />

        {/* Cesium 3D Viewer */}
        <CesiumViewer />

        {/* Measurement tools */}
        <MeasureTools />

        {/* Drawing tools */}
        <DrawTools />

        {/* Historical imagery */}
        <HistoricalImagery />

        {/* Keyboard shortcuts */}
        <KeyboardShortcuts />

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

        {/* Map type & layers picker (Google-Maps style) + mobile Measure */}
        <MapTypePicker />

        {/* Coordinate display */}
        <CoordinateDisplay />
      </div>
    </CesiumProvider>
  );
}

/** Compass — only on large screens, tucked under the search cluster on the
 *  right edge, and hidden while the right panel occupies that edge. */
function CompassSlot() {
  const { rightPanel } = useCesium();
  if (rightPanel) return null;
  return (
    <div className="hidden lg:block absolute top-16 right-3 z-30">
      <CompassControl />
    </div>
  );
}

