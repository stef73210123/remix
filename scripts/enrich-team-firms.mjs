/**
 * Enriches team firm rows with logo_url and project images by scraping each firm's website.
 * Run from the project root:
 *   node scripts/enrich-team-firms.mjs
 */

import { createRequire } from 'module'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import Anthropic from '@anthropic-ai/sdk'

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
const ANTHROPIC_KEY = env.ANTHROPIC_API_KEY

if (!SHEET_ID || !SERVICE_ACCOUNT_RAW) {
  console.error('Missing GOOGLE_SHEET_ID or GOOGLE_SERVICE_ACCOUNT_JSON')
  process.exit(1)
}
if (!ANTHROPIC_KEY) {
  console.error('Missing ANTHROPIC_API_KEY')
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
const anthropic = new Anthropic({ apiKey: ANTHROPIC_KEY })

// ── Read all Team rows ────────────────────────────────────────────────────────

async function readTeamRows() {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: 'Team!A:O',
  })
  return res.data.values || []
}

async function updateRow(rowIndex, logoUrl, imagesJson) {
  // col K (index 10) = logo_url, col L (index 11) = images
  // rowIndex is 0-based from the values array; sheet row = rowIndex + 1 (1-based)
  const sheetRow = rowIndex + 1
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `Team!K${sheetRow}:L${sheetRow}`,
    valueInputOption: 'RAW',
    requestBody: { values: [[logoUrl, imagesJson]] },
  })
}

// ── Enrich a single URL ───────────────────────────────────────────────────────

async function enrichUrl(url) {
  const pageRes = await fetch(url, {
    signal: AbortSignal.timeout(12000),
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; CircularBot/1.0)',
      Accept: 'text/html,application/xhtml+xml',
    },
  })
  if (!pageRes.ok) throw new Error(`HTTP ${pageRes.status}`)

  const html = await pageRes.text()
  const trimmed = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .slice(0, 40000)

  const origin = new URL(url).origin

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: 'You are a web scraper that extracts firm/company information from HTML. Return ONLY valid JSON, no explanation.',
    messages: [{
      role: 'user',
      content: `Extract information about this firm from the HTML below. Return JSON with:
- logo_url: absolute URL of their logo (prefer SVG or PNG; from og:image, apple-touch-icon, or a logo <img> tag)
- images: array of up to 8 absolute image URLs showing their work/projects (portfolio images, hero images, project photos)

Make all URLs absolute — prepend ${origin} if the URL starts with /.
Exclude tiny icons, social icons, or tracking pixels. Focus on large images showing actual work.

URL: ${url}

HTML:
---
${trimmed}
---

Return only JSON, no markdown.`,
    }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text.trim() : '{}'
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, text]
  const jsonStr = jsonMatch[1] || text

  return JSON.parse(jsonStr)
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Reading Team sheet...\n')
  const rows = await readTeamRows()

  // Skip header row (index 0)
  const firmRows = rows
    .map((row, idx) => ({ row, idx }))
    .filter(({ row }) => row[2] === 'firm' && row[8]) // type=firm AND has website (col I)

  console.log(`Found ${firmRows.length} firm(s) with websites to enrich\n`)

  for (const { row, idx } of firmRows) {
    const name = row[3] || '(unknown)'
    const website = row[8]
    const existingLogo = row[10] || ''
    const existingImages = row[11] || '[]'

    // Skip if already enriched
    if (existingLogo && existingImages !== '[]') {
      console.log(`⟳ Skipping ${name} (already enriched)`)
      continue
    }

    process.stdout.write(`Enriching ${name} (${website})… `)
    try {
      const data = await enrichUrl(website)
      const logoUrl = data.logo_url || existingLogo || ''
      const images = Array.isArray(data.images) ? data.images.filter(Boolean).slice(0, 8) : []
      const imagesJson = JSON.stringify(images)

      await updateRow(idx, logoUrl, imagesJson)
      console.log(`✓  logo=${logoUrl ? 'yes' : 'none'}, images=${images.length}`)
    } catch (e) {
      console.log(`✗  ${e.message}`)
    }

    // Small delay between requests
    await new Promise((r) => setTimeout(r, 1500))
  }

  console.log('\nDone.')
}

main().catch(console.error)
