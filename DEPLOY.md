# Deploying Cloudbase

Backend → **Render** (Docker), Frontend → **Vercel**, DB + Storage → **Supabase** (existing).

## 0. One-time: apply the AI migration to Supabase
`backend/migrations/0002_ai.sql` enables `pgvector` and adds the `embedding` / `ai_summary`
columns. Run it once against your Supabase database (SQL editor or `psql`). Semantic search
falls back to keyword search until this is applied *and* a Mistral key is set.

> ⚠️ **DATABASE_URL must use the Supabase connection POOLER, not the direct host.**
> The direct host `db.<ref>.supabase.co:5432` is **IPv6-only**; Render (and most
> IPv4 hosts) can't reach it, so every DB request 500s while `/health` still says OK.
> Use the **Session pooler** string from Supabase → **Connect** → *Session pooler*:
> `postgresql://postgres.<ref>:[PASSWORD]@<region>.pooler.supabase.com:5432/postgres`
> (Transaction pooler is port `6543`.) The pooler is IPv4-compatible.

## 1. Backend on Render
1. Push this repo to GitHub.
2. Render → **New → Blueprint** → select the repo. It reads `render.yaml`.
3. Set the secret env vars (dashboard): `DATABASE_URL` (**pooler URL — see warning above**),
   `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `JWT_SECRET`, and (optional) `MISTRAL_API_KEY`.
   Leave `CORS_ORIGINS` empty for now.
4. Deploy. Confirm `https://<service>.onrender.com/health` returns `{"status":"ok"}`.

## 2. Frontend on Vercel
1. Vercel → **Add New → Project** → import the repo, set **Root Directory** to `frontend`.
2. Env var: `VITE_API_URL = https://<your-render-service>.onrender.com`.
3. Deploy. Note the resulting URL, e.g. `https://cloudbase.vercel.app`.

## 3. Wire CORS
Back in Render, set `CORS_ORIGINS = https://cloudbase.vercel.app` (your Vercel URL) and
redeploy. Cookies are already `Secure` + `SameSite=none` in production via `render.yaml`.

## 4. Enable AI (optional, anytime)
Add `MISTRAL_API_KEY` in Render → redeploy. New uploads embed automatically; call
`POST /search/backfill-embeddings` (from the app, while logged in) to embed existing files.

## 5. Smoke test
Register → upload a file → search (toggle ✨ AI) → open a folder → ✨ Organize.

## CI
`.github/workflows/ci.yml` runs backend `pytest` and frontend `npm test && npm run build`
on every push/PR.
