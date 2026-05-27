// Resolve a layer ID to its ArcGIS service URL and layer index
// Used by CesiumViewer to add/remove imagery providers when layers are toggled

import { CENSUS_LAYERS, PARCEL_DATA_SOURCES } from "@/lib/data/census-layers";
import { ZONING_LAYERS } from "@/lib/data/zoning-layers";
import { GIS_SERVICES } from "@/lib/data/gis-layers";

export interface ResolvedLayer {
  serviceUrl: string;
  layerIndex?: number;
  opacity: number;
  serviceType: "arcgis" | "wms" | "geojson";
}

export function resolveLayer(layerId: string): ResolvedLayer | null {
  // Check census layers
  const census = CENSUS_LAYERS.find((l) => l.id === layerId);
  if (census) {
    return {
      serviceUrl: census.serviceUrl,
      layerIndex: census.layerIndex,
      opacity: census.opacity,
      serviceType: "arcgis",
    };
  }

  // Check parcel data sources
  const parcel = PARCEL_DATA_SOURCES.find((p) => p.id === layerId);
  if (parcel) {
    return {
      serviceUrl: parcel.serviceUrl,
      layerIndex: parcel.layerIndex,
      opacity: 0.6,
      serviceType: parcel.serviceType,
    };
  }

  // Check zoning layers
  const zoning = ZONING_LAYERS.find((z) => z.id === layerId);
  if (zoning) {
    return {
      serviceUrl: zoning.serviceUrl,
      layerIndex: zoning.layerIndex,
      opacity: 0.5,
      serviceType: zoning.serviceType,
    };
  }

  // Check GIS layers
  for (const service of GIS_SERVICES) {
    const gisLayer = service.layers.find((l) => l.id === layerId);
    if (gisLayer) {
      return {
        serviceUrl: service.baseUrl,
        layerIndex: gisLayer.layerIndex,
        opacity: gisLayer.opacity,
        serviceType: service.type === "wms" ? "wms" : "arcgis",
      };
    }
  }

  return null;
}
