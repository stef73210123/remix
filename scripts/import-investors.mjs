/**
 * import-investors.mjs
 *
 * Imports all contacts from Circular_Investor_Master_v3.xlsx into the Pipeline
 * Google Sheet, plus additional investor contacts discovered via Gmail / Calendar.
 *
 * Rules:
 *   - Default stage = 'backlog'
 *   - Email found in Gmail / Calendar investor conversations → stage = 'contacted'
 *   - Company deduplication: one company record per firm (is_company=true);
 *     individuals from the same firm get parent_id pointing to that record
 *   - Duplicate emails across sheets are skipped
 *
 * Usage:
 *   node scripts/import-investors.mjs [--dry-run]
 */

import { readFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
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
  console.error('Could not read .env.local')
  process.exit(1)
}

const SPREADSHEET_ID = env.GOOGLE_SPREADSHEET_ID || env.GOOGLE_SHEET_ID
let SERVICE_ACCOUNT_RAW = env.GOOGLE_SERVICE_ACCOUNT_JSON || ''
const EXCEL_PATH = env.INVESTOR_XLSX_PATH ||
  'C:/Users/stef7/OneDrive/Documents/Claude/Projects/Circular Fundraising/Circular_Investor_Master_v3.xlsx'

if (!SPREADSHEET_ID || !SERVICE_ACCOUNT_RAW) {
  console.error('Missing GOOGLE_SPREADSHEET_ID/GOOGLE_SHEET_ID or GOOGLE_SERVICE_ACCOUNT_JSON in .env.local')
  process.exit(1)
}

// Decode base64 if not valid JSON directly
let serviceAccount
try {
  serviceAccount = JSON.parse(SERVICE_ACCOUNT_RAW)
} catch {
  try {
    const decoded = Buffer.from(SERVICE_ACCOUNT_RAW, 'base64').toString('utf-8')
    serviceAccount = JSON.parse(decoded)
  } catch {
    console.error('Invalid GOOGLE_SERVICE_ACCOUNT_JSON (not valid JSON or base64-encoded JSON)'); process.exit(1)
  }
}

const DRY_RUN = process.argv.includes('--dry-run')
const TAB = 'Pipeline'
const now = new Date().toISOString().split('T')[0]

// ── Gmail + Calendar investor contacts → stage = 'contacted' ─────────────────
// Collected 2026-03-22 from:
//   1. Gmail search (all investor/fundraising related emails)
//   2. Google Calendar (meetings with investment-related subjects)
const CONTACTED_EMAILS = new Set([
  // Gmail – general outreach / responses
  '3cedars3springs@gmail.com',
  'aa@arounianlaw.com',
  'af@counselco.net',
  'aflakstad@gbresi.com',
  'afv@venezianox.com',
  'ariella.fuchs@gmail.com',
  'arounian@arounianlaw.com',
  'avimirman@gmail.com',
  'ayman.waren@merakitalent.com',
  'bamolotsky@duanemorris.com',
  'bker@snowball-dev.com',
  'christina.hanna.hr@gmail.com',
  'connorhambly@gmail.com',
  'darin@signal-line.com',
  'dean@grandstreetdevelopment.com',
  'dleverett@placeusa.com',
  'emily@tiffconsults.com',
  'emma@fowler.design',
  'gnallet@gbresi.com',
  'gstone@sklpartners.com',
  'info@lunaredgeconsultingllc.net',
  'jay@longrdpartners.com',
  'jeklund4@gmail.com',
  'john@northbound-capital.com',
  'jordan@signal-line.com',
  'joseph@freshairny.com',
  'karma@kmchospitality.com',
  'kelly.mann@rsir.com',
  'kingruth18@gmail.com',
  'kitty@catherinejonesltd.com',
  'kiyon.lunaredgeconsultingllc@gmail.com',
  'kyle@goodgroundpartners.com',
  'ma@derreverelaw.com',
  'manderson@lsutitle.com',
  'mcamposverdi@gbresi.com',
  'me@roxannespruance.com',
  'mhochberg@lightstonegroup.com',
  'michael@potenzacap.com',
  'michelle@fowler.design',
  'mknight@blkhwk.com',
  'mschwartz@domaincompanies.com',
  'mtannous@silverleafpartners.com',
  'nicolas.lukac@gmail.com',
  'noah@heatonist.com',
  'olga@oabramson.com',
  'paul@signal-line.com',
  'ragnar@occidentalpm.com',
  'ritani@gbresi.com',
  'rjkatchis@sklpartners.com',
  'ruchy@executive-abstract.com',
  'sjilani@derreverelaw.com',
  'sm12052@nyu.edu',
  'smartinovic@properxpm.com',
  'stephan@kmchospitality.com',
  'steve@evolvehospitalitygroup.com',
  'syelland@jfrholdingsinc.com',
  'syelland@jfrohrbaugh.com',
  'tiff@tiffconsults.com',
  'vak@derreverelaw.com',
  'vicky.mueller@dentons.com',
  // Gmail – investor-specific conversations
  'mah@nuworldadvisors.com',
  'tal@atlas-invest.co',
  'danny@terranrobotics.ai',
  'john.carlson@terranrobotics.ai',
  'jr@terranrobotics.ai',
  // Calendar – investment / Circular / Livingston meetings
  'dan@endicottgp.com',
  'wayne@endicottgp.com',
  'ew@cambercreek.com',
  'kolya@tyhcap.com',
  'matthew@rosedale.partners',
  'aaron@rosedale.partners',
  'gianna@primary.vc',
  'elliot@cybernovaequity.com',
  'esilverstein@kbfcllc.com',
  'nchow@eb5capital.com',
  'rgarcia@eb5capital.com',
  'cassi@coadventures.com',
  'cassi@coaventures.com',
  'danny@coadventures.com',
  'danny@coaventures.com',
  'zach@terranrobotics.ai',
  'skitson@kitsonpartners.com',
  'jeklund@ecostruct.com',
])

function stageFor(email) {
  if (!email) return 'backlog'
  return CONTACTED_EMAILS.has(email.toLowerCase().trim()) ? 'contacted' : 'backlog'
}

function cleanEmail(raw) {
  if (!raw) return ''
  const m = String(raw).match(/<([^>]+)>/)
  return (m ? m[1] : String(raw)).trim().toLowerCase()
}

function normalizePriority(p) {
  if (!p) return ''
  const s = String(p).trim()
  if (s.includes('High') || s.match(/⭐⭐⭐/) || s === '1') return 'High'
  if (s.match(/⭐⭐\s/) || s.includes('Tier 2') || s.includes('Medium') || s === '2') return 'Medium'
  if (s.match(/⭐\s/) || s.includes('Tier 3') || s.includes('Low') || s === '3') return 'Low'
  return s
}

// ── Read Excel ────────────────────────────────────────────────────────────────
const XLSX = require('xlsx')
let workbook
try {
  workbook = XLSX.readFile(EXCEL_PATH)
} catch (e) {
  console.error('Could not read Excel file:', EXCEL_PATH, '\n', e.message)
  process.exit(1)
}

const sheetNames = workbook.SheetNames
console.log('Sheets:', sheetNames.join(', '))

function getSheetRows(sheetName) {
  const sheet = workbook.Sheets[sheetName]
  if (!sheet) return []
  return XLSX.utils.sheet_to_json(sheet, { defval: '' })
}

// ── Deduplication tracking ────────────────────────────────────────────────────
const seenEmails = new Set()
// firmKey (lowercase) → rowArray (to be assigned an ID later)
const companyRows = new Map()
// firmKey → assigned ID string
const companyIds = new Map()

let rowIdCounter = Date.now()
function nextId() { return `lead_import_${rowIdCounter++}` }

// Rows to write (array of 27-column arrays)
const rows = []

// ── leadToRow matching lib/sheets/pipeline.ts leadToRow (26 cols, idx 0-25) ──
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

function addRow(params) {
  const email = (params.email || '').toLowerCase().trim()
  if (email && seenEmails.has(email)) return null
  if (email) seenEmails.add(email)
  const id = nextId()
  rows.push(makeRow({ ...params, id }))
  return id
}

// Ensure a company record exists for a firm; return its id
function ensureCompany(firm, { category = '', investor_type = '', website = '', priority_tier = '', source = '' } = {}) {
  const key = firm.toLowerCase().trim()
  if (companyIds.has(key)) return companyIds.get(key)
  const id = nextId()
  companyIds.set(key, id)
  rows.push(makeRow({
    id, name: firm, email: '', asset: 'livingstonfarm',
    stage: 'backlog', category, investor_type, firm, website,
    priority_tier, source, is_company: true,
  }))
  return id
}

// ── Sheet 1: Institutional ────────────────────────────────────────────────────
const sheet1Name = sheetNames.find(n => n.includes('Institutional')) || sheetNames[1]
const institutional = getSheetRows(sheet1Name)
console.log(`\nSheet 1 (Institutional): ${institutional.length} rows`)

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
  if (!companyIds.has(firmKey)) {
    const id = nextId()
    companyIds.set(firmKey, id)
    if (!email || !seenEmails.has(email)) {
      if (email) seenEmails.add(email)
      rows.push(makeRow({
        id, name: firm, email, asset: 'livingstonfarm',
        stage: stageFor(email), category: 'institutional',
        investor_type: 'institutional', firm, website,
        priority_tier: priority, investment_rationale: rationale,
        notes, source: 'Pitchbook', is_company: true,
      }))
      console.log(`  + Institutional: ${firm} → ${stageFor(email)}`)
    }
  }
}

// ── Sheet 2: Co-GP Partners ───────────────────────────────────────────────────
const sheet2Name = sheetNames.find(n => n.includes('Co-GP') || n.includes('Co GP')) || sheetNames[2]
const cogp = getSheetRows(sheet2Name)
console.log(`\nSheet 2 (Co-GP): ${cogp.length} rows`)

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

  let parentId = ''
  if (firm) {
    parentId = ensureCompany(firm, { category: 'co-gp', investor_type: 'other', website, priority_tier: priority })
  }

  const id = addRow({
    name, email, phone, asset: 'livingstonfarm',
    stage: stageFor(email), category: 'co-gp', investor_type: 'other',
    firm, title, linkedin_url: linkedin, website, priority_tier: priority,
    investment_rationale: rationale, parent_id: parentId, is_company: false,
  })
  if (id) console.log(`  + Co-GP: ${name}${firm ? ` @ ${firm}` : ''} → ${stageFor(email)}`)
}

// ── Sheet 3: Family Offices ───────────────────────────────────────────────────
const sheet3Name = sheetNames.find(n => n.includes('Family')) || sheetNames[3]
const familyOffices = getSheetRows(sheet3Name)
console.log(`\nSheet 3 (Family Offices): ${familyOffices.length} rows`)

for (const row of familyOffices) {
  const firm = String(row['Investor / Firm'] || row['Investor/Firm'] || '').trim()
  const contactNames = String(row['Contact Name(s)'] || '').split(',').map(s => s.trim()).filter(Boolean)
  // deduplicate emails within the same cell
  const rawEmailStr = String(row['Email(s)'] || row['Emails'] || '')
  const emailsRaw = [...new Set(rawEmailStr.split(/[,;]/).map(cleanEmail).filter(Boolean))]
  const website = String(row['Website'] || '').trim()
  const priority = normalizePriority(row['Priority'])
  const rationale = String(row['Investment Rationale for Circular'] || row['Investment Rationale'] || '').trim()

  if (!firm && !contactNames[0]) continue

  const primaryEmail = emailsRaw[0] || ''
  const firmKey = (firm || contactNames[0] || '').toLowerCase()

  if (!companyIds.has(firmKey)) {
    const id = nextId()
    companyIds.set(firmKey, id)
    if (!primaryEmail || !seenEmails.has(primaryEmail)) {
      if (primaryEmail) seenEmails.add(primaryEmail)
      rows.push(makeRow({
        id, name: firm || contactNames[0], email: primaryEmail,
        asset: 'livingstonfarm', stage: stageFor(primaryEmail),
        category: 'family-office', investor_type: 'family-office',
        firm: firm || '', website, priority_tier: priority,
        investment_rationale: rationale,
        notes: contactNames.length > 0 ? `Contacts: ${contactNames.join(', ')}` : '',
        is_company: true,
      }))
      console.log(`  + Family Office: ${firm || contactNames[0]} → ${stageFor(primaryEmail)}`)
    }
  }
}

// ── Sheet 4: Individual Contacts (HubSpot export, ~4,664 rows) ───────────────
const sheet4Name = sheetNames.find(n => n.includes('Individual')) || sheetNames[4]
const individuals = getSheetRows(sheet4Name)
console.log(`\nSheet 4 (Individuals): ${individuals.length} rows`)

// Group by org to batch company creation
const byOrg = new Map()
for (const row of individuals) {
  const firstName = String(row['First Name'] || '').trim()
  const lastName = String(row['Last Name'] || '').trim()
  const name = `${firstName} ${lastName}`.trim()
  if (!name) continue
  const email = cleanEmail(row['Email'] || '')
  const org = String(row['Organization'] || '').trim()
  const priority = normalizePriority(row['Priority'])
  const notes = String(row['Research Notes'] || '').trim()
  const linkedin = String(row['LinkedIn URL'] || '').trim()
  const lifecycle = String(row['Lifecycle Stage'] || '').trim()
  const recordId = String(row['Record ID'] || '').trim()

  const key = org ? org.toLowerCase() : '__solo__'
  if (!byOrg.has(key)) byOrg.set(key, [])
  byOrg.get(key).push({ name, email, org, priority, notes, linkedin, lifecycle, recordId })
}

let indivCount = 0
for (const [orgKey, members] of byOrg) {
  let parentId = ''
  if (orgKey !== '__solo__') {
    const orgName = members[0].org
    if (!companyIds.has(orgKey)) {
      const id = nextId()
      companyIds.set(orgKey, id)
      rows.push(makeRow({
        id, name: orgName, email: '', asset: 'livingstonfarm',
        stage: 'backlog', category: 'individual', investor_type: 'individual',
        firm: orgName, is_company: true,
        priority_tier: members[0].priority,
      }))
    }
    parentId = companyIds.get(orgKey) || ''
  }

  for (const entry of members) {
    const id = addRow({
      name: entry.name, email: entry.email, asset: 'livingstonfarm',
      stage: stageFor(entry.email), category: 'individual',
      investor_type: 'individual', firm: entry.org,
      linkedin_url: entry.linkedin, priority_tier: entry.priority,
      notes: entry.notes, lifecycle_stage: entry.lifecycle,
      record_id: entry.recordId, parent_id: parentId, is_company: false,
    })
    if (id) indivCount++
  }
}
console.log(`  Added ${indivCount} individual contacts`)

// ── Sheet 5: New Contacts ─────────────────────────────────────────────────────
const sheet5Name = sheetNames.find(n => n.includes('New Contacts') || n.includes('5.')) || sheetNames[5]
const newContacts = getSheetRows(sheet5Name)
console.log(`\nSheet 5 (New Contacts): ${newContacts.length} rows`)

const catMap = {
  'institutional': 'institutional', 'family office': 'family-office',
  'family-office': 'family-office', 'individual': 'individual',
  'co-gp': 'co-gp', 'co gp': 'co-gp',
}
const typeMap = {
  'institutional': 'institutional', 'family-office': 'family-office',
  'family office': 'family-office', 'individual': 'individual',
}

for (const row of newContacts) {
  const name = String(row['Full Name'] || '').trim()
  if (!name) continue
  const title = String(row['Title'] || '').trim()
  const firm = String(row['Firm'] || '').trim()
  const catRaw = String(row['Category'] || '').trim().toLowerCase()
  const email = cleanEmail(row['Email'] || '')
  const linkedin = String(row['LinkedIn'] || '').trim()
  const phone = String(row['Phone'] || '').trim()
  const website = String(row['Website'] || '').trim()
  const priority = normalizePriority(row['Priority'])
  const rationale = String(row['Investment Rationale for Circular'] || row['Investment Rationale'] || '').trim()
  const source = String(row['Source'] || '').trim()

  const category = catMap[catRaw] || 'new-contact'
  const investor_type = typeMap[catRaw] || 'individual'

  let parentId = ''
  if (firm) {
    parentId = ensureCompany(firm, { category, investor_type, website, priority_tier: priority, source })
  }

  const id = addRow({
    name, email, phone, asset: 'livingstonfarm',
    stage: stageFor(email), category, investor_type,
    firm, title, linkedin_url: linkedin, website, priority_tier: priority,
    investment_rationale: rationale, source,
    parent_id: parentId, is_company: false,
  })
  if (id) console.log(`  + New Contact: ${name}${firm ? ` @ ${firm}` : ''} → ${stageFor(email)}`)
}

// ── Additional: investor contacts from Gmail/Calendar not in spreadsheet ──────
console.log('\n=== Additional investors from Gmail / Calendar ===')

const ADDITIONAL_CONTACTS = [
  // Endicott Capital – VC meeting ("11amET - VC - Endicott Capital & Stefan")
  { name: 'Dan', email: 'dan@endicottgp.com', firm: 'Endicott Capital', investor_type: 'institutional', category: 'institutional', notes: 'VC meeting with Stefan (Calendar)' },
  { name: 'Wayne', email: 'wayne@endicottgp.com', firm: 'Endicott Capital', investor_type: 'institutional', category: 'institutional', notes: 'VC meeting with Stefan (Calendar)' },
  // Camber Creek – Livingston Farm Discussion (Calendar)
  { name: 'Camber Creek Contact', email: 'ew@cambercreek.com', firm: 'Camber Creek', investor_type: 'institutional', category: 'institutional', notes: 'Livingston Farm Discussion (Calendar)' },
  // TYH Capital (Calendar)
  { name: 'Kolya Miller', email: 'kolya@tyhcap.com', firm: 'TYH Capital', investor_type: 'institutional', category: 'institutional', notes: 'Meeting with Stefan (Calendar)' },
  // Rosedale Partners (Calendar)
  { name: 'Matthew Polci', email: 'matthew@rosedale.partners', firm: 'Rosedale Partners', investor_type: 'institutional', category: 'institutional', notes: 'Meeting with Stefan (Calendar)' },
  { name: 'Aaron', email: 'aaron@rosedale.partners', firm: 'Rosedale Partners', investor_type: 'institutional', category: 'institutional', notes: 'Meeting with Stefan (Calendar)' },
  // Primary VC – OIR Opportunity (Calendar)
  { name: 'Gianna', email: 'gianna@primary.vc', firm: 'Primary VC', investor_type: 'institutional', category: 'institutional', notes: 'OIR Opportunity discussion (Calendar)' },
  // NuWorld Advisors – Circular Investment meeting (Gmail)
  { name: 'MAH', email: 'mah@nuworldadvisors.com', firm: 'NuWorld Advisors', investor_type: 'other', category: 'institutional', notes: 'Circular Investment meeting (Gmail/Calendar)' },
  // Atlas Invest – Zoom Stefan-Tal (Gmail)
  { name: 'Tal', email: 'tal@atlas-invest.co', firm: 'Atlas Invest', investor_type: 'institutional', category: 'institutional', notes: 'Zoom investment discussion (Gmail)' },
  // EB-5 Capital (Calendar)
  { name: 'Nick Chow', email: 'nchow@eb5capital.com', firm: 'EB-5 Capital', investor_type: 'institutional', category: 'institutional', notes: 'Meeting with Stefan (Calendar)' },
  { name: 'R. Garcia', email: 'rgarcia@eb5capital.com', firm: 'EB-5 Capital', investor_type: 'institutional', category: 'institutional', notes: 'Meeting with Stefan (Calendar)' },
  // CyberNova Equity – Project Livingston (Calendar)
  { name: 'Elliot', email: 'elliot@cybernovaequity.com', firm: 'CyberNova Equity', investor_type: 'individual', category: 'individual', notes: 'Project Livingston equity discussion (Calendar)' },
  // Terran Robotics – Livingston Farm (Gmail + Calendar)
  { name: 'Danny (Terran)', email: 'danny@terranrobotics.ai', firm: 'Terran Robotics', investor_type: 'other', category: 'institutional', notes: 'Livingston Farm partnership discussion (Calendar)' },
  { name: 'Zach (Terran)', email: 'zach@terranrobotics.ai', firm: 'Terran Robotics', investor_type: 'other', category: 'institutional', notes: 'Livingston Farm partnership discussion (Calendar)' },
  { name: 'John Carlson (Terran)', email: 'john.carlson@terranrobotics.ai', firm: 'Terran Robotics', investor_type: 'other', category: 'institutional', notes: 'Livingston Farm discussion (Gmail)' },
  { name: 'JR (Terran)', email: 'jr@terranrobotics.ai', firm: 'Terran Robotics', investor_type: 'other', category: 'institutional', notes: 'Livingston Farm discussion (Gmail)' },
  // Co-Adventures – farm investment (Calendar)
  { name: 'Cassi', email: 'cassi@coadventures.com', firm: 'Co-Adventures', investor_type: 'other', category: 'co-gp', notes: 'Farm investment discussion (Calendar)' },
  { name: 'Danny (Co-Adventures)', email: 'danny@coadventures.com', firm: 'Co-Adventures', investor_type: 'other', category: 'co-gp', notes: 'Farm investment discussion (Calendar)' },
  // Kitson Partners – Babcock Ranch / Livingston Farm (Calendar)
  { name: 'Syd Kitson', email: 'skitson@kitsonpartners.com', firm: 'Kitson Partners', investor_type: 'other', category: 'institutional', notes: 'Babcock Ranch/Livingston Farm discussion (Calendar)' },
  // Longrd Partners (Gmail)
  { name: 'Jay', email: 'jay@longrdpartners.com', firm: 'Longrd Partners', investor_type: 'other', category: 'institutional', notes: 'MOU Discussion Circular (Gmail)' },
  // Silverleaf Partners – Circular Investment (Gmail)
  { name: 'M. Tannous', email: 'mtannous@silverleafpartners.com', firm: 'Silverleaf Partners', investor_type: 'institutional', category: 'institutional', notes: 'Circular Investment Opportunity (Gmail)' },
  // Potenza Capital – Circular meeting (Gmail + Calendar)
  { name: 'Michael', email: 'michael@potenzacap.com', firm: 'Potenza Capital', investor_type: 'institutional', category: 'institutional', notes: 'Potenza / Circular meeting (Gmail/Calendar)' },
  // Nicolas Lukac – Circular meeting (Gmail + Calendar)
  { name: 'Nicolas Lukac', email: 'nicolas.lukac@gmail.com', investor_type: 'individual', category: 'individual', notes: 'Nicolas / Circular meeting (Gmail/Calendar)' },
  // Ragnar – Occidental PM / Circular Livingston Farm (Gmail + Calendar)
  { name: 'Ragnar', email: 'ragnar@occidentalpm.com', firm: 'Occidental PM', investor_type: 'other', category: 'institutional', notes: 'Circular / Livingston Farm meeting (Gmail/Calendar)' },
  // Luna Edge Consulting – Strong Interest in Circular Agritourism (Gmail)
  { name: 'Kiyon Fleeks', email: 'kiyon.lunaredgeconsultingllc@gmail.com', firm: 'Luna Edge Consulting', investor_type: 'other', category: 'new-contact', notes: 'Strong Interest in Circular Agritourism Platform (Gmail)' },
  { name: 'Sonja Houston', email: 'info@lunaredgeconsultingllc.net', firm: 'Luna Edge Consulting', investor_type: 'other', category: 'new-contact', notes: 'Strong Interest in Circular Agritourism Platform (Gmail)' },
  // JFR Holdings – Circular discussions (Gmail)
  { name: 'Steve Yelland', email: 'syelland@jfrholdingsinc.com', firm: 'JFR Holdings', investor_type: 'individual', category: 'individual', notes: 'Circular discussions (Gmail/Calendar)' },
]

for (const contact of ADDITIONAL_CONTACTS) {
  let parentId = ''
  if (contact.firm) {
    parentId = ensureCompany(contact.firm, {
      category: contact.category,
      investor_type: contact.investor_type,
    })
  }
  const id = addRow({
    name: contact.name,
    email: contact.email || '',
    asset: 'livingstonfarm',
    stage: 'contacted', // all these are explicitly known contacts
    category: contact.category || 'individual',
    investor_type: contact.investor_type || 'individual',
    firm: contact.firm || '',
    notes: contact.notes || '',
    parent_id: parentId,
    is_company: false,
  })
  if (id) console.log(`  + ${contact.name}${contact.firm ? ` @ ${contact.firm}` : ''} → contacted`)
  else console.log(`  skip dup: ${contact.email}`)
}

// ── Write to Google Sheets ────────────────────────────────────────────────────
console.log(`\nTotal rows to write: ${rows.length}`)
console.log(`  Unique emails tracked: ${seenEmails.size}`)
console.log(`  Company records: ${Array.from(rows).filter(r => r[25] === 'true').length}`)

if (DRY_RUN) {
  console.log('\n[DRY RUN] — not writing to Google Sheets')
  process.exit(0)
}

const { google } = require('googleapis')
const auth = new google.auth.GoogleAuth({
  credentials: serviceAccount,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
})
const sheets = google.sheets({ version: 'v4', auth })

const BATCH = 500
let written = 0

for (let i = 0; i < rows.length; i += BATCH) {
  const batch = rows.slice(i, i + BATCH)
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${TAB}!A1`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: batch },
  })
  written += batch.length
  console.log(`Written ${written} / ${rows.length}…`)
  if (i + BATCH < rows.length) await new Promise(r => setTimeout(r, 1200))
}

console.log(`\n✅ Done! Imported ${written} leads.`)
console.log('  Review pipeline at /admin/pipeline — company records marked 🏢, individuals show ↳')
