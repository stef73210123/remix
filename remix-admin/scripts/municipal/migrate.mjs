#!/usr/bin/env node
/**
 * Municipal migrations runner.
 *
 * Usage:
 *   NEON_DATABASE_URL=postgres://... node scripts/municipal/migrate.mjs
 *   NEON_DATABASE_URL=postgres://... node scripts/municipal/migrate.mjs --reset
 *
 * Uses @neondatabase/serverless's Client (pg-compatible) so multi-statement
 * DDL bodies run cleanly. Tracks applied migrations in `_municipal_migration`.
 *
 * `--reset` drops schema `public` first — useful for M1 iteration on a
 * fresh Neon DB. Idempotent otherwise.
 */
import { readdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { Client } from '@neondatabase/serverless'

const url = process.env.NEON_DATABASE_URL
if (!url) {
  console.error('NEON_DATABASE_URL not set')
  process.exit(1)
}

const reset = process.argv.includes('--reset')

const dir = join(dirname(fileURLToPath(import.meta.url)), 'migrations')

async function run() {
  const client = new Client(url)
  await client.connect()

  if (reset) {
    console.log('→ RESET: dropping schema public')
    await client.query('DROP SCHEMA public CASCADE')
    await client.query('CREATE SCHEMA public')
    await client.query('GRANT ALL ON SCHEMA public TO PUBLIC')
    console.log('✓ schema reset')
  }

  await client.query(`
    CREATE TABLE IF NOT EXISTS _municipal_migration (
      name text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `)

  const appliedRes = await client.query('SELECT name FROM _municipal_migration')
  const applied = new Set(appliedRes.rows.map((r) => r.name))

  const files = (await readdir(dir)).filter((f) => f.endsWith('.sql')).sort()

  for (const f of files) {
    if (applied.has(f)) {
      console.log(`✓ ${f} (already applied)`)
      continue
    }
    console.log(`→ ${f}`)
    const body = await readFile(join(dir, f), 'utf8')

    try {
      // Client.query handles multi-statement DDL bodies natively.
      await client.query(body)
    } catch (e) {
      console.error(`✗ failed in ${f}: ${e.message}`)
      await client.end()
      throw e
    }
    await client.query('INSERT INTO _municipal_migration (name) VALUES ($1)', [f])
    console.log(`✓ ${f} applied`)
  }

  // Sanity: enumerate created objects
  const tables = await client.query(`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename NOT LIKE '_%'
    ORDER BY tablename
  `)
  const extensions = await client.query(`
    SELECT extname FROM pg_extension
    WHERE extname IN ('vector', 'postgis', 'pgcrypto', 'pg_trgm')
    ORDER BY extname
  `)

  console.log(`\nTables created: ${tables.rows.length}`)
  console.log(tables.rows.map((r) => `  - ${r.tablename}`).join('\n'))
  console.log(`\nExtensions: ${extensions.rows.map((r) => r.extname).join(', ')}`)

  await client.end()
  console.log('\nAll migrations applied.')
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
