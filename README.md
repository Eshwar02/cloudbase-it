<div align="center">

# ☁️ Cloudbase

**A production-grade, Google Drive–style cloud storage & sharing platform.**

Upload, organize, search, star, and share files securely with role-based access —
built on a **Python (FastAPI)** backend and a **React + TypeScript** frontend,
backed by **Supabase** (Postgres + Object Storage).

[Features](#-features) · [Architecture](#-architecture) · [Quickstart](#-quickstart) · [API](#-api-reference) · [Testing](#-testing) · [Benchmarks](#-benchmarks--load-testing) · [Deployment](#-deployment) · [Roadmap](#-roadmap)

</div>

---

## ✨ Features

| Domain | Capabilities |
|--------|--------------|
| **Authentication** | Email + password (bcrypt), JWT access/refresh tokens in **HttpOnly cookies**, silent token refresh |
| **Folders** | Nested CRUD, breadcrumb trails, move with server-side **cycle detection** |
| **Files** | Direct-to-storage **signed-URL** upload lifecycle (init → upload → complete), download, rename, move, drag-and-drop with progress |
| **Sharing** | User-to-user grants (**Viewer / Editor**) by email, list & revoke, "Shared with me" view |
| **Public links** | Shareable tokens with **optional password** and **expiry**, anonymous access page |
| **Starred** | Star/unstar files & folders, dedicated Starred view |
| **Search** | Owner-scoped, case-insensitive, filter by name / type |
| **Trash** | Soft delete, restore, permanent purge with storage cleanup |
| **Security** | Server-side RBAC on every resource, signed URLs, Pydantic validation, **SlowAPI rate limiting** |

All permission checks are enforced **server-side** — the client never gates access.

---

## 🏗 Architecture

```
        ┌────────────────────┐         ┌────────────────────────┐
        │   React + Vite SPA │  HTTPS  │     FastAPI Backend     │
        │  TanStack Query    │ ──────► │  routes → services →    │
        │  Tailwind, Axios   │ cookies │  SQLModel ORM           │
        └────────────────────┘         └───────────┬────────────┘
                                                    │
                             ┌──────────────────────┴───────────────────────┐
                             ▼                                               ▼
                   ┌───────────────────┐                        ┌──────────────────────────┐
                   │ Supabase Postgres │                        │  Supabase Object Storage  │
                   │  (metadata / RBAC)│                        │  (signed upload/download) │
                   └───────────────────┘                        └──────────────────────────┘
```

**Data model:** `users`, `folders`, `files`, `file_versions`, `shares`, `link_shares`, `stars`, `activities`.

### Tech stack

| Layer | Backend | Frontend |
|-------|---------|----------|
| Framework | FastAPI | React 18 + Vite |
| Language | Python 3.12+ | TypeScript |
| Data | SQLModel / SQLAlchemy · Supabase Postgres | TanStack Query (server cache) |
| Auth | python-jose (JWT) · passlib/bcrypt | HttpOnly cookies + Axios refresh interceptor |
| Validation | Pydantic v2 | — |
| Styling | — | Tailwind CSS · Framer Motion |
| Rate limiting | SlowAPI | — |
| Tests | pytest · pytest-benchmark · Locust | Vitest · Testing Library · MSW |

---

## 📁 Repository layout

```
cloudbase-it/
├── backend/                 FastAPI application
│   ├── app/
│   │   ├── core/            config, db session, security, deps, ratelimit
│   │   ├── models/          SQLModel tables
│   │   ├── schemas/         Pydantic request/response models
│   │   ├── routes/          auth, folders, files, trash, search, shares, links, stars
│   │   └── services/        permissions (RBAC), storage (signed URLs)
│   ├── tests/               pytest suite (46 tests)
│   ├── benchmarks/          pytest-benchmark micro-benchmarks + Locust load test
│   └── requirements.txt
├── frontend/                React + Vite SPA
│   └── src/
│       ├── api/             typed API modules
│       ├── components/      ui primitives, layout, file grid, modals
│       ├── hooks/           useAuth, useDrive, useFolder, useShared, useStarred, …
│       ├── pages/           dashboard, login/register, shared, starred, trash, public
│       └── test/            MSW handlers + server harness
└── docs/                    design specs and implementation plans
```

---

## 🚀 Quickstart

### Prerequisites
- Python 3.12+, Node 18+
- A [Supabase](https://supabase.com) project (Postgres + a Storage bucket named `user-files`)

### 1. Backend

```bash
cd backend
python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # fill in DATABASE_URL, SUPABASE_URL, SUPABASE_SERVICE_KEY, JWT_SECRET
uvicorn app.main:app --reload # http://localhost:8000  (docs at /docs)
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev                   # http://localhost:5173  (proxies /api → :8000)
```

### Environment (`backend/.env`)

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Supabase Postgres connection string |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Service-role key (server-side only) |
| `JWT_SECRET` | Long random string for signing tokens |
| `JWT_ACCESS_TTL_MIN` | Access token lifetime (default 15) |
| `JWT_REFRESH_TTL_DAYS` | Refresh token lifetime (default 7) |
| `STORAGE_BUCKET` | Storage bucket name (default `user-files`) |

---

## 📡 API reference

Base path served by FastAPI (interactive docs at `/docs`).

### Auth
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/auth/register` | Create account _(rate-limited)_ |
| `POST` | `/auth/login` | Log in, set cookies _(rate-limited)_ |
| `POST` | `/auth/refresh` | Rotate access token |
| `POST` | `/auth/logout` | Clear cookies |
| `GET`  | `/auth/me` | Current user |

### Files & folders
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/files/init-upload` | Reserve file, return signed upload URL _(rate-limited)_ |
| `POST` | `/files/complete-upload` | Finalize after client PUT |
| `GET` / `PATCH` / `DELETE` | `/files/{id}` | Read / rename+move / soft-delete |
| `GET` | `/files/{id}/download` | Signed download URL |
| `POST` | `/folders` | Create folder |
| `GET` / `PATCH` / `DELETE` | `/folders/{id}` | Read / rename+move / soft-delete |
| `GET` | `/folders/{id}/breadcrumb` | Ancestor trail |
| `GET` | `/drive` | Root listing |

### Sharing, links & stars
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/shares` | Grant viewer/editor to a user by email (owner only) |
| `GET` | `/shares?file_id=` / `?folder_id=` | List grants on a resource |
| `GET` | `/shares/shared-with-me` | Resources shared with me |
| `DELETE` | `/shares/{id}` | Revoke a grant |
| `POST` | `/public-link` | Mint a public link (optional password + expiry) |
| `DELETE` | `/public-link/{id}` | Revoke a public link |
| `GET` | `/public/{token}` | **Anonymous** access (metadata + signed download) |
| `POST` / `DELETE` | `/stars` | Star / unstar a file or folder |
| `GET` | `/stars` | List starred items |

### Search & trash
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/search?q=&type=` | Search by name / type |
| `GET` | `/trash` | List trashed items |
| `POST` | `/trash/{type}/{id}/restore` | Restore |
| `DELETE` | `/trash/{type}/{id}` | Purge permanently |

---

## 🧪 Testing

```bash
# Backend — 46 tests (unit + integration, incl. IDOR/permission and edge cases)
cd backend && . .venv/bin/activate && pytest -v

# Frontend — 24 tests (Vitest + Testing Library, API mocked with MSW)
cd frontend && npm run test
```

The frontend build doubles as a type check: `npm run build` runs `tsc -b` then `vite build`.

---

## 📊 Benchmarks & load testing

### Micro-benchmarks (`pytest-benchmark`)

Run against an isolated in-memory SQLite dataset (500 folders + 500 files) so
numbers reflect application cost, not network latency:

```bash
cd backend && . .venv/bin/activate
pytest benchmarks/ --benchmark-only
```

Representative medians (developer laptop; **indicative, not a hardware spec**):

| Operation | Median | Notes |
|-----------|--------|-------|
| `effective_role` (owner fast-path) | ~0.3 µs | in-process, no query |
| JWT create / decode | ~11 µs / ~17 µs | HS256 |
| `effective_role` (shared grant lookup) | ~0.12 ms | one indexed query |
| Search over 1,000 rows | ~1.1 ms | `ILIKE` name match |
| Drive listing (1,000 rows) | ~6.5 ms | includes ORM hydration |
| **bcrypt hash / verify** | **~185 ms** | intentionally slow — dominates auth cost |

> The bcrypt cost is why `/auth/*` is rate-limited: password endpoints are
> deliberately expensive to resist brute force.

### Load / stress test (`Locust`)

```bash
# Start the API, then:
locust -f benchmarks/locustfile.py --host http://localhost:8000 --headless -u 50 -r 5 -t 1m
# or open the web UI:
locust -f benchmarks/locustfile.py --host http://localhost:8000
```

Smoke run (8 concurrent users, SQLite-backed local server, **0% failures**):

| Endpoint | p50 | p95 |
|----------|-----|-----|
| `GET /drive` | 5 ms | 10 ms |
| `GET /search` | 7 ms | 11 ms |
| `GET /stars` | 4 ms | 8 ms |
| `POST /folders` | 9 ms | 14 ms |
| `POST /auth/login` | 190 ms | 190 ms _(bcrypt-bound)_ |

**Acceptance targets:** p95 < 300 ms (reads) / < 500 ms (writes), 0% failures below ~50 concurrent users on a single small instance.

---

## 🔒 Security

- JWTs stored in **HttpOnly, SameSite** cookies (not `localStorage`) — mitigates XSS token theft
- **Server-side RBAC** (`owner` > `editor` > `viewer`) enforced on every resource access
- **Signed URLs** for all storage I/O — the API never proxies file bytes
- **Pydantic** request validation on every endpoint
- **SlowAPI** per-IP rate limiting on auth and upload
- Public links support **password hashing** (bcrypt) and **expiry**
- Timing-equalized login to avoid user-enumeration via response time

---

## ☁️ Deployment

| Component | Target |
|-----------|--------|
| Frontend | Vercel / Netlify (`npm run build` → `dist/`) |
| Backend | Render / Fly.io / Railway (`uvicorn app.main:app`) |
| Database & storage | Supabase (managed Postgres + Storage) |

Set the backend environment variables in your host's dashboard and point the
frontend's `/api` proxy (or `VITE` base URL) at the deployed backend.

---

## 🗺 Roadmap

- [ ] **Google OAuth** sign-in _(scaffolding pending external Google Cloud credentials)_
- [ ] File version history UI (backend `file_versions` table already present)
- [ ] Image / PDF previews
- [ ] Activity log surface (backend `activities` table already present)
- [ ] Tags & labels, storage-quota dashboard

---

<div align="center">
Built as a full-stack MVP — FastAPI + React + Supabase.
</div>
