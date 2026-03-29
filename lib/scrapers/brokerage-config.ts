/**
 * Commercial brokerage firm configurations for listing scraping.
 * Covers DC, NY, CT, and MA markets.
 *
 * Each brokerage exposes a public API or search page that we scrape
 * for commercial real estate listings.
 */

export interface BrokerageConfig {
  id: string;
  name: string;
  /** States this brokerage is active in (for our regions) */
  states: string[];
  /** Base URL for the brokerage's listing search */
  searchUrl: string;
  /** Type of data source */
  sourceType: "api_json" | "html" | "xml_feed";
  /** How to build the search URL for a given state/region */
  buildSearchUrl: (state: string, page?: number) => string;
  /** Rate limit: minimum ms between requests */
  delayMs: number;
}

// Major commercial brokerage firms operating in DC/NY/CT/MA
export const BROKERAGE_CONFIGS: BrokerageConfig[] = [
  // --- National Firms ---
  {
    id: "cbre",
    name: "CBRE",
    states: ["DC", "NY", "CT", "MA"],
    searchUrl: "https://www.cbre.us/properties",
    sourceType: "html",
    buildSearchUrl: (state, page = 1) =>
      `https://www.cbre.us/properties?state=${encodeURIComponent(state)}&propertyType=commercial&page=${page}`,
    delayMs: 2000,
  },
  {
    id: "jll",
    name: "JLL (Jones Lang LaSalle)",
    states: ["DC", "NY", "CT", "MA"],
    searchUrl: "https://www.us.jll.com/en/properties",
    sourceType: "html",
    buildSearchUrl: (state, page = 1) =>
      `https://www.us.jll.com/en/properties#t=sale&s=${encodeURIComponent(state)}&p=${page}`,
    delayMs: 2000,
  },
  {
    id: "cushwake",
    name: "Cushman & Wakefield",
    states: ["DC", "NY", "CT", "MA"],
    searchUrl: "https://www.cushmanwakefield.com/en/united-states/properties",
    sourceType: "html",
    buildSearchUrl: (state, page = 1) =>
      `https://www.cushmanwakefield.com/en/united-states/properties?state=${encodeURIComponent(state)}&page=${page}`,
    delayMs: 2000,
  },
  {
    id: "colliers",
    name: "Colliers International",
    states: ["DC", "NY", "CT", "MA"],
    searchUrl: "https://www.colliers.com/en-us/properties",
    sourceType: "html",
    buildSearchUrl: (state, page = 1) =>
      `https://www.colliers.com/en-us/properties?state=${encodeURIComponent(state)}&type=sale&page=${page}`,
    delayMs: 2000,
  },
  {
    id: "marcusmillichap",
    name: "Marcus & Millichap",
    states: ["DC", "NY", "CT", "MA"],
    searchUrl: "https://www.marcusmillichap.com/properties",
    sourceType: "html",
    buildSearchUrl: (state, page = 1) =>
      `https://www.marcusmillichap.com/properties?state=${encodeURIComponent(state)}&page=${page}`,
    delayMs: 2000,
  },
  {
    id: "newmark",
    name: "Newmark",
    states: ["DC", "NY", "CT", "MA"],
    searchUrl: "https://www.nmrk.com/properties",
    sourceType: "html",
    buildSearchUrl: (state, page = 1) =>
      `https://www.nmrk.com/properties?location=${encodeURIComponent(state)}&page=${page}`,
    delayMs: 2000,
  },

  // --- DC-focused Firms ---
  {
    id: "transwestern",
    name: "Transwestern",
    states: ["DC"],
    searchUrl: "https://transwestern.com/properties",
    sourceType: "html",
    buildSearchUrl: (state, page = 1) =>
      `https://transwestern.com/properties?market=washington-dc&page=${page}`,
    delayMs: 2000,
  },
  {
    id: "lincoln-property",
    name: "Lincoln Property Company",
    states: ["DC", "NY"],
    searchUrl: "https://www.lpc.com/properties",
    sourceType: "html",
    buildSearchUrl: (state, page = 1) =>
      `https://www.lpc.com/properties?region=${state === "DC" ? "washington-dc" : "new-york"}&page=${page}`,
    delayMs: 2000,
  },
  {
    id: "vornado",
    name: "Vornado Realty Trust",
    states: ["DC", "NY"],
    searchUrl: "https://www.vno.com/properties",
    sourceType: "html",
    buildSearchUrl: (state) =>
      `https://www.vno.com/properties?market=${state === "DC" ? "washington" : "new-york"}`,
    delayMs: 2000,
  },

  // --- NY-focused Firms ---
  {
    id: "massey-knakal",
    name: "Massey Knakal (Cushman NY)",
    states: ["NY"],
    searchUrl: "https://www.cushmanwakefield.com/en/united-states/properties",
    sourceType: "html",
    buildSearchUrl: (_state, page = 1) =>
      `https://www.cushmanwakefield.com/en/united-states/properties?state=NY&page=${page}`,
    delayMs: 2000,
  },
  {
    id: "ariel-property",
    name: "Ariel Property Advisors",
    states: ["NY"],
    searchUrl: "https://arielpa.com/listings",
    sourceType: "html",
    buildSearchUrl: (_state, page = 1) =>
      `https://arielpa.com/listings?page=${page}`,
    delayMs: 2000,
  },
  {
    id: "gfp-realestate",
    name: "GFP Real Estate",
    states: ["NY"],
    searchUrl: "https://gfprealestate.com/available-spaces",
    sourceType: "html",
    buildSearchUrl: () => "https://gfprealestate.com/available-spaces",
    delayMs: 2000,
  },
  {
    id: "sl-green",
    name: "SL Green Realty",
    states: ["NY"],
    searchUrl: "https://www.slgreen.com/available-space",
    sourceType: "html",
    buildSearchUrl: () => "https://www.slgreen.com/available-space",
    delayMs: 2000,
  },
  {
    id: "houlihan-lawrence",
    name: "Houlihan Lawrence Commercial",
    states: ["NY"],
    searchUrl: "https://www.houlihanlawrence.com/commercial",
    sourceType: "html",
    buildSearchUrl: (_state, page = 1) =>
      `https://www.houlihanlawrence.com/commercial?page=${page}`,
    delayMs: 2000,
  },
  {
    id: "rand-commercial",
    name: "Rand Commercial",
    states: ["NY"],
    searchUrl: "https://www.randcommercial.com/search",
    sourceType: "html",
    buildSearchUrl: (_state, page = 1) =>
      `https://www.randcommercial.com/search?type=commercial&page=${page}`,
    delayMs: 2000,
  },

  // --- CT-focused Firms ---
  {
    id: "hb-nitkin",
    name: "HB Nitkin Group",
    states: ["CT"],
    searchUrl: "https://www.hbnitkin.com/properties",
    sourceType: "html",
    buildSearchUrl: () => "https://www.hbnitkin.com/properties",
    delayMs: 2000,
  },
  {
    id: "avison-young-ct",
    name: "Avison Young (CT)",
    states: ["CT"],
    searchUrl: "https://www.avisonyoung.us/properties",
    sourceType: "html",
    buildSearchUrl: (_state, page = 1) =>
      `https://www.avisonyoung.us/properties?state=CT&page=${page}`,
    delayMs: 2000,
  },
  {
    id: "angel-commercial",
    name: "Angel Commercial",
    states: ["CT"],
    searchUrl: "https://www.angelcommercial.com/listings",
    sourceType: "html",
    buildSearchUrl: () => "https://www.angelcommercial.com/listings",
    delayMs: 2000,
  },
  {
    id: "newmark-ct",
    name: "Newmark (CT)",
    states: ["CT"],
    searchUrl: "https://www.nmrk.com/properties",
    sourceType: "html",
    buildSearchUrl: (_state, page = 1) =>
      `https://www.nmrk.com/properties?location=Connecticut&page=${page}`,
    delayMs: 2000,
  },
  {
    id: "berkshire-hathaway-ct",
    name: "Berkshire Hathaway HS NE (CT)",
    states: ["CT"],
    searchUrl: "https://www.bhhsneproperties.com/commercial",
    sourceType: "html",
    buildSearchUrl: (_state, page = 1) =>
      `https://www.bhhsneproperties.com/commercial?state=CT&page=${page}`,
    delayMs: 2000,
  },

  // --- MA-focused Firms ---
  {
    id: "cresa-boston",
    name: "Cresa Boston",
    states: ["MA"],
    searchUrl: "https://www.cresa.com/boston/properties",
    sourceType: "html",
    buildSearchUrl: () => "https://www.cresa.com/boston/properties",
    delayMs: 2000,
  },
  {
    id: "lincoln-boston",
    name: "Lincoln Property (Boston)",
    states: ["MA"],
    searchUrl: "https://www.lpc.com/properties",
    sourceType: "html",
    buildSearchUrl: (_state, page = 1) =>
      `https://www.lpc.com/properties?region=boston&page=${page}`,
    delayMs: 2000,
  },
  {
    id: "nai-hunneman",
    name: "NAI Hunneman",
    states: ["MA"],
    searchUrl: "https://www.naihunneman.com/listings",
    sourceType: "html",
    buildSearchUrl: (_state, page = 1) =>
      `https://www.naihunneman.com/listings?page=${page}`,
    delayMs: 2000,
  },
  {
    id: "avison-young-boston",
    name: "Avison Young (Boston)",
    states: ["MA"],
    searchUrl: "https://www.avisonyoung.us/properties",
    sourceType: "html",
    buildSearchUrl: (_state, page = 1) =>
      `https://www.avisonyoung.us/properties?state=MA&page=${page}`,
    delayMs: 2000,
  },
  {
    id: "r-j-kelly",
    name: "R.J. Kelly & Company",
    states: ["MA"],
    searchUrl: "https://www.rjkelly.com/available-properties",
    sourceType: "html",
    buildSearchUrl: () => "https://www.rjkelly.com/available-properties",
    delayMs: 2000,
  },

  // --- Multi-listing Services / Aggregators ---
  {
    id: "loopnet",
    name: "LoopNet",
    states: ["DC", "NY", "CT", "MA"],
    searchUrl: "https://www.loopnet.com",
    sourceType: "html",
    buildSearchUrl: (state, page = 1) =>
      `https://www.loopnet.com/search/commercial-real-estate/${encodeURIComponent(state.toLowerCase())}/for-sale/?sk=&e=u&page=${page}`,
    delayMs: 3000,
  },
  {
    id: "crexi",
    name: "CREXi",
    states: ["DC", "NY", "CT", "MA"],
    searchUrl: "https://www.crexi.com/properties",
    sourceType: "html",
    buildSearchUrl: (state, page = 1) =>
      `https://www.crexi.com/properties?state=${encodeURIComponent(state)}&page=${page}`,
    delayMs: 2000,
  },
  {
    id: "costar",
    name: "CoStar",
    states: ["DC", "NY", "CT", "MA"],
    searchUrl: "https://www.costar.com",
    sourceType: "html",
    buildSearchUrl: (state) =>
      `https://www.costar.com/properties?state=${encodeURIComponent(state)}`,
    delayMs: 3000,
  },
  {
    id: "ten-x",
    name: "Ten-X Commercial",
    states: ["DC", "NY", "CT", "MA"],
    searchUrl: "https://www.ten-x.com/commercial",
    sourceType: "html",
    buildSearchUrl: (state, page = 1) =>
      `https://www.ten-x.com/commercial/properties?state=${encodeURIComponent(state)}&page=${page}`,
    delayMs: 2000,
  },
];

export const TARGET_STATES = ["DC", "NY", "CT", "MA"] as const;
export type TargetState = (typeof TARGET_STATES)[number];

export const STATE_REGIONS: Record<TargetState, string[]> = {
  DC: ["dc"],
  NY: ["nyc", "sullivan", "westchester"],
  CT: ["ct"],
  MA: ["boston"],
};

export function getBrokeragesForState(state: TargetState): BrokerageConfig[] {
  return BROKERAGE_CONFIGS.filter((b) => b.states.includes(state));
}

export function getAllBrokerages(): BrokerageConfig[] {
  return BROKERAGE_CONFIGS;
}
