# M1 setup — Municipal Dashboard pipeline proof

Branch: `municipal-m1`
Goal: ingest one Town Board meeting from North Castle **and** one from Rockland, end-to-end, into a fresh Neon Postgres DB. No transcription yet — that's M1½.

## What Stefan needs to do (once)

### 1. Provision Neon

- Create a new Neon project (name suggestion: `remix-municipal`)
- Choose a nearby region (US East)
- Copy the **pooled** connection string (Neon UI → Connection Details → "Pooled connection")
- In the Neon SQL editor or `psql`, enable extensions in the target database:
  ```sql
  CREATE EXTENSION IF NOT EXISTS pgcrypto;
  CREATE EXTENSION IF NOT EXISTS vector;
  CREATE EXTENSION IF NOT EXISTS postgis;
  CREATE EXTENSION IF NOT EXISTS pg_trgm;
  ```
  (The migration also runs these `CREATE EXTENSION IF NOT EXISTS` — belt + suspenders.)

### 2. Provision Vercel Blob

- Vercel dashboard → project `remix-admin` → Storage → Create Blob store
- Name: `remix-municipal-assets`
- Grab the read/write token

### 3. Add env vars to Vercel

- `NEON_DATABASE_URL` = pooled Neon connection string
- `BLOB_READ_WRITE_TOKEN` = from step 2
- `OPENAI_API_KEY` = existing key OK (used in M1½ + M2, not M1)

Also add the same three to your local `.env.local` if you want to run migrations from your machine.

### 4. Run migrations

From `~/Projects/remix/remix-admin`:

```bash
npm install
NEON_DATABASE_URL=postgres://... node scripts/municipal/migrate.mjs
```

Expected output:
```
→ 0001_init.sql
✓ 0001_init.sql applied

All migrations applied.
```

### 5. Verify DB health

Local dev server:
```bash
npm run dev
```

Log into `/admin/`, then hit:
- `GET http://localhost:3000/admin/api/municipal/health`

Expected response:
```json
{
  "ok": true,
  "version": "16.x",
  "extensions": ["vector", "postgis", "pgcrypto", "pg_trgm"]
}
```

### 6. Run the M1 proof ingest

While logged in:
- `GET http://localhost:3000/admin/api/municipal/ingest-one?muni=nc`
- `GET http://localhost:3000/admin/api/municipal/ingest-one?muni=rockland`

Each should return an `ok: true` report with `discovered ≥ 1`, `upserted ≥ 1`, and either `assetsFetched ≥ 1` and `textExtracted ≥ 1` (for a meeting whose agenda PDF was reachable) or a documented `errors` list explaining why not.

### 7. Verify data in Neon

In Neon SQL editor:

```sql
SELECT m.name, b.display_name AS body, mt.scheduled_at, mt.title
FROM meeting mt
JOIN body b ON b.id = mt.body_id
JOIN municipality m ON m.id = mt.municipality_id
ORDER BY mt.scheduled_at DESC
LIMIT 10;

SELECT b.display_name, count(mt.id) AS meetings, count(t.id) AS text_rows
FROM body b
LEFT JOIN meeting mt ON mt.body_id = b.id
LEFT JOIN meeting_text t ON t.meeting_id = mt.id
GROUP BY b.display_name
ORDER BY meetings DESC;
```

If both queries return rows, M1 is green.

## What's in this branch

```
scripts/municipal/
  migrate.mjs                          # migration runner
  migrations/
    0001_init.sql                      # full schema (M1 tables + M2/M3/M4 tables)

lib/municipal/
  db.ts                                # Neon client (sql tag + pool)
  registry.ts                          # MunicipalityConfig for NC + Rockland
  blob.ts                              # Vercel Blob asset put
  ingest.ts                            # jurisdiction-agnostic orchestrator

lib/municipal-adapters/
  base.ts                              # interface + politeFetch + robots
  civicplus.ts                         # NC AgendaCenter
  granicus.ts                          # NC video (view_id + clip_id)
  wp-pdf.ts                            # Rockland WP + PDF category scrape
  ecode360.ts                          # code (both jurisdictions)
  index.ts                             # adapter registry

app/admin/api/municipal/
  ingest-one/route.ts                  # M1 proof endpoint
  health/route.ts                      # DB health probe
```

## What's NOT in M1

Per plan: no transcription (M1½), no sentiment/topic (M2), no dashboard UI (M3), no alerts (M4). This branch ships the schema + adapters + one-shot proof endpoint only.

## Known caveats to test on day one

- **CivicPlus category IDs are guessed** in `registry.ts` (Town Board=8, Planning=9, ZBA=10, ARB=11, Conservation=12). Real IDs need verification via the AgendaCenter root page. If discovery for a body returns zero rows, the ID is wrong — fix in `registry.ts` and re-run.
- **Rockland PDF date parser** is heuristic. Some filenames will fail to parse and land with a placeholder date derived from the WP upload folder (which is *not* the meeting date). Flag those for human review in M2's UI queue.
- **Granicus view_id** for NC is `2` (Town Board + everything). Confirmed via the ViewPublisher URL seen in search results.
- **No MP4 download** in M1 — video URL is recorded on `meeting_asset.source_url` but the file isn't fetched. That happens in M1½ when transcription needs it.

## Cost so far

$0. No LLM calls in M1. Neon free tier + Vercel Blob free tier + Vercel Function invocations are within existing budgets.
