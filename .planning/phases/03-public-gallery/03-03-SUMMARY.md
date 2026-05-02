---
phase: "03-public-gallery"
plan: "03"
subsystem: "frontend-public"
status: "complete"
completed: "2026-05-02"
duration: "~8min"
tags:
  - artwork-detail
  - open-graph
  - seo
  - prev-next-navigation
  - tdd

dependency_graph:
  requires:
    - "03-01: design system (tokens CSS, polices, ArtworkStatusBadge, SiteNav, BackgroundDecor)"
    - "01-xx: DB schema (artworks avec pipelineState, publishedAt, relations type/medium)"
    - "01-xx: StorageProvider (getStorage, getUrl)"
  provides:
    - "page détail /artworks/[id] avec generateMetadata Open Graph"
    - "ArtworkInfoPanel (méta-grille, description, offres placeholder)"
    - "ArtworkNav (navigation prev/next entre œuvres publiées)"
    - "metadata-utils.ts (buildArtworkMetadata, truncateDescription — testable unitairement)"
  affects:
    - "src/app/artworks/[id]/page.tsx (nouvelle route publique)"
    - "src/components/artwork/ (2 nouveaux composants)"
    - "src/lib/gallery/ (1 nouveau helper)"

tech_stack:
  added:
    - "generateMetadata Next.js 15 pour Open Graph (og:title, og:description, og:images)"
    - "CSS grid 2 colonnes (1fr 420px) via style inline responsive"
    - "Drizzle RQB (db.query) avec gt/lt/asc/desc pour la navigation prev/next"
  patterns:
    - "TDD RED→GREEN : tests écrits avant l'implémentation (metadata-utils.ts)"
    - "Server Component uniquement — résolution URLs getStorage() côté serveur"
    - "parseInt + isNaN + notFound() — protection contre IDs non numériques (T-03-06)"
    - "Filtre eq(a.pipelineState, 'published') dans toutes les requêtes publiques (T-03-07)"

key_files:
  created:
    - tests/gallery/detail.test.ts
    - src/lib/gallery/metadata-utils.ts
    - src/components/artwork/ArtworkNav.tsx
    - src/components/artwork/ArtworkInfoPanel.tsx
    - src/app/artworks/[id]/page.tsx
  modified: []

decisions:
  - "metadata-utils.ts extrait hors de la page pour la testabilité unitaire sans Next.js"
  - "Style inline responsive via <style> tag pour grid-template-columns: 1fr 420px (hors échelle Tailwind)"
  - "Bouton offre affiché mais disabled en Phase 3 — montre la valeur fonctionnelle à venir"
  - "srcset avec même URL x3 en Phase 3 — les variantes de taille seront générées en Phase 6"

metrics:
  duration: "~8min"
  completed: "2026-05-02"
  tasks_completed: 2
  tasks_total: 2
  files_created: 5
  files_modified: 0
---

# Phase 03 Plan 03 : Page Détail Œuvre + Open Graph — Summary

**One-liner :** Page détail `/artworks/[id]` avec layout 2 colonnes (1fr+420px), generateMetadata OG, navigation prev/next Drizzle, guard sécurité pipelineState=published, et metadata-utils.ts testée TDD.

---

## Tâches exécutées

| # | Tâche | Commit | Statut |
|---|-------|--------|--------|
| 1 (RED) | Tests unitaires detail.test.ts (phase rouge TDD) | 2961be1 | DONE |
| 1 (GREEN) | metadata-utils.ts — buildArtworkMetadata + truncateDescription | 0ff2c96 | DONE |
| 2 | Page /artworks/[id], ArtworkInfoPanel, ArtworkNav | 7fa35de | DONE |

---

## Ce qui a été construit

### Tâche 1 — Tests unitaires et metadata-utils.ts (TDD)

**`tests/gallery/detail.test.ts`** : 9 tests unitaires en 2 suites :
- `truncateDescription` : 4 tests (null, undefined, texte court, texte long)
- `buildArtworkMetadata` : 5 tests (titre, description, fallback sans description, og:images, og:images vide)

**`src/lib/gallery/metadata-utils.ts`** : Fonctions purement fonctionnelles extraites hors de la page :
- `truncateDescription(text)` : tronque à 160 chars, retourne undefined pour null/undefined
- `buildArtworkMetadata(artwork, imageUrl)` : construit l'objet `Metadata` Next.js avec og:title, og:description, og:images

### Tâche 2 — Composants et page détail

**`src/components/artwork/ArtworkNav.tsx`** :
- Navigation prev/next avec flèches Unicode `←` `→` (D-17)
- Space Mono 11px, `--color-ink-muted`, maxWidth 45% avec ellipsis
- Séparateur borderTop 1px solid rgba(90,82,68,0.3) au-dessus

**`src/components/artwork/ArtworkInfoPanel.tsx`** :
- Ordre vertical UI-SPEC section 9 : badge → titre → année → séparateur → méta-grille → séparateur → description → offres → nav
- Titre Oswald 32px weight 700 uppercase letterSpacing 0.05em
- Description Cormorant Garamond 17px italic lineHeight 1.6
- Méta-grille `<dl>` 2 colonnes : technique, médium, format, prix de base
- Bouton "Faire une offre" orange disabled (placeholder Phase 3)
- ArtworkNav branché en bas

**`src/app/artworks/[id]/page.tsx`** :
- `generateMetadata` : og:title, og:description, og:images (appel DB indépendant)
- Validation ID : `parseInt + isNaN → notFound()` (T-03-06)
- Filtre `pipelineState='published'` dans les 4 requêtes Drizzle (T-03-07)
- Grid `1fr 420px` desktop via `<style>` inline, `1fr` mobile (`@media max-width: 1023px`)
- `objectFit: 'contain'` sur l'image (D-15 — ne jamais recadrer une œuvre)
- Navigation prev/next via requêtes Drizzle `gt(publishedAt)` + `asc` / `lt(publishedAt)` + `desc`
- `loading="eager"` (page dédiée — priorité haute)
- srcset 640w/1024w/1440w déclarés (même URL en Phase 3)

---

## Critères de succès vérifiés

- [x] `tests/gallery/detail.test.ts` : 9/9 tests verts (`npx vitest run tests/gallery/detail.test.ts`)
- [x] `npx tsc --noEmit` : 0 erreur TypeScript
- [x] `parseInt(id, 10) + isNaN + notFound()` présents dans la page et generateMetadata
- [x] `eq(a.pipelineState, 'published')` dans les 4 requêtes publiques
- [x] Layout desktop `grid-template-columns: 1fr 420px`
- [x] `objectFit: 'contain'` (D-15)
- [x] Titre Oswald 32px dans ArtworkInfoPanel
- [x] Description Cormorant Garamond italic dans ArtworkInfoPanel
- [x] Flèches Unicode `← ` et ` →` dans ArtworkNav (D-17)
- [x] `generateMetadata` exporte les balises og:title et og:image

---

## TDD Gate Compliance

| Gate | Commit | Status |
|------|--------|--------|
| RED (`test(...)`) | 2961be1 | PASS — tests écrits avant l'implémentation, échoués correctement |
| GREEN (`feat(...)`) | 0ff2c96 | PASS — 9 tests verts après implémentation de metadata-utils.ts |

---

## Deviations from Plan

None - plan exécuté exactement comme écrit.

---

## Known Stubs

| Stub | Fichier | Raison |
|------|---------|--------|
| Bouton "Faire une offre" disabled | `src/components/artwork/ArtworkInfoPanel.tsx` | Intentionnel — Phase 4 câble les offres visiteurs. Le bouton est visible pour montrer la fonctionnalité à venir. |
| Texte offres "Soyez le premier à faire une offre." | `src/components/artwork/ArtworkInfoPanel.tsx` | Intentionnel — données réelles (nb offres, meilleure offre) en Phase 4. |
| srcset avec même URL x3 | `src/app/artworks/[id]/page.tsx` | Intentionnel — variantes de taille générées en Phase 6 (R2 + Sharp resize). |

Ces stubs n'empêchent pas l'objectif du Plan 03 : la page détail est navigable, le SEO fonctionne, la navigation prev/next est opérationnelle.

---

## Threat Flags

Aucune surface de sécurité non prévue dans le threat_model.

Mitigations appliquées :
- T-03-06 : `parseInt(id, 10)` + `isNaN` + `notFound()` dans page et generateMetadata
- T-03-07 : `eq(a.pipelineState, 'published')` dans les 4 requêtes Drizzle publiques

---

## Self-Check: PASSED

Fichiers vérifiés :
- `tests/gallery/detail.test.ts` : FOUND (76 lignes)
- `src/lib/gallery/metadata-utils.ts` : FOUND (79 lignes)
- `src/components/artwork/ArtworkNav.tsx` : FOUND
- `src/components/artwork/ArtworkInfoPanel.tsx` : FOUND
- `src/app/artworks/[id]/page.tsx` : FOUND

Commits vérifiés :
- 2961be1 : FOUND (test RED)
- 0ff2c96 : FOUND (feat GREEN metadata-utils)
- 7fa35de : FOUND (feat page + composants)
