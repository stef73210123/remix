/**
 * Adds the Wren of the Woods partner firms to the Team sheet.
 * Run from the project root:
 *   node scripts/add-wrenofthewoods-firms.mjs
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
    name: 'Fowler Design',
    title: 'Building Architect',
    bio: 'Fowler Design is an architecture studio focused on thoughtful, site-sensitive design for hospitality, residential, and mixed-use projects. Their work emphasizes materiality, craftsmanship, and a deep understanding of place.',
    website: 'https://www.fowler.design',
    sortOrder: 0,
  },
  {
    name: 'Kimley-Horn',
    title: 'Civil Engineer',
    bio: 'Kimley-Horn is a national planning and engineering firm with broad expertise in civil engineering, site development, and infrastructure design. The firm provides comprehensive civil engineering services for complex development projects.',
    website: 'https://www.kimley-horn.com',
    sortOrder: 1,
  },
  {
    name: 'Veneziano & Associates',
    title: 'Legal',
    bio: 'Veneziano & Associates is a boutique law firm providing specialized legal counsel for real estate development, land use, and investment transactions.',
    website: '',
    sortOrder: 2,
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
  console.log('Adding Wren of the Woods partner firms...\n')

  for (const firm of FIRMS) {
    const id = `team_wow_${firm.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`
    const row = [
      id,                    // col A: id
      'wrenofthewoods',      // col B: asset
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
