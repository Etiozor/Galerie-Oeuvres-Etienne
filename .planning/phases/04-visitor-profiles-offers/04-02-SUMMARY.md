---
phase: "04-visitor-profiles-offers"
plan: "02"
subsystem: "price-breakdown"
tags: [drizzle-schema, server-component, tdd, smallint, numeric, market-01]
dependency_graph:
  requires:
    - "04-01: src/db/schema.ts visitors/offers tables"
    - "03-03: src/components/artwork/ArtworkInfoPanel.tsx base structure"
  provides:
    - "PriceBreakdownData type — exported from schema.ts for downstream use"
    - "PriceBreakdown component — Server Component, null-safe, D-03 compliant"
    - "6 price_* columns on artworks table — all nullable, ready for Phase 5 admin input"
  affects:
    - "04-03: peut passer priceBreakdown depuis la page détail — type déjà câblé"
    - "05-xx: admin CRUD renseignera les colonnes price_* (MARKET-01 phase saisie)"
tech_stack:
  added:
    - "@testing-library/react v16.3.2 — rendu composants React dans les tests"
    - "@testing-library/dom — dépendance pair requise par @testing-library/react"
    - "jsdom v29.1.1 — DOM simulé pour les tests composants"
  patterns:
    - "// @vitest-environment jsdom — directive par fichier pour jsdom (vitest v4)"
    - "@vitejs/plugin-react — plugin vitest.config pour transformer JSX dans les tests"
    - "smallint — type Drizzle 2 octets pour scores 1-5 (surdimensionné avec integer)"
    - "Server Component sans 'use client' — PriceBreakdown : rendu statique pur"
key_files:
  created:
    - path: "src/components/artwork/PriceBreakdown.tsx"
      role: "Composant Server affichant les 6 facteurs prix — null guard, formatage fr-FR"
    - path: "tests/offers/pricebreakdown.test.ts"
      role: "8 tests TDD — null guard, données partielles, scores X/5, D-03"
  modified:
    - path: "src/db/schema.ts"
      role: "6 colonnes price_* ajoutées à artworks + type PriceBreakdownData exporté"
    - path: "src/components/artwork/ArtworkInfoPanel.tsx"
      role: "Import PriceBreakdown, prop priceBreakdown, rendu section 5.5"
    - path: "src/app/artworks/[id]/page.tsx"
      role: "Import PriceBreakdownData, construction objet, passage en prop"
    - path: "vitest.config.ts"
      role: "Ajout @vitejs/plugin-react pour JSX dans les tests"
decisions:
  - "PriceBreakdownData comme type léger séparé — évite couplage fort avec type Artwork complet"
  - "smallint pour priceTechnicality et priceAttachment — scores 1-5 (2 octets vs 4 pour integer)"
  - "Server Component pour PriceBreakdown — rendu statique, aucune interactivité requise"
  - "@vitest-environment jsdom par directive fichier — plus simple que environmentMatchGlobs (invalide en vitest v4)"
  - "priceFraming === 0.00 affiché comme 'Inclus' — meilleure UX que '0 €'"
metrics:
  duration: "~30 minutes"
  completed_date: "2026-05-08"
  tasks_completed: 3
  tasks_total: 3
  files_created: 2
  files_modified: 5
  tests_added: 8
  tests_passing: 8
---

# Phase 04 Plan 02: Price Breakdown Display Summary

6 nullable price_* columns added to artworks schema + PriceBreakdown Server Component rendering them on the artwork detail page — null-safe, D-03 compliant, Space Mono typography throughout.

## What Was Built

### Task 1 — Schema + Migration

**`src/db/schema.ts`**
- Added `smallint` to drizzle-orm/pg-core imports
- 6 nullable columns in `pgTable('artworks', {...})` after `basePrice`:
  - `priceHoursSpent` — numeric(8,2) — time × artist hourly rate
  - `priceFormat` — numeric(8,2) — bonus for artwork dimensions
  - `priceFraming` — numeric(8,2) — framing cost (0 if unframed)
  - `priceMaterials` — numeric(8,2) — materials (pigments, paper, canvas)
  - `priceTechnicality` — smallint — technical complexity score 1-5
  - `priceAttachment` — smallint — artist sentimental attachment score 1-5
- `PriceBreakdownData` type exported: `{ priceHoursSpent: string|null, ..., priceTechnicality: number|null, priceAttachment: number|null }`
- Migration applied via `npx drizzle-kit push` — columns added to local Docker DB

### Task 2 (TDD) — PriceBreakdown Component

**RED commit:** `c5390e8` — 8 tests written, all failing (component not yet created)

**`tests/offers/pricebreakdown.test.ts`**
- `// @vitest-environment jsdom` directive for @testing-library/react compatibility
- 3 describe blocks: null data, partial data, full data
- Tests: null guard (data=null + all-null), section title visible, row display/masking, score format "3/5" and "5/5", all 6 rows when full

**GREEN commit:** `8a4b20c` — component created, 8/8 tests passing

**`src/components/artwork/PriceBreakdown.tsx`**
- No `'use client'` — pure Server Component
- `hasData` guard: `Object.values(data).some(v => v !== null)` → returns `null` if no data
- `formatEuros()`: `parseFloat(value).toLocaleString('fr-FR', {min:0, max:2}) + ' €'`
- HTML `<table>` with `borderCollapse:'collapse'` — D-03: zero `border-radius` anywhere
- Each row rendered only if value is non-null
- `priceFraming === 0.00` → displayed as "Inclus"
- Scores rendered as `${value}/5`
- All labels/values in Space Mono (10px uppercase muted labels, 11px ink values)

### Task 3 — Wiring

**`src/components/artwork/ArtworkInfoPanel.tsx`**
- Import `PriceBreakdown` and `PriceBreakdownData`
- New prop: `priceBreakdown?: PriceBreakdownData | null`
- Section 5.5 inserted between meta-grid and description: `{priceBreakdown && (<><Separator /><PriceBreakdown data={priceBreakdown} /></>)}`

**`src/app/artworks/[id]/page.tsx`**
- Import `PriceBreakdownData` from `@/db/schema`
- Build `priceBreakdown` object from `artwork.*` fields (all `?? null`)
- Pass `priceBreakdown={priceBreakdown}` to `<ArtworkInfoPanel>`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `environmentMatchGlobs` invalide en vitest v4**
- **Found during:** Task 3 (npx tsc --noEmit)
- **Issue:** `vitest v4 InlineConfig` n'expose pas `environmentMatchGlobs` — erreur TypeScript TS2769
- **Fix:** Supprimer `environmentMatchGlobs` de vitest.config.ts. L'environnement jsdom est déclaré via la directive `// @vitest-environment jsdom` en tête du fichier de test (approche équivalente, recommandée par vitest v4 docs)
- **Files modified:** `vitest.config.ts`, `tests/offers/pricebreakdown.test.ts`
- **Commit:** `e5a9f10`

**2. [Rule 3 - Blocking] `@testing-library/dom` absent**
- **Found during:** Task 2 (premier run vitest après RED)
- **Issue:** `@testing-library/react` dépend de `@testing-library/dom` mais ne l'installe pas automatiquement
- **Fix:** `npm install --save-dev @testing-library/dom`
- **Commit:** `c5390e8`

## TDD Gate Compliance

- RED gate: commit `c5390e8` — `test(04-02): add failing tests for PriceBreakdown component (TDD RED)` (8 tests, 0 passants — module absent)
- GREEN gate: commit `8a4b20c` — `feat(04-02): implement PriceBreakdown Server Component (TDD GREEN)` (8/8 passants)
- REFACTOR: non nécessaire — implémentation propre dès le premier jet

## Known Stubs

Aucun stub. PriceBreakdown affiche `null` (rien) si toutes les colonnes sont null — comportement correct pour Phase 4. Les colonnes seront renseignées par l'artiste via l'admin Phase 5.

## Threat Surface

Aucune nouvelle surface non couverte par le threat model du plan.
- T-04-02-01 (colonnes price_* publiques) : accepté — données prix sans PII
- T-04-02-02 (migration accidentelle en prod) : mitigé — `drizzle-kit push` uniquement en dev
- T-04-02-03 (priceTechnicality hors 1-5) : affiché tel quel en Phase 4, validation Zod ajoutée en Phase 5

## Self-Check: PASSED

- `src/components/artwork/PriceBreakdown.tsx` — FOUND
- `tests/offers/pricebreakdown.test.ts` — FOUND
- `src/db/schema.ts` (priceHoursSpent, smallint, PriceBreakdownData) — FOUND
- `src/components/artwork/ArtworkInfoPanel.tsx` (priceBreakdown prop) — FOUND
- `src/app/artworks/[id]/page.tsx` (priceBreakdown passed) — FOUND
- Commits ee78b23, c5390e8, 8a4b20c, e5a9f10 — FOUND
- `npx tsc --noEmit` → 0 erreur
- `npx vitest run tests/offers/pricebreakdown.test.ts` → 8/8 passants
- `grep "borderRadius\|border-radius\|rounded" PriceBreakdown.tsx` → 0 propriété CSS (D-03)
