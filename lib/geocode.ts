/**
 * Server-side geocoding for news pins.
 *
 * Uses the U.S. Census Bureau geocoder (free, no key, no hard rate limit) to
 * turn a street address into precise coordinates. Results are memoized so the
 * hourly feed refresh doesn't re-geocode the same addresses. Returns null when
 * there's no confident address-level match — callers then leave the story
 * unpinned rather than dropping a coarse city/state pin.
 */

const cache = new Map<string, { lat: number; lng: number } | null>();

export async function geocodeUsAddress(
  oneLine: string,
  timeoutMs = 3000
): Promise<{ lat: number; lng: number } | null> {
  const key = oneLine.trim().toLowerCase();
  if (key.length < 5) return null;
  if (cache.has(key)) return cache.get(key) ?? null;

  const url = new URL(
    "https://geocoding.geo.census.gov/geocoder/locations/onelineaddress"
  );
  url.searchParams.set("address", oneLine);
  url.searchParams.set("benchmark", "Public_AR_Current");
  url.searchParams.set("format", "json");

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url.toString(), { signal: controller.signal });
    if (!res.ok) return null; // transient — don't cache
    const data = await res.json();
    const c = data?.result?.addressMatches?.[0]?.coordinates;
    let out: { lat: number; lng: number } | null = null;
    if (
      c &&
      typeof c.x === "number" &&
      typeof c.y === "number" &&
      Math.abs(c.y) <= 90 &&
      Math.abs(c.x) <= 180
    ) {
      out = { lat: c.y, lng: c.x };
    }
    if (cache.size < 5000) cache.set(key, out);
    return out;
  } catch {
    return null; // timeout/network — don't cache so we can retry next refresh
  } finally {
    clearTimeout(t);
  }
}
