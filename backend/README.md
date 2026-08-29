# Cloud Storage Service — Backend

A FastAPI backend providing cloud file and folder storage with JWT-based authentication.

## Setup

```bash
# 1. Create and activate a virtual environment
python -m venv .venv
source .venv/bin/activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Configure environment
cp .env.example .env
# Edit .env — set DATABASE_URL (Supabase Postgres connection string) and JWT_SECRET
```

## Run

```bash
uvicorn app.main:app --reload
```

The API is available at `http://localhost:8000`. Interactive docs at `/docs`.

## Test

```bash
pytest
```

Tests run against the live Supabase database configured in `.env`. Each test uses unique emails/names so runs are idempotent.

## API Surface

### Authentication — `/auth`

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/register` | Create a new user account |
| POST | `/auth/login` | Log in and receive a session cookie |
| POST | `/auth/logout` | Invalidate session |
| GET | `/auth/me` | Get current user profile |

### Folders — `/folders`

| Method | Path | Description |
|--------|------|-------------|
| POST | `/folders` | Create a folder |
| GET | `/folders` | List folders (owner-scoped, non-trashed) |
| GET | `/folders/{id}` | Get a specific folder |
| PATCH | `/folders/{id}` | Rename a folder |
| DELETE | `/folders/{id}` | Move folder to trash |

### Files — `/files`

| Method | Path | Description |
|--------|------|-------------|
| POST | `/files` | Create a file record (returns upload URL) |
| GET | `/files` | List files (owner-scoped, non-trashed, status=ready) |
| GET | `/files/{id}` | Get a specific file |
| GET | `/files/{id}/download` | Get a signed download URL |
| PATCH | `/files/{id}` | Update file metadata |
| DELETE | `/files/{id}` | Move file to trash |

### Trash — `/trash`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/trash` | List trashed items (folders and files) |
| POST | `/trash/{id}/restore` | Restore an item from trash |
| DELETE | `/trash/{id}` | Permanently delete a trashed item |

### Search — `/search`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/search?q=&type=all` | Search folders and/or files by name |

Query parameters:
- `q` — search string (case-insensitive substring match; default `""` returns all)
- `type` — `all` (default), `file`, or `folder`

Results are scoped to the authenticated user. Trashed items and non-ready files are excluded.

### Health

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Service health check |

## Schema

The Supabase MCP migration in `backend/migrations/` is the source of truth for the database schema. All table definitions are applied via those migration files; the SQLModel classes in `app/models/tables.py` reflect that schema.
