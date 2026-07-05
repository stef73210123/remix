"use client";

import { useEffect, useRef } from "react";
import { useCesium } from "@/components/cesium/CesiumContext";

/**
 * Zoom-driven automatic basemap. As the camera settles, the visible ground
 * area decides the basemap:
 *   - > 5 sq mi (city or wider) → user's discretion (auto re-arms here)
 *   - ~2.5–5 sq mi (neighborhood) → Streets
 *   - ~1–2.5 sq mi → Hybrid satellite
 *   - ≤ 1 sq mi (block) → Google Photorealistic 3D
 * The user can override at city scale via the MAPS picker; the override holds
 * until they zoom back out past the city threshold, which re-arms auto.
 */
export default function AutoBasemap() {
  const {
    viewerRef,
    autoBasemap,
    setAutoBasemap,
    setBasemapMode,
    setShowBuildings,
    setBuildingSource,
    setShowOsmFootprints,
  } = useCesium();

  // Read live values inside the (once-registered) camera listener.
  const autoRef = useRef(autoBasemap);
  useEffect(() => {
    autoRef.current = autoBasemap;
  }, [autoBasemap]);

  const lastTierRef = useRef<string>("");

  useEffect(() => {
    let cancelled = false;
    let off: (() => void) | undefined;

    (async () => {
      const Cesium = await import("cesium");

      const applyTier = (tier: "streets" | "hybrid" | "google3d") => {
        if (lastTierRef.current === tier) return;
        lastTierRef.current = tier;
        if (tier === "google3d") {
          setShowOsmFootprints(false);
          setBuildingSource("google");
          setShowBuildings(true);
        } else {
          setShowBuildings(false);
          setBuildingSource("osm");
          setBasemapMode(tier === "hybrid" ? "hybrid" : "osm");
        }
      };

      const onSettle = () => {
        const viewer = viewerRef.current;
        if (!viewer) return;
        const rect = viewer.camera.computeViewRectangle();

        // Horizon in view (very wide) → city/wide: user's discretion + re-arm.
        if (!rect) {
          lastTierRef.current = "";
          if (!autoRef.current) setAutoBasemap(true);
          return;
        }

        const west = Cesium.Math.toDegrees(rect.west);
        const east = Cesium.Math.toDegrees(rect.east);
        const south = Cesium.Math.toDegrees(rect.south);
        const north = Cesium.Math.toDegrees(rect.north);
        const centerLat = (south + north) / 2;
        const latMi = (north - south) * 69.0;
        const lngMi = (east - west) * 69.0 * Math.cos((centerLat * Math.PI) / 180);
        const areaSqMi = Math.abs(latMi * lngMi);

        if (areaSqMi > 5) {
          // City or wider — respect the user's choice and re-arm for zoom-in.
          lastTierRef.current = "";
          if (!autoRef.current) setAutoBasemap(true);
          return;
        }
        if (!autoRef.current) return; // manual override in effect

        if (areaSqMi <= 1) applyTier("google3d");
        else if (areaSqMi <= 2.5) applyTier("hybrid");
        else applyTier("streets");
      };

      const attach = () => {
        if (cancelled) return;
        const viewer = viewerRef.current;
        if (!viewer) {
          setTimeout(attach, 500);
          return;
        }
        off = viewer.camera.moveEnd.addEventListener(onSettle);
        onSettle();
      };
      attach();
    })();

    return () => {
      cancelled = true;
      off?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewerRef]);

  return null;
}
