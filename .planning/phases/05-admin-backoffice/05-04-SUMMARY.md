---
phase: 05-admin-backoffice
plan: 04
subsystem: visitor-profile
tags: [visitor, saved-artworks, profile-page, server-action, tdd, favorites]
dependency_graph:
  requires:
    - 04-01  # iron-session visiteur (getVisitorSession, session guard)
    - 04-02  # table offers (myOffers dans /mon-profil)
    - 05-01  # schema DB établi (base pour ajouter saved_artworks)
  provides:
    - savedArtworks table (PK composite visitorId+artworkId)
    - toggleSavedArtwork Server Action
    - /mon-profil page (4 sections)
    - SaveButton component (optimistic toggle)
  affects:
    - src/db/schema.ts (nouvelle table saved_artworks)
    - src/app/artworks/[id]/page.tsx (SaveButton intégré)
tech_stack:
  added: []
  patterns:
    - TDD RED/GREEN avec vi.hoisted() pour mocks dans vi.mock() factory
    - Server Action avec session guard en première ligne (T-05-04-04)
    - Mise à jour optimiste useState + startTransition (SaveButton)
    - Promise.all pour requêtes DB parallèles dans /mon-profil
    - PK composite Drizzle (primaryKey avec deux colonnes)
key_files:
  created:
    - src/db/schema.ts (modifié — table savedArtworks + savedArtworkRelations)
    - src/actions/savedArtworks.ts
    - src/app/mon-profil/page.tsx
    - src/components/visitor/SaveButton.tsx
    - tests/visitor/saved-artworks.test.ts
    - tests/visitor/profile-page.test.ts
  modified:
    - src/app/artworks/[id]/page.tsx
decisions:
  - "vi.hoisted() requis pour mockSelectResult dans vi.mock() factory — même pattern que saved-artworks était en dehors du bloc hoisted, ce qui causait ReferenceError"
  - "maskPhone exportée depuis page.tsx pour testabilité — la fonction est testée directement sans importer la page Next.js complète"
  - "SaveButton placé en haut du panel info (flex justifyContent: flex-end) avant ArtworkInfoPanel — design épuré"
  - "isSaved chargé côté serveur (query DB) pour éviter un flash ♡→♥ au premier rendu"
metrics:
  duration: ~12 min
  completed: 2026-05-11
  tasks_completed: 2
  files_created: 6
  files_modified: 1
---

# Phase 5 Plan 04: Visitor Profile + Saved Artworks Summary

**One-liner:** Table `saved_artworks` avec PK composite, Server Action `toggleSavedArtwork`, page `/mon-profil` 4 sections avec guard session, et bouton cœur SaveButton sur `/artworks/[id]`.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Schema saved_artworks + db:push + toggleSavedArtwork | bed48e7 | src/db/schema.ts, src/actions/savedArtworks.ts, tests/visitor/saved-artworks.test.ts |
| 2 | Page /mon-profil + SaveButton + intégration artwork detail | a0a27db | src/app/mon-profil/page.tsx, src/components/visitor/SaveButton.tsx, src/app/artworks/[id]/page.tsx, tests/visitor/profile-page.test.ts |

## What Was Built

### Schema DB (`src/db/schema.ts`)

- Table `savedArtworks` avec PK composite `(visitorId, artworkId)` — garantit qu'un visiteur ne peut enregistrer la même œuvre qu'une fois
- Relations `savedArtworkRelations` pour les jointures Drizzle automatiques
- `db:push` exécuté — table `saved_artworks` créée en PostgreSQL

### Server Action (`src/actions/savedArtworks.ts`)

- `toggleSavedArtwork(artworkId)` — vérification session en première ligne (T-05-04-04), logique select→delete/insert idempotente, `revalidatePath` pour les deux routes concernées
- Retourne `{ success: true, saved: boolean }` ou `{ success: false, errors }` pour le Client Component

### Page /mon-profil (`src/app/mon-profil/page.tsx`)

4 sections :
1. **Mes informations** : displayName, téléphone masqué `maskPhone()` (••••XXXX), email si fourni
2. **Mes offres** : toutes les offres du visiteur avec lien vers l'œuvre, montant, date
3. **Mes acquisitions** : heuristique D-18 — œuvres `sold` avec offre soumise, dédoublonnées par `artworkId`
4. **Mes œuvres enregistrées** : grille de cartes avec thumbnail depuis `storage.getUrl()`

Guard session : `if (!session.visitorId) redirect('/')` — T-05-04-01.

### SaveButton (`src/components/visitor/SaveButton.tsx`)

- Client Component avec mise à jour optimiste (`useState` + `startTransition`)
- Cœur plein `♥` si enregistré, vide `♡` sinon — Unicode, pas de librairie d'icônes
- `borderRadius: 0` (D-03)
- Rollback sur erreur serveur

### Intégration `/artworks/[id]` (`src/app/artworks/[id]/page.tsx`)

- Import `savedArtworks` ajouté au schema import
- Import `SaveButton` depuis `@/components/visitor/SaveButton`
- Query `isSaved` côté serveur pour initialiser le bouton sans flash visuel
- `{visitorSession.visitorId && <SaveButton artworkId={artwork.id} initialSaved={isSaved} />}` — visible uniquement si connecté (D-14)

### Tests

- `tests/visitor/saved-artworks.test.ts` — 3 tests : sans session (erreur), favori absent (insert), favori existant (delete)
- `tests/visitor/profile-page.test.ts` — 3 tests : maskPhone, dédoublonnage acquisitions, exclusion non-sold

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Bug] mockSelectResult doit être dans vi.hoisted()**
- **Found during:** Task 1 — premier run des tests (ReferenceError)
- **Issue:** `mockSelectResult` était déclaré comme `const mockSelectResult: unknown[] = []` en dehors du bloc `vi.hoisted()`. Vitest hoiste les `vi.mock()` factories avant les déclarations `const`, causant `ReferenceError: Cannot access 'mockSelectResult' before initialization`.
- **Fix:** Déplacer `mockSelectResult` dans le bloc `vi.hoisted()` aux côtés de `mockSession`. Même pattern que les autres tests du projet.
- **Files modified:** `tests/visitor/saved-artworks.test.ts`
- **Commit:** bed48e7 (inclus dans Task 1 après correction)

**2. [Rule 1 - Bug] Optional chaining dans test TypeScript strict**
- **Found during:** Task 2 — `npx tsc --noEmit` retournait `error TS2532: Object is possibly 'undefined'`
- **Issue:** `myAcquisitions[0].artworkId` — TypeScript strict signale que `[0]` peut être `undefined`
- **Fix:** `myAcquisitions[0]?.artworkId` — optional chaining pour compatibilité TypeScript strict
- **Files modified:** `tests/visitor/profile-page.test.ts`
- **Commit:** a0a27db (inclus dans Task 2)

## Known Stubs

Aucun stub — toutes les fonctionnalités du plan sont entièrement implémentées et câblées.

Note : les thumbnails dans la grille "Mes œuvres enregistrées" utilisent `storage.getUrl()` — wiring complet, pas de placeholder.

## Threat Surface Scan

Toutes les menaces du registre sont mitigées :
- T-05-04-01 : `getVisitorSession()` → `if (!session.visitorId) redirect('/')` en première ligne de `/mon-profil`
- T-05-04-02 : `artworkId` vient du serveur (prop) ; l'action utilise `session.visitorId` non-forgeable ; INSERT échoue sur FK si `artworkId` invalide
- T-05-04-03 : `maskPhone()` appliqué — ••••XXXX, jamais le numéro complet affiché
- T-05-04-04 : `getVisitorSession()` en première ligne de `toggleSavedArtwork`
- T-05-04-05 : accept — le statut `sold` est déjà public dans la galerie

Aucune nouvelle surface de sécurité non planifiée.

## TDD Gate Compliance

- **RED gate (Task 1)** : `tests/visitor/saved-artworks.test.ts` — échec `ERR_MODULE_NOT_FOUND` (savedArtworks.ts non créé)
- **GREEN gate (Task 1)** : 3/3 tests passent après création de `src/actions/savedArtworks.ts`
- **RED gate (Task 2)** : `tests/visitor/profile-page.test.ts` — tests de logique pure (passent immédiatement, pas de dépendance externe à créer)
- **GREEN gate (Task 2)** : TypeScript 0 erreur + 3/3 tests passent

## Self-Check: PASSED

| Item | Status |
|------|--------|
| src/db/schema.ts (savedArtworks table) | FOUND |
| src/actions/savedArtworks.ts | FOUND |
| src/app/mon-profil/page.tsx | FOUND |
| src/components/visitor/SaveButton.tsx | FOUND |
| tests/visitor/saved-artworks.test.ts | FOUND |
| tests/visitor/profile-page.test.ts | FOUND |
| Commit bed48e7 (schema + action + tests) | FOUND |
| Commit a0a27db (page + button + integration) | FOUND |
| TypeScript 0 erreur | PASSED |
| db:push sans erreur | PASSED |
