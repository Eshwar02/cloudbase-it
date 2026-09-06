# SaaS Features: Undo, Dialogs, Settings, Profile, Help Chatbot

**Date:** 2026-09-06
**Status:** Approved

## Goal

Turn the Drive-style UI into a real product: every mutation is undoable from its
toast, folder creation uses an in-app dialog (no `prompt()`), and the Help,
Settings and Profile surfaces are fully functional — including a real Help
chatbot. No mock buttons: everything hits a working backend.

## Decisions (approved)

- **Chatbot:** real AI via the existing Mistral wrapper (`/ai/help-chat`), with a
  built-in keyword FAQ fallback when `MISTRAL_API_KEY` is unset.
- **Persistence:** backend. Add `users.settings jsonb`; profile/password/settings
  changes hit real endpoints and sync across devices.
- **Settings included (all functional):** default view (list/grid), density
  (comfortable/compact), appearance (light/dark), deletion confirmation,
  storage & account info.

## Backend

Migration `0003_user_settings.sql`: `alter table users add column settings jsonb
not null default '{}'`.

`User` model gains `settings: dict` (SQLModel JSON column) and `created_at` is
already present. `UserOut` exposes `created_at` and `settings`.

New endpoints (`routes/auth.py`):
- `PATCH /auth/me` — update `display_name`.
- `POST /auth/change-password` — verify current, set new (min length enforced).
- `PATCH /auth/settings` — shallow-merge a partial settings object; returns `UserOut`.

New endpoint (`routes/ai.py`):
- `POST /ai/help-chat` — body `{message, history?}`. If `ai_enabled()`, calls a new
  `ai.chat_text(system, messages)` grounded in a Cloudbase help system prompt;
  otherwise returns a FAQ answer matched from a curated topic list. Always 200 with
  `{reply, source: "ai" | "faq"}`.

`ai.chat_text` is added alongside `chat_json` (free-text completion, no JSON mode).

Tests: profile update, password change (happy + wrong-current), settings merge,
help-chat FAQ fallback, help-chat AI path (monkeypatched).

## Frontend

**Undo (Toast):** `notify(message, tone, { actionLabel, onAction })`. Toasts with an
action show a button and stay ~7s. A `useUndoableActions` helper wraps each
mutation: perform op → capture inverse → `notify("…", tone, {actionLabel:"Undo",
onAction: inverse})`. Covered ops: rename (file/folder), move, delete (file/folder →
restore), create folder (→ delete), star toggle, trash restore/purge.

**Folder dialog:** reuse the Modal primitive to make `NameModal` (single text input,
Create/Cancel). Sidebar New + dashboard use it instead of `prompt()`.

**Settings system:** `SettingsProvider` loads `user.settings`, exposes typed values
with defaults, and `update(patch)` that optimistically applies + PATCHes the backend.
Applies: `dark` class on `<html>` for appearance; density → CSS var / class driving
row padding; default view → Dashboard initial `view`; deletion confirm → Trash.
Tailwind `darkMode: "class"`.

**Pages/routes:** add `/settings`, `/profile` under AppLayout.
- **SettingsPage** — Drive-style sections: Appearance, Density, Default view,
  Deletion confirmation, Storage (meter + breakdown), Account (email, member since).
- **ProfilePage** — avatar (initial), edit display name, change password form.

**Help:** `HelpPanel` (right-side popover from the topbar `?`): "Popular help
resources" list, "Search Help" field (filters topics), "Need more help?" → opens the
chatbot. `HelpChatbot` panel posts to `/ai/help-chat`, streams the reply into a
message list, shows an "AI" or "FAQ" badge.

**Topbar wiring:** `?` opens HelpPanel; gear routes to `/settings`; avatar opens a
menu (Profile, Settings, Log out). No dead buttons.

**Dark theme:** add `dark:` variants to the shared surfaces (rail, cards, table,
menus, inputs, toasts) and tokens so the whole app themes.

## Testing & docs

- Frontend: extend Vitest for undo toast, NameModal, settings apply, help chat.
- Backend: pytest for the new endpoints.
- **Stress test:** extend `benchmarks/locustfile.py` with the new endpoints; record
  a short run's numbers.
- **Usability:** manual pass documented as a checklist.
- Update `README.md` with the new features and a "Testing readings" section (test
  counts, stress numbers) after each change batch.

## Non-goals

- Real email/notification delivery (the notifications toggle governs in-app toasts).
- Multi-language, storage purchase, and other Google settings not listed above.
