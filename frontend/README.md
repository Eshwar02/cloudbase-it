# Cloudbase — Frontend

React + TypeScript SPA for the Cloudbase cloud storage application.

## Prerequisites

- **Node 22** (use `nvm use 22` or install from [nodejs.org](https://nodejs.org))
- The backend server running locally (see `backend/` README)

## Install

```bash
npm install
```

## Development

```bash
npm run dev
```

The dev server starts at `http://localhost:5173`. All `/api` requests are proxied to the backend on `:8000`, so **run the backend too** before opening the app:

```bash
# In the project root (backend side):
uvicorn app.main:app --reload
```

The app expects a logged-in session via cookies. Log in through the UI once the backend is running.

## Tests

```bash
npm test
```

All tests use [MSW](https://mswjs.io/) to mock the backend API — no live backend or Supabase connection is needed to run the test suite.

## Production Build

```bash
npm run build
```

Runs `tsc -b && vite build`. Outputs to `dist/`.

## Design System

The UI is built on a **glass morphism** theme using Tailwind CSS with custom tokens:

| Token | Value | Usage |
|---|---|---|
| `bg-white/70` + `backdrop-blur` | glass effect | Cards, sidebar, topbar |
| `brand-blue` | `#3B82F6` | Primary accent, active nav links |
| `brand-violet` | `#7C3AED` | Logo / heading accent |
| `brand-green` | `#22C55E` | Success states |
| `brand-yellow` | `#EAB308` | Warning / storage indicator |

The background is plain white (`bg-white`) with translucent glass panels layered on top.

## Lottie Animations

Auth page character animations live in:

```
src/assets/lottie/
  idle.json
  writing.json
  nod.json
  shake.json
```

These files are swappable — replace any `.json` with a compatible Lottie animation to change the character. The component (`LottieCharacter.tsx`) drives state via the `data-state` attribute on its wrapper div.

In tests, `lottie-react` is aliased to a lightweight mock (`src/test/__mocks__/lottie-react.tsx`) so animation tests run without a real Lottie renderer.
