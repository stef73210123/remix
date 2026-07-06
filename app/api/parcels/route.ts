import { NextRequest, NextResponse } from "next/server";
import { PARCEL_DATA_SOURCES } from "@/lib/data/census-layers";

export const dynamic = "force-dynamic";

// Active map region → the public parcel GIS source that covers it.
const REGION_TO_SOURCE: Record<string, string> = {
  dc: "dc-parcels",
  nyc: "nyc-pluto-parcels",
  sullivan: "sullivan-parcels",
  westchester: "westchester-parcels",
  ct: "ct-parcels",
  boston: "ma-parcels",
};

/**
 * Returns the centroid of every parcel intersecting a bbox for the active
 * region, by querying that region's public ArcGIS parcel service with
 * returnCentroid. Response: { parcels: [{ lng, lat, id }] }.
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const region = sp.get("region") || "dc";
  const bbox = sp.get("bbox"); // "west,south,east,north" in WGS84

  if (!bbox) return NextResponse.json({ parcels: [] });
  const source = PARCEL_DATA_SOURCES.find((p) => p.id === REGION_TO_SOURCE[region]);
  if (!source || source.serviceType !== "arcgis") {
    return NextResponse.json({ parcels: [], unsupported: true });
  }

  const [w, s, e, n] = bbox.split(",").map(Number);
  if (![w, s, e, n].every((v) => Number.isFinite(v))) {
    return NextResponse.json({ parcels: [] });
  }

  const layer = source.layerIndex ?? 0;
  const params = new URLSearchParams({
    where: "1=1",
    geometry: JSON.stringify({
      xmin: w,
      ymin: s,
      xmax: e,
      ymax: n,
      spatialReference: { wkid: 4326 },
    }),
    geometryType: "esriGeometryEnvelope",
    inSR: "4326",
    outSR: "4326",
    spatialRel: "esriSpatialRelIntersects",
    returnGeometry: "false",
    returnCentroid: "true",
    outFields: "OBJECTID",
    resultRecordCount: "2000",
    f: "json",
  });
  const url = `${source.serviceUrl}/${layer}/query?${params.toString()}`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(9000) });
    if (!res.ok) return NextResponse.json({ parcels: [] });
    const data = await res.json();
    const feats: unknown[] = Array.isArray(data?.features) ? data.features : [];
    const parcels: { lng: number; lat: number; id: string | number }[] = [];
    for (const f of feats as {
      centroid?: { x: number; y: number };
      attributes?: Record<string, unknown>;
    }[]) {
      const c = f.centroid;
      if (!c || typeof c.x !== "number" || typeof c.y !== "number") continue;
      parcels.push({
        lng: c.x,
        lat: c.y,
        id: (f.attributes?.OBJECTID as string | number) ?? `${c.x},${c.y}`,
      });
    }
    return NextResponse.json(
      { parcels },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json({ parcels: [] });
  }
}
