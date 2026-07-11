# Deploying OpenNorthCastle (opennorthcastle.com)

OpenNorthCastle is the **same `remix-admin` codebase**, deployed a second time as
its own Vercel project with one env var flipped. It shares every commit with the
paywalled Remix build — there is no separate branch to maintain. The flavor is
selected entirely by `NEXT_PUBLIC_APP_FLAVOR`.

What the flavor changes (see `lib/flavor.ts`):
- **Skin**: light "Civic Signal" theme (`app/opennorthcastle.css`) — navy/azure,
  IBM Plex Sans + Newsreader, white cards on slate. The dark Remix theme is
  untouched.
- **No paywall**: the municipal **read** pages/APIs are public (see
  `authorizeMunicipalRead`). Mutation endpoints (ingest, purge, officials-refresh)
  stay auth-protected on both builds.
- **Branding**: OpenNorthCastle wordmark, no admin nav / "signed in as" chrome,
  root `/` lands on the dashboard.

## One-time setup (needs your Vercel account + domain DNS)

1. **Create a new Vercel project** from the same Git repo:
   - Import `stef73210123/remix`.
   - **Root Directory**: `remix-admin` (same as the Remix admin project).
   - Framework preset: Next.js (auto-detected).
   - Name it e.g. `opennorthcastle`.

2. **Environment variables** (Project → Settings → Environment Variables, all
   environments):
   - `NEXT_PUBLIC_APP_FLAVOR = opennorthcastle`  ← the only required one.
   - `NEON_DATABASE_URL = <your Neon URL>` — powers the meetings timeline and the
     documents linked on property pages. A read-only/replica URL is ideal since
     this site never writes. Omit it and the app still runs, just without live
     meeting history/documents.
   - `CENSUS_API_KEY = <your key>` — enables live demographics + the trend
     sparklines. Optional (falls back to approximate figures).
   - Do **not** set `CRON_SECRET` / `MUNICIPAL_INGEST_TOKEN` here — the ingest
     pipeline should only run from the Remix project.

3. **Add the domain**: Project → Settings → Domains → add `opennorthcastle.com`
   (and `www.opennorthcastle.com`). Vercel shows the exact DNS records — at your
   registrar, point the apex `A`/`ALIAS` and the `www` `CNAME` at Vercel as
   instructed, then verify.

4. **Deploy** (push to the tracked branch, or "Redeploy"). Visit
   `https://opennorthcastle.com` → it lands on the municipal dashboard, publicly,
   in the OpenNorthCastle skin.

## Notes
- Both projects deploy from the same branch, so every future change ships to both
  automatically — the only difference is the env var.
- The admin surfaces (`/admin`, `/admin/login`) still exist on the domain but are
  auth-gated and unlinked; the public UI never points at them.
- To preview the skin locally: `NEXT_PUBLIC_APP_FLAVOR=opennorthcastle npm run dev`.
