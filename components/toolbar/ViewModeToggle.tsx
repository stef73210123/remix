"use client";

import { useState } from "react";
import { useCesium } from "@/components/cesium/CesiumContext";

/** Google-Maps-style 2D / 3D globe toggle. Morphs the Cesium scene between a
 *  flat 2D map and the 3D globe while preserving the focal point + zoom.
 *  The label shows the mode you'll switch TO. */
export default function ViewModeToggle() {
  const { viewMode, toggleViewMode } = useCesium();
  const [busy, setBusy] = useState(false);

  async function onClick() {
    if (busy) return;
    setBusy(true);
    await toggleViewMode();
    // The morph animates (~0.5s); re-enable once it settles.
    setTimeout(() => setBusy(false), 900);
  }

  const next = viewMode === "2D" ? "3D" : "2D";
  return (
    <button
      onClick={onClick}
      title={`Switch to ${next} view`}
      aria-label={`Switch to ${next} view`}
      className="px-2.5 py-2 bg-[#161616]/90 rounded-lg shadow-lg border border-white/10 text-white text-xs font-bold hover:bg-[#161616] transition-colors"
    >
      {next}
    </button>
  );
}
