/**
 * Adds the 5 Livingston Farm partner firms to the Team sheet.
 * Run from the project root:
 *   node scripts/add-livingstonfarm-firms.mjs
 */

import { createRequire } from 'module'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const require = createRequire(import.meta.url)
const __dirname = dirname(fileURLToPath(import.meta.url))

// Load .env.local
const envPath = resolve(__dirname, '../.env.local')
const env = {}
try {
  const raw = readFileSync(envPath, 'utf-8')
  for (const line of raw.split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/)
    if (m) env[m[1].trim()] = m[2].trim()
  }
} catch (e) {
  console.error('Could not read .env.local:', e.message)
  process.exit(1)
}

const SHEET_ID = env.GOOGLE_SHEET_ID
const SERVICE_ACCOUNT_RAW = env.GOOGLE_SERVICE_ACCOUNT_JSON
if (!SHEET_ID || !SERVICE_ACCOUNT_RAW) {
  console.error('Missing GOOGLE_SHEET_ID or GOOGLE_SERVICE_ACCOUNT_JSON')
  process.exit(1)
}

let serviceAccount
try {
  serviceAccount = JSON.parse(SERVICE_ACCOUNT_RAW)
} catch {
  try {
    const decoded = Buffer.from(SERVICE_ACCOUNT_RAW, 'base64').toString('utf-8')
    serviceAccount = JSON.parse(decoded)
  } catch {
    console.error('Invalid GOOGLE_SERVICE_ACCOUNT_JSON')
    process.exit(1)
  }
}

const { google } = require('googleapis')
const auth = new google.auth.GoogleAuth({
  credentials: serviceAccount,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
})
const sheets = google.sheets({ version: 'v4', auth })

const FIRMS = [
  {
    name: 'Snøhetta',
    title: 'Landscape Architecture',
    bio: 'Snøhetta is an international architecture and landscape architecture firm known for integrating buildings with their natural and cultural surroundings. Their approach emphasizes sustainability, local identity, and the relationship between landscape and architecture.',
    website: 'https://snohetta.com',
    sortOrder: 0,
  },
  {
    name: 'Cooper Robertson',
    title: 'Master Plan Architect',
    bio: 'Cooper Robertson is a New York-based planning and architecture firm with deep expertise in master planning, campus design, and mixed-use development. The firm brings rigorous urban design thinking to rural and agrarian contexts.',
    website: 'https://cooperrobertson.com',
    sortOrder: 1,
  },
  {
    name: 'Sherwood Design Engineers',
    title: 'Civil Engineer',
    bio: 'Sherwood Design Engineers is an award-winning civil and environmental engineering firm specializing in sustainable site design, water management, and regenerative infrastructure systems for complex development projects.',
    website: 'https://sherwoodengineers.com',
    sortOrder: 2,
  },
  {
    name: 'Glenn Smith PE',
    title: 'Consulting Engineer',
    bio: 'Glenn Smith PE provides specialized consulting engineering services with deep expertise in structural and mechanical systems for agricultural, hospitality, and mixed-use development projects.',
    website: '',
    sortOrder: 3,
  },
  {
    name: 'Ultramoderne',
    title: 'Building Architect',
    bio: 'Ultramoderne is an architecture studio with a focus on experimental and culturally engaged design. The firm brings rigorous materiality and craft to building design, creating structures that respond sensitively to their landscapes and programs.',
    website: 'https://ultramoderne.org',
    sortOrder: 4,
  },
]

async function appendRow(values) {
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: 'Team!A:O',
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [values] },
  })
}

async function main() {
  console.log('Adding Livingston Farm partner firms...\n')

  for (const firm of FIRMS) {
    const id = `team_lf_${firm.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`
    const row = [
      id,                    // col A: id
      'livingstonfarm',      // col B: asset
      'firm',                // col C: type
      firm.name,             // col D: name
      firm.title,            // col E: title (role/discipline)
      firm.bio,              // col F: bio/description
      '',                    // col G: email
      '',                    // col H: linkedin_url
      firm.website,          // col I: website
      '',                    // col J: headshot_url
      '',                    // col K: logo_url
      '[]',                  // col L: images (JSON array)
      String(firm.sortOrder),// col M: sort_order
      'TRUE',                // col N: active
      new Date().toISOString().split('T')[0], // col O: created_at
    ]

    try {
      await appendRow(row)
      console.log(`✓ Added: ${firm.name} (${firm.title})`)
    } catch (e) {
      console.error(`✗ Failed: ${firm.name} — ${e.message}`)
    }
  }

  console.log('\nDone.')
}

main().catch(console.error)
