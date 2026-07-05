"use client";

import { useState } from "react";
import { useCesium } from "@/components/cesium/CesiumContext";

/** Google-Maps-style 2D / 3D globe toggle. Morphs the Cesium scene between a
 *  flat 2D map and the 3D globe. The label shows the mode you'll switch TO. */
export default function ViewModeToggle() {
  const { viewerRef } = useCesium();
  const [is2D, setIs2D] = useState(false);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    const viewer = viewerRef.current;
    if (!viewer || busy) return;
    setBusy(true);
    await import("cesium");
    if (is2D) {
      viewer.scene.morphTo3D(0.8);
      setIs2D(false);
    } else {
      viewer.scene.morphTo2D(0.8);
      setIs2D(true);
    }
    // The morph is animated; re-enable once it settles.
    setTimeout(() => setBusy(false), 1000);
  }

  return (
    <button
      onClick={toggle}
      title={is2D ? "Switch to 3D view" : "Switch to 2D view"}
      aria-label={is2D ? "Switch to 3D view" : "Switch to 2D view"}
      className="px-2.5 py-2 bg-[#161616]/90 rounded-lg shadow-lg border border-white/10 text-white text-xs font-bold hover:bg-[#161616] transition-colors"
    >
      {is2D ? "3D" : "2D"}
    </button>
  );
}
