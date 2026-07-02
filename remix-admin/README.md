# Remix Admin (`remixcre.com/admin`)

A standalone Next.js admin app — its own email/password login, completely
separate from the Circular investment portal. Served under `/admin` (basePath)
so it can be proxied from the marketing site.

Routes (all under `/admin`):

- `/admin/login`, `/admin/forgot-password`, `/admin/reset` — auth
- `/admin` — Opportunities dashboard (NYS Contract Reporter)
- `/admin/atlas` — the Cesium 3D map, behind login

Auth: email + bcrypt-hashed passwords in Upstash Redis, `jose` JWT session
cookie (`remix_admin_session`), per-page server-side guards. Password reset via
Resend email with a 1-hour token.

---

## Deploy (one-time)

### 1. Create the Vercel project

- New Vercel project from the `stef73210123/remix` repo.
- **Root Directory: `remix-admin`** (important — this is a subfolder app).
- Framework preset: Next.js.

### 2. Provision services

- **Upstash Redis** (free tier is fine) → copy the REST URL + token.
- **Resend** → API key, and verify a sender/domain for `RESEND_FROM`.

### 3. Set environment variables (Vercel → Project → Settings → Environment Variables)

| Var | Value |
|---|---|
| `ADMIN_JWT_SECRET` | long random string (`openssl rand -base64 48`) |
| `UPSTASH_REDIS_REST_URL` | from Upstash |
| `UPSTASH_REDIS_REST_TOKEN` | from Upstash |
| `RESEND_API_KEY` | from Resend |
| `RESEND_FROM` | e.g. `Remix Admin <admin@remixcre.com>` |
| `ADMIN_PUBLIC_URL` | `https://remixcre.com` |

### 4. Seed the first admin user

From the `remix-admin/` folder locally (uses the same Upstash creds):

```bash
npm install
UPSTASH_REDIS_REST_URL=... UPSTASH_REDIS_REST_TOKEN=... \
ADMIN_SEED_EMAIL=you@remixcre.com ADMIN_SEED_NAME="Stefan" \
ADMIN_SEED_PASSWORD='choose-a-strong-password' \
npm run seed-admin
```

You set your own password; it is hashed before storage. Remove the
`ADMIN_SEED_*` values after running.

### 5. Point `remixcre.com/admin` at this app

In the **marketing** project's `vercel.json`, add a rewrite so the base domain
proxies `/admin` to this app. Replace `REMIX_ADMIN_DEPLOYMENT` with this app's
Vercel URL (e.g. `remix-admin.vercel.app`):

```json
{
  "rewrites": [
    { "source": "/admin", "destination": "https://REMIX_ADMIN_DEPLOYMENT/admin" },
    { "source": "/admin/:path*", "destination": "https://REMIX_ADMIN_DEPLOYMENT/admin/:path*" }
  ]
}
```

(Keep the existing `/book` and `/blog` rewrites; just add these.) Because the
browser stays on `remixcre.com`, the session cookie attaches to the base
domain and login works through the proxy.

### 6. Verify

- `https://remixcre.com/admin` → redirects to `/admin/login`
- Sign in → dashboard; **Open Atlas** → `/admin/atlas`
- Forgot password → reset email → set new password

---

## Local dev

```bash
cd remix-admin
npm install
cp .env.example .env   # fill in values
npm run dev            # http://localhost:3000/admin
```
