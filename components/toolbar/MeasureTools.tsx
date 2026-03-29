"use client";

import { useEffect, useRef, useCallback } from "react";
import { useCesium } from "@/components/cesium/CesiumContext";

export default function MeasureTools() {
  const { viewerRef, measureMode, setMeasureMode } = useCesium();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handlerRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pointsRef = useRef<any[]>([]);
  const entityIdsRef = useRef<string[]>([]);

  const clearMeasurements = useCallback(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    for (const id of entityIdsRef.current) {
      const entity = viewer.entities.getById(id);
      if (entity) viewer.entities.remove(entity);
    }
    entityIdsRef.current = [];
    pointsRef.current = [];
  }, [viewerRef]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || measureMode === "none") {
      if (handlerRef.current) {
        handlerRef.current.destroy();
        handlerRef.current = null;
      }
      return;
    }

    async function setupHandler() {
      const Cesium = await import("cesium");

      if (handlerRef.current) {
        handlerRef.current.destroy();
      }

      clearMeasurements();

      const handler = new Cesium.ScreenSpaceEventHandler(viewer!.scene.canvas);
      handlerRef.current = handler;

      handler.setInputAction(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (click: { position: any }) => {
          const ray = viewer!.camera.getPickRay(click.position);
          if (!ray) return;
          const cartesian = viewer!.scene.globe.pick(ray, viewer!.scene);
          if (!cartesian) return;

          pointsRef.current.push(cartesian);
          const ptId = `measure-pt-${Date.now()}`;
          entityIdsRef.current.push(ptId);

          viewer!.entities.add({
            id: ptId,
            position: cartesian,
            point: {
              pixelSize: 8,
              color: Cesium.Color.YELLOW,
              outlineColor: Cesium.Color.BLACK,
              outlineWidth: 1,
              heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
              disableDepthTestDistance: Number.POSITIVE_INFINITY,
            },
          });

          if (measureMode === "distance" && pointsRef.current.length >= 2) {
            const pts = pointsRef.current;
            const lineId = `measure-line-${Date.now()}`;
            entityIdsRef.current.push(lineId);

            // Calculate distance
            const carto1 = Cesium.Cartographic.fromCartesian(pts[pts.length - 2]);
            const carto2 = Cesium.Cartographic.fromCartesian(pts[pts.length - 1]);
            const geodesic = new Cesium.EllipsoidGeodesic(carto1, carto2);
            const distMeters = geodesic.surfaceDistance;
            const distFeet = distMeters * 3.28084;
            const distMiles = distMeters / 1609.344;

            let label: string;
            if (distMiles >= 0.1) {
              label = `${distMiles.toFixed(2)} mi`;
            } else {
              label = `${Math.round(distFeet).toLocaleString()} ft`;
            }

            // Midpoint for label
            const mid = Cesium.Cartesian3.midpoint(
              pts[pts.length - 2],
              pts[pts.length - 1],
              new Cesium.Cartesian3()
            );

            viewer!.entities.add({
              id: lineId,
              polyline: {
                positions: [pts[pts.length - 2], pts[pts.length - 1]],
                width: 3,
                material: Cesium.Color.YELLOW,
                clampToGround: true,
              },
            });

            const labelId = `measure-label-${Date.now()}`;
            entityIdsRef.current.push(labelId);
            viewer!.entities.add({
              id: labelId,
              position: mid,
              label: {
                text: label,
                font: "12px sans-serif",
                fillColor: Cesium.Color.WHITE,
                outlineColor: Cesium.Color.BLACK,
                outlineWidth: 2,
                style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
                disableDepthTestDistance: Number.POSITIVE_INFINITY,
                pixelOffset: new Cesium.Cartesian2(0, -15),
              },
            });
          }

          if (measureMode === "area" && pointsRef.current.length >= 3) {
            // Remove old polygon if exists
            const oldPoly = entityIdsRef.current.find((id) => id.startsWith("measure-poly-"));
            if (oldPoly) {
              const old = viewer!.entities.getById(oldPoly);
              if (old) viewer!.entities.remove(old);
              entityIdsRef.current = entityIdsRef.current.filter((id) => id !== oldPoly);
            }
            const oldArea = entityIdsRef.current.find((id) => id.startsWith("measure-area-"));
            if (oldArea) {
              const old = viewer!.entities.getById(oldArea);
              if (old) viewer!.entities.remove(old);
              entityIdsRef.current = entityIdsRef.current.filter((id) => id !== oldArea);
            }

            const polyId = `measure-poly-${Date.now()}`;
            entityIdsRef.current.push(polyId);

            viewer!.entities.add({
              id: polyId,
              polygon: {
                hierarchy: new Cesium.PolygonHierarchy(pointsRef.current),
                material: Cesium.Color.YELLOW.withAlpha(0.3),
                outline: true,
                outlineColor: Cesium.Color.YELLOW,
                heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
              },
            });

            // Calculate area using spherical polygon
            const cartos = pointsRef.current.map((p) => Cesium.Cartographic.fromCartesian(p));
            const positions2D = cartos.map((c) => [
              Cesium.Math.toDegrees(c.longitude),
              Cesium.Math.toDegrees(c.latitude),
            ]);
            // Approximate area with shoelace on projected coords
            let area = 0;
            const n = positions2D.length;
            for (let i = 0; i < n; i++) {
              const j = (i + 1) % n;
              area += positions2D[i][0] * positions2D[j][1];
              area -= positions2D[j][0] * positions2D[i][1];
            }
            // Convert from deg^2 to m^2 (approx at mid-latitude)
            const midLat = cartos.reduce((s, c) => s + c.latitude, 0) / n;
            const mPerDegLat = 111320;
            const mPerDegLon = 111320 * Math.cos(midLat);
            const areaM2 = Math.abs(area / 2) * mPerDegLat * mPerDegLon;
            const areaAcres = areaM2 / 4046.86;
            const areaSF = areaM2 * 10.7639;

            let areaLabel: string;
            if (areaAcres >= 1) {
              areaLabel = `${areaAcres.toFixed(2)} acres`;
            } else {
              areaLabel = `${Math.round(areaSF).toLocaleString()} SF`;
            }

            // Centroid for label
            const centroidLat = cartos.reduce((s, c) => s + c.latitude, 0) / n;
            const centroidLon = cartos.reduce((s, c) => s + c.longitude, 0) / n;
            const centroid = Cesium.Cartesian3.fromRadians(centroidLon, centroidLat);

            const areaLabelId = `measure-area-${Date.now()}`;
            entityIdsRef.current.push(areaLabelId);
            viewer!.entities.add({
              id: areaLabelId,
              position: centroid,
              label: {
                text: areaLabel,
                font: "13px sans-serif",
                fillColor: Cesium.Color.WHITE,
                outlineColor: Cesium.Color.BLACK,
                outlineWidth: 2,
                style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
                disableDepthTestDistance: Number.POSITIVE_INFINITY,
              },
            });
          }
        },
        Cesium.ScreenSpaceEventType.LEFT_CLICK
      );

      // Right-click to finish
      handler.setInputAction(
        () => {
          setMeasureMode("none");
        },
        Cesium.ScreenSpaceEventType.RIGHT_CLICK
      );
    }

    setupHandler();

    return () => {
      if (handlerRef.current) {
        handlerRef.current.destroy();
        handlerRef.current = null;
      }
    };
  }, [measureMode, viewerRef, clearMeasurements, setMeasureMode]);

  return null;
}

export { MeasureTools };
