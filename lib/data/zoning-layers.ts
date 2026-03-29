// Zoning GIS layers with links to underlying municipal code documents,
// eCode references, and comprehensive plans for each municipality.

export interface ZoningLayer {
  id: string;
  name: string;
  state: string;
  county?: string;
  municipality?: string;
  serviceUrl: string;
  serviceType: "arcgis" | "wms";
  layerIndex?: number;
  description: string;
  // Links to underlying code documents
  eCodeUrl?: string;
  compPlanUrl?: string;
  zoningMapUrl?: string;
  zoningCodeUrl?: string;
}

export const ZONING_LAYERS: ZoningLayer[] = [
  // ─── WASHINGTON DC ───
  {
    id: "dc-zoning",
    name: "DC Zoning Districts",
    state: "DC",
    municipality: "Washington, DC",
    serviceUrl:
      "https://maps2.dcgis.dc.gov/dcgis/rest/services/DCGIS_DATA/Zoning_702/MapServer",
    serviceType: "arcgis",
    layerIndex: 0,
    description: "DC zoning districts (C, R, SP, W, CR, etc.)",
    eCodeUrl: "https://online.encodeplus.com/regs/washington-dc/",
    compPlanUrl:
      "https://plandc.dc.gov/page/comprehensive-plan-2006",
    zoningMapUrl: "https://maps.dcoz.dc.gov/zr16/",
    zoningCodeUrl: "https://dcoz.dc.gov/zrr/zoning-regulations",
  },
  {
    id: "dc-overlay",
    name: "DC Overlay Zones",
    state: "DC",
    municipality: "Washington, DC",
    serviceUrl:
      "https://maps2.dcgis.dc.gov/dcgis/rest/services/DCGIS_DATA/Zoning_702/MapServer",
    serviceType: "arcgis",
    layerIndex: 1,
    description: "DC overlay zones (arts, hotel, neighborhood commercial, etc.)",
    eCodeUrl: "https://online.encodeplus.com/regs/washington-dc/",
    zoningCodeUrl: "https://dcoz.dc.gov/zrr/zoning-regulations",
  },
  {
    id: "dc-historic",
    name: "DC Historic Districts",
    state: "DC",
    municipality: "Washington, DC",
    serviceUrl:
      "https://maps2.dcgis.dc.gov/dcgis/rest/services/DCGIS_DATA/Historic_702/MapServer",
    serviceType: "arcgis",
    layerIndex: 0,
    description: "DC historic preservation districts and landmarks",
    zoningCodeUrl:
      "https://planning.dc.gov/page/historic-preservation-office",
  },

  // ─── NEW YORK CITY ───
  {
    id: "nyc-zoning",
    name: "NYC Zoning Districts",
    state: "NY",
    county: "New York City",
    municipality: "New York City",
    serviceUrl:
      "https://services5.arcgisonline.com/arcgis/rest/services/NYC_Planning/Zoning/MapServer",
    serviceType: "arcgis",
    layerIndex: 0,
    description: "NYC zoning districts (R, C, M designations)",
    eCodeUrl:
      "https://zr.planning.nyc.gov/",
    compPlanUrl: "https://www.nyc.gov/site/planning/plans/citywide.page",
    zoningMapUrl: "https://zola.planning.nyc.gov/",
    zoningCodeUrl: "https://zr.planning.nyc.gov/",
  },
  {
    id: "nyc-special-districts",
    name: "NYC Special Purpose Districts",
    state: "NY",
    county: "New York City",
    municipality: "New York City",
    serviceUrl:
      "https://services5.arcgisonline.com/arcgis/rest/services/NYC_Planning/Zoning/MapServer",
    serviceType: "arcgis",
    layerIndex: 1,
    description: "NYC special purpose districts and overlays",
    zoningCodeUrl: "https://zr.planning.nyc.gov/",
  },

  // ─── SULLIVAN COUNTY MUNICIPALITIES ───
  {
    id: "sullivan-zoning",
    name: "Sullivan County Zoning",
    state: "NY",
    county: "Sullivan",
    serviceUrl: "https://gis.sullivanny.us/arcgis/rest/services/Zoning/MapServer",
    serviceType: "arcgis",
    layerIndex: 0,
    description: "Sullivan County municipal zoning districts",
    compPlanUrl: "https://www.sullivanny.us/Departments/Planning",
  },
  {
    id: "liberty-zoning",
    name: "Town of Liberty Zoning",
    state: "NY",
    county: "Sullivan",
    municipality: "Liberty",
    serviceUrl: "https://gis.sullivanny.us/arcgis/rest/services/Zoning/MapServer",
    serviceType: "arcgis",
    description: "Town of Liberty zoning districts",
    eCodeUrl: "https://ecode360.com/LI0522",
    compPlanUrl:
      "https://www.townofliberty.org/comprehensive-plan",
    zoningCodeUrl: "https://ecode360.com/LI0522#LI0522-CH155",
  },
  {
    id: "bethel-zoning",
    name: "Town of Bethel Zoning",
    state: "NY",
    county: "Sullivan",
    municipality: "Bethel",
    serviceUrl: "https://gis.sullivanny.us/arcgis/rest/services/Zoning/MapServer",
    serviceType: "arcgis",
    description: "Town of Bethel zoning districts",
    eCodeUrl: "https://ecode360.com/BE0652",
    zoningCodeUrl: "https://ecode360.com/BE0652#BE0652-CH145",
  },
  {
    id: "thompson-zoning",
    name: "Town of Thompson Zoning",
    state: "NY",
    county: "Sullivan",
    municipality: "Thompson",
    serviceUrl: "https://gis.sullivanny.us/arcgis/rest/services/Zoning/MapServer",
    serviceType: "arcgis",
    description: "Town of Thompson zoning districts",
    eCodeUrl: "https://ecode360.com/TH1254",
    zoningCodeUrl: "https://ecode360.com/TH1254#TH1254-CH250",
  },
  {
    id: "fallsburg-zoning",
    name: "Town of Fallsburg Zoning",
    state: "NY",
    county: "Sullivan",
    municipality: "Fallsburg",
    serviceUrl: "https://gis.sullivanny.us/arcgis/rest/services/Zoning/MapServer",
    serviceType: "arcgis",
    description: "Town of Fallsburg zoning districts",
    eCodeUrl: "https://ecode360.com/FA0626",
    zoningCodeUrl: "https://ecode360.com/FA0626#FA0626-CH310",
  },

  // ─── WESTCHESTER COUNTY MUNICIPALITIES ───
  {
    id: "westchester-zoning",
    name: "Westchester County Zoning",
    state: "NY",
    county: "Westchester",
    serviceUrl:
      "https://giswww.westchestergov.com/arcgis/rest/services/DataHub_EnvironmentandPlanning/MapServer",
    serviceType: "arcgis",
    layerIndex: 0,
    description: "Westchester County municipal zoning districts",
    compPlanUrl:
      "https://planning.westchestergov.com/comprehensive-plan",
  },
  {
    id: "yonkers-zoning",
    name: "City of Yonkers Zoning",
    state: "NY",
    county: "Westchester",
    municipality: "Yonkers",
    serviceUrl:
      "https://giswww.westchestergov.com/arcgis/rest/services/DataHub_EnvironmentandPlanning/MapServer",
    serviceType: "arcgis",
    description: "City of Yonkers zoning districts",
    eCodeUrl: "https://ecode360.com/YO0280",
    compPlanUrl: "https://www.yonkersny.gov/government/planning-development",
    zoningCodeUrl: "https://ecode360.com/YO0280#YO0280-CH43",
  },
  {
    id: "white-plains-zoning",
    name: "City of White Plains Zoning",
    state: "NY",
    county: "Westchester",
    municipality: "White Plains",
    serviceUrl:
      "https://giswww.westchestergov.com/arcgis/rest/services/DataHub_EnvironmentandPlanning/MapServer",
    serviceType: "arcgis",
    description: "City of White Plains zoning districts",
    eCodeUrl: "https://ecode360.com/WH0466",
    compPlanUrl:
      "https://www.cityofwhiteplains.com/603/Comprehensive-Plan",
    zoningCodeUrl: "https://ecode360.com/WH0466#WH0466-CH9.0",
  },
  {
    id: "new-rochelle-zoning",
    name: "City of New Rochelle Zoning",
    state: "NY",
    county: "Westchester",
    municipality: "New Rochelle",
    serviceUrl:
      "https://giswww.westchestergov.com/arcgis/rest/services/DataHub_EnvironmentandPlanning/MapServer",
    serviceType: "arcgis",
    description: "City of New Rochelle zoning districts",
    eCodeUrl: "https://ecode360.com/NE0791",
    zoningCodeUrl: "https://ecode360.com/NE0791#NE0791-CH331",
  },

  // ─── DUTCHESS COUNTY MUNICIPALITIES ───
  {
    id: "poughkeepsie-zoning",
    name: "City of Poughkeepsie Zoning",
    state: "NY",
    county: "Dutchess",
    municipality: "Poughkeepsie",
    serviceUrl:
      "https://gis.dutchessny.gov/arcgis/rest/services/Zoning/MapServer",
    serviceType: "arcgis",
    description: "City of Poughkeepsie zoning districts",
    eCodeUrl: "https://ecode360.com/PO0832",
    compPlanUrl:
      "https://www.cityofpoughkeepsie.com/planning",
    zoningCodeUrl: "https://ecode360.com/PO0832#PO0832-CH17.42",
  },
  {
    id: "beacon-zoning",
    name: "City of Beacon Zoning",
    state: "NY",
    county: "Dutchess",
    municipality: "Beacon",
    serviceUrl:
      "https://gis.dutchessny.gov/arcgis/rest/services/Zoning/MapServer",
    serviceType: "arcgis",
    description: "City of Beacon zoning districts",
    eCodeUrl: "https://ecode360.com/BE0174",
    compPlanUrl: "https://www.beaconny.gov/planning",
    zoningCodeUrl: "https://ecode360.com/BE0174#BE0174-CH223",
  },

  // ─── ORANGE COUNTY MUNICIPALITIES ───
  {
    id: "newburgh-zoning",
    name: "City of Newburgh Zoning",
    state: "NY",
    county: "Orange",
    municipality: "Newburgh",
    serviceUrl:
      "https://gis.orangecountygov.com/arcgis/rest/services/Zoning/MapServer",
    serviceType: "arcgis",
    description: "City of Newburgh zoning districts",
    eCodeUrl: "https://ecode360.com/NE1041",
    zoningCodeUrl: "https://ecode360.com/NE1041#NE1041-CH300",
  },
  {
    id: "middletown-zoning",
    name: "City of Middletown Zoning",
    state: "NY",
    county: "Orange",
    municipality: "Middletown",
    serviceUrl:
      "https://gis.orangecountygov.com/arcgis/rest/services/Zoning/MapServer",
    serviceType: "arcgis",
    description: "City of Middletown zoning districts",
    eCodeUrl: "https://ecode360.com/MI0384",
    zoningCodeUrl: "https://ecode360.com/MI0384#MI0384-CH475",
  },

  // ─── CONNECTICUT MUNICIPALITIES ───
  {
    id: "ct-zoning",
    name: "CT Statewide Zoning",
    state: "CT",
    serviceUrl:
      "https://webgis.ct.gov/arcgis/rest/services/Pub/Zoning/MapServer",
    serviceType: "arcgis",
    layerIndex: 0,
    description: "Connecticut statewide zoning districts from OPM",
  },
  {
    id: "stamford-zoning",
    name: "City of Stamford Zoning",
    state: "CT",
    municipality: "Stamford",
    serviceUrl:
      "https://webgis.ct.gov/arcgis/rest/services/Pub/Zoning/MapServer",
    serviceType: "arcgis",
    description: "City of Stamford zoning districts",
    eCodeUrl: "https://www.stamfordct.gov/government/boards-commissions/zoning-board",
    compPlanUrl:
      "https://www.stamfordct.gov/government/operations/land-use/master-plan",
    zoningCodeUrl:
      "https://www.stamfordct.gov/government/boards-commissions/zoning-board/zoning-regulations",
  },
  {
    id: "greenwich-zoning",
    name: "Town of Greenwich Zoning",
    state: "CT",
    municipality: "Greenwich",
    serviceUrl:
      "https://webgis.ct.gov/arcgis/rest/services/Pub/Zoning/MapServer",
    serviceType: "arcgis",
    description: "Town of Greenwich zoning districts",
    eCodeUrl: "https://ecode360.com/GR0290",
    compPlanUrl:
      "https://www.greenwichct.gov/575/Plan-of-Conservation-Development",
    zoningCodeUrl: "https://ecode360.com/GR0290#GR0290-CH6",
  },
  {
    id: "norwalk-zoning",
    name: "City of Norwalk Zoning",
    state: "CT",
    municipality: "Norwalk",
    serviceUrl:
      "https://webgis.ct.gov/arcgis/rest/services/Pub/Zoning/MapServer",
    serviceType: "arcgis",
    description: "City of Norwalk zoning districts",
    eCodeUrl: "https://ecode360.com/NO0406",
    compPlanUrl:
      "https://www.norwalkct.org/1770/Plan-of-Conservation-and-Development",
    zoningCodeUrl: "https://ecode360.com/NO0406#NO0406-CH118",
  },
  {
    id: "danbury-zoning",
    name: "City of Danbury Zoning",
    state: "CT",
    municipality: "Danbury",
    serviceUrl:
      "https://webgis.ct.gov/arcgis/rest/services/Pub/Zoning/MapServer",
    serviceType: "arcgis",
    description: "City of Danbury zoning districts",
    eCodeUrl: "https://ecode360.com/DA0150",
    zoningCodeUrl: "https://ecode360.com/DA0150#DA0150-CH24",
  },

  // ─── MASSACHUSETTS MUNICIPALITIES ───
  {
    id: "ma-zoning",
    name: "MA Statewide Zoning",
    state: "MA",
    serviceUrl:
      "https://giswebservices.mass.gov/arcgis/rest/services/massgis/Zoning/MapServer",
    serviceType: "arcgis",
    layerIndex: 0,
    description: "Massachusetts statewide zoning atlas from MassGIS",
    zoningCodeUrl:
      "https://malegislature.gov/Laws/GeneralLaws/PartI/TitleVII/Chapter40A",
  },
  {
    id: "boston-zoning",
    name: "City of Boston Zoning",
    state: "MA",
    municipality: "Boston",
    serviceUrl:
      "https://giswebservices.mass.gov/arcgis/rest/services/massgis/Zoning/MapServer",
    serviceType: "arcgis",
    description: "City of Boston zoning districts",
    eCodeUrl: "https://www.boston.gov/departments/planning-development-agency",
    compPlanUrl: "https://www.bostonplans.org/planning/planning-initiatives",
    zoningMapUrl: "https://maps.bostonplans.org/zoningviewer/",
    zoningCodeUrl: "https://www.boston.gov/departments/planning-development-agency/zoning-code",
  },
  {
    id: "cambridge-zoning",
    name: "City of Cambridge Zoning",
    state: "MA",
    municipality: "Cambridge",
    serviceUrl:
      "https://giswebservices.mass.gov/arcgis/rest/services/massgis/Zoning/MapServer",
    serviceType: "arcgis",
    description: "City of Cambridge zoning districts",
    eCodeUrl:
      "https://library.municode.com/ma/cambridge/codes/zoning_ordinance",
    compPlanUrl:
      "https://www.cambridgema.gov/CDD/Projects/Planning/envisionplan",
    zoningCodeUrl:
      "https://library.municode.com/ma/cambridge/codes/zoning_ordinance",
  },
  {
    id: "worcester-zoning",
    name: "City of Worcester Zoning",
    state: "MA",
    municipality: "Worcester",
    serviceUrl:
      "https://giswebservices.mass.gov/arcgis/rest/services/massgis/Zoning/MapServer",
    serviceType: "arcgis",
    description: "City of Worcester zoning districts",
    eCodeUrl: "https://ecode360.com/WO0360",
    compPlanUrl: "https://www.worcesterma.gov/planning-regulatory/comprehensive-plan",
    zoningCodeUrl: "https://ecode360.com/WO0360#WO0360-CH22",
  },
  {
    id: "springfield-zoning",
    name: "City of Springfield Zoning",
    state: "MA",
    municipality: "Springfield",
    serviceUrl:
      "https://giswebservices.mass.gov/arcgis/rest/services/massgis/Zoning/MapServer",
    serviceType: "arcgis",
    description: "City of Springfield zoning districts",
    eCodeUrl:
      "https://library.municode.com/ma/springfield/codes/code_of_ordinances",
    zoningCodeUrl:
      "https://library.municode.com/ma/springfield/codes/code_of_ordinances?nodeId=PTIICOOR_CH12.16ZO",
  },
];

// Helper to get all zoning layers for a state
export function getZoningLayersByState(state: string): ZoningLayer[] {
  return ZONING_LAYERS.filter((l) => l.state === state);
}

// Helper to get zoning layer with its code links
export function getZoningLinks(layerId: string): {
  eCode?: string;
  compPlan?: string;
  zoningMap?: string;
  zoningCode?: string;
} | null {
  const layer = ZONING_LAYERS.find((l) => l.id === layerId);
  if (!layer) return null;
  return {
    eCode: layer.eCodeUrl,
    compPlan: layer.compPlanUrl,
    zoningMap: layer.zoningMapUrl,
    zoningCode: layer.zoningCodeUrl,
  };
}
