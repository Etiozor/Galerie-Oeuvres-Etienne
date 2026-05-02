---
phase: "03-public-gallery"
plan: "01"
subsystem: "frontend-public"
status: "complete"
completed: "2026-05-02"
duration: "~20min"
tags:
  - design-system
  - gallery
  - masonry
  - infinite-scroll
  - fonts
  - css

dependency_graph:
  requires:
    - "02-04: pipeline validation (artworks avec pipelineState=published)"
    - "01-xx: DB schema (artworks, artworkTypes, mediums)"
    - "01-xx: StorageProvider (getStorage, getUrl)"
  provides:
    - "galerie publique / (Server Component + GalleryClient)"
    - "composants gallery/* réutilisables par Plan 02 (filtres) et Plan 03 (détail)"
    - "design system complet (tokens CSS, polices Google, layout)"
  affects:
    - "src/app/layout.tsx (polices globales)"
    - "src/app/globals.css (tokens CSS)"
    - "src/app/page.tsx (remplace page placeholder)"

tech_stack:
  added:
    - "next/font/google : Oswald + Space_Mono + Cormorant_Garamond auto-hébergées"
    - "CSS columns natif : masonry sans dépendance JS"
    - "IntersectionObserver natif : infinite scroll sans lib tierce"
  patterns:
    - "Server Component → Client Component data handoff (artworksWithUrls props)"
    - "Inline styles pour badges (spec-exact, sans risque de purge Tailwind)"
    - "TDD RED→GREEN pour helpers fonctions pures (parseDimension, buildAspectRatio)"

key_files:
  created:
    - src/app/globals.css
    - src/lib/gallery/helpers.ts
    - tests/gallery/helpers.test.ts
    - src/components/layout/BackgroundDecor.tsx
    - src/components/layout/SiteNav.tsx
    - src/components/artwork/ArtworkStatusBadge.tsx
    - src/components/gallery/MasonryGrid.tsx
    - src/components/gallery/ArtworkCard.tsx
    - src/components/gallery/ScrollSentinel.tsx
    - src/components/gallery/FilterBar.tsx
    - src/components/gallery/GalleryClient.tsx
  modified:
    - src/app/layout.tsx
    - src/app/page.tsx

decisions:
  - "FilterBar créé en placeholder intentionnel (Plan 01) — implémentation complète Plan 02"
  - "CSS columns choisi sur masonry JS — Baseline Widely Available depuis 2017, zéro reflow"
  - "Chargement toutes œuvres en une requête côté serveur — filtrage client (< 500 œuvres A1)"
  - "Styles inline sur ArtworkStatusBadge — spec-exact, cohérent avec PipelineBadge Phase 2"
  - "entries[0]?.isIntersecting avec optional chaining — TypeScript strict (TS2532)"

metrics:
  duration: "~20min"
  completed: "2026-05-02"
  tasks_completed: 3
  tasks_total: 3
  files_created: 11
  files_modified: 2
---

# Phase 03 Plan 01 : Design System + Galerie Masonry — Summary

**One-liner :** Galerie publique masonry CSS (3/2/1 colonnes) avec infinite scroll IntersectionObserver, design system Oswald/Space Mono/Cormorant Garamond, badges statut funky inline-styles, et guard de sécurité pipelineState=published.

---

## Tâches exécutées

| # | Tâche | Commit | Statut |
|---|-------|--------|--------|
| 1 | Design system — layout.tsx, globals.css, tokens palette, polices Google | c405bfd | DONE |
| 2 | Composants de mise en page — BackgroundDecor, SiteNav, ArtworkStatusBadge | e2c796d | DONE |
| 3 | Galerie principale — MasonryGrid, ArtworkCard, ScrollSentinel, GalleryClient, page.tsx | f37df37 | DONE |

---

## Ce qui a été construit

### Design System (Tâche 1)
- **`src/app/layout.tsx`** : Trois polices Google (Oswald, Space_Mono, Cormorant_Garamond) chargées via `next/font/google` avec `display: swap`. Variables CSS injectées sur `<html>`. `metadataBase` configuré pour les og:image absolues.
- **`src/app/globals.css`** : Tokens CSS palette D-01 via `@theme inline` Tailwind 4 : `--color-bg: #f2e8cf`, `--color-surface: #ede0b8`, etc. Règle CSS `.artwork-card:hover .artwork-overlay` pour l'overlay D-11.
- **`src/lib/gallery/helpers.ts`** : `parseDimension()` et `buildAspectRatio()` — convertissent les colonnes `numeric` Drizzle (retournées comme string par node-postgres) en valeurs CSS valides.
- **`tests/gallery/helpers.test.ts`** : 8 tests unitaires (TDD RED→GREEN) couvrant null, undefined, string vide, "0", et les cas nominaux.

### Composants de mise en page (Tâche 2)
- **`BackgroundDecor.tsx`** : SVG avec `feTurbulence` + `feDisplacementMap`, 5 formes organiques, palette D-01 à opacité 0.15–0.22, `position: fixed`, `z-index: 0`, `pointer-events: none`, `aria-hidden: true`.
- **`SiteNav.tsx`** : Navigation 56px, fond `#ede0b8`, logo Oswald uppercase, liens Space Mono, sticky top-0, deux liens GALERIE et À PROPOS. Zéro coins arrondis (D-03).
- **`ArtworkStatusBadge.tsx`** : Badges funky inline-styles — `available` (puce teal 6×6px + texte lowercase), `sold` (stamp rouge `rotate(-4deg)`), `reserved` (encadré orange 2px), `given` (texte vert barré).

### Galerie principale (Tâche 3)
- **`MasonryGrid.tsx`** : CSS `columns: 3` (≥1024px) / `2` (768–1023px) / `1` (<768px), `column-gap: 2px`, via tag `<style>` inline.
- **`ArtworkCard.tsx`** : Image avec `aspectRatio` calculé depuis `widthCmNum / heightCmNum`, `breakInside: 'avoid'`, `maxHeight: 640px`, overlay `rgba(42,42,42,0.55)` via classes CSS. Info strip titre Oswald tronqué + ArtworkStatusBadge.
- **`ScrollSentinel.tsx`** : `'use client'`, `IntersectionObserver` avec `threshold: 0.1`, cleanup `observer.disconnect()`, indicateur 3 carrés pulse teal animés.
- **`FilterBar.tsx`** : Placeholder Plan 01 — interface publique définie (types, mediums, callbacks), implémentation complète en Plan 02.
- **`GalleryClient.tsx`** : `'use client'`, `useSearchParams` + `useRouter` (persistance URL D-13), `useState(BATCH_SIZE)` + `useEffect` reset sur filtre (correction piège 6), filtrage client, `ScrollSentinel` branché.
- **`src/app/page.tsx`** : Server Component, requête Drizzle `pipelineState='published'`, résolution URLs côté serveur, `<Suspense>` obligatoire (piège 2).

---

## Critères de succès vérifiés

- [x] Design system actif : fond `#f2e8cf`, trois polices Google chargées, tokens CSS disponibles
- [x] `BackgroundDecor` visible en position fixe sans bloquer les interactions
- [x] `SiteNav` avec liens GALERIE et À PROPOS
- [x] Grille masonry CSS : 3 colonnes desktop, 2 tablette, 1 mobile — sans JS de layout
- [x] Chaque carte a un aspect-ratio proportionnel aux dimensions de l'œuvre
- [x] Hover desktop : overlay `rgba(42,42,42,0.55)` + "Voir l'œuvre" en 0.25s
- [x] Badges statut funky : teal/stamp rouge/encadré orange/barré vert
- [x] IntersectionObserver charge 6 œuvres supplémentaires au bas de la grille
- [x] Seules les œuvres `pipelineState='published'` sont visibles (T-03-01)
- [x] `npx tsc --noEmit` : 0 erreur
- [x] `npx vitest run tests/gallery/helpers.test.ts` : 8 tests verts

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] TypeScript strict — entries[0] potentiellement undefined**
- **Trouvé pendant :** Tâche 3, vérification `tsc --noEmit`
- **Erreur :** `TS2532: Object is possibly 'undefined'` sur `entries[0].isIntersecting` dans `ScrollSentinel.tsx`
- **Fix :** Optional chaining `entries[0]?.isIntersecting`
- **Fichier modifié :** `src/components/gallery/ScrollSentinel.tsx`
- **Impact :** Aucun changement fonctionnel — `entries[0]` est toujours présent (un seul élément observé)

### Stubs intentionnels

**FilterBar.tsx** : Placeholder intentionnel documenté dans le code. Interface publique définie pour que GalleryClient compile. Plan 02 remplace le contenu par les boutons toggle avec état actif jaune et persistance URL (D-12, D-13).

---

## Known Stubs

| Stub | Fichier | Raison |
|------|---------|--------|
| FilterBar placeholder | `src/components/gallery/FilterBar.tsx` | Intentionnel — Plan 02 implémente les vrais filtres. La galerie est fonctionnelle sans filtres. |

La galerie affiche les œuvres publiées correctement. Le stub FilterBar n'empêche pas l'objectif du Plan 01 (galerie navigable avec scroll infini et design system).

---

## Threat Flags

Aucune nouvelle surface de sécurité non prévue dans le threat_model.

Le guard `eq(artworks.pipelineState, 'published')` dans `page.tsx` est en place (mitigation T-03-01 appliquée).

---

## Self-Check: PASSED

Fichiers vérifiés :
- `src/app/layout.tsx` : FOUND
- `src/app/globals.css` : FOUND
- `src/lib/gallery/helpers.ts` : FOUND
- `tests/gallery/helpers.test.ts` : FOUND
- `src/components/layout/BackgroundDecor.tsx` : FOUND
- `src/components/layout/SiteNav.tsx` : FOUND
- `src/components/artwork/ArtworkStatusBadge.tsx` : FOUND
- `src/components/gallery/MasonryGrid.tsx` : FOUND
- `src/components/gallery/ArtworkCard.tsx` : FOUND
- `src/components/gallery/ScrollSentinel.tsx` : FOUND
- `src/components/gallery/FilterBar.tsx` : FOUND
- `src/components/gallery/GalleryClient.tsx` : FOUND
- `src/app/page.tsx` : FOUND

Commits vérifiés :
- c405bfd : FOUND
- e2c796d : FOUND
- f37df37 : FOUND
