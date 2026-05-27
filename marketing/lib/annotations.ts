export interface Annotation {
  id: string;
  type: "polygon" | "polyline" | "point" | "text";
  coordinates: Array<{ lat: number; lng: number }>;
  properties: {
    label?: string;
    color?: string;
    description?: string;
    createdAt: string;
  };
}

const STORAGE_KEY = "cesium-annotations";

function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback UUID-like generator
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function createAnnotation(
  type: Annotation["type"],
  coordinates: Annotation["coordinates"],
  properties?: Partial<Annotation["properties"]>
): Annotation {
  return {
    id: generateId(),
    type,
    coordinates,
    properties: {
      color: "#ffcc00",
      createdAt: new Date().toISOString(),
      ...properties,
    },
  };
}

export function saveAnnotations(annotations: Annotation[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(annotations));
  } catch (e) {
    console.error("Failed to save annotations:", e);
  }
}

export function loadAnnotations(): Annotation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Annotation[];
  } catch (e) {
    console.error("Failed to load annotations:", e);
    return [];
  }
}

export function exportAsGeoJSON(
  annotations: Annotation[]
): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: annotations.map((a) => {
      let geometry: GeoJSON.Geometry;

      switch (a.type) {
        case "polygon":
          geometry = {
            type: "Polygon",
            coordinates: [
              [
                ...a.coordinates.map((c) => [c.lng, c.lat]),
                // Close the ring
                [a.coordinates[0].lng, a.coordinates[0].lat],
              ],
            ],
          };
          break;
        case "polyline":
          geometry = {
            type: "LineString",
            coordinates: a.coordinates.map((c) => [c.lng, c.lat]),
          };
          break;
        case "point":
        case "text":
          geometry = {
            type: "Point",
            coordinates: [a.coordinates[0].lng, a.coordinates[0].lat],
          };
          break;
      }

      return {
        type: "Feature" as const,
        id: a.id,
        geometry,
        properties: {
          annotationType: a.type,
          label: a.properties.label ?? "",
          color: a.properties.color ?? "#ffcc00",
          description: a.properties.description ?? "",
          createdAt: a.properties.createdAt,
        },
      };
    }),
  };
}

export function importFromGeoJSON(geojson: unknown): Annotation[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const gj = geojson as any;
  if (!gj || gj.type !== "FeatureCollection" || !Array.isArray(gj.features)) {
    console.error("Invalid GeoJSON FeatureCollection");
    return [];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return gj.features.map((feature: any) => {
    const geom = feature.geometry;
    const props = feature.properties ?? {};

    let type: Annotation["type"] = "point";
    let coordinates: Annotation["coordinates"] = [];

    switch (geom?.type) {
      case "Polygon":
        type = "polygon";
        // Drop the closing coordinate (duplicate of first)
        coordinates = (geom.coordinates[0] as number[][])
          .slice(0, -1)
          .map(([lng, lat]: number[]) => ({ lat, lng }));
        break;
      case "LineString":
        type = "polyline";
        coordinates = (geom.coordinates as number[][]).map(
          ([lng, lat]: number[]) => ({ lat, lng })
        );
        break;
      case "Point":
        type = props.annotationType === "text" ? "text" : "point";
        coordinates = [{ lat: geom.coordinates[1], lng: geom.coordinates[0] }];
        break;
      default:
        coordinates = [];
    }

    return {
      id: feature.id ?? generateId(),
      type,
      coordinates,
      properties: {
        label: props.label || undefined,
        color: props.color || "#ffcc00",
        description: props.description || undefined,
        createdAt: props.createdAt || new Date().toISOString(),
      },
    } as Annotation;
  });
}
