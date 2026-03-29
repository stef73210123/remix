// LocalStorage persistence for favorites and recently viewed properties

const FAVORITES_KEY = "cesium-re-favorites";
const RECENTS_KEY = "cesium-re-recents";
const MAX_RECENTS = 10;

export function getFavorites(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]");
  } catch {
    return [];
  }
}

export function toggleFavorite(propertyId: string): boolean {
  const favs = getFavorites();
  const idx = favs.indexOf(propertyId);
  if (idx >= 0) {
    favs.splice(idx, 1);
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favs));
    return false;
  } else {
    favs.unshift(propertyId);
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favs));
    return true;
  }
}

export function isFavorite(propertyId: string): boolean {
  return getFavorites().includes(propertyId);
}

export function getRecents(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(RECENTS_KEY) || "[]");
  } catch {
    return [];
  }
}

export function addRecent(propertyId: string): void {
  const recents = getRecents().filter((id) => id !== propertyId);
  recents.unshift(propertyId);
  if (recents.length > MAX_RECENTS) recents.length = MAX_RECENTS;
  localStorage.setItem(RECENTS_KEY, JSON.stringify(recents));
}
