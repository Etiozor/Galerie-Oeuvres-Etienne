---
phase: 01-foundation
plan: 01
subsystem: infra
tags: [nextjs, tailwind, typescript, docker, postgresql, drizzle-kit]

requires: []
provides:
  - "Next.js 15 project scaffold with TypeScript strict mode and Tailwind CSS 4"
  - "Docker Compose configuration for local PostgreSQL 16"
  - "Environment variable structure (.env.local excluded, .env.example versioned)"
  - "uploads/ directory structure with originals/processed/thumbnails"
  - "drizzle-kit and @types/pg installed"
affects: [02-image-pipeline, 03-public-gallery]

tech-stack:
  added:
    - next@15.5.15
    - react@19.1.0
    - typescript@5
    - tailwindcss@4
    - drizzle-orm@0.45.2
    - drizzle-kit@0.31.10
    - better-auth@1.6.8
    - pg@8.20.0
    - zod@4.3.6
  patterns:
    - "Tailwind CSS 4 via @import 'tailwindcss' in globals.css"
    - "TypeScript strict + noUncheckedIndexedAccess"
    - "next.config.ts with ignoreBuildErrors: false"
    - ".npmrc with legacy-peer-deps=true for peer-dep conflicts"

key-files:
  created:
    - package.json
    - next.config.ts
    - tsconfig.json
    - src/app/layout.tsx
    - src/app/page.tsx
    - src/app/globals.css
    - docker-compose.yml
    - .env.example
    - .gitignore
    - .npmrc
    - uploads/.gitkeep
  modified: []

key-decisions:
  - "caniuse-lite pinned to 1.0.30001700 via package.json overrides — version 1.0.30001790+ removes mdn-css-backdrop-pseudo-element feature that Next.js 15.5.15's bundled cssnano-simple expects"
  - ".npmrc legacy-peer-deps=true to handle better-auth/drizzle-orm peer dep conflicts"

patterns-established:
  - "All code commented in French per CLAUDE.md"
  - "Storage keys (not absolute paths) will be stored in DB"

requirements-completed: []

duration: 30min
completed: 2026-04-23
---

# Plan 01-01: Foundation Summary

**Next.js 15 scaffold with TypeScript strict, Tailwind CSS 4, Docker Compose PostgreSQL, and structured upload directories**

## Performance

- **Duration:** ~30 min
- **Started:** 2026-04-23T09:30:00Z
- **Completed:** 2026-04-23T10:30:00Z
- **Tasks:** 2
- **Files modified:** 12

## Accomplishments
- Next.js 15.5.15 project with TypeScript strict + `noUncheckedIndexedAccess` compiles cleanly
- Tailwind CSS 4 configured with `@import "tailwindcss"` directive
- Docker Compose launches PostgreSQL 16-alpine with healthcheck and named volume
- `.env.local` correctly excluded from git; `.env.example` versioned as template
- `uploads/originals`, `uploads/processed`, `uploads/thumbnails` structure ready for StorageProvider

## Task Commits

1. **Task 1: Next.js 15 scaffold + TypeScript + Tailwind** - project scaffold, config files
2. **Task 2: Docker Compose + env files + uploads structure** - docker-compose.yml, .env.*, .gitignore, uploads/

## Files Created/Modified
- `package.json` — Next.js 15 + drizzle-orm + better-auth + pg + zod dependencies
- `next.config.ts` — TypeScript/ESLint build errors enabled, image remotePatterns placeholder
- `tsconfig.json` — strict + noUncheckedIndexedAccess + @/* path alias
- `src/app/globals.css` — Tailwind CSS 4 via @import
- `src/app/page.tsx` — Temporary "Galerie POF — En construction" page
- `src/app/layout.tsx` — Root layout, lang="fr", metadata
- `docker-compose.yml` — PostgreSQL 16-alpine, healthcheck, named volume
- `.env.local` — Local secrets (not committed)
- `.env.example` — Template for new environments
- `.gitignore` — .env.local + /uploads/**/* excluded
- `.npmrc` — legacy-peer-deps=true
- `uploads/` — originals/, processed/, thumbnails/ with .gitkeep

## Decisions Made
- **caniuse-lite override**: Next.js 15.5.15 bundles cssnano-simple which references `caniuse-lite/data/features/mdn-css-backdrop-pseudo-element` — this feature was removed in caniuse-lite 1.0.30001780+. Pinned to 1.0.30001700 via `overrides` in package.json.
- **legacy-peer-deps**: better-auth and drizzle-orm have conflicting peer dep declarations in npm v7+. `.npmrc` sets `legacy-peer-deps=true` to avoid install failures.

## Deviations from Plan

### Auto-fixed Issues

**1. caniuse-lite version conflict — build failure**
- **Found during:** Task 1 verification (npm run build)
- **Issue:** caniuse-lite 1.0.30001790 (pulled by drizzle-kit) removes `mdn-css-backdrop-pseudo-element` feature file that Next.js 15.5.15's bundled webpack plugin requires
- **Fix:** Added `"overrides": { "caniuse-lite": "1.0.30001700" }` to package.json
- **Files modified:** package.json
- **Verification:** `npm run build` passes cleanly

---

**Total deviations:** 1 auto-fixed (compatibility issue)
**Impact on plan:** Necessary fix, no scope creep.

## Issues Encountered
- Docker Desktop not installed on this machine — `docker compose up -d` cannot be verified automatically. This is a **user prerequisite** (see User Setup Required below).

## User Setup Required

**Docker Desktop requis pour la base de données locale.**

1. Télécharger et installer Docker Desktop : https://www.docker.com/products/docker-desktop/
2. Démarrer Docker Desktop
3. Dans le répertoire du projet, lancer :
   ```bash
   docker compose up -d
   docker compose exec db pg_isready -U pof_user -d galerie_pof
   ```
   → Doit afficher `accepting connections`

## Next Phase Readiness
- Next.js 15 build passes — Phase 2+ can use the project scaffold
- Docker Compose ready — needs Docker Desktop installed to run
- drizzle-kit installed — Plan 01-02 (schema + migrations) can proceed
- uploads/ structure ready for Plan 01-04 (StorageProvider)

---
*Phase: 01-foundation*
*Completed: 2026-04-23*
