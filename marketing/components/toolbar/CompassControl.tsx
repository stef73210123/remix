"use client";

import { useState, useEffect } from "react";
import { useCesium } from "@/components/cesium/CesiumContext";

export default function CompassControl() {
  const { viewerRef } = useCesium();
  const [heading, setHeading] = useState(0);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    let removeListener: (() => void) | undefined;

    (async () => {
      const Cesium = await import("cesium");
      const handler = () => {
        const h = Cesium.Math.toDegrees(viewer.camera.heading);
        setHeading(h);
      };
      viewer.camera.changed.addEventListener(handler);
      removeListener = () => viewer.camera.changed.removeEventListener(handler);
    })();

    return () => {
      removeListener?.();
    };
  }, [viewerRef]);

  const isNorth = heading < 5 || heading > 355;

  async function resetToNorth() {
    const viewer = viewerRef.current;
    if (!viewer) return;

    viewer.camera.flyTo({
      destination: viewer.camera.position,
      orientation: { heading: 0, pitch: viewer.camera.pitch, roll: 0 },
      duration: 0.5,
    });
  }

  return (
    <div
      onClick={resetToNorth}
      className="bg-[#1a2332]/90 backdrop-blur-sm rounded-full border border-white/10 w-12 h-12 flex items-center justify-center cursor-pointer hover:bg-[#1a2332] transition-colors"
      title="Reset to North"
    >
      <span
        className={`font-bold text-sm ${isNorth ? "text-red-500" : "text-white"}`}
        style={{ transform: `rotate(-${heading}deg)`, display: "inline-block" }}
      >
        N
      </span>
    </div>
  );
}
