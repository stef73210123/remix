// Serialize/deserialize view state to/from URL search params

export interface URLViewState {
  lat?: number;
  lng?: number;
  height?: number;
  pitch?: number;
  heading?: number;
  propertyId?: string;
  layers?: string[];
  panel?: string;
  region?: string;
}

export function parseURLState(): URLViewState {
  if (typeof window === "undefined") return {};
  const params = new URLSearchParams(window.location.search);
  const state: URLViewState = {};

  const lat = params.get("lat");
  const lng = params.get("lng");
  const h = params.get("h");
  const p = params.get("p");
  const hd = params.get("hd");

  if (lat) state.lat = parseFloat(lat);
  if (lng) state.lng = parseFloat(lng);
  if (h) state.height = parseFloat(h);
  if (p) state.pitch = parseFloat(p);
  if (hd) state.heading = parseFloat(hd);

  const prop = params.get("prop");
  if (prop) state.propertyId = prop;

  const layers = params.get("layers");
  if (layers) state.layers = layers.split(",").filter(Boolean);

  const panel = params.get("panel");
  if (panel) state.panel = panel;

  const region = params.get("region");
  if (region) state.region = region;

  return state;
}

export function buildURLState(state: URLViewState): string {
  const params = new URLSearchParams();

  if (state.lat !== undefined) params.set("lat", state.lat.toFixed(4));
  if (state.lng !== undefined) params.set("lng", state.lng.toFixed(4));
  if (state.height !== undefined) params.set("h", Math.round(state.height).toString());
  if (state.pitch !== undefined) params.set("p", state.pitch.toFixed(1));
  if (state.heading !== undefined) params.set("hd", state.heading.toFixed(1));
  if (state.propertyId) params.set("prop", state.propertyId);
  if (state.layers && state.layers.length > 0) params.set("layers", state.layers.join(","));
  if (state.panel) params.set("panel", state.panel);
  if (state.region) params.set("region", state.region);

  const str = params.toString();
  return str ? `?${str}` : "";
}

export function updateURL(state: URLViewState): void {
  if (typeof window === "undefined") return;
  const url = buildURLState(state);
  window.history.replaceState(null, "", url || window.location.pathname);
}
