# Phase 8: Responsive Mobile/Tablette — Context

**Gathered:** 2026-06-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Adapter l'ensemble du site — galerie publique, pages détail, formulaires d'offres et back-office admin — pour une consultation optimale sur mobile (≤768px) et tablette. Les fonctionnalités existantes ne changent pas ; seule leur présentation et leur ergonomie tactile sont améliorées.

</domain>

<decisions>
## Implementation Decisions

### Navigation mobile

- **D-01:** Sur mobile (≤768px), la SiteNav bascule en mode hamburger : logo à gauche, icône hamburger à droite (touch target 44×44px minimum). La nav horizontale actuelle ("Galerie / À propos / S'identifier") est masquée.
- **D-02:** Le menu hamburger ouvre un **panneau latéral glissant depuis la droite** (280px de large), fond `#ede0b8` (surface), overlay sombre semi-transparent derrière. Fermeture : tap sur l'overlay ou sur une croix dans le panneau. Les liens dans le panneau reprennent la typographie Space Mono uppercase mais en taille lisible (≥14px, touch targets 48px de hauteur).
- **D-03:** Sur desktop (≥769px), la SiteNav horizontale actuelle reste inchangée — aucune modification côté large écran.

### Claude's Discretion

- **Admin back-office :** La question de l'admin mobile n'a pas été discutée. Recommandation : optimiser l'admin pour les tablettes (≥768px) avec des ajustements mineurs (drawer qui prend 100% de la largeur sur tablette étroite) mais ne pas prioriser le support téléphone pour l'admin. L'artiste gère sa galerie depuis un desktop ou une tablette.
- **Hover → tactile galerie (D-11) :** Sur les appareils tactiles, l'overlay "Voir l'œuvre" au survol n'est pas pertinent. Le tap sur une carte navigue directement vers la page détail sans overlay intermédiaire.
- **Touch targets généraux :** Appliquer un minimum de 44×44px sur tous les éléments interactifs : badges de statut cliquables, liens nav, boutons de filtres, bouton "Faire une offre".
- **Filtres galerie sur mobile :** Barre de filtres scrollable horizontalement (overflow-x: auto, pill-shaped sans border-radius conformément à D-03) — pas de tiroir séparé. Le planner décide du rendu exact.
- **Formulaire d'offre :** Quand le clavier virtuel apparaît, le formulaire doit rester visible. Utiliser `scroll-padding-bottom` ou `padding-bottom` dynamique — au planner de choisir l'approche.
- **Images page détail :** Le pinch-to-zoom natif du navigateur reste disponible (D-15 = pas de zoom JS). Pas de traitement supplémentaire.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Projet
- `.planning/PROJECT.md` — Vision et contraintes globales
- `.planning/ROADMAP.md` — Phase 8 goal et critères de succès
- `CLAUDE.md` — Commenter le code en français, D-03 zéro coins arrondis

### Design system hérité (Phase 3 — CRITIQUE)
- `.planning/phases/03-public-gallery/03-CONTEXT.md` — D-01 à D-17 : palette, typographie, masonry, layout détail
  - D-03 : **zéro coins arrondis** — s'applique aussi au panneau hamburger et à l'overlay
  - D-06 : masonry CSS columns déjà responsive (3/2/1 col) — ne pas toucher
  - D-11 : hover overlay desktop uniquement — tactile = tap direct vers détail (D-02 Phase 8)

### Composants existants à modifier
- `src/components/layout/SiteNav.tsx` — Nav principale à étendre avec hamburger ≤768px
- `src/components/gallery/MasonryGrid.tsx` — CSS columns déjà responsive, vérifier column-gap mobile
- `src/app/artworks/[id]/page.tsx` — Layout 2 cols desktop / empilé mobile (concept présent, à vérifier)
- `src/app/admin/artworks/_components/ArtworksClient.tsx` — Drawer admin à adapter sur tablette
- `src/components/artwork/OfferForm.tsx` — Formulaire à tester avec clavier virtuel mobile

### Patterns établis
- `.planning/phases/05-admin-backoffice/05-CONTEXT.md` — D-15/D-16 : SiteNav async, carré initiale

</canonical_refs>

<code_context>
## Existing Code Insights

### Responsive déjà en place
- `MasonryGrid.tsx` : CSS `columns: 3` desktop / `columns: 2` ≤1023px / `columns: 1` ≤767px — **aucune modification requise**
- `artworks/[id]/page.tsx` : commentaire layout "Desktop (≥1024px) : grid 2 colonnes / Mobile (<1024px) : empilé" — vérifier si déjà implémenté ou seulement documenté

### Ce qui manque
- `SiteNav.tsx` : liens à 11px Space Mono sans breakpoint responsive — **touch targets insuffisants sur mobile**
- Aucun hamburger menu, aucun panneau drawer mobile dans le codebase
- Admin `ArtworksClient.tsx` : `DRAWER_MIN = 360`, `DRAWER_MAX = 720` — drawer latéral non adapté à un écran 375px

### Patterns inline styles
- Tous les composants utilisent des styles inline (pas de classes Tailwind pour les règles responsives)
- Le pattern existant pour les breakpoints : balise `<style>` inline avec `@media` (voir MasonryGrid)
- À suivre pour les nouveaux breakpoints responsives

### Integration points
- `SiteNav` est un async Server Component — le panneau hamburger (interactif) devra être un Client Component fils
- `VisitorProfileModal` est déjà un Client Component — peut s'ouvrir depuis le panneau hamburger

</code_context>

<specifics>
## Specific Ideas

- Le panneau hamburger reprend l'esthétique galerie : fond `#ede0b8`, liens en Space Mono uppercase, pas d'ombre (D-05 Phase 3). L'overlay derrière est `rgba(26,26,26,0.5)`.
- La SiteNav actuelle fait 56px de hauteur — conserver cette hauteur sur mobile (le hamburger remplace les liens mais la barre garde sa hauteur).
- Sur mobile, "S'identifier" doit aussi apparaître dans le panneau hamburger (avec la même logique conditionnelle que la nav desktop).
- Pour l'admin : le drawer existant (min 360px) peut être rendu plein-largeur sur les écrans < 768px plutôt que de le redessiner complètement.

</specifics>

<deferred>
## Deferred Ideas

- Bottom navigation bar (Instagram-style) — non retenue, hamburger préféré
- Admin sur téléphone — non prioritaire pour v1, l'artiste utilise desktop/tablette
- Gestes de swipe pour naviguer prev/next entre les œuvres — v2
- Pull-to-refresh sur la galerie — v2

</deferred>

---

*Phase: 08-responsive-mobile-tablette*
*Context gathered: 2026-06-07*
