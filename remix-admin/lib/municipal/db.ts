/**
 * Postgres client — Neon serverless.
 *
 * Uses `@neondatabase/serverless` which speaks HTTP/WebSocket rather than
 * classic TCP, so it works cleanly on Vercel serverless functions.
 *
 * Two shapes exported:
 *   - `sql`: template-tag interface for one-shot queries, safe parameter
 *     interpolation. Preferred for ad-hoc SQL.
 *   - `getPool()`: node-postgres-compatible pool for transactions and
 *     multi-statement batches.
 */
import { neon, Pool } from '@neondatabase/serverless'


let _pool: Pool | null = null

function url(): string {
  const u = process.env.NEON_DATABASE_URL
  if (!u) throw new Error('NEON_DATABASE_URL env var is not set')
  return u
}

/** Template-tag query. Use for one-off reads / writes. */
export const sql = neon(url())

/**
 * Pooled client for transactions.
 * Do NOT retain across requests — Vercel serverless can reuse the module,
 * but the pool auto-manages sockets.
 */
export function getPool(): Pool {
  if (!_pool) _pool = new Pool({ connectionString: url() })
  return _pool
}

/**
 * Health check — pings the DB and returns pgvector + postgis availability.
 * Used by /admin/api/municipal/health for M1 verification.
 */
export async function health(): Promise<{
  ok: boolean
  version: string
  extensions: string[]
  error?: string
}> {
  try {
    const rows = (await sql`
      SELECT current_setting('server_version') AS version,
             array_agg(extname) AS extensions
      FROM pg_extension
      WHERE extname IN ('vector', 'postgis', 'pgcrypto', 'pg_trgm')
    `) as Array<{ version: string; extensions: string[] }>
    const r = rows[0]
    return {
      ok: true,
      version: r?.version ?? '',
      extensions: r?.extensions ?? [],
    }
  } catch (e) {
    return {
      ok: false,
      version: '',
      extensions: [],
      error: e instanceof Error ? e.message : String(e),
    }
  }
}
