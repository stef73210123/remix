"use client";

import { useEffect, useRef } from "react";
import { useCesium } from "@/components/cesium/CesiumContext";

/**
 * Zoom-driven automatic basemap. As the camera settles, the visible ground
 * area decides the basemap:
 *   - > 5 sq mi (city or wider) → the user's chosen basemap, Google 3D off
 *   - ~2.5–5 sq mi (neighborhood) → Streets
 *   - ~1–2.5 sq mi → Hybrid satellite
 *   - ≤ 1 sq mi (block) → Google Photorealistic 3D
 * Zooming back out reverts through the tiers (so Google 3D never sticks). The
 * user's manual pick in the MAPS picker sets the wide/city basemap.
 */
export default function AutoBasemap() {
  const {
    viewerRef,
    userBasemap,
    setBasemapMode,
    setShowBuildings,
    setBuildingSource,
    setShowOsmFootprints,
  } = useCesium();

  // Read the live preferred basemap inside the once-registered listener.
  const userBasemapRef = useRef(userBasemap);
  useEffect(() => {
    userBasemapRef.current = userBasemap;
  }, [userBasemap]);

  const lastTierRef = useRef<string>("");

  useEffect(() => {
    let cancelled = false;
    let off: (() => void) | undefined;

    (async () => {
      const Cesium = await import("cesium");

      const apply = (tier: "wide" | "streets" | "hybrid" | "google3d") => {
        // Key includes the preferred basemap so a manual change re-applies.
        const key = tier === "wide" ? `wide:${userBasemapRef.current}` : tier;
        if (lastTierRef.current === key) return;
        lastTierRef.current = key;
        if (tier === "google3d") {
          setShowOsmFootprints(false);
          setBuildingSource("google");
          setShowBuildings(true);
        } else {
          // Drop Google 3D and show the tier's flat basemap.
          setShowBuildings(false);
          setBuildingSource("osm");
          setBasemapMode(
            tier === "hybrid"
              ? "hybrid"
              : tier === "streets"
              ? "osm"
              : userBasemapRef.current
          );
        }
      };

      const onSettle = () => {
        const viewer = viewerRef.current;
        if (!viewer) return;
        const rect = viewer.camera.computeViewRectangle();

        // Horizon in view (very wide) → treat as city/wide.
        if (!rect) {
          apply("wide");
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

        if (areaSqMi > 5) apply("wide");
        else if (areaSqMi <= 1) apply("google3d");
        else if (areaSqMi <= 2.5) apply("hybrid");
        else apply("streets");
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
