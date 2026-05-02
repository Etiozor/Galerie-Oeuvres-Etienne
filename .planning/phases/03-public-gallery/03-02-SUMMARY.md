---
phase: "03-public-gallery"
plan: "02"
subsystem: "frontend-public"
status: "complete"
completed: "2026-05-02"
duration: "~5min"
tags:
  - gallery
  - filters
  - tdd
  - url-params
  - filter-utils

dependency_graph:
  requires:
    - "03-01: GalleryClient avec placeholder FilterBar et hooks URL"
    - "01-xx: DB schema (artworkTypes, mediums — ArtworkType, Medium types)"
  provides:
    - "FilterBar complète avec boutons toggle type + médium"
    - "filter-utils.ts (filterArtworks, buildFilterUrl) testables unitairement"
    - "11 tests unitaires couvrant filtrage et construction URL params"
  affects:
    - "src/components/gallery/FilterBar.tsx (remplace le placeholder Plan 01)"
    - "src/lib/gallery/filter-utils.ts (nouvelle lib testable)"

tech_stack:
  added:
    - "filter-utils.ts : fonctions pures extraites de GalleryClient pour la testabilité"
  patterns:
    - "TDD RED→GREEN : tests écrits avant l'implémentation (fd849e9 → 0b19e23)"
    - "Styles inline pour conformité spec exacte (même décision que ArtworkStatusBadge)"
    - "Générique T extends FilterableArtwork : preserve le type complet sans perte"
    - "URLSearchParams copie défensive (toString()) pour éviter la mutation du state React"

key_files:
  created:
    - tests/gallery/filters.test.ts
    - src/lib/gallery/filter-utils.ts
  modified:
    - src/components/gallery/FilterBar.tsx

decisions:
  - "Styles inline sur FilterBar : cohérent avec ArtworkStatusBadge, garantit spec exacte (pas de risque purge Tailwind)"
  - "filterArtworks générique (T extends FilterableArtwork) : préserve ArtworkWithUrls sans cast"
  - "result.at(0)?.id au lieu de result[0].id : fix TypeScript strict TS2532 dans le test"
  - "scrollbarWidth: none sur FilterBar mobile : scroll horizontal silencieux sur téléphone"

metrics:
  duration: "~5min"
  completed: "2026-05-02"
  tasks_completed: 2
  tasks_total: 2
  files_created: 2
  files_modified: 1
---

# Phase 03 Plan 02 : Filtres galerie (FilterBar) — Summary

**One-liner :** FilterBar complète avec boutons toggle type+médium (sticky, #f4e285 actif, URL params persistés) et filter-utils.ts extrait en fonctions pures testées TDD (11 tests verts).

---

## Tâches exécutées

| # | Tâche | Commit (RED) | Commit (GREEN/FEAT) | Statut |
|---|-------|-------------|---------------------|--------|
| 1 | Tests unitaires (TDD RED puis GREEN) | fd849e9 | 0b19e23 | DONE |
| 2 | Implémentation complète FilterBar | — | a113d43 | DONE |

---

## Ce qui a été construit

### Tâche 1 — filter-utils.ts + tests unitaires (TDD)

**Phase RED (`fd849e9`) :**
`tests/gallery/filters.test.ts` — 11 tests écrits avant toute implémentation.
Tests couvrant : liste vide, aucun filtre, filtre type seul, médium seul, intersection, valeur inexistante, exclusion des null; et 4 cas buildFilterUrl (ajout, suppression, remplacement, conservation).

**Phase GREEN (`0b19e23`) :**
`src/lib/gallery/filter-utils.ts` — deux fonctions pures exportées :
- `filterArtworks<T extends FilterableArtwork>` : filtrage cumulatif (ET logique), `String(null) !== '1'` → les œuvres sans typeId sont naturellement exclues quand un filtre est actif.
- `buildFilterUrl(key, value, currentParams)` : copie défensive de URLSearchParams (`new URLSearchParams(currentParams.toString())`) pour ne jamais muter le state React ; `params.set()` si valeur non-vide, `params.delete()` si vide.

### Tâche 2 — FilterBar complète (`a113d43`)

`src/components/gallery/FilterBar.tsx` — remplace le placeholder Plan 01 :
- Deux groupes de boutons (TYPE : et MÉDIUM :) avec un séparateur vertical
- Chaque bouton fonctionne en toggle : clic sur filtre actif → désactivation (`onTypeChange('')`)
- Styles inline conformes UI-SPEC section 3 : `#f4e285` actif, `transparent` inactif
- `position: 'sticky'`, `top: '56px'` sous SiteNav, `z-index: 9`
- `overflowX: 'auto'`, `scrollbarWidth: 'none'` : scroll horizontal silencieux sur mobile
- `aria-pressed={isActive}` sur chaque bouton (accessibilité)
- D-03 : aucune propriété `borderRadius` dans le fichier

---

## Critères de succès vérifiés

- [x] `npx vitest run tests/gallery/filters.test.ts` → 11 tests verts
- [x] FilterBar avec boutons toggle type + médium fonctionnels
- [x] URL mise à jour sans rechargement (via `onTypeChange`/`onMediumChange` → `router.replace` dans GalleryClient)
- [x] Filtre actif : fond `#f4e285`, bordure `#1a1a1a` — inactif : transparent, `#5a5244`
- [x] Aucun `rounded-*` dans FilterBar
- [x] Sticky positionnée à `top: 56px` sous la SiteNav
- [x] `npx tsc --noEmit` propre (0 erreur)

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] TypeScript strict — TS2532 sur `result[0]` dans le test**
- **Trouvé pendant :** Vérification `tsc --noEmit` après Tâche 2
- **Erreur :** `TS2532: Object is possibly 'undefined'` sur `result[0].id` dans `filters.test.ts`
- **Fix :** Remplacement par `result.at(0)?.id` (accès sûr compatible TypeScript strict)
- **Fichier modifié :** `tests/gallery/filters.test.ts` (ligne 48)
- **Impact :** Aucun changement sémantique — `result` a exactement 1 élément à ce stade du test

---

## Known Stubs

Aucun stub — FilterBar est entièrement implémentée. Le placeholder Plan 01 est remplacé.

---

## Threat Flags

Aucune nouvelle surface de sécurité non prévue dans le threat_model.

Les URL params `?type=X&medium=Y` sont comparés à `String(typeId)` — une valeur arbitraire ne correspondra à aucun ID valide et `filteredArtworks` sera vide. Disposition `accept` confirmée (T-03-04).

---

## TDD Gate Compliance

- [x] Commit RED : `fd849e9` — `test(03-02): add failing tests...`
- [x] Commit GREEN : `0b19e23` — `feat(03-02): implement filterArtworks and buildFilterUrl...`
- [x] Commit FEAT : `a113d43` — `feat(03-02): implement FilterBar...`

---

## Self-Check: PASSED

Fichiers vérifiés :
- `tests/gallery/filters.test.ts` : FOUND
- `src/lib/gallery/filter-utils.ts` : FOUND
- `src/components/gallery/FilterBar.tsx` : FOUND (placeholder remplacé)

Commits vérifiés :
- `fd849e9` : FOUND (test RED)
- `0b19e23` : FOUND (feat GREEN filter-utils)
- `a113d43` : FOUND (feat FilterBar)
