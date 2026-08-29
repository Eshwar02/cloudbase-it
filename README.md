# Cloud Based Storage Service

A Google-Drive-like cloud file storage and sharing service. Phase 1 delivers a
production-grade **Python (FastAPI)** backend: authentication, folders, direct-to-storage
file uploads, trash, and search, backed by **Supabase** (Postgres + Storage).

> Frontend (React + Vite) is a later phase.

## Features (Phase 1 backend)

- **Auth** — email + password (bcrypt), JWT access/refresh in HttpOnly cookies
- **Folders** — nested CRUD, breadcrumb, move with cycle detection
- **Files** — signed-URL upload lifecycle (init → upload → complete), download, rename, move
- **Trash** — soft delete, restore, permanent purge (with storage cleanup)
- **Search** — owner-scoped, case-insensitive, by name/type
- **Permissions** — server-side owner/editor/viewer checks on every resource

## Tech Stack

| Layer | Choice |
|-------|--------|
| API | FastAPI |
| ORM | SQLModel / SQLAlchemy |
| Database | Supabase Postgres |
| Object storage | Supabase Storage (signed URLs) |
| Auth | JWT (python-jose) + passlib/bcrypt |
| Validation | Pydantic v2 |
| Tests | pytest |

## Repository Layout

```
backend/            FastAPI application
  app/
    core/           config, db session, security, deps
    models/         SQLModel tables
    schemas/        Pydantic request/response models
    routes/         auth, folders, files, trash, search
    services/       permissions, storage
  migrations/       SQL schema (source of truth, applied to Supabase)
  tests/            pytest suite
docs/               design spec and implementation plan
```

## Getting Started

```bash
cd backend
python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env        # fill in Supabase DATABASE_URL, service key, JWT secret
uvicorn app.main:app --reload
```

Run the tests:

```bash
cd backend && . .venv/bin/activate && pytest -v
```

See [`backend/README.md`](backend/README.md) for API details and
[`docs/`](docs/) for the design spec and implementation plan.
