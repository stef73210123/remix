"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useCesium } from "@/components/cesium/CesiumContext";
import {
  Pencil,
  Pentagon,
  Minus,
  MapPin,
  Type,
  Trash2,
  Download,
  Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Annotation,
  createAnnotation,
  saveAnnotations,
  loadAnnotations,
  exportAsGeoJSON,
  importFromGeoJSON,
} from "@/lib/annotations";

type DrawMode = "none" | "polygon" | "polyline" | "point" | "text";

export default function DrawTools() {
  const { viewerRef } = useCesium();
  const [drawMode, setDrawMode] = useState<DrawMode>("none");
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handlerRef = useRef<any>(null);
  const drawPointsRef = useRef<Array<{ lat: number; lng: number }>>([]);
  const entityIdsRef = useRef<string[]>([]);

  // Load annotations from localStorage on mount
  useEffect(() => {
    setAnnotations(loadAnnotations());
  }, []);

  // Persist annotations whenever they change
  useEffect(() => {
    saveAnnotations(annotations);
  }, [annotations]);

  const addAnnotation = useCallback(
    (annotation: Annotation) => {
      setAnnotations((prev) => {
        const next = [...prev, annotation];
        return next;
      });
    },
    []
  );

  const clearAll = useCallback(() => {
    const viewer = viewerRef.current;
    if (viewer) {
      // Remove rendered annotation entities
      for (const id of entityIdsRef.current) {
        const entity = viewer.entities.getById(id);
        if (entity) viewer.entities.remove(entity);
      }
      entityIdsRef.current = [];
    }
    setAnnotations([]);
    setDrawMode("none");
  }, [viewerRef]);

  const handleExport = useCallback(() => {
    const geojson = exportAsGeoJSON(annotations);
    const blob = new Blob([JSON.stringify(geojson, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "annotations.geojson";
    a.click();
    URL.revokeObjectURL(url);
  }, [annotations]);

  const handleImport = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const geojson = JSON.parse(reader.result as string);
          const imported = importFromGeoJSON(geojson);
          setAnnotations((prev) => [...prev, ...imported]);
        } catch (err) {
          console.error("Failed to import GeoJSON:", err);
        }
      };
      reader.readAsText(file);
      // Reset so the same file can be re-imported
      e.target.value = "";
    },
    []
  );

  // Set up click handler when draw mode changes
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || drawMode === "none") {
      if (handlerRef.current) {
        handlerRef.current.destroy();
        handlerRef.current = null;
      }
      drawPointsRef.current = [];
      return;
    }

    async function setupHandler() {
      const Cesium = await import("cesium");

      if (handlerRef.current) {
        handlerRef.current.destroy();
      }
      drawPointsRef.current = [];

      const handler = new Cesium.ScreenSpaceEventHandler(
        viewer!.scene.canvas
      );
      handlerRef.current = handler;

      handler.setInputAction(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (click: { position: any }) => {
          const ray = viewer!.camera.getPickRay(click.position);
          if (!ray) return;
          const cartesian = viewer!.scene.globe.pick(ray, viewer!.scene);
          if (!cartesian) return;

          const carto = Cesium.Cartographic.fromCartesian(cartesian);
          const lat = Cesium.Math.toDegrees(carto.latitude);
          const lng = Cesium.Math.toDegrees(carto.longitude);

          if (drawMode === "point" || drawMode === "text") {
            const label =
              drawMode === "text"
                ? prompt("Enter text label:") || "Label"
                : undefined;

            const annotation = createAnnotation(
              drawMode,
              [{ lat, lng }],
              { label, color: "#ffcc00" }
            );

            const entityId = `annotation-${annotation.id}`;
            entityIdsRef.current.push(entityId);

            if (drawMode === "point") {
              viewer!.entities.add({
                id: entityId,
                position: cartesian,
                point: {
                  pixelSize: 10,
                  color: Cesium.Color.YELLOW,
                  outlineColor: Cesium.Color.BLACK,
                  outlineWidth: 1,
                  heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
                  disableDepthTestDistance: Number.POSITIVE_INFINITY,
                },
              });
            } else {
              viewer!.entities.add({
                id: entityId,
                position: cartesian,
                label: {
                  text: label,
                  font: "14px sans-serif",
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

            addAnnotation(annotation);
          } else {
            // polygon or polyline - accumulate points
            drawPointsRef.current.push({ lat, lng });

            const ptId = `draw-pt-${Date.now()}-${drawPointsRef.current.length}`;
            entityIdsRef.current.push(ptId);
            viewer!.entities.add({
              id: ptId,
              position: cartesian,
              point: {
                pixelSize: 6,
                color: Cesium.Color.CYAN,
                outlineColor: Cesium.Color.BLACK,
                outlineWidth: 1,
                heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
                disableDepthTestDistance: Number.POSITIVE_INFINITY,
              },
            });
          }
        },
        Cesium.ScreenSpaceEventType.LEFT_CLICK
      );

      // Right-click to finish polygon/polyline
      handler.setInputAction(() => {
        if (
          (drawMode === "polygon" || drawMode === "polyline") &&
          drawPointsRef.current.length >= 2
        ) {
          const coords = [...drawPointsRef.current];
          const annotation = createAnnotation(drawMode, coords, {
            color: "#ffcc00",
          });

          const entityId = `annotation-${annotation.id}`;
          entityIdsRef.current.push(entityId);

          if (drawMode === "polygon" && coords.length >= 3) {
            const positions = coords.map((c) =>
              Cesium.Cartesian3.fromDegrees(c.lng, c.lat)
            );
            viewer!.entities.add({
              id: entityId,
              polygon: {
                hierarchy: new Cesium.PolygonHierarchy(positions),
                material: Cesium.Color.YELLOW.withAlpha(0.3),
                outline: true,
                outlineColor: Cesium.Color.YELLOW,
                heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
              },
            });
          } else {
            const positions = coords.map((c) =>
              Cesium.Cartesian3.fromDegrees(c.lng, c.lat)
            );
            viewer!.entities.add({
              id: entityId,
              polyline: {
                positions,
                width: 3,
                material: Cesium.Color.YELLOW,
                clampToGround: true,
              },
            });
          }

          addAnnotation(annotation);
          drawPointsRef.current = [];
        }
        setDrawMode("none");
      }, Cesium.ScreenSpaceEventType.RIGHT_CLICK);
    }

    setupHandler();

    return () => {
      if (handlerRef.current) {
        handlerRef.current.destroy();
        handlerRef.current = null;
      }
    };
  }, [drawMode, viewerRef, addAnnotation]);

  const toggleMode = (mode: DrawMode) => {
    setDrawMode((prev) => (prev === mode ? "none" : mode));
  };

  return (
    <div className="absolute top-4 right-4 z-20 flex flex-col gap-1 bg-[#1a2332]/90 backdrop-blur-sm rounded-lg px-2 py-2 shadow-lg border border-white/10">
      <div className="flex items-center justify-between px-1 pb-1 border-b border-white/10 mb-1">
        <span className="text-[10px] font-semibold text-white/50 uppercase tracking-wider flex items-center gap-1.5">
          <Pencil className="w-3 h-3" />
          Draw
        </span>
        {annotations.length > 0 && (
          <span className="text-[10px] text-white/40">
            {annotations.length}
          </span>
        )}
      </div>

      <DrawButton
        icon={<Pentagon className="w-4 h-4" />}
        label="Polygon"
        active={drawMode === "polygon"}
        onClick={() => toggleMode("polygon")}
      />
      <DrawButton
        icon={<Minus className="w-4 h-4" />}
        label="Line"
        active={drawMode === "polyline"}
        onClick={() => toggleMode("polyline")}
      />
      <DrawButton
        icon={<MapPin className="w-4 h-4" />}
        label="Marker"
        active={drawMode === "point"}
        onClick={() => toggleMode("point")}
      />
      <DrawButton
        icon={<Type className="w-4 h-4" />}
        label="Text"
        active={drawMode === "text"}
        onClick={() => toggleMode("text")}
      />

      <div className="w-full h-px bg-white/10 my-1" />

      <DrawButton
        icon={<Trash2 className="w-4 h-4" />}
        label="Clear All"
        active={false}
        onClick={clearAll}
      />
      <DrawButton
        icon={<Download className="w-4 h-4" />}
        label="Export"
        active={false}
        onClick={handleExport}
        disabled={annotations.length === 0}
      />
      <DrawButton
        icon={<Upload className="w-4 h-4" />}
        label="Import"
        active={false}
        onClick={() => fileInputRef.current?.click()}
      />

      <input
        ref={fileInputRef}
        type="file"
        accept=".geojson,.json"
        className="hidden"
        onChange={handleImport}
      />
    </div>
  );
}

function DrawButton({
  icon,
  label,
  active,
  onClick,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors w-full text-left",
        disabled && "opacity-40 cursor-not-allowed",
        active
          ? "bg-white/20 text-white"
          : "text-white/60 hover:text-white hover:bg-white/10"
      )}
    >
      {icon}
      {label}
    </button>
  );
}
