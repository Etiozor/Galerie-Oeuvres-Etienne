# Phase 3: Public Gallery - Context

**Gathered:** 2026-04-29
**Status:** Ready for planning

<domain>
## Phase Boundary

N'importe quel visiteur — sans compte — peut parcourir toutes les œuvres publiées sur une page galerie responsive et ouvrir une page détail pour chaque œuvre. Aucun back-office dans cette phase. L'artiste n'intervient pas ici. Seules les œuvres avec `status = published` sont visibles.

</domain>

<decisions>
## Implementation Decisions

### Identité visuelle

- **D-01:** Fond off-white `#f2e8cf` pour tout le site public. Palette d'accent : `#8cb369` (vert), `#f4e285` (jaune), `#f4a259` (orange), `#5b8e7d` (teal), `#bc4b51` (rouge).
- **D-02:** Typographie en trois niveaux : **Oswald** (titres, headings, prix — condensé, fort), **Space Mono** (labels, méta, navigation — monospace, technique), **Cormorant Garamond** (descriptions en italique — serif élégant). Google Fonts.
- **D-03:** Zéro coins arrondis. Tous les éléments (cartes, badges, boutons, modales, inputs) ont des angles droits.
- **D-04:** Arrière-plan décoratif : formes SVG peintes (courbes, cercles, traits) avec `feTurbulence` pour simuler un rendu à la main. Couleurs de la palette à faible opacité (~0.15–0.22). Position fixe, `z-index: 0`, `pointer-events: none`.
- **D-05:** Ambiance épurée mais osée — contrastes francs, pas de douceur excessive. Le design doit trancher.

### Grille galerie

- **D-06:** Layout masonry CSS (`columns: 3` desktop, `columns: 2` mobile), `column-gap: 2px`, `break-inside: avoid`. Chaque carte a `margin-bottom: 2px`.
- **D-07:** L'aspect ratio de chaque vignette est **proportionnel aux dimensions réelles** de l'œuvre (champ `width_cm` × `height_cm` → `aspect-ratio: w/h`). Une petite œuvre prend moins de place qu'un grand tableau.
- **D-08:** Infinite scroll : 6 œuvres chargées au départ, 6 de plus à chaque fois qu'on approche du bas de page. Implémenté avec `IntersectionObserver` côté client.
- **D-09:** Info strip sous chaque image : **titre** (Oswald, moyen) + **badge statut** (voir D-10). Pas de prix dans la grille.
- **D-10:** Badge statut "funky" — pas un pill standard. Options selon statut : `disponible` → petit carré en teal avec texte monospace minuscule ; `vendue` → barre diagonale ou stamp rouge ; `donnée` → texte vert barré ou icône. Le planner décide du rendu exact mais l'intention est qu'il surprenne visuellement.
- **D-11:** Au survol (desktop) : overlay sombre semi-transparent sur l'image avec le texte `Voir l'œuvre` en Space Mono uppercase. Transition opacity 0.25s.

### Filtres

- **D-12:** Filtres par **type** (dessin / peinture) et par **médium** (crayon, encre, acrylique, huile, pastel, etc.) — conformément aux exigences GALLERY-02. Les filtres s'appliquent sans rechargement de page. Implémenté côté client (les œuvres sont chargées, on filtre le state).
- **D-13:** Les filtres actifs sont persistés dans l'URL (`?type=peinture&medium=acrylique`) pour pouvoir partager un lien filtré.

### Page détail

- **D-14:** Layout desktop 2 colonnes : image à gauche (fond `surface`, padding généreux, ombre portée), panel info à droite (scrollable si nécessaire). Sur mobile : image pleine largeur puis contenu en dessous.
- **D-15:** Pas de zoom sur l'image. L'image pleine largeur suffit.
- **D-16:** Panel info contient : badge statut, titre (Oswald grand), année, méta-grille (technique, format, prix de base, année), description en italique Cormorant, historique des offres (placeholder v1 : nombre + meilleure offre), bouton "Faire une offre" (orange, uniquement si `disponible`).
- **D-17:** Navigation précédent / suivant entre les œuvres (ordre chronologique inversé). Flèches discrètes.

### Page À propos

- **D-18:** Page `/about` créée mais avec contenu placeholder. L'artiste remplira le texte et la photo plus tard. Structure prévue : photo pleine hauteur à gauche, texte à droite (desktop) ; empilé sur mobile.

### Claude's Discretion

- Rendu exact du badge statut "funky" (stamp, diagonal, strikethrough, etc.) — au planner
- Nombre de colonnes masonry sur tablette intermédiaire
- Hauteur max des images dans la grille (éviter qu'une très haute œuvre écrase tout)
- Ordre par défaut des œuvres dans la galerie (date de publication ? date de création ?)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Projet
- `.planning/PROJECT.md` — Vision et contraintes globales
- `.planning/REQUIREMENTS.md` — GALLERY-01 à GALLERY-04, ART-01 à ART-05, ABOUT-01
- `.planning/ROADMAP.md` — Plans 03-01 à 03-04 avec critères de succès
- `CLAUDE.md` — Commenter le code en français, StorageProvider abstrait

### Fondations Phase 01 & 02 (à réutiliser)
- `src/lib/storage/index.ts` — Interface StorageProvider (`getUrl(key)` pour les images)
- `src/db/schema.ts` — Table `artworks` avec `status`, `pipeline_state`, dimensions, médium, type
- `src/lib/auth.ts` — Better Auth (les routes publiques n'ont pas besoin d'auth)

### Design reference
- `.planning/phases/03-public-gallery/design-mobile-dark.html` — Maquette mobile (typographie, palette, layout)
- `.planning/phases/03-public-gallery/design-desktop-light.html` — Maquette desktop (masonry, hover, détail, modal offre)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/storage/local.ts` — `getUrl(key)` retourne `/api/uploads/[key]` — utiliser pour les `<img src>` publics
- `src/db/schema.ts` — Colonnes disponibles : `processed_path`, `thumbnail_path`, `width_cm`, `height_cm`, `medium`, `type`, `status`, `title`, `created_at`, `published_at`
- Pattern Server Components établi : fetch direct Drizzle dans les composants async

### Patterns établis
- Server Components pour le rendu public (SEO natif Next.js)
- Server Actions pour les mutations — pas d'API REST
- Drizzle ORM avec `db` singleton depuis `src/db/index.ts`
- Tailwind CSS 4 (`@import "tailwindcss"` dans globals.css)
- shadcn/ui initialisé (Phase 2) — composants disponibles

### Points d'intégration Phase 2
- Seules les œuvres `status = 'published'` doivent apparaître dans la galerie publique
- Les URLs d'image se construisent via `storage.getUrl(artwork.processed_path)` (version traitée) et `storage.getUrl(artwork.thumbnail_path)` (miniature pour la grille)
- `width_cm` et `height_cm` sont les dimensions réelles — utiliser pour calculer l'aspect ratio des vignettes

</code_context>

<specifics>
## Specific Ideas

- Le visiteur typique arrive sur mobile (Instagram scroll). La grille 2 colonnes mobile doit respirer — gap 2px comme la maquette.
- Les formes SVG décoratives donnent le caractère "artistique" sans alourdir. Les garder légères (opacité basse, z-index 0).
- Le badge statut est le seul élément vraiment "funky" de la grille — c'est lui qui donne la personnalité. Le reste est épuré.
- Sur la page détail, le prix de base est visible mais n'est pas le point d'entrée — d'abord l'image et l'émotion, ensuite les infos pratiques.

</specifics>

<deferred>
## Deferred Ideas

- Zoom interactif (pinch/scroll) sur la page détail — v2
- Contenu réel de la page À propos (photo + bio) — l'artiste remplit après v1
- Navigation par catégorie dans l'URL (slug lisible type `/galerie/peinture`) — v2
- Mode sombre — non demandé, non planifié
- Likes (cœur) — fonctionnalité Phase 4 (nécessite comptes visiteurs)

</deferred>

---

*Phase: 03-public-gallery*
*Context gathered: 2026-04-29*
