---
phase: 01-foundation
plan: 02
subsystem: database
tags: [drizzle-orm, postgresql, schema, migrations, seed]

requires:
  - phase: 01-01
    provides: "Next.js project scaffold, drizzle-kit installed, DATABASE_URL in .env.local"
provides:
  - "Complete Drizzle ORM schema: 7 tables + 2 PostgreSQL enums"
  - "Drizzle client singleton (src/db/index.ts)"
  - "drizzle.config.ts for migrations"
  - "seed script with realistic dev data (3 artworks, 2 visitors, 2 offers)"
  - "npm scripts: db:push, db:studio, db:seed"
affects: [02-image-pipeline, 04-visitor-profiles, 05-admin-backoffice]

tech-stack:
  added:
    - tsx@4.x (for running TypeScript seed directly)
    - dotenv@17.x (for .env.local in seed script)
  patterns:
    - "Drizzle table definitions use array syntax for indexes: (table) => [index(...)]"
    - "TypeScript enum types inferred via $inferSelect/$inferInsert"
    - "noUncheckedIndexedAccess compliance: null checks on .returning() results before use"

key-files:
  created:
    - src/db/schema.ts
    - src/db/index.ts
    - src/db/seed.ts
    - drizzle.config.ts
  modified:
    - package.json (added db:push, db:studio, db:seed scripts)

key-decisions:
  - "Used array syntax for table indexes (table) => [...] as required by drizzle-orm 0.36+"
  - "seed.ts uses 'as const' for enum values to satisfy TypeScript strict typing"
  - "dotenv/config import at top of seed.ts loads .env.local before db connection"

patterns-established:
  - "All schema exports follow: artworkTypes, mediums, artworks, tags, artworkTags, visitors, offers"
  - "TypeScript types: Artwork/NewArtwork, Visitor/NewVisitor, Offer/NewOffer pattern"
  - "Drizzle relations defined separately from table definitions"

requirements-completed: []

duration: 20min
completed: 2026-04-23
---

# Plan 01-02: Drizzle Schema Summary

**Complete Drizzle ORM schema with 7 tables, extensible classification, 3 image paths, and realistic dev seed**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-04-23T10:30:00Z
- **Completed:** 2026-04-23T10:50:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- 7 tables fully defined with TypeScript types: artworks, artwork_types, mediums, tags, artwork_tags, visitors, offers
- 2 PostgreSQL enums: `artwork_status` (available/sold/given/reserved) and `pipeline_state` (pending/processing/awaiting_validation/published/failed)
- 3 image path columns on artworks: `original_path`, `processed_path`, `thumbnail_path` [C1]
- Extensible classification: artwork_types + mediums as tables (not TypeScript enums) [D-01]
- many-to-many tags via artwork_tags junction table [D-02]
- Drizzle relations for type-safe joins
- Seed script with 3 artworks (2 published, 1 awaiting_validation), 2 visitors, 2 offers

## Task Commits

1. **Task 1: Drizzle schema + client + config** - `866c412` (feat)
2. **Task 2: Seed script + npm scripts** - `2a97091` (feat)

## Files Created/Modified
- `src/db/schema.ts` — All 7 tables, 2 enums, Drizzle relations, TypeScript types
- `src/db/index.ts` — Drizzle singleton with Pool, DATABASE_URL validation
- `src/db/seed.ts` — Dev seed: 2 types, 4 mediums, 4 tags, 3 artworks, 2 visitors, 2 offers
- `drizzle.config.ts` — Points to schema.ts, out: ./drizzle, postgresql dialect
- `package.json` — Added db:push, db:studio, db:seed scripts

## Decisions Made
- Array syntax for table indexes — drizzle-orm 0.36+ requires `(table) => [index(...)]` not `(table) => ({ idx: index(...) })`
- `as const` on enum string literals in seed.ts to satisfy TypeScript strict mode
- `dotenv/config` import at seed.ts top ensures `.env.local` loads before Pool connection

## Deviations from Plan
None — plan executed exactly as written.

## Issues Encountered
- **Docker not installed**: `npx drizzle-kit push` and `npm run db:seed` could not be executed — Docker Desktop is required. See User Setup Required below.

## User Setup Required

**Étapes manuelles requises après installation de Docker Desktop :**

```bash
# 1. Démarrer PostgreSQL
docker compose up -d

# 2. Vérifier que la base répond
docker compose exec db pg_isready -U pof_user -d galerie_pof

# 3. Appliquer le schéma (crée les 7 tables)
npm run db:push

# 4. Vérifier les tables
docker compose exec db psql -U pof_user -d galerie_pof -c "\dt"

# 5. Peupler avec les données de test
npm run db:seed
# Doit afficher "Seed terminé avec succès !"
```

## Next Phase Readiness
- Schema ready for Phase 2 (image pipeline — uses artworks table with pipeline_state)
- Schema ready for Phase 3 (public gallery — queries artworks with status='published')
- Schema ready for Phase 4 (visitor profiles + offers — uses visitors + offers tables)
- **Blocking**: Docker Desktop must be installed before db:push can run

---
*Phase: 01-foundation*
*Completed: 2026-04-23*
