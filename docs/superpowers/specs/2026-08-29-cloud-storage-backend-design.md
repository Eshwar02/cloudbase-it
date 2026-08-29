# Cloud Storage Service — Phase 1 Backend Design

Date: 2026-08-29
Status: Approved-pending-review
Scope: Backend foundation (MVP core). Frontend is a later phase.

## 1. Goal

Production-grade MVP backend for a Google-Drive-like file storage & sharing
service. Users upload, organize (folders), search, soft-delete/restore, and
(foundation for) share files with server-side permission enforcement.

Derived from `Cloud Based Storage Service – Detailed Project Specification
(Python + React).pdf`, adapted to the decisions below.

## 2. Locked Decisions

| Area | Choice |
|------|--------|
| Backend | Python FastAPI |
| ORM / runtime DB access | SQLModel (SQLAlchemy) direct to Supabase Postgres |
| Schema / migrations | Supabase MCP `apply_migration` owns the schema; SQLModel models mirror it |
| Database | Supabase Postgres (project `maqrttlzwcnjipnjrdgh`) |
| Object storage | Supabase Storage (signed URLs) |
| Auth | Email + password (bcrypt) + JWT access/refresh in HttpOnly cookies. No OAuth in Phase 1 |
| Validation | Pydantic |
| Tests | pytest |
| Frontend | React + Vite (later phase) |

## 3. Phase 1 Feature Scope

In scope (backend only):
- Auth: register, login, refresh, logout, `GET /me`
- Folders: create, rename, move, delete (soft), list children, breadcrumb
- Files: init-upload → signed URL → complete-upload, download (signed URL),
  rename, move, soft-delete
- Trash: list, restore, permanent delete
- Search: by name and type, scoped to owner
- Permissions: server-side owner/editor/viewer checks (enforcement layer)

Foundation only (endpoints land Phase 2, but tables + checks exist now):
- Shares (per-user), public link shares, stars, activity log, file versions

Out of scope (non-goals): real-time co-editing, desktop sync, office editors,
version-history UI.

## 4. Architecture

```
[ React Client (later) ]
          |  HTTPS (JSON, HttpOnly cookie)
          v
[ FastAPI Backend ]
   - routers: auth, folders, files, trash, search
   - services: auth, storage (Supabase signed URLs), permissions
   - SQLModel session -> Supabase Postgres
          |                          \
          v                           v
[ Supabase Postgres ]        [ Supabase Storage bucket: user-files ]
```

Requests authenticate via JWT access token in an HttpOnly cookie. A dependency
resolves the current user; permission service authorizes each resource action
server-side. File bytes never proxy through the backend — clients PUT/GET
directly to Supabase Storage using short-lived signed URLs the backend mints.

## 5. Data Model

Schema applied via Supabase MCP migrations; SQLModel classes mirror each table.

- `users` — id (uuid pk), email (unique), password_hash, display_name,
  storage_used_bytes, storage_quota_bytes, created_at
- `folders` — id, owner_id fk users, parent_id fk folders (nullable), name,
  is_trashed, trashed_at, created_at, updated_at
- `files` — id, owner_id, folder_id fk folders (nullable = root), name,
  storage_key, mime_type, size_bytes, status (pending|ready),
  current_version_id, is_trashed, trashed_at, created_at, updated_at
- `file_versions` — id, file_id fk, storage_key, size_bytes, mime_type,
  created_at (Phase 2 surfaced; table exists now)
- `shares` — id, file_id/folder_id, grantee_user_id, role (viewer|editor),
  created_by, created_at
- `link_shares` — id, file_id/folder_id, token (unique), role, password_hash
  (nullable), expires_at (nullable), created_by, created_at
- `stars` — id, user_id, file_id/folder_id, created_at
- `activities` — id, actor_id, target_type, target_id, action, created_at

Indexes: `files(owner_id, folder_id, is_trashed)`, `folders(owner_id,
parent_id, is_trashed)`, `link_shares(token)`, `shares(grantee_user_id)`.

## 6. API (Phase 1)

Auth
- `POST /auth/register` — email, password, display_name → user
- `POST /auth/login` — sets access+refresh HttpOnly cookies
- `POST /auth/refresh` — rotates access cookie
- `POST /auth/logout` — clears cookies
- `GET  /auth/me` — current user

Folders
- `POST /folders` — {name, parent_id}
- `GET  /folders/{id}` — folder + children (folders+files)
- `GET  /folders/{id}/breadcrumb`
- `PATCH /folders/{id}` — rename / move (parent_id)
- `DELETE /folders/{id}` — soft delete (cascade mark)

Files
- `POST /files/init-upload` — {name, folder_id, mime_type, size_bytes} →
  {file_id, upload_url} (row status=pending)
- `POST /files/complete-upload` — {file_id} → validates object, status=ready,
  writes file_versions row, updates storage_used_bytes
- `GET  /files/{id}` — metadata
- `GET  /files/{id}/download` — short-lived signed download URL
- `PATCH /files/{id}` — rename / move
- `DELETE /files/{id}` — soft delete

Trash
- `GET  /trash` — trashed files + folders for owner
- `POST /trash/{type}/{id}/restore`
- `DELETE /trash/{type}/{id}` — permanent delete (also deletes storage object)

Search
- `GET /search?q=&type=` — owner-scoped name/type search

## 7. Upload Flow (signed URL, direct-to-storage)

1. Client `POST /files/init-upload`. Backend checks quota, creates `files` row
   (status=pending, storage_key=`{owner_id}/{file_id}/{name}`), mints a signed
   upload URL for that key, returns both.
2. Client `PUT` bytes directly to Supabase Storage via the signed URL.
3. Client `POST /files/complete-upload`. Backend confirms the object exists,
   sets status=ready, records size/mime, creates `file_versions` row, increments
   `users.storage_used_bytes`, writes an `activities` row.

Pending rows with no completed upload are eligible for cleanup (Phase 2 job).

## 8. Permissions

Central `permissions` service. Every resource action resolves an effective role
for (user, resource): owner (row.owner_id) > editor/viewer (from `shares`) >
none. Read requires viewer+, mutate requires editor+, destructive/share requires
owner. Enforced in a FastAPI dependency; never trust client-supplied role. Link
shares resolve an anonymous principal with the link's role (Phase 2 endpoints).

## 9. Error Handling

- Pydantic validation → 422 with field detail.
- Auth failures → 401; permission failures → 403; missing → 404.
- Quota exceeded → 413. Storage/signed-URL failures → 502 with safe message.
- All mutations idempotent where practical; complete-upload safe to retry.

## 10. Testing

pytest per router against a test schema (separate Supabase schema or local psql
test DB). Cover: auth happy/failure paths, folder nesting + breadcrumb, upload
init/complete lifecycle, soft-delete/restore, permission matrix (owner vs
viewer vs stranger), search scoping. Storage calls mocked in unit tests; one
integration test hits a real signed-URL round-trip.

## 11. Project Structure

```
backend/
  app/
    main.py
    core/        config, security (jwt, hashing), db session
    models/      SQLModel tables
    schemas/     Pydantic request/response
    routes/      auth, folders, files, trash, search
    services/    auth, storage, permissions
    utils/
  migrations/    SQL applied via Supabase MCP (kept in repo for record)
  tests/
  requirements.txt
  .env.example
```

## 12. Build Order

1. Project scaffold + config + DB session + health route
2. Supabase MCP migration: create all tables + indexes
3. SQLModel models mirroring the schema
4. Auth (hashing, JWT, cookies, register/login/refresh/me) + tests
5. Folders CRUD + breadcrumb + tests
6. Storage service + files init/complete/download + tests
7. File rename/move/soft-delete + Trash restore/purge + tests
8. Search + permission service wiring + tests
9. Full pytest pass + README

## 13. Open Items

- Supabase MCP auth must be completed (`/mcp`) before migrations can run.
- Storage bucket `user-files` created (private) during step 2.
- Exact JWT TTLs: access 15m, refresh 7d (adjustable in config).
