---
phase: 08-responsive-mobile-tablette
plan: "02"
subsystem: layout-css
tags: [responsive, mobile, css-media-queries, drawer, filterbar, detail-page]
dependency_graph:
  requires:
    - "08-01: HamburgerMenu Client Component + SiteNav mobile"
    - "05: Admin ArtworksClient drawer (DRAWER_MIN/MAX/DEFAULT)"
    - "03: FilterBar chips + artworks/[id] detail page"
  provides:
    - "Drawer admin 100% largeur mobile via CSS @media + !important"
    - "FilterBar scroll horizontal mobile — flex-wrap nowrap overflow-x auto"
    - "Panel info artworks/[id] non-sticky mobile — scroll naturel vers OfferForm"
  affects:
    - "src/app/admin/artworks/_components/ArtworksClient.tsx"
    - "src/components/gallery/FilterBar.tsx"
    - "src/app/artworks/[id]/page.tsx"
tech_stack:
  added: []
  patterns:
    - "CSS @media inline <style> avec !important pour override style inline JS (ArtworksClient)"
    - "Fragment <> + <style> inline pour rules @media dans FilterBar"
    - "className + @media override style inline sticky — artworks/[id]"
key_files:
  created: []
  modified:
    - "src/app/admin/artworks/_components/ArtworksClient.tsx"
    - "src/components/gallery/FilterBar.tsx"
    - "src/app/artworks/[id]/page.tsx"
decisions:
  - "!important justifié sur .admin-drawer-panel — seul moyen d'overrider style inline JS width: drawerWidth"
  - "Fragment <> dans FilterBar pour juxtaposer <style> et <div className=filterbar-container>"
  - "scroll-padding-bottom sur .detail-info-panel (pas sur le body) — scope limité au panel"
metrics:
  duration: "15m"
  completed: "2026-06-07"
  tasks_completed: 2
  tasks_total: 2
  files_created: 0
  files_modified: 3
---

# Phase 8 Plan 02: CSS fixes responsive — drawer admin, FilterBar, panel info — Summary

**One-liner:** Drawer admin 100% largeur mobile via @media + !important, FilterBar scroll horizontal nowrap, panel info artworks/[id] non-sticky avec scroll-padding-bottom 80px.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 8-02-01 | ArtworksClient.tsx — drawer 100% largeur mobile | `4680ede` | src/app/admin/artworks/_components/ArtworksClient.tsx |
| 8-02-02 | FilterBar scroll horizontal + panel non-sticky | `69f57b8` | src/components/gallery/FilterBar.tsx, src/app/artworks/[id]/page.tsx |

## What Was Built

### ArtworksClient.tsx — Drawer admin mobile (Task 8-02-01)

Règles CSS ajoutées dans le bloc `<style>` existant du composant :

- `@media (max-width: 767px)` avec `.admin-drawer-panel { width: 100% !important; min-width: 0 !important; }` — override le style inline JS `width: drawerWidth` (360-720px)
- `.admin-grid-padding { padding-right: 0 !important; }` — supprime le décalage de la grille quand le drawer est pleine largeur
- `className="admin-drawer-panel"` sur le div drawer (avec `ref={drawerRef}`)
- `className="admin-grid-padding"` sur le div grille (avec `paddingRight: selectedArtwork ? ...`)
- Commentaires français expliquant le POURQUOI du `!important` (impossible autrement sur style inline React)

### FilterBar.tsx — Scroll horizontal mobile (Task 8-02-02 / Part A)

Refactoring du conteneur de chips :

- Remplacement de `<div style={{ flexWrap: 'wrap' }}>` par Fragment `<>` + `<style>` + `<div className="filterbar-container">`
- `.filterbar-container` : `display: flex; flex-wrap: wrap; gap: 6px; align-items: center` (desktop inchangé)
- `@media (max-width: 768px)` : `flex-wrap: nowrap; overflow-x: auto; -webkit-overflow-scrolling: touch; scrollbar-width: none`
- Scrollbar masquée : `scrollbar-width: none` + `.filterbar-container::-webkit-scrollbar { display: none }`
- Chips inchangés — logique isActive, isEmpty, counts identique

### artworks/[id]/page.tsx — Panel info non-sticky mobile (Task 8-02-02 / Part B)

Extension du bloc `<style>` existant :

- Règle `@media (max-width: 1023px)` supplémentaire pour `.detail-info-panel` : `position: static; max-height: none; overflow-y: visible; scroll-padding-bottom: 80px`
- `className="detail-info-panel"` ajouté au div panel (style inline sticky/maxHeight conservé pour desktop ≥1024px)
- Commentaires français expliquant pourquoi sticky est désactivé sur mobile et pourquoi scroll-padding-bottom est nécessaire

## Acceptance Criteria Verified

### Task 8-02-01
- [x] `admin-drawer-panel` présent dans ArtworksClient.tsx (3 occurrences : CSS + 2 className)
- [x] `admin-grid-padding` présent dans ArtworksClient.tsx (3 occurrences : CSS + 2 commentaires/className)
- [x] `@media (max-width: 767px)` présent
- [x] `width: 100% !important` présent
- [x] `min-width: 0 !important` présent
- [x] `padding-right: 0 !important` présent

### Task 8-02-02
- [x] `filterbar-container` présent dans FilterBar.tsx
- [x] `@media (max-width: 768px)` présent dans FilterBar.tsx
- [x] `flex-wrap: nowrap` présent dans FilterBar.tsx
- [x] `overflow-x: auto` présent dans FilterBar.tsx
- [x] `scrollbar-width: none` présent dans FilterBar.tsx
- [x] `detail-info-panel` présent dans artworks/[id]/page.tsx (3 occurrences : CSS + commentaire + className)
- [x] `position: static` présent dans artworks/[id]/page.tsx
- [x] `max-height: none` présent dans artworks/[id]/page.tsx
- [x] `scroll-padding-bottom: 80px` présent dans artworks/[id]/page.tsx
- [x] `@media (max-width: 1023px)` présent 2 fois dans artworks/[id]/page.tsx (detail-grid + detail-info-panel)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Commentaire JSX invalide entre `return (` et l'élément racine dans ArtworksClient.tsx**

- **Found during:** Task 8-02-01 — vérification TypeScript
- **Issue:** J'avais placé `{/* comment */}` entre `return (` et `<div>` dans un IIFE, ce qui est syntaxiquement invalide en TSX (erreur TS1005 ')' expected à la ligne 602)
- **Fix:** Remplacement par un commentaire JS standard `/* ... */` (sans accolades JSX) placé entre `return (` et le JSX
- **Files modified:** src/app/admin/artworks/_components/ArtworksClient.tsx
- **Commit:** inclus dans `4680ede`

## TypeScript Status

`npx tsc --noEmit` : erreurs pré-existantes dans `tests/gallery/detail.test.ts` et `tests/pipeline/*.test.ts` — identiques à celles documentées dans 08-01-SUMMARY.md. Aucune erreur dans les fichiers modifiés par ce plan.

## Test Suite Status

`npx vitest run` : 7 failures / 105 passed — identiques aux failures pré-existantes vérifiées sur le commit de base avant stash. Aucune régression introduite par ce plan.

Failures pré-existants (hors périmètre) :
- `tests/pipeline/*.test.ts` — module `@/actions/pipeline` manquant
- `tests/gallery/detail.test.ts` — type `ArtworkForMetadata` mismatch
- `tests/admin/artwork-actions.test.ts` — Test 5 deleteArtwork
- `tests/offers/history.test.ts` — OfferHistory button "Voir toutes les offres"

## D-03 Compliance

Aucun `border-radius` non-nul ajouté dans ce plan. Les seuls `border-radius` présents dans les fichiers modifiés proviennent du code Phase 3 existant (`var(--radius-sm)` = 3px sur les chips FilterBar) — non modifié.

## Known Stubs

Aucun — les modifications sont purement CSS et n'introduisent aucune donnée stub ni placeholder.

## Threat Flags

Aucune nouvelle surface de sécurité. Ce plan modifie uniquement des styles CSS.

| Threat ID | Disposition | Résultat |
|-----------|-------------|----------|
| T-08-02-01 (CSS !important drawer admin) | accept | Le !important overrride uniquement le width du drawer admin (protégé par auth artiste). CSS-only, pas d'exposition de données. |

## Self-Check: PASSED

- `src/app/admin/artworks/_components/ArtworksClient.tsx` — FOUND, contient admin-drawer-panel et admin-grid-padding
- `src/components/gallery/FilterBar.tsx` — FOUND, contient filterbar-container et @media 768px
- `src/app/artworks/[id]/page.tsx` — FOUND, contient detail-info-panel et scroll-padding-bottom: 80px
- Commit `4680ede` — FOUND (task 8-02-01)
- Commit `69f57b8` — FOUND (task 8-02-02)
