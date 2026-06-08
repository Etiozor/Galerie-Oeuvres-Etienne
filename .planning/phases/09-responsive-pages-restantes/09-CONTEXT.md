# Phase 9: Responsive — Pages restantes — Context

**Gathered:** 2026-06-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Étendre le responsive à l'ensemble de l'application — toutes les pages publiques ET admin doivent être propres sur mobile (≤768px) et tablette. La priorité est les pages visiteurs (/about, /mon-profil), mais les pages admin sont incluses (tablette + mobile acceptable même si l'artiste utilise principalement son PC pour l'admin).

Changement majeur par rapport à Phase 8 : la FilterBar de la galerie d'accueil passe d'un scroll horizontal à un bouton compact + tiroir latéral sur mobile.

</domain>

<decisions>
## Implementation Decisions

### Périmètre

- **D-01:** Scope complet — toutes les pages doivent être responsives : `/about`, `/mon-profil`, `/admin/upload`, `/admin/artworks/[id]`. La priorité mobile est sur les pages publiques. Les pages admin sont optimisées pour tablette en premier lieu, mobile en second.
- **D-02:** `/admin/login` est exclu — formulaire simple centré qui devrait déjà être acceptable sur mobile.

### FilterBar — refonte mobile

- **D-03:** Sur mobile (≤768px), la FilterBar actuelle (chips scroll horizontal de Phase 8) est remplacée par un **bouton "Filtres ▾" compact** sur une seule ligne. Tap → panneau/tiroir latéral ou bottom sheet avec TOUS les filtres. Quand aucun filtre actif : bouton sobre. Quand filtre(s) actif(s) : badge de comptage visible sur le bouton (ex: "Filtres · 2").
- **D-04:** Ce redesign nécessite un Client Component (état ouvert/fermé du tiroir), sur le même pattern que HamburgerMenu. FilterBar reste Server-friendly sur desktop (≥769px — comportement Phase 8 inchangé).
- **D-05:** D-03 design system : zéro border-radius sur le tiroir et le bouton. Touch target bouton : 44px hauteur minimum.

### /about

- **D-06:** La page `/about` a déjà `@media (max-width: 1023px)` pour le grid 1-colonne. Claude ajuste librement les paddings mobiles (réduire de 40-48px → 24px sur mobile) et la taille du titre si nécessaire. Pas de décision utilisateur requise.

### /mon-profil

- **D-07:** La page `/mon-profil` est déjà en colonne unique (maxWidth 680px). Claude ajuste librement : padding top réduit sur mobile, liste offres (titre + montant en flex row — garder ou passer en 2 lignes selon ce qui est lisible). Grille "œuvres enregistrées" : 1 colonne sur très petit écran si 160px minimum pose problème.

### /admin/upload (DocumenterClient)

- **D-08:** Le layout split 2 colonnes (image gauche + formulaire droite) passe en **1 colonne sur tablette ≤1023px**. Sur mobile ≤767px : formulaire empilé sous la zone image. L'artiste uploade depuis PC, donc l'expérience mobile est un nice-to-have propre mais pas critique.
- **D-09:** L'ordre en 1 colonne : image/drop zone EN PREMIER, puis formulaire. L'artiste voit d'abord son image avant de remplir les métadonnées.

### /admin/artworks/[id]

- **D-10:** La page d'édition détail admin passe en 1 colonne sur tablette ≤1023px (hero split → empilé). Le formulaire 6 colonnes passe en 2 colonnes sur tablette, 1 colonne sur mobile. Les sections dépliables prix restent inchangées.
- **D-11:** L'artiste n'édite pas souvent depuis mobile — l'objectif est "pas cassé" sur téléphone, pas "optimisé".

### Contraintes portées depuis Phase 8

- **D-12:** D-03 design system : zéro border-radius sur TOUT nouvel élément.
- **D-13:** Touch targets : 44×44px minimum sur tous les éléments interactifs.
- **D-14:** Pattern CSS : `<style>` inline avec `@media` — cohérent avec MasonryGrid, SiteNav, FilterBar Phase 8.
- **D-15:** Commentaires : tout le code commenté en français (CLAUDE.md).

### Claude's Discretion

- Breakpoint exact du tiroir FilterBar (bottom sheet vs panneau latéral) : Claude choisit l'approche la plus simple à implémenter avec les patterns existants.
- Padding/spacing exact sur chaque page mobile — Claude aligne sur les valeurs utilisées dans Phase 8 (24px horizontal, 32px vertical).
- Animation du tiroir filtres : cohérente avec slideInFromRight de HamburgerMenu ou slideInFromBottom si bottom sheet.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design system Phase 8 (critique)
- `.planning/phases/08-responsive-mobile-tablette/08-CONTEXT.md` — D-01 à D-03 : navigation hamburger, panneau latéral, contraintes desktop inchangé
- `.planning/phases/08-responsive-mobile-tablette/08-UI-SPEC.md` — specs exactes touch targets, overlay, z-index, animations
- `src/components/layout/HamburgerMenu.tsx` — pattern Client Component fils de Server Component, useEffect overflow, animation slideInFromRight — À RÉUTILISER pour le tiroir FilterBar

### Design system Phase 3 (hérité)
- `.planning/phases/03-public-gallery/03-CONTEXT.md` — D-01 à D-17 : palette, typographie, masonry, D-03 zéro coins arrondis
- `src/components/gallery/FilterBar.tsx` — état actuel post-Phase 8 (scroll horizontal) — à refactorer pour le tiroir

### Pages à modifier
- `src/app/about/page.tsx` — déjà responsive grid, ajustements padding mobile
- `src/app/mon-profil/page.tsx` — colonne unique, ajustements mineurs mobile
- `src/app/admin/upload/_components/DocumenterClient.tsx` — layout split à adapter tablette
- `src/app/admin/artworks/[id]/page.tsx` — hero split + formulaire à adapter tablette
- `src/app/page.tsx` — page galerie principale, pour intégrer la nouvelle FilterBar mobile

### Projet
- `CLAUDE.md` — Commenter en français, D-03 zéro coins arrondis
- `.planning/PROJECT.md` — Vision et contraintes globales

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `HamburgerMenu.tsx` — Pattern exact pour le tiroir FilterBar : Client Component, useState, useEffect overflow + Escape, overlay, animation CSS
- `SiteNav.tsx` — Pattern `<style>` + `.sitenav-hamburger` / `.sitenav-desktop-links` @media : réutiliser pour FilterBar desktop/mobile toggle
- `FilterBar.tsx` — Chips existants + logique isActive/isEmpty/counts : conserver, juste déplacer dans le tiroir sur mobile

### Established Patterns
- `<style>` inline + `@media` : pattern universel dans ce projet (MasonryGrid, SiteNav, artworks/[id])
- Client Component fils de Server Component : pattern ModalTrigger, HamburgerMenu — appliqué au tiroir FilterBar
- `borderRadius: 0` explicite sur tout nouvel élément (D-03)
- `!important` justifié uniquement pour overrider des styles inline JS (ArtworksClient drawer Phase 8)

### Integration Points
- `src/app/page.tsx` — importe FilterBar, devra passer `searchParams` au nouveau composant FilterButton
- `src/components/gallery/FilterBar.tsx` — refactoré en deux parties : FilterButton (mobile, Client) + FilterChips (desktop, inchangé)
- `DocumenterClient.tsx` est un très grand Client Component (probablement 400+ lignes) — modifications CSS uniquement, pas de logique

</code_context>

<specifics>
## Specific Ideas

- Le bouton FilterBar mobile doit afficher un badge de comptage quand des filtres sont actifs ("Filtres · 2") — même pattern que les apps galerie modernes.
- Le tiroir FilterBar peut être un bottom sheet (glisse depuis le bas) sur mobile — plus naturel sur téléphone que un panneau latéral. Claude choisit.
- Sur `/admin/upload`, la drop zone image reste large (pleine largeur en 1 colonne) — l'artiste photograph ses œuvres avec un format portrait, donc pleine largeur mobile est idéal.

</specifics>

<deferred>
## Deferred Ideas

- Gestes swipe pour naviguer prev/next entre les œuvres — v2 (déjà différé Phase 8)
- Pull-to-refresh sur la galerie — v2
- FilterBar avec recherche textuelle — nouvelle fonctionnalité, hors scope
- Animation de transition entre filtres (fade des cartes) — v2
- `/admin/login` responsive — exclu de cette phase (formulaire simple déjà acceptable)

</deferred>

---

*Phase: 09-responsive-pages-restantes*
*Context gathered: 2026-06-08*
