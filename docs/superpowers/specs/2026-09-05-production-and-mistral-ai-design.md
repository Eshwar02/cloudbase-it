# Production + Mistral AI — Design Spec

**Date:** 2026-09-05
**Status:** Approved
**Scope:** Take Cloudbase from a feature-complete MVP to production, add two Mistral-powered
AI features (semantic search, AI organize suggestions), and deploy live.

## 1. Context

The MVP described in the project PDF is feature-complete except Google OAuth (deliberately
skipped). This spec covers four tracks: production hardening, AI features, deployment
artifacts, and going live. No new *MVP* feature work.

Decisions made with the user:
- AI features: **semantic search** + **AI organize suggestions** (not RAG chat, not auto-tag).
- AI provider: **Mistral** (`mistral-embed` for embeddings, `mistral-large-latest` for chat).
- AI key optional: features **degrade gracefully** when `MISTRAL_API_KEY` is unset.
- OAuth: **skipped**.
- Deployment: backend **Render**, frontend **Vercel**, DB/storage existing **Supabase**.
- Deploy **live together** in-session.

## 2. AI service (`app/services/ai.py`)

A thin wrapper around the Mistral REST API using `httpx`. No new heavy SDK dependency.

Interface:
- `ai_enabled() -> bool` — true iff `MISTRAL_API_KEY` is set.
- `embed(texts: list[str]) -> list[list[float]]` — calls `POST /v1/embeddings`
  (`model=mistral-embed`), returns 1024-dim vectors. Raises `AIUnavailable` if disabled.
- `chat_json(system: str, user: str) -> dict` — calls `POST /v1/chat/completions`
  (`model=mistral-large-latest`, `response_format={"type":"json_object"}`), parses and
  returns the JSON object. Raises `AIUnavailable` if disabled; raises `AIError` on
  malformed output.

Config additions (`app/core/config.py`): `mistral_api_key: str | None = None`,
`mistral_base_url: str = "https://api.mistral.ai"`, `cors_origins: str = ""`,
`cookie_secure: bool = False`, `cookie_samesite: str = "lax"`.

**Testability:** every test monkeypatches `httpx`/the service functions; no network, no key
in CI. `ai_enabled()` returns false in tests, exercising fallback paths.

## 3. Semantic search

**Storage.** New migration `0002_ai.sql` (Postgres only):
- `create extension if not exists vector;`
- `alter table files add column if not exists embedding vector(1024);`
- `alter table files add column if not exists ai_summary text;`
- IVFFlat index on `embedding` for cosine.

The pgvector column is **not** added to the SQLModel `File` model (SQLite in tests can't
represent it). Embeddings are written/read via a small raw-SQL helper
(`app/services/semantic.py`) that no-ops on non-Postgres engines.

**Write path.** In `complete-upload`, after a file becomes `ready`, if `ai_enabled()`:
build text = `filename + mime + snippet` (snippet only for text/PDF; others use name+mime),
`embed([text])`, store vector + optional summary. Failures are swallowed (upload still
succeeds). A `POST /search/backfill-embeddings` endpoint embeds existing ready files.

**Read path.** `GET /search/semantic?q=...`:
- If `ai_enabled()` and Postgres: `embed([q])`, then owner-scoped raw SQL
  `... order by embedding <=> :qvec limit 20`, skipping null embeddings.
- Else: **fall back** to the existing keyword search (identical response shape).

Response shape matches existing `/search`: list of `{id, type, name, mime_type?}`.

## 4. AI organize suggestions

- `POST /ai/organize/{folder_id}` (min role viewer): gather child folders/files
  (names + mime). Send to `chat_json` with a system prompt instructing it to return
  `{"groups":[{"name": str, "file_ids":[...], "folder_ids":[...]}]}`. Validate with a
  Pydantic schema (`OrganizeProposal`). Read-only — no mutations. Returns `503
  {"detail":"ai_unavailable"}` when disabled.
- `POST /ai/organize/{folder_id}/apply` (min role editor): body is a user-approved
  `OrganizeProposal`. For each group: create a subfolder under `folder_id`, then move the
  listed items into it — reusing the existing move + cycle-detection paths and RBAC
  (`require_role`). Only items actually owned/editable and currently under `folder_id` are
  moved; unknown ids are ignored. Returns the created folders + move count.

New file `app/routes/ai.py`; schemas in `app/schemas/ai.py`.

## 5. Production hardening

- **CORS**: add `CORSMiddleware` in `main.py`, origins from `settings.cors_origins`
  (comma-split), `allow_credentials=True`.
- **Cookies**: auth route sets `secure`/`samesite` from settings (dev defaults keep current
  behavior; prod sets `secure=True, samesite="none"`).
- **Frontend**: `VITE_API_URL` env drives the axios base URL (default keeps dev value).
- **Logging**: minimal request logging middleware; keep `/health`.
- Update `.env.example` (backend) and add `frontend/.env.example`.

## 6. Deployment artifacts

- `backend/Dockerfile` (python:3.12-slim, uvicorn), `backend/.dockerignore`.
- `render.yaml` at repo root (backend web service, env var placeholders).
- `frontend/vercel.json` (SPA rewrite) + build config; `VITE_API_URL` documented.
- `.github/workflows/ci.yml`: job 1 backend `pytest`, job 2 frontend `npm ci && npm test`.

## 7. Going live (with user)

1. Apply `0002_ai.sql` to Supabase (via Supabase MCP `apply_migration`, on user ok).
2. Push repo to GitHub (user provides/confirms remote).
3. Render: create web service from repo, set env (`DATABASE_URL`, `SUPABASE_*`,
   `JWT_SECRET`, `CORS_ORIGINS`, optional `MISTRAL_API_KEY`, cookie flags).
4. Vercel: import frontend, set `VITE_API_URL` to Render URL, deploy.
5. Set backend `CORS_ORIGINS` to the Vercel URL; redeploy.
6. Smoke test: register → upload → search → organize on the live URLs.

## 8. Testing strategy

TDD for all new backend code (pytest, Mistral mocked): `ai.py` (enabled/disabled/malformed),
semantic route (fallback + enabled-with-mock-rank), organize propose (disabled 503, happy
path with mocked chat) and apply (creates folders + moves, ignores unknown ids, RBAC).
Frontend: vitest for the semantic toggle and the Organize modal (MSW-mocked endpoints).

## 9. Out of scope

Google OAuth, RAG chat, auto-tagging, version-history UI, activity-log UI, quota UI.
These remain in the backlog.
