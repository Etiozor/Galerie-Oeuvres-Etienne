---
phase: 09-responsive-pages-restantes
plan: 01
subsystem: gallery-ui
tags: [responsive, mobile, filter, bottom-sheet, tdd]
dependency_graph:
  requires: []
  provides: [FilterDrawer, GalleryClient-responsive-filterbar]
  affects: [src/app/page.tsx]
tech_stack:
  added: []
  patterns: [useEffect-overflow-body, slideInFromBottom, filterbar-desktop/mobile @media]
key_files:
  created:
    - src/components/gallery/FilterDrawer.tsx
    - src/components/gallery/FilterDrawer.test.tsx
  modified:
    - src/components/gallery/GalleryClient.tsx
decisions:
  - FilterDrawer est un composant fils isolé de GalleryClient — pattern identique à HamburgerMenu (état ouvert/fermé séparé de la logique filtres)
  - Bottom sheet (slideInFromBottom) choisi plutôt qu'un panneau latéral — plus naturel sur mobile portrait
  - .filterbar-desktop / .filterbar-mobile via @media CSS — pattern D-14 du projet (jamais de Tailwind responsive)
metrics:
  duration: 5min
  completed_date: "2026-06-08"
---

# Phase 9 Plan 01: FilterDrawer — bouton compact + bottom sheet filtres mobile (GalleryClient) — Summary

## One-Liner

FilterDrawer Client Component (bottom sheet mobile) avec 10 tests TDD jsdom, intégré dans GalleryClient via masquage CSS @media (max-width: 768px).

## What Was Built

**FilterDrawer.tsx** — Client Component gérant le bouton "Filtres" compact + bottom sheet :
- Bouton 44px height (D-13), `aria-label="Ouvrir les filtres"`, `aria-expanded={isOpen}`
- Badge "· N" visible quand filtre actif (activeCount > 0)
- Overlay `aria-hidden="true"`, `z-index: 50` — ferme au clic
- Bottom sheet `role="dialog"`, `z-index: 51`, `borderRadius: 0` (D-03)
- Animation `slideInFromBottom 0.22s ease-out`
- `env(safe-area-inset-bottom, 16px)` pour iPhone notch
- Croix fermeture 44×44px (D-13), `aria-label="Fermer les filtres"`
- Escape key listener (useEffect, cleanup propre)
- `document.body.style.overflow = 'hidden'` quand ouvert (iOS scroll-lock fix)
- Chips Tous / Types / Médiums / Statuts dans le tiroir avec ChipSeparator

**FilterDrawer.test.tsx** — 10 tests unitaires jsdom :
- `@vitest-environment jsdom`
- Tests : rendu initial, ouverture, fermeture overlay, fermeture croix, Escape, overflow hidden, overflow restauré, badge absent, badge présent, D-03 borderRadius

**GalleryClient.tsx** modifié :
- Import `FilterDrawer`
- Balise `<style>` avec `.filterbar-desktop` / `.filterbar-mobile` + `@media (max-width: 768px)`
- Div `.filterbar-desktop` : contenu chips/recherche/tri desktop inchangé
- Div `.filterbar-mobile` : `<FilterDrawer activeFilter onFilterChange types mediums />`

## Test Results

```
Test Files  1 passed (1)
      Tests  10 passed (10)
```

Tous les tests FilterDrawer passent. Suite complète : 115 tests passent (7 échecs pre-existants dans tests/pipeline/ et tests/gallery/detail.test.ts — hors scope de ce plan).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Ajout de `sortOrder: 0` dans les props de test**
- **Found during:** Task 2 (vérification TypeScript `npx tsc --noEmit`)
- **Issue:** Le type `ArtworkType` du schéma Drizzle a un champ `sortOrder: integer` requis. Le `baseProps` du plan ne l'incluait pas, causant 10 erreurs TypeScript.
- **Fix:** Ajout de `sortOrder: 0` dans `types` et `mediums` de `baseProps` dans `FilterDrawer.test.tsx`.
- **Files modified:** `src/components/gallery/FilterDrawer.test.tsx`
- **Commit:** `2832153`

**2. [Rule 2 - D-03] Correction borderRadius sur le Chip helper de GalleryClient**
- **Found during:** Task 2 (lecture de GalleryClient.tsx)
- **Issue:** `Chip` helper avait `borderRadius: 3` — violation D-03 (zéro border-radius partout).
- **Fix:** Changé en `borderRadius: 0, /* D-03 */`
- **Files modified:** `src/components/gallery/GalleryClient.tsx`
- **Commit:** `2832153`

## Decisions Made

1. FilterDrawer séparé de GalleryClient — pattern identique à HamburgerMenu (state isolation)
2. Bottom sheet (depuis le bas) plutôt que panneau latéral — plus naturel sur mobile portrait, conforme à l'usage galerie moderne
3. CSS @media dans `<style>` inline — D-14 : cohérent avec MasonryGrid, SiteNav, FilterBar Phase 8

## Known Stubs

Aucun stub — FilterDrawer est entièrement fonctionnel avec les vraies données (types, mediums, activeFilter).

## Threat Flags

Aucun — surface de sécurité inchangée. FilterDrawer affiche des labels DB via props React (échappement automatique XSS). Conforme T-09-01-01.

## Self-Check

Fichiers créés :
- `src/components/gallery/FilterDrawer.tsx` — FOUND
- `src/components/gallery/FilterDrawer.test.tsx` — FOUND

Fichier modifié :
- `src/components/gallery/GalleryClient.tsx` — FOUND

Commits :
- `3f0865a` — FOUND (feat(09-01): FilterDrawer)
- `2832153` — FOUND (feat(09-01): GalleryClient)

## Self-Check: PASSED
