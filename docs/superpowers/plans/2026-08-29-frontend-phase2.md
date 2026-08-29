# Cloud Storage Frontend (Phase 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a React + Vite + TypeScript frontend for the existing FastAPI backend — animated glassmorphic auth, folder browsing, file upload/download, rename/move, trash, and search — plus one small backend endpoint (`GET /drive`) for the root listing.

**Architecture:** Vite SPA. The dev server proxies `/api/*` to the backend on `:8000` so HttpOnly `SameSite=Lax` cookies work same-origin. Axios (`baseURL:"/api"`, `withCredentials`) with a 401→refresh→retry interceptor. TanStack Query owns all server state. Tailwind + a small glass design system + Framer Motion transitions + Lottie for the animated auth character. Tests are Vitest + React Testing Library + MSW (backend fully mocked; Lottie stubbed in tests).

**Tech Stack:** Vite, React 18, TypeScript, TailwindCSS, @tanstack/react-query, axios, react-router-dom, framer-motion, lottie-react, react-dropzone, vitest, @testing-library/react, @testing-library/user-event, jsdom, msw.

## Global Constraints

- Frontend lives in `frontend/` at the repo root (`/home/eshhh/Desktop/cloudbase-it/frontend`). Backend stays in `backend/`.
- All API calls go through the shared axios instance (`baseURL:"/api"`, `withCredentials:true`). Never call `fetch` directly or hardcode `http://localhost:8000`.
- Dev proxy: `vite.config.ts` proxies `/api` → `http://localhost:8000` with `changeOrigin:true` and rewrites `^/api` → `''` (backend routes are unprefixed, e.g. `/auth/login`).
- Colors come from the Tailwind theme tokens: blue `#3B82F6` (primary), violet `#8B5CF6` (secondary), green `#22C55E` (success), yellow `#EAB308` (warning). Background is white `#FFFFFF`. No raw hex in components — use token classes.
- Glass surfaces use the `.glass` utility (`bg-white/60 backdrop-blur-xl border border-white/40 shadow-lg`). Buttons are fully rounded (`rounded-full`).
- Motion durations ~150–300ms, spring easing; respect `prefers-reduced-motion`.
- Every task runs its Vitest tests green, then commits AND pushes: `git push origin main`.
- Node 22, npm 10. Commit messages: no `Co-Authored-By` trailer.
- Lottie is stubbed in the test environment; assert on component state/DOM, never on Lottie internals.

---

### Task 0: Backend `GET /drive` root-listing endpoint

**Files:**
- Create: `backend/app/routes/drive.py`
- Modify: `backend/app/main.py`
- Test: `backend/tests/test_drive.py`

**Interfaces:**
- Consumes: `get_session`, `get_current_user`, `File`, `Folder`, `User`.
- Produces: `GET /drive` → `{"folders": [FolderOut...], "files": [{id,name,size_bytes,mime_type}...]}` for the current user's top-level (`parent_id`/`folder_id` NULL), non-trashed items (files `status="ready"`).

- [ ] **Step 1: Write the failing test `backend/tests/test_drive.py`**

```python
import uuid

import pytest


@pytest.fixture
def auth_client(client):
    email = f"drive-{uuid.uuid4().hex[:8]}@example.com"
    client.post("/auth/register", json={"email": email, "password": "pw", "display_name": "D"})
    client.post("/auth/login", json={"email": email, "password": "pw"})
    return client


def test_drive_lists_top_level_folder(auth_client):
    r = auth_client.post("/folders", json={"name": "TopLevel"})
    assert r.status_code == 201
    top_id = r.json()["id"]
    # a nested folder must NOT appear at drive root
    auth_client.post("/folders", json={"name": "Nested", "parent_id": top_id})

    r = auth_client.get("/drive")
    assert r.status_code == 200
    body = r.json()
    names = [f["name"] for f in body["folders"]]
    assert "TopLevel" in names
    assert "Nested" not in names


def test_drive_requires_auth(client):
    client.cookies.clear()
    assert client.get("/drive").status_code == 401
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd /home/eshhh/Desktop/cloudbase-it/backend && . .venv/bin/activate && pytest tests/test_drive.py -v`
Expected: FAIL (404, route not found).

- [ ] **Step 3: Write `backend/app/routes/drive.py`**

```python
from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from app.core.db import get_session
from app.core.deps import get_current_user
from app.models.tables import File, Folder, User

router = APIRouter(prefix="/drive", tags=["drive"])


@router.get("")
def get_drive(user: User = Depends(get_current_user),
              session: Session = Depends(get_session)):
    folders = session.exec(
        select(Folder).where(Folder.owner_id == user.id,
                             Folder.parent_id == None,  # noqa: E711
                             Folder.is_trashed == False)).all()
    files = session.exec(
        select(File).where(File.owner_id == user.id,
                           File.folder_id == None,  # noqa: E711
                           File.is_trashed == False,
                           File.status == "ready")).all()
    return {
        "folders": [{"id": f.id, "owner_id": f.owner_id, "parent_id": f.parent_id,
                     "name": f.name, "is_trashed": f.is_trashed,
                     "created_at": f.created_at} for f in folders],
        "files": [{"id": f.id, "name": f.name, "size_bytes": f.size_bytes,
                   "mime_type": f.mime_type} for f in files],
    }
```

- [ ] **Step 4: Mount in `backend/app/main.py`**

Add `drive` to the routers import line and `app.include_router(drive.router)`:

```python
from app.routes import auth, drive, files, folders, search, trash

app = FastAPI(title="Cloud Storage Service")
app.include_router(auth.router)
app.include_router(folders.router)
app.include_router(files.router)
app.include_router(trash.router)
app.include_router(search.router)
app.include_router(drive.router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
```

- [ ] **Step 5: Run tests**

Run: `cd /home/eshhh/Desktop/cloudbase-it/backend && . .venv/bin/activate && pytest tests/test_drive.py -v`
Expected: PASS.

- [ ] **Step 6: Commit and push**

```bash
cd /home/eshhh/Desktop/cloudbase-it
git add backend/app/routes/drive.py backend/app/main.py backend/tests/test_drive.py
git commit -m "feat(drive): add GET /drive top-level listing endpoint"
git push origin main
```

---

### Task 1: Frontend scaffold — Vite + TS + Tailwind + test harness

**Files:**
- Create: `frontend/package.json`, `frontend/vite.config.ts`, `frontend/tsconfig.json`, `frontend/tsconfig.node.json`, `frontend/index.html`, `frontend/postcss.config.js`, `frontend/tailwind.config.js`
- Create: `frontend/src/main.tsx`, `frontend/src/App.tsx`, `frontend/src/styles/index.css`
- Create: `frontend/src/test/setup.ts`
- Create: `frontend/.gitignore`
- Test: `frontend/src/App.test.tsx`

**Interfaces:**
- Produces: a runnable Vite app (`npm run dev`), a passing Vitest setup (`npm test`), Tailwind with the accent tokens and `.glass` utility, and the `/api` dev proxy.

- [ ] **Step 1: Create `frontend/package.json`**

```json
{
  "name": "cloudbase-frontend",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@tanstack/react-query": "^5.62.0",
    "axios": "^1.7.9",
    "framer-motion": "^11.15.0",
    "lottie-react": "^2.4.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-dropzone": "^14.3.5",
    "react-router-dom": "^6.28.0"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.1.0",
    "@testing-library/user-event": "^14.5.2",
    "@types/react": "^18.3.17",
    "@types/react-dom": "^18.3.5",
    "@vitejs/plugin-react": "^4.3.4",
    "autoprefixer": "^10.4.20",
    "jsdom": "^25.0.1",
    "msw": "^2.7.0",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.17",
    "typescript": "^5.7.2",
    "vite": "^6.0.3",
    "vitest": "^2.1.8"
  }
}
```

- [ ] **Step 2: Install**

Run: `cd /home/eshhh/Desktop/cloudbase-it/frontend && npm install`
Expected: completes; `node_modules/` created. If any listed version is unavailable, install the nearest available minor and note it — do not switch major versions.

- [ ] **Step 3: Create `frontend/vite.config.ts`**

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, ""),
      },
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    css: true,
  },
});
```

- [ ] **Step 4: Create `frontend/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "types": ["vitest/globals", "@testing-library/jest-dom"]
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 5: Create `frontend/tsconfig.node.json`**

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 6: Create `frontend/index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Cloudbase</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 7: Create `frontend/postcss.config.js`**

```javascript
export default {
  plugins: { tailwindcss: {}, autoprefixer: {} },
};
```

- [ ] **Step 8: Create `frontend/tailwind.config.js`**

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: "#3B82F6",
          violet: "#8B5CF6",
          green: "#22C55E",
          yellow: "#EAB308",
        },
      },
      borderRadius: { xl2: "1.25rem" },
    },
  },
  plugins: [],
};
```

- [ ] **Step 9: Create `frontend/src/styles/index.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

html, body, #root { height: 100%; }
body { background: #ffffff; }

@layer components {
  .glass {
    @apply bg-white/60 backdrop-blur-xl border border-white/40 shadow-lg;
  }
}

@media (prefers-reduced-motion: reduce) {
  * { animation-duration: 0.001ms !important; transition-duration: 0.001ms !important; }
}
```

- [ ] **Step 10: Create `frontend/src/App.tsx`**

```tsx
export default function App() {
  return (
    <div className="min-h-full flex items-center justify-center">
      <div className="glass rounded-xl2 p-8">
        <h1 className="text-2xl font-semibold text-brand-blue">Cloudbase</h1>
      </div>
    </div>
  );
}
```

- [ ] **Step 11: Create `frontend/src/main.tsx`**

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

- [ ] **Step 12: Create `frontend/src/test/setup.ts`**

```typescript
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 13: Create `frontend/.gitignore`**

```
node_modules/
dist/
*.local
.vite/
coverage/
```

- [ ] **Step 14: Write `frontend/src/App.test.tsx`**

```tsx
import { render, screen } from "@testing-library/react";
import App from "./App";

test("renders app title", () => {
  render(<App />);
  expect(screen.getByText("Cloudbase")).toBeInTheDocument();
});
```

- [ ] **Step 15: Run tests**

Run: `cd /home/eshhh/Desktop/cloudbase-it/frontend && npm test`
Expected: 1 passed.

- [ ] **Step 16: Commit and push**

```bash
cd /home/eshhh/Desktop/cloudbase-it
git add frontend
git commit -m "feat(frontend): scaffold Vite + TS + Tailwind + Vitest harness"
git push origin main
```

---

### Task 2: Types + API client + query client + MSW harness

**Files:**
- Create: `frontend/src/types/index.ts`
- Create: `frontend/src/lib/axios.ts`
- Create: `frontend/src/lib/queryClient.ts`
- Create: `frontend/src/api/auth.ts`, `frontend/src/api/folders.ts`, `frontend/src/api/files.ts`, `frontend/src/api/trash.ts`, `frontend/src/api/search.ts`, `frontend/src/api/drive.ts`
- Create: `frontend/src/test/handlers.ts`, `frontend/src/test/server.ts`
- Modify: `frontend/src/test/setup.ts`
- Test: `frontend/src/lib/axios.test.ts`

**Interfaces:**
- Produces types: `User{id,email,display_name,storage_used_bytes,storage_quota_bytes}`, `Folder{id,owner_id,parent_id,name,is_trashed,created_at}`, `FileItem{id,name,folder_id?,mime_type?,size_bytes,status?,created_at?}`, `TrashItem{id,item_type,name,trashed_at}`, `DriveListing{folders:Folder[],files:FileItem[]}`, `SearchResult{id,type,name,mime_type?}`.
- Produces `api` (the axios instance) with a response interceptor: on 401 (not already retried, path not `/auth/refresh`), POST `/auth/refresh` once and retry the original request; on repeat failure reject.
- Produces API fns: `login`, `register`, `logout`, `getMe`; `createFolder`, `getFolder`, `getBreadcrumb`, `updateFolder`, `deleteFolder`; `initUpload`, `completeUpload`, `getFile`, `getDownloadUrl`, `updateFile`, `deleteFile`; `getTrash`, `restoreItem`, `purgeItem`; `search`; `getDrive`.
- Produces test helpers: `server` (MSW node server) and default `handlers`.

- [ ] **Step 1: Create `frontend/src/types/index.ts`**

```typescript
export interface User {
  id: string; email: string; display_name: string;
  storage_used_bytes: number; storage_quota_bytes: number;
}
export interface Folder {
  id: string; owner_id: string; parent_id: string | null;
  name: string; is_trashed: boolean; created_at: string;
}
export interface FileItem {
  id: string; name: string; folder_id?: string | null;
  mime_type?: string | null; size_bytes: number;
  status?: string; created_at?: string;
}
export interface TrashItem {
  id: string; item_type: "file" | "folder"; name: string; trashed_at: string | null;
}
export interface DriveListing { folders: Folder[]; files: FileItem[]; }
export interface FolderListing { folder: Folder; folders: Folder[]; files: FileItem[]; }
export interface BreadcrumbEntry { id: string; name: string; }
export interface SearchResult { id: string; type: "file" | "folder"; name: string; mime_type?: string | null; }
export interface InitUploadResponse { file_id: string; upload_url: string; storage_key: string; }
```

- [ ] **Step 2: Create `frontend/src/lib/axios.ts`**

```typescript
import axios from "axios";

export const api = axios.create({ baseURL: "/api", withCredentials: true });

let refreshing = false;

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;
    const isAuthRefresh = original?.url?.includes("/auth/refresh");
    if (status === 401 && !original?._retry && !isAuthRefresh) {
      original._retry = true;
      try {
        if (!refreshing) {
          refreshing = true;
          await api.post("/auth/refresh");
          refreshing = false;
        }
        return api(original);
      } catch (e) {
        refreshing = false;
        return Promise.reject(e);
      }
    }
    return Promise.reject(error);
  },
);
```

- [ ] **Step 3: Create `frontend/src/lib/queryClient.ts`**

```typescript
import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
});
```

- [ ] **Step 4: Create `frontend/src/api/auth.ts`**

```typescript
import { api } from "../lib/axios";
import type { User } from "../types";

export const login = (email: string, password: string) =>
  api.post<User>("/auth/login", { email, password }).then((r) => r.data);

export const register = (email: string, password: string, display_name: string) =>
  api.post<User>("/auth/register", { email, password, display_name }).then((r) => r.data);

export const logout = () => api.post("/auth/logout").then((r) => r.data);

export const getMe = () => api.get<User>("/auth/me").then((r) => r.data);
```

- [ ] **Step 5: Create `frontend/src/api/folders.ts`**

```typescript
import { api } from "../lib/axios";
import type { BreadcrumbEntry, Folder, FolderListing } from "../types";

export const createFolder = (name: string, parent_id: string | null) =>
  api.post<Folder>("/folders", { name, parent_id }).then((r) => r.data);

export const getFolder = (id: string) =>
  api.get<FolderListing>(`/folders/${id}`).then((r) => r.data);

export const getBreadcrumb = (id: string) =>
  api.get<BreadcrumbEntry[]>(`/folders/${id}/breadcrumb`).then((r) => r.data);

export const updateFolder = (id: string, body: { name?: string; parent_id?: string }) =>
  api.patch<Folder>(`/folders/${id}`, body).then((r) => r.data);

export const deleteFolder = (id: string) =>
  api.delete(`/folders/${id}`).then((r) => r.data);
```

- [ ] **Step 6: Create `frontend/src/api/files.ts`**

```typescript
import axios from "axios";
import { api } from "../lib/axios";
import type { FileItem, InitUploadResponse } from "../types";

export const initUpload = (body: { name: string; folder_id: string | null; mime_type: string | null; size_bytes: number }) =>
  api.post<InitUploadResponse>("/files/init-upload", body).then((r) => r.data);

export const putToSignedUrl = (
  url: string, file: File, onProgress?: (pct: number) => void,
) =>
  axios.put(url, file, {
    headers: { "Content-Type": file.type || "application/octet-stream" },
    onUploadProgress: (e) => {
      if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100));
    },
  });

export const completeUpload = (file_id: string) =>
  api.post<FileItem>("/files/complete-upload", { file_id }).then((r) => r.data);

export const getFile = (id: string) =>
  api.get<FileItem>(`/files/${id}`).then((r) => r.data);

export const getDownloadUrl = (id: string) =>
  api.get<{ download_url: string }>(`/files/${id}/download`).then((r) => r.data.download_url);

export const updateFile = (id: string, body: { name?: string; folder_id?: string }) =>
  api.patch<FileItem>(`/files/${id}`, body).then((r) => r.data);

export const deleteFile = (id: string) =>
  api.delete(`/files/${id}`).then((r) => r.data);
```

- [ ] **Step 7: Create `frontend/src/api/trash.ts`**

```typescript
import { api } from "../lib/axios";
import type { TrashItem } from "../types";

export const getTrash = () => api.get<TrashItem[]>("/trash").then((r) => r.data);

export const restoreItem = (item_type: "file" | "folder", id: string) =>
  api.post(`/trash/${item_type}/${id}/restore`).then((r) => r.data);

export const purgeItem = (item_type: "file" | "folder", id: string) =>
  api.delete(`/trash/${item_type}/${id}`).then((r) => r.data);
```

- [ ] **Step 8: Create `frontend/src/api/search.ts`**

```typescript
import { api } from "../lib/axios";
import type { SearchResult } from "../types";

export const search = (q: string, type: "all" | "file" | "folder" = "all") =>
  api.get<SearchResult[]>("/search", { params: { q, type } }).then((r) => r.data);
```

- [ ] **Step 9: Create `frontend/src/api/drive.ts`**

```typescript
import { api } from "../lib/axios";
import type { DriveListing } from "../types";

export const getDrive = () => api.get<DriveListing>("/drive").then((r) => r.data);
```

- [ ] **Step 10: Create `frontend/src/test/handlers.ts`**

```typescript
import { http, HttpResponse } from "msw";

export const handlers = [
  http.get("/api/auth/me", () =>
    HttpResponse.json({ id: "u1", email: "a@b.com", display_name: "A",
      storage_used_bytes: 0, storage_quota_bytes: 100 })),
  http.post("/api/auth/refresh", () => HttpResponse.json({ status: "refreshed" })),
];
```

- [ ] **Step 11: Create `frontend/src/test/server.ts`**

```typescript
import { setupServer } from "msw/node";
import { handlers } from "./handlers";

export const server = setupServer(...handlers);
```

- [ ] **Step 12: Update `frontend/src/test/setup.ts`**

```typescript
import "@testing-library/jest-dom/vitest";
import { afterAll, afterEach, beforeAll } from "vitest";
import { server } from "./server";

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

- [ ] **Step 13: Write `frontend/src/lib/axios.test.ts`**

```typescript
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { api } from "./axios";
import { server } from "../test/server";

describe("axios 401 refresh interceptor", () => {
  it("refreshes once on 401 then retries the original request", async () => {
    let calls = 0;
    server.use(
      http.get("/api/auth/me", () => {
        calls += 1;
        if (calls === 1) return new HttpResponse(null, { status: 401 });
        return HttpResponse.json({ id: "u1", email: "a@b.com", display_name: "A",
          storage_used_bytes: 0, storage_quota_bytes: 100 });
      }),
      http.post("/api/auth/refresh", () => HttpResponse.json({ status: "refreshed" })),
    );
    const res = await api.get("/auth/me");
    expect(res.status).toBe(200);
    expect(calls).toBe(2);
  });

  it("rejects when refresh also fails", async () => {
    server.use(
      http.get("/api/auth/me", () => new HttpResponse(null, { status: 401 })),
      http.post("/api/auth/refresh", () => new HttpResponse(null, { status: 401 })),
    );
    await expect(api.get("/auth/me")).rejects.toBeTruthy();
  });
});
```

- [ ] **Step 14: Run tests**

Run: `cd /home/eshhh/Desktop/cloudbase-it/frontend && npm test`
Expected: all pass (App test + 2 interceptor tests).

- [ ] **Step 15: Commit and push**

```bash
cd /home/eshhh/Desktop/cloudbase-it
git add frontend/src
git commit -m "feat(frontend): add types, axios client with 401-refresh, API layer, MSW harness"
git push origin main
```

---

### Task 3: UI primitives — Button, GlassCard, Modal, Toast, Spinner, ConfirmDialog

**Files:**
- Create: `frontend/src/components/ui/Button.tsx`, `GlassCard.tsx`, `Modal.tsx`, `Toast.tsx`, `Spinner.tsx`, `ConfirmDialog.tsx`
- Create: `frontend/src/components/ui/ToastContext.tsx`
- Test: `frontend/src/components/ui/Button.test.tsx`, `Modal.test.tsx`, `ConfirmDialog.test.tsx`

**Interfaces:**
- Produces `<Button intent="primary"|"secondary"|"success"|"warning"|"ghost" isLoading? {...buttonProps}>` — fully rounded, motion press.
- Produces `<GlassCard className?>` wrapper (adds `.glass rounded-xl2`).
- Produces `<Modal open onClose title children>` (framer-motion scale-in, backdrop click closes, Esc closes).
- Produces `<ConfirmDialog open title message confirmLabel onConfirm onClose>`.
- Produces `<Spinner />` and a toast system: `ToastProvider` + `useToast()` returning `{ notify(message, tone?) }`.

- [ ] **Step 1: Create `frontend/src/components/ui/Spinner.tsx`**

```tsx
export function Spinner() {
  return (
    <span
      role="status"
      aria-label="loading"
      className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-brand-blue border-t-transparent"
    />
  );
}
```

- [ ] **Step 2: Create `frontend/src/components/ui/Button.tsx`**

```tsx
import { motion } from "framer-motion";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Spinner } from "./Spinner";

type Intent = "primary" | "secondary" | "success" | "warning" | "ghost";

const INTENTS: Record<Intent, string> = {
  primary: "bg-brand-blue text-white",
  secondary: "bg-brand-violet text-white",
  success: "bg-brand-green text-white",
  warning: "bg-brand-yellow text-black",
  ghost: "glass text-slate-700",
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  intent?: Intent;
  isLoading?: boolean;
  children: ReactNode;
}

export function Button({ intent = "primary", isLoading, children, className = "", disabled, ...rest }: Props) {
  return (
    <motion.button
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      className={`rounded-full px-5 py-2.5 font-medium shadow-sm transition-colors disabled:opacity-50 ${INTENTS[intent]} ${className}`}
      disabled={disabled || isLoading}
      {...(rest as any)}
    >
      <span className="inline-flex items-center gap-2">{isLoading && <Spinner />}{children}</span>
    </motion.button>
  );
}
```

- [ ] **Step 3: Create `frontend/src/components/ui/GlassCard.tsx`**

```tsx
import type { ReactNode } from "react";

export function GlassCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`glass rounded-xl2 ${className}`}>{children}</div>;
}
```

- [ ] **Step 4: Create `frontend/src/components/ui/Modal.tsx`**

```tsx
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, type ReactNode } from "react";

interface Props { open: boolean; onClose: () => void; title?: string; children: ReactNode; }

export function Modal({ open, onClose, title, children }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/20"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog" aria-modal="true" aria-label={title}
            className="glass rounded-xl2 p-6 w-full max-w-md"
            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }} transition={{ type: "spring", duration: 0.3 }}
            onClick={(e) => e.stopPropagation()}
          >
            {title && <h2 className="mb-4 text-lg font-semibold text-slate-800">{title}</h2>}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 5: Create `frontend/src/components/ui/ConfirmDialog.tsx`**

```tsx
import { Button } from "./Button";
import { Modal } from "./Modal";

interface Props {
  open: boolean; title: string; message: string; confirmLabel?: string;
  onConfirm: () => void; onClose: () => void;
}

export function ConfirmDialog({ open, title, message, confirmLabel = "Confirm", onConfirm, onClose }: Props) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="mb-6 text-slate-600">{message}</p>
      <div className="flex justify-end gap-3">
        <Button intent="ghost" onClick={onClose}>Cancel</Button>
        <Button intent="warning" onClick={onConfirm}>{confirmLabel}</Button>
      </div>
    </Modal>
  );
}
```

- [ ] **Step 6: Create `frontend/src/components/ui/ToastContext.tsx`**

```tsx
import { AnimatePresence, motion } from "framer-motion";
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

type Tone = "info" | "success" | "error";
interface ToastState { id: number; message: string; tone: Tone; }
interface Ctx { notify: (message: string, tone?: Tone) => void; }

const ToastCtx = createContext<Ctx | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastState[]>([]);
  const notify = useCallback((message: string, tone: Tone = "info") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);
  const toneClass = { info: "text-brand-blue", success: "text-brand-green", error: "text-red-500" };
  return (
    <ToastCtx.Provider value={{ notify }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div key={t.id} role="alert"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className={`glass rounded-full px-4 py-2 text-sm font-medium ${toneClass[t.tone]}`}>
              {t.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast(): Ctx {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
```

- [ ] **Step 7: Create `frontend/src/components/ui/Toast.tsx`**

```tsx
export { ToastProvider, useToast } from "./ToastContext";
```

- [ ] **Step 8: Write `frontend/src/components/ui/Button.test.tsx`**

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "./Button";

test("calls onClick and shows loading spinner", async () => {
  const onClick = vi.fn();
  const { rerender } = render(<Button onClick={onClick}>Save</Button>);
  await userEvent.click(screen.getByRole("button", { name: "Save" }));
  expect(onClick).toHaveBeenCalledOnce();

  rerender(<Button isLoading>Save</Button>);
  expect(screen.getByRole("status")).toBeInTheDocument();
  expect(screen.getByRole("button")).toBeDisabled();
});
```

- [ ] **Step 9: Write `frontend/src/components/ui/Modal.test.tsx`**

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Modal } from "./Modal";

test("renders when open and closes on Escape", async () => {
  const onClose = vi.fn();
  render(<Modal open onClose={onClose} title="Hello"><p>Body</p></Modal>);
  expect(screen.getByRole("dialog")).toBeInTheDocument();
  expect(screen.getByText("Body")).toBeInTheDocument();
  await userEvent.keyboard("{Escape}");
  expect(onClose).toHaveBeenCalled();
});

test("does not render when closed", () => {
  render(<Modal open={false} onClose={() => {}}><p>Body</p></Modal>);
  expect(screen.queryByText("Body")).not.toBeInTheDocument();
});
```

- [ ] **Step 10: Write `frontend/src/components/ui/ConfirmDialog.test.tsx`**

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfirmDialog } from "./ConfirmDialog";

test("confirm and cancel fire the right callbacks", async () => {
  const onConfirm = vi.fn();
  const onClose = vi.fn();
  render(<ConfirmDialog open title="Delete?" message="Sure?" confirmLabel="Delete"
    onConfirm={onConfirm} onClose={onClose} />);
  await userEvent.click(screen.getByRole("button", { name: "Delete" }));
  expect(onConfirm).toHaveBeenCalled();
  await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(onClose).toHaveBeenCalled();
});
```

- [ ] **Step 11: Run tests**

Run: `cd /home/eshhh/Desktop/cloudbase-it/frontend && npm test`
Expected: all pass.

- [ ] **Step 12: Commit and push**

```bash
cd /home/eshhh/Desktop/cloudbase-it
git add frontend/src/components/ui
git commit -m "feat(frontend): add glass UI primitives (button, modal, toast, confirm)"
git push origin main
```

---

### Task 4: Lottie character + auth hook + Login/Register pages

**Files:**
- Create: `frontend/src/components/LottieCharacter.tsx`
- Create: `frontend/src/assets/lottie/` (idle.json, yes.json, no.json, write.json)
- Create: `frontend/src/hooks/useAuth.ts`
- Create: `frontend/src/pages/LoginPage.tsx`, `frontend/src/pages/RegisterPage.tsx`
- Create: `frontend/src/routes/ProtectedRoute.tsx`
- Create: `frontend/src/test/__mocks__/lottie-react.tsx`
- Modify: `frontend/vite.config.ts` (add lottie-react to test alias — see step) — actually done via Vitest `test.alias`.
- Test: `frontend/src/pages/LoginPage.test.tsx`, `frontend/src/pages/RegisterPage.test.tsx`

**Interfaces:**
- Consumes: `login`, `register`, `getMe` (api/auth), `useToast`, `Button`, `GlassCard`.
- Produces: `useAuth()` → `{ user, isLoading, isError, loginMut, registerMut, logoutMut, refetchMe }` built on React Query (`me` query + mutations). `loginMut`/`registerMut` expose `mutateAsync`, `isPending`, `isError`, `isSuccess`.
- Produces: `<LottieCharacter state="idle"|"yes"|"no"|"write"|"success" />` — renders the mapped Lottie; state→asset mapping centralized here.
- Produces: `<ProtectedRoute>` that shows children only when `getMe` resolves, else `<Navigate to="/login">`.

- [ ] **Step 1: Source the Lottie assets**

Download four small free Lottie JSON files from LottieFiles into `frontend/src/assets/lottie/` named `idle.json`, `yes.json`, `no.json`, `write.json`. Pick a friendly character/animal where available: a nod/approve for `yes.json`, a head-shake/deny for `no.json`, a writing/note-taking for `write.json`, and a neutral idle loop for `idle.json`. If exact matches are unavailable, use the closest free character animations (approve/deny/writing/idle). Verify each file is valid JSON:

Run: `cd /home/eshhh/Desktop/cloudbase-it/frontend && for f in idle yes no write; do node -e "JSON.parse(require('fs').readFileSync('src/assets/lottie/$f.json'))" && echo "$f ok"; done`
Expected: `idle ok`, `yes ok`, `no ok`, `write ok`.

If a source cannot be reached, create a minimal valid placeholder Lottie so the app builds (a 1-frame empty animation `{"v":"5.7.0","fr":30,"ip":0,"op":30,"w":100,"h":100,"nm":"placeholder","ddd":0,"assets":[],"layers":[]}`) and record in the report that real assets must be swapped in.

- [ ] **Step 2: Create `frontend/src/components/LottieCharacter.tsx`**

```tsx
import Lottie from "lottie-react";
import idle from "../assets/lottie/idle.json";
import yes from "../assets/lottie/yes.json";
import no from "../assets/lottie/no.json";
import write from "../assets/lottie/write.json";

export type CharacterState = "idle" | "yes" | "no" | "write" | "success";

const MAP: Record<CharacterState, unknown> = {
  idle, yes, no, write, success: yes,
};

export function LottieCharacter({ state, className = "" }: { state: CharacterState; className?: string }) {
  const loop = state === "idle";
  return (
    <div className={className} data-testid="lottie-character" data-state={state}>
      <Lottie animationData={MAP[state] as object} loop={loop} autoplay />
    </div>
  );
}
```

- [ ] **Step 3: Create the Lottie test mock `frontend/src/test/__mocks__/lottie-react.tsx`**

```tsx
export default function LottieMock() {
  return <div data-testid="lottie-mock" />;
}
```

- [ ] **Step 4: Alias lottie-react in tests — update `frontend/vite.config.ts` `test` block**

Add a `resolve`/`test.alias` so the heavy Lottie player is stubbed in jsdom:

```typescript
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    css: true,
    alias: [{ find: "lottie-react", replacement: "/src/test/__mocks__/lottie-react.tsx" }],
  },
```

- [ ] **Step 5: Create `frontend/src/hooks/useAuth.ts`**

```typescript
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as authApi from "../api/auth";

export function useAuth() {
  const qc = useQueryClient();
  const me = useQuery({ queryKey: ["me"], queryFn: authApi.getMe });

  const loginMut = useMutation({
    mutationFn: (v: { email: string; password: string }) => authApi.login(v.email, v.password),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["me"] }),
  });

  const registerMut = useMutation({
    mutationFn: (v: { email: string; password: string; display_name: string }) =>
      authApi.register(v.email, v.password, v.display_name),
  });

  const logoutMut = useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => qc.setQueryData(["me"], null),
  });

  return {
    user: me.data ?? null,
    isLoading: me.isLoading,
    isError: me.isError,
    refetchMe: me.refetch,
    loginMut, registerMut, logoutMut,
  };
}
```

- [ ] **Step 6: Create `frontend/src/routes/ProtectedRoute.tsx`**

```tsx
import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { Spinner } from "../components/ui/Spinner";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, isLoading, isError } = useAuth();
  if (isLoading) return <div className="flex h-full items-center justify-center"><Spinner /></div>;
  if (isError || !user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
```

- [ ] **Step 7: Create `frontend/src/pages/LoginPage.tsx`**

```tsx
import { motion } from "framer-motion";
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { GlassCard } from "../components/ui/GlassCard";
import { Button } from "../components/ui/Button";
import { LottieCharacter, type CharacterState } from "../components/LottieCharacter";
import { useAuth } from "../hooks/useAuth";

export default function LoginPage() {
  const { loginMut } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [state, setState] = useState<CharacterState>("idle");
  const [error, setError] = useState("");
  const [shake, setShake] = useState(0);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await loginMut.mutateAsync({ email, password });
      setState("yes");
      setTimeout(() => nav("/"), 700);
    } catch {
      setState("no");
      setError("Invalid email or password");
      setShake((s) => s + 1);
    }
  }

  return (
    <div className="flex min-h-full items-center justify-center p-4">
      <GlassCard className="w-full max-w-md p-8">
        <LottieCharacter state={state} className="mx-auto mb-4 h-40 w-40" />
        <h1 className="mb-6 text-center text-2xl font-semibold text-brand-blue">Welcome back</h1>
        <motion.form onSubmit={onSubmit} key={shake}
          animate={shake ? { x: [0, -8, 8, -6, 6, 0] } : {}} transition={{ duration: 0.4 }}
          className="space-y-4">
          <input aria-label="Email" type="email" required value={email}
            onChange={(e) => setEmail(e.target.value)} placeholder="Email"
            className="w-full rounded-full border border-white/50 bg-white/70 px-4 py-2.5 outline-none focus:ring-2 focus:ring-brand-violet" />
          <input aria-label="Password" type="password" required value={password}
            onChange={(e) => setPassword(e.target.value)} placeholder="Password"
            className="w-full rounded-full border border-white/50 bg-white/70 px-4 py-2.5 outline-none focus:ring-2 focus:ring-brand-violet" />
          {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
          <Button type="submit" intent="primary" isLoading={loginMut.isPending} className="w-full">
            Log in
          </Button>
        </motion.form>
        <p className="mt-4 text-center text-sm text-slate-500">
          No account? <Link to="/register" className="text-brand-violet">Create one</Link>
        </p>
      </GlassCard>
    </div>
  );
}
```

- [ ] **Step 8: Create `frontend/src/pages/RegisterPage.tsx`**

```tsx
import { motion } from "framer-motion";
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { GlassCard } from "../components/ui/GlassCard";
import { Button } from "../components/ui/Button";
import { LottieCharacter, type CharacterState } from "../components/LottieCharacter";
import { useAuth } from "../hooks/useAuth";

export default function RegisterPage() {
  const { registerMut } = useAuth();
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [state, setState] = useState<CharacterState>("idle");
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setState("write");
    try {
      await registerMut.mutateAsync({ email, password, display_name: name });
      setState("success");
      setTimeout(() => nav("/login"), 800);
    } catch (err: any) {
      setState("no");
      setError(err?.response?.status === 409 ? "That email is already registered" : "Could not create account");
    }
  }

  return (
    <div className="flex min-h-full items-center justify-center p-4">
      <GlassCard className="w-full max-w-md p-8">
        <LottieCharacter state={state} className="mx-auto mb-4 h-40 w-40" />
        <h1 className="mb-6 text-center text-2xl font-semibold text-brand-violet">Create account</h1>
        <motion.form onSubmit={onSubmit} className="space-y-4">
          <input aria-label="Name" required value={name} onChange={(e) => { setName(e.target.value); setState("write"); }}
            placeholder="Display name"
            className="w-full rounded-full border border-white/50 bg-white/70 px-4 py-2.5 outline-none focus:ring-2 focus:ring-brand-violet" />
          <input aria-label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full rounded-full border border-white/50 bg-white/70 px-4 py-2.5 outline-none focus:ring-2 focus:ring-brand-violet" />
          <input aria-label="Password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full rounded-full border border-white/50 bg-white/70 px-4 py-2.5 outline-none focus:ring-2 focus:ring-brand-violet" />
          {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
          <Button type="submit" intent="secondary" isLoading={registerMut.isPending} className="w-full">
            Sign up
          </Button>
        </motion.form>
        <p className="mt-4 text-center text-sm text-slate-500">
          Have an account? <Link to="/login" className="text-brand-blue">Log in</Link>
        </p>
      </GlassCard>
    </div>
  );
}
```

- [ ] **Step 9: Write `frontend/src/pages/LoginPage.test.tsx`**

```tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { queryClient } from "../lib/queryClient";
import { server } from "../test/server";
import LoginPage from "./LoginPage";

function renderPage() {
  queryClient.clear();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter><LoginPage /></MemoryRouter>
    </QueryClientProvider>,
  );
}

test("successful login sets character to 'yes'", async () => {
  server.use(http.post("/api/auth/login", () =>
    HttpResponse.json({ id: "u1", email: "a@b.com", display_name: "A", storage_used_bytes: 0, storage_quota_bytes: 1 })));
  renderPage();
  await userEvent.type(screen.getByLabelText("Email"), "a@b.com");
  await userEvent.type(screen.getByLabelText("Password"), "pw");
  await userEvent.click(screen.getByRole("button", { name: "Log in" }));
  await waitFor(() => expect(screen.getByTestId("lottie-character")).toHaveAttribute("data-state", "yes"));
});

test("failed login sets character to 'no' and shows error", async () => {
  server.use(http.post("/api/auth/login", () => new HttpResponse(null, { status: 401 })));
  renderPage();
  await userEvent.type(screen.getByLabelText("Email"), "a@b.com");
  await userEvent.type(screen.getByLabelText("Password"), "bad");
  await userEvent.click(screen.getByRole("button", { name: "Log in" }));
  await waitFor(() => expect(screen.getByTestId("lottie-character")).toHaveAttribute("data-state", "no"));
  expect(screen.getByRole("alert")).toHaveTextContent(/invalid/i);
});
```

- [ ] **Step 10: Write `frontend/src/pages/RegisterPage.test.tsx`**

```tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { queryClient } from "../lib/queryClient";
import { server } from "../test/server";
import RegisterPage from "./RegisterPage";

function renderPage() {
  queryClient.clear();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter><RegisterPage /></MemoryRouter>
    </QueryClientProvider>,
  );
}

test("duplicate email shows 'no' state and 409 message", async () => {
  server.use(http.post("/api/auth/register", () => new HttpResponse(null, { status: 409 })));
  renderPage();
  await userEvent.type(screen.getByLabelText("Name"), "A");
  await userEvent.type(screen.getByLabelText("Email"), "a@b.com");
  await userEvent.type(screen.getByLabelText("Password"), "pw");
  await userEvent.click(screen.getByRole("button", { name: "Sign up" }));
  await waitFor(() => expect(screen.getByTestId("lottie-character")).toHaveAttribute("data-state", "no"));
  expect(screen.getByRole("alert")).toHaveTextContent(/already registered/i);
});
```

- [ ] **Step 11: Run tests**

Run: `cd /home/eshhh/Desktop/cloudbase-it/frontend && npm test`
Expected: all pass.

- [ ] **Step 12: Commit and push**

```bash
cd /home/eshhh/Desktop/cloudbase-it
git add frontend/src frontend/vite.config.ts
git commit -m "feat(frontend): add Lottie auth character, useAuth, login/register pages"
git push origin main
```

---

### Task 5: App shell — router, providers, Sidebar, Topbar

**Files:**
- Modify: `frontend/src/App.tsx`, `frontend/src/main.tsx`
- Create: `frontend/src/router.tsx`
- Create: `frontend/src/components/layout/Sidebar.tsx`, `frontend/src/components/layout/Topbar.tsx`, `frontend/src/components/layout/AppLayout.tsx`
- Create: `frontend/src/pages/DashboardPage.tsx` (placeholder body, filled in Task 6)
- Create: `frontend/src/pages/TrashPage.tsx` (placeholder body, filled in Task 8)
- Test: `frontend/src/components/layout/Sidebar.test.tsx`

**Interfaces:**
- Consumes: `useAuth`, `ProtectedRoute`, `ToastProvider`, `queryClient`.
- Produces: `router` (createBrowserRouter or `<Routes>`) with `/login`, `/register`, protected `/` (Dashboard), `/folder/:id` (Dashboard), `/trash`.
- Produces: `<AppLayout>` (Sidebar + Topbar + `<Outlet/>`), `<Sidebar>` (links: My Drive, Trash; logout button), `<Topbar>` (search slot + user name).

- [ ] **Step 1: Create `frontend/src/components/layout/Sidebar.tsx`**

```tsx
import { NavLink } from "react-router-dom";
import { Button } from "../ui/Button";
import { useAuth } from "../../hooks/useAuth";

export function Sidebar() {
  const { logoutMut } = useAuth();
  const link = "block rounded-full px-4 py-2 font-medium transition-colors";
  const active = "bg-brand-blue text-white";
  const idle = "text-slate-600 hover:bg-white/60";
  return (
    <aside className="glass m-3 flex w-56 flex-col gap-2 rounded-xl2 p-4">
      <h2 className="px-2 pb-2 text-xl font-bold text-brand-violet">Cloudbase</h2>
      <NavLink to="/" end className={({ isActive }) => `${link} ${isActive ? active : idle}`}>My Drive</NavLink>
      <NavLink to="/trash" className={({ isActive }) => `${link} ${isActive ? active : idle}`}>Trash</NavLink>
      <div className="mt-auto">
        <Button intent="ghost" className="w-full" onClick={() => logoutMut.mutate()}>Log out</Button>
      </div>
    </aside>
  );
}
```

- [ ] **Step 2: Create `frontend/src/components/layout/Topbar.tsx`**

```tsx
import type { ReactNode } from "react";
import { useAuth } from "../../hooks/useAuth";

export function Topbar({ children }: { children?: ReactNode }) {
  const { user } = useAuth();
  return (
    <header className="glass m-3 mb-0 flex items-center gap-4 rounded-xl2 px-5 py-3">
      <div className="flex-1">{children}</div>
      <span className="text-sm text-slate-600">{user?.display_name}</span>
    </header>
  );
}
```

- [ ] **Step 3: Create `frontend/src/components/layout/AppLayout.tsx`**

```tsx
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";

export function AppLayout() {
  return (
    <div className="flex h-full">
      <Sidebar />
      <main className="flex-1 overflow-auto"><Outlet /></main>
    </div>
  );
}
```

- [ ] **Step 4: Create placeholder `frontend/src/pages/DashboardPage.tsx`**

```tsx
export default function DashboardPage() {
  return <div className="p-6" data-testid="dashboard">Dashboard</div>;
}
```

- [ ] **Step 5: Create placeholder `frontend/src/pages/TrashPage.tsx`**

```tsx
export default function TrashPage() {
  return <div className="p-6" data-testid="trash-page">Trash</div>;
}
```

- [ ] **Step 6: Create `frontend/src/router.tsx`**

```tsx
import { createBrowserRouter } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import TrashPage from "./pages/TrashPage";
import { AppLayout } from "./components/layout/AppLayout";
import { ProtectedRoute } from "./routes/ProtectedRoute";

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  { path: "/register", element: <RegisterPage /> },
  {
    path: "/",
    element: <ProtectedRoute><AppLayout /></ProtectedRoute>,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "folder/:id", element: <DashboardPage /> },
      { path: "trash", element: <TrashPage /> },
    ],
  },
]);
```

- [ ] **Step 7: Replace `frontend/src/App.tsx`**

```tsx
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import { queryClient } from "./lib/queryClient";
import { ToastProvider } from "./components/ui/Toast";
import { router } from "./router";

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </QueryClientProvider>
  );
}
```

- [ ] **Step 8: Update `frontend/src/App.test.tsx`** (App now renders the router; assert login route renders when unauthenticated)

```tsx
import { render, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { server } from "./test/server";
import App from "./App";

test("unauthenticated user lands on login", async () => {
  server.use(http.get("/api/auth/me", () => new HttpResponse(null, { status: 401 })));
  window.history.pushState({}, "", "/");
  render(<App />);
  await waitFor(() => expect(screen.getByText("Welcome back")).toBeInTheDocument());
});
```

- [ ] **Step 9: Write `frontend/src/components/layout/Sidebar.test.tsx`**

```tsx
import { render, screen } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { queryClient } from "../../lib/queryClient";
import { Sidebar } from "./Sidebar";

test("shows nav links and logout", () => {
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter><Sidebar /></MemoryRouter>
    </QueryClientProvider>,
  );
  expect(screen.getByText("My Drive")).toBeInTheDocument();
  expect(screen.getByText("Trash")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Log out" })).toBeInTheDocument();
});
```

- [ ] **Step 10: Run tests**

Run: `cd /home/eshhh/Desktop/cloudbase-it/frontend && npm test`
Expected: all pass.

- [ ] **Step 11: Commit and push**

```bash
cd /home/eshhh/Desktop/cloudbase-it
git add frontend/src
git commit -m "feat(frontend): add router, providers, sidebar/topbar app shell"
git push origin main
```

---

### Task 6: Browse — useFolder/useDrive, FileGrid, Breadcrumb, Dashboard

**Files:**
- Create: `frontend/src/hooks/useDrive.ts`, `frontend/src/hooks/useFolder.ts`
- Create: `frontend/src/components/files/FileGrid.tsx`, `FolderRow.tsx`, `FileRow.tsx`
- Create: `frontend/src/components/layout/Breadcrumb.tsx`
- Modify: `frontend/src/pages/DashboardPage.tsx`
- Test: `frontend/src/pages/DashboardPage.test.tsx`

**Interfaces:**
- Consumes: `getDrive`, `getFolder`, `getBreadcrumb`, `createFolder`, types.
- Produces: `useDrive()` → query of `DriveListing`; `useFolder(id)` → `{ listing, breadcrumb }` queries. Both keyed by `["drive"]` / `["folder", id]`.
- Produces: `<FileGrid folders files onOpenFolder onDownload onRename onMove onDelete />`; `<Breadcrumb entries onNavigate />`.
- Produces: `DashboardPage` reads `:id` param → drive at root, folder listing inside; a "New folder" button (uses `createFolder` + invalidates).

- [ ] **Step 1: Create `frontend/src/hooks/useDrive.ts`**

```typescript
import { useQuery } from "@tanstack/react-query";
import { getDrive } from "../api/drive";

export function useDrive() {
  return useQuery({ queryKey: ["drive"], queryFn: getDrive });
}
```

- [ ] **Step 2: Create `frontend/src/hooks/useFolder.ts`**

```typescript
import { useQuery } from "@tanstack/react-query";
import { getBreadcrumb, getFolder } from "../api/folders";

export function useFolder(id: string) {
  const enabled = id !== "";
  const listing = useQuery({ queryKey: ["folder", id], queryFn: () => getFolder(id), enabled });
  const breadcrumb = useQuery({ queryKey: ["breadcrumb", id], queryFn: () => getBreadcrumb(id), enabled });
  return { listing, breadcrumb };
}
```

- [ ] **Step 3: Create `frontend/src/components/files/FolderRow.tsx`**

```tsx
import { motion } from "framer-motion";
import type { Folder } from "../../types";

export function FolderRow({ folder, onOpen, onRename, onDelete }: {
  folder: Folder; onOpen: (id: string) => void;
  onRename: (f: Folder) => void; onDelete: (f: Folder) => void;
}) {
  return (
    <motion.div layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      className="glass flex items-center gap-3 rounded-xl2 p-4">
      <button className="flex-1 text-left font-medium text-slate-700" onClick={() => onOpen(folder.id)}>
        📁 {folder.name}
      </button>
      <button aria-label={`Rename ${folder.name}`} onClick={() => onRename(folder)} className="text-brand-blue">✎</button>
      <button aria-label={`Delete ${folder.name}`} onClick={() => onDelete(folder)} className="text-red-500">🗑</button>
    </motion.div>
  );
}
```

- [ ] **Step 4: Create `frontend/src/components/files/FileRow.tsx`**

```tsx
import { motion } from "framer-motion";
import type { FileItem } from "../../types";

export function FileRow({ file, onDownload, onRename, onMove, onDelete }: {
  file: FileItem; onDownload: (f: FileItem) => void; onRename: (f: FileItem) => void;
  onMove: (f: FileItem) => void; onDelete: (f: FileItem) => void;
}) {
  return (
    <motion.div layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      className="glass flex items-center gap-3 rounded-xl2 p-4">
      <span className="flex-1 truncate font-medium text-slate-700">📄 {file.name}</span>
      <button aria-label={`Download ${file.name}`} onClick={() => onDownload(file)} className="text-brand-green">⬇</button>
      <button aria-label={`Rename ${file.name}`} onClick={() => onRename(file)} className="text-brand-blue">✎</button>
      <button aria-label={`Move ${file.name}`} onClick={() => onMove(file)} className="text-brand-violet">➜</button>
      <button aria-label={`Delete ${file.name}`} onClick={() => onDelete(file)} className="text-red-500">🗑</button>
    </motion.div>
  );
}
```

- [ ] **Step 5: Create `frontend/src/components/files/FileGrid.tsx`**

```tsx
import type { FileItem, Folder } from "../../types";
import { FolderRow } from "./FolderRow";
import { FileRow } from "./FileRow";

interface Props {
  folders: Folder[]; files: FileItem[];
  onOpenFolder: (id: string) => void;
  onDownload: (f: FileItem) => void;
  onRenameFile: (f: FileItem) => void;
  onRenameFolder: (f: Folder) => void;
  onMove: (f: FileItem) => void;
  onDeleteFile: (f: FileItem) => void;
  onDeleteFolder: (f: Folder) => void;
}

export function FileGrid(p: Props) {
  if (p.folders.length === 0 && p.files.length === 0) {
    return <p className="p-8 text-center text-slate-400">This folder is empty.</p>;
  }
  return (
    <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
      {p.folders.map((f) => (
        <FolderRow key={f.id} folder={f} onOpen={p.onOpenFolder}
          onRename={p.onRenameFolder} onDelete={p.onDeleteFolder} />
      ))}
      {p.files.map((f) => (
        <FileRow key={f.id} file={f} onDownload={p.onDownload} onRename={p.onRenameFile}
          onMove={p.onMove} onDelete={p.onDeleteFile} />
      ))}
    </div>
  );
}
```

- [ ] **Step 6: Create `frontend/src/components/layout/Breadcrumb.tsx`**

```tsx
import type { BreadcrumbEntry } from "../../types";

export function Breadcrumb({ entries, onNavigate }: {
  entries: BreadcrumbEntry[]; onNavigate: (id: string | null) => void;
}) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm text-slate-600">
      <button className="text-brand-blue" onClick={() => onNavigate(null)}>My Drive</button>
      {entries.map((e) => (
        <span key={e.id} className="flex items-center gap-1">
          <span className="text-slate-300">/</span>
          <button className="hover:text-brand-blue" onClick={() => onNavigate(e.id)}>{e.name}</button>
        </span>
      ))}
    </nav>
  );
}
```

- [ ] **Step 7: Replace `frontend/src/pages/DashboardPage.tsx`**

```tsx
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Topbar } from "../components/layout/Topbar";
import { Breadcrumb } from "../components/layout/Breadcrumb";
import { FileGrid } from "../components/files/FileGrid";
import { Button } from "../components/ui/Button";
import { Spinner } from "../components/ui/Spinner";
import { useDrive } from "../hooks/useDrive";
import { useFolder } from "../hooks/useFolder";
import { createFolder, deleteFolder } from "../api/folders";
import { deleteFile, getDownloadUrl } from "../api/files";
import { useToast } from "../components/ui/Toast";

export default function DashboardPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const { notify } = useToast();
  const drive = useDrive();
  const folder = useFolder(id ?? "");

  const isRoot = !id;
  const listing = isRoot ? drive.data : folder.listing.data;
  const loading = isRoot ? drive.isLoading : folder.listing.isLoading;

  const folders = isRoot ? drive.data?.folders ?? [] : folder.listing.data?.folders ?? [];
  const files = isRoot ? drive.data?.files ?? [] : folder.listing.data?.files ?? [];

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: isRoot ? ["drive"] : ["folder", id] });
  };

  async function onNewFolder() {
    const name = prompt("Folder name");
    if (!name) return;
    await createFolder(name, id ?? null);
    invalidate();
    notify("Folder created", "success");
  }

  async function onDownload(f: { id: string }) {
    const url = await getDownloadUrl(f.id);
    window.open(url, "_blank");
  }

  async function onDeleteFile(f: { id: string }) {
    await deleteFile(f.id); invalidate(); notify("Moved to trash", "info");
  }
  async function onDeleteFolder(f: { id: string }) {
    await deleteFolder(f.id); invalidate(); notify("Folder trashed", "info");
  }

  return (
    <div>
      <Topbar />
      <div className="flex items-center justify-between px-6 py-4">
        <Breadcrumb entries={isRoot ? [] : folder.breadcrumb.data ?? []}
          onNavigate={(fid) => nav(fid ? `/folder/${fid}` : "/")} />
        <Button intent="primary" onClick={onNewFolder}>New folder</Button>
      </div>
      {loading ? (
        <div className="flex justify-center p-10"><Spinner /></div>
      ) : (
        <FileGrid
          folders={folders} files={files}
          onOpenFolder={(fid) => nav(`/folder/${fid}`)}
          onDownload={onDownload}
          onRenameFile={() => {}} onRenameFolder={() => {}} onMove={() => {}}
          onDeleteFile={onDeleteFile} onDeleteFolder={onDeleteFolder}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 8: Write `frontend/src/pages/DashboardPage.test.tsx`**

```tsx
import { render, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { queryClient } from "../lib/queryClient";
import { server } from "../test/server";
import DashboardPage from "./DashboardPage";
import { ToastProvider } from "../components/ui/Toast";

function renderDash() {
  queryClient.clear();
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <MemoryRouter><DashboardPage /></MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

test("root shows drive folders and files", async () => {
  server.use(http.get("/api/drive", () => HttpResponse.json({
    folders: [{ id: "f1", owner_id: "u1", parent_id: null, name: "Docs", is_trashed: false, created_at: "" }],
    files: [{ id: "x1", name: "note.txt", size_bytes: 3, mime_type: "text/plain" }],
  })));
  renderDash();
  await waitFor(() => expect(screen.getByText(/Docs/)).toBeInTheDocument());
  expect(screen.getByText(/note.txt/)).toBeInTheDocument();
});
```

- [ ] **Step 9: Run tests**

Run: `cd /home/eshhh/Desktop/cloudbase-it/frontend && npm test`
Expected: all pass.

- [ ] **Step 10: Commit and push**

```bash
cd /home/eshhh/Desktop/cloudbase-it
git add frontend/src
git commit -m "feat(frontend): add drive/folder browsing, file grid, breadcrumb, dashboard"
git push origin main
```

---

### Task 7: Upload & download — UploadDropzone + useUpload

**Files:**
- Create: `frontend/src/hooks/useUpload.ts`
- Create: `frontend/src/components/files/UploadDropzone.tsx`
- Modify: `frontend/src/pages/DashboardPage.tsx` (mount the dropzone)
- Test: `frontend/src/hooks/useUpload.test.tsx`

**Interfaces:**
- Consumes: `initUpload`, `putToSignedUrl`, `completeUpload` (api/files).
- Produces: `useUpload(folderId, onDone)` → `{ uploads, upload(files) }` where `uploads` is a map of `{name, pct, status}`. `upload` runs init → PUT(signed) → complete per file, updating progress, then calls `onDone` to invalidate.
- Produces: `<UploadDropzone folderId onUploaded />` (react-dropzone; shows per-file progress bars; green when complete).

- [ ] **Step 1: Create `frontend/src/hooks/useUpload.ts`**

```typescript
import { useState } from "react";
import { completeUpload, initUpload, putToSignedUrl } from "../api/files";

export interface UploadState { name: string; pct: number; status: "uploading" | "done" | "error"; }

export function useUpload(folderId: string | null, onDone?: () => void) {
  const [uploads, setUploads] = useState<Record<string, UploadState>>({});

  async function upload(files: File[]) {
    for (const file of files) {
      const key = `${file.name}-${Date.now()}`;
      setUploads((u) => ({ ...u, [key]: { name: file.name, pct: 0, status: "uploading" } }));
      try {
        const init = await initUpload({
          name: file.name, folder_id: folderId,
          mime_type: file.type || null, size_bytes: file.size,
        });
        await putToSignedUrl(init.upload_url, file, (pct) =>
          setUploads((u) => ({ ...u, [key]: { ...u[key], pct } })));
        await completeUpload(init.file_id);
        setUploads((u) => ({ ...u, [key]: { ...u[key], pct: 100, status: "done" } }));
      } catch {
        setUploads((u) => ({ ...u, [key]: { ...u[key], status: "error" } }));
      }
    }
    onDone?.();
  }

  return { uploads, upload };
}
```

- [ ] **Step 2: Create `frontend/src/components/files/UploadDropzone.tsx`**

```tsx
import { useDropzone } from "react-dropzone";
import { useUpload } from "../../hooks/useUpload";

export function UploadDropzone({ folderId, onUploaded }: { folderId: string | null; onUploaded: () => void }) {
  const { uploads, upload } = useUpload(folderId, onUploaded);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop: (files) => upload(files) });
  const list = Object.entries(uploads);

  return (
    <div className="px-6">
      <div {...getRootProps()}
        className={`glass cursor-pointer rounded-xl2 border-2 border-dashed p-6 text-center transition-colors ${isDragActive ? "border-brand-blue bg-brand-blue/10" : "border-white/50"}`}>
        <input {...getInputProps()} aria-label="Upload files" />
        <p className="text-slate-500">Drag & drop files here, or click to select</p>
      </div>
      {list.length > 0 && (
        <ul className="mt-3 space-y-2">
          {list.map(([k, u]) => (
            <li key={k} className="glass rounded-full px-4 py-2 text-sm">
              <span className={u.status === "done" ? "text-brand-green" : u.status === "error" ? "text-red-500" : "text-slate-600"}>
                {u.name} — {u.status === "done" ? "done" : u.status === "error" ? "failed" : `${u.pct}%`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Mount in `DashboardPage.tsx`** — import and render `<UploadDropzone folderId={id ?? null} onUploaded={invalidate} />` directly under the breadcrumb row (above `<FileGrid>`). Add `import { UploadDropzone } from "../components/files/UploadDropzone";` and place `<UploadDropzone folderId={id ?? null} onUploaded={invalidate} />` before the `loading ?` block.

- [ ] **Step 4: Write `frontend/src/hooks/useUpload.test.tsx`**

```tsx
import { renderHook, act, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { server } from "../test/server";
import { useUpload } from "./useUpload";

test("runs init -> put -> complete and marks done", async () => {
  const seen: string[] = [];
  server.use(
    http.post("/api/files/init-upload", async () => {
      seen.push("init");
      return HttpResponse.json({ file_id: "f1", upload_url: "https://storage.test/put/f1", storage_key: "k" });
    }),
    http.put("https://storage.test/put/f1", () => { seen.push("put"); return new HttpResponse(null, { status: 200 }); }),
    http.post("/api/files/complete-upload", () => {
      seen.push("complete");
      return HttpResponse.json({ id: "f1", name: "a.txt", size_bytes: 3, status: "ready" });
    }),
  );

  const onDone = vi.fn();
  const { result } = renderHook(() => useUpload(null, onDone));
  const file = new File(["abc"], "a.txt", { type: "text/plain" });
  await act(async () => { await result.current.upload([file]); });

  await waitFor(() => expect(Object.values(result.current.uploads)[0].status).toBe("done"));
  expect(seen).toEqual(["init", "put", "complete"]);
  expect(onDone).toHaveBeenCalled();
});
```

- [ ] **Step 5: Run tests**

Run: `cd /home/eshhh/Desktop/cloudbase-it/frontend && npm test`
Expected: all pass.

- [ ] **Step 6: Commit and push**

```bash
cd /home/eshhh/Desktop/cloudbase-it
git add frontend/src
git commit -m "feat(frontend): add drag-and-drop upload with progress and download"
git push origin main
```

---

### Task 8: Rename & Move modals, Trash page

**Files:**
- Create: `frontend/src/components/files/RenameModal.tsx`, `MoveModal.tsx`
- Create: `frontend/src/hooks/useTrash.ts`
- Modify: `frontend/src/pages/DashboardPage.tsx` (wire rename/move modals)
- Modify: `frontend/src/pages/TrashPage.tsx`
- Test: `frontend/src/pages/TrashPage.test.tsx`, `frontend/src/components/files/RenameModal.test.tsx`

**Interfaces:**
- Consumes: `updateFile`, `updateFolder`, `getTrash`, `restoreItem`, `purgeItem`, `getDrive` (for move destinations).
- Produces: `<RenameModal open initialName onSubmit(name) onClose />`.
- Produces: `<MoveModal open folders onSubmit(folderId) onClose />` (destination picker; folders from drive/browse).
- Produces: `useTrash()` → `{ items, restore, purge }` (query + mutations invalidating `["trash"]`, `["drive"]`).
- Produces: `TrashPage` listing items with Restore + Delete-forever (ConfirmDialog).

- [ ] **Step 1: Create `frontend/src/components/files/RenameModal.tsx`**

```tsx
import { useState } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";

export function RenameModal({ open, initialName, onSubmit, onClose }: {
  open: boolean; initialName: string; onSubmit: (name: string) => void; onClose: () => void;
}) {
  const [name, setName] = useState(initialName);
  return (
    <Modal open={open} onClose={onClose} title="Rename">
      <input aria-label="New name" value={name} onChange={(e) => setName(e.target.value)}
        className="mb-4 w-full rounded-full border border-white/50 bg-white/70 px-4 py-2.5 outline-none focus:ring-2 focus:ring-brand-violet" />
      <div className="flex justify-end gap-3">
        <Button intent="ghost" onClick={onClose}>Cancel</Button>
        <Button intent="primary" onClick={() => onSubmit(name)}>Save</Button>
      </div>
    </Modal>
  );
}
```

- [ ] **Step 2: Create `frontend/src/components/files/MoveModal.tsx`**

```tsx
import { useState } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import type { Folder } from "../../types";

export function MoveModal({ open, folders, onSubmit, onClose }: {
  open: boolean; folders: Folder[]; onSubmit: (folderId: string) => void; onClose: () => void;
}) {
  const [target, setTarget] = useState("");
  return (
    <Modal open={open} onClose={onClose} title="Move to folder">
      <select aria-label="Destination folder" value={target} onChange={(e) => setTarget(e.target.value)}
        className="mb-4 w-full rounded-xl2 border border-white/50 bg-white/70 px-4 py-2.5">
        <option value="">Select a folder…</option>
        {folders.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
      </select>
      <div className="flex justify-end gap-3">
        <Button intent="ghost" onClick={onClose}>Cancel</Button>
        <Button intent="secondary" disabled={!target} onClick={() => onSubmit(target)}>Move</Button>
      </div>
    </Modal>
  );
}
```

- [ ] **Step 3: Create `frontend/src/hooks/useTrash.ts`**

```typescript
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getTrash, purgeItem, restoreItem } from "../api/trash";
import type { TrashItem } from "../types";

export function useTrash() {
  const qc = useQueryClient();
  const items = useQuery({ queryKey: ["trash"], queryFn: getTrash });
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["trash"] });
    qc.invalidateQueries({ queryKey: ["drive"] });
  };
  const restore = useMutation({
    mutationFn: (i: TrashItem) => restoreItem(i.item_type, i.id), onSuccess: invalidate,
  });
  const purge = useMutation({
    mutationFn: (i: TrashItem) => purgeItem(i.item_type, i.id), onSuccess: invalidate,
  });
  return { items, restore, purge };
}
```

- [ ] **Step 4: Replace `frontend/src/pages/TrashPage.tsx`**

```tsx
import { useState } from "react";
import { Topbar } from "../components/layout/Topbar";
import { Button } from "../components/ui/Button";
import { Spinner } from "../components/ui/Spinner";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { useTrash } from "../hooks/useTrash";
import type { TrashItem } from "../types";

export default function TrashPage() {
  const { items, restore, purge } = useTrash();
  const [confirm, setConfirm] = useState<TrashItem | null>(null);

  return (
    <div>
      <Topbar />
      <h1 className="px-6 py-4 text-xl font-semibold text-slate-700">Trash</h1>
      {items.isLoading ? (
        <div className="flex justify-center p-10"><Spinner /></div>
      ) : (items.data ?? []).length === 0 ? (
        <p className="p-8 text-center text-slate-400">Trash is empty.</p>
      ) : (
        <ul className="space-y-3 p-4">
          {(items.data ?? []).map((i) => (
            <li key={`${i.item_type}-${i.id}`} className="glass flex items-center gap-3 rounded-xl2 p-4">
              <span className="flex-1 text-slate-700">{i.item_type === "folder" ? "📁" : "📄"} {i.name}</span>
              <Button intent="success" onClick={() => restore.mutate(i)}>Restore</Button>
              <Button intent="warning" onClick={() => setConfirm(i)}>Delete forever</Button>
            </li>
          ))}
        </ul>
      )}
      <ConfirmDialog open={!!confirm} title="Delete forever?"
        message="This permanently removes the item and cannot be undone."
        confirmLabel="Delete forever"
        onConfirm={() => { if (confirm) purge.mutate(confirm); setConfirm(null); }}
        onClose={() => setConfirm(null)} />
    </div>
  );
}
```

- [ ] **Step 5: Wire rename/move into `DashboardPage.tsx`**

Add modal state and handlers. Add these imports:
```tsx
import { RenameModal } from "../components/files/RenameModal";
import { MoveModal } from "../components/files/MoveModal";
import { updateFolder } from "../api/folders";
import { updateFile } from "../api/files";
```

Add state near the top of the component:
```tsx
const [renameTarget, setRenameTarget] = useState<{ kind: "file" | "folder"; id: string; name: string } | null>(null);
const [moveTarget, setMoveTarget] = useState<{ id: string } | null>(null);
```
Replace the `onRenameFile`, `onRenameFolder`, `onMove` no-op props passed to `<FileGrid>`:
```tsx
onRenameFile={(f) => setRenameTarget({ kind: "file", id: f.id, name: f.name })}
onRenameFolder={(f) => setRenameTarget({ kind: "folder", id: f.id, name: f.name })}
onMove={(f) => setMoveTarget({ id: f.id })}
```
Add the modals before the closing `</div>`:
```tsx
<RenameModal open={!!renameTarget} initialName={renameTarget?.name ?? ""}
  onClose={() => setRenameTarget(null)}
  onSubmit={async (name) => {
    if (!renameTarget) return;
    if (renameTarget.kind === "file") await updateFile(renameTarget.id, { name });
    else await updateFolder(renameTarget.id, { name });
    setRenameTarget(null); invalidate(); notify("Renamed", "success");
  }} />
<MoveModal open={!!moveTarget} folders={folders}
  onClose={() => setMoveTarget(null)}
  onSubmit={async (folderId) => {
    if (!moveTarget) return;
    await updateFile(moveTarget.id, { folder_id: folderId });
    setMoveTarget(null); invalidate(); notify("Moved", "success");
  }} />
```

- [ ] **Step 6: Write `frontend/src/components/files/RenameModal.test.tsx`**

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RenameModal } from "./RenameModal";

test("edits name and submits", async () => {
  const onSubmit = vi.fn();
  render(<RenameModal open initialName="old" onSubmit={onSubmit} onClose={() => {}} />);
  const input = screen.getByLabelText("New name");
  await userEvent.clear(input);
  await userEvent.type(input, "new");
  await userEvent.click(screen.getByRole("button", { name: "Save" }));
  expect(onSubmit).toHaveBeenCalledWith("new");
});
```

- [ ] **Step 7: Write `frontend/src/pages/TrashPage.test.tsx`**

```tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "../lib/queryClient";
import { server } from "../test/server";
import TrashPage from "./TrashPage";

function renderTrash() {
  queryClient.clear();
  return render(
    <QueryClientProvider client={queryClient}><TrashPage /></QueryClientProvider>,
  );
}

test("lists trashed items and restores one", async () => {
  let restored = false;
  server.use(
    http.get("/api/trash", () => HttpResponse.json([
      { id: "t1", item_type: "file", name: "old.txt", trashed_at: null },
    ])),
    http.post("/api/trash/file/t1/restore", () => { restored = true; return HttpResponse.json({ status: "restored" }); }),
  );
  renderTrash();
  await waitFor(() => expect(screen.getByText(/old.txt/)).toBeInTheDocument());
  await userEvent.click(screen.getByRole("button", { name: "Restore" }));
  await waitFor(() => expect(restored).toBe(true));
});
```

- [ ] **Step 8: Run tests**

Run: `cd /home/eshhh/Desktop/cloudbase-it/frontend && npm test`
Expected: all pass.

- [ ] **Step 9: Commit and push**

```bash
cd /home/eshhh/Desktop/cloudbase-it
git add frontend/src
git commit -m "feat(frontend): add rename/move modals and trash page"
git push origin main
```

---

### Task 9: Search + final polish and README

**Files:**
- Create: `frontend/src/hooks/useSearch.ts`
- Create: `frontend/src/components/search/SearchBar.tsx`
- Create: `frontend/src/pages/SearchResults.tsx`
- Modify: `frontend/src/router.tsx` (add `/search` route), `frontend/src/components/layout/AppLayout.tsx` or `DashboardPage` Topbar (mount SearchBar)
- Create: `frontend/README.md`
- Test: `frontend/src/components/search/SearchBar.test.tsx`

**Interfaces:**
- Consumes: `search` (api/search).
- Produces: `useSearch(q, type)` → query keyed `["search", q, type]`, enabled when `q` non-empty.
- Produces: `<SearchBar onSearch(q) />` (debounced 300ms input) and `SearchResults` page rendering matches; navigates there on submit.

- [ ] **Step 1: Create `frontend/src/hooks/useSearch.ts`**

```typescript
import { useQuery } from "@tanstack/react-query";
import { search } from "../api/search";

export function useSearch(q: string, type: "all" | "file" | "folder" = "all") {
  return useQuery({
    queryKey: ["search", q, type],
    queryFn: () => search(q, type),
    enabled: q.trim().length > 0,
  });
}
```

- [ ] **Step 2: Create `frontend/src/components/search/SearchBar.tsx`**

```tsx
import { useEffect, useRef, useState } from "react";

export function SearchBar({ onSearch }: { onSearch: (q: string) => void }) {
  const [q, setQ] = useState("");
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => onSearch(q), 300);
    return () => window.clearTimeout(timer.current);
  }, [q, onSearch]);

  return (
    <input aria-label="Search" value={q} onChange={(e) => setQ(e.target.value)}
      placeholder="Search files and folders…"
      className="w-full max-w-md rounded-full border border-white/50 bg-white/70 px-4 py-2 outline-none focus:ring-2 focus:ring-brand-blue" />
  );
}
```

- [ ] **Step 3: Create `frontend/src/pages/SearchResults.tsx`**

```tsx
import { useState } from "react";
import { Topbar } from "../components/layout/Topbar";
import { SearchBar } from "../components/search/SearchBar";
import { Spinner } from "../components/ui/Spinner";
import { useSearch } from "../hooks/useSearch";

export default function SearchResults() {
  const [q, setQ] = useState("");
  const { data, isLoading, isFetching } = useSearch(q);
  return (
    <div>
      <Topbar><SearchBar onSearch={setQ} /></Topbar>
      <h1 className="px-6 py-4 text-lg text-slate-600">
        {q ? `Results for "${q}"` : "Type to search"}
      </h1>
      {(isLoading || isFetching) && q ? (
        <div className="flex justify-center p-10"><Spinner /></div>
      ) : (
        <ul className="space-y-2 p-4">
          {(data ?? []).map((r) => (
            <li key={`${r.type}-${r.id}`} className="glass rounded-xl2 p-4 text-slate-700">
              {r.type === "folder" ? "📁" : "📄"} {r.name}
            </li>
          ))}
          {q && (data ?? []).length === 0 && !isFetching && (
            <p className="p-6 text-center text-slate-400">No matches.</p>
          )}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Add `/search` route in `frontend/src/router.tsx`** — import `SearchResults` and add `{ path: "search", element: <SearchResults /> }` to the protected children. Also add a "Search" `NavLink` to `Sidebar.tsx` (`<NavLink to="/search" ...>Search</NavLink>`), matching the existing link styles.

- [ ] **Step 5: Write `frontend/src/components/search/SearchBar.test.tsx`**

```tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SearchBar } from "./SearchBar";

test("debounces and reports the query", async () => {
  const onSearch = vi.fn();
  render(<SearchBar onSearch={onSearch} />);
  await userEvent.type(screen.getByLabelText("Search"), "inv");
  await waitFor(() => expect(onSearch).toHaveBeenCalledWith("inv"), { timeout: 1000 });
});
```

- [ ] **Step 6: Create `frontend/README.md`**

Document: prerequisites (Node 22), install (`npm install`), dev (`npm run dev` — proxies `/api` to the backend on `:8000`, so run the backend too), test (`npm test`), build (`npm run build`), the design system (glass, accent tokens), and the Lottie asset location (`src/assets/lottie/`, swappable). Note the app expects the backend running locally with a logged-in session (cookies).

- [ ] **Step 7: Run the full frontend suite**

Run: `cd /home/eshhh/Desktop/cloudbase-it/frontend && npm test`
Expected: all tests pass. Also run `npm run build` and expect a clean production build (TypeScript compiles).

- [ ] **Step 8: Commit and push**

```bash
cd /home/eshhh/Desktop/cloudbase-it
git add frontend
git commit -m "feat(frontend): add search bar/results, sidebar link, and README"
git push origin main
```

---

## Notes on Test Strategy

- All frontend tests use MSW to mock the backend; no live backend or Supabase is needed. `onUnhandledRequest: "bypass"` lets the direct-to-storage PUT be matched per test.
- Lottie is stubbed in the test env (alias to a mock component), so auth-page tests assert on the `data-state` attribute of the character wrapper, not on animation frames.
- The real animated experience (nod/shake/writing) and the live upload round-trip are verified manually in the browser with the backend running (`uvicorn app.main:app --reload` + `npm run dev`).
- Each task commits AND pushes to `origin/main` after its tests pass, per the project workflow.
