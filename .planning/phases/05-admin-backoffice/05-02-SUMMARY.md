---
phase: 05-admin-backoffice
plan: 02
subsystem: admin
tags: [server-actions, form, useActionState, tdd, zod, numeric-drizzle]
dependency_graph:
  requires:
    - 05-01  # artworkAdmin.ts créé, pattern useActionState établi
    - 04-02  # PriceBreakdown.tsx — labels des 6 facteurs (D-08 référence)
    - 02-02  # Schema DB artworks — types numeric vs smallint critiques
  provides:
    - updateArtwork Server Action (artworkAdmin.ts)
    - ArtworkEditForm component
    - Formulaire édition 15 champs intégré dans /admin/artworks/[id]
  affects:
    - /admin/artworks/[id] (section "Modifier les métadonnées" ajoutée avant statut)
    - /artworks/[id] (revalidatePath après update — changements visibles côté public)
tech_stack:
  added: []
  patterns:
    - TDD RED/GREEN avec vi.hoisted() + vi.mock() (test échoue avant implémentation)
    - updateArtwork.bind(null, artwork.id) depuis Server Component parent (T-05-02-03)
    - useActionState(updateAction, null) dans ArtworkEditForm Client Component
    - Zod z.coerce.number() pour FormData string → number (z.coerce pattern)
    - Numeric Drizzle → .toString() en écriture (7 colonnes numeric, 2 smallint sans toString)
    - Promise.all pour charger artwork + artworkTypes + mediums en parallèle
    - defaultValue sur chaque champ (pré-remplissage depuis les props initial*)
key_files:
  created:
    - src/app/admin/artworks/[id]/_components/ArtworkEditForm.tsx
    - tests/admin/update-artwork.test.ts
  modified:
    - src/actions/artworkAdmin.ts (updateArtwork ajoutée)
    - src/app/admin/artworks/[id]/page.tsx (ArtworkEditForm intégrée, Promise.all, binding)
decisions:
  - Conversion numeric → toString() pour 7 colonnes (widthCm, heightCm, basePrice, priceHoursSpent, priceFormat, priceFraming, priceMaterials) — smallint sans toString
  - (db as any).set dans les tests pour contourner le type TypeScript du mock de chaîne fluente Drizzle
  - (artwork.createdDate ? ... : null) ?? null pour éliminer undefined du type ternaire TypeScript
  - Promise.all pour charger artwork + artworkTypes + mediums en parallèle (performance)
metrics:
  duration: 5 min 49 sec
  completed: 2026-05-12
  tasks_completed: 2
  files_created: 2
  files_modified: 2
---

# Phase 5 Plan 02: ArtworkEditForm + updateArtwork Summary

**One-liner:** Server Action `updateArtwork` avec validation Zod sur 14 champs et composant `ArtworkEditForm` (useActionState, 15 champs pré-remplis, erreurs par champ) intégré dans `/admin/artworks/[id]`.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Wave 0 — Tests + Server Action updateArtwork | 8ef2f34 | src/actions/artworkAdmin.ts, tests/admin/update-artwork.test.ts |
| 2 | Composant ArtworkEditForm + intégration page détail | 294785b | ArtworkEditForm.tsx, [id]/page.tsx |

## What Was Built

### Server Action (`src/actions/artworkAdmin.ts` — ajout)

- `updateArtwork(artworkId, prevState, formData)` — signature useActionState-compatible avec `.bind(null, artwork.id)` depuis le parent
- Schéma Zod `updateArtworkSchema` : 14 champs, `z.coerce.number()` pour les numériques FormData
- Validation Zod en première ligne après auth → `flatten().fieldErrors` retourné par champ
- Conversion CRITIQUE : 7 colonnes numeric → `.toString()` ; 2 colonnes smallint → number direct
- `revalidatePath` sur `/admin/artworks/[id]` ET `/artworks/[id]` (changement visible côté public)
- Try/catch global → `{ success: false, errors: { _form: ['Erreur serveur...'] } }`

### Client Component (`src/app/admin/artworks/[id]/_components/ArtworkEditForm.tsx`)

- `useActionState(updateAction, null)` — état initial null, `formAction` passé à `<form action>`
- Section Métadonnées (h2 20px/600) : titre (required), date, type select, médium select, largeur cm, hauteur cm, description textarea
- Section Prix (h2 20px/600) : basePrice + 6 facteurs avec libellés identiques à PriceBreakdown.tsx (D-08) : "Temps de travail", "Format / Dimensions", "Encadrement", "Matériaux", "Complexité technique", "Attachement"
- Erreurs par champ en rouge `#bc4b51` avec `role="alert"` (accessibilité)
- Erreur globale `_form` en bloc coloré
- Message succès vert `#5b8e7d` avec `role="status"`
- Bouton submit `height: 44px` (WCAG 2.5.5), gris `#a3a3a3` si `isPending`
- D-03 respecté : `borderRadius: 0` sur 6 éléments (inputs, selects, textarea, bouton, blocs d'erreur)

### Page Détail Étendue (`src/app/admin/artworks/[id]/page.tsx`)

- Import `updateArtwork` + `ArtworkEditForm`
- `Promise.all` pour charger artwork + artworkTypes + mediums en parallèle (gain ~50% DB)
- `updateArtworkWithId = updateArtwork.bind(null, artwork.id)` bindé côté serveur (T-05-02-03)
- Section "Modifier les métadonnées" placée AVANT la section statut (priorité UX)
- Conversion `(artwork.createdDate ? ... : null) ?? null` pour garantir `string | null` strict

### Tests (`tests/admin/update-artwork.test.ts`)

6 tests TDD (RED avant GREEN) couvrant :
1. Auth guard → `{ success: false, errors: { _form: ['Non autorisé.'] } }`
2. Titre vide → erreur sur champ `title`
3. Titre >255 chars → erreur sur champ `title`
4. `priceTechnicality = 6` (hors plage) → erreur sur champ `priceTechnicality`
5. Happy path : `db.update` appelé, `widthCm` passé comme `'42.5'` (string), `revalidatePath` x2
6. Happy path : `priceTechnicality` passé comme number `3` (pas `'3'`)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Cast `(db as any).set` dans les tests pour TypeScript strict**
- **Found during:** Task 1 — exécution de `npx tsc --noEmit`
- **Issue:** `db.set` n'est pas une propriété directe du type `NodePgDatabase` — c'est une méthode de la chaîne fluente retournée par `db.update()`. TypeScript strict rejetait `expect(db.set).toHaveBeenCalledWith(...)`.
- **Fix:** `(db as any).set` avec commentaire `eslint-disable-next-line` — pattern commun pour les vérifications de chaîne fluente mockée.
- **Files modified:** `tests/admin/update-artwork.test.ts`
- **Commit:** 8ef2f34

**2. [Rule 1 - Bug] Élimination de `undefined` dans la prop `initialCreatedDate`**
- **Found during:** Task 2 — exécution de `npx tsc --noEmit`
- **Issue:** La colonne `createdDate` Drizzle est optionnelle (pas `.notNull()`), donc son type TypeScript est `Date | null | undefined`. Le ternaire `artwork.createdDate ? ... : null` pouvait théoriquement retourner `string | null | undefined`, incompatible avec la prop `string | null`.
- **Fix:** `(artwork.createdDate ? ... : null) ?? null` pour forcer l'élimination de `undefined`.
- **Files modified:** `src/app/admin/artworks/[id]/page.tsx`
- **Commit:** 294785b

## TDD Gate Compliance

RED gate : `tests/admin/update-artwork.test.ts` — 6 tests échouent avec `TypeError: updateArtwork is not a function` (module artworkAdmin.ts ne contient pas encore updateArtwork).
GREEN gate : 6/6 tests passent après ajout de `updateArtwork` dans `src/actions/artworkAdmin.ts`.

## Known Stubs

Aucun stub — toutes les fonctionnalités du plan sont entièrement implémentées et câblées. Le formulaire est pré-rempli avec les données réelles de la DB.

## Threat Surface Scan

Aucune surface de sécurité non planifiée. Toutes les menaces du registre T-05-02 sont mitigées :
- T-05-02-01 : `auth.api.getSession()` en première ligne de `updateArtwork`
- T-05-02-02 : Zod `z.string().max(255)` / `z.string().max(2000)` avant tout accès DB
- T-05-02-03 : `artworkId` bindé côté serveur avec `.bind(null, artwork.id)` — jamais en input client
- T-05-02-04 : `z.string().max(2000)` sur la description
- T-05-02-05 : Accepté — les messages Zod n'exposent pas de données internes

## Self-Check: PASSED

| Item | Status |
|------|--------|
| src/actions/artworkAdmin.ts — export updateArtwork | FOUND |
| src/app/admin/artworks/[id]/_components/ArtworkEditForm.tsx | FOUND |
| tests/admin/update-artwork.test.ts | FOUND |
| Commit 8ef2f34 (tests + updateArtwork) | FOUND |
| Commit 294785b (ArtworkEditForm + page) | FOUND |
| 6 tests passent | PASSED |
| npx tsc --noEmit : 0 erreurs | PASSED |
| widthCm → toString() présent | FOUND |
| priceTechnicality sans toString() | FOUND |
| borderRadius: 0 sur ≥3 éléments | 6 occurrences FOUND |
