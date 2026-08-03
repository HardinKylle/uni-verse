# uni-verse

A studio for AU (Alternate Universe) fic writers: write a fake conversation once as a script, render it
into a pixel-faithful social-media UI skin, and batch-export the sequential screenshots that make up a
story episode. Working title: **Kathalis**.

## Overview

Built for AU and chat-fiction writers. AU fics are told through fabricated chat screenshots
posted as sequential image threads. Existing generators (Zeoob, Fakedetail, etc.) render one screenshot
at a time — no persistent characters, no story structure, no batch export, nothing saved. An AU writer's
real unit of work is an **episode**: 20–60 sequential frames, a recurring cast, and timestamps that
progress coherently, across a body of work that grows over many stories.

## Features

- **Projects and conversations** — a project holds its own cast and settings; each project holds
  multiple conversations (episodes/chapters).
- **Cast and script editors** — define characters once per project, then write a conversation in a
  fast, keyboard-first editor with a live, pixel-faithful phone-frame preview (one platform skin, light
  and dark, in the current phase).
- **Auto-slicing and export** — long conversations split into correctly-sized screenshot pages (with
  manual overrides), exported as numbered PNGs at 2× resolution.

## Tech stack

| Area | Technology |
|---|---|
| Application | Next.js (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| UI | Native HTML; HeroUI v3 when a generic component is needed |
| Creative UI | Not used yet |
| Forms | Native form handling; React Hook Form + Zod if complex forms are needed |
| Backend | Supabase (Postgres + Auth + Storage); RLS is the sole authorization boundary |
| Testing | Vitest, Testing Library, Playwright |
| Deployment | Vercel |

## Getting started

### Prerequisites

- Node.js version from `.nvmrc`
- npm

### Installation

```bash
git clone https://github.com/HardinKylle/uni-verse.git
cd uni-verse
nvm use
npm install
npm run dev
```

Open the local URL printed by the development server.

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Start the development server. |
| `npm run lint` | Run ESLint. |
| `npm run typecheck` | Check TypeScript types. |
| `npm test` | Run unit and component tests once. |
| `npm run test:watch` | Run tests in watch mode. |
| `npm run test:e2e` | Run Playwright browser tests. |
| `npm run build` | Create a production build. |
| `npm run start` | Start the production server. |

## Project structure

```text
src/
  app/                 routes, layouts, loading/error boundaries
  components/          genuinely shared UI
  features/            feature-owned UI, logic, and tests
  lib/                 framework integrations and cross-feature utilities
e2e/                   Playwright user-path tests
public/                static assets
```

Directories are added as the first real file belongs there, not speculatively.

## Verification

Before merging or releasing:

```bash
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
```

Also verify the primary user path at desktop and mobile widths with no browser console errors.

`npm run test:e2e` requires the dev Supabase project configured in `.env.local`:
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` (the last
is used only to create and delete disposable test users). Playwright fails fast with an actionable
message if these are missing or the project is unreachable. The other gate steps need no backend.

## Deployment

Not yet deployed. Target is Vercel. Production runs against a **separate** Supabase project (stood up
from the committed migrations when launch is ready — see `CLAUDE.md`); the current repo is linked to a
dev-only project. Required environment variables (`NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) are set in the deployment platform, not
with their values here.

## Decisions and limitations

- Phase 2 adds accounts and Supabase-backed cloud persistence while keeping full anonymous demo mode:
  anyone can use the studio in-browser without an account, and creating one unlocks autosave, a
  multi-project dashboard, episodes, a shared cast with uploaded avatars, and uncapped export. The
  anonymous tier carries deliberate limits (export capped at 3 frames, cast capped at 3 characters,
  frame shape locked) as honest reasons to sign up.
- Additional platform skins, replies/quotes, image messages, a timestamp engine, live playback mode,
  and Phase 3's public reader pages and social features remain out of scope.

## Author

[Kylle Hardin](https://github.com/HardinKylle)

## License

Private project — not licensed for reuse.
