/**
 * dedupe-pipeline.mjs
 *
 * Deduplicates the Pipeline Google Sheet:
 *   1. Email deduplication: same email → keep best record, delete rest
 *   2. Name deduplication: same normalised name → keep best record, delete rest
 *   3. Company deduplication: same is_company=true firm → keep best, delete rest
 *   4. Individual → Company linking: if individual.firm matches a company.name
 *      and parent_id is unset, write the company id into parent_id
 *
 * "Best" record selection priority:
 *   a. Non-backlog stage wins over backlog
 *   b. More filled (non-empty) columns wins
 *   c. Earlier created_at (original import) wins
 *
 * Usage:
 *   node scripts/dedupe-pipeline.mjs            # dry-run (no writes)
 *   node scripts/dedupe-pipeline.mjs --execute  # apply changes
 */

import { readFileSync } from 'fs'
import { dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ── Load env ──────────────────────────────────────────────────────────────────
const envPath = `${__dirname}/../.env.local`
let env = {}
try {
  const envText = readFileSync(envPath, 'utf-8')
  for (const line of envText.split('\n')) {
    const [key, ...rest] = line.split('=')
    if (key && !key.startsWith('#')) env[key.trim()] = rest.join('=').trim()
  }
} catch {
  console.error('Could not read .env.local'); process.exit(1)
}

const SPREADSHEET_ID = env.GOOGLE_SPREADSHEET_ID || env.GOOGLE_SHEET_ID
let SERVICE_ACCOUNT_RAW = env.GOOGLE_SERVICE_ACCOUNT_JSON || ''
if (!SPREADSHEET_ID || !SERVICE_ACCOUNT_RAW) {
  console.error('Missing GOOGLE_SHEET_ID or GOOGLE_SERVICE_ACCOUNT_JSON'); process.exit(1)
}

let serviceAccount
try {
  serviceAccount = JSON.parse(SERVICE_ACCOUNT_RAW)
} catch {
  try {
    serviceAccount = JSON.parse(Buffer.from(SERVICE_ACCOUNT_RAW, 'base64').toString('utf-8'))
  } catch {
    console.error('Invalid GOOGLE_SERVICE_ACCOUNT_JSON'); process.exit(1)
  }
}

const EXECUTE = process.argv.includes('--execute')
const TAB = 'Pipeline'
const STAGE_RANK = { closed: 9, committed: 8, 'soft-commit': 7, interested: 6, contacted: 5, prospect: 4, backlog: 3, unqualified: 2, passed: 1 }

// ── Google Sheets auth ────────────────────────────────────────────────────────
const { google } = await import('googleapis')
const auth = new google.auth.GoogleAuth({
  credentials: serviceAccount,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
})
const sheets = google.sheets({ version: 'v4', auth })

// ── Read all rows ─────────────────────────────────────────────────────────────
console.log('Reading Pipeline sheet…')
const readRes = await sheets.spreadsheets.values.get({
  spreadsheetId: SPREADSHEET_ID,
  range: `${TAB}!A:AA`,
})
const allRows = readRes.data.values || []
if (allRows.length < 2) { console.log('No data rows found'); process.exit(0) }

const header = allRows[0]
const dataRows = allRows.slice(1) // 0-indexed among data rows; sheet row = index+2

// Column indices (matching lib/sheets/pipeline.ts rowToLead)
const COL = {
  id: 0, name: 1, email: 2, phone: 3, asset: 4,
  target_amount: 5, actual_amount: 6, stage: 7, close_date: 8,
  probability: 9, notes: 10, created_at: 11, category: 12,
  firm: 13, title: 14, linkedin_url: 15, website: 16,
  priority_tier: 17, source: 18, investment_rationale: 19,
  lifecycle_stage: 20, record_id: 21, investor_type: 22,
  point_of_contact: 23, parent_id: 24, is_company: 25, documents: 26,
}

function get(row, col) { return (row[col] || '').trim() }
function normName(s) { return s.toLowerCase().replace(/[^a-z0-9]/g, '').trim() }
function normEmail(s) { return s.toLowerCase().trim() }
function stageRank(row) { return STAGE_RANK[get(row, COL.stage)] ?? 0 }
function filledCount(row) { return row.filter(c => c && String(c).trim()).length }
function betterRecord(a, b) {
  // a wins → return true; b wins → return false
  const ra = stageRank(a), rb = stageRank(b)
  if (ra !== rb) return ra > rb
  const fa = filledCount(a), fb = filledCount(b)
  if (fa !== fb) return fa > fb
  // earlier created_at wins (original)
  const da = new Date(get(a, COL.created_at) || 0).getTime()
  const db = new Date(get(b, COL.created_at) || 0).getTime()
  return da <= db
}

// Map: id → data row (array)
const byId = new Map()
for (const row of dataRows) {
  const id = get(row, COL.id)
  if (id) byId.set(id, row)
}

const toDelete = new Set()       // ids to delete
const parentUpdates = new Map()  // id → new parent_id value

// ── 1. Email deduplication ────────────────────────────────────────────────────
console.log('\n── Email deduplication ──────────────────────────────────────────')
const byEmail = new Map() // normEmail → [rows]
for (const row of dataRows) {
  const email = normEmail(get(row, COL.email))
  if (!email) continue
  if (!byEmail.has(email)) byEmail.set(email, [])
  byEmail.get(email).push(row)
}

let emailDupeCount = 0
for (const [email, rows] of byEmail) {
  if (rows.length < 2) continue
  emailDupeCount += rows.length - 1
  // pick the best record to keep
  let best = rows[0]
  for (let i = 1; i < rows.length; i++) {
    if (betterRecord(rows[i], best)) best = rows[i]
  }
  const keepId = get(best, COL.id)
  for (const row of rows) {
    const id = get(row, COL.id)
    if (id !== keepId) {
      console.log(`  EMAIL DUP → keep "${get(best, COL.name)}" (${keepId}, stage=${get(best, COL.stage)}), delete "${get(row, COL.name)}" (${id}, stage=${get(row, COL.stage)})`)
      toDelete.add(id)
    }
  }
}
console.log(`Found ${emailDupeCount} email duplicates`)

// ── 2. Company record deduplication ──────────────────────────────────────────
console.log('\n── Company deduplication ────────────────────────────────────────')
const companyByName = new Map() // normName → [rows]
for (const row of dataRows) {
  if (get(row, COL.is_company) !== 'true') continue
  if (toDelete.has(get(row, COL.id))) continue
  const nameKey = normName(get(row, COL.name))
  if (!nameKey) continue
  if (!companyByName.has(nameKey)) companyByName.set(nameKey, [])
  companyByName.get(nameKey).push(row)
}

let companyDupeCount = 0
for (const [, rows] of companyByName) {
  if (rows.length < 2) continue
  companyDupeCount += rows.length - 1
  let best = rows[0]
  for (let i = 1; i < rows.length; i++) {
    if (betterRecord(rows[i], best)) best = rows[i]
  }
  const keepId = get(best, COL.id)
  for (const row of rows) {
    const id = get(row, COL.id)
    if (id !== keepId) {
      console.log(`  COMPANY DUP → keep "${get(best, COL.name)}" (${keepId}), delete "${get(row, COL.name)}" (${id})`)
      toDelete.add(id)
      // Redirect any child records pointing to the deleted id → point to keepId
      for (const r of dataRows) {
        if (get(r, COL.parent_id) === id) {
          parentUpdates.set(get(r, COL.id), keepId)
        }
      }
    }
  }
}
console.log(`Found ${companyDupeCount} company duplicates`)

// ── 3. Individual name deduplication ─────────────────────────────────────────
console.log('\n── Individual name deduplication ────────────────────────────────')
const individualByName = new Map()
for (const row of dataRows) {
  if (get(row, COL.is_company) === 'true') continue
  if (toDelete.has(get(row, COL.id))) continue
  const nameKey = normName(get(row, COL.name))
  if (!nameKey || nameKey.length < 3) continue
  if (!individualByName.has(nameKey)) individualByName.set(nameKey, [])
  individualByName.get(nameKey).push(row)
}

let nameDupeCount = 0
for (const [, rows] of individualByName) {
  if (rows.length < 2) continue
  // Only merge if they share the same firm or one has no firm
  const firms = rows.map(r => normName(get(r, COL.firm)))
  const uniqueFirms = new Set(firms.filter(Boolean))
  if (uniqueFirms.size > 1) continue // different firms → skip, probably different people
  nameDupeCount += rows.length - 1
  let best = rows[0]
  for (let i = 1; i < rows.length; i++) {
    if (betterRecord(rows[i], best)) best = rows[i]
  }
  const keepId = get(best, COL.id)
  for (const row of rows) {
    const id = get(row, COL.id)
    if (id !== keepId) {
      console.log(`  NAME DUP → keep "${get(best, COL.name)}" (${keepId}, firm="${get(best, COL.firm)}"), delete "${get(row, COL.name)}" (${id})`)
      toDelete.add(id)
    }
  }
}
console.log(`Found ${nameDupeCount} individual name duplicates`)

// ── 4. Individual → Company linking ──────────────────────────────────────────
console.log('\n── Individual → Company parent linking ──────────────────────────')
// Build lookup: normName of company name → company id
const companyIdByName = new Map()
for (const row of dataRows) {
  if (get(row, COL.is_company) !== 'true') continue
  if (toDelete.has(get(row, COL.id))) continue
  const nameKey = normName(get(row, COL.name))
  if (nameKey) companyIdByName.set(nameKey, get(row, COL.id))
}

let linkCount = 0
for (const row of dataRows) {
  if (get(row, COL.is_company) === 'true') continue
  if (toDelete.has(get(row, COL.id))) continue
  if (get(row, COL.parent_id)) continue // already linked
  const firm = get(row, COL.firm)
  if (!firm) continue
  const firmKey = normName(firm)
  const companyId = companyIdByName.get(firmKey)
  if (companyId) {
    const id = get(row, COL.id)
    if (!parentUpdates.has(id)) {
      parentUpdates.set(id, companyId)
      linkCount++
      console.log(`  LINK "${get(row, COL.name)}" → company "${firm}" (${companyId})`)
    }
  }
}
console.log(`Found ${linkCount} individuals to link to their company`)

// ── Summary ───────────────────────────────────────────────────────────────────
console.log('\n═══════════════════════════════════════════════════════════════')
console.log(`SUMMARY:`)
console.log(`  Rows to delete:          ${toDelete.size}`)
console.log(`  parent_id links to set:  ${parentUpdates.size}`)
console.log(`  Mode:                    ${EXECUTE ? 'EXECUTE' : 'DRY RUN (pass --execute to apply)'}`)
console.log('═══════════════════════════════════════════════════════════════\n')

if (!EXECUTE) {
  console.log('Dry run complete. No changes made.')
  process.exit(0)
}

// ── Execute: Apply parent_id updates ─────────────────────────────────────────
if (parentUpdates.size > 0) {
  console.log(`Applying ${parentUpdates.size} parent_id updates…`)
  // Re-read to get current row indices
  const readRes2 = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${TAB}!A:AA`,
  })
  const currentRows = readRes2.data.values || []
  const data = []
  for (let i = 1; i < currentRows.length; i++) {
    const row = currentRows[i]
    const id = (row[COL.id] || '').trim()
    if (parentUpdates.has(id)) {
      const newParentId = parentUpdates.get(id)
      // Extend row to ensure column 24 exists
      while (row.length <= COL.parent_id) row.push('')
      row[COL.parent_id] = newParentId
      data.push({
        range: `${TAB}!A${i + 1}:AA${i + 1}`,
        values: [row],
      })
    }
  }
  if (data.length > 0) {
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: { valueInputOption: 'RAW', data },
    })
    console.log(`  ✓ Applied ${data.length} parent_id updates`)
  }
}

// ── Execute: Delete duplicate rows (bottom-to-top to preserve indices) ────────
if (toDelete.size > 0) {
  console.log(`Deleting ${toDelete.size} duplicate rows…`)
  const readRes3 = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${TAB}!A:A`,
  })
  const idCol = readRes3.data.values || []
  // Collect 0-based row indices for rows to delete (header is row 0)
  const rowIndicesToDelete = []
  for (let i = 1; i < idCol.length; i++) {
    const id = (idCol[i]?.[0] || '').trim()
    if (toDelete.has(id)) rowIndicesToDelete.push(i) // 0-based sheet row index
  }
  // Sort descending so deletions don't shift indices
  rowIndicesToDelete.sort((a, b) => b - a)

  // Get sheet ID
  const spreadsheetMeta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID })
  const sheetMeta = spreadsheetMeta.data.sheets.find(s => s.properties.title === TAB)
  if (!sheetMeta) { console.error(`Sheet tab "${TAB}" not found`); process.exit(1) }
  const sheetId = sheetMeta.properties.sheetId

  // Batch delete in chunks of 50 to stay within API limits
  const CHUNK = 50
  for (let c = 0; c < rowIndicesToDelete.length; c += CHUNK) {
    const chunk = rowIndicesToDelete.slice(c, c + CHUNK)
    // Each chunk is already sorted descending — re-sort in case
    chunk.sort((a, b) => b - a)
    const requests = chunk.map(rowIdx => ({
      deleteDimension: {
        range: {
          sheetId,
          dimension: 'ROWS',
          startIndex: rowIdx,  // 0-based
          endIndex: rowIdx + 1,
        },
      },
    }))
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: { requests },
    })
    console.log(`  ✓ Deleted rows chunk ${c / CHUNK + 1} (${chunk.length} rows)`)
    // Small pause to avoid rate limiting
    await new Promise(r => setTimeout(r, 500))
  }
  console.log(`  ✓ All ${toDelete.size} duplicate rows deleted`)
}

console.log('\nDone!')
