/**
 * Mirror the Stefan_CRM_v*.html tabs (CRE, TECH, REC, AI, CONSULT) into Upstash
 * so the Remix admin CRM hub can read them live.
 *
 * Usage (PowerShell) — set Upstash creds, then run from remix-admin/:
 *   $env:UPSTASH_REDIS_REST_URL="..."; $env:UPSTASH_REDIS_REST_TOKEN="..."
 *   node scripts/seed-crm.mjs
 *
 * By default it finds the highest Stefan_CRM_v*.html in the Job Search folder.
 * Override with CRM_FILE=<path> or CRM_DIR=<folder>.
 *
 * Re-run any time to refresh (e.g. after your daily automation updates the CRM).
 */
import { Redis } from '@upstash/redis'
import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'

const CATEGORIES = ['CRE', 'TECH', 'REC', 'AI', 'CONSULT']

function findCrmFile() {
  if (process.env.CRM_FILE) return process.env.CRM_FILE
  const dir =
    process.env.CRM_DIR ||
    'C:\\Users\\stef7\\OneDrive\\Documents\\Claude\\Projects\\Job Search'
  const files = readdirSync(dir).filter((f) => /^Stefan_CRM_v\d+\.html$/.test(f))
  if (!files.length) throw new Error('No Stefan_CRM_v*.html found in ' + dir)
  files.sort((a, b) => Number(a.match(/v(\d+)/)[1]) - Number(b.match(/v(\d+)/)[1]))
  return path.join(dir, files[files.length - 1])
}

function extractArray(src, name) {
  const m = src.match(new RegExp('var\\s+' + name + '\\s*=\\s*\\['))
  if (!m) return []
  const start = src.indexOf('[', m.index)
  let depth = 0
  let inStr = false
  let esc = false
  let q = ''
  let end = start
  for (let j = start; j < src.length; j++) {
    const c = src[j]
    if (inStr) {
      if (esc) esc = false
      else if (c === '\\') esc = true
      else if (c === q) inStr = false
    } else if (c === '"' || c === "'") {
      inStr = true
      q = c
    } else if (c === '[') {
      depth++
    } else if (c === ']') {
      depth--
      if (depth === 0) {
        end = j
        break
      }
    }
  }
  try {
    return JSON.parse(src.slice(start, end + 1))
  } catch (e) {
    console.error(`  ! could not parse ${name}: ${e.message}`)
    return []
  }
}

const file = findCrmFile()
console.log('Reading CRM from:', file)
const src = readFileSync(file, 'utf8')
const redis = Redis.fromEnv()

for (const cat of CATEGORIES) {
  let entries = extractArray(src, cat)
  // NYSCR RFP rows belong to the RFPs tab, not Consulting
  if (cat === 'CONSULT') entries = entries.filter((e) => e.source !== 'NYSCR')
  const clean = entries.map((e) => ({
    firm: e.firm || '',
    tier: e.t || e.tier || '',
    status: e.status || '',
    email: e.email || '',
    city: e.city || '',
    contact: e.contact || '',
    web: e.web || '',
  }))
  await redis.set('crm:' + cat, clean)
  console.log(`  crm:${cat} → ${clean.length} entries`)
}
console.log('✓ CRM mirrored to Upstash.')
