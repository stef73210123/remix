import { LAND_USE_COLORS } from "@/types/cesium";

export function getBuildingStyleConditions(): {
  color: { conditions: [string, string][] };
} {
  const conditions: [string, string][] = [];

  // Map OSM building types to land use category colors
  const osmMappings: Record<string, string> = {
    // Commercial (red)
    commercial: LAND_USE_COLORS["Commercial"],
    retail: LAND_USE_COLORS["Commercial"],
    office: LAND_USE_COLORS["Commercial"],
    hotel: LAND_USE_COLORS["Commercial"],
    // Residential (gold)
    apartments: LAND_USE_COLORS["Residential"],
    residential: LAND_USE_COLORS["Residential"],
    house: LAND_USE_COLORS["Residential"],
    detached: LAND_USE_COLORS["Residential"],
    terrace: LAND_USE_COLORS["Residential"],
    // Mixed Use (orange)
    // Industrial (purple)
    industrial: LAND_USE_COLORS["Industrial"],
    warehouse: LAND_USE_COLORS["Industrial"],
    // Institutional (teal)
    hospital: LAND_USE_COLORS["Institutional"],
    school: LAND_USE_COLORS["Institutional"],
    university: LAND_USE_COLORS["Institutional"],
    church: LAND_USE_COLORS["Institutional"],
    cathedral: LAND_USE_COLORS["Institutional"],
    mosque: LAND_USE_COLORS["Institutional"],
    synagogue: LAND_USE_COLORS["Institutional"],
    temple: LAND_USE_COLORS["Institutional"],
    government: LAND_USE_COLORS["Institutional"],
    civic: LAND_USE_COLORS["Institutional"],
    public: LAND_USE_COLORS["Institutional"],
    // Special Purpose (warm gray)
    parking: LAND_USE_COLORS["Special Purpose"],
    garage: LAND_USE_COLORS["Special Purpose"],
    stadium: LAND_USE_COLORS["Special Purpose"],
    sports_centre: LAND_USE_COLORS["Special Purpose"],
  };

  for (const [osmType, color] of Object.entries(osmMappings)) {
    conditions.push([
      `\${feature['building']} === '${osmType}'`,
      `color('${color}', 0.7)`,
    ]);
  }

  // Default: light commercial blue-gray
  conditions.push(["true", `color('${LAND_USE_COLORS["Commercial"]}', 0.5)`]);

  return { color: { conditions } };
}

export function getHighlightColor(): string {
  return "color('#ffffff', 0.9)";
}
