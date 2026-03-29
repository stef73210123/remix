"use client";

import { useEffect } from "react";
import { useCesium } from "@/components/cesium/CesiumContext";

export default function KeyboardShortcuts() {
  const {
    rightPanel,
    setRightPanel,
    measureMode,
    setMeasureMode,
    setSelectedProperty,
    setLeftPanelOpen,
  } = useCesium();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Don't activate when typing in inputs
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      if ((e.target as HTMLElement)?.isContentEditable) return;

      const key = e.key.toUpperCase();

      switch (key) {
        case "L":
          setRightPanel(rightPanel === "layers" ? null : "layers");
          break;
        case "F":
          setRightPanel(rightPanel === "filters" ? null : "filters");
          break;
        case "G":
          setRightPanel(rightPanel === "geo-query" ? null : "geo-query");
          break;
        case "C":
          setRightPanel(rightPanel === "comparison" ? null : "comparison");
          break;
        case "K":
          setRightPanel(rightPanel === "listings" ? null : "listings");
          break;
        case "M":
          // Cycle: none -> distance -> area -> none
          if (measureMode === "none") {
            setMeasureMode("distance");
          } else if (measureMode === "distance") {
            setMeasureMode("area");
          } else {
            setMeasureMode("none");
          }
          break;
        case "H":
          if (document.fullscreenElement) {
            document.exitFullscreen();
          } else {
            document.documentElement.requestFullscreen();
          }
          break;
        case "ESCAPE":
          setRightPanel(null);
          setLeftPanelOpen(false);
          setSelectedProperty(null);
          setMeasureMode("none");
          break;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    rightPanel,
    setRightPanel,
    measureMode,
    setMeasureMode,
    setSelectedProperty,
    setLeftPanelOpen,
  ]);

  return null;
}
