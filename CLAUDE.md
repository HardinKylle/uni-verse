# Project guidance

**uni-verse** ("Scriptshot" — working title) is a studio for AU (Alternate Universe) fic writers: write
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

## Verification

Before considering a change done, run: `npm run lint && npm run typecheck && npm test && npm run test:e2e && npm run build`.

## Runtime note

This project was scaffolded on Next.js 16 / React 19. If APIs, conventions, or file structure look
unfamiliar, check `node_modules/next/dist/docs/` and current deprecation notices before assuming
older-Next.js patterns apply.
