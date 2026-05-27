// Run with: node scripts/seed-knowledge.js
const { google } = require('googleapis')
const fs = require('fs')
const path = require('path')

// Parse .env.local
const envPath = path.join(__dirname, '..', '.env.local')
const env = {}
fs.readFileSync(envPath, 'utf8').split('\n').forEach((line) => {
  const eq = line.indexOf('=')
  if (eq === -1) return
  const key = line.slice(0, eq).trim()
  const val = line.slice(eq + 1).trim().replace(/^"(.*)"$/, '$1')
  if (key && !key.startsWith('#')) env[key] = val
})

const credentialsJson = Buffer.from(env.GOOGLE_SERVICE_ACCOUNT_JSON || '', 'base64').toString()
const credentials = JSON.parse(credentialsJson)
const spreadsheetId = env.GOOGLE_SHEET_ID

const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
})
const sheets = google.sheets({ version: 'v4', auth })
const now = new Date().toISOString().split('T')[0]

// ─── Article content ────────────────────────────────────────────────────────

const articles = [

  // ── 1. Regenerative Agriculture ──────────────────────────────────────────

  {
    id: `kb_${Date.now() + 1}`,
    category: 'regenerative-agriculture',
    title: 'What Is Regenerative Agriculture?',
    slug: 'what-is-regenerative-agriculture',
    body: `## Beyond Organic: Farming That Gives Back

Regenerative agriculture is a set of farming principles and practices designed not merely to sustain the land, but to actively restore it. Where conventional farming depletes soil over time and organic farming aims to do no harm, regenerative agriculture goes further — drawing carbon from the atmosphere, rebuilding microbial communities underground, and improving watershed health with each growing season.

The term entered mainstream discourse in the 1980s through the Rodale Institute, but its roots reach back to indigenous land management traditions practiced for millennia across the Americas, Sub-Saharan Africa, and South Asia.

## Core Principles

**Minimal soil disturbance.** Tillage disrupts the fungal networks and microbial ecosystems that make soil productive. Regenerative farmers favor no-till or low-till methods that preserve soil structure and the carbon stored within it.

**Permanent ground cover.** Bare soil loses carbon to the atmosphere and erodes in rain and wind. Cover cropping — planting grasses, legumes, or brassicas between cash crop cycles — keeps the ground protected and biologically active year-round.

**Diversity of species.** Monocultures are vulnerable to pest pressure and disease. Integrating multiple plant species, and ideally livestock, creates the biodiversity that keeps ecosystems resilient. Polyculture systems mirror the structure of natural grasslands.

**Rotational grazing.** When managed thoughtfully, livestock are among the most powerful regenerative tools available. Moving cattle or sheep across pastures in timed rotations mimics the movement of wild herds, stimulating grass growth, building soil organic matter, and sequestering carbon.

**Agroforestry.** Integrating trees and shrubs into crop and pasture systems deepens root systems, diversifies income streams, improves microclimates, and sequesters carbon above and below ground simultaneously.

## The Carbon Connection

Agricultural soils have lost 50–70% of their original carbon stock through centuries of conventional tillage. Regenerative practices reverse this trend. A 2020 study in *Scientific Reports* found that regenerative farms sequester, on average, 2.3 metric tons of carbon per acre annually — compared to net emissions of 0.7 tons per acre on conventional farms.

For investors, this has material implications. Carbon credit markets, while still maturing, increasingly reward verifiable soil carbon sequestration. The USDA's Climate-Smart Commodities program has committed $3.1 billion to accelerating this transition, and private buyers from Microsoft to Stripe are purchasing carbon removals from regenerative farmland.

## Why It Matters for Food Quality

Soil health is the foundation of nutritional density. A landmark 2022 study published in *PLOS ONE* found that regeneratively grown crops contained significantly higher levels of micronutrients — including zinc, copper, and phytochemicals — compared to conventionally grown equivalents from the same region. Healthier soil produces more complex flavor compounds, which is why chefs with serious sourcing standards are increasingly specifying regenerative farms by name on their menus.

## The Investment Thesis

Farmland has historically been one of the most stable asset classes — NCREIF data shows U.S. farmland returned an average of 11.5% annually over the past 30 years with low volatility and near-zero correlation to equities. Regenerative transition adds a second engine: as carbon markets, premium food buyers, and eco-tourism demand converge on the same properties, the value premium for certified regenerative land is widening.

Livingston Farm is positioned at this convergence — 121 acres of certified regenerative land in Sullivan County, managed with rotational grazing, agroforestry corridors, and hemlock and hardwood forest cover, generating multiple revenue streams while the land itself appreciates.`,
    tags: 'regenerative agriculture, soil health, carbon sequestration, farmland investing, organic',
    published: 'true',
    sort_order: '0',
    created_at: now,
    updated_at: now,
  },

  // ── 2. Tourism History of the Catskills ──────────────────────────────────

  {
    id: `kb_${Date.now() + 2}`,
    category: 'catskills-hotel-market',
    title: 'The Catskills: From Borscht Belt to the New Ruralism',
    slug: 'catskills-tourism-history',
    body: `## A Mountain Region Reborn

The Catskills have been a destination for urban escapism for nearly two centuries. What began as a Victorian-era retreat for New York's merchant class, then became a mid-century Jewish resort empire, and then fell into decades of decline, is now undergoing one of the most compelling hospitality transformations in the Northeast — driven by remote work, food culture, and a generation of city dwellers seeking rootedness in nature.

## The Grand Hotel Era (1820s–1900s)

The first wave of Catskill tourism arrived by steamboat and then rail. The Catskill Mountain House, perched on a 2,250-foot escarpment overlooking the Hudson Valley, opened in 1824 and drew the elite of New York society — politicians, painters, and industrialists seeking relief from summer heat. Thomas Cole, the founder of the Hudson River School, painted the surrounding landscape and cemented the region's identity as a place of transcendent natural beauty.

By the 1890s, Saratoga-style grand hotels dotted the ridgelines and valleys. The Ulster & Delaware Railroad made the interior accessible, and resort towns like Fleischmanns, Tannersville, and Livingston Manor became seasonal colonies for New York's upper-middle class.

## The Borscht Belt (1920s–1970s)

Beginning in the 1920s and reaching its peak in the post-WWII decades, the Catskills became synonymous with the Jewish resort culture known informally as the Borscht Belt. Sullivan County alone hosted hundreds of hotels and bungalow colonies — from the grand Grossinger's and the Concord to thousands of smaller family-run establishments. At its height, the region drew more than one million visitors each summer.

The Borscht Belt was a cultural incubator of extraordinary reach. Mel Brooks, Jerry Seinfeld, Woody Allen, Billy Crystal, and Joan Rivers all refined their craft in Sullivan County nightclubs. Resorts like Brown's Hotel invented the all-inclusive model that would later define Las Vegas. The social world created there — of community, of performance, of abundant food — shaped American popular culture for a generation.

## The Long Decline (1970s–2000s)

Air conditioning, affordable air travel, and the desegregation of previously restricted resorts drew the Jewish middle class to new destinations. Grossinger's closed in 1986. The Concord shuttered in 1998. Thousands of bungalow colony properties were abandoned, burned, or converted to other uses. Sullivan County's per capita income fell to among the lowest in New York State. The image of crumbling poolsides and peeling paint became a cultural shorthand for American decline.

## The Renaissance (2010s–Present)

The reversal began quietly. Artists and Brooklyn creatives priced out of the Hudson Valley discovered Sullivan County's cheap land, dramatic landscape, and proximity to New York City (90 minutes on the Quickway). Small boutique hotels, farm-to-table restaurants, and craft breweries began opening. The pandemic dramatically accelerated this trend: between 2020 and 2022, Sullivan County experienced the largest percentage increase in new residents of any county in New York State.

Today the county hosts a constellation of nationally recognized hospitality destinations: Hana Meadows, Inness (a 225-acre arts compound with a boutique hotel), Catskill Provisions, and Kenoza Hall, among many others. The New York Times, Bon Appétit, and Travel + Leisure have run repeated features on the region's culinary and wellness renaissance. Airbnb data consistently ranks Sullivan County among the highest-occupancy rural markets in the Northeast.

## The Investment Opportunity

This trajectory — long decline followed by accelerating revival, anchored by permanent proximity to the nation's largest metropolitan market — creates the conditions for durable hospitality asset appreciation. Properties with authentic land, diversified revenue, and strong brand positioning are capturing the premium end of a market that is still in early innings.

Livingston Manor, within Sullivan County, sits at the center of this story: a walkable town with a Main Street food and retail scene, deep landscape character, and a catchment area drawing from New York, New Jersey, and Connecticut.`,
    tags: 'catskills, tourism, borscht belt, hospitality, Sullivan County, history',
    published: 'true',
    sort_order: '1',
    created_at: now,
    updated_at: now,
  },

  // ── 3. Organic Food + Star Chefs ─────────────────────────────────────────

  {
    id: `kb_${Date.now() + 3}`,
    category: 'regenerative-agriculture',
    title: "Organic Sourcing, Culinary Excellence, and the Chef's Relationship with the Land",
    slug: 'organic-sourcing-star-chefs',
    body: `## The Table Begins in the Soil

When a chef of genuine ambition constructs a menu, the most important decisions are made not at the stove, but at the farm gate. The quality ceiling of any dish is set by the quality of its ingredients — and ingredients raised in living, biologically active soil taste demonstrably different from those grown in chemically managed monocultures.

This is no longer a matter of ideology. It is measurable, reproducible, and increasingly the basis on which serious restaurants build competitive identity.

## What Organic and Regenerative Sourcing Actually Delivers

The peer-reviewed literature on nutritional differences between organic and conventional produce has grown substantially over the past two decades. A 2014 meta-analysis in the *British Journal of Nutrition* — the largest of its kind at the time — found that organic crops contained on average 19–69% higher concentrations of antioxidants than their conventional counterparts. Organic dairy and meat showed significantly higher levels of omega-3 fatty acids.

Regenerative practices deepen this advantage further. Soil with robust microbial activity transfers a broader spectrum of minerals, trace elements, and phytochemicals to plants. These compounds manifest as flavor — the complexity, depth, and finish that make a carrot taste like a carrot, or a tomato capable of anchoring a dish on its own terms.

Blind tasting studies consistently show that food safety inspectors, chefs, and trained consumers can identify regeneratively grown produce with above-random accuracy. The flavor difference is real and perceptible.

## The Chef as Sourcing Architect

The farm-to-table movement of the 1990s and early 2000s was often more marketing than practice. True supply chain integration — where the chef knows the farmer, visits the fields, adapts the menu to what is available rather than demanding what is convenient — requires commitment, proximity, and shared values.

The chefs who have built enduring reputations on ingredient integrity share several traits. They take a scientist's interest in how their ingredients are grown. They build long-term relationships with specific farms rather than sourcing from aggregate distributors. They design menus around seasonal and varietal availability rather than around a fixed template of dishes.

Alice Waters at Chez Panisse pioneered this model in Berkeley in the 1970s, sourcing directly from small California farms when "farm to table" was not yet a phrase. Dan Barber at Blue Hill at Stone Barns in Westchester has taken it further, transforming the entire restaurant into a meditation on soil health and agricultural diversity — with a farm on the premises. Eleven Madison Park, during its ascent to three Michelin stars, built sourcing relationships with dozens of small Northeast farms. Thomas Keller's Per Se and The French Laundry maintain dedicated kitchen gardens and multi-year supply agreements with specific growers.

## The Wren of the Woods Equation

Wren of the Woods — positioned in Armonk, New York, in the center of Westchester County's affluent dining catchment — operates at the intersection of these forces. A star chef at the helm creates the culinary credibility that validates premium pricing. Sourcing from regenerative farms creates a narrative that resonates with a guest demographic that is educated, values-driven, and increasingly suspicious of industrial food systems.

Westchester County diners have among the highest per capita incomes in the United States. They travel to Manhattan for meals at Daniel, Le Bernardin, and Masa. They return home to a county that, until recently, offered few comparable dining experiences. The opportunity to build a destination restaurant on regenerative sourcing principles — in proximity to this market, with a compelling physical setting — is structurally rare.

## Why This Matters for Investors

Restaurant investments are typically fragile: margin-thin, labor-intensive, and dependent on individual operator quality. The variables that make a restaurant durable — genuine culinary distinction, a defensible sourcing story, a physical setting that cannot be replicated — are the same variables that make it attractive as an investment. Wren of the Woods is designed around all three.

The regenerative sourcing model also creates supply chain integration that supports Livingston Farm: farm and restaurant can be linked in ways that create mutual marketing value, reduce procurement costs, and deepen both brands simultaneously.`,
    tags: 'organic, regenerative, chefs, fine dining, food quality, sourcing',
    published: 'true',
    sort_order: '2',
    created_at: now,
    updated_at: now,
  },

  // ── 4. Town of Armonk ────────────────────────────────────────────────────

  {
    id: `kb_${Date.now() + 4}`,
    category: 'armonk',
    title: "Armonk, New York: History, Affluence, and the Rise of a Dining Destination",
    slug: 'armonk-history-dining-destination',
    body: `## A Quiet Town with Considerable Weight

Armonk is a hamlet within the town of North Castle in northern Westchester County, New York. Sitting 34 miles north of Midtown Manhattan and 10 miles east of the Connecticut border, it occupies a position of unusual strategic importance: close enough to the city to draw its residents and institutions, far enough to offer the landscape, privacy, and pace that urban wealth increasingly seeks.

It is also one of the wealthiest communities in one of the wealthiest counties in the United States.

## Historical Roots

Armonk's earliest European settlement dates to the 17th century. The hamlet grew modestly through the 18th and 19th centuries as an agricultural community surrounded by stone walls, hardwood forests, and the Byram River watershed. The name itself is believed to derive from the Lenape word *Armonck*, meaning "where the beavers are" — a reference to the wetlands that once characterized the surrounding valley.

The construction of the Harlem Railroad in the mid-1800s connected northern Westchester to New York City, and the region began attracting the country estates of industrialists and financiers seeking summer retreats. Large parcels in and around Armonk were acquired by figures associated with the Gilded Age — the landscape of rolling hills, mature hardwoods, and reservoir views made it a natural choice for the estate culture that defined the era.

## The IBM Effect

The defining institutional force in modern Armonk is IBM. The company relocated its world headquarters to the hamlet in 1964, constructing a Eero Saarinen-designed campus on 26 acres adjacent to the town center. The campus, with its iconic geometric facade, has housed the executive leadership of one of the world's most consequential technology companies for six decades.

IBM's presence transformed Armonk in ways that are still felt today. The executive class it drew — engineers, executives, and senior staff from across the world — settled in the surrounding towns and built out a residential community of considerable sophistication. Local schools absorbed the children of global professionals. The tax base expanded dramatically. Retail and services followed.

Today, IBM's campus continues to serve as the global headquarters of a company with revenues exceeding $60 billion annually. The presence of a major multinational in such a small community creates a persistent gravity: corporate entertaining, visiting executives, and a resident population with significant disposable income and cosmopolitan taste expectations.

## Demographics and Spending Power

North Castle (the town that contains Armonk) consistently ranks in the top percentile for household income in New York State. Median household income exceeds $200,000. Educational attainment is among the highest in the country — over 70% of adults hold graduate or professional degrees. The population skews toward dual-income professional households in their 40s and 50s, the demographic with the highest discretionary spending on food, hospitality, and experiential consumption.

Westchester County as a whole has a population of approximately 1 million people and a per capita income that places it among the top 15 counties in the United States. The county contains more than a dozen communities with median household incomes exceeding $150,000 — Greenwich-adjacent communities in the northern reaches, along with established enclaves throughout.

## The Dining Landscape

Despite this density of wealth, Westchester's restaurant scene has historically underperformed relative to its demographics. The county's high commercial rents, zoning complexity, and the proximity of Manhattan (which absorbs discretionary dining dollars) have kept the serious restaurant market thin.

This is changing. The pandemic accelerated a shift already underway: affluent Westchester residents, many of whom transitioned to remote work, began spending more dining dollars locally. Weekend reservations at quality local restaurants became a cultural priority. Food media — Eater, Infatuation, New York Times Dining — expanded its Westchester coverage substantially.

The competitive set in the Armonk area includes a small number of established fine-casual restaurants but no true destination restaurant of national significance. Bedford Post Inn offers hospitality in the adjacent town. Several Italian and contemporary American spots in the $50–$80 per person range serve the local market. But the tier above — the restaurant that draws guests from Manhattan, that earns national press attention, that operates as a cultural statement for the region — remains unoccupied.

## The Wren of the Woods Opportunity

Armonk's combination of institutional gravity (IBM), residential wealth, dining under-supply at the upper end, and proximity to one of the world's most food-obsessed metropolitan areas creates an unusual opportunity. A restaurant with serious culinary credentials, a compelling physical setting, and a farm-to-table sourcing narrative that connects to the regional agricultural renaissance would not simply serve the local market — it would redefine the local market's sense of what is possible.

That is the aspiration behind Wren of the Woods: to build the restaurant that Westchester's wealth and sophistication have long warranted, but that has not yet been built.`,
    tags: 'armonk, westchester, IBM, dining, history, demographics, fine dining',
    published: 'true',
    sort_order: '3',
    created_at: now,
    updated_at: now,
  },
]

async function seed() {
  console.log(`Seeding ${articles.length} knowledge articles…`)
  for (const article of articles) {
    const row = [
      article.id,
      article.category,
      article.title,
      article.slug,
      article.body,
      article.tags,
      article.published,
      article.sort_order,
      article.created_at,
      article.updated_at,
    ]
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Knowledge',
      valueInputOption: 'RAW',
      requestBody: { values: [row] },
    })
    console.log(`  ✓ "${article.title}"`)
  }
  console.log('Done.')
}

seed().catch((err) => { console.error(err); process.exit(1) })
