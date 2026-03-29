"use client";

import { useEffect, useRef } from "react";
import { useCesium } from "./CesiumContext";
import { MOCK_PROPERTIES } from "@/lib/data/properties";
import { PROPERTY_TYPE_COLORS, FilterState, Property } from "@/types/cesium";
import { getBuildingStyleConditions } from "./BuildingStyles";
import { DEFAULT_VIEW } from "@/lib/cesium-config";
import { resolveLayer } from "@/lib/layer-resolver";

function matchesFilter(property: Property, filter: FilterState): boolean {
  if (filter.propertyTypes && filter.propertyTypes.length > 0) {
    if (!filter.propertyTypes.includes(property.propertyType)) return false;
  }
  if (filter.yearBuiltMin && property.yearBuilt && property.yearBuilt < filter.yearBuiltMin) return false;
  if (filter.yearBuiltMax && property.yearBuilt && property.yearBuilt > filter.yearBuiltMax) return false;
  if (filter.unitsMin && property.units && property.units < filter.unitsMin) return false;
  if (filter.unitsMax && property.units && property.units > filter.unitsMax) return false;
  if (filter.buildingSizeMin && property.buildingSize && property.buildingSize < filter.buildingSizeMin) return false;
  if (filter.buildingSizeMax && property.buildingSize && property.buildingSize > filter.buildingSizeMax) return false;
  if (filter.bedroomsMin && property.bedrooms && property.bedrooms < filter.bedroomsMin) return false;
  if (filter.bedroomsMax && property.bedrooms && property.bedrooms > filter.bedroomsMax) return false;
  if (filter.parcelSizeMin && property.landArea.sqft < filter.parcelSizeMin) return false;
  if (filter.parcelSizeMax && property.landArea.sqft > filter.parcelSizeMax) return false;
  if (filter.neighborhood && property.neighborhood !== filter.neighborhood) return false;
  if (filter.zoningDistrict && property.zoningDistrict !== filter.zoningDistrict) return false;
  return true;
}

export default function CesiumViewerComponent() {
  const containerRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);
  // Track active imagery layers for add/remove
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const activeImageryRef = useRef<Map<string, any>>(new Map());
  const {
    viewerRef,
    buildingsTilesetRef,
    setSelectedProperty,
    setLeftPanelOpen,
    showBuildings,
    showParcels,
    basemapMode,
    flyToProperty,
    activeLayers,
    filterState,
    addToComparison,
  } = useCesium();

  useEffect(() => {
    if (initialized.current || !containerRef.current) return;
    initialized.current = true;

    async function init() {
      const Cesium = await import("cesium");

      (window as unknown as Record<string, unknown>).CESIUM_BASE_URL = "/cesium/";

      const token = process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN;
      if (token && token !== "your_cesium_ion_token_here") {
        Cesium.Ion.defaultAccessToken = token;
      }

      const viewer = new Cesium.Viewer(containerRef.current!, {
        terrain: Cesium.Terrain.fromWorldTerrain(),
        animation: false,
        baseLayerPicker: false,
        fullscreenButton: false,
        geocoder: false,
        homeButton: false,
        infoBox: false,
        sceneModePicker: false,
        selectionIndicator: false,
        timeline: false,
        navigationHelpButton: false,
        creditContainer: document.createElement("div"),
      });

      viewerRef.current = viewer;

      // Set initial camera view to Washington DC
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(
          DEFAULT_VIEW.lng,
          DEFAULT_VIEW.lat,
          DEFAULT_VIEW.height
        ),
        orientation: {
          heading: Cesium.Math.toRadians(DEFAULT_VIEW.heading),
          pitch: Cesium.Math.toRadians(DEFAULT_VIEW.pitch),
          roll: 0,
        },
        duration: 0,
      });

      // Add OSM Buildings
      try {
        const tileset = await Cesium.Cesium3DTileset.fromIonAssetId(96188);
        viewer.scene.primitives.add(tileset);
        buildingsTilesetRef.current = tileset;

        // Apply building color styles
        const styleConditions = getBuildingStyleConditions();
        tileset.style = new Cesium.Cesium3DTileStyle(styleConditions);
      } catch (e) {
        console.warn("Could not load OSM Buildings:", e);
      }

      // Add property markers
      for (const property of MOCK_PROPERTIES) {
        const color =
          PROPERTY_TYPE_COLORS[property.propertyType] || "#2980b9";
        const cesiumColor = Cesium.Color.fromCssColorString(color);

        viewer.entities.add({
          id: `property-${property.id}`,
          position: Cesium.Cartesian3.fromDegrees(
            property.lng,
            property.lat,
            0
          ),
          point: {
            pixelSize: 10,
            color: cesiumColor,
            outlineColor: Cesium.Color.WHITE,
            outlineWidth: 2,
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
          properties: {
            propertyId: property.id,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any,
        });
      }

      // Click handler — shift+click adds to comparison
      const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
      handler.setInputAction(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (movement: { position: any }) => {
          const picked = viewer.scene.pick(movement.position);
          if (Cesium.defined(picked) && picked.id) {
            const entityId = picked.id.id as string;
            if (entityId?.startsWith("property-")) {
              const propId = entityId.replace("property-", "");
              const property = MOCK_PROPERTIES.find((p) => p.id === propId);
              if (property) {
                setSelectedProperty(property);
                setLeftPanelOpen(true);
                flyToProperty(property);
              }
            }
          }
        },
        Cesium.ScreenSpaceEventType.LEFT_CLICK
      );

      // Shift+click for comparison
      handler.setInputAction(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (movement: { position: any }) => {
          const picked = viewer.scene.pick(movement.position);
          if (Cesium.defined(picked) && picked.id) {
            const entityId = picked.id.id as string;
            if (entityId?.startsWith("property-")) {
              const propId = entityId.replace("property-", "");
              const property = MOCK_PROPERTIES.find((p) => p.id === propId);
              if (property) {
                addToComparison(property);
              }
            }
          }
        },
        Cesium.ScreenSpaceEventType.LEFT_CLICK,
        Cesium.KeyboardEventModifier.SHIFT
      );
    }

    init();

    return () => {
      if (viewerRef.current && !viewerRef.current.isDestroyed()) {
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Toggle buildings visibility
  useEffect(() => {
    if (buildingsTilesetRef.current) {
      buildingsTilesetRef.current.show = showBuildings;
    }
  }, [showBuildings, buildingsTilesetRef]);

  // Toggle parcels visibility (entities)
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    viewer.entities.values.forEach((entity: any) => {
      if (entity.id?.startsWith("property-")) {
        entity.show = showParcels;
      }
    });
  }, [showParcels, viewerRef]);

  // Switch basemap
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    async function switchBasemap() {
      const Cesium = await import("cesium");
      const layers = viewer!.imageryLayers;
      // Remove only the base layer (index 0), keep overlay layers
      if (layers.length > 0) {
        layers.remove(layers.get(0));
      }

      if (basemapMode === "satellite") {
        try {
          const provider = await Cesium.IonImageryProvider.fromAssetId(2);
          layers.addImageryProvider(provider, 0);
        } catch {
          layers.addImageryProvider(
            new Cesium.OpenStreetMapImageryProvider({
              url: "https://tile.openstreetmap.org/",
            }),
            0
          );
        }
      } else {
        layers.addImageryProvider(
          new Cesium.OpenStreetMapImageryProvider({
            url: "https://tile.openstreetmap.org/",
          }),
          0
        );
      }
    }

    switchBasemap();
  }, [basemapMode, viewerRef]);

  // 11A: Sync active layers to Cesium imagery
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    async function syncLayers() {
      const Cesium = await import("cesium");
      const currentIds = new Set(activeLayers);
      const existingIds = new Set(activeImageryRef.current.keys());

      // Remove layers no longer active
      for (const id of existingIds) {
        if (!currentIds.has(id)) {
          const layer = activeImageryRef.current.get(id);
          if (layer) {
            viewer.imageryLayers.remove(layer);
            activeImageryRef.current.delete(id);
          }
        }
      }

      // Add newly active layers
      for (const id of currentIds) {
        if (!existingIds.has(id)) {
          const resolved = resolveLayer(id);
          if (resolved && resolved.serviceType === "arcgis") {
            try {
              const provider = await Cesium.ArcGisMapServerImageryProvider.fromUrl(
                resolved.serviceUrl,
                {
                  layers: resolved.layerIndex !== undefined ? String(resolved.layerIndex) : undefined,
                  enablePickFeatures: true,
                }
              );
              const imageryLayer = viewer.imageryLayers.addImageryProvider(provider);
              imageryLayer.alpha = resolved.opacity;
              activeImageryRef.current.set(id, imageryLayer);
            } catch (e) {
              console.warn(`Failed to add layer ${id}:`, e);
            }
          }
        }
      }
    }

    syncLayers();
  }, [activeLayers, viewerRef]);

  // 11B: Apply filter state to property entity visibility
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    viewer.entities.values.forEach((entity: any) => {
      if (entity.id?.startsWith("property-")) {
        if (!filterState) {
          // No filter — show all (respecting showParcels)
          entity.show = showParcels;
          return;
        }
        const propId = entity.id.replace("property-", "");
        const property = MOCK_PROPERTIES.find((p) => p.id === propId);
        if (property) {
          entity.show = showParcels && matchesFilter(property, filterState);
        }
      }
    });
  }, [filterState, showParcels, viewerRef]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 w-full h-full"
      style={{ zIndex: 0 }}
    />
  );
}
