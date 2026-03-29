"use client";

import { useEffect, useRef } from "react";
import { useCesium } from "./CesiumContext";
import { MOCK_PROPERTIES } from "@/lib/data/properties";
import { PROPERTY_TYPE_COLORS, FilterState, Property } from "@/types/cesium";
import { getBuildingStyleConditions } from "./BuildingStyles";
import { DEFAULT_VIEW, OVERPASS_API, OSM_PLACE_CATEGORIES } from "@/lib/cesium-config";
import { resolveLayer } from "@/lib/layer-resolver";

function getBuildingFootprintColor(buildingType: string): string {
  const mapping: Record<string, string> = {
    commercial: "#F05959",
    retail: "#F05959",
    office: "#F05959",
    hotel: "#F05959",
    apartments: "#F0E059",
    residential: "#F0E059",
    house: "#F0E059",
    detached: "#F0E059",
    terrace: "#F0E059",
    industrial: "#662D91",
    warehouse: "#662D91",
    hospital: "#00A99D",
    school: "#00A99D",
    university: "#00A99D",
    church: "#00A99D",
    government: "#00A99D",
    civic: "#00A99D",
    garage: "#C1B9B0",
    parking: "#C1B9B0",
  };
  return mapping[buildingType] || "#8899aa";
}

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
    msBuildingsTilesetRef,
    setSelectedProperty,
    setLeftPanelOpen,
    showBuildings,
    buildingSource,
    showOsmFootprints,
    showOsmPlaces,
    osmPlaceCategories,
    showParcels,
    basemapMode,
    flyToProperty,
    activeLayers,
    filterState,
    addToComparison,
    activeRegion,
  } = useCesium();

  // Track OSM footprint/places entities for cleanup
  const osmFootprintIdsRef = useRef<string[]>([]);
  const osmPlaceIdsRef = useRef<string[]>([]);
  const osmPlacesLoadedBboxRef = useRef<string>("");
  const osmFootprintsLoadedBboxRef = useRef<string>("");

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

      // Add OSM 3D Buildings (Cesium Ion asset 96188)
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

      // Add Microsoft 3D Building Footprints (Cesium Ion global buildings)
      // Uses Google Photorealistic 3D Tiles as the source for detailed 3D buildings
      try {
        const msTileset = await Cesium.Cesium3DTileset.fromIonAssetId(2275207);
        viewer.scene.primitives.add(msTileset);
        msBuildingsTilesetRef.current = msTileset;
        // Initially hidden — user can toggle between OSM and Microsoft
        msTileset.show = false;
      } catch (e) {
        console.warn("Could not load Microsoft/Google 3D buildings:", e);
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

  // Toggle buildings visibility & source (OSM vs Microsoft)
  useEffect(() => {
    if (buildingsTilesetRef.current) {
      buildingsTilesetRef.current.show =
        showBuildings && buildingSource === "osm";
    }
    if (msBuildingsTilesetRef.current) {
      msBuildingsTilesetRef.current.show =
        showBuildings && buildingSource === "microsoft";
    }
  }, [showBuildings, buildingSource, buildingsTilesetRef, msBuildingsTilesetRef]);

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

  // OSM Building Footprints (2D polygons from Overpass API)
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    // Clear existing OSM footprint entities
    for (const id of osmFootprintIdsRef.current) {
      const entity = viewer.entities.getById(id);
      if (entity) viewer.entities.remove(entity);
    }
    osmFootprintIdsRef.current = [];

    if (!showOsmFootprints) return;

    async function loadOsmFootprints() {
      const Cesium = await import("cesium");
      // Get current camera bounding box
      const rect = viewer!.camera.computeViewRectangle();
      if (!rect) return;
      const south = Cesium.Math.toDegrees(rect.south);
      const west = Cesium.Math.toDegrees(rect.west);
      const north = Cesium.Math.toDegrees(rect.north);
      const east = Cesium.Math.toDegrees(rect.east);

      // Limit query area to prevent huge responses
      const latSpan = north - south;
      const lonSpan = east - west;
      if (latSpan > 0.05 || lonSpan > 0.05) return; // Only load when zoomed in enough

      const bboxKey = `${south.toFixed(4)},${west.toFixed(4)},${north.toFixed(4)},${east.toFixed(4)}`;
      if (osmFootprintsLoadedBboxRef.current === bboxKey) return;
      osmFootprintsLoadedBboxRef.current = bboxKey;

      const query = `[out:json][timeout:25];way["building"](${south},${west},${north},${east});out body;>;out skel qt;`;
      try {
        const res = await fetch(OVERPASS_API, {
          method: "POST",
          body: `data=${encodeURIComponent(query)}`,
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        });
        if (!res.ok) return;
        const data = await res.json();

        // Build node lookup
        const nodes = new Map<number, { lat: number; lon: number }>();
        for (const el of data.elements) {
          if (el.type === "node") nodes.set(el.id, { lat: el.lat, lon: el.lon });
        }

        // Draw building ways as polygons
        let count = 0;
        for (const el of data.elements) {
          if (el.type !== "way" || !el.nodes || count >= 500) continue;
          const coords: number[] = [];
          let valid = true;
          for (const nid of el.nodes) {
            const node = nodes.get(nid);
            if (!node) { valid = false; break; }
            coords.push(node.lon, node.lat);
          }
          if (!valid || coords.length < 6) continue;

          const id = `osm-fp-${el.id}`;
          osmFootprintIdsRef.current.push(id);

          const buildingType = el.tags?.building || "yes";
          const color = Cesium.Color.fromCssColorString(
            getBuildingFootprintColor(buildingType)
          ).withAlpha(0.6);

          viewer!.entities.add({
            id,
            polygon: {
              hierarchy: Cesium.Cartesian3.fromDegreesArray(coords),
              material: color,
              outline: true,
              outlineColor: color.withAlpha(0.9),
              outlineWidth: 1,
              heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
            },
            properties: {
              osmId: el.id,
              building: buildingType,
              name: el.tags?.name || "",
              address: [el.tags?.["addr:housenumber"], el.tags?.["addr:street"]]
                .filter(Boolean)
                .join(" "),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any,
          });
          count++;
        }
      } catch (e) {
        console.warn("OSM footprints load failed:", e);
      }
    }

    loadOsmFootprints();

    // Re-load when camera stops moving
    const removeListener = viewer.camera.moveEnd.addEventListener(() => {
      if (showOsmFootprints) loadOsmFootprints();
    });

    return () => {
      removeListener();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showOsmFootprints, viewerRef]);

  // OSM Places (POIs from Overpass API)
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    // Clear existing OSM place entities
    for (const id of osmPlaceIdsRef.current) {
      const entity = viewer.entities.getById(id);
      if (entity) viewer.entities.remove(entity);
    }
    osmPlaceIdsRef.current = [];

    if (!showOsmPlaces) return;

    async function loadOsmPlaces() {
      const Cesium = await import("cesium");
      const rect = viewer!.camera.computeViewRectangle();
      if (!rect) return;
      const south = Cesium.Math.toDegrees(rect.south);
      const west = Cesium.Math.toDegrees(rect.west);
      const north = Cesium.Math.toDegrees(rect.north);
      const east = Cesium.Math.toDegrees(rect.east);

      const latSpan = north - south;
      const lonSpan = east - west;
      if (latSpan > 0.1 || lonSpan > 0.1) return; // Only when zoomed in

      const bboxKey = `${south.toFixed(3)},${west.toFixed(3)},${north.toFixed(3)},${east.toFixed(3)}-${[...osmPlaceCategories].sort().join(",")}`;
      if (osmPlacesLoadedBboxRef.current === bboxKey) return;
      osmPlacesLoadedBboxRef.current = bboxKey;

      // Build Overpass query for active categories
      const activeCategories = OSM_PLACE_CATEGORIES.filter((c) =>
        osmPlaceCategories.has(c.key)
      );
      if (activeCategories.length === 0) return;

      const categoryQueries = activeCategories
        .map((cat) => {
          const valueFilter = cat.values.map((v) => `"${cat.key}"="${v}"`).join("");
          // Use union of values
          return cat.values
            .map(
              (v) =>
                `node["${cat.key}"="${v}"](${south},${west},${north},${east});`
            )
            .join("\n");
        })
        .join("\n");

      const query = `[out:json][timeout:25];(\n${categoryQueries}\n);out body 300;`;

      try {
        const res = await fetch(OVERPASS_API, {
          method: "POST",
          body: `data=${encodeURIComponent(query)}`,
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        });
        if (!res.ok) return;
        const data = await res.json();

        for (const el of data.elements) {
          if (el.type !== "node" || !el.lat || !el.lon) continue;

          // Determine category color
          let color = "#999";
          let categoryLabel = "";
          for (const cat of activeCategories) {
            if (el.tags?.[cat.key]) {
              color = cat.color;
              categoryLabel = cat.label;
              break;
            }
          }

          const id = `osm-place-${el.id}`;
          osmPlaceIdsRef.current.push(id);

          const name = el.tags?.name || el.tags?.brand || categoryLabel;
          const cesiumColor = Cesium.Color.fromCssColorString(color);

          viewer!.entities.add({
            id,
            position: Cesium.Cartesian3.fromDegrees(el.lon, el.lat, 0),
            point: {
              pixelSize: 7,
              color: cesiumColor,
              outlineColor: Cesium.Color.WHITE,
              outlineWidth: 1.5,
              heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
              disableDepthTestDistance: Number.POSITIVE_INFINITY,
            },
            label: {
              text: name,
              font: "10px sans-serif",
              fillColor: Cesium.Color.WHITE,
              outlineColor: Cesium.Color.BLACK,
              outlineWidth: 2,
              style: Cesium.LabelStyle.FILL_AND_OUTLINE,
              heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
              disableDepthTestDistance: Number.POSITIVE_INFINITY,
              pixelOffset: new Cesium.Cartesian2(0, -12),
              scaleByDistance: new Cesium.NearFarScalar(100, 1.0, 5000, 0.4),
              translucencyByDistance: new Cesium.NearFarScalar(
                100,
                1.0,
                8000,
                0.0
              ),
            },
            properties: {
              osmId: el.id,
              name,
              category: categoryLabel,
              tags: JSON.stringify(el.tags || {}),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any,
          });
        }
      } catch (e) {
        console.warn("OSM places load failed:", e);
      }
    }

    loadOsmPlaces();

    const removeListener = viewer.camera.moveEnd.addEventListener(() => {
      if (showOsmPlaces) loadOsmPlaces();
    });

    return () => {
      removeListener();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showOsmPlaces, osmPlaceCategories, viewerRef]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 w-full h-full"
      style={{ zIndex: 0 }}
    />
  );
}
