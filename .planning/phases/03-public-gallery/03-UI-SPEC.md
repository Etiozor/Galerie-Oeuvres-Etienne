---
phase: 3
slug: public-gallery
status: draft
shadcn_initialized: true
preset: base-nova
created: 2026-04-29
---

# Phase 3 — UI Design Contract : Galerie Publique

> Contrat visuel et d'interaction pour la Phase 3. Généré par gsd-ui-researcher.
> Toutes les décisions de D-01 à D-18 sont VERROUILLÉES depuis 03-CONTEXT.md.
> Ne pas les remettre en question lors du planning ou de l'exécution.

---

## Design System

| Propriété | Valeur |
|-----------|--------|
| Tool | shadcn/ui |
| Preset | base-nova (style installé en Phase 2) |
| Component library | Radix UI (via shadcn base-nova) |
| Icon library | lucide-react |
| Police principale | Oswald (titres) + Space Mono (labels/meta) + Cormorant Garamond (descriptions italiques) — Google Fonts |

**Note d'intégration fonts :** Charger les trois polices via `next/font/google` dans `src/app/layout.tsx`. Variables CSS : `--font-oswald`, `--font-space-mono`, `--font-cormorant`. Appliquer `font-sans` → Oswald sur les headings, Space Mono sur les labels via classes utilitaires Tailwind personnalisées.

---

## Tokens de couleur

> Source : D-01 (CONTEXT.md verrouillé). À déclarer dans `src/app/globals.css` via `@theme inline`.

| Token CSS | Valeur hex | Rôle |
|-----------|-----------|------|
| `--color-bg` | `#f2e8cf` | Fond principal (60% de la surface) |
| `--color-surface` | `#ede0b8` | Cartes, info panel, nav (30%) — légèrement plus soutenu que le fond |
| `--color-teal` | `#5b8e7d` | Accent primaire : badge "disponible", CTA principal (10%) |
| `--color-orange` | `#f4a259` | Accent secondaire : bouton "Faire une offre", hover states actifs |
| `--color-green` | `#8cb369` | Accent tertiaire : badge "donné", éléments positifs |
| `--color-yellow` | `#f4e285` | Accent quaternaire : highlights, sélections de filtre actif |
| `--color-red` | `#bc4b51` | Destructif + badge "vendu" — stamp diagonal |
| `--color-ink` | `#1a1a1a` | Texte principal (quasi-noir sur fond off-white) |
| `--color-ink-muted` | `#5a5244` | Texte secondaire (méta, labels discrets) |

**Répartition 60/30/10 :**
- 60% : `#f2e8cf` — fond de page, arrière-plan masonry
- 30% : `#ede0b8` — info panel page détail, barre de navigation, overlay filtre
- 10% : accent selon contexte (voir tableau ci-dessus)

**Accent réservé exclusivement à :**
1. Badge statut "disponible" → teal `#5b8e7d`
2. Badge statut "vendu" → rouge `#bc4b51` (stamp diagonal)
3. Badge statut "réservé" → orange `#f4a259`
4. Badge statut "donné" → vert `#8cb369`
5. Bouton "Faire une offre" → orange `#f4a259`
6. Filtre actif sélectionné → fond jaune `#f4e285`
7. Hover overlay sur vignette → `rgba(42, 42, 42, 0.55)`

---

## Règle fondamentale : Zéro coins arrondis

> Source : D-03 (CONTEXT.md verrouillé).

**Aucun** `rounded-*` nulle part. Ni cartes, ni badges, ni boutons, ni modales, ni inputs, ni overlays. Angles droits partout sans exception. Dans les composants shadcn réutilisés, surcharger ou retirer toute classe `rounded-*`.

---

## Espacement

Échelle 8-point (multiples de 4px) :

| Token | Valeur | Usage |
|-------|--------|-------|
| xs | 4px | Gaps inline badge/icône, padding interne badge |
| sm | 8px | Espacement compact entre éléments de liste |
| md | 16px | Padding interne info strip, padding bouton |
| lg | 24px | Padding info panel page détail |
| xl | 32px | Espacement sections page détail |
| 2xl | 48px | Marges verticales grandes sections |
| 3xl | 64px | Espacement page-level (header → grille) |

**Exceptions :**
- `column-gap` masonry : **2px** (D-06 — not 8pt aligned, by design)
- `margin-bottom` de chaque carte masonry : **2px** (D-06)
- Touch target minimum (filtres, nav) : **44px** de hauteur

---

## Typographie

> Sources : D-02, D-09, D-10, D-14, D-16 (CONTEXT.md verrouillés).

| Rôle | Police | Taille | Poids | Line Height | Usage |
|------|--------|--------|-------|-------------|-------|
| Display | Oswald | 32px | 700 | 1.1 | Titre de l'œuvre sur page détail |
| Heading | Oswald | 20px | 600 | 1.2 | Titre dans l'info strip de la grille |
| Label | Space Mono | 11px | 400 | 1.4 | Badge statut, méta (format, médium, année), navigation, filtres |
| Body | Cormorant Garamond | 17px italic | 400 | 1.6 | Description de l'œuvre (page détail) |
| Meta small | Space Mono | 10px | 400 | 1.3 | Dimensions, date dans la méta-grille |

**Règles d'application :**
- Oswald : UPPERCASE imposé pour les titres de section et navigation (letter-spacing: 0.05em)
- Space Mono : UPPERCASE imposé pour les badges et labels de filtre (letter-spacing: 0.08em)
- Cormorant Garamond : toujours en italique pour les descriptions
- Pas de mixing de polices au sein d'un même composant atomic

---

## Composants d'interface — Inventaire Phase 3

### 1. Fond décoratif SVG (BackgroundDecor)

> Source : D-04 (verrouillé)

- SVG avec `feTurbulence` + `feDisplacementMap` simulant des traits peints à la main
- Formes : courbes de Bézier, ellipses, traits épais irréguliers
- Couleurs : `#8cb369`, `#f4a259`, `#5b8e7d`, `#f4e285`, `#bc4b51` à opacité 0.15–0.22
- Position : `fixed`, couvre `100vw × 100vh`, `z-index: 0`, `pointer-events: none`
- Rendu non-interactif, purement décoratif

### 2. Navigation globale (SiteNav)

- Hauteur : 56px (multiple de 8 le plus proche de 44px touch target)
- Fond : `#ede0b8` (surface)
- Logo / nom du site : Oswald 18px, uppercase, `#1a1a1a`
- Liens : Space Mono 11px, uppercase, `#5a5244`
- Lien actif : `#1a1a1a` avec soulignement plein `2px solid #1a1a1a`
- Aucun coin arrondi, aucune ombre
- Mobile : navigation compactée (hamburger non requis en Phase 3 — 2 liens max : Galerie + À propos)

### 3. Barre de filtres (FilterBar)

> Source : D-12, D-13

- Position : sous la navigation, `sticky top-56px`, fond `#ede0b8`
- Hauteur : 44px (touch target)
- Filtres type : boutons toggle (Dessin / Peinture) — Space Mono 11px uppercase
- Filtres médium : boutons toggle (Crayon / Encre / Acrylique / Huile / Pastel / ...)
- État inactif : fond transparent, bordure `1px solid #5a5244`, texte `#5a5244`
- État actif : fond `#f4e285`, bordure `1px solid #1a1a1a`, texte `#1a1a1a`
- Transition actif/inactif : 0.15s
- Aucun coin arrondi
- URL params : `?type=peinture&medium=acrylique` (D-13)

### 4. Grille masonry (MasonryGrid)

> Sources : D-06, D-07, D-08

- CSS `columns: 3` desktop (≥1024px), `columns: 2` tablette (768–1023px), `columns: 1` mobile (<768px)
- `column-gap: 2px`, `break-inside: avoid`
- Fond de page : `#f2e8cf`
- Chaque carte : `margin-bottom: 2px`, `width: 100%`, `position: relative`
- `z-index: 1` pour les cartes (au-dessus du fond décoratif)

### 5. Carte masonry (ArtworkCard)

> Sources : D-07, D-09, D-10, D-11

**Image :**
- `aspect-ratio: {widthCm} / {heightCm}` calculé depuis la DB
- `object-fit: cover`, `width: 100%`
- Hauteur max par carte : `max-height: 640px` (évite les œuvres très hautes d'écraser la grille — choix par défaut, à affiner en Phase 3)
- `loading="lazy"`, `srcset` avec `thumbnail_path` pour la grille (400px)

**Hover overlay (desktop uniquement) :**
- `position: absolute`, `inset: 0`
- Fond : `rgba(42, 42, 42, 0.55)`
- Texte : "Voir l'œuvre" — Space Mono 11px, uppercase, `#f2e8cf`, centré verticalement et horizontalement
- `transition: opacity 0.25s ease` (D-11)
- `opacity: 0` → `opacity: 1` au survol

**Info strip :**
- Fond : `#f2e8cf` (même que le fond de page, pas de séparation visuellement marquée)
- Padding : 8px 8px 4px 8px
- Titre : Oswald 16px, weight 600, `#1a1a1a`, tronqué à 1 ligne (`text-overflow: ellipsis`)
- Badge statut à droite du titre (voir section Badges)

### 6. Badges statut "funky" (ArtworkStatusBadge)

> Source : D-10 (verrouillé — intention "funky, pas un pill standard")

Les badges utilisent des **styles inline** (pas de classes Tailwind) pour garantir l'exactitude des couleurs — même décision que `PipelineBadge` en Phase 2 (02-03).

**`available` (disponible) :**
- Carré teal `#5b8e7d`, 6×6px collé en haut à gauche de la zone badge
- Texte : "DISPO" — Space Mono 9px, uppercase, `#5b8e7d`, margin-left 10px

**`sold` (vendue) :**
- Fond `#bc4b51`, texte "VENDU" — Space Mono 9px, uppercase, `#f2e8cf`
- Rotation `-4deg` (stamp diagonal) sur le conteneur badge
- Padding 2px 6px

**`reserved` (réservée) :**
- Fond transparent, bordure `2px solid #f4a259`
- Texte "RÉSERVÉ" — Space Mono 9px, uppercase, `#f4a259`
- Padding 2px 6px

**`given` (donnée) :**
- Texte "DONNÉ" — Space Mono 9px, uppercase, `#8cb369`
- Avec ligne de décoration : pseudo-element `::after` barre diagonale fine `#8cb369`

### 7. Sentinel infinite scroll (ScrollSentinel)

> Source : D-08

- `<div>` invisible, `height: 1px`, placé après le dernier lot de 6 cartes
- Observé par `IntersectionObserver` côté client
- Déclenchement quand le sentinel entre dans le viewport (threshold 0.1)
- Charge les 6 suivantes via Server Action ou fetch vers un endpoint dédié
- Indicateur de chargement : 3 carrés animés (pulse) en teal `#5b8e7d`, taille 8px, alignés horizontalement, espacés de 4px

### 8. Page détail — Layout (ArtworkDetailPage)

> Sources : D-14, D-15, D-16, D-17

**Desktop (≥1024px) :**
- Grid 2 colonnes : `grid-template-columns: 1fr 420px`
- Colonne image : fond `#f2e8cf`, padding 32px, image centrée, ombre portée `0 2px 16px rgba(26,26,26,0.12)`
- Colonne info : fond `#ede0b8`, padding 24px, `overflow-y: auto`, `max-height: 100vh`, `position: sticky top: 0`

**Mobile (<1024px) :**
- Image pleine largeur, puis contenu info empilé en dessous
- Padding info : 16px

**Image :**
- `src` = `processed_path` (pleine résolution), pas de zoom (D-15)
- `srcset` avec 3 tailles : 640w, 1024w, 1440w
- `object-fit: contain` (pas cover — ne jamais recadrer une œuvre d'art)
- `loading="eager"` (page dédiée — priorité haute)

### 9. Panel info page détail

> Source : D-16

Ordre de lecture vertical (du haut vers le bas) :

1. Badge statut (ArtworkStatusBadge — même composant que la grille)
2. Titre — Oswald 32px, weight 700, uppercase, `#1a1a1a`
3. Année — Space Mono 12px, `#5a5244`
4. Séparateur horizontal : `1px solid #5a5244`, opacity 0.3, margin 16px 0
5. Méta-grille (2 colonnes) :
   - Label : Space Mono 10px, uppercase, `#5a5244`
   - Valeur : Space Mono 12px, `#1a1a1a`
   - Lignes : Technique, Format (WxH cm), Prix de base, Médium
6. Séparateur
7. Description — Cormorant Garamond 17px italic, `#1a1a1a`, line-height 1.6
8. Section offres (placeholder Phase 3) :
   - Si `available` : bloc teal `#5b8e7d` `1px solid`, padding 12px, "X offres · Meilleure : Y €" — Space Mono 12px
   - Bouton "Faire une offre" — orange `#f4a259`, fond plein, texte `#1a1a1a`, Oswald 14px uppercase, hauteur 44px, largeur 100% (affiché mais non fonctionnel en Phase 3 — sera câblé en Phase 4)
9. Navigation précédent/suivant (ArtworkNav)

### 10. Navigation précédent/suivant (ArtworkNav)

> Source : D-17

- Position : bas du panel info (desktop) / bas de page (mobile)
- Deux éléments : `← Précédente` + `Suivante →`
- Police : Space Mono 11px, `#5a5244`
- Hover : `#1a1a1a`
- Flèches : caractères Unicode `←` `→` (pas d'icône Lucide — trop rond)
- Séparés par un `/` ou un espaceur flexible
- Ordre : chronologique inversé par `published_at`

### 11. Page À propos (AboutPage)

> Source : D-18

**Desktop :**
- Grid 2 colonnes : `grid-template-columns: 1fr 1fr`
- Gauche : photo placeholder — fond `#ede0b8`, texte centré "Photo à venir" — Space Mono 11px `#5a5244`
- Droite : texte placeholder — Cormorant Garamond 17px italic, Oswald pour les titres de section

**Mobile :**
- Empilé : photo pleine largeur, puis texte

**Contenu placeholder (à remplacer par l'artiste) :**
- Titre : Oswald 28px, "À propos de l'artiste"
- Texte : "Bio et démarche artistique à venir."
- Note : ne pas mettre de Lorem ipsum — texte intentionnel en français

### 12. État vide de la galerie (EmptyGalleryState)

- Centré dans la grille
- Icône : aucune (style minimaliste)
- Titre : Oswald 20px, "Aucune œuvre publiée pour l'instant."
- Sous-titre : Space Mono 12px, `#5a5244`, "Revenez bientôt."
- Si filtres actifs : "Aucun résultat pour ces filtres. Essayez une autre combinaison."

### 13. Page 404 (NotFoundPage)

- Titre : Oswald 48px, "404"
- Sous-titre : Space Mono 14px, "Cette page n'existe pas."
- Lien retour : "← Retour à la galerie" — Space Mono 12px, `#5b8e7d`

---

## Copywriting Contract

| Élément | Texte |
|---------|-------|
| CTA principal galerie | "Voir l'œuvre" (hover overlay) |
| CTA page détail | "Faire une offre" (Phase 3 : affiché, non fonctionnel) |
| État vide — pas d'œuvres | "Aucune œuvre publiée pour l'instant. Revenez bientôt." |
| État vide — filtres sans résultat | "Aucun résultat pour ces filtres. Essayez une autre combinaison." |
| Chargement infinite scroll | (visuel uniquement — 3 carrés pulse, pas de texte) |
| Page À propos placeholder titre | "À propos de l'artiste" |
| Page À propos placeholder corps | "Bio et démarche artistique à venir." |
| 404 titre | "404" |
| 404 sous-titre | "Cette page n'existe pas." |
| 404 lien retour | "← Retour à la galerie" |
| Nav lien galerie | "GALERIE" |
| Nav lien à propos | "À PROPOS" |
| Section offres (placeholder) | "{N} offre(s) · Meilleure : {montant} €" |
| Aucune offre encore | "Soyez le premier à faire une offre." |
| Actions destructives | Aucune en Phase 3 (galerie publique lecture seule) |

---

## Interactions et états

| Interaction | Déclencheur | Comportement |
|-------------|-------------|--------------|
| Hover carte galerie | `mouseenter` sur desktop | Overlay `rgba(42,42,42,0.55)` fade-in 0.25s, texte "Voir l'œuvre" |
| Click carte galerie | `click` | Navigation vers `/artworks/[id]` |
| Infinite scroll | IntersectionObserver threshold 0.1 | Chargement des 6 suivantes, append sans scroll jump |
| Filtre toggle | `click` sur bouton filtre | Mise à jour state React + URL param, re-filtrage côté client |
| Filtre reset | Tous les filtres actifs désactivés | Retour à l'affichage complet |
| Nav précédente/suivante | `click` | Navigation Next.js (`router.push`) |
| Redimensionnement | `resize` | CSS columns s'adapte nativement — aucun JS requis |

---

## Ordres par défaut

> Source : Claude's Discretion (non spécifié dans CONTEXT.md)

- Ordre galerie par défaut : `published_at DESC` (la plus récente publiée en premier)
- Nombre de colonnes tablette (768–1023px) : **2 colonnes** (idem mobile large)
- Hauteur max image dans la grille : `max-height: 640px` sur la carte (l'image conserve son ratio mais ne dépasse pas cette hauteur)

---

## Open Graph / SEO

> Source : critère de succès Phase 3 #5

Chaque page détail (`/artworks/[id]`) expose :
- `<title>` : "{titre de l'œuvre} — Galerie POF"
- `og:title` : "{titre de l'œuvre}"
- `og:image` : URL publique du `processed_path` (via `storage.getUrl()`)
- `og:description` : description tronquée à 160 caractères, ou "{type} · {médium} · {dimensions}" si pas de description
- `og:type` : "website"
- Composant Next.js `generateMetadata()` dans `src/app/artworks/[id]/page.tsx`

---

## Registry Safety

| Registry | Composants utilisés | Safety Gate |
|----------|---------------------|-------------|
| shadcn officiel | Button, Badge, Card (existants Phase 2) | non requis |
| shadcn officiel | AlertDialog (existant Phase 2) | non requis |
| Tier-party | aucun | non applicable |

**Note :** Tous les composants Phase 3 sont soit natifs HTML/CSS/SVG, soit des composants shadcn déjà installés en Phase 2. Aucun nouveau registre tiers.

---

## Intégration avec le code existant

| Point d'intégration | Décision |
|---------------------|----------|
| URLs d'images | `storage.getUrl(artwork.thumbnail_path)` pour la grille, `storage.getUrl(artwork.processed_path)` pour le détail |
| Filtrage galerie | `pipeline_state = 'published'` ET `status IN ('available','sold','given','reserved')` |
| Aspect ratio des vignettes | `aspect-ratio: ${artwork.widthCm} / ${artwork.heightCm}` (valeurs numériques de la DB) |
| Ordre navigation détail | `ORDER BY published_at DESC` — même ordre que la galerie |
| Styles shadcn existants | Surcharger `rounded-*` → `rounded-none` sur tous les composants réutilisés |
| Badge pipeline existant | `PipelineBadge.tsx` (Phase 2) — réutilisable dans l'admin, pas dans la galerie publique |

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting : PASS
- [ ] Dimension 2 Visuals : PASS
- [ ] Dimension 3 Color : PASS
- [ ] Dimension 4 Typography : PASS
- [ ] Dimension 5 Spacing : PASS
- [ ] Dimension 6 Registry Safety : PASS

**Approval :** pending
