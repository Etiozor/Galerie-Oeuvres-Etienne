---
phase: 05-admin-backoffice
plan: 01
subsystem: admin
tags: [server-actions, status-management, deletion, tdd, form]
dependency_graph:
  requires:
    - 02-03  # /admin/artworks list page (étendue avec StatusBadge)
    - 02-04  # /admin/artworks/[id] detail page (étendue avec StatusChangeForm + DeleteArtworkButton)
    - 04-01  # visitor sessions (même pattern auth artiste réutilisé)
  provides:
    - updateArtworkStatus Server Action
    - deleteArtwork Server Action
    - StatusChangeForm component
    - DeleteArtworkButton component
    - StatusBadge in admin list
  affects:
    - /admin/artworks (StatusBadge sur chaque ligne)
    - /admin/artworks/[id] (section statut + zone dangereuse)
tech_stack:
  added: []
  patterns:
    - TDD RED/GREEN avec vi.hoisted() + vi.mock()
    - Server Action bind(null, artworkId) depuis Server Component parent
    - useActionState pour updateArtworkStatus (retour d'état)
    - startTransition pour deleteArtwork (redirect incompatible avec useActionState)
    - AlertDialog Radix pour confirmation de suppression (D-05)
    - Suppression storage-first avant DB (T-05-01-02)
    - Zod z.enum pour validation statut (T-05-01-03)
key_files:
  created:
    - src/actions/artworkAdmin.ts
    - src/app/admin/artworks/[id]/_components/StatusChangeForm.tsx
    - src/app/admin/artworks/[id]/_components/DeleteArtworkButton.tsx
    - tests/admin/artwork-actions.test.ts
  modified:
    - src/app/admin/artworks/[id]/page.tsx
    - src/app/admin/artworks/page.tsx
decisions:
  - useActionState pour updateArtworkStatus (retour état visible), startTransition pour deleteArtwork (redirect — incompatible useActionState)
  - mockArtistSession casté as any dans les tests pour compatibilité TypeScript strict avec la signature Better Auth
  - borderRadius fixé à 0 partout dans les pages modifiées (D-03 Phase 3 appliqué à Phase 5)
metrics:
  duration: 5 min 20 sec
  completed: 2026-05-12
  tasks_completed: 2
  files_created: 4
  files_modified: 2
---

# Phase 5 Plan 01: Status Management + Deletion Summary

**One-liner:** Server Actions `updateArtworkStatus` + `deleteArtwork` avec composants `StatusChangeForm`, `DeleteArtworkButton` et badge `StatusBadge` dans la liste admin.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Wave 0 — Tests + Server Actions | 95b7178 | src/actions/artworkAdmin.ts, tests/admin/artwork-actions.test.ts |
| 2 | Composants Client + intégration pages | 2f2ce3b | StatusChangeForm.tsx, DeleteArtworkButton.tsx, [id]/page.tsx, artworks/page.tsx |

## What Was Built

### Server Actions (`src/actions/artworkAdmin.ts`)

- `updateArtworkStatus(artworkId, prevState, formData)` — valide le statut via `z.enum`, met à jour la DB, invalide les caches des deux routes
- `deleteArtwork(artworkId)` — supprime les 3 fichiers storage en premier (idempotent `.catch`), puis la ligne DB, puis `redirect('/admin/artworks')`

### Client Components

- `StatusChangeForm` — `<select>` + bouton submit, `useActionState`, affiche messages succès/erreur, `borderRadius: 0` (D-03)
- `DeleteArtworkButton` — bouton rouge trigger + `AlertDialog` de confirmation Radix, `startTransition`, tous `borderRadius: 0` (D-03)

### Admin Pages Extended

- `/admin/artworks` — ajout de la fonction `StatusBadge` (couleurs exactes UI-SPEC.md), tous les `borderRadius` non-zero corrigés à 0
- `/admin/artworks/[id]` — section "Statut de l'œuvre" + section "Zone dangereuse", `updateStatusWithId` et `deleteWithId` bindées côté serveur, images `borderRadius` corrigés à 0

### Tests (`tests/admin/artwork-actions.test.ts`)

6 tests unitaires couvrant :
- Auth guard (sans session → `{ error: 'Non autorisé.' }`)
- Validation Zod (statut invalide → `{ error: 'Statut invalide.' }`)
- Happy path updateArtworkStatus (db.update + revalidatePath + `{ success: true }`)
- Auth guard deleteArtwork
- Happy path deleteArtwork (storage.delete ×3, db.delete, redirect)
- Not found guard (artwork introuvable → `{ error: 'Œuvre introuvable.' }`)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Correction du type Session dans les tests pour TypeScript strict**
- **Found during:** Task 2 — exécution de `npx tsc --noEmit`
- **Issue:** `import type { Session } from 'better-auth'` retourne un type incompatible avec la valeur mock `{ user: {...} }` — Better Auth Session inclut `{ session: {...}, user: {...} }`. TypeScript strict rejetait les appels `mockResolvedValue(mockArtistSession)`.
- **Fix:** Suppression de l'import de type `Session`, `mockArtistSession` structuré avec `{ session, user }`, cast `as any` sur les appels `mockResolvedValue` (pattern commun pour les mocks de types complexes).
- **Files modified:** `tests/admin/artwork-actions.test.ts`
- **Commit:** 2f2ce3b (inclus dans Task 2)

**2. [Rule 2 - D-03] Correction des borderRadius non-zero dans les fichiers modifiés**
- **Found during:** Task 2 — lecture du plan qui indique que D-03 s'applique à Phase 5
- **Fix:** Toutes les occurrences de `borderRadius: '6px'`, `borderRadius: '8px'`, `borderRadius: '12px'`, `borderRadius: '4px'` remplacées par `borderRadius: 0` dans les pages modifiées.
- **Files modified:** `src/app/admin/artworks/[id]/page.tsx`, `src/app/admin/artworks/page.tsx`

## TDD Gate Compliance

RED gate : tests/admin/artwork-actions.test.ts échoué avec `ERR_MODULE_NOT_FOUND` (module artworkAdmin.ts non créé)
GREEN gate : 6/6 tests passent après création de `src/actions/artworkAdmin.ts`

## Known Stubs

Aucun stub — toutes les fonctionnalités du plan sont entièrement implémentées et câblées.

## Threat Surface Scan

Aucune surface de sécurité non planifiée. Toutes les menaces du registre sont mitigées :
- T-05-01-01 : auth.api.getSession() en première ligne des deux actions
- T-05-01-02 : storage.delete() avant db.delete() dans deleteArtwork
- T-05-01-03 : z.enum validé avant tout accès DB
- T-05-01-04 : AlertDialog est UX guard seulement — la Server Action re-vérifie la session

## Self-Check: PASSED

| Item | Status |
|------|--------|
| src/actions/artworkAdmin.ts | FOUND |
| src/app/admin/artworks/[id]/_components/StatusChangeForm.tsx | FOUND |
| src/app/admin/artworks/[id]/_components/DeleteArtworkButton.tsx | FOUND |
| tests/admin/artwork-actions.test.ts | FOUND |
| Commit 95b7178 (test + actions) | FOUND |
| Commit 2f2ce3b (components + pages) | FOUND |
