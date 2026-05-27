"use client";

import { useEffect, useRef, useState } from "react";
import { useCesium } from "@/components/cesium/CesiumContext";

interface Coordinates {
  lat: number;
  lng: number;
  alt: number;
}

export default function CoordinateDisplay() {
  const { viewerRef } = useCesium();
  const [coords, setCoords] = useState<Coordinates | null>(null);
  const lastUpdateRef = useRef(0);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    const canvas = viewer.scene.canvas as HTMLCanvasElement;
    let active = true;

    async function setupHandler() {
      const Cesium = await import("cesium");

      function onMouseMove(e: MouseEvent) {
        if (!active) return;

        const now = performance.now();
        // Throttle to ~10fps
        if (now - lastUpdateRef.current < 100) return;
        lastUpdateRef.current = now;

        const rect = canvas.getBoundingClientRect();
        const position = new Cesium.Cartesian2(
          e.clientX - rect.left,
          e.clientY - rect.top
        );

        const ray = viewer.camera.getPickRay(position);
        if (!ray) return;

        const cartesian = viewer.scene.globe.pick(ray, viewer.scene);
        if (!cartesian) {
          setCoords(null);
          return;
        }

        const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
        setCoords({
          lat: Cesium.Math.toDegrees(cartographic.latitude),
          lng: Cesium.Math.toDegrees(cartographic.longitude),
          alt: Math.round(cartographic.height),
        });
      }

      canvas.addEventListener("mousemove", onMouseMove);
      return () => {
        canvas.removeEventListener("mousemove", onMouseMove);
      };
    }

    let cleanup: (() => void) | undefined;
    setupHandler().then((fn) => {
      if (active) {
        cleanup = fn;
      } else {
        fn();
      }
    });

    return () => {
      active = false;
      cleanup?.();
    };
  }, [viewerRef]);

  if (!coords) return null;

  const latDir = coords.lat >= 0 ? "N" : "S";
  const lngDir = coords.lng >= 0 ? "E" : "W";
  const latStr = Math.abs(coords.lat).toFixed(4);
  const lngStr = Math.abs(coords.lng).toFixed(4);

  return (
    <div className="absolute bottom-4 right-4 z-20 bg-[#1a2332]/80 backdrop-blur-sm rounded px-2 py-1 text-[10px] text-white/70 font-mono">
      {latStr}&deg; {latDir}, {lngStr}&deg; {lngDir} | Alt: {coords.alt}m
    </div>
  );
}
