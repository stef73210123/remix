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
    <button
      onClick={resetToNorth}
      title="Reset bearing to north"
      aria-label="Reset bearing to north"
      className="group relative bg-[#161616]/90 backdrop-blur-sm rounded-full border border-white/10 w-12 h-12 flex items-center justify-center cursor-pointer hover:bg-[#161616] transition-colors shadow-lg"
    >
      {/* The rose counter-rotates so North always points to the camera bearing */}
      <svg
        viewBox="0 0 40 40"
        className="w-8 h-8"
        style={{ transform: `rotate(${-heading}deg)` }}
      >
        {/* North needle (red) */}
        <polygon points="20,5 15.5,20 24.5,20" fill="#ca615f" />
        {/* South needle (light) */}
        <polygon points="20,35 15.5,20 24.5,20" fill="#ffffff" opacity="0.55" />
        {/* Hub */}
        <circle cx="20" cy="20" r="2.4" fill="#161616" stroke="#ffffff" strokeWidth="1" />
        {/* N marker */}
        <text
          x="20"
          y="10.5"
          textAnchor="middle"
          fontSize="7"
          fontWeight="700"
          fill="#ffffff"
        >
          N
        </text>
      </svg>
      {/* subtle ring highlight when already facing north */}
      <span
        className={`pointer-events-none absolute inset-0 rounded-full transition-opacity ${
          isNorth ? "ring-2 ring-[#ca615f]/50 opacity-100" : "opacity-0"
        }`}
      />
    </button>
  );
}
