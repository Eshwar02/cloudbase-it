# Cloud Storage Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Phase 1 FastAPI backend for a Google-Drive-like cloud storage service: email/JWT auth, folders, signed-URL file uploads to Supabase Storage, trash, and search — all with server-side ownership enforcement.

**Architecture:** FastAPI app with routers (auth, folders, files, trash, search) backed by SQLModel over Supabase Postgres. Schema is applied to Supabase via MCP migrations; SQLModel classes mirror it. File bytes go directly between client and Supabase Storage via short-lived signed URLs the backend mints — bytes never proxy through FastAPI.

**Tech Stack:** Python 3.11+, FastAPI, SQLModel/SQLAlchemy, psycopg2, Pydantic v2, python-jose (JWT), passlib[bcrypt], supabase-py (Storage only), pytest, httpx.

## Global Constraints

- Python 3.11+.
- All permission checks are server-side. Never trust a client-supplied role or owner id.
- JWT access token TTL 15 min, refresh TTL 7 days. Tokens delivered as HttpOnly, SameSite=Lax cookies (`access_token`, `refresh_token`).
- Passwords hashed with bcrypt via passlib. Never store or log plaintext passwords.
- All DB ids are UUID (`uuid4`).
- Storage bucket name: `user-files` (private). Storage key format: `{owner_id}/{file_id}/{name}`.
- Supabase project ref: `maqrttlzwcnjipnjrdgh`. Requires completed Supabase MCP auth before Task 2.
- Every new dependency is pinned in `backend/requirements.txt`.
- Env config read from `backend/.env`; `.env.example` kept in sync, never commit real secrets.

---

### Task 1: Project scaffold, config, DB session, health route

**Files:**
- Create: `backend/requirements.txt`
- Create: `backend/.env.example`
- Create: `backend/app/__init__.py`
- Create: `backend/app/core/__init__.py`
- Create: `backend/app/core/config.py`
- Create: `backend/app/core/db.py`
- Create: `backend/app/main.py`
- Create: `backend/tests/__init__.py`
- Create: `backend/tests/conftest.py`
- Create: `backend/tests/test_health.py`

**Interfaces:**
- Produces: `Settings` (pydantic-settings) with fields `database_url: str`, `supabase_url: str`, `supabase_service_key: str`, `jwt_secret: str`, `jwt_access_ttl_min: int = 15`, `jwt_refresh_ttl_days: int = 7`, `storage_bucket: str = "user-files"`; singleton `get_settings() -> Settings`.
- Produces: `engine` (SQLModel engine), `get_session() -> Iterator[Session]` FastAPI dependency.
- Produces: `app` (FastAPI instance) exposing `GET /health` → `{"status": "ok"}`.

- [ ] **Step 1: Write requirements.txt**

```
fastapi==0.115.5
uvicorn[standard]==0.32.1
sqlmodel==0.0.22
psycopg2-binary==2.9.10
pydantic==2.10.3
pydantic-settings==2.6.1
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
supabase==2.10.0
python-multipart==0.0.19
pytest==8.3.4
httpx==0.28.1
```

- [ ] **Step 2: Create the virtualenv and install**

Run:
```bash
cd backend && python3 -m venv .venv && . .venv/bin/activate && pip install -r requirements.txt
```
Expected: installs complete without error.

- [ ] **Step 3: Write `.env.example`**

```
DATABASE_URL=postgresql://postgres:PASSWORD@db.maqrttlzwcnjipnjrdgh.supabase.co:5432/postgres
SUPABASE_URL=https://maqrttlzwcnjipnjrdgh.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
JWT_SECRET=change-me-to-a-long-random-string
JWT_ACCESS_TTL_MIN=15
JWT_REFRESH_TTL_DAYS=7
STORAGE_BUCKET=user-files
```

Copy to `backend/.env` and fill real values (get DB password + service key from Supabase dashboard). `.env` is gitignored.

- [ ] **Step 4: Write `app/core/config.py`**

```python
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str
    supabase_url: str
    supabase_service_key: str
    jwt_secret: str
    jwt_access_ttl_min: int = 15
    jwt_refresh_ttl_days: int = 7
    storage_bucket: str = "user-files"


@lru_cache
def get_settings() -> Settings:
    return Settings()
```

- [ ] **Step 5: Write `app/core/db.py`**

```python
from collections.abc import Iterator

from sqlmodel import Session, create_engine

from app.core.config import get_settings

engine = create_engine(get_settings().database_url, pool_pre_ping=True)


def get_session() -> Iterator[Session]:
    with Session(engine) as session:
        yield session
```

- [ ] **Step 6: Write `app/main.py`**

```python
from fastapi import FastAPI

app = FastAPI(title="Cloud Storage Service")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
```

- [ ] **Step 7: Write `tests/conftest.py`**

```python
import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)
```

- [ ] **Step 8: Write the failing test `tests/test_health.py`**

```python
def test_health_ok(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}
```

- [ ] **Step 9: Run test**

Run: `cd backend && . .venv/bin/activate && pytest tests/test_health.py -v`
Expected: PASS.

- [ ] **Step 10: Add `.gitignore` entries and commit**

Ensure `backend/.gitignore` contains `.venv/`, `.env`, `__pycache__/`, `.pytest_cache/`.

```bash
git add backend/requirements.txt backend/.env.example backend/.gitignore backend/app backend/tests
git commit -m "feat: scaffold FastAPI backend with config, db session, health route"
```

---

### Task 2: Apply database schema via Supabase MCP migration

**Files:**
- Create: `backend/migrations/0001_initial_schema.sql` (record of the migration applied via MCP)

**Interfaces:**
- Produces: Supabase Postgres tables `users`, `folders`, `files`, `file_versions`, `shares`, `link_shares`, `stars`, `activities`, plus the private storage bucket `user-files`.

**Precondition:** Supabase MCP must be authenticated (`/mcp` → authenticate supabase, restart). If MCP is unavailable, run the SQL manually via `psql "$DATABASE_URL" -f backend/migrations/0001_initial_schema.sql`.

- [ ] **Step 1: Write the migration SQL to `backend/migrations/0001_initial_schema.sql`**

```sql
create extension if not exists "pgcrypto";

create table users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  password_hash text not null,
  display_name text not null,
  storage_used_bytes bigint not null default 0,
  storage_quota_bytes bigint not null default 5368709120,
  created_at timestamptz not null default now()
);

create table folders (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references users(id) on delete cascade,
  parent_id uuid references folders(id) on delete cascade,
  name text not null,
  is_trashed boolean not null default false,
  trashed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table files (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references users(id) on delete cascade,
  folder_id uuid references folders(id) on delete set null,
  name text not null,
  storage_key text not null,
  mime_type text,
  size_bytes bigint not null default 0,
  status text not null default 'pending',
  current_version_id uuid,
  is_trashed boolean not null default false,
  trashed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table file_versions (
  id uuid primary key default gen_random_uuid(),
  file_id uuid not null references files(id) on delete cascade,
  storage_key text not null,
  size_bytes bigint not null default 0,
  mime_type text,
  created_at timestamptz not null default now()
);

create table shares (
  id uuid primary key default gen_random_uuid(),
  file_id uuid references files(id) on delete cascade,
  folder_id uuid references folders(id) on delete cascade,
  grantee_user_id uuid not null references users(id) on delete cascade,
  role text not null check (role in ('viewer','editor')),
  created_by uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table link_shares (
  id uuid primary key default gen_random_uuid(),
  file_id uuid references files(id) on delete cascade,
  folder_id uuid references folders(id) on delete cascade,
  token text unique not null,
  role text not null check (role in ('viewer','editor')),
  password_hash text,
  expires_at timestamptz,
  created_by uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table stars (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  file_id uuid references files(id) on delete cascade,
  folder_id uuid references folders(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table activities (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references users(id) on delete cascade,
  target_type text not null,
  target_id uuid not null,
  action text not null,
  created_at timestamptz not null default now()
);

create index idx_files_owner_folder on files(owner_id, folder_id, is_trashed);
create index idx_folders_owner_parent on folders(owner_id, parent_id, is_trashed);
create index idx_link_shares_token on link_shares(token);
create index idx_shares_grantee on shares(grantee_user_id);
```

- [ ] **Step 2: Apply via Supabase MCP**

Use the Supabase MCP `apply_migration` tool with name `initial_schema` and the SQL from Step 1.
Expected: success, no error.

- [ ] **Step 3: Verify tables exist**

Use Supabase MCP `list_tables` (schema `public`).
Expected: all 8 tables present.

- [ ] **Step 4: Create the private storage bucket**

In the Supabase dashboard (Storage) or via SQL, create a bucket named `user-files` with `public = false`. SQL option:
```sql
insert into storage.buckets (id, name, public) values ('user-files', 'user-files', false)
on conflict (id) do nothing;
```
Apply via MCP `execute_sql`. Expected: success.

- [ ] **Step 5: Commit the migration record**

```bash
git add backend/migrations/0001_initial_schema.sql
git commit -m "feat: add initial database schema and storage bucket"
```

---

### Task 3: SQLModel table models

**Files:**
- Create: `backend/app/models/__init__.py`
- Create: `backend/app/models/tables.py`
- Test: `backend/tests/test_models.py`

**Interfaces:**
- Consumes: `engine` from `app.core.db`.
- Produces: SQLModel classes `User`, `Folder`, `File`, `FileVersion`, `Share`, `LinkShare`, `Star`, `Activity` with `table=True`, field names matching the schema in Task 2.

- [ ] **Step 1: Write `app/models/tables.py`**

```python
from datetime import datetime
from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel


class User(SQLModel, table=True):
    __tablename__ = "users"
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    email: str = Field(unique=True, index=True)
    password_hash: str
    display_name: str
    storage_used_bytes: int = 0
    storage_quota_bytes: int = 5_368_709_120
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Folder(SQLModel, table=True):
    __tablename__ = "folders"
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    owner_id: UUID = Field(foreign_key="users.id", index=True)
    parent_id: UUID | None = Field(default=None, foreign_key="folders.id")
    name: str
    is_trashed: bool = False
    trashed_at: datetime | None = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class File(SQLModel, table=True):
    __tablename__ = "files"
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    owner_id: UUID = Field(foreign_key="users.id", index=True)
    folder_id: UUID | None = Field(default=None, foreign_key="folders.id")
    name: str
    storage_key: str
    mime_type: str | None = None
    size_bytes: int = 0
    status: str = "pending"
    current_version_id: UUID | None = None
    is_trashed: bool = False
    trashed_at: datetime | None = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class FileVersion(SQLModel, table=True):
    __tablename__ = "file_versions"
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    file_id: UUID = Field(foreign_key="files.id", index=True)
    storage_key: str
    size_bytes: int = 0
    mime_type: str | None = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Share(SQLModel, table=True):
    __tablename__ = "shares"
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    file_id: UUID | None = Field(default=None, foreign_key="files.id")
    folder_id: UUID | None = Field(default=None, foreign_key="folders.id")
    grantee_user_id: UUID = Field(foreign_key="users.id", index=True)
    role: str
    created_by: UUID = Field(foreign_key="users.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)


class LinkShare(SQLModel, table=True):
    __tablename__ = "link_shares"
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    file_id: UUID | None = Field(default=None, foreign_key="files.id")
    folder_id: UUID | None = Field(default=None, foreign_key="folders.id")
    token: str = Field(unique=True, index=True)
    role: str
    password_hash: str | None = None
    expires_at: datetime | None = None
    created_by: UUID = Field(foreign_key="users.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Star(SQLModel, table=True):
    __tablename__ = "stars"
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: UUID = Field(foreign_key="users.id", index=True)
    file_id: UUID | None = Field(default=None, foreign_key="files.id")
    folder_id: UUID | None = Field(default=None, foreign_key="folders.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Activity(SQLModel, table=True):
    __tablename__ = "activities"
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    actor_id: UUID = Field(foreign_key="users.id", index=True)
    target_type: str
    target_id: UUID
    action: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
```

- [ ] **Step 2: Write failing test `tests/test_models.py`**

```python
from sqlmodel import Session, select

from app.core.db import engine
from app.models.tables import User


def test_can_insert_and_read_user():
    with Session(engine) as s:
        u = User(email="t1@example.com", password_hash="x", display_name="T1")
        s.add(u)
        s.commit()
        s.refresh(u)
        got = s.exec(select(User).where(User.id == u.id)).one()
        assert got.email == "t1@example.com"
        s.delete(got)
        s.commit()
```

- [ ] **Step 3: Run test**

Run: `cd backend && . .venv/bin/activate && pytest tests/test_models.py -v`
Expected: PASS (requires real `DATABASE_URL` in `.env` and Task 2 applied).

- [ ] **Step 4: Commit**

```bash
git add backend/app/models backend/tests/test_models.py
git commit -m "feat: add SQLModel table models"
```

---

### Task 4: Security utilities — password hashing and JWT

**Files:**
- Create: `backend/app/core/security.py`
- Test: `backend/tests/test_security.py`

**Interfaces:**
- Produces: `hash_password(pw: str) -> str`, `verify_password(pw: str, hashed: str) -> bool`.
- Produces: `create_access_token(sub: str) -> str`, `create_refresh_token(sub: str) -> str`, `decode_token(token: str) -> dict` (raises `jose.JWTError` on invalid/expired). Access tokens carry `{"sub": user_id, "type": "access", "exp": ...}`; refresh carry `type: "refresh"`.

- [ ] **Step 1: Write `app/core/security.py`**

```python
from datetime import datetime, timedelta, timezone

from jose import jwt
from passlib.context import CryptContext

from app.core.config import get_settings

_pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")
_ALGO = "HS256"


def hash_password(pw: str) -> str:
    return _pwd.hash(pw)


def verify_password(pw: str, hashed: str) -> bool:
    return _pwd.verify(pw, hashed)


def _make_token(sub: str, token_type: str, expires: timedelta) -> str:
    s = get_settings()
    now = datetime.now(timezone.utc)
    payload = {"sub": sub, "type": token_type, "iat": now, "exp": now + expires}
    return jwt.encode(payload, s.jwt_secret, algorithm=_ALGO)


def create_access_token(sub: str) -> str:
    s = get_settings()
    return _make_token(sub, "access", timedelta(minutes=s.jwt_access_ttl_min))


def create_refresh_token(sub: str) -> str:
    s = get_settings()
    return _make_token(sub, "refresh", timedelta(days=s.jwt_refresh_ttl_days))


def decode_token(token: str) -> dict:
    return jwt.decode(token, get_settings().jwt_secret, algorithms=[_ALGO])
```

- [ ] **Step 2: Write failing test `tests/test_security.py`**

```python
import pytest
from jose import JWTError

from app.core.security import (
    create_access_token,
    decode_token,
    hash_password,
    verify_password,
)


def test_password_roundtrip():
    h = hash_password("hunter2")
    assert h != "hunter2"
    assert verify_password("hunter2", h)
    assert not verify_password("wrong", h)


def test_access_token_roundtrip():
    tok = create_access_token("user-123")
    claims = decode_token(tok)
    assert claims["sub"] == "user-123"
    assert claims["type"] == "access"


def test_decode_rejects_garbage():
    with pytest.raises(JWTError):
        decode_token("not.a.token")
```

- [ ] **Step 3: Run tests**

Run: `cd backend && . .venv/bin/activate && pytest tests/test_security.py -v`
Expected: PASS (needs `JWT_SECRET` in `.env`).

- [ ] **Step 4: Commit**

```bash
git add backend/app/core/security.py backend/tests/test_security.py
git commit -m "feat: add password hashing and JWT utilities"
```

---

### Task 5: Auth router — register, login, refresh, logout, me

**Files:**
- Create: `backend/app/schemas/__init__.py`
- Create: `backend/app/schemas/auth.py`
- Create: `backend/app/core/deps.py`
- Create: `backend/app/routes/__init__.py`
- Create: `backend/app/routes/auth.py`
- Modify: `backend/app/main.py`
- Test: `backend/tests/test_auth.py`

**Interfaces:**
- Consumes: security helpers (Task 4), `get_session` (Task 1), `User` (Task 3).
- Produces: `get_current_user(request, session) -> User` dependency (reads `access_token` cookie, 401 on missing/invalid). Router mounted at `/auth`.
- Produces schemas: `RegisterIn{email:EmailStr, password:str, display_name:str}`, `LoginIn{email:EmailStr, password:str}`, `UserOut{id:UUID, email:str, display_name:str, storage_used_bytes:int, storage_quota_bytes:int}`.

- [ ] **Step 1: Write `app/schemas/auth.py`**

```python
from uuid import UUID

from pydantic import BaseModel, EmailStr


class RegisterIn(BaseModel):
    email: EmailStr
    password: str
    display_name: str


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: UUID
    email: str
    display_name: str
    storage_used_bytes: int
    storage_quota_bytes: int
```

- [ ] **Step 2: Write `app/core/deps.py`**

```python
from uuid import UUID

from fastapi import Depends, HTTPException, Request, status
from jose import JWTError
from sqlmodel import Session

from app.core.db import get_session
from app.core.security import decode_token
from app.models.tables import User


def get_current_user(
    request: Request, session: Session = Depends(get_session)
) -> User:
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")
    try:
        claims = decode_token(token)
        if claims.get("type") != "access":
            raise JWTError("wrong token type")
    except JWTError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token")
    user = session.get(User, UUID(claims["sub"]))
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found")
    return user
```

- [ ] **Step 3: Write `app/routes/auth.py`**

```python
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlmodel import Session, select

from app.core.config import get_settings
from app.core.db import get_session
from app.core.deps import get_current_user
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.models.tables import User
from app.schemas.auth import LoginIn, RegisterIn, UserOut
from jose import JWTError

router = APIRouter(prefix="/auth", tags=["auth"])


def _set_auth_cookies(resp: Response, user_id: str) -> None:
    s = get_settings()
    resp.set_cookie(
        "access_token", create_access_token(user_id), httponly=True,
        samesite="lax", max_age=s.jwt_access_ttl_min * 60, path="/",
    )
    resp.set_cookie(
        "refresh_token", create_refresh_token(user_id), httponly=True,
        samesite="lax", max_age=s.jwt_refresh_ttl_days * 86400, path="/",
    )


@router.post("/register", response_model=UserOut, status_code=201)
def register(body: RegisterIn, session: Session = Depends(get_session)):
    exists = session.exec(select(User).where(User.email == body.email)).first()
    if exists:
        raise HTTPException(status.HTTP_409_CONFLICT, "Email already registered")
    user = User(
        email=body.email,
        password_hash=hash_password(body.password),
        display_name=body.display_name,
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


@router.post("/login", response_model=UserOut)
def login(body: LoginIn, response: Response, session: Session = Depends(get_session)):
    user = session.exec(select(User).where(User.email == body.email)).first()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid credentials")
    _set_auth_cookies(response, str(user.id))
    return user


@router.post("/refresh")
def refresh(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "No refresh token")
    try:
        claims = decode_token(token)
        if claims.get("type") != "refresh":
            raise JWTError("wrong token type")
    except JWTError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid refresh token")
    _set_auth_cookies(response, claims["sub"])
    return {"status": "refreshed"}


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"status": "logged out"}


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user
```

- [ ] **Step 4: Mount the router in `app/main.py`**

```python
from fastapi import FastAPI

from app.routes import auth

app = FastAPI(title="Cloud Storage Service")
app.include_router(auth.router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
```

- [ ] **Step 5: Write failing test `tests/test_auth.py`**

```python
import uuid


def _email():
    return f"user-{uuid.uuid4().hex[:8]}@example.com"


def test_register_login_me_flow(client):
    email = _email()
    r = client.post("/auth/register", json={
        "email": email, "password": "hunter2", "display_name": "Test"})
    assert r.status_code == 201
    assert r.json()["email"] == email

    r = client.post("/auth/login", json={"email": email, "password": "hunter2"})
    assert r.status_code == 200
    assert client.cookies.get("access_token")

    r = client.get("/auth/me")
    assert r.status_code == 200
    assert r.json()["email"] == email


def test_login_bad_password(client):
    email = _email()
    client.post("/auth/register", json={
        "email": email, "password": "hunter2", "display_name": "Test"})
    r = client.post("/auth/login", json={"email": email, "password": "wrong"})
    assert r.status_code == 401


def test_me_requires_auth(client):
    client.cookies.clear()
    r = client.get("/auth/me")
    assert r.status_code == 401
```

- [ ] **Step 6: Run tests**

Run: `cd backend && . .venv/bin/activate && pytest tests/test_auth.py -v`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add backend/app/schemas backend/app/core/deps.py backend/app/routes backend/app/main.py backend/tests/test_auth.py
git commit -m "feat: add auth router (register, login, refresh, logout, me)"
```

---

### Task 6: Permissions service and folder router

**Files:**
- Create: `backend/app/services/__init__.py`
- Create: `backend/app/services/permissions.py`
- Create: `backend/app/schemas/folders.py`
- Create: `backend/app/routes/folders.py`
- Modify: `backend/app/main.py`
- Test: `backend/tests/test_folders.py`

**Interfaces:**
- Consumes: `get_current_user`, `get_session`, `Folder`, `File`, `Share`.
- Produces: `effective_role(session, user_id, *, file=None, folder=None) -> str | None` returning `"owner" | "editor" | "viewer" | None`; `require_role(session, user_id, *, file=None, folder=None, minimum)` raising 403/404 and returning the effective role. `minimum` is one of `"viewer" | "editor" | "owner"`.
- Produces schemas: `FolderCreate{name:str, parent_id:UUID|None}`, `FolderUpdate{name:str|None, parent_id:UUID|None}`, `FolderOut{id,owner_id,parent_id,name,is_trashed,created_at}`.
- Produces: folder router at `/folders`.

- [ ] **Step 1: Write `app/services/permissions.py`**

```python
from uuid import UUID

from fastapi import HTTPException, status
from sqlmodel import Session, select

from app.models.tables import File, Folder, Share

_RANK = {"viewer": 1, "editor": 2, "owner": 3}


def effective_role(
    session: Session, user_id: UUID, *, file: File | None = None,
    folder: Folder | None = None,
) -> str | None:
    resource = file or folder
    if resource is None:
        return None
    if resource.owner_id == user_id:
        return "owner"
    stmt = select(Share).where(Share.grantee_user_id == user_id)
    if file is not None:
        stmt = stmt.where(Share.file_id == file.id)
    else:
        stmt = stmt.where(Share.folder_id == folder.id)
    share = session.exec(stmt).first()
    return share.role if share else None


def require_role(session: Session, user_id: UUID, *, file=None, folder=None,
                 minimum: str) -> str:
    role = effective_role(session, user_id, file=file, folder=folder)
    if role is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found")
    if _RANK[role] < _RANK[minimum]:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Insufficient permission")
    return role
```

- [ ] **Step 2: Write `app/schemas/folders.py`**

```python
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class FolderCreate(BaseModel):
    name: str
    parent_id: UUID | None = None


class FolderUpdate(BaseModel):
    name: str | None = None
    parent_id: UUID | None = None


class FolderOut(BaseModel):
    id: UUID
    owner_id: UUID
    parent_id: UUID | None
    name: str
    is_trashed: bool
    created_at: datetime
```

- [ ] **Step 3: Write `app/routes/folders.py`**

```python
from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.core.db import get_session
from app.core.deps import get_current_user
from app.models.tables import File, Folder, User
from app.schemas.folders import FolderCreate, FolderOut, FolderUpdate
from app.services.permissions import require_role

router = APIRouter(prefix="/folders", tags=["folders"])


def _get_owned_folder(session: Session, folder_id: UUID, user: User) -> Folder:
    folder = session.get(Folder, folder_id)
    if not folder or folder.is_trashed:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Folder not found")
    require_role(session, user.id, folder=folder, minimum="viewer")
    return folder


@router.post("", response_model=FolderOut, status_code=201)
def create_folder(body: FolderCreate, user: User = Depends(get_current_user),
                  session: Session = Depends(get_session)):
    if body.parent_id:
        parent = session.get(Folder, body.parent_id)
        if not parent or parent.owner_id != user.id:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Parent not found")
    folder = Folder(owner_id=user.id, parent_id=body.parent_id, name=body.name)
    session.add(folder)
    session.commit()
    session.refresh(folder)
    return folder


@router.get("/{folder_id}")
def get_folder(folder_id: UUID, user: User = Depends(get_current_user),
               session: Session = Depends(get_session)):
    folder = _get_owned_folder(session, folder_id, user)
    subfolders = session.exec(
        select(Folder).where(Folder.parent_id == folder_id,
                             Folder.is_trashed == False)).all()
    files = session.exec(
        select(File).where(File.folder_id == folder_id,
                           File.is_trashed == False,
                           File.status == "ready")).all()
    return {"folder": FolderOut.model_validate(folder, from_attributes=True),
            "folders": [FolderOut.model_validate(f, from_attributes=True)
                        for f in subfolders],
            "files": [{"id": f.id, "name": f.name, "size_bytes": f.size_bytes,
                       "mime_type": f.mime_type} for f in files]}


@router.get("/{folder_id}/breadcrumb")
def breadcrumb(folder_id: UUID, user: User = Depends(get_current_user),
               session: Session = Depends(get_session)):
    _get_owned_folder(session, folder_id, user)
    trail = []
    current: UUID | None = folder_id
    while current is not None:
        f = session.get(Folder, current)
        if not f:
            break
        trail.append({"id": f.id, "name": f.name})
        current = f.parent_id
    return list(reversed(trail))


@router.patch("/{folder_id}", response_model=FolderOut)
def update_folder(folder_id: UUID, body: FolderUpdate,
                  user: User = Depends(get_current_user),
                  session: Session = Depends(get_session)):
    folder = session.get(Folder, folder_id)
    if not folder:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Folder not found")
    require_role(session, user.id, folder=folder, minimum="editor")
    if body.name is not None:
        folder.name = body.name
    if body.parent_id is not None:
        if body.parent_id == folder_id:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Cannot nest in self")
        folder.parent_id = body.parent_id
    folder.updated_at = datetime.utcnow()
    session.add(folder)
    session.commit()
    session.refresh(folder)
    return folder


@router.delete("/{folder_id}", status_code=204)
def delete_folder(folder_id: UUID, user: User = Depends(get_current_user),
                  session: Session = Depends(get_session)):
    folder = session.get(Folder, folder_id)
    if not folder:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Folder not found")
    require_role(session, user.id, folder=folder, minimum="owner")
    folder.is_trashed = True
    folder.trashed_at = datetime.utcnow()
    session.add(folder)
    session.commit()
```

- [ ] **Step 4: Mount router in `app/main.py`** (add `from app.routes import auth, folders` and `app.include_router(folders.router)`).

- [ ] **Step 5: Write failing test `tests/test_folders.py`**

```python
import uuid

import pytest


@pytest.fixture
def auth_client(client):
    email = f"folder-{uuid.uuid4().hex[:8]}@example.com"
    client.post("/auth/register", json={
        "email": email, "password": "pw", "display_name": "F"})
    client.post("/auth/login", json={"email": email, "password": "pw"})
    return client


def test_create_and_nest_folders(auth_client):
    r = auth_client.post("/folders", json={"name": "Docs"})
    assert r.status_code == 201
    parent = r.json()["id"]

    r = auth_client.post("/folders", json={"name": "Sub", "parent_id": parent})
    assert r.status_code == 201
    child = r.json()["id"]

    r = auth_client.get(f"/folders/{child}/breadcrumb")
    names = [n["name"] for n in r.json()]
    assert names == ["Docs", "Sub"]


def test_soft_delete_folder(auth_client):
    r = auth_client.post("/folders", json={"name": "Temp"})
    fid = r.json()["id"]
    assert auth_client.delete(f"/folders/{fid}").status_code == 204
    assert auth_client.get(f"/folders/{fid}").status_code == 404
```

- [ ] **Step 6: Run tests**

Run: `cd backend && . .venv/bin/activate && pytest tests/test_folders.py -v`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add backend/app/services backend/app/schemas/folders.py backend/app/routes/folders.py backend/app/main.py backend/tests/test_folders.py
git commit -m "feat: add permissions service and folder router"
```

---

### Task 7: Storage service and file upload lifecycle

**Files:**
- Create: `backend/app/services/storage.py`
- Create: `backend/app/schemas/files.py`
- Create: `backend/app/routes/files.py`
- Modify: `backend/app/main.py`
- Test: `backend/tests/test_files.py`

**Interfaces:**
- Consumes: `get_current_user`, `get_session`, `File`, `FileVersion`, `User`, `require_role`.
- Produces: storage wrapper `StorageService` with `signed_upload_url(key) -> str`, `signed_download_url(key, expires=3600) -> str`, `object_exists(key) -> bool`, `delete_object(key) -> None`; module singleton `get_storage() -> StorageService`.
- Produces schemas: `InitUploadIn{name:str, folder_id:UUID|None, mime_type:str|None, size_bytes:int}`, `InitUploadOut{file_id:UUID, upload_url:str, storage_key:str}`, `CompleteUploadIn{file_id:UUID}`, `FileOut{id,name,folder_id,mime_type,size_bytes,status,created_at}`.
- Produces: file router at `/files`.

- [ ] **Step 1: Write `app/services/storage.py`**

```python
from functools import lru_cache

from supabase import Client, create_client

from app.core.config import get_settings


class StorageService:
    def __init__(self, client: Client, bucket: str):
        self._bucket = client.storage.from_(bucket)

    def signed_upload_url(self, key: str) -> str:
        res = self._bucket.create_signed_upload_url(key)
        return res["signed_url"]

    def signed_download_url(self, key: str, expires: int = 3600) -> str:
        res = self._bucket.create_signed_url(key, expires)
        return res["signedURL"]

    def object_exists(self, key: str) -> bool:
        prefix, _, name = key.rpartition("/")
        listed = self._bucket.list(prefix)
        return any(item["name"] == name for item in listed)

    def delete_object(self, key: str) -> None:
        self._bucket.remove([key])


@lru_cache
def get_storage() -> StorageService:
    s = get_settings()
    client = create_client(s.supabase_url, s.supabase_service_key)
    return StorageService(client, s.storage_bucket)
```

- [ ] **Step 2: Write `app/schemas/files.py`**

```python
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class InitUploadIn(BaseModel):
    name: str
    folder_id: UUID | None = None
    mime_type: str | None = None
    size_bytes: int


class InitUploadOut(BaseModel):
    file_id: UUID
    upload_url: str
    storage_key: str


class CompleteUploadIn(BaseModel):
    file_id: UUID


class FileOut(BaseModel):
    id: UUID
    name: str
    folder_id: UUID | None
    mime_type: str | None
    size_bytes: int
    status: str
    created_at: datetime
```

- [ ] **Step 3: Write `app/routes/files.py`**

```python
from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session

from app.core.db import get_session
from app.core.deps import get_current_user
from app.models.tables import Activity, File, FileVersion, User
from app.schemas.files import (
    CompleteUploadIn, FileOut, InitUploadIn, InitUploadOut,
)
from app.services.permissions import require_role
from app.services.storage import get_storage

router = APIRouter(prefix="/files", tags=["files"])


@router.post("/init-upload", response_model=InitUploadOut)
def init_upload(body: InitUploadIn, user: User = Depends(get_current_user),
                session: Session = Depends(get_session)):
    if user.storage_used_bytes + body.size_bytes > user.storage_quota_bytes:
        raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                            "Storage quota exceeded")
    file = File(owner_id=user.id, folder_id=body.folder_id, name=body.name,
                mime_type=body.mime_type, size_bytes=body.size_bytes,
                status="pending", storage_key="")
    file.storage_key = f"{user.id}/{file.id}/{body.name}"
    session.add(file)
    session.commit()
    session.refresh(file)
    try:
        url = get_storage().signed_upload_url(file.storage_key)
    except Exception:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "Storage unavailable")
    return InitUploadOut(file_id=file.id, upload_url=url,
                         storage_key=file.storage_key)


@router.post("/complete-upload", response_model=FileOut)
def complete_upload(body: CompleteUploadIn,
                    user: User = Depends(get_current_user),
                    session: Session = Depends(get_session)):
    file = session.get(File, body.file_id)
    if not file:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "File not found")
    require_role(session, user.id, file=file, minimum="owner")
    if file.status == "ready":
        return file
    if not get_storage().object_exists(file.storage_key):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Object not uploaded")
    version = FileVersion(file_id=file.id, storage_key=file.storage_key,
                          size_bytes=file.size_bytes, mime_type=file.mime_type)
    session.add(version)
    session.commit()
    session.refresh(version)
    file.status = "ready"
    file.current_version_id = version.id
    file.updated_at = datetime.utcnow()
    db_user = session.get(User, user.id)
    db_user.storage_used_bytes += file.size_bytes
    session.add_all([file, db_user,
                     Activity(actor_id=user.id, target_type="file",
                              target_id=file.id, action="upload")])
    session.commit()
    session.refresh(file)
    return file


@router.get("/{file_id}", response_model=FileOut)
def get_file(file_id: UUID, user: User = Depends(get_current_user),
             session: Session = Depends(get_session)):
    file = session.get(File, file_id)
    if not file or file.is_trashed:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "File not found")
    require_role(session, user.id, file=file, minimum="viewer")
    return file


@router.get("/{file_id}/download")
def download(file_id: UUID, user: User = Depends(get_current_user),
             session: Session = Depends(get_session)):
    file = session.get(File, file_id)
    if not file or file.is_trashed or file.status != "ready":
        raise HTTPException(status.HTTP_404_NOT_FOUND, "File not found")
    require_role(session, user.id, file=file, minimum="viewer")
    return {"download_url": get_storage().signed_download_url(file.storage_key)}
```

- [ ] **Step 4: Mount router in `app/main.py`** (add `files` to the import and `app.include_router(files.router)`).

- [ ] **Step 5: Write failing test `tests/test_files.py`** (storage mocked)

```python
import uuid

import pytest

from app.services import storage as storage_module


class FakeStorage:
    def __init__(self):
        self.objects = set()

    def signed_upload_url(self, key):
        self.objects.add(key)  # simulate a client PUT succeeding
        return f"https://storage.local/upload/{key}"

    def signed_download_url(self, key, expires=3600):
        return f"https://storage.local/download/{key}"

    def object_exists(self, key):
        return key in self.objects

    def delete_object(self, key):
        self.objects.discard(key)


@pytest.fixture
def fake_storage(monkeypatch):
    fake = FakeStorage()
    monkeypatch.setattr(storage_module, "get_storage", lambda: fake)
    # routes import the symbol directly, patch there too
    from app.routes import files as files_route
    monkeypatch.setattr(files_route, "get_storage", lambda: fake)
    return fake


@pytest.fixture
def auth_client(client):
    email = f"file-{uuid.uuid4().hex[:8]}@example.com"
    client.post("/auth/register", json={
        "email": email, "password": "pw", "display_name": "F"})
    client.post("/auth/login", json={"email": email, "password": "pw"})
    return client


def test_upload_lifecycle(auth_client, fake_storage):
    r = auth_client.post("/files/init-upload", json={
        "name": "a.txt", "size_bytes": 10})
    assert r.status_code == 200
    fid = r.json()["file_id"]

    r = auth_client.post("/files/complete-upload", json={"file_id": fid})
    assert r.status_code == 200
    assert r.json()["status"] == "ready"

    r = auth_client.get(f"/files/{fid}/download")
    assert "download_url" in r.json()


def test_complete_upload_without_object_fails(auth_client, fake_storage):
    r = auth_client.post("/files/init-upload", json={
        "name": "b.txt", "size_bytes": 10})
    fid = r.json()["file_id"]
    fake_storage.objects.clear()  # simulate client never uploaded
    r = auth_client.post("/files/complete-upload", json={"file_id": fid})
    assert r.status_code == 400
```

- [ ] **Step 6: Run tests**

Run: `cd backend && . .venv/bin/activate && pytest tests/test_files.py -v`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add backend/app/services/storage.py backend/app/schemas/files.py backend/app/routes/files.py backend/app/main.py backend/tests/test_files.py
git commit -m "feat: add storage service and file upload lifecycle"
```

---

### Task 8: File mutation, trash, and restore

**Files:**
- Modify: `backend/app/routes/files.py` (add rename/move/soft-delete)
- Create: `backend/app/routes/trash.py`
- Create: `backend/app/schemas/trash.py`
- Modify: `backend/app/main.py`
- Test: `backend/tests/test_trash.py`

**Interfaces:**
- Consumes: everything from Task 7 plus `Folder`.
- Produces: `PATCH /files/{id}` (body `FileUpdate{name:str|None, folder_id:UUID|None}`), `DELETE /files/{id}` (soft delete).
- Produces: trash router at `/trash` with `GET /trash`, `POST /trash/{item_type}/{item_id}/restore`, `DELETE /trash/{item_type}/{item_id}` where `item_type` ∈ `{"file","folder"}`.

- [ ] **Step 1: Add `FileUpdate` to `app/schemas/files.py`**

```python
class FileUpdate(BaseModel):
    name: str | None = None
    folder_id: UUID | None = None
```

- [ ] **Step 2: Add rename/move/delete to `app/routes/files.py`**

```python
from app.schemas.files import FileUpdate  # add to existing imports


@router.patch("/{file_id}", response_model=FileOut)
def update_file(file_id: UUID, body: FileUpdate,
                user: User = Depends(get_current_user),
                session: Session = Depends(get_session)):
    file = session.get(File, file_id)
    if not file or file.is_trashed:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "File not found")
    require_role(session, user.id, file=file, minimum="editor")
    if body.name is not None:
        file.name = body.name
    if body.folder_id is not None:
        file.folder_id = body.folder_id
    file.updated_at = datetime.utcnow()
    session.add(file)
    session.commit()
    session.refresh(file)
    return file


@router.delete("/{file_id}", status_code=204)
def delete_file(file_id: UUID, user: User = Depends(get_current_user),
                session: Session = Depends(get_session)):
    file = session.get(File, file_id)
    if not file:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "File not found")
    require_role(session, user.id, file=file, minimum="owner")
    file.is_trashed = True
    file.trashed_at = datetime.utcnow()
    session.add(file)
    session.commit()
```

- [ ] **Step 3: Write `app/schemas/trash.py`**

```python
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class TrashItem(BaseModel):
    id: UUID
    item_type: str
    name: str
    trashed_at: datetime | None
```

- [ ] **Step 4: Write `app/routes/trash.py`**

```python
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.core.db import get_session
from app.core.deps import get_current_user
from app.models.tables import File, Folder, User
from app.schemas.trash import TrashItem
from app.services.storage import get_storage

router = APIRouter(prefix="/trash", tags=["trash"])


@router.get("", response_model=list[TrashItem])
def list_trash(user: User = Depends(get_current_user),
               session: Session = Depends(get_session)):
    folders = session.exec(select(Folder).where(
        Folder.owner_id == user.id, Folder.is_trashed == True)).all()
    files = session.exec(select(File).where(
        File.owner_id == user.id, File.is_trashed == True)).all()
    items = [TrashItem(id=f.id, item_type="folder", name=f.name,
                       trashed_at=f.trashed_at) for f in folders]
    items += [TrashItem(id=f.id, item_type="file", name=f.name,
                        trashed_at=f.trashed_at) for f in files]
    return items


def _load_owned(session, user, item_type, item_id):
    model = Folder if item_type == "folder" else File
    if item_type not in ("file", "folder"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Bad item type")
    obj = session.get(model, item_id)
    if not obj or obj.owner_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found")
    return obj


@router.post("/{item_type}/{item_id}/restore", status_code=200)
def restore(item_type: str, item_id: UUID,
            user: User = Depends(get_current_user),
            session: Session = Depends(get_session)):
    obj = _load_owned(session, user, item_type, item_id)
    obj.is_trashed = False
    obj.trashed_at = None
    session.add(obj)
    session.commit()
    return {"status": "restored"}


@router.delete("/{item_type}/{item_id}", status_code=204)
def purge(item_type: str, item_id: UUID,
          user: User = Depends(get_current_user),
          session: Session = Depends(get_session)):
    obj = _load_owned(session, user, item_type, item_id)
    if item_type == "file" and obj.storage_key:
        try:
            get_storage().delete_object(obj.storage_key)
        except Exception:
            pass
        db_user = session.get(User, user.id)
        db_user.storage_used_bytes = max(0, db_user.storage_used_bytes
                                         - obj.size_bytes)
        session.add(db_user)
    session.delete(obj)
    session.commit()
```

- [ ] **Step 5: Mount router in `app/main.py`** (add `trash` to import and `app.include_router(trash.router)`).

- [ ] **Step 6: Write failing test `tests/test_trash.py`**

```python
import uuid

import pytest

from app.services import storage as storage_module


class FakeStorage:
    def signed_upload_url(self, key): return "x"
    def signed_download_url(self, key, expires=3600): return "x"
    def object_exists(self, key): return True
    def delete_object(self, key): pass


@pytest.fixture
def auth_client(client, monkeypatch):
    fake = FakeStorage()
    from app.routes import files as files_route
    monkeypatch.setattr(files_route, "get_storage", lambda: fake)
    from app.routes import trash as trash_route
    monkeypatch.setattr(trash_route, "get_storage", lambda: fake)
    email = f"trash-{uuid.uuid4().hex[:8]}@example.com"
    client.post("/auth/register", json={
        "email": email, "password": "pw", "display_name": "T"})
    client.post("/auth/login", json={"email": email, "password": "pw"})
    return client


def test_trash_and_restore_folder(auth_client):
    fid = auth_client.post("/folders", json={"name": "X"}).json()["id"]
    auth_client.delete(f"/folders/{fid}")
    listed = auth_client.get("/trash").json()
    assert any(i["id"] == fid for i in listed)
    assert auth_client.post(f"/trash/folder/{fid}/restore").status_code == 200
    assert auth_client.get(f"/folders/{fid}").status_code == 200


def test_purge_file(auth_client):
    fid = auth_client.post("/files/init-upload", json={
        "name": "z.txt", "size_bytes": 1}).json()["file_id"]
    auth_client.post("/files/complete-upload", json={"file_id": fid})
    auth_client.delete(f"/files/{fid}")
    assert auth_client.delete(f"/trash/file/{fid}").status_code == 204
    assert auth_client.get("/trash").json() == [] or all(
        i["id"] != fid for i in auth_client.get("/trash").json())
```

- [ ] **Step 7: Run tests**

Run: `cd backend && . .venv/bin/activate && pytest tests/test_trash.py -v`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add backend/app/routes/files.py backend/app/routes/trash.py backend/app/schemas/files.py backend/app/schemas/trash.py backend/app/main.py backend/tests/test_trash.py
git commit -m "feat: add file rename/move/delete and trash restore/purge"
```

---

### Task 9: Search router and full test pass

**Files:**
- Create: `backend/app/routes/search.py`
- Modify: `backend/app/main.py`
- Create: `backend/README.md`
- Test: `backend/tests/test_search.py`

**Interfaces:**
- Consumes: `get_current_user`, `get_session`, `File`, `Folder`.
- Produces: `GET /search?q=<str>&type=<file|folder|all>` scoped to the current user, excluding trashed items; files must be `status=ready`.

- [ ] **Step 1: Write `app/routes/search.py`**

```python
from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from app.core.db import get_session
from app.core.deps import get_current_user
from app.models.tables import File, Folder, User

router = APIRouter(prefix="/search", tags=["search"])


@router.get("")
def search(q: str = "", type: str = "all",
           user: User = Depends(get_current_user),
           session: Session = Depends(get_session)):
    pattern = f"%{q}%"
    results = []
    if type in ("all", "folder"):
        folders = session.exec(select(Folder).where(
            Folder.owner_id == user.id, Folder.is_trashed == False,
            Folder.name.ilike(pattern))).all()
        results += [{"id": f.id, "type": "folder", "name": f.name}
                    for f in folders]
    if type in ("all", "file"):
        files = session.exec(select(File).where(
            File.owner_id == user.id, File.is_trashed == False,
            File.status == "ready", File.name.ilike(pattern))).all()
        results += [{"id": f.id, "type": "file", "name": f.name,
                     "mime_type": f.mime_type} for f in files]
    return results
```

- [ ] **Step 2: Mount router in `app/main.py`** (add `search` to import and `app.include_router(search.router)`).

- [ ] **Step 3: Write failing test `tests/test_search.py`**

```python
import uuid

import pytest


@pytest.fixture
def auth_client(client):
    email = f"search-{uuid.uuid4().hex[:8]}@example.com"
    client.post("/auth/register", json={
        "email": email, "password": "pw", "display_name": "S"})
    client.post("/auth/login", json={"email": email, "password": "pw"})
    return client


def test_search_finds_folder_by_name(auth_client):
    auth_client.post("/folders", json={"name": "Invoices2024"})
    r = auth_client.get("/search", params={"q": "invoice", "type": "folder"})
    assert r.status_code == 200
    assert any("Invoices2024" == item["name"] for item in r.json())


def test_search_scoped_to_owner(auth_client, client):
    auth_client.post("/folders", json={"name": "SecretFolder"})
    # a second, fresh user
    email2 = f"other-{uuid.uuid4().hex[:8]}@example.com"
    client.cookies.clear()
    client.post("/auth/register", json={
        "email": email2, "password": "pw", "display_name": "O"})
    client.post("/auth/login", json={"email": email2, "password": "pw"})
    r = client.get("/search", params={"q": "Secret"})
    assert all(item["name"] != "SecretFolder" for item in r.json())
```

- [ ] **Step 4: Run tests**

Run: `cd backend && . .venv/bin/activate && pytest tests/test_search.py -v`
Expected: PASS.

- [ ] **Step 5: Write `backend/README.md`**

Document: setup (`.venv`, `pip install`, copy `.env.example` → `.env`), how to run (`uvicorn app.main:app --reload`), how to run tests (`pytest`), and the API surface (auth/folders/files/trash/search). Note the Supabase MCP migration is the source of truth for schema.

- [ ] **Step 6: Run the full test suite**

Run: `cd backend && . .venv/bin/activate && pytest -v`
Expected: all tests PASS.

- [ ] **Step 7: Commit**

```bash
git add backend/app/routes/search.py backend/app/main.py backend/tests/test_search.py backend/README.md
git commit -m "feat: add search router and backend README"
```

---

## Notes on Test Strategy

- Tests run against the real Supabase Postgres configured in `.env` (Tasks 3, 5, 6, 8, 9 touch the DB). Each test uses unique emails/names so runs are idempotent; rows accumulate but do not collide. A future task can add a dedicated test schema + teardown fixture.
- Storage is always faked in tests (Tasks 7, 8) — no real Supabase Storage calls in the suite. One manual integration check of a real signed-URL round-trip is listed in the design's testing section and can be run ad hoc.
- Permission matrix (owner vs viewer vs stranger) is partially covered via owner-only paths and owner-scoping tests; full viewer/editor coverage arrives with the Phase 2 sharing endpoints that populate the `shares` table.
