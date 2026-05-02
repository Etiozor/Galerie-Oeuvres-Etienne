---
phase: 03-public-gallery
plan: "04"
subsystem: ui
tags: [nextjs, server-components, tailwind, typography, vitest]

# Dependency graph
requires:
  - phase: 03-01
    provides: BackgroundDecor, SiteNav, design tokens CSS (--font-oswald, --font-space-mono, --font-cormorant, --color-*)

provides:
  - Page /about — layout 2 colonnes desktop, texte placeholder, Server Component statique
  - Page 404 globale — not-found.tsx Next.js App Router, titre Oswald 48px, lien retour teal
  - Suite smoke tests gallery complète (18 tests verts)

affects: [03-public-gallery, 04-visitor-profiles, 05-admin-backoffice]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Smoke tests statiques : readFileSync pour vérifier contenu sans rendu React"
    - "JSX : guillemets et apostrophes comme expressions JS ({\"texte\"}) pour matcher les tests"
    - "Server Component pur : pas de 'use client', pas de requête DB, pas de hooks"

key-files:
  created:
    - src/app/about/page.tsx
    - src/app/not-found.tsx
    - tests/gallery/about.test.ts
  modified: []

key-decisions:
  - "Apostrophes et guillemets dans JSX via expressions JS ({'text'}) et pas d'entités HTML — les smoke tests lisent le source brut"
  - "Page 404 sans SiteNav ni BackgroundDecor — Next.js App Router rend not-found.tsx dans un contexte d'erreur qui ne garantit pas le layout parent"
  - "Layout 2 colonnes About via <style> inline — évite Tailwind custom class pour une grille responsive simple"

patterns-established:
  - "Smoke test statique : tester le contenu d'un Server Component en lisant le fichier source (pas de rendu React)"

requirements-completed: [ABOUT-01]

# Metrics
duration: 12min
completed: 2026-05-02
---

# Phase 3 Plan 04: About et 404 Summary

**Page /about (layout 2 colonnes D-18) et page 404 globale (not-found.tsx) complétant la Phase 3 galerie publique**

## Performance

- **Duration:** 12 min
- **Started:** 2026-05-02T13:21:00Z
- **Completed:** 2026-05-02T13:33:00Z
- **Tasks:** 2 (TDD : RED → GREEN)
- **Files modified:** 3 créés

## Accomplishments

- Page `/about` Server Component statique : grid 2 colonnes desktop (1fr 1fr), photo placeholder fond `--color-surface`, texte placeholder Cormorant Garamond 17px italique, titre Oswald 28px uppercase
- Page 404 globale `not-found.tsx` : titre "404" Oswald 48px, sous-titre Space Mono, lien "← Retour à la galerie" en teal — conforme UI-SPEC section 13
- 10 smoke tests verts (5 about + 5 not-found) — suite gallery complète 18 tests
- Phase 3 galerie publique intégralement complétée (plans 01 à 04)

## Task Commits

1. **RED — Tests smoke About et 404 (échouent)** - `60eab5b` (test)
2. **GREEN — about/page.tsx + not-found.tsx** - `a4e0526` (feat)

## Files Created/Modified

- `tests/gallery/about.test.ts` — 10 smoke tests : existence fichiers, contenu texte, export default, couleurs, polices
- `src/app/about/page.tsx` — Server Component statique, layout 2 colonnes D-18, polices et couleurs via var(--*)
- `src/app/not-found.tsx` — Page 404 globale Next.js App Router, Oswald 48px, lien teal

## Decisions Made

- **JSX expressions pour les apostrophes** : `{"Cette page n'existe pas."}` plutôt que `n&apos;existe pas` — les smoke tests lisent le source brut avec `readFileSync`, les entités HTML ne matchent pas les apostrophes.
- **not-found.tsx sans SiteNav** : le composant 404 s'exécute dans un contexte d'erreur Next.js ; inclure SiteNav aurait pu causer des erreurs si les polices ou l'état global ne sont pas disponibles. La page reste fonctionnelle avec le body `--color-bg` de globals.css.
- **Layout About via `<style>` inline** : la grille responsive simple (2 colonnes → 1 colonne) ne justifie pas une classe Tailwind personnalisée. La media query inline est lisible et maintenable.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Entités HTML incompatibles avec les smoke tests**
- **Found during:** Tâche 1 GREEN (run tests)
- **Issue:** Le JSX utilisait `&apos;` et `&quot;` comme entités HTML ; les smoke tests cherchent les caractères littéraux `'` et `"` dans le source brut du fichier
- **Fix:** Remplacé `l&apos;artiste` → `{"À propos de l'artiste"}`, `n&apos;existe pas` → `{"Cette page n'existe pas."}`, `&quot;404&quot;` → `{"404"}` — expressions JSX valides
- **Files modified:** `src/app/about/page.tsx`, `src/app/not-found.tsx`
- **Verification:** `npx vitest run tests/gallery/about.test.ts` → 10/10 verts
- **Committed in:** a4e0526 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 — bug de compatibilité JSX/test)
**Impact on plan:** Correction mineure de syntaxe JSX. Aucun impact sur le comportement rendu en navigateur.

## Issues Encountered

Aucun problème bloquant. L'unique ajustement (entités HTML → expressions JSX) a été résolu immédiatement lors de la première exécution des tests GREEN.

## User Setup Required

Aucune — pages statiques sans configuration externe.

## Next Phase Readiness

- Phase 3 complète : galerie masonry, infinite scroll, filtres URL, page détail avec nav précédent/suivant, page About, page 404
- Phase 4 peut démarrer : profils visiteurs, offres, historique, emails (Resend)
- Le bouton "Faire une offre" sur la page détail est affiché mais non fonctionnel — câblage prévu Phase 4
- Aucun bloqueur identifié

## Self-Check

Vérification des fichiers créés et commits :

- `src/app/about/page.tsx` — FOUND
- `src/app/not-found.tsx` — FOUND
- `tests/gallery/about.test.ts` — FOUND
- Commit `60eab5b` (RED) — FOUND
- Commit `a4e0526` (GREEN) — FOUND
- `npx vitest run tests/gallery/` — 18/18 tests verts
- `npx tsc --noEmit` — aucune erreur TS

## Self-Check: PASSED

---
*Phase: 03-public-gallery*
*Completed: 2026-05-02*
