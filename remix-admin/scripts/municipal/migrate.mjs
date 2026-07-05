#!/usr/bin/env node
/**
 * Municipal migrations runner.
 *
 * Usage:
 *   NEON_DATABASE_URL=postgres://... node scripts/municipal/migrate.mjs
 *
 * Runs SQL files in scripts/municipal/migrations/ in lexical order,
 * tracking applied migrations in `_municipal_migration` table.
 *
 * Idempotent — safe to re-run.
 */
import { readdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { neon } from '@neondatabase/serverless'

const url = process.env.NEON_DATABASE_URL
if (!url) {
  console.error('NEON_DATABASE_URL not set')
  process.exit(1)
}

const sql = neon(url)
const dir = join(dirname(fileURLToPath(import.meta.url)), 'migrations')

async function ensureMigrationTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS _municipal_migration (
      name text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `
}

async function appliedSet() {
  const rows = await sql`SELECT name FROM _municipal_migration`
  return new Set(rows.map((r) => r.name))
}

async function run() {
  await ensureMigrationTable()
  const applied = await appliedSet()
  const files = (await readdir(dir)).filter((f) => f.endsWith('.sql')).sort()

  for (const f of files) {
    if (applied.has(f)) {
      console.log(`✓ ${f} (already applied)`)
      continue
    }
    console.log(`→ ${f}`)
    const body = await readFile(join(dir, f), 'utf8')
    // Neon HTTP driver runs one statement per call for multi-statement bodies;
    // we split naively on `;\n` and skip empties. Comments retained inside
    // individual statements are fine.
    const statements = body
      .split(/;\s*\n/g)
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !/^--/.test(s))

    for (const s of statements) {
      try {
        await sql.query(s)
      } catch (e) {
        console.error(`✗ failed statement in ${f}:\n${s.slice(0, 200)}...`)
        throw e
      }
    }
    await sql`INSERT INTO _municipal_migration (name) VALUES (${f})`
    console.log(`✓ ${f} applied`)
  }

  console.log('\nAll migrations applied.')
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
