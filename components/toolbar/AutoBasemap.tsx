"use client";

import { useEffect, useRef } from "react";
import { useCesium } from "@/components/cesium/CesiumContext";

/**
 * Zoom-driven automatic basemap. As the camera settles, the camera height
 * (eye altitude) decides the basemap — height is used instead of the visible
 * rectangle because that goes undefined / unreliable under 3D tilt and in 2D:
 *   - > 5 km (city or wider) → the user's chosen basemap, Google 3D off
 *   - 3–5 km (neighborhood) → Streets
 *   - 1.8–3 km → Hybrid satellite
 *   - ≤ 1.8 km (block) → Google Photorealistic 3D
 * Zooming back out reverts through the tiers (so Google 3D never sticks). The
 * user's manual pick in the MAPS picker sets the wide/city basemap.
 */
const WIDE_M = 5000;
const STREETS_M = 3000;
const HYBRID_M = 1800;
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
        const h = viewer.camera.positionCartographic?.height;
        if (typeof h !== "number") return;

        if (h > WIDE_M) apply("wide");
        else if (h <= HYBRID_M) apply("google3d");
        else if (h <= STREETS_M) apply("hybrid");
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
