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

/**
 * Resolve the Postgres connection string. NEON_DATABASE_URL is canonical, but
 * the Vercel↔Neon integration provisions DATABASE_URL / POSTGRES_URL instead —
 * accept those too so a freshly-linked project (e.g. the OpenNorthCastle
 * deployment) works without renaming vars. Values are sanitized against the
 * common copy-paste artifacts from the Neon console: surrounding quotes and a
 * leading `psql ` from the "psql 'postgresql://…'" snippet.
 */
const URL_ENV_VARS = ['NEON_DATABASE_URL', 'DATABASE_URL', 'POSTGRES_URL'] as const

function sanitizeUrl(raw: string): string {
  let u = raw.trim()
  if (u.toLowerCase().startsWith('psql ')) u = u.slice(5).trim()
  if ((u.startsWith("'") && u.endsWith("'")) || (u.startsWith('"') && u.endsWith('"'))) {
    u = u.slice(1, -1).trim()
  }
  return u
}

function url(): string {
  for (const name of URL_ENV_VARS) {
    const raw = process.env[name]
    if (!raw) continue
    const u = sanitizeUrl(raw)
    if (!/^postgres(ql)?:\/\//i.test(u)) {
      throw new Error(`${name} is set but is not a postgres:// URL (got "${u.slice(0, 12)}…")`)
    }
    return u
  }
  throw new Error(`No database URL configured — set ${URL_ENV_VARS.join(' or ')}`)
}

/**
 * Template-tag query. Use for one-off reads / writes.
 *
 * Lazily initialized: creating the neon client eagerly at module load would
 * call url() and throw when NEON_DATABASE_URL is unset — which breaks
 * `next build` page-data collection (and any deploy that omits the var, e.g.
 * the public OpenNorthCastle build). The Proxy defers client creation to the
 * first actual query, so merely importing this module is always safe.
 */
type SqlFn = ReturnType<typeof neon>
let _sql: SqlFn | null = null
function realSql(): SqlFn {
  if (!_sql) _sql = neon(url())
  return _sql
}
export const sql = new Proxy((() => {}) as unknown as SqlFn, {
  apply(_target, _thisArg, args: unknown[]) {
    return (realSql() as unknown as (...a: unknown[]) => unknown)(...args)
  },
  get(_target, prop) {
    const s = realSql() as unknown as Record<PropertyKey, unknown>
    const v = s[prop]
    return typeof v === 'function' ? (v as (...a: unknown[]) => unknown).bind(s) : v
  },
})

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
