"use client";

import { useEffect, useRef, useCallback } from "react";
import { useCesium } from "./CesiumContext";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface HeatmapDataPoint {
  lat: number;
  lng: number;
  value: number;
}

interface HeatmapLayerProps {
  data: Array<HeatmapDataPoint>;
  visible: boolean;
  colorScheme?: "price" | "density" | "vacancy";
}

const GRID_SIZE = 20;

type ColorStop = [number, number, number, number]; // [r, g, b, a]

function getColorSchemeStops(
  scheme: "price" | "density" | "vacancy"
): { low: ColorStop; mid: ColorStop; high: ColorStop } {
  switch (scheme) {
    case "price":
      // green -> yellow -> red
      return {
        low: [0, 200, 0, 140],
        mid: [255, 255, 0, 160],
        high: [255, 0, 0, 180],
      };
    case "density":
      // blue -> purple
      return {
        low: [50, 50, 255, 100],
        mid: [140, 50, 200, 150],
        high: [200, 0, 255, 200],
      };
    case "vacancy":
      // green -> orange -> red
      return {
        low: [0, 200, 0, 120],
        mid: [255, 165, 0, 160],
        high: [255, 0, 0, 200],
      };
  }
}

function interpolateColor(t: number, stops: ReturnType<typeof getColorSchemeStops>): ColorStop {
  // t is 0..1
  const clamped = Math.max(0, Math.min(1, t));
  if (clamped <= 0.5) {
    const ratio = clamped / 0.5;
    return [
      Math.round(stops.low[0] + (stops.mid[0] - stops.low[0]) * ratio),
      Math.round(stops.low[1] + (stops.mid[1] - stops.low[1]) * ratio),
      Math.round(stops.low[2] + (stops.mid[2] - stops.low[2]) * ratio),
      Math.round(stops.low[3] + (stops.mid[3] - stops.low[3]) * ratio),
    ];
  } else {
    const ratio = (clamped - 0.5) / 0.5;
    return [
      Math.round(stops.mid[0] + (stops.high[0] - stops.mid[0]) * ratio),
      Math.round(stops.mid[1] + (stops.high[1] - stops.mid[1]) * ratio),
      Math.round(stops.mid[2] + (stops.high[2] - stops.mid[2]) * ratio),
      Math.round(stops.mid[3] + (stops.high[3] - stops.mid[3]) * ratio),
    ];
  }
}

function HeatmapLayer({ data, visible, colorScheme = "density" }: HeatmapLayerProps) {
  const { viewerRef } = useCesium();
  const entityIdsRef = useRef<string[]>([]);

  const removeEntities = useCallback(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    for (const id of entityIdsRef.current) {
      const entity = viewer.entities.getById(id);
      if (entity) {
        viewer.entities.remove(entity);
      }
    }
    entityIdsRef.current = [];
  }, [viewerRef]);

  useEffect(() => {
    if (!visible || data.length === 0) {
      removeEntities();
      return;
    }

    const viewer = viewerRef.current;
    if (!viewer) return;

    let cancelled = false;

    (async () => {
      const Cesium = await import("cesium");

      if (cancelled) return;

      // Remove any previous heatmap entities before adding new ones
      removeEntities();

      // Compute bounding box of data points
      let minLat = Infinity;
      let maxLat = -Infinity;
      let minLng = Infinity;
      let maxLng = -Infinity;

      for (const point of data) {
        if (point.lat < minLat) minLat = point.lat;
        if (point.lat > maxLat) maxLat = point.lat;
        if (point.lng < minLng) minLng = point.lng;
        if (point.lng > maxLng) maxLng = point.lng;
      }

      // Add a small padding so edge points aren't right on the boundary
      const latPadding = (maxLat - minLat) * 0.05 || 0.001;
      const lngPadding = (maxLng - minLng) * 0.05 || 0.001;
      minLat -= latPadding;
      maxLat += latPadding;
      minLng -= lngPadding;
      maxLng += lngPadding;

      const cellHeight = (maxLat - minLat) / GRID_SIZE;
      const cellWidth = (maxLng - minLng) / GRID_SIZE;

      // Aggregate data into grid cells
      const grid: { sum: number; count: number }[][] = Array.from(
        { length: GRID_SIZE },
        () =>
          Array.from({ length: GRID_SIZE }, () => ({
            sum: 0,
            count: 0,
          }))
      );

      for (const point of data) {
        const row = Math.min(
          Math.floor((point.lat - minLat) / cellHeight),
          GRID_SIZE - 1
        );
        const col = Math.min(
          Math.floor((point.lng - minLng) / cellWidth),
          GRID_SIZE - 1
        );
        grid[row][col].sum += point.value;
        grid[row][col].count += 1;
      }

      // Find max aggregated value for normalization
      let maxValue = 0;
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          if (grid[r][c].count > 0) {
            const avg = grid[r][c].sum / grid[r][c].count;
            if (avg > maxValue) maxValue = avg;
          }
        }
      }

      if (maxValue === 0) return;
      if (cancelled) return;

      const stops = getColorSchemeStops(colorScheme);
      const newEntityIds: string[] = [];

      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          const cell = grid[r][c];
          if (cell.count === 0) continue;

          const avg = cell.sum / cell.count;
          const t = avg / maxValue;
          const [red, green, blue, alpha] = interpolateColor(t, stops);

          const south = minLat + r * cellHeight;
          const north = south + cellHeight;
          const west = minLng + c * cellWidth;
          const east = west + cellWidth;

          const entityId = `heatmap-cell-${r}-${c}`;

          const entity = viewer.entities.add({
            id: entityId,
            rectangle: {
              coordinates: Cesium.Rectangle.fromDegrees(west, south, east, north),
              material: new Cesium.ColorMaterialProperty(
                new Cesium.Color(red / 255, green / 255, blue / 255, alpha / 255)
              ),
              height: 0,
              outline: false,
              classificationType: Cesium.ClassificationType.BOTH,
            },
          });

          if (entity) {
            newEntityIds.push(entityId);
          }
        }
      }

      entityIdsRef.current = newEntityIds;
    })();

    return () => {
      cancelled = true;
      removeEntities();
    };
  }, [data, visible, colorScheme, viewerRef, removeEntities]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      removeEntities();
    };
  }, [removeEntities]);

  return null;
}

export default HeatmapLayer;
