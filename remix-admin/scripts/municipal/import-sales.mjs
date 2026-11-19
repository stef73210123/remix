#!/usr/bin/env node
/**
 * Import a NYS Sales Web export into lib/municipal/data/<muni>-sales.json.
 *
 *   node scripts/municipal/import-sales.mjs <export.csv> [--muni nc] [--as-of YYYY-MM-DD]
 *
 * 1. In Sales Web (https://pad.tax.ny.gov), search Westchester → North Castle,
 *    all property classes, the last 3+ years, then "Download Search Results".
 *    Save the sheet as CSV.
 * 2. Run this script. It matches every sale to the Westchester County parcel
 *    layer by print key (assessed value, class, living area, school district),
 *    drops buyer/seller names and writes the committed JSON.
 *
 * Column names are matched loosely (see ALIASES); if a required column can't be
 * found the script prints the headers it saw and exits non-zero.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const PARCELS =
  'https://services6.arcgis.com/EbVsqZ18sv1kVJ3k/arcgis/rest/services/Westchester_County_Parcels/FeatureServer/0/query'

const MUNIS = {
  nc: {
    swis: '553800',
    // School district → plain-language area. Parcels carry no ZIP, so the
    // district is the most reliable hamlet proxy on the county layer.
    areas: { 'Byram Hills': 'Armonk & Banksville', Valhalla: 'North White Plains', Bedford: 'North (Bedford schools)' },
  },
}

const ALIASES = {
  date: ['sale date', 'saledate', 'date of sale', 'deed date', 'transfer date'],
  price: ['sale price', 'saleprice', 'price', 'full sale price'],
  printKey: ['print key', 'printkey', 'tax map', 'tax map #', 'tax map number', 'parcel id', 'sbl'],
  address: ['address', 'property address', 'property location', 'location', 'street address', 'parcel address'],
  propClass: ['property class', 'prop class', 'class', 'property class code'],
  armsLength: ["arm's length", 'arms length', 'arms-length', 'arm length', 'valid'],
  swis: ['swis', 'swis code', 'municipality code'],
}

function parseCsv(text) {
  const rows = []
  let row = [], field = '', q = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (q) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++ }
      else if (c === '"') q = false
      else field += c
    } else if (c === '"') q = true
    else if (c === ',') { row.push(field); field = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(field); field = ''
      if (row.some((f) => f.trim() !== '')) rows.push(row)
      row = []
    } else field += c
  }
  row.push(field)
  if (row.some((f) => f.trim() !== '')) rows.push(row)
  return rows
}

const norm = (h) => h.toLowerCase().replace(/[^a-z0-9#' ]/g, ' ').replace(/\s+/g, ' ').trim()

function findColumns(headers) {
  const n = headers.map(norm)
  const cols = {}
  for (const [key, names] of Object.entries(ALIASES)) {
    const idx = n.findIndex((h) => names.includes(h))
    if (idx >= 0) cols[key] = idx
  }
  return cols
}

function toIsoDate(v) {
  const s = v.trim()
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m) return `${m[1]}-${m[2]}-${m[3]}`
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/)
  if (m) {
    const y = m[3].length === 2 ? `20${m[3]}` : m[3]
    return `${y}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`
  }
  return null
}

const toNumber = (v) => {
  const n = Number(String(v).replace(/[$,\s]/g, ''))
  return Number.isFinite(n) ? n : null
}
const toBool = (v) => /^(y|yes|true|1|x)$/i.test(String(v).trim())

async function fetchParcels(swis, printKeys) {
  const out = new Map()
  const keys = Array.from(new Set(printKeys))
  for (let i = 0; i < keys.length; i += 100) {
    const batch = keys.slice(i, i + 100)
    const where = `SWIS='${swis}' AND PRINT_KEY IN (${batch.map((k) => `'${k.replace(/'/g, "''")}'`).join(',')})`
    const body = new URLSearchParams({
      where,
      outFields: 'PRINT_KEY,PARCEL_ADDR,PROP_CLASS,TOTAL_AV,SQFT_LIVING,SCHOOL_NAME,ROLL_YR',
      returnGeometry: 'false',
      f: 'json',
    })
    const r = await fetch(PARCELS, { method: 'POST', body })
    if (!r.ok) throw new Error(`Parcel query failed: HTTP ${r.status}`)
    const j = await r.json()
    if (j.error) throw new Error(`Parcel query failed: ${JSON.stringify(j.error)}`)
    for (const f of j.features ?? []) out.set(f.attributes.PRINT_KEY, f.attributes)
  }
  return out
}

async function main() {
  const args = process.argv.slice(2)
  const file = args.find((a) => !a.startsWith('--'))
  const flag = (name) => {
    const i = args.indexOf(`--${name}`)
    return i >= 0 ? args[i + 1] : undefined
  }
  const muniKey = flag('muni') ?? 'nc'
  const asOf = flag('as-of') ?? new Date().toISOString().slice(0, 10)
  const muni = MUNIS[muniKey]
  if (!file || !muni) {
    console.error('Usage: node scripts/municipal/import-sales.mjs <export.csv> [--muni nc] [--as-of YYYY-MM-DD]')
    process.exit(2)
  }

  const rows = parseCsv(fs.readFileSync(file, 'utf8').replace(/^﻿/, ''))
  const headerIdx = rows.findIndex((r) => {
    const c = findColumns(r)
    return c.date != null && c.price != null && c.printKey != null
  })
  if (headerIdx < 0) {
    console.error('Could not find sale date, sale price and print key columns. Headers seen:')
    for (const r of rows.slice(0, 5)) console.error('  ' + JSON.stringify(r))
    process.exit(1)
  }
  const cols = findColumns(rows[headerIdx])
  const records = []
  let skipped = 0
  for (const r of rows.slice(headerIdx + 1)) {
    if (cols.swis != null && r[cols.swis] && !String(r[cols.swis]).startsWith(muni.swis.slice(0, 4))) { skipped++; continue }
    const date = toIsoDate(r[cols.date] ?? '')
    const price = toNumber(r[cols.price] ?? '')
    const printKey = String(r[cols.printKey] ?? '').trim()
    if (!date || price == null || !printKey) { skipped++; continue }
    records.push({
      date,
      price,
      printKey,
      address: cols.address != null ? String(r[cols.address]).trim() : '',
      propClass: cols.propClass != null ? String(r[cols.propClass]).trim().slice(0, 3) : '',
      armsLength: cols.armsLength != null ? toBool(r[cols.armsLength]) : true,
    })
  }

  const parcels = await fetchParcels(muni.swis, records.map((r) => r.printKey))
  let matched = 0
  const sales = records.map((s) => {
    const p = parcels.get(s.printKey)
    if (p) matched++
    return {
      date: s.date,
      price: s.price,
      address: (p?.PARCEL_ADDR ?? s.address ?? '').toUpperCase(),
      printKey: s.printKey,
      propClass: s.propClass || p?.PROP_CLASS || '',
      area: muni.areas[p?.SCHOOL_NAME] ?? 'Other',
      assessedValue: p?.TOTAL_AV ?? null,
      sqftLiving: p?.SQFT_LIVING ?? null,
      armsLength: s.armsLength,
    }
  })
  sales.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))

  const outPath = path.join(ROOT, 'lib/municipal/data', `${muniKey}-sales.json`)
  const prev = fs.existsSync(outPath) ? JSON.parse(fs.readFileSync(outPath, 'utf8')) : {}
  const out = {
    muniKey,
    asOf,
    coveredThrough: sales[0]?.date ?? null,
    levelOfAssessment: prev.levelOfAssessment ?? 0.0165,
    levelOfAssessmentNote: prev.levelOfAssessmentNote ?? '',
    sales,
  }
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2) + '\n')
  console.log(`Wrote ${sales.length} sales to ${path.relative(ROOT, outPath)} (${matched} matched to parcels, ${skipped} rows skipped).`)
  if (cols.armsLength == null) console.warn("No arm's-length column found; every sale was treated as arm's length.")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
