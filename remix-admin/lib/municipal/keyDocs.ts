/**
 * Key reference documents shown near the top of each board/department page —
 * the actual code, plan, budget, report and application text a resident needs,
 * distinct from the departmental contact links in departments.ts/permits.ts
 * (staff & portals, not documents).
 *
 * Every entry is a document the Town itself has published, linked at its
 * source on northcastleny.gov, the CivicClerk portal or eCode360 — we do not
 * rehost and we do not edit. The set was reconciled in August 2026 against the
 * Town's own site (626 pages in its sitemap) and against the document archive
 * cached in Drive, so each page lists what the Town actually publishes for that
 * body rather than whichever handful of links happened to get added first.
 *
 * Conventions, please keep:
 *  - `note` says what the document is FOR, in plain language. The titles the
 *    Town publishes under ("Local Law 2 of 2026", "SD2 Enhance Upgrade
 *    Consultant RFP Results", "RP-524") tell a resident almost nothing on their
 *    own, and nobody should have to open a 200-page PDF to find out whether it
 *    answers their question.
 *  - `date` is the document's OWN date — adoption, publication, or the year it
 *    reports on — never when we linked it. Where the Town states no date, leave
 *    it off rather than guessing.
 *  - Chapter numbers are North Castle's actual chapters, cross-checked against
 *    lib/municipal/data/nc-towncode/analysis.json. (A widely-circulated chapter
 *    list for the town is wrong — it renumbers Ethics as 40, Subdivision as 360
 *    and Wetlands as 372. The real ones are 27, 275 and 340.)
 *  - Archive links (budgets, financial reports, water quality, stormwater)
 *    point at the Town's archive index where one exists, so the page doesn't go
 *    stale the moment a new year is posted.
 */

export interface KeyDoc {
  label: string
  href: string
  /** Source/format hint, e.g. 'PDF' or 'Chapter 355 · eCode360'. */
  sub?: string
  /** The document's own date — a year, or a fuller date where the Town gives one. */
  date?: string
  /** One line on what this document is for, in plain language. */
  note?: string
}

const DC = 'https://www.northcastleny.gov/DocumentCenter/View'
const AC = 'https://www.northcastleny.gov/ArchiveCenter/ViewFile/Item'

const NC_KEY_DOCS: Record<string, KeyDoc[]> = {
  town_board: [
    {
      label: 'Town Code',
      href: 'https://ecode360.com/NO0492',
      sub: 'General Code · eCode360',
      note: 'The full book of North Castle local law, all 52 chapters, kept current by the codifier. Everything the Town Board adopts ends up here.',
    },
    {
      label: 'Agendas, minutes & meeting video',
      href: 'https://northcastleny.portal.civicclerk.com/',
      sub: 'CivicClerk portal',
      note: "The Town's official meeting record for every board — agenda packets before each meeting, approved minutes after, and the recording.",
    },
    {
      label: 'Adopted local laws',
      href: 'https://www.northcastleny.gov/ArchiveCenter#category-30',
      sub: 'Town Clerk archive',
      note: 'Each local law the Board has adopted, as signed and filed. Recent years cover short-term rentals, EV charging, special events and the tax-cap override.',
    },
    {
      label: 'Adopted budgets',
      href: 'https://www.northcastleny.gov/160/Budgets-Annual-Financial-Reports',
      sub: 'Archive · 2007 to present',
      date: 'Annual',
      note: 'What the Town plans to spend and how much of it comes from your tax bill, adopted every autumn for the year ahead.',
    },
    {
      label: 'Code of Ethics',
      href: 'https://ecode360.com/29155311',
      sub: 'Chapter 27 · eCode360',
      note: 'The conduct rules that bind Town officers and employees — disclosure, conflicts of interest, and what has to be recused.',
    },
    {
      label: 'Comprehensive Plan',
      href: `${DC}/211/Town-Comprehensive-Plan---2018-PDF`,
      sub: 'PDF',
      date: '2018',
      note: "The Town's adopted long-range policy for land use, housing, transport and open space. Boards cite it directly when weighing an application.",
    },
    {
      label: 'Proposed new Town Hall — RFEI and responses',
      href: 'https://www.northcastleny.gov/1026/The-New-Town-Hall-Project',
      sub: 'Project page',
      date: '2025–2026',
      note: 'The request for expressions of interest on redeveloping 15/17/21 Bedford Road, the developer responses received, and the resolutions extending it.',
    },
    {
      label: 'Police Reform and Reinvention Plan',
      href: `${DC}/630/Adopted-Police-Reform-and-Reinvention-Plan-March-24-2021-PDF`,
      sub: 'PDF',
      date: 'Adopted 24 Mar 2021',
      note: 'The plan the Board adopted under the 2020 State mandate, after a stakeholder process — policing priorities, use of force, and community engagement commitments.',
    },
    {
      label: 'Bids and requests for proposals',
      href: 'https://www.northcastleny.gov/775/Bids-Requests-for-Proposals',
      sub: 'Town page · 39 documents',
      date: '2016–2022',
      note: 'Every solicitation the Town has put out — water and sewer service contracts, engineering studies, road work. The clearest record of what the Town buys and from whom.',
    },
    {
      label: 'Public notices',
      href: 'https://www.northcastleny.gov/908/Public-Notices',
      sub: 'Town page · 13 documents',
      date: '2026',
      note: 'Statutory notices of public hearings and proposed local laws, posted as they are issued. This is where a hearing is announced before it happens.',
    },
    {
      label: 'Town Hall Advisory Committee',
      href: 'https://www.northcastleny.gov/1089/Town-Hall-Advisory-Committee',
      sub: 'Town page · 7 documents',
      date: '1966–2026',
      note: 'The committee weighing what to do with the Bedford Road town hall site, including the 1966 building history behind the decision.',
    },
  ],

  planning: [
    {
      label: 'Comprehensive Plan',
      href: `${DC}/211/Town-Comprehensive-Plan---2018-PDF`,
      sub: 'PDF',
      date: '2018',
      note: "The adopted long-range plan. Board members quote it by name when they think an application does or doesn't fit the town's stated direction.",
    },
    {
      label: 'Comprehensive Plan appendix',
      href: `${DC}/213/Town-Comprehensive-Plan-Appendix---2018-PDF`,
      sub: 'PDF',
      date: '2018',
      note: 'The supporting studies, data and maps behind the plan.',
    },
    {
      label: 'Zoning Code',
      href: 'https://ecode360.com/36929254',
      sub: 'Chapter 355 · eCode360',
      note: 'What may be built where — districts, permitted uses, setbacks, height, coverage and the special-permit standards.',
    },
    {
      label: 'Current zoning map',
      href: `${DC}/1085`,
      sub: 'PDF',
      note: 'The map that goes with Chapter 355 — which district any given property sits in.',
    },
    {
      label: 'Subdivision of Land',
      href: 'https://ecode360.com/29140298',
      sub: 'Chapter 275 · eCode360',
      note: 'The rules for splitting a lot: what a preliminary and final plat must show, and what the Board may require before approving one.',
    },
    {
      label: 'Application forms & checklists',
      href: 'https://www.northcastleny.gov/198/Application-Forms-Checklists',
      sub: 'Forms index',
      note: 'Every form the Board accepts — site development plan, special use permit, preliminary and final subdivision, wetlands and tree removal — each with its submission checklist.',
    },
    {
      label: 'Site Development Plan application',
      href: `${DC}/180/Site-Development-Plan-PDF`,
      sub: 'PDF',
      note: 'The main application for anything that changes a site: what to file, the fee, and the review sequence.',
    },
    {
      label: 'Future Land Use Plan',
      href: `${DC}/215/Future-Land-Use-Plan-PDF`,
      sub: 'PDF',
      date: '2018',
      note: 'The map of what the Comprehensive Plan wants each part of town to become, which is not always what the current zoning allows.',
    },
    {
      label: 'Official Map',
      href: `${DC}/216/Official-Map-PDF`,
      sub: 'PDF',
      note: "The Town's official record of streets, parks and drainage rights-of-way.",
    },
    {
      label: 'Armonk Parking Study',
      href: `${DC}/191/Armonk-Parking-Study-Final-Report-April-2020-PDF`,
      sub: 'PDF',
      date: 'April 2020',
      note: 'The study behind the long-running Main Street parking district — supply, turnover, and why the off-street requirement is hard for hamlet restaurants to meet.',
    },
    {
      label: 'Armonk Main Street Planning and Design Study',
      href: `${DC}/294/Armonk-Main-Street-Planning-and-Design-St`,
      sub: 'PDF',
      note: 'Design direction for the hamlet centre — streetscape, frontage and building form.',
    },
    {
      label: 'Hamlet Design Guidelines',
      href: `${DC}/291/Town-of-North-Castle-Hamlet-Design-Guidel`,
      sub: 'PDF',
      note: 'What the Town expects new building in the hamlets to look like; referenced in Architectural Review Board and Planning Board discussion.',
    },
    {
      label: 'Stormwater Management',
      href: 'https://ecode360.com/29156827',
      sub: 'Chapter 267 · eCode360',
      note: 'Stormwater and erosion control standards — one of the recurring conditions on Planning Board approvals.',
    },
    {
      label: 'Historic zoning laws and maps, 1929–2015',
      href: 'https://www.northcastleny.gov/762/Zoning-Information',
      sub: 'Archive · 18 documents',
      date: '1929–2015',
      note: "Every previous zoning law and map the Town has adopted. Useful for establishing when a nonconforming lot or use became nonconforming.",
    },
    {
      label: '2026 Planning Board meeting dates',
      href: `${DC}/2742/2026-Planning-Board-Meeting-Dates-PDF`,
      sub: 'PDF',
      date: '2026',
      note: 'The published calendar of regular meetings and the submission deadline before each.',
    },
    {
      label: 'The Enclave — project file',
      href: 'https://www.northcastleny.gov/801/The-Enclave-formerly-known-as-Airport-Ca',
      sub: 'Town page · 32 documents',
      date: '2018–2023',
      note: 'The full record for the Airport Campus rezoning: the zoning petition, the environmental impact statements and the hearing presentations.',
    },
    {
      label: 'The Summit Club — SEQRA record',
      href: 'https://www.northcastleny.gov/200/The-Summit-Club-SEQRA-Documents',
      sub: 'Town page · 20 documents',
      date: '2020',
      note: 'The environmental review for the former Brynwood site — scope, three volumes of draft impact statement, and the adopted findings that closed it.',
    },
    {
      label: 'Park Place at Westchester Airport',
      href: 'https://www.northcastleny.gov/210/Park-Place-at-Westchester-Airport-Docume',
      sub: 'Town page · 16 documents',
      date: '2020',
      note: 'Impact statements, drawings and the annotated hearing correspondence for the Park Place application.',
    },
    {
      label: 'Eagle Ridge',
      href: 'https://www.northcastleny.gov/806/Eagle-Ridge',
      sub: 'Town page · 13 documents',
      date: '2019–2022',
      note: 'The Eagle Ridge review through to its amended SEQRA findings statement.',
    },
    {
      label: 'The Gateway — 45 Bedford Road',
      href: 'https://www.northcastleny.gov/800/The-Gateway---45-Bedford-Road-formerly-k',
      sub: 'Town page · 13 documents',
      date: '2018–2026',
      note: 'The special use permit for the former Mariani site and each extension granted since — useful for tracking how long an approval has run.',
    },
    {
      label: 'The Summit Club — permits',
      href: 'https://www.northcastleny.gov/802/The-Summit-Club-formerly-known-as-Brynwo',
      sub: 'Town page · 9 documents',
      date: '2019–2024',
      note: 'The special use permit application and the temporary membership-club approvals issued while the main application was pending.',
    },
    {
      label: 'Planning studies',
      href: 'https://www.northcastleny.gov/215/Planning-Studies',
      sub: 'Town page · 7 documents',
      date: '1990–2020',
      note: "The Town's commissioned planning work going back three decades — the background most current proposals are argued against.",
    },
    {
      label: 'Town maps',
      href: 'https://www.northcastleny.gov/219/Town-Maps',
      sub: 'Town page · 10 documents',
      date: '2020',
      note: 'Zoning, tax and street maps as published by the Town.',
    },
  ],

  zba: [
    {
      label: 'ZBA application',
      href: `${DC}/671/ZBA-Application-PDF`,
      sub: 'PDF',
      note: 'The form for an area or use variance, including the statutory tests the Board must weigh — neighbourhood character, whether the difficulty is self-created, and whether a lesser alternative exists.',
    },
    {
      label: 'Zoning Code',
      href: 'https://ecode360.com/36929254',
      sub: 'Chapter 355 · eCode360',
      note: 'The requirement you would be asking the Board to vary — setbacks, coverage, height, floor area and permitted uses by district.',
    },
    {
      label: 'Current zoning map',
      href: `${DC}/1085`,
      sub: 'PDF',
      note: 'Which district a property sits in, which determines which dimensional rules apply to it.',
    },
    {
      label: '2026 ZBA meeting dates',
      href: `${DC}/2618/2026-ZBA-Meeting-Dates`,
      sub: 'PDF',
      date: '2026',
      note: 'When the Board sits and when an application must be in to be heard.',
    },
    {
      label: 'Historic zoning laws and maps, 1929–2015',
      href: 'https://www.northcastleny.gov/762/Zoning-Information',
      sub: 'Archive · 18 documents',
      date: '1929–2015',
      note: 'Often decisive here: whether a lot or structure was lawful when built usually turns on which zoning law was in force at the time.',
    },
    {
      label: 'Agendas, minutes & meeting video',
      href: 'https://northcastleny.portal.civicclerk.com/',
      sub: 'CivicClerk portal',
      note: "The Board's official record — agenda packets with the application materials, and the approved minutes recording how each vote was cast.",
    },
  ],

  arb: [
    {
      label: 'ARB application',
      href: `${DC}/251/ARB-Application-PDF`,
      sub: 'PDF',
      note: 'The form for architectural review — what to submit for exterior design, materials, colour and signage.',
    },
    {
      label: 'Architectural Review Board overview',
      href: `${DC}/3123/Architectural-Review-Board-PDF`,
      sub: 'PDF',
      note: "What the Board reviews and the standards it applies.",
    },
    {
      label: 'Hamlet Design Guidelines',
      href: `${DC}/291/Town-of-North-Castle-Hamlet-Design-Guidel`,
      sub: 'PDF',
      note: 'The design expectations for building in the hamlet centres that the Board works from.',
    },
    {
      label: 'Sign application',
      href: `${DC}/246/Sign-Application-PDF`,
      sub: 'PDF',
      note: 'Signage goes to this Board for design and colour approval, often after a size variance from the ZBA.',
    },
    {
      label: '2026 ARB meeting dates',
      href: `${DC}/2924/2026-ARB-Meeting-Dates`,
      sub: 'PDF',
      date: '2026',
      note: 'The published calendar; the Board meets as applications require.',
    },
  ],

  conservation: [
    {
      label: 'Wetlands and Watercourse Protection',
      href: 'https://ecode360.com/29141587',
      sub: 'Chapter 340 · eCode360',
      note: 'The permit requirement for work in or near a wetland, watercourse or buffer, and the five-year mitigation monitoring plan that comes with it.',
    },
    {
      label: 'Wetlands permit application',
      href: `${DC}/190/Wetlands-Permit-PDF`,
      sub: 'PDF',
      note: 'The form for work in a regulated wetland or buffer.',
    },
    {
      label: 'Conservation Board submission checklist',
      href: `${DC}/1877/Conservation-Board_-Submission-Checklist-PDF`,
      sub: 'PDF',
      note: 'What has to be in a submission before the Board will take it up.',
    },
    {
      label: 'North Castle Biodiversity Plan',
      href: `${DC}/503/North-Castle-Biodiversity-Plan-PDF`,
      sub: 'PDF',
      note: 'The habitat and species inventory the Board works from when assessing what a site holds.',
    },
    {
      label: 'North Castle Watershed Map',
      href: `${DC}/522/North-Castle-Watershed-Map-PDF`,
      sub: 'PDF',
      note: 'Which watershed a property drains to — much of the town drains to New York City reservoirs, which brings additional rules.',
    },
    {
      label: 'Assessment of Hydrogeologic Conditions',
      href: `${DC}/504/Assessment-of-Hydrogeologic-Conditions-Town-of-North-Castle-Conservation-Board-1990-PDF`,
      sub: 'PDF',
      date: '1990',
      note: "The Board's groundwater study — still cited on well and septic questions.",
    },
    {
      label: 'State of the Environment in North Castle',
      href: `${DC}/2776/2001-State-of-of-the-Environment-in-North-Castle`,
      sub: 'PDF',
      date: '2001',
      note: 'A baseline environmental report for the town.',
    },
    {
      label: 'Brochure on septic systems',
      href: `${DC}/502/Brochure-on-Septic-Systems-PDF`,
      sub: 'PDF',
      note: 'Homeowner guidance on maintaining a septic system, which most of the town relies on.',
    },
    {
      label: 'Brochure on lawn care and pesticides',
      href: `${DC}/501/Brochure-on-Lawn-Care-and-Pesticides-PDF`,
      sub: 'PDF',
      note: 'Homeowner guidance on reducing runoff into wetlands and reservoirs.',
    },
    {
      label: '2026 Conservation Board meeting dates',
      href: `${DC}/2585`,
      sub: 'PDF',
      date: '2026',
      note: 'When the Board sits and the submission deadline before each meeting.',
    },
    {
      label: 'Conservation Board brochures and reports',
      href: 'https://www.northcastleny.gov/656/Conservation-Board-Brochures-Reports',
      sub: 'Town page · 6 documents',
      date: '1990–2001',
      note: "The Board's own published guidance, collected in one place.",
    },
    {
      label: 'Wetlands guidance',
      href: 'https://www.northcastleny.gov/669/Wetlands',
      sub: 'Town page · 5 documents',
      note: 'What counts as a regulated wetland here and when a permit is needed before work near one.',
    },
    {
      label: 'Watersheds',
      href: 'https://www.northcastleny.gov/667/Watersheds',
      sub: 'Town page · 4 documents',
      note: 'Which watershed a property drains into — relevant because parts of the Town sit in the New York City water supply watershed.',
    },
    {
      label: 'Wildlife',
      href: 'https://www.northcastleny.gov/670/Wildlife',
      sub: 'Town page · 6 documents',
      note: 'Guidance on deer, coyotes, bears and other wildlife the Town fields questions about.',
    },
    {
      label: 'Native plants',
      href: 'https://www.northcastleny.gov/660/Plants',
      sub: 'Town page · 5 documents',
      note: 'Planting and invasive-species guidance.',
    },
  ],

  open_space: [
    {
      label: 'Open Space Study Committee Report',
      href: `${DC}/292/Town-of-North-Castle-Open-Space-Study-Com`,
      sub: 'PDF',
      date: '2003',
      note: "The study that framed the Town's open-space priorities and the criteria for what is worth acquiring.",
    },
    {
      label: 'Trust for Public Land — public finance feasibility study',
      href: `${DC}/2878/Trust-for-Public-Land-North-Castle-Public-Finance-Feasibility-Study-Nov-2025-PDF`,
      sub: 'PDF',
      date: 'November 2025',
      note: 'An outside assessment of how North Castle could fund open-space acquisition, including what residents might support.',
    },
    {
      label: 'Potential open space acquisition criteria',
      href: 'https://www.northcastleny.gov/700/Potential-Open-Space-Acquisition-Criteri',
      sub: 'Town page',
      note: 'The tests the Committee applies when deciding whether to recommend a parcel.',
    },
    {
      label: 'Committee newsletters',
      href: `${DC}/662/Past-Newsletters-PDF`,
      sub: 'PDF',
      note: "The Committee's own account of what it has been working on.",
    },
    {
      label: 'Open Space Committee meeting dates 2026',
      href: `${DC}/2673/Open-Space-Committee-Meeting-Dates-2026-PDF`,
      sub: 'PDF',
      date: '2026',
      note: 'The published meeting calendar.',
    },
  ],

  parks_rec: [
    {
      label: 'Parks & Recreation Advisory Board mandate',
      href: `${DC}/1147/PRAB-Mandate`,
      sub: 'PDF',
      note: 'What the advisory board is charged with doing and what it may recommend to the Town Board.',
    },
    {
      label: 'Map of North Castle town parks',
      href: `${DC}/169/Map-of-North-Castle-Town-Parks-PDF`,
      sub: 'PDF',
      note: 'Where the parks and facilities are.',
    },
    {
      label: 'Recreation programme brochure',
      href: `${DC}/3228/Fall-Brochure-2026`,
      sub: 'PDF',
      date: 'Fall 2026',
      note: 'The season’s programmes, camps and registration dates.',
    },
    {
      label: 'Facility rental application',
      href: `${DC}/1723/Recreation-Facility-Rental-Application-Updated`,
      sub: 'PDF',
      note: 'How to book a field, court or town facility.',
    },
    {
      label: 'Parks and Public Lands',
      href: 'https://ecode360.com/29156404',
      sub: 'Chapter 229 · eCode360',
      note: 'The rules that govern use of town parks — hours, permits and conduct.',
    },
    {
      label: '2026 Advisory Board meeting dates',
      href: `${DC}/1573/2026-Parks-and-Recreations-Advisory-Board-Meeting-Dates-PDF`,
      sub: 'PDF',
      date: '2026',
      note: 'When the advisory board meets.',
    },
    {
      label: 'Recreation forms',
      href: 'https://www.northcastleny.gov/788/Recreation-Forms',
      sub: 'Town page · 8 documents',
      date: '2026',
      note: 'Registration and permission forms for Town programmes.',
    },
    {
      label: 'Camp Chippewa',
      href: 'https://www.northcastleny.gov/190/Camp-Chippewa',
      sub: 'Town page · 3 documents',
      date: '2026',
      note: 'The Town day camp — registration, dates and fees.',
    },
    {
      label: 'Pool',
      href: 'https://www.northcastleny.gov/195/Pool',
      sub: 'Town page · 4 documents',
      date: '2026',
      note: 'Season passes, hours and pool rules.',
    },
    {
      label: 'Parks and facilities',
      href: 'https://www.northcastleny.gov/194/Parks-Facilities',
      sub: 'Town page · 3 documents',
      note: 'What each park holds and which facilities can be reserved.',
    },
  ],

  building: [
    {
      label: 'Building permit applications & forms',
      href: 'https://www.northcastleny.gov/206/Building-Applications-Information',
      sub: 'Forms index · 50+ documents',
      note: 'Everything the department accepts in one place — residential and commercial building permits, plumbing, HVAC, sign, blasting, rock chipping, tree removal, floodplain, outdoor dining, fire safety and certificate of occupancy.',
    },
    {
      label: 'Building Code Administration and Enforcement',
      href: 'https://ecode360.com/29139563',
      sub: 'Chapter 127 · eCode360',
      note: 'How North Castle administers the State building code — when a permit is needed, inspections, and enforcement.',
    },
    {
      label: 'Zoning Code',
      href: 'https://ecode360.com/36929254',
      sub: 'Chapter 355 · eCode360',
      note: 'The dimensional limits a permit is checked against: setbacks, height, floor area and lot coverage.',
    },
    {
      label: 'Fee schedule',
      href: 'https://www.northcastleny.gov/212/Building-Department-Fee-Schedule-2024-PD',
      sub: 'PDF',
      note: 'What each permit costs, generally scaled to the declared cost of construction.',
    },
    {
      label: "Customer's guide to the building permit process",
      href: 'https://www.northcastleny.gov/213/Customers-Guide-to-the-Building-Permit-P',
      sub: 'Town page',
      note: 'The department’s own walk-through of the sequence from application to certificate of occupancy.',
    },
    {
      label: 'Residential building permit application',
      href: `${DC}/233/Building-Permit-Application-Residential-PDF`,
      sub: 'PDF',
      note: 'The main form for work on a house.',
    },
    {
      label: 'Commercial building permit application',
      href: `${DC}/232/Building-Permit-Application-Commercial-PDF`,
      sub: 'PDF',
      note: 'The main form for work on a business property.',
    },
    {
      label: 'Gross land coverage worksheet',
      href: `${DC}/239/Gross-Land-Coverage-Worksheet-PDF`,
      sub: 'PDF',
      note: 'How coverage is calculated — the figure that most often turns a routine permit into a variance application.',
    },
    {
      label: 'Rock chipping permit application',
      href: `${DC}/243/Rock-Chipping-Permit-application-PDF`,
      sub: 'PDF',
      note: 'Required for the rock chipping that most excavation here involves; hours are restricted and it is not subject to a public hearing.',
    },
    {
      label: 'RPRC application',
      href: `${DC}/244/RPRC-Application-PDF`,
      sub: 'PDF',
      note: 'The Residential Project Review Committee screens larger house projects before they reach the Planning Board or the building department.',
    },
    {
      label: 'Blasting, Explosives and Chipping',
      href: 'https://ecode360.com/29155520',
      sub: 'Chapter 122 · eCode360',
      note: 'The limits on blasting and chipping — permitted hours, notice and monitoring.',
    },
    {
      label: 'Flood damage prevention',
      href: 'https://ecode360.com/29155878',
      sub: 'Chapter 177 · eCode360',
      note: 'What applies to building in a mapped floodplain.',
    },
    {
      label: 'Online permitting',
      href: 'https://www.northcastleny.gov/218/Online-Permitting',
      sub: 'Town page · 10 documents',
      date: '2026',
      note: "How to file and track a permit through the Town's online portal instead of on paper.",
    },
    {
      label: 'Septic systems',
      href: 'https://www.northcastleny.gov/662/Septic-Systems',
      sub: 'Town page · 10 documents',
      note: 'Requirements for new and replacement septic systems — much of the Town is unsewered, so this governs a great many projects.',
    },
    {
      label: 'Residential generator applications',
      href: 'https://www.northcastleny.gov/221/Residential-Generator-Application-Inform',
      sub: 'Town page · 5 documents',
      date: '2026',
      note: 'What a standby generator installation needs, including the noise and setback limits.',
    },
    {
      label: 'Residential Project Review Committee',
      href: 'https://www.northcastleny.gov/707/Residential-Project-Review-Committee-RPR',
      sub: 'Town page · 3 documents',
      date: '2026',
      note: 'The committee that reviews larger houses before the Building Department issues a permit, and what triggers its review.',
    },
  ],

  finance: [
    {
      label: 'Adopted budgets, 2007 to present',
      href: 'https://www.northcastleny.gov/160/Budgets-Annual-Financial-Reports',
      sub: 'Archive · 21 budgets',
      date: 'Annual',
      note: "Every adopted budget the Town has published. The budget sets the tax levy and what each department may spend for the year ahead.",
    },
    {
      label: 'Adopted budget',
      href: `${AC}/461`,
      sub: 'PDF',
      date: '2026',
      note: 'The current year’s adopted budget in full.',
    },
    {
      label: "Annual Comprehensive Financial Report & auditor's report",
      href: `${AC}/492`,
      sub: 'PDF',
      date: '2025',
      note: 'The audited statements — what the Town actually took in and spent, with the independent auditor’s opinion and any findings.',
    },
    {
      label: "Financial report archive, 2007 to present",
      href: 'https://www.northcastleny.gov/160/Budgets-Annual-Financial-Reports',
      sub: 'Archive · 19 reports',
      note: 'Prior years of audited financial statements, for comparing across time rather than one year in isolation.',
    },
    {
      label: 'Taxation',
      href: 'https://ecode360.com/29140672',
      sub: 'Chapter 288 · eCode360',
      note: 'The local law behind exemptions, instalments and penalties on the tax bill.',
    },
    {
      label: 'Understanding your tax bill',
      href: 'https://www.northcastleny.gov/590/Understanding-Your-Tax-Bill',
      sub: 'Town page',
      note: "A breakdown of which lines on the bill are the Town's and which belong to the county, school district and special districts — most of the bill is not the Town's.",
    },
  ],

  highway: [
    {
      label: 'Street & right-of-way opening application',
      href: `${DC}/149/Street-and-Right-of-Way-Opening-Application-Fillable-Form-PDF`,
      sub: 'Fillable PDF',
      note: 'Required before cutting into a town road — for a utility connection, a new water or sewer service, or a driveway tie-in.',
    },
    {
      label: 'Street opening permit requirements',
      href: `${DC}/147/Street-Opening-Permit-Requirements-PDF`,
      sub: 'PDF',
      note: 'The conditions attached to that permit — restoration standards, insurance and bonding.',
    },
    {
      label: 'Curb cut permit requirements',
      href: `${DC}/143/Curb-Cut-Permit-Requirements-PDF`,
      sub: 'PDF',
      note: 'What is required to create or widen a driveway entrance onto a town road.',
    },
    {
      label: 'Driveway alteration & resurfacing requirements',
      href: `${DC}/142/Driveway-Alteration---Resurfacing-Requirements-PDF`,
      sub: 'PDF',
      note: 'Standards for resurfacing or regrading a driveway where it meets the road.',
    },
    {
      label: 'Brush pickup schedule',
      href: `${DC}/1713/2026-Brush-Chart-Calendar-PDF`,
      sub: 'PDF',
      date: '2026',
      note: 'Which week the department collects brush in each part of town.',
    },
    {
      label: 'Pavement management presentation',
      href: `${DC}/140/Pavement-Management-Presentation-PDF`,
      sub: 'PDF',
      note: 'How the department rates road condition and decides the paving order — the answer to "why not my street".',
    },
    {
      label: 'Advice from your Highway Department',
      href: `${DC}/145/Advice-from-Your-Highway-Department-PDF`,
      sub: 'PDF',
      note: 'Practical guidance for residents: mailboxes, plowing, drainage and what the department will and will not do on private property.',
    },
    {
      label: 'Winter safety',
      href: `${DC}/146/Winter-Safety-DOC`,
      sub: 'Document',
      note: 'Snow and ice operations, parking restrictions during storms, and what to expect from plowing.',
    },
    {
      label: 'Composting',
      href: `${DC}/144/Composting-PDF`,
      sub: 'PDF',
      note: 'Home composting guidance, offered as an alternative to brush and yard-waste collection.',
    },
    {
      label: 'Streets and Sidewalks',
      href: 'https://ecode360.com/29157105',
      sub: 'Chapter 271 · eCode360',
      note: 'The local law governing work in the right-of-way, obstructions and sidewalk responsibility.',
    },
    {
      label: 'Vehicles and Traffic',
      href: 'https://ecode360.com/29141044',
      sub: 'Chapter 325 · eCode360',
      note: 'Parking restrictions, speed limits and traffic controls, including the schedules the Town Board amends by local law.',
    },
    {
      label: 'Bag programme',
      href: 'https://www.northcastleny.gov/177/Bag-Program',
      sub: 'Town page · 11 documents',
      date: '2026',
      note: "How the Town's yard-waste bag collection works and where to buy the bags.",
    },
    {
      label: 'Dig Safely / 811',
      href: 'https://www.northcastleny.gov/175/About-Dig-Safely-811',
      sub: 'Town page · 11 documents',
      date: '2026',
      note: 'The mark-out you are required to request before any excavation.',
    },
    {
      label: 'Waste and recycling',
      href: 'https://www.northcastleny.gov/276/Waste-Recycling',
      sub: 'Town page · 3 documents',
      date: '2026',
      note: 'Collection schedules and what the Town will and will not take.',
    },
  ],

  police: [
    {
      label: 'Police Reform and Reinvention Plan',
      href: `${DC}/630/Adopted-Police-Reform-and-Reinvention-Plan-March-24-2021-PDF`,
      sub: 'PDF',
      date: 'Adopted 24 Mar 2021',
      note: 'The plan the Town Board adopted under the 2020 State mandate, following a public stakeholder process.',
    },
    {
      label: 'Use of force policy',
      href: `${DC}/377/Use-of-Force-Policy-PDF`,
      sub: 'PDF',
      note: "The department's own written policy on when and how force may be used.",
    },
    {
      label: 'Compliment or complaint form',
      href: 'https://www.northcastleny.gov/280/Police-Officer-Compliment-Complaint-Form',
      sub: 'Town form',
      note: 'How to formally commend an officer or file a complaint about one.',
    },
    {
      label: 'Motor vehicle accident report request',
      href: `${DC}/362/Motor-Vehicle-Accident-Report-PDF`,
      sub: 'PDF',
      note: 'How to obtain a copy of an accident report — what insurers usually ask for.',
    },
    {
      label: 'Identity theft recovery packet',
      href: `${DC}/363/Identity-Theft-Packet---a-Recovery-Plan-PDF`,
      sub: 'PDF',
      note: 'Step-by-step guidance the department gives residents who have been defrauded.',
    },
    {
      label: 'Burglary prevention information',
      href: `${DC}/376/Burglary-Prevention-Information-PDF`,
      sub: 'PDF',
      note: 'Home security guidance from the department.',
    },
    {
      label: 'Police reform supporting documents',
      href: 'https://www.northcastleny.gov/691/North-Castle-Police-Reform',
      sub: 'Project page · 7 documents',
      date: '2020–2021',
      note: 'The full reform file — the department fact sheet and overview, the State workbook, the stakeholder timeline and the framework the plan was built on.',
    },
    {
      label: "Megan's Law",
      href: 'https://www.northcastleny.gov/278/Megans-Law',
      sub: 'Town page · 5 documents',
      note: 'How the registry works and what the Department may disclose.',
    },
    {
      label: 'Child safety seat programme',
      href: 'https://www.northcastleny.gov/262/Child-Safety-Seat-Program',
      sub: 'Town page · 3 documents',
      note: 'Free car-seat inspection and fitting by certified officers.',
    },
    {
      label: 'Hope Not Handcuffs',
      href: 'https://www.northcastleny.gov/269/Hope-Not-Handcuffs-Substance-Abuse-Assis',
      sub: 'Town page · 3 documents',
      note: "The Department's route into substance-abuse treatment without arrest.",
    },
    {
      label: 'Bicycle, e-bike and e-scooter safety',
      href: 'https://www.northcastleny.gov/1053/Bicycle-E-Bike-and-E-Scooter-Safety',
      sub: 'Town page · 3 documents',
      note: 'The rules that apply to e-bikes and scooters on Town roads.',
    },
  ],

  assessor: [
    {
      label: 'Assessor forms',
      href: 'https://www.northcastleny.gov/779/Assessor-Forms',
      sub: 'Forms index · 21 documents',
      note: 'Every exemption and assessment form in one place — STAR, senior, veteran, clergy, volunteer firefighter, non-profit, and change of address.',
    },
    {
      label: 'Grievance form RP-524',
      href: `${DC}/132/Grievance-Form-RP-524-PDF`,
      sub: 'PDF',
      note: 'The form for challenging your assessment before the Board of Assessment Review, which sits once a year on Grievance Day.',
    },
    {
      label: 'Grievance form RP-524 — instructions',
      href: `${DC}/134/Grievance-Form-RP-524-Instructions-PDF`,
      sub: 'PDF',
      note: 'How to complete the grievance form and what evidence of value to bring.',
    },
    {
      label: 'Grievance questionnaire',
      href: `${DC}/133/Grievance-Questionnaire-For-Commercial-and-Residential-Properties-PDF`,
      sub: 'PDF',
      note: 'The supplementary questionnaire the Town asks residential and commercial grievants to complete.',
    },
    {
      label: 'Enhanced STAR exemption (RP-425-E)',
      href: `${DC}/130/RP---425-E--Application-for-Enhanced-STAR-Exemption-PDF`,
      sub: 'PDF',
      note: 'The larger school-tax exemption for qualifying owners aged 65 and over.',
    },
    {
      label: 'Senior citizen exemption (RP-467)',
      href: `${DC}/128/RP---467---Senior-Citizen-Exemption-PDF`,
      sub: 'PDF',
      note: 'The income-based partial exemption for owners aged 65 and over, separate from STAR.',
    },
    {
      label: 'Alternative veterans exemption (RP-458-a)',
      href: `${DC}/124/RP---458-a---Alternative-Veterans-Exemption-PDF`,
      sub: 'PDF',
      note: 'The partial exemption for wartime veterans.',
    },
    {
      label: 'Tax assessment information',
      href: 'https://www.northcastleny.gov/734/Tax-Assessment-Information',
      sub: 'Town page',
      note: 'How assessments are set, what the equalisation rate does, and the assessment calendar.',
    },
    {
      label: 'Exemption forms',
      href: 'https://www.northcastleny.gov/921/Exemption-Forms',
      sub: 'Town page · 12 documents',
      note: 'Every exemption application the Assessor accepts, collected in one place.',
    },
    {
      label: 'Tax payment information',
      href: 'https://www.northcastleny.gov/589/Tax-Payment-Information',
      sub: 'Town page · 5 documents',
      date: '2012–2013',
      note: 'When the bills come out, where payment goes and what happens if it is late.',
    },
  ],

  water_sewer: [
    {
      label: 'Annual water quality reports',
      href: 'https://www.northcastleny.gov/666/Water-Quality',
      sub: 'Archive · 70+ reports',
      date: 'Annual',
      note: "Every district's annual water supply report, required by the State — what was tested for, what was found, and how it compares to the limit. Districts 1, 2, 4 and 5 each report separately.",
    },
    {
      label: 'Water district maps & service areas',
      href: 'https://www.northcastleny.gov/677/Water-Sewer-District-Locations-Service-A',
      sub: 'Town page',
      note: 'Which district — if any — serves a given address. Much of the town is on private wells and septic rather than any district.',
    },
    {
      label: 'PFAS updates',
      href: 'https://www.northcastleny.gov/1043/PFAS-Updates',
      sub: 'Project page',
      note: 'The Town’s running file on PFAS in local water — fact sheets for public-supply and private-well owners, in-home filtration options, and State updates.',
    },
    {
      label: 'Sewer District 2 capacity report',
      href: `${DC}/561/Sewer-District-Number-2-Capacity-Report-2013-PDF`,
      sub: 'PDF',
      date: '2013',
      note: 'How much load the treatment plant can take — the constraint behind several development decisions in Armonk.',
    },
    {
      label: 'Sewer District 2 WWTP capacity increase report',
      href: `${DC}/562/Sewer-District-Number-2-WWTP-Capacity-Increase-Report-2016-PDF`,
      sub: 'PDF',
      date: '2016',
      note: 'The engineering case for expanding that capacity, and what it would take.',
    },
    {
      label: 'Water District 1 hydraulic model study',
      href: `${DC}/639/Water-District-1-WD1-GHD-Hydraulic-Model-Study-2019-PDF`,
      sub: 'PDF',
      date: '2019',
      note: 'How the distribution system performs under demand — pressure, storage and where it is weakest.',
    },
    {
      label: 'Water District 4 capacity study',
      href: `${DC}/655/WD4-Capacity-Study---2016-PDF`,
      sub: 'PDF',
      date: '2016',
      note: 'Supply capacity in District 4, the background to the interconnection work that followed.',
    },
    {
      label: 'WD4 interconnect with Westchester Joint Water Works',
      href: `${DC}/653/WD4---Interconnect-with-WJWW---DB-MemoReport-February-12-2021-PDF`,
      sub: 'PDF',
      date: '12 Feb 2021',
      note: 'The engineering memo on connecting District 4 to a neighbouring supply.',
    },
    {
      label: 'Water District 2 upgrade project file',
      href: 'https://www.northcastleny.gov/635/Water-District-2-WD2-Water-Distribution-S',
      sub: 'Project page · 22 documents',
      date: '2013–2017',
      note: 'The complete construction record for the District 2 upgrade — change orders, contractor payment applications and the homeowner debt table.',
    },
    {
      label: 'Stormwater management program annual reports',
      href: 'https://www.northcastleny.gov/875/Stormwater-Management-Program-Annual-Rep',
      sub: 'Archive · 22 reports',
      date: 'Annual',
      note: "The Town's MS4 reports to the State on how it is controlling stormwater pollution.",
    },
    {
      label: 'Water',
      href: 'https://ecode360.com/29141193',
      sub: 'Chapter 336 · eCode360',
      note: 'The local law on water service, connections, hydrants and meter fees.',
    },
    {
      label: 'What is FOG?',
      href: `${DC}/656/What-is-FOG`,
      sub: 'PDF',
      note: 'Why fats, oils and grease down the drain damage the sewer system, and what to do instead.',
    },
    {
      label: 'Quarry Heights water system updates',
      href: 'https://www.northcastleny.gov/872/Quarry-Heights-Water-System-Updates',
      sub: 'Town page · 4 documents',
      note: 'Progress on the Quarry Heights system, including the feasibility study the Town put out to bid.',
    },
    {
      label: 'NYS DEC emerging contaminant (PFAS) sampling',
      href: 'https://www.northcastleny.gov/807/NYS---DEC-Emerging-Contaminant-PFAS-Samp',
      sub: 'Town page · 6 documents',
      date: '2021–2022',
      note: "The State's own sampling results for North Castle wells — the independent check on the Town's PFAS reporting.",
    },
    {
      label: 'WD1 — North White Plains distribution replacement',
      href: 'https://www.northcastleny.gov/693/WD1---NWP-Water-Distribution-System-Repl',
      sub: 'Town page · 4 documents',
      date: '2019',
      note: 'The main replacement project in North White Plains.',
    },
    {
      label: 'Private wells',
      href: 'https://www.northcastleny.gov/668/Wells',
      sub: 'Town page · 6 documents',
      date: '2007',
      note: 'Testing and permitting guidance for the many properties here that are not on a water district.',
    },
  ],
}

const KEY_DOCS: Record<string, Record<string, KeyDoc[]>> = { nc: NC_KEY_DOCS }

/** Key documents for a board/department page, or [] when none configured. */
export function getKeyDocs(muniKey: string, bodyKey: string): KeyDoc[] {
  return KEY_DOCS[muniKey]?.[bodyKey] ?? []
}
