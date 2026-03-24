/**
 * import-csv-investors.mjs
 *
 * Imports contacts from the 5 investor CSV files into the Pipeline Google Sheet.
 * Reads the existing Pipeline sheet first to avoid duplicating contacts already
 * imported from the prior XLSX import.
 *
 * CSV files read:
 *   1_1_Institutional_(Pitchbook).csv  → category: institutional
 *   2_2_Co-GP_Partners.csv             → category: co-gp
 *   3_3_Family_Offices.csv             → category: family-office
 *   4_4_Individual_Contacts.csv        → category: individual
 *   5_5_New_Contacts.csv               → category: varies per row
 *   6__Action_Plan.csv                 → category: varies per row
 *
 * Usage:
 *   node scripts/import-csv-investors.mjs [--dry-run]
 */

import { readFileSync } from 'fs'
import { dirname } from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const __dirname = dirname(fileURLToPath(import.meta.url))

// ── Load env ───────────────────────────────────────────────────────────────────
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
  console.error('Missing GOOGLE_SHEET_ID or GOOGLE_SERVICE_ACCOUNT_JSON in .env.local'); process.exit(1)
}

let serviceAccount
try {
  serviceAccount = JSON.parse(SERVICE_ACCOUNT_RAW)
} catch {
  try {
    const decoded = Buffer.from(SERVICE_ACCOUNT_RAW, 'base64').toString('utf-8')
    serviceAccount = JSON.parse(decoded)
  } catch {
    console.error('Invalid GOOGLE_SERVICE_ACCOUNT_JSON'); process.exit(1)
  }
}

const { google } = require('googleapis')
const XLSX = require('xlsx')

const DRY_RUN = process.argv.includes('--dry-run')
const TAB = 'Pipeline'
const CSV_DIR = 'C:/Users/stef7/OneDrive/Desktop/Code/investor_sheets'
const now = new Date().toISOString().split('T')[0]

// ── Google Sheets client ───────────────────────────────────────────────────────
const auth = new google.auth.GoogleAuth({
  credentials: serviceAccount,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
})
const sheets = google.sheets({ version: 'v4', auth })

// ── Read existing Pipeline sheet to collect already-imported emails ─────────────
console.log('Reading existing Pipeline sheet to collect known emails…')
let existingEmails = new Set()
let existingFirms = new Set()
try {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: TAB,
  })
  const rows = res.data.values || []
  // Email is col 2 (index 2), firm is col 13 (index 13), name is col 1 (index 1)
  for (const row of rows.slice(1)) {
    const email = (row[2] || '').toLowerCase().trim()
    const name = (row[1] || '').toLowerCase().trim()
    const firm = (row[13] || '').toLowerCase().trim()
    if (email) existingEmails.add(email)
    if (name) existingEmails.add(name) // also track by name for no-email records
    if (firm) existingFirms.add(firm)
  }
  console.log(`  Found ${existingEmails.size} existing entries (emails + names) in Pipeline`)
} catch (e) {
  console.warn('Could not read existing Pipeline sheet — will proceed without dedup:', e.message)
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function cleanEmail(raw) {
  if (!raw) return ''
  const m = String(raw).match(/<([^>]+)>/)
  return (m ? m[1] : String(raw)).trim().toLowerCase()
}

function normalizePriority(p) {
  if (!p) return ''
  const s = String(p).trim()
  if (s.includes('High') || s.match(/⭐⭐⭐/) || s.includes('Tier 1') || s === '1') return 'High'
  if (s.match(/⭐⭐/) || s.includes('Tier 2') || s.includes('Medium') || s === '2') return 'Medium'
  if (s.match(/⭐/) || s.includes('Tier 3') || s.includes('Low') || s === '3') return 'Low'
  return s
}

function normalizeCategory(raw) {
  if (!raw) return 'uncategorized'
  const s = String(raw).toLowerCase().trim()
  if (s.includes('institutional') || s.includes('pe ') || s.includes('pitchbook')) return 'institutional'
  if (s.includes('co-gp') || s.includes('co gp') || s.includes('partner')) return 'co-gp'
  if (s.includes('family office') || s.includes('family-office')) return 'family-office'
  if (s.includes('individual') || s.includes('hnwi') || s.includes('impact')) return 'individual'
  return 'individual'
}

function readCsv(filename) {
  const path = `${CSV_DIR}/${filename}`
  try {
    const wb = XLSX.readFile(path)
    const ws = wb.Sheets[wb.SheetNames[0]]
    return XLSX.utils.sheet_to_json(ws, { defval: '' })
  } catch (e) {
    console.warn(`  Could not read ${filename}:`, e.message)
    return []
  }
}

let rowIdCounter = Date.now()
function nextId() { return `lead_csv_${rowIdCounter++}` }

const seenEmails = new Set([...existingEmails])
const seenNames = new Set([...existingEmails]) // used for no-email dedup
const companyIds = new Map()

// Pre-populate companyIds from existing firms
for (const firm of existingFirms) {
  companyIds.set(firm, 'existing')
}

const newRows = []

function makeRow({
  id, name, email = '', phone = '', asset = 'livingstonfarm',
  target_amount = 0, actual_amount = 0, stage = 'backlog',
  close_date = '', probability = 0, notes = '', created_at = now,
  category = '', firm = '', title = '', linkedin_url = '', website = '',
  priority_tier = '', source = '', investment_rationale = '',
  lifecycle_stage = '', record_id = '',
  investor_type = '', point_of_contact = '',
  parent_id = '', is_company = false,
}) {
  return [
    id, name, email, phone, asset,
    String(target_amount), String(actual_amount),
    stage, close_date, String(probability),
    notes, created_at,
    category, firm, title, linkedin_url, website,
    priority_tier, source, investment_rationale,
    lifecycle_stage, record_id,
    investor_type, point_of_contact,
    parent_id, is_company ? 'true' : '',
  ]
}

function isDupe(email, name) {
  if (email && seenEmails.has(email)) return true
  // for no-email contacts, dedup by normalized name
  const normName = name.toLowerCase().trim()
  if (!email && seenNames.has(normName)) return true
  return false
}

function trackSeen(email, name) {
  if (email) seenEmails.add(email)
  if (!email) seenNames.add(name.toLowerCase().trim())
}

function ensureCompany(firm, { category = '', investor_type = '', website = '', priority_tier = '', source = '' } = {}) {
  const key = firm.toLowerCase().trim()
  if (companyIds.has(key)) return companyIds.get(key)
  const id = nextId()
  companyIds.set(key, id)
  newRows.push(makeRow({
    id, name: firm, email: '', asset: 'livingstonfarm',
    stage: 'backlog', category, investor_type, firm, website,
    priority_tier, source, is_company: true,
  }))
  console.log(`  + Company: ${firm}`)
  return id
}

// ── 1. Institutional (Pitchbook) ───────────────────────────────────────────────
console.log('\n── Institutional (Pitchbook) ──')
const institutional = readCsv('1_1_Institutional_(Pitchbook).csv')
console.log(`  ${institutional.length} rows`)
let count1 = 0

for (const row of institutional) {
  const firm = String(row['Firm'] || '').trim()
  if (!firm) continue

  const contactName = String(row['Key Contact Name'] || '').trim()
  const title = String(row['Title'] || '').trim()
  const email = cleanEmail(row['Email'] || '')
  const website = String(row['Website'] || '').trim()
  const priority = normalizePriority(row['Priority'])
  const rationale = String(row['Investment Rationale'] || '').trim()
  const notes = contactName ? `Key Contact: ${contactName}${title ? ` (${title})` : ''}` : ''

  const firmKey = firm.toLowerCase()
  if (companyIds.has(firmKey)) {
    console.log(`  ~ Skip (existing firm): ${firm}`)
    continue
  }

  if (isDupe(email, firm)) {
    console.log(`  ~ Skip (dupe): ${firm}`)
    continue
  }

  const id = nextId()
  companyIds.set(firmKey, id)
  trackSeen(email, firm)
  newRows.push(makeRow({
    id, name: firm, email, asset: 'livingstonfarm',
    stage: 'backlog', category: 'institutional',
    investor_type: 'institutional', firm, website,
    priority_tier: priority, investment_rationale: rationale,
    notes, source: 'Pitchbook', is_company: true,
  }))
  console.log(`  + Institutional: ${firm}`)
  count1++
}
console.log(`  Added: ${count1}`)

// ── 2. Co-GP Partners ──────────────────────────────────────────────────────────
console.log('\n── Co-GP Partners ──')
const cogp = readCsv('2_2_Co-GP_Partners.csv')
console.log(`  ${cogp.length} rows`)
let count2 = 0

for (const row of cogp) {
  const fullName = String(row['Full Name'] || '').trim()
  const firstName = String(row['First Name'] || '').trim()
  const lastName = String(row['Last Name'] || '').trim()
  const name = fullName || `${firstName} ${lastName}`.trim()
  if (!name) continue

  const title = String(row['Title'] || '').trim()
  const firm = String(row['Firm'] || '').trim()
  const email = cleanEmail(row['Email'] || '')
  const phone = String(row['Phone'] || '').trim()
  const linkedin = String(row['LinkedIn'] || '').trim()
  const website = String(row['Website'] || '').trim()
  const priority = normalizePriority(row['Priority'])
  const rationale = String(row['Notes / Rationale'] || '').trim()

  if (isDupe(email, name)) {
    console.log(`  ~ Skip (dupe): ${name}`)
    continue
  }

  let parentId = ''
  if (firm) {
    parentId = ensureCompany(firm, { category: 'co-gp', investor_type: 'other', website, priority_tier: priority, source: 'Co-GP list' })
  }

  const id = nextId()
  trackSeen(email, name)
  newRows.push(makeRow({
    id, name, email, phone, asset: 'livingstonfarm',
    stage: 'backlog', category: 'co-gp', investor_type: 'other',
    firm, title, linkedin_url: linkedin, website, priority_tier: priority,
    investment_rationale: rationale, parent_id: parentId, is_company: false,
    source: 'Co-GP list',
  }))
  console.log(`  + Co-GP: ${name}${firm ? ` @ ${firm}` : ''}`)
  count2++
}
console.log(`  Added: ${count2}`)

// ── 3. Family Offices ──────────────────────────────────────────────────────────
console.log('\n── Family Offices ──')
const familyOffices = readCsv('3_3_Family_Offices.csv')
console.log(`  ${familyOffices.length} rows`)
let count3 = 0

for (const row of familyOffices) {
  const firm = String(row['Investor / Firm'] || row['Investor/Firm'] || '').trim()
  const contactNamesRaw = String(row['Contact Name(s)'] || '').split(',').map(s => s.trim()).filter(Boolean)
  // deduplicate contact names
  const contactNames = [...new Set(contactNamesRaw)]
  const emailsRaw = [...new Set(String(row['Email(s)'] || row['Emails'] || '').split(/[,;]/).map(cleanEmail).filter(Boolean))]
  const website = String(row['Website'] || '').trim()
  const priority = normalizePriority(row['Priority'])
  const rationale = String(row['Investment Rationale for Circular'] || row['Investment Rationale'] || '').trim()
  const type = String(row['Type'] || 'Family Office').trim()

  if (!firm && !contactNames[0]) continue

  const firmKey = (firm || contactNames[0] || '').toLowerCase()

  if (companyIds.has(firmKey)) {
    // firm already exists, try adding any new individual contacts
    const parentId = companyIds.get(firmKey)
    // Add contacts not yet seen
    for (let i = 0; i < contactNames.length; i++) {
      const cName = contactNames[i]
      const cEmail = emailsRaw[i] || ''
      if (!cName || isDupe(cEmail, cName)) continue
      const id = nextId()
      trackSeen(cEmail, cName)
      newRows.push(makeRow({
        id, name: cName, email: cEmail, asset: 'livingstonfarm',
        stage: 'backlog', category: 'family-office', investor_type: 'family-office',
        firm, website, priority_tier: priority, investment_rationale: rationale,
        source: 'Family Office list', parent_id: parentId, is_company: false,
      }))
      console.log(`  + Family Office contact: ${cName} @ ${firm}`)
      count3++
    }
    continue
  }

  if (isDupe(emailsRaw[0], firm)) {
    console.log(`  ~ Skip (dupe): ${firm}`)
    continue
  }

  // Create firm record
  const firmId = nextId()
  companyIds.set(firmKey, firmId)
  trackSeen(emailsRaw[0], firm)
  newRows.push(makeRow({
    id: firmId, name: firm || contactNames[0], email: emailsRaw[0] || '',
    asset: 'livingstonfarm', stage: 'backlog',
    category: 'family-office', investor_type: 'family-office',
    firm, website, priority_tier: priority, investment_rationale: rationale,
    source: 'Family Office list', is_company: true,
  }))
  console.log(`  + Family Office: ${firm}`)
  count3++

  // Add individual contacts (skip index 0 email since used for firm)
  for (let i = 0; i < contactNames.length; i++) {
    const cName = contactNames[i]
    const cEmail = emailsRaw[i + 1] || ''  // offset by 1 since [0] used for firm
    if (!cName || isDupe(cEmail, cName)) continue
    const id = nextId()
    trackSeen(cEmail, cName)
    newRows.push(makeRow({
      id, name: cName, email: cEmail, asset: 'livingstonfarm',
      stage: 'backlog', category: 'family-office', investor_type: 'family-office',
      firm, website, priority_tier: priority, investment_rationale: rationale,
      source: 'Family Office list', parent_id: firmId, is_company: false,
    }))
    console.log(`  + Family Office contact: ${cName} @ ${firm}`)
    count3++
  }
}
console.log(`  Added: ${count3}`)

// ── 4. Individual Contacts ─────────────────────────────────────────────────────
console.log('\n── Individual Contacts ──')
const individuals = readCsv('4_4_Individual_Contacts.csv')
console.log(`  ${individuals.length} rows`)
let count4 = 0

for (const row of individuals) {
  const firstName = String(row['First Name'] || '').trim()
  const lastName = String(row['Last Name'] || '').trim()
  const name = `${firstName} ${lastName}`.trim()
  if (!name || name === '') continue

  const email = cleanEmail(row['Email'] || '')
  const firm = String(row['Organization'] || '').trim()
  const category = normalizeCategory(row['Category'] || 'individual')
  const priority = normalizePriority(row['Priority'])
  const notes = String(row['Research Notes'] || '').trim()
  const linkedin = String(row['LinkedIn URL'] || '').trim()
  const recordId = String(row['Record ID'] || '').trim()
  const lifecycle = String(row['Lifecycle Stage'] || '').trim()

  if (isDupe(email, name)) {
    console.log(`  ~ Skip (dupe): ${name}`)
    continue
  }

  let parentId = ''
  if (firm) {
    parentId = ensureCompany(firm, { category, source: 'Individual contacts' })
  }

  const id = nextId()
  trackSeen(email, name)
  newRows.push(makeRow({
    id, name, email, asset: 'livingstonfarm',
    stage: 'backlog', category, investor_type: 'individual',
    firm, linkedin_url: linkedin, priority_tier: priority,
    notes, record_id: recordId, lifecycle_stage: lifecycle,
    source: 'Individual contacts', parent_id: parentId, is_company: false,
  }))
  console.log(`  + Individual: ${name}${email ? ` <${email}>` : ''}`)
  count4++
}
console.log(`  Added: ${count4}`)

// ── 5. New Contacts ────────────────────────────────────────────────────────────
console.log('\n── New Contacts ──')
const newContacts = readCsv('5_5_New_Contacts.csv')
console.log(`  ${newContacts.length} rows`)
let count5 = 0

for (const row of newContacts) {
  const name = String(row['Full Name'] || '').trim()
  if (!name) continue

  const title = String(row['Title'] || '').trim()
  const firm = String(row['Firm'] || '').trim()
  const email = cleanEmail(row['Email'] || '')
  const linkedin = String(row['LinkedIn'] || '').trim()
  const phone = String(row['Phone'] || '').trim()
  const website = String(row['Website'] || '').trim()
  const priority = normalizePriority(row['Priority'])
  const rationale = String(row['Investment Rationale for Circular'] || '').trim()
  const source = String(row['Source'] || 'New contacts').trim()
  const category = normalizeCategory(row['Category'] || 'individual')

  if (isDupe(email, name)) {
    console.log(`  ~ Skip (dupe): ${name}`)
    continue
  }

  let parentId = ''
  if (firm) {
    parentId = ensureCompany(firm, { category, investor_type: 'other', website, priority_tier: priority, source })
  }

  const id = nextId()
  trackSeen(email, name)
  newRows.push(makeRow({
    id, name, email, phone, asset: 'livingstonfarm',
    stage: 'backlog', category, investor_type: 'other',
    firm, title, linkedin_url: linkedin, website, priority_tier: priority,
    investment_rationale: rationale, source, parent_id: parentId, is_company: false,
  }))
  console.log(`  + New Contact: ${name}${firm ? ` @ ${firm}` : ''}`)
  count5++
}
console.log(`  Added: ${count5}`)

// ── 6. Action Plan contacts ────────────────────────────────────────────────────
console.log('\n── Action Plan contacts ──')
const actionPlan = readCsv('6__Action_Plan.csv')
console.log(`  ${actionPlan.length} rows`)
let count6 = 0

for (const row of actionPlan) {
  const name = String(row['Full Name'] || '').trim()
  if (!name) continue

  const firm = String(row['Firm'] || '').trim()
  const email = cleanEmail(row['Email'] || '')
  const phone = String(row['Phone'] || '').trim()
  const linkedin = String(row['LinkedIn'] || '').trim()
  const priority = normalizePriority(row['Priority'])
  const category = normalizeCategory(row['Category'] || 'individual')
  const notes = String(row['Warm Intro Path'] || row['Suggested Approach'] || '').trim()

  if (isDupe(email, name)) {
    console.log(`  ~ Skip (dupe): ${name}`)
    continue
  }

  let parentId = ''
  if (firm) {
    parentId = ensureCompany(firm, { category, source: 'Action Plan' })
  }

  const id = nextId()
  trackSeen(email, name)
  newRows.push(makeRow({
    id, name, email, phone, asset: 'livingstonfarm',
    stage: 'backlog', category, investor_type: 'other',
    firm, linkedin_url: linkedin, priority_tier: priority,
    notes, source: 'Action Plan', parent_id: parentId, is_company: false,
  }))
  console.log(`  + Action Plan: ${name}${firm ? ` @ ${firm}` : ''}`)
  count6++
}
console.log(`  Added: ${count6}`)

// ── Write to Google Sheets ─────────────────────────────────────────────────────
const total = newRows.length
console.log(`\n── Summary ──────────────────────────────────────────────────────────`)
console.log(`  Total new rows to write: ${total}`)
if (total === 0) {
  console.log('  Nothing new to add. All contacts already exist in the Pipeline.')
  process.exit(0)
}

if (DRY_RUN) {
  console.log('  DRY RUN — not writing to sheet.')
  process.exit(0)
}

console.log(`  Writing ${total} rows to Pipeline sheet…`)
// Batch in chunks of 500
const CHUNK = 500
for (let i = 0; i < newRows.length; i += CHUNK) {
  const chunk = newRows.slice(i, i + CHUNK)
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: TAB,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: chunk },
  })
  console.log(`  Wrote rows ${i + 1}–${Math.min(i + CHUNK, total)}`)
}

console.log(`\nDone! Added ${total} new contacts to Pipeline.`)
