import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

const ORS_BASE = "https://api.openrouteservice.org/v2/isochrones";

/** Maps the caller-friendly mode name to the ORS profile string. */
const PROFILE_MAP: Record<string, string> = {
  driving: "driving-car",
  walking: "foot-walking",
  cycling: "cycling-regular",
};

/** Average speeds (miles per hour) used for the fallback circle. */
const AVG_SPEED_MPH: Record<string, number> = {
  driving: 30,
  walking: 3,
  cycling: 12,
};

const EARTH_RADIUS_MI = 3958.8; // statute miles
const CIRCLE_POINTS = 64; // vertices for the fallback polygon
const ORS_TIMEOUT_MS = 8_000;

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

/** Degrees to radians. */
function deg2rad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Radians to degrees. */
function rad2deg(rad: number): number {
  return (rad * 180) / Math.PI;
}

/**
 * Compute a destination point given a start (lat, lng), bearing (degrees),
 * and distance (miles) using the Haversine / inverse-Haversine formula.
 * Returns [lng, lat] (GeoJSON order).
 */
function destinationPoint(
  lat: number,
  lng: number,
  bearingDeg: number,
  distanceMi: number,
): [number, number] {
  const φ1 = deg2rad(lat);
  const λ1 = deg2rad(lng);
  const θ = deg2rad(bearingDeg);
  const δ = distanceMi / EARTH_RADIUS_MI; // angular distance

  const φ2 = Math.asin(
    Math.sin(φ1) * Math.cos(δ) + Math.cos(φ1) * Math.sin(δ) * Math.cos(θ),
  );
  const λ2 =
    λ1 +
    Math.atan2(
      Math.sin(θ) * Math.sin(δ) * Math.cos(φ1),
      Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2),
    );

  return [rad2deg(λ2), rad2deg(φ2)]; // [lng, lat]
}

/**
 * Generate an approximate isochrone as a circular GeoJSON Polygon using the
 * Haversine formula together with average travel speeds.
 */
function fallbackCircle(
  lat: number,
  lng: number,
  mode: string,
  minutes: number,
): GeoJSON.Feature<GeoJSON.Polygon> {
  const speedMph = AVG_SPEED_MPH[mode] ?? AVG_SPEED_MPH.driving;
  const distanceMi = speedMph * (minutes / 60);

  const coords: [number, number][] = [];
  for (let i = 0; i <= CIRCLE_POINTS; i++) {
    const bearing = (360 / CIRCLE_POINTS) * i;
    coords.push(destinationPoint(lat, lng, bearing, distanceMi));
  }

  return {
    type: "Feature",
    properties: {
      mode,
      minutes,
      source: "fallback-circle",
    },
    geometry: {
      type: "Polygon",
      coordinates: [coords],
    },
  };
}

/* ------------------------------------------------------------------ */
/*  Route handler                                                     */
/* ------------------------------------------------------------------ */

/**
 * GET /api/isochrone
 *
 * Query params:
 *   lat      – latitude  (required)
 *   lng      – longitude (required)
 *   mode     – driving | walking | cycling  (default: driving)
 *   minutes  – travel-time budget           (default: 15)
 */
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;

  /* ---------- validate inputs ---------- */

  const latStr = params.get("lat");
  const lngStr = params.get("lng");

  if (!latStr || !lngStr) {
    return NextResponse.json(
      { error: "lat and lng query parameters are required" },
      { status: 400 },
    );
  }

  const lat = parseFloat(latStr);
  const lng = parseFloat(lngStr);

  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return NextResponse.json(
      { error: "lat and lng must be valid numbers" },
      { status: 400 },
    );
  }

  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return NextResponse.json(
      { error: "lat must be in [-90,90] and lng in [-180,180]" },
      { status: 400 },
    );
  }

  const mode = params.get("mode") ?? "driving";
  if (!PROFILE_MAP[mode]) {
    return NextResponse.json(
      {
        error: `Invalid mode "${mode}". Use one of: ${Object.keys(PROFILE_MAP).join(", ")}`,
      },
      { status: 400 },
    );
  }

  const minutes = Math.max(1, parseInt(params.get("minutes") ?? "15", 10) || 15);

  /* ---------- try ORS first ---------- */

  const apiKey = process.env.NEXT_PUBLIC_ORS_KEY;

  if (apiKey) {
    try {
      const profile = PROFILE_MAP[mode];
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), ORS_TIMEOUT_MS);

      const res = await fetch(`${ORS_BASE}/${profile}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: apiKey,
        },
        body: JSON.stringify({
          locations: [[lng, lat]],
          range: [minutes * 60], // ORS expects seconds
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!res.ok) {
        const body = await res.text();
        console.error(`ORS API error (${res.status}):`, body);
        // Fall through to the fallback below
      } else {
        const data = await res.json();

        // ORS returns a FeatureCollection; extract the first feature.
        const feature =
          data?.type === "FeatureCollection" && data.features?.length
            ? data.features[0]
            : data;

        // Enrich properties
        if (feature.properties) {
          feature.properties.mode = mode;
          feature.properties.minutes = minutes;
          feature.properties.source = "openrouteservice";
        }

        return NextResponse.json(feature, { status: 200 });
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Unknown ORS error";
      console.error("ORS request failed, falling back to circle:", message);
      // Fall through to fallback
    }
  }

  /* ---------- fallback: approximate circle ---------- */

  const feature = fallbackCircle(lat, lng, mode, minutes);

  return NextResponse.json(feature, { status: 200 });
}
