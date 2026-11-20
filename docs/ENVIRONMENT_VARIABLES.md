# VYOMABOARD — ENVIRONMENT VARIABLES REFERENCE

## 1. Frontend Environment Variables (`.env.production` / `.env.local`)

| Variable | Description | Example / Default | Required |
| :--- | :--- | :--- | :--- |
| `VITE_BACKEND_URL` | Base HTTP URL for the Node.js API Gateway | `https://api.vyomaboard.com` | Yes |
| `VITE_WS_URL` | Base WebSocket URL for Yjs and real-time comms | `wss://api.vyomaboard.com` | Yes |
| `VITE_SUPABASE_URL` | Supabase Project API URL | `https://xyzcompany.supabase.co` | Yes |
| `VITE_SUPABASE_ANON_KEY` | Supabase Public Anonymous Key (RLS protected) | `eyJhbGciOiJIUzI1NiIsIn...` | Yes |
| `VITE_AUTH_MODE` | Default auth fallback mode (`school` or `standard`) | `standard` | No |
| `VITE_CF_TURNSTILE_SITE_KEY` | Cloudflare Turnstile public site key for bot defense | `0x4AAAAAA...` | No |

---

## 2. Backend Environment Variables (`backend/.env`)

| Variable | Description | Security Level | Example / Default | Required |
| :--- | :--- | :--- | :--- | :--- |
| `PORT` | Listening port for Express & WebSocket server | Low | `3002` | Yes |
| `NODE_ENV` | Application environment (`development`, `production`)| Low | `production` | Yes |
| `DATABASE_URL` | PostgreSQL connection string (Supabase PgBouncer) | **CRITICAL SECRET** | `postgresql://postgres.xyz:[PASS]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true` | Yes |
| `DIRECT_URL` | Direct PostgreSQL connection string (for migrations) | **CRITICAL SECRET** | `postgresql://postgres.xyz:[PASS]@aws-0-us-east-1.pooler.supabase.com:5432/postgres` | Yes |
| `SUPABASE_URL` | Supabase Project API URL | Low | `https://xyzcompany.supabase.co` | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Privileged admin key (Bypasses RLS on server) | **CRITICAL SECRET** | `eyJhbGciOiJIUzI1NiIsIn...` | Yes |
| `SUPABASE_JWT_SECRET` | Secret used to verify client Supabase Auth JWTs | **CRITICAL SECRET** | `super-secure-32-char-jwt-secret` | Yes |
| `CORS_ORIGINS` | Comma-separated list of allowed frontend origins | Medium | `https://app.vyomaboard.com,https://vyomaboard.com` | Yes |
| `R2_ACCOUNT_ID` | Cloudflare Account ID for R2 storage | Medium | `a1b2c3d4e5f6...` | Yes |
| `R2_ACCESS_KEY_ID` | Cloudflare R2 S3 API Access Key ID | **CRITICAL SECRET** | `1a2b3c4d5e...` | Yes |
| `R2_SECRET_ACCESS_KEY` | Cloudflare R2 S3 API Secret Access Key | **CRITICAL SECRET** | `f0e1d2c3b4a5...` | Yes |
| `R2_BUCKET_NAME` | Cloudflare R2 private bucket name | Low | `vyomaboard-assets` | Yes |
| `LIVEKIT_API_KEY` | LiveKit SFU API Key for classroom media tokens | **CRITICAL SECRET** | `APIxyz123...` | Optional (if using LiveKit) |
| `LIVEKIT_API_SECRET` | LiveKit SFU API Secret | **CRITICAL SECRET** | `SECRETabc789...` | Optional (if using LiveKit) |
| `SENTRY_DSN` | Sentry Error Reporting DSN | Medium | `https://abc@o123.ingest.sentry.io/456` | Optional |

---

## 3. Strict Security Rules for Environment Variables
1. **Never commit `.env` or `.env.production` to Git**.
2. **Never prefix secret backend tokens with `VITE_`**. Vite embeds any variable starting with `VITE_` directly into the public JavaScript bundle.
3. **Automate pre-flight check**: The backend must fail to start if `DATABASE_URL`, `SUPABASE_JWT_SECRET`, or `SUPABASE_SERVICE_ROLE_KEY` is missing or contains default template strings.
