---
phase: 08-responsive-mobile-tablette
plan: "01"
subsystem: layout
tags: [hamburger-menu, mobile, responsive, client-component, tdd]
dependency_graph:
  requires:
    - "05-05: SiteNav async Server Component + session iron-session"
    - "03: Design system D-01..D-17 (D-03 zéro coins arrondis)"
  provides:
    - "HamburgerMenu Client Component — panneau latéral mobile ≤768px"
    - "SiteNav responsive — masquage CSS @media desktop/mobile"
  affects:
    - "src/components/layout/SiteNav.tsx"
    - "src/app/layout.tsx (via SiteNav)"
tech_stack:
  added:
    - "@testing-library/react (jsdom tests HamburgerMenu)"
  patterns:
    - "Client Component fils d'un Server Component async (pattern ModalTrigger)"
    - "<style> inline @media — pattern établi dans MasonryGrid.tsx"
    - "TDD RED/GREEN cycle — test first puis implémentation"
key_files:
  created:
    - "src/components/layout/HamburgerMenu.tsx"
    - "src/components/layout/HamburgerMenu.test.tsx"
  modified:
    - "src/components/layout/SiteNav.tsx"
decisions:
  - "Client Component séparé de SiteNav pour préserver le Server Component async (pattern ModalTrigger)"
  - "CSS @media inline <style> — cohérent avec MasonryGrid.tsx, pas de Tailwind ni CSS Modules"
  - "D-03 border-radius: 0 sur tous les éléments — panneau, overlay, boutons, carré initiale"
  - "overflow: hidden sur document.body pour bloquer le scroll iOS derrière l'overlay"
metrics:
  duration: "4m 3s"
  completed: "2026-06-07"
  tasks_completed: 3
  tasks_total: 3
  files_created: 2
  files_modified: 1
---

# Phase 8 Plan 01: HamburgerMenu Client Component + SiteNav mobile — Summary

**One-liner:** Panneau hamburger mobile 280px avec animation slideInFromRight, overlay iOS-safe, Escape key, D-03 border-radius:0 — Client Component fils de SiteNav Server Component async.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 8-01-01 | Créer HamburgerMenu.test.tsx (TDD red) | `0b2da08` | src/components/layout/HamburgerMenu.test.tsx |
| 8-01-02 | Créer HamburgerMenu.tsx (Client Component) | `58bfac4` | src/components/layout/HamburgerMenu.tsx |
| 8-01-03 | Modifier SiteNav.tsx — intégrer HamburgerMenu | `e14f37c` | src/components/layout/SiteNav.tsx |

## What Was Built

### HamburgerMenu.tsx (Client Component)

Composant hamburger menu mobile complet avec :

- Bouton ≡ 44×44px (touch target minimum mobile)
- Panneau latéral 280px depuis la droite, z-index: 51
- Animation `slideInFromRight 0.22s ease-out` via `@keyframes` inline
- Overlay `rgba(26,26,26,0.5)`, z-index: 50, fermeture au tap
- Croix de fermeture 44×44px dans le panneau
- `useEffect` overflow body (`hidden`/`''`) — iOS scroll lock fix
- `useEffect` `keydown` Escape — accessibilité clavier
- `aria-label="Ouvrir le menu"` + `aria-expanded={isOpen}` sur le bouton
- `role="dialog"` + `aria-label="Menu de navigation"` sur le panneau
- Safe area iPhone : `paddingBottom: env(safe-area-inset-bottom, 16px)`
- Props : `isLoggedIn: boolean`, `displayName?: string`
- Lien conditionnel : "S'identifier" ou carré initiale + "Mon profil"
- D-03 : aucun `border-radius` non-nul sur aucun élément

### HamburgerMenu.test.tsx (11 tests)

Tests TDD jsdom couvrant :
- Bouton fermé par défaut, `aria-expanded="false"`, pas de dialog
- Ouverture au clic → dialog présent, `aria-expanded="true"`
- Fermeture via overlay (`aria-hidden="true"`)
- Fermeture via croix (bouton "Fermer le menu")
- Fermeture sur touche Escape
- `document.body.style.overflow === 'hidden'` quand ouvert
- `document.body.style.overflow === ''` quand fermé
- Lien "S'identifier" quand `isLoggedIn=false`
- "Mon profil" + initiale "A" quand `isLoggedIn=true, displayName="Alice"`
- D-03 : `border-radius` absent ou 0 sur le panneau dialog
- Liens "Galerie" et "À propos" présents dans le panneau

### SiteNav.tsx (modifié)

- Import `HamburgerMenu` ajouté
- Balise `<style>` inline avec `.sitenav-desktop-links` et `.sitenav-hamburger`
- `@media (max-width: 768px)` : desktop masqué, hamburger affiché
- Div `.sitenav-hamburger` avec `<HamburgerMenu isLoggedIn={isLoggedIn} displayName={...} />`
- SiteNav reste `async function` — aucun `'use client'` ajouté

## Acceptance Criteria Verified

- [x] HamburgerMenu.tsx existe et commence par `'use client'`
- [x] `aria-label="Ouvrir le menu"` + `aria-expanded={isOpen}`
- [x] `role="dialog"` + `aria-label="Menu de navigation"`
- [x] `aria-label="Fermer le menu"` sur la croix
- [x] `zIndex: 50` (overlay) et `zIndex: 51` (panneau)
- [x] `overflow = 'hidden'` dans useEffect
- [x] `slideInFromRight` animation
- [x] `env(safe-area-inset-bottom)` safe area iPhone
- [x] Aucun `border-radius` avec valeur non-nulle (D-03)
- [x] 11/11 tests passent (`npx vitest run src/components/layout/HamburgerMenu.test.tsx`)
- [x] SiteNav.tsx sans `'use client'`
- [x] `import { HamburgerMenu }` dans SiteNav.tsx
- [x] `.sitenav-desktop-links` et `.sitenav-hamburger` dans SiteNav.tsx
- [x] `@media (max-width: 768px)` dans SiteNav.tsx
- [x] `await getVisitorSession()` conservé dans SiteNav.tsx
- [x] Aucune erreur TypeScript dans les fichiers créés/modifiés

## TDD Gate Compliance

- RED gate: commit `0b2da08` — `test(08-01)` — tests échouent avec "Cannot find module"
- GREEN gate: commit `58bfac4` — `feat(08-01)` — 11/11 tests passent
- REFACTOR gate: non requis — code propre dès l'écriture initiale

## Deviations from Plan

None — plan exécuté exactement comme spécifié.

Note : `npx tsc --noEmit` signale des erreurs TypeScript pré-existantes dans `tests/gallery/detail.test.ts` et `tests/pipeline/*.test.ts` (absentes des fichiers de ce plan). Ces erreurs existaient avant cette exécution (vérifiées par stash) — hors périmètre, déféré.

## Known Stubs

None — HamburgerMenu est entièrement câblé avec les vraies données de session (isLoggedIn, displayName) transmises depuis SiteNav Server Component.

## Threat Flags

Aucune nouvelle surface non couverte par le threat model du plan.

| Threat ID | Disposition | Résultat |
|-----------|-------------|----------|
| T-08-01-01 (XSS displayName) | accept | React JSX échappe automatiquement — pas de `dangerouslySetInnerHTML` |
| T-08-01-02 (clickjacking overlay) | accept | Même domaine, z-index 50 correct |

## Self-Check: PASSED

- `src/components/layout/HamburgerMenu.tsx` — FOUND
- `src/components/layout/HamburgerMenu.test.tsx` — FOUND
- `src/components/layout/SiteNav.tsx` (modifié) — FOUND
- Commit `0b2da08` — FOUND
- Commit `58bfac4` — FOUND
- Commit `e14f37c` — FOUND
- 11/11 tests passent — VERIFIED
