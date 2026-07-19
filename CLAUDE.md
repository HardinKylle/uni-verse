# Project guidance

**uni-verse** ("Kathalis" — working title) is a studio for AU (Alternate Universe) fic writers: write
a fake conversation as a script, render it into a pixel-faithful social-media platform skin, and
batch-export the sequential screenshots that make up a story episode.

Phase 2 (current) adds accounts and Supabase-backed cloud persistence while retaining anonymous demo
mode. Phase 1 stored projects, cast, and conversations only in browser memory. Phase 3 adds public reader
pages and social features. Do not build ahead of
the current phase's scope.

## Stack

Follows [`project-kit`](https://github.com/HardinKylle/project-kit)'s `web-app` profile: Next.js App
Router, strict TypeScript, Tailwind CSS, native HTML/HeroUI v3 for generic UI, React Hook Form + Zod for
complex forms when needed, Supabase when a backend becomes required, Vitest + Testing Library + Playwright
for verification, npm, Vercel deployment. See that repository's `templates/STACK.md` for the full policy,
including which dependencies to add only once their need is real.

## Editing rules

- Never run Prettier or add Prettier configuration. ESLint and manual edits only.
- Prefer Server Components; add `"use client"` only at interactive boundaries.
- Keep feature-specific components, tests, and helpers close together; move to shared folders only
  after two real consumers exist.
- Do not add a state manager, form library, query library, or component kit speculatively.
- Do not commit, push, create a GitHub repository, or deploy unless explicitly requested.
- Use [Conventional Commits](https://www.conventionalcommits.org/) for commit messages —
  `type(scope): summary` (e.g. `feat(cast): add avatar upload`, `chore: bump next`). Allowed types:
  `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `build`, `ci`, `perf`, `revert`. Imperative mood,
  lowercase summary, no trailing period. See `project-kit`'s `templates/STACK.md#commit-messages`.
- Do not add a `Co-Authored-By` trailer to commit messages in this repo.

## Database migrations

Schema lives as hand-authored SQL under `supabase/migrations/`, applied only to the dev Supabase
project (`supabase/.temp/project-ref`) — production doesn't exist yet, see the PRD's Further Notes.
Guardrails, since a bad migration is much harder to undo than a bad code change:

- **Append-only.** Never edit or delete a migration file that has already been pushed (check
  `supabase migration list` if unsure). A correction is always a *new* migration, never an amend.
- **Show before push.** Before running `supabase db push`, show the developer the full SQL of every
  unapplied migration and get explicit confirmation — even against the dev project. Never push
  silently as part of a larger task.
- **Call out anything destructive.** `DROP TABLE`/`DROP COLUMN`, `TRUNCATE`, or an unscoped
  `DELETE`/`UPDATE` (no `WHERE`, or a `WHERE` that isn't obviously narrow) must be flagged explicitly
  in plain language ("this deletes X") as its own confirmation — never bundled quietly inside an
  otherwise-additive-looking migration.
- **RLS ships with the table.** Every new table gets `enable row level security` plus its policies in
  the *same* migration that creates it, not a follow-up. Verify policies against the actual RLS
  behavior (e.g. a small throwaway script with the anon key + a real session) rather than assuming the
  SQL does what it reads like — Postgres RLS has real gotchas (e.g. `upsert`/`remove` on Storage
  objects needing a `select` policy to report affected rows, discovered the hard way in
  issue 05) that a reasonable policy can still miss.
- **Never repoint the CLI or env vars at a production project** without the developer doing that step
  themselves — this repo's Supabase link should only ever mean the dev project.

## Verification

The full gate is `npm run lint && npm run typecheck && npm test && npm run test:e2e && npm run build`.
Run it **once, when a piece of work is finished** — before presenting it as done or committing it.
It is not a per-edit ritual; `test:e2e` alone is ~70s across two browsers.

While iterating, scope verification to what actually changed:

- **Styling only** (CSS, `globals.css` tokens, copy, comments) — `lint`, `typecheck`, `npm test`.
  Skip e2e.
- **Component or markup changes** — add the affected spec only:
  `npx playwright test e2e/<file>.spec.ts --project=chromium`. Treat swapping a native
  element for a library one as a markup change, not a cosmetic one: it rewrites the
  accessibility tree, which is exactly what Playwright queries by role and label.
- **Auth, routing, persistence, or migrations** — run the full suite, not a subset.

## Runtime note

This project was scaffolded on Next.js 16 / React 19. If APIs, conventions, or file structure look
unfamiliar, check `node_modules/next/dist/docs/` and current deprecation notices before assuming
older-Next.js patterns apply.

## Agent skills

### Issue tracker

Issues and PRDs live as local markdown files under `.scratch/<feature>/` — no remote tracker.
See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`,
recorded as a `Status:` line in each issue file. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` and `docs/adr/` at the repo root (created lazily by
`/domain-modeling`). See `docs/agents/domain.md`.
