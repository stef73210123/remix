import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface FccBlockResult {
  Block?: {
    FIPS?: string;
  };
  State?: {
    FIPS?: string;
    name?: string;
  };
  County?: {
    FIPS?: string;
    name?: string;
  };
}

interface DemographicData {
  fips: {
    state: string;
    county: string;
    tract: string;
  };
  location: {
    lat: number;
    lng: number;
    stateName: string;
    countyName: string;
  };
  demographics: {
    totalPopulation: number | null;
    medianAge: number | null;
    totalHouseholds: number | null;
    medianHouseholdIncome: number | null;
    housingUnits: number | null;
  };
}

const CENSUS_TIMEOUT_MS = 10_000;
const FCC_TIMEOUT_MS = 8_000;

async function fetchWithTimeout(
  url: string,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Geocode lat/lng to FIPS codes (state, county, tract) using the FCC Census Block API.
 */
async function geocodeToFips(
  lat: number,
  lng: number
): Promise<{ state: string; county: string; tract: string; stateName: string; countyName: string }> {
  const url = `https://geo.fcc.gov/api/census/block/find?latitude=${lat}&longitude=${lng}&censusYear=2020&format=json`;

  const response = await fetchWithTimeout(url, FCC_TIMEOUT_MS);

  if (!response.ok) {
    throw new Error(
      `FCC geocoding API returned status ${response.status}: ${response.statusText}`
    );
  }

  const data: FccBlockResult = await response.json();

  const blockFips = data.Block?.FIPS;
  const stateFips = data.State?.FIPS;
  const countyFips = data.County?.FIPS;
  const stateName = data.State?.name ?? "";
  const countyName = data.County?.name ?? "";

  if (!blockFips || !stateFips || !countyFips) {
    throw new Error(
      "Could not determine FIPS codes for the given coordinates. The location may be outside the US."
    );
  }

  // Block FIPS is 15 digits: state(2) + county(3) + tract(6) + block(4)
  // Extract the tract code from the block FIPS
  const tract = blockFips.substring(5, 11);

  return {
    state: stateFips,
    county: countyFips,
    tract,
    stateName,
    countyName,
  };
}

/**
 * Fetch demographic data from the US Census Bureau ACS 5-year estimates for a given tract.
 */
async function fetchDemographics(
  state: string,
  county: string,
  tract: string
): Promise<DemographicData["demographics"]> {
  const variables = [
    "B01003_001E", // Total population
    "B01002_001E", // Median age
    "B19001_001E", // Total households (income brackets)
    "B19013_001E", // Median household income
    "B25001_001E", // Housing units
  ].join(",");

  const url =
    `https://api.census.gov/data/2022/acs/acs5?get=${variables}&for=tract:${tract}&in=state:${state}%20county:${county}`;

  const response = await fetchWithTimeout(url, CENSUS_TIMEOUT_MS);

  if (!response.ok) {
    throw new Error(
      `Census API returned status ${response.status}: ${response.statusText}`
    );
  }

  const data: string[][] = await response.json();

  // Census API returns an array of arrays. First row is headers, second row is data.
  if (!data || data.length < 2) {
    throw new Error("Census API returned no data for the specified tract.");
  }

  const headers = data[0];
  const values = data[1];

  const getValue = (variableName: string): number | null => {
    const index = headers.indexOf(variableName);
    if (index === -1) return null;
    const raw = values[index];
    if (raw === null || raw === undefined || raw === "" || raw === "-666666666") {
      return null;
    }
    const parsed = parseFloat(raw);
    return isNaN(parsed) ? null : parsed;
  };

  return {
    totalPopulation: getValue("B01003_001E"),
    medianAge: getValue("B01002_001E"),
    totalHouseholds: getValue("B19001_001E"),
    medianHouseholdIncome: getValue("B19013_001E"),
    housingUnits: getValue("B25001_001E"),
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const latParam = searchParams.get("lat");
    const lngParam = searchParams.get("lng");
    const radiusParam = searchParams.get("radius");

    if (!latParam || !lngParam) {
      return NextResponse.json(
        { error: "Missing required query parameters: lat and lng" },
        { status: 400 }
      );
    }

    const lat = parseFloat(latParam);
    const lng = parseFloat(lngParam);
    const radius = radiusParam ? parseFloat(radiusParam) : 0.5;

    if (isNaN(lat) || isNaN(lng)) {
      return NextResponse.json(
        { error: "lat and lng must be valid numbers" },
        { status: 400 }
      );
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return NextResponse.json(
        { error: "lat must be between -90 and 90, lng between -180 and 180" },
        { status: 400 }
      );
    }

    if (isNaN(radius) || radius <= 0 || radius > 50) {
      return NextResponse.json(
        { error: "radius must be a positive number up to 50 miles" },
        { status: 400 }
      );
    }

    // Step 1: Geocode lat/lng to FIPS codes
    const fips = await geocodeToFips(lat, lng);

    // Step 2: Fetch demographics from Census API
    const demographics = await fetchDemographics(
      fips.state,
      fips.county,
      fips.tract
    );

    const result: DemographicData = {
      fips: {
        state: fips.state,
        county: fips.county,
        tract: fips.tract,
      },
      location: {
        lat,
        lng,
        stateName: fips.stateName,
        countyName: fips.countyName,
      },
      demographics,
    };

    return NextResponse.json(result);
  } catch (error: unknown) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return NextResponse.json(
        { error: "Request timed out while fetching census data" },
        { status: 504 }
      );
    }

    const message =
      error instanceof Error ? error.message : "An unexpected error occurred";

    console.error("Census API error:", message);

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
