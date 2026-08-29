# Cloud Storage Service — Phase 2 Frontend Design

Date: 2026-08-29
Status: Approved-pending-review
Scope: React + Vite frontend for the existing Phase 1 backend (auth, folders, files, trash, search). No sharing UI (backend sharing endpoints do not exist yet).

## 1. Goal

A simple, professional, easy-to-use web client for the cloud storage backend —
Google-Drive-like browsing with a distinctive, animated, glassmorphic look.
Users log in, browse/organize folders, upload/download files, rename/move,
trash/restore, and search.

## 2. Locked Decisions

| Area | Choice |
|------|--------|
| Build tool | Vite + React (SPA) |
| Language | TypeScript |
| Dev auth | Vite dev proxy `/api` → `http://localhost:8000` (same-origin cookies) |
| HTTP | Axios instance, `baseURL: "/api"`, `withCredentials: true` |
| Server state | TanStack Query (React Query) |
| Routing | React Router |
| Styling | Tailwind CSS |
| Uploads | React Dropzone + axios `onUploadProgress` |
| Motion | Framer Motion (transitions) + Lottie (`lottie-react`) |
| Tests | Vitest + React Testing Library + MSW |

One small additive backend endpoint is required (root/drive listing — see §7);
otherwise no backend changes. Split-domain production (CORS + `SameSite=None;Secure`)
remains tracked as deferred.

## 3. Design System

**Feel:** iOS-style glassmorphism on a clean white canvas. Frosted translucent
panels, soft shadows, generous rounding, smooth spring transitions.

- **Background:** white (`#FFFFFF`) with subtle, very light accent-color blobs
  (blurred radial gradients) behind glass panels for depth.
- **Glass surface:** `bg-white/60 backdrop-blur-xl border border-white/40
  shadow-lg` (a reusable `.glass` utility / `<GlassCard>` component).
- **Accent palette (used purposefully, not all at once):**
  - Blue `#3B82F6` — primary actions, links, active nav
  - Violet `#8B5CF6` — secondary accents, highlights, focus rings
  - Green `#22C55E` — success, upload-complete, restore
  - Yellow `#EAB308` — warnings, starred/attention, in-progress
- **Buttons:** fully rounded ("curvy", `rounded-full`), glass or solid-accent
  variants, subtle scale/press animation on hover/tap (Framer Motion
  `whileHover`/`whileTap`). A single `<Button variant intent>` component.
- **Typography:** system UI stack, medium weights, clear hierarchy.
- **Transitions:** page/route fades + slight slide (Framer Motion
  `AnimatePresence`); modal scale-in; list items stagger-in. Keep durations
  ~150–300ms, spring easing, respect `prefers-reduced-motion`.

**Tokens** live in `tailwind.config.js` (colors) and a small `src/styles/`
(the `.glass` utility, keyframes). Components consume tokens, never hard-code
hex outside the config.

## 4. Animated Login / Register (Lottie)

The auth screen is the signature interaction. A friendly character (Lottie)
reacts to what the user does.

**Login page:**
- Idle: character sits/breathes.
- On submit → success (200 from `/auth/login`): character **nods top-to-bottom
  ("yes")**, brief green glow, then route to dashboard.
- On submit → failure (401): character **shakes head left-right ("no")**, the
  form does a small horizontal shake (Framer Motion), fields flash a soft red/yellow.

**Register page:**
- While the user types / on submit: character **writes on a sheet of paper**
  ("noting down" the new user).
- On success (201): writing completes + a happy beat, then redirect to login (or auto-login).
- On error (409 duplicate email / 422 validation): character **gestures "no"**
  (head shake or hand wave), the offending field shows an inline message.

**Implementation approach:**
- Use `lottie-react` with a `useLottieInteractions` wrapper that exposes an
  imperative ref to play named states.
- Prefer a **single character with segmented animations** if one asset covers
  idle/yes/no/write; otherwise use **separate Lottie JSON files** per state
  (`idle`, `yes`, `no`, `write`, `success`) swapped by state. Files live in
  `src/assets/lottie/`.
- **Sourcing:** download free Lottie JSON from LottieFiles (e.g., a cartoon
  animal/character with nod, head-shake, and writing animations). If exact
  matches are not available, use the closest free character animations and map:
  nod→"yes/approve", shake→"error/no", write→"writing/note". The state→file
  mapping is centralized so assets can be swapped without touching components.
- **Accessibility/perf:** lazy-load Lottie (dynamic import), fall back to a
  static SVG + CSS if `prefers-reduced-motion` is set, and never block form
  submission on animation completion (animation reflects state, it does not gate it).

## 5. Architecture & Structure

Vite dev server proxies `/api/*` to the backend, so the browser treats API
calls as same-origin and the HttpOnly `SameSite=Lax` cookies work unchanged.

```
frontend/
  index.html
  vite.config.ts          # dev proxy /api -> localhost:8000
  tailwind.config.js
  src/
    main.tsx, App.tsx, router.tsx
    lib/
      axios.ts            # instance: baseURL "/api", withCredentials, 401-refresh interceptor
      queryClient.ts
    api/
      auth.ts folders.ts files.ts trash.ts search.ts   # typed request fns
    types/                # shared TS types mirroring backend responses
    hooks/
      useAuth.ts useFolder.ts useUpload.ts useMutateFile.ts
      useTrash.ts useSearch.ts
    components/
      ui/ Button.tsx GlassCard.tsx Modal.tsx Toast.tsx ConfirmDialog.tsx Spinner.tsx
      LottieCharacter.tsx
      layout/ Sidebar.tsx Topbar.tsx Breadcrumb.tsx
      files/ FileGrid.tsx FileRow.tsx FolderRow.tsx UploadDropzone.tsx
             RenameModal.tsx MoveModal.tsx
      search/ SearchBar.tsx
    pages/
      LoginPage.tsx RegisterPage.tsx DashboardPage.tsx TrashPage.tsx
    routes/ ProtectedRoute.tsx
    styles/ glass.css
    assets/lottie/
    test/ setup.ts server.ts handlers.ts   # MSW
```

## 6. Data Flow

- **Auth:** `LoginPage`/`RegisterPage` post to `/auth/login|register`; backend
  sets cookies. `useAuth` calls `GET /auth/me` to hydrate current user; on 401
  the axios interceptor tries `POST /auth/refresh` once, else redirects to `/login`.
  `ProtectedRoute` renders the app only when `me` resolves.
- **Browse:** `DashboardPage` holds the current folder id (URL param, root =
  "My Drive"). `useFolder(id)` fetches `GET /folders/{id}` (subfolders + files)
  and `GET /folders/{id}/breadcrumb`. Root view lists the user's top-level
  folders/files (root folder_id is null).
- **Upload:** `UploadDropzone` → for each file `POST /files/init-upload` →
  `PUT` bytes to the returned signed URL (axios, `onUploadProgress` drives a bar)
  → `POST /files/complete-upload` → invalidate the folder query. Green success beat.
- **Download:** `GET /files/{id}/download` → open the returned signed URL.
- **Rename/Move:** `RenameModal`/`MoveModal` → `PATCH /files/{id}` or
  `PATCH /folders/{id}` → invalidate.
- **Delete:** soft-delete via `DELETE /files/{id}` / `DELETE /folders/{id}` → invalidate.
- **Trash:** `TrashPage` → `GET /trash`, restore `POST /trash/{type}/{id}/restore`,
  purge `DELETE /trash/{type}/{id}` (confirm dialog).
- **Search:** `SearchBar` (debounced) → `GET /search?q=&type=` → results view.

## 7. Root-folder handling

The backend has no dedicated "root folder" row; top-level items have
`folder_id = null` / `parent_id = null`. "My Drive" is a virtual root. The
existing `GET /folders/{id}` needs an id and `GET /search` does not return
`parent_id`/`folder_id`, so neither can list root content. This phase therefore
adds **one small backend endpoint**, `GET /drive`, returning the current user's
top-level, non-trashed items in the same shape as `GET /folders/{id}`:

```json
{ "folders": [ {id, name, ...} ], "files": [ {id, name, size_bytes, mime_type} ] }
```

It queries `Folder.parent_id IS NULL` and `File.folder_id IS NULL` (owner-scoped,
`is_trashed = false`, files `status = "ready"`). It ships with its own pytest
test in the backend and is committed/pushed as the first task of this phase.
The frontend dashboard uses `GET /drive` at root and `GET /folders/{id}` when
inside a folder.

## 8. Error Handling

- Axios interceptor: 401 → one refresh-retry → on repeat, redirect `/login`.
  Other errors → reject with the backend `detail` string.
- React Query `onError` surfaces a `<Toast>` with `detail`.
- Forms show inline field errors (from 422/409). Login/Register additionally
  trigger the Lottie "no" reaction.
- Query loading → skeletons/spinners; empty states have friendly copy.

## 9. Testing (per task, then push)

Vitest + RTL + MSW. MSW handlers mock every backend endpoint; no live backend
needed. Each implementation task ships tests and is committed + pushed:

- `lib/axios` interceptor: 401 → refresh → retry (mocked).
- `useAuth`/hooks: happy + error paths against MSW.
- `LoginPage`/`RegisterPage`: submit success shows nod/success state and
  navigates; failure shows shake/no state and inline error (assert on state,
  not on Lottie internals — Lottie is mocked in tests).
- `FileGrid`/`UploadDropzone`: renders items; upload lifecycle calls
  init→PUT→complete in order (mocked).
- `Breadcrumb`, `SearchBar` (debounce), `TrashPage` restore/purge.
- UI primitives (`Button`, `Modal`, `ConfirmDialog`) render/interaction tests.

Lottie is mocked in the test environment (a stub component) so tests are fast
and deterministic; the real animation is verified manually in the browser.

## 10. Build Order (informs the plan)

0. Backend: add `GET /drive` (top-level items) + pytest; commit + push.
1. Scaffold Vite+TS+Tailwind, dev proxy, Vitest+RTL+MSW harness, design tokens.
2. UI primitives: `Button`, `GlassCard`, `Modal`, `Toast`, `Spinner`, `ConfirmDialog` (+ motion).
3. `lib/axios` (interceptor) + `queryClient` + typed `api/*` + `types/`.
4. Auth: `useAuth`, `ProtectedRoute`, `LoginPage` + `RegisterPage` with Lottie reactions.
5. Layout: `Sidebar`, `Topbar`, `Breadcrumb`, routing shell.
6. Browse: `useFolder`, `FileGrid`/`FileRow`/`FolderRow`, `DashboardPage`.
7. Upload/Download: `UploadDropzone`, `useUpload`, progress + green success.
8. Mutate: `RenameModal`, `MoveModal`, soft-delete.
9. Trash page: list/restore/purge.
10. Search: `SearchBar` + results.
11. Polish: transitions pass, `prefers-reduced-motion`, responsive, README.

## 11. Open Items

- Source Lottie assets from LottieFiles (free); centralize state→file mapping so
  assets are swappable. Fallback to closest free character if exact nod/shake/write
  not found.
- Virtual root listing uses `/search` until a dedicated root-list endpoint exists.
- Move modal needs a folder picker; it lists the user's folders via search/browse.
