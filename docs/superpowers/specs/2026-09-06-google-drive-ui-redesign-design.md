# Google Drive–style UI Redesign

**Date:** 2026-09-06
**Status:** Approved

## Goal

Reskin the Cloudbase frontend to match Google Drive's look and feel: clean white,
Material-style surfaces, Roboto typography, Google-blue accents, real Material Symbols
icons, and the exact Drive home layout (welcome heading, suggested folder cards, a
columned files table with a kebab menu, and a list/grid toggle).

This is a **visual reskin only**. No behavior, data flow, API calls, or component
prop signatures change. Existing handlers (upload, rename, move, share, star, delete,
folder navigation, auth) are preserved so the existing test suite stays green.

## Design Tokens

**Font:** Roboto via Google Fonts (`<link>` in `index.html`), with a
`"Google Sans", "Product Sans", Roboto, ...` stack for headings. Body uses Roboto.

**Colors** (Tailwind `theme.extend.colors.g`):
- `blue` `#1a73e8` — primary actions, links, active nav
- `blueHover` `#1b66c9`
- `surface` `#ffffff` — page background
- `rail` `#f8fafd` — sidebar / topbar background
- `hover` `#f0f4f9` — hover grey, search field
- `selected` `#c2e7ff` — active nav pill background
- `selectedText` `#041e49`
- `text` `#1f1f1f`, `muted` `#444746`
- `border` `#e3e3e3`, `borderStrong` `#c4c7c5`

`index.css` drops the `.glass` utility (replaced by flat Material surfaces) and adds a
`.g-icon` helper for Material Symbols sizing/weight. Body background stays white.

## Components

- **`ui/Icon.tsx`** (new) — thin wrapper rendering `<span class="material-symbols-outlined">name</span>`.
- **`ui/Menu.tsx`** (new) — lightweight kebab dropdown (button + click-away popover). Used by table rows and folder cards.
- **`ui/Button.tsx`** — new intents mapped to Google styles: `primary` (filled blue pill), `new` (white rounded-2xl w/ shadow + icon), `ghost` (grey-hover). Keeps `isLoading`, `intent`, and `role="button"`/spinner behavior tests depend on.
- **`layout/Sidebar.tsx`** — 256px white rail: logo, **New** button (menu → New folder / Upload files), nav list with Material icons + pill selected state, storage bar + **Log out** at bottom. Keeps "My Drive"/"Trash" text and a `Log out` button.
- **`layout/Topbar.tsx`** — rounded-full search field (`#f0f4f9`), right icon cluster (help/settings) + avatar with user's initial.
- **`files/FileTable.tsx`** (new) — table with Name / Owner / Location columns + kebab `Menu` per row (Download/Share/Rename/Move/Star/Delete). Folder rows navigate on click.
- **`files/FolderCard.tsx`** (new) — horizontal "suggested" folder card (folder icon, name, kebab).
- **`files/FileGrid.tsx`** — becomes a view switch: renders `FileTable` (list) or the existing card grid (grid) based on a `view` prop; folders shown as `FolderCard` row above. Preserves all existing props.
- **`pages/DashboardPage.tsx`** — "Welcome to Drive"-style heading, breadcrumb, suggested folder cards, list/grid toggle (local state), files table.
- **`pages/LoginPage.tsx` / `RegisterPage.tsx`** — centered white Material card, Google-blue submit, Roboto inputs. Keeps LottieCharacter, `Email`/`Password`/`Name` labels, `Log in`/`Sign up` buttons, and `role="alert"`.
- **`components/search/SearchBar.tsx`**, **`layout/Breadcrumb.tsx`**, **`files/UploadDropzone.tsx`** — restyled to Material surfaces.

## Non-goals

- No routing, state, or API changes.
- No new runtime dependency beyond the Material Symbols font `<link>` (icons) — no icon npm package.
- Auth pages keep the existing Lottie mascot.

## Testing

Existing Vitest suite is the acceptance gate. All preserved labels/roles/text keep tests
passing; `npm test` and `npm run build` must both be green before push.

## Commit plan (incremental)

1. spec doc
2. design tokens (tailwind + index.css + fonts) + `Icon`
3. `Button` + `Menu`
4. `Sidebar`
5. `Topbar` + `SearchBar` + `Breadcrumb`
6. `FileTable` + `FolderCard` + `FileGrid` + `FileRow`/`FolderRow`
7. `DashboardPage` wiring (toggle, welcome, cards)
8. `UploadDropzone` + remaining page polish
9. `LoginPage` + `RegisterPage`
10. verification (test/build) fixes if any
