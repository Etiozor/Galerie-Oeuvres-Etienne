# Phase 3 : Galerie Publique — Recherche

**Recherche effectuée :** 2026-04-29
**Domaine :** Next.js 15 App Router · CSS multi-colonnes · IntersectionObserver · next/font/google · Drizzle ORM · Open Graph
**Confiance globale :** HIGH

---

<user_constraints>
## Contraintes utilisateur (depuis CONTEXT.md)

### Décisions verrouillées

- **D-01** Fond `#f2e8cf` pour tout le site public. Palette accent : `#8cb369`, `#f4e285`, `#f4a259`, `#5b8e7d`, `#bc4b51`.
- **D-02** Typographie trois niveaux : Oswald (titres) + Space Mono (labels/méta) + Cormorant Garamond (descriptions italiques). Google Fonts.
- **D-03** Zéro coins arrondis sur tous les éléments.
- **D-04** Arrière-plan SVG décoratif `feTurbulence`, couleurs palette à opacité 0.15–0.22, `position: fixed`, `z-index: 0`, `pointer-events: none`.
- **D-05** Ambiance épurée mais osée — contrastes francs.
- **D-06** Layout masonry CSS `columns: 3` desktop / `columns: 2` mobile, `column-gap: 2px`, `break-inside: avoid`, `margin-bottom: 2px`.
- **D-07** Aspect ratio de chaque vignette proportionnel aux dimensions réelles (`width_cm / height_cm`).
- **D-08** Infinite scroll : 6 œuvres au départ, 6 de plus à chaque déclenchement. `IntersectionObserver` côté client.
- **D-09** Info strip sous chaque image : titre (Oswald) + badge statut. Pas de prix dans la grille.
- **D-10** Badge statut "funky" — pas un pill standard.
- **D-11** Hover overlay desktop : fond `rgba(42,42,42,0.55)`, texte "Voir l'œuvre" Space Mono, `transition opacity 0.25s`.
- **D-12** Filtres par type (dessin/peinture) et médium. Mis à jour sans rechargement.
- **D-13** Filtres persistés dans l'URL (`?type=peinture&medium=acrylique`).
- **D-14** Page détail desktop 2 colonnes : `1fr 420px`. Mobile : image puis contenu empilé.
- **D-15** Pas de zoom sur l'image.
- **D-16** Panel info : badge statut, titre, année, méta-grille, description, section offres placeholder, bouton "Faire une offre" (non fonctionnel en Phase 3).
- **D-17** Navigation précédent/suivant entre œuvres (ordre chronologique inversé `published_at DESC`).
- **D-18** Page `/about` avec contenu placeholder. Structure : photo pleine hauteur gauche + texte droite (desktop), empilé mobile.

### Discrétion de Claude

- Rendu exact du badge statut "funky" (stamp, diagonal, strikethrough) — spécifié en 03-UI-SPEC.md
- Nombre de colonnes masonry sur tablette intermédiaire — décidé : 2 colonnes (768–1023px)
- Hauteur max des images dans la grille — décidé : `max-height: 640px`
- Ordre par défaut des œuvres — décidé : `published_at DESC`

### Idées différées (HORS SCOPE)

- Zoom interactif (pinch/scroll) sur la page détail — v2
- Contenu réel de la page À propos — l'artiste remplit après v1
- Navigation par catégorie dans l'URL (slug lisible `/galerie/peinture`) — v2
- Mode sombre — non planifié
- Likes (cœur) — Phase 4

</user_constraints>

---

<phase_requirements>
## Exigences de phase

| ID | Description | Support de recherche |
|----|-------------|----------------------|
| GALLERY-01 | L'utilisateur voit les œuvres en scroll vertical 1 colonne sur mobile | CSS `columns: 1` sur `<768px`, `break-inside: avoid` |
| GALLERY-02 | L'utilisateur voit les œuvres en grille masonry 2–3 colonnes sur desktop | CSS `columns: 2/3`, `column-gap: 2px` — support "Baseline Widely Available" depuis 2017 |
| GALLERY-03 | Filtre par type et médium sans rechargement de page | State React côté client + URL params `useSearchParams` + `useRouter` |
| GALLERY-04 | Page détail avec URL propre, métadonnées, navigation précédent/suivant | Route dynamique `/artworks/[id]`, `generateMetadata()`, requête Drizzle prev/next |
| ART-01 | Titre et date de création affichés | `artworks.title` + `artworks.createdDate` depuis DB |
| ART-02 | Description / commentaire libre affiché | `artworks.description` — Cormorant Garamond italique |
| ART-03 | Classification type + médium affichée | `with: { type: true, medium: true }` Drizzle relational query |
| ART-04 | Dimensions en cm affichées | `artworks.widthCm` + `artworks.heightCm` |
| ART-05 | Statut disponible/vendue/donnée/réservée affiché | `artworks.status` enum PostgreSQL |
| ABOUT-01 | Page `/about` présente l'artiste | Route `src/app/about/page.tsx` avec contenu placeholder |

</phase_requirements>

---

## Résumé

La Phase 3 est une phase **entièrement front-end publique** : aucune mutation de données, pas d'authentification requise pour les visiteurs. Le travail se concentre sur (1) la mise en page galerie CSS multi-colonnes avec infinite scroll, (2) le filtrage côté client avec persistance URL, (3) les pages détail avec métadonnées Open Graph, et (4) l'intégration des polices Google.

Tous les patterns techniques requis sont matures et bien supportés : `columns` CSS est "Baseline Widely Available" depuis 2017, `IntersectionObserver` est disponible dans tous les navigateurs modernes, `generateMetadata()` est la méthode officielle Next.js 15 pour l'Open Graph, et `next/font/google` gère les trois polices (Oswald, Space Mono, Cormorant Garamond) nativement avec variables CSS.

Le principal risque de complexité est l'infinite scroll avec filtres actifs : il faut charger uniquement les œuvres correspondant aux filtres et réinitialiser l'offset à chaque changement de filtre. La stratégie : charger toutes les œuvres publiées en Server Component, passer au Client Component `GalleryClient` qui gère le filtrage et l'affichage par lots.

**Recommandation principale :** Charger toutes les œuvres publiées une seule fois côté serveur (elles sont peu nombreuses — une collection personnelle), puis filtrer et paginer côté client. Pas besoin de Server Action pour le chargement paginé.

---

## Carte de responsabilité architecturale

| Capacité | Tier principal | Tier secondaire | Raisonnement |
|----------|---------------|-----------------|--------------|
| Rendu initial galerie + SEO | Frontend Server (SSR) | — | Server Component : fetch Drizzle direct, HTML complet pour les crawlers |
| Filtrage par type/médium | Browser / Client | — | State React côté client — pas de round-trip réseau |
| Infinite scroll (affichage par lots) | Browser / Client | — | IntersectionObserver, slice du state client |
| Page détail + Open Graph | Frontend Server (SSR) | — | `generateMetadata()` uniquement en Server Component |
| URLs images | API / Backend | CDN/Static | `getStorage().getUrl(key)` résolu côté serveur |
| Navigation prev/next | Frontend Server (SSR) | Browser | Requête Drizzle côté serveur, `<Link>` côté client |
| Polices Google | CDN / Static | — | `next/font/google` auto-host au build |
| Page À propos | Frontend Server (SSR) | — | Contenu statique, Server Component |

---

## Stack standard

### Core (déjà installé)

| Librairie | Version installée | Version npm actuelle | Rôle | Pourquoi c'est le standard |
|-----------|-------------------|--------------------|------|---------------------------|
| next | 15.5.15 | 16.2.4 | Framework App Router | Installé, stable en prod |
| react | 19.1.0 | 19.1.0 | UI | Installé |
| tailwindcss | ^4 | 4.2.4 | Styles utilitaires | Installé avec `@import "tailwindcss"` |
| drizzle-orm | 0.45.2 | 0.45.2 | Requêtes DB typées | Installé, relations définies |
| lucide-react | non installé | 1.14.0 | Icônes — flèches nav | Leger, cohérent shadcn |

[VERIFIED: npm registry 2026-04-29]

> **Note :** `lucide-react` n'est pas encore dans `package.json`. Il est référencé dans `03-UI-SPEC.md` comme bibliothèque d'icônes du design system. À installer en Wave 0.
> Exception décision D-17 : les flèches prev/next utilisent `←` `→` Unicode, pas lucide. Lucide n'est donc pas requis en Phase 3.

### Polices Google (via next/font/google)

| Police | Import next/font | Poids requis | Style | Rôle |
|--------|-----------------|--------------|-------|------|
| Oswald | `Oswald` | `['400', '700']` | normal | Titres, uppercase |
| Space_Mono | `Space_Mono` | `['400', '700']` | normal | Labels, badges, méta |
| Cormorant_Garamond | `Cormorant_Garamond` | `['400']` | italic | Descriptions œuvres |

[VERIFIED: nextjs.org/docs/app/api-reference/components/font — 2026-04-10]
[VERIFIED: fonts.google.com — noms underscore confirmés]

**Aucune installation requise** — `next/font/google` est inclus dans Next.js.

### Pas d'installation supplémentaire requise

Tous les composants Phase 3 sont des composants HTML/CSS/SVG natifs ou des composants shadcn déjà installés en Phase 2. Aucun nouveau registre tiers.

---

## Patterns d'architecture

### Diagramme de flux de données

```
Visiteur (navigateur)
       │
       ▼
┌─────────────────────────────────────────┐
│  GET /  (Server Component)              │
│  GalleryPage                            │
│  └─ db.query.artworks.findMany()        │
│     WHERE pipeline_state='published'    │
│     WITH type, medium                   │
│     ORDER BY published_at DESC          │
│     → artworksData[]                    │
└────────────┬────────────────────────────┘
             │ props: artworksData[]
             ▼
┌─────────────────────────────────────────┐
│  GalleryClient (Client Component 'use client') │
│  state: filters {type, medium}          │
│  state: visibleCount (6, 12, 18...)     │
│  computed: filteredArtworks (slice)     │
│                                         │
│  FilterBar ──→ met à jour filters       │
│              ──→ sync URL params        │
│                                         │
│  MasonryGrid                            │
│  └─ ArtworkCard × visibleCount         │
│       └─ storage.getUrl(thumbnail_path) │
│       └─ aspect-ratio: w/h             │
│       └─ hover overlay (CSS :hover)     │
│       └─ ArtworkStatusBadge            │
│                                         │
│  ScrollSentinel (div 1px)               │
│  └─ IntersectionObserver               │
│     threshold: 0.1                      │
│     → setVisibleCount(n + 6)           │
└─────────────────────────────────────────┘

GET /artworks/[id] (Server Component)
       │
       ▼
┌─────────────────────────────────────────┐
│  ArtworkDetailPage                      │
│  db.query.artworks.findFirst({id})      │
│  WITH type, medium                      │
│  + requête prev/next (published_at)     │
│  generateMetadata() → og:image, title   │
│  └─ layout 2 colonnes CSS grid          │
│     gauche: <img processed_path>        │
│     droite: ArtworkInfoPanel            │
│       ArtworkStatusBadge               │
│       méta-grille                       │
│       description Cormorant             │
│       offres placeholder               │
│       ArtworkNav (← →)                 │
└─────────────────────────────────────────┘
```

### Structure de fichiers recommandée

```
src/app/
├── page.tsx                          # Galerie publique (Server Component)
├── about/
│   └── page.tsx                      # Page à propos (Server Component)
├── artworks/
│   └── [id]/
│       └── page.tsx                  # Détail œuvre (Server Component + generateMetadata)
├── not-found.tsx                     # Page 404 globale
└── layout.tsx                        # Root layout — fonts + tokens CSS

src/components/
├── gallery/
│   ├── GalleryClient.tsx             # 'use client' — filtres + infinite scroll
│   ├── MasonryGrid.tsx               # CSS columns wrapper
│   ├── ArtworkCard.tsx               # Carte vignette (image + info strip)
│   ├── FilterBar.tsx                 # Boutons toggle type/médium
│   └── ScrollSentinel.tsx            # IntersectionObserver trigger
├── artwork/
│   ├── ArtworkStatusBadge.tsx        # Badges funky (inline styles)
│   ├── ArtworkInfoPanel.tsx          # Panel info page détail
│   └── ArtworkNav.tsx                # Navigation ← →
└── layout/
    ├── SiteNav.tsx                   # Navigation globale
    └── BackgroundDecor.tsx           # SVG feTurbulence décoratif
```

### Pattern 1 : Chargement initial Server Component + Client pour le filtrage

**Quoi :** Les données sont chargées une seule fois côté serveur. Le Client Component prend les données complètes en props et gère l'affichage.
**Quand :** Collection de taille raisonnable (< 500 œuvres), filtrage instantané sans round-trip réseau.

```typescript
// Source : pattern établi Phase 2 + nextjs.org/docs App Router
// src/app/page.tsx — Server Component
import { db } from '@/db'
import { artworks, artworkTypes, mediums } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { GalleryClient } from '@/components/gallery/GalleryClient'

export default async function GalleryPage() {
  // Charger toutes les œuvres publiées avec leurs relations (type, médium)
  const publishedArtworks = await db.query.artworks.findMany({
    where: (artworks, { eq }) => eq(artworks.pipelineState, 'published'),
    with: {
      type: true,
      medium: true,
    },
    orderBy: (artworks, { desc }) => [desc(artworks.publishedAt)],
  })

  // Charger les filtres disponibles (types et médiums présents dans les œuvres publiées)
  const types = await db.select().from(artworkTypes).orderBy(artworkTypes.sortOrder)
  const allMediums = await db.select().from(mediums).orderBy(mediums.sortOrder)

  return (
    <GalleryClient
      artworks={publishedArtworks}
      types={types}
      mediums={allMediums}
    />
  )
}
```

[VERIFIED: pattern Drizzle RQB depuis orm.drizzle.team/docs/rqb]

### Pattern 2 : Filtrage côté client + URL params

**Quoi :** `useSearchParams` lit les params initiaux depuis l'URL. `useRouter` les met à jour sans rechargement.
**Quand :** Filtres à appliquer instantanément, état partageable via URL.

```typescript
// Source : nextjs.org/docs App Router — searchParams
'use client'
import { useRouter, useSearchParams } from 'next/navigation'

export function FilterBar({ types, mediums }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeType = searchParams.get('type') ?? ''
  const activeMedium = searchParams.get('medium') ?? ''

  function setFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    router.replace(`/?${params.toString()}`, { scroll: false })
  }
  // ...
}
```

> **Attention :** `useSearchParams` doit être enveloppé dans `<Suspense>` au niveau de l'arbre pour éviter l'erreur de build Next.js 15 `Missing Suspense boundary`. [VERIFIED: nextjs.org/docs — useSearchParams]

### Pattern 3 : Infinite scroll avec IntersectionObserver

**Quoi :** Un `<div>` sentinel de 1px en fin de liste déclenche le chargement de la tranche suivante.
**Quand :** Affichage paginé côté client sans naviguer vers une nouvelle page.

```typescript
// Source : pattern MDN IntersectionObserver [VERIFIED: MDN Web Docs]
'use client'
import { useEffect, useRef, useState } from 'react'

const BATCH_SIZE = 6

export function GalleryClient({ artworks }) {
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE)
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((n) => Math.min(n + BATCH_SIZE, artworks.length))
        }
      },
      { threshold: 0.1 }
    )
    if (sentinelRef.current) observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [artworks.length])

  const visible = artworks.slice(0, visibleCount)
  // Réinitialiser visibleCount à BATCH_SIZE quand les filtres changent
  // ...
}
```

### Pattern 4 : generateMetadata avec requête DB

**Quoi :** Métadonnées Open Graph générées dynamiquement depuis les données de l'œuvre.
**Quand :** Page de détail avec partage social (og:image, og:title, og:description).

```typescript
// Source : nextjs.org/docs/app/api-reference/functions/generate-metadata [VERIFIED: 2026-04-10]
// src/app/artworks/[id]/page.tsx
import type { Metadata } from 'next'
import { getStorage } from '@/lib/storage'

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const artwork = await db.query.artworks.findFirst({
    where: (a, { eq }) => eq(a.id, parseInt(id)),
    with: { type: true, medium: true },
  })
  if (!artwork) return { title: '404 — Galerie POF' }

  const storage = getStorage()
  const imageUrl = artwork.processedPath
    ? storage.getUrl(artwork.processedPath)
    : undefined

  const description = artwork.description?.slice(0, 160)
    ?? `${artwork.type?.name ?? ''} · ${artwork.medium?.name ?? ''} · ${artwork.widthCm}×${artwork.heightCm} cm`

  return {
    title: `${artwork.title} — Galerie POF`,
    openGraph: {
      title: artwork.title,
      description,
      images: imageUrl ? [imageUrl] : [],
      type: 'website',
    },
  }
}
```

> **Attention :** `og:image` doit être une URL absolue. Côté local, `storage.getUrl()` retourne `http://localhost:3000/api/uploads/...`. En production, ce sera l'URL R2. Le `metadataBase` dans `app/layout.tsx` est recommandé pour résoudre les URLs relatives. [VERIFIED: nextjs.org/docs generateMetadata]

### Pattern 5 : next/font/google avec variables CSS + Tailwind 4

**Quoi :** Trois polices chargées en self-hosted avec variables CSS injectées dans `<html>`.
**Quand :** Plusieurs polices à utiliser via classes Tailwind personnalisées.

```typescript
// Source : nextjs.org/docs/app/api-reference/components/font [VERIFIED: 2026-04-10]
// src/app/layout.tsx
import { Oswald, Space_Mono, Cormorant_Garamond } from 'next/font/google'

const oswald = Oswald({
  subsets: ['latin'],
  variable: '--font-oswald',
  display: 'swap',
})

const spaceMono = Space_Mono({
  weight: ['400', '700'],
  subsets: ['latin'],
  variable: '--font-space-mono',
  display: 'swap',
})

const cormorantGaramond = Cormorant_Garamond({
  weight: ['400'],
  style: ['italic'],
  subsets: ['latin'],
  variable: '--font-cormorant',
  display: 'swap',
})

export default function RootLayout({ children }) {
  return (
    <html lang="fr" className={`${oswald.variable} ${spaceMono.variable} ${cormorantGaramond.variable}`}>
      <body>{children}</body>
    </html>
  )
}
```

```css
/* src/app/globals.css — extension @theme inline Tailwind 4 */
@theme inline {
  --font-oswald: var(--font-oswald);
  --font-space-mono: var(--font-space-mono);
  --font-cormorant: var(--font-cormorant);
}
```

[VERIFIED: nextjs.org/docs font + Tailwind CSS integration section]

### Pattern 6 : Navigation précédent/suivant (requête Drizzle)

**Quoi :** Trouver l'œuvre précédente et suivante par rapport à `published_at`.
**Quand :** Page détail — flèches de navigation dans l'ordre chronologique inversé.

```typescript
// Source : Drizzle ORM docs [VERIFIED] + logique projet
import { and, eq, gt, lt, desc, asc } from 'drizzle-orm'

async function getAdjacentArtworks(currentPublishedAt: Date) {
  // "Précédent" = publié APRÈS l'œuvre courante (plus récent dans l'ordre DESC)
  const prev = await db.query.artworks.findFirst({
    where: (a, { and, eq, gt }) => and(
      eq(a.pipelineState, 'published'),
      gt(a.publishedAt, currentPublishedAt)
    ),
    orderBy: (a, { asc }) => [asc(a.publishedAt)],
    columns: { id: true, title: true },
  })

  // "Suivant" = publié AVANT l'œuvre courante (plus ancien dans l'ordre DESC)
  const next = await db.query.artworks.findFirst({
    where: (a, { and, eq, lt }) => and(
      eq(a.pipelineState, 'published'),
      lt(a.publishedAt, currentPublishedAt)
    ),
    orderBy: (a, { desc }) => [desc(a.publishedAt)],
    columns: { id: true, title: true },
  })

  return { prev, next }
}
```

### Anti-patterns à éviter

- **Charger les images via `<Image>` Next.js depuis `/api/uploads/...`** : `next/image` optimise les images vers ses propres routes `/next/image?url=...`. Pour les URLs stockage local via route handler `GET /api/uploads/[...key]`, utiliser `<img>` standard avec `srcSet` manuel — ou configurer `next/image` avec `remotePatterns` incluant `localhost`. En Phase 3, `<img>` standard est suffisant et plus simple.
- **Mettre `useSearchParams` hors d'un `<Suspense>`** : Next.js 15 émet une erreur de build si un composant utilisant `useSearchParams` n'est pas enveloppé dans `Suspense`. Envelopper `GalleryClient` dans `<Suspense fallback={...}>` dans le Server Component parent.
- **Appeler `getStorage()` côté client** : `getStorage()` utilise `process.env.STORAGE_BACKEND` et le module `fs` Node.js. Toujours résoudre les URLs d'images côté serveur et les passer en props.
- **Réinitialiser `visibleCount` sur le mauvais événement** : Oublier de réinitialiser `visibleCount` à `BATCH_SIZE` quand les filtres changent fait afficher trop ou trop peu d'œuvres après un changement de filtre.
- **CSS `columns` avec `position: absolute` dans les cartes** : `break-inside: avoid` ne fonctionne pas si la carte utilise `position: absolute`. L'hover overlay doit être `position: absolute` dans un conteneur relatif qui lui est enfant de la colonne, pas de la carte elle-même.

---

## Ne pas réinventer

| Problème | Ne pas construire | Utiliser | Pourquoi |
|----------|-------------------|----------|----------|
| Optimisation des polices | Téléchargement Google Fonts en runtime | `next/font/google` | Auto-hébergement, pas de layout shift, préchargement automatique |
| Intersection observer lifecycle | Gestion manuelle observer + cleanup | `useEffect` + `IntersectionObserver` natif (pas de lib tierce) | API native bien supportée, aucune dépendance |
| Métadonnées SEO / Open Graph | `<head>` manuel | `generateMetadata()` Next.js | Streaming metadata, type-safe, héritage/merge automatique |
| URLs d'images | Hardcoder `/api/uploads/` | `getStorage().getUrl(key)` | Abstraction R2 — zéro changement de code en Phase 6 |
| Requêtes avec relations | SQL JOIN manuel | `db.query.artworks.findMany({ with: { type, medium } })` | Type-safe, une seule requête SQL |

---

## Pièges courants

### Piège 1 : `og:image` avec URL relative

**Ce qui échoue :** `og:image: '/api/uploads/processed/...'` — les crawlers sociaux (Facebook, WhatsApp) ne résolvent pas les URLs relatives.
**Cause :** `generateMetadata` accepte les chemins relatifs si `metadataBase` est défini, mais en local il n'est pas toujours configuré.
**Comment éviter :** Ajouter `metadataBase: new URL(process.env.BETTER_AUTH_URL ?? 'http://localhost:3000')` dans `app/layout.tsx`. En production, `BETTER_AUTH_URL` sera l'URL Railway.
**Signes d'alerte :** L'image n'apparaît pas dans les aperçus WhatsApp/Telegram en dev.
[VERIFIED: nextjs.org/docs generateMetadata — section metadataBase]

### Piège 2 : `useSearchParams` sans `<Suspense>` — erreur de build

**Ce qui échoue :** Build Next.js 15 échoue avec "Missing Suspense boundary with useSearchParams".
**Cause :** Next.js 15 requiert un `<Suspense>` autour de tout composant utilisant `useSearchParams` pour le rendu statique.
**Comment éviter :** Dans `src/app/page.tsx` (Server Component), envelopper `<GalleryClient>` dans `<Suspense fallback={<GalleryLoadingSkeleton />}>`.
**Signes d'alerte :** `next build` échoue même si le dev server fonctionne.
[VERIFIED: nextjs.org/docs — useSearchParams]

### Piège 3 : `break-inside: avoid` ignoré

**Ce qui échoue :** Les cartes masonry se coupent en milieu d'image ou entre image et info strip.
**Cause :** `break-inside: avoid` s'applique au conteneur direct de la colonne. Si la carte est enveloppée dans un `<div>` wrapper supplémentaire, la propriété doit être sur ce wrapper.
**Comment éviter :** Appliquer `break-inside: avoid` directement sur l'élément carte (`ArtworkCard`) qui est l'enfant direct du conteneur `columns`.
**Signes d'alerte :** Les cartes se coupent visuellement entre l'image et le texte.
[CITED: developer.mozilla.org/en-US/docs/Web/CSS/break-inside]

### Piège 4 : Aspect ratio avec valeurs `numeric` Drizzle

**Ce qui échoue :** `aspect-ratio: ${artwork.widthCm} / ${artwork.heightCm}` retourne `"3.5" / "2.0"` avec quotes car Drizzle retourne les colonnes `numeric` comme des strings en TypeScript.
**Cause :** PostgreSQL `numeric` → JavaScript `string` dans l'ORM Drizzle (comportement pg driver).
**Comment éviter :** Convertir explicitement : `aspectRatio: \`${parseFloat(artwork.widthCm ?? '1')} / ${parseFloat(artwork.heightCm ?? '1')}\``.
**Signes d'alerte :** L'aspect ratio CSS est invalide, les images s'affichent en carrés.
[VERIFIED: schéma DB — `widthCm: numeric(...)` + comportement node-postgres connu]

### Piège 5 : `getStorage()` appelé dans un Client Component

**Ce qui échoue :** Erreur `Cannot find module 'fs'` ou `process is not defined` côté client.
**Cause :** `LocalStorageAdapter` importe `node:fs` — incompatible avec le bundle browser.
**Comment éviter :** Toujours résoudre les URLs d'images dans le Server Component (ou `generateMetadata`) et les passer en props aux Client Components.
**Signes d'alerte :** Erreur de compilation ou erreur runtime dans la console browser.
[VERIFIED: src/lib/storage/local.ts — import * as fs from 'node:fs/promises']

### Piège 6 : Filtre client après fetch paginé vs filtre avant

**Ce qui échoue :** Si le filtrage se fait après un fetch paginé (ex: Server Action qui retourne 6 items), changer de filtre peut donner 0 résultats visible même si des œuvres correspondent.
**Cause :** Les 6 premiers items chargés ne correspondent pas au filtre actif.
**Comment éviter :** Stratégie choisie (D-12) : charger TOUTES les œuvres publiées une fois, filtrer côté client. Aucun Server Action de pagination nécessaire.
[ASSUMED — logique projet, valide pour collections < 500 œuvres]

---

## Exemples de code

### CSS Masonry (multi-colonnes)

```css
/* Source : MDN CSS columns — Baseline Widely Available */
.masonry-grid {
  columns: 3;
  column-gap: 2px;
}

.masonry-card {
  break-inside: avoid;
  margin-bottom: 2px;
  width: 100%;
}

/* Tablette (768–1023px) */
@media (max-width: 1023px) {
  .masonry-grid { columns: 2; }
}

/* Mobile (<768px) */
@media (max-width: 767px) {
  .masonry-grid { columns: 1; }
}
```

[VERIFIED: developer.mozilla.org/en-US/docs/Web/CSS/columns — Baseline Widely Available depuis 2017]

### Tokens CSS dans globals.css (Tailwind 4)

```css
/* Source : 03-UI-SPEC.md + nextjs.org/docs font + Tailwind CSS 4 */
@import "tailwindcss";

@theme inline {
  /* Palette */
  --color-bg: #f2e8cf;
  --color-surface: #ede0b8;
  --color-teal: #5b8e7d;
  --color-orange: #f4a259;
  --color-green: #8cb369;
  --color-yellow: #f4e285;
  --color-red: #bc4b51;
  --color-ink: #1a1a1a;
  --color-ink-muted: #5a5244;

  /* Polices (variables injectées par next/font/google) */
  --font-oswald: var(--font-oswald);
  --font-space-mono: var(--font-space-mono);
  --font-cormorant: var(--font-cormorant);
}

body {
  background-color: var(--color-bg);
  color: var(--color-ink);
}
```

---

## État de l'art

| Ancienne approche | Approche actuelle | Changé en | Impact |
|-------------------|-------------------|-----------|--------|
| Masonry via JS (Masonry.js, Isotope) | CSS `columns` natif | ~2015, stable depuis 2017 | Zéro JS, pas de reflow |
| CSS Masonry Grid (`masonry` dans grid-template-rows) | Pas encore production-ready (derrière flag Chrome/Edge 140+) | 2025–2026 | Ne pas utiliser — `columns` reste le standard de production |
| `_document.js` Pages Router pour les fonts | `next/font/google` avec `variable` + App Router layout | Next.js 13+ | Self-hosting automatique, layout shift nul |
| Métadonnées manuelles `<Head>` | `generateMetadata()` export | Next.js 13+ | Streaming, type-safe, héritage automatique |
| `useEffect + fetch` pour les données publiques | Server Components Drizzle direct | Next.js 13+ App Router | Pas de waterfall, SEO natif |

**Déprécié/obsolète :**
- `Masonry.js` / `Isotope` : remplacés par CSS `columns` natif pour ce cas d'usage
- `<meta property="og:..." />` dans `<Head>` Pages Router : remplacé par `generateMetadata()`
- `next/head` : Pages Router uniquement — App Router utilise `generateMetadata`
- `themeColor` dans `metadata` : déprécié Next.js 14+, utiliser `generateViewport`

---

## Journal des hypothèses

| # | Affirmation | Section | Risque si faux |
|---|-------------|---------|----------------|
| A1 | Charger toutes les œuvres publiées en une requête est viable (collection < 500 items) | Patterns, Piège 6 | Si la collection dépasse ~1000 items, la stratégie client-only devient lente. Solution : basculer vers un Server Action paginé avec filtre côté serveur. |
| A2 | `next/image` n'est pas utilisé — `<img>` standard avec `srcSet` suffit | Stack Standard | Si Next.js 15 émet des avertissements sur `<img>` sans optimisation, adapter vers `next/image` avec `remotePatterns: [{ hostname: 'localhost' }]`. |
| A3 | Le fond SVG `feTurbulence` avec formes animées ne dégrade pas les perfs mobile | Architecture | Si le SVG complexe cause des janks, simplifier à des formes statiques sans filtre SVG. |

**Si ce tableau est vide :** Toutes les affirmations sont vérifiées ou citées. Ce n'est pas le cas ici — A1 est l'hypothèse principale à valider en pratique.

---

## Questions ouvertes

1. **`og:image` en dev pointe vers `http://localhost:3000/api/uploads/...`**
   - Ce qu'on sait : les crawlers sociaux ne peuvent pas accéder à localhost.
   - Ce qui est flou : doit-on mettre un fallback `og:image` statique en dev ?
   - Recommandation : en Phase 3 (dev only), accepter que `og:image` ne soit pas testable localement. En Phase 6 (production), l'URL sera publique.

2. **Ordre exact prev/next quand plusieurs œuvres ont le même `published_at`**
   - Ce qu'on sait : `published_at` est un timestamp avec timezone.
   - Ce qui est flou : si deux œuvres ont exactement le même timestamp (ex: seed de test), l'ordre est indéterminé.
   - Recommandation : ajouter `id` comme critère de tri secondaire (`ORDER BY published_at DESC, id DESC`).

---

## Disponibilité de l'environnement

| Dépendance | Requise par | Disponible | Version | Fallback |
|------------|------------|------------|---------|----------|
| Node.js | Next.js dev server | ✓ | 24.13.0 | — |
| PostgreSQL (Docker) | Drizzle ORM | supposé ✓ (Phase 1-2 complétée) | — | — |
| lucide-react | shadcn UI (icônes) | ✗ non installé | 1.14.0 disponible | Flèches Unicode `← →` (D-17 — déjà décidé) |
| Polices Google (réseau build) | next/font/google | ✓ (build time) | — | Fallback système si build offline |

**Dépendances manquantes sans fallback :** aucune.
**Dépendances manquantes avec fallback :** `lucide-react` — non nécessaire en Phase 3 (flèches Unicode suffisantes selon D-17).

---

## Architecture de validation

### Framework de test

| Propriété | Valeur |
|-----------|--------|
| Framework | Vitest 4.1.5 |
| Fichier de config | `vitest.config.ts` (racine) |
| Commande rapide | `npx vitest run tests/gallery/` |
| Suite complète | `npx vitest run` |

### Exigences → Carte de tests

| ID Req | Comportement | Type | Commande automatisée | Fichier existe ? |
|--------|-------------|------|----------------------|-----------------|
| GALLERY-01 | Affichage 1 colonne mobile | visuel / smoke | manuel (navigateur) | — |
| GALLERY-02 | Grille masonry 2–3 colonnes desktop | visuel / smoke | manuel (navigateur) | — |
| GALLERY-03 | Filtres sans rechargement, URL params persistés | unit | `npx vitest run tests/gallery/filters.test.ts` | ❌ Wave 0 |
| GALLERY-04 | Page détail URL propre, nav prev/next | unit | `npx vitest run tests/gallery/detail.test.ts` | ❌ Wave 0 |
| ART-01 à ART-05 | Métadonnées affichées sur page détail | unit | intégré dans `detail.test.ts` | ❌ Wave 0 |
| ABOUT-01 | Page /about existe et charge | smoke | `npx vitest run tests/gallery/about.test.ts` | ❌ Wave 0 |

**Note :** Les tests visuels (layout CSS masonry, hover overlay) sont manuels — non automatisables avec Vitest/Node.js. Les tests unitaires couvrent la logique de filtrage, la construction des URLs, et les requêtes Drizzle mockées.

### Taux d'échantillonnage

- **Par commit de tâche :** `npx vitest run tests/gallery/`
- **Par merge de vague :** `npx vitest run`
- **Gate de phase :** Suite complète verte avant `/gsd-verify-work`

### Gaps Wave 0

- [ ] `tests/gallery/filters.test.ts` — logique de filtrage client (type + médium + reset)
- [ ] `tests/gallery/detail.test.ts` — requête prev/next, construction metadata OG
- [ ] `tests/gallery/about.test.ts` — page `/about` existe (smoke)
- [ ] `tests/gallery/helpers.test.ts` — `parseFloat` aspect ratio, truncateDescription

---

## Domaine sécurité

> `security_enforcement` non défini dans config.json → traité comme activé.

### Catégories ASVS applicables

| Catégorie ASVS | Applicable | Contrôle standard |
|----------------|-----------|-------------------|
| V2 Authentification | Non — galerie 100% publique | — |
| V3 Gestion de session | Non — pas de session visiteur en Phase 3 | — |
| V4 Contrôle d'accès | Partiel — vérifier que `/admin/*` reste protégé | Middleware Better Auth existant (Phase 1) |
| V5 Validation des entrées | Oui — `id` dans `/artworks/[id]` | `parseInt(id)` + `notFound()` si NaN ou artwork absent |
| V6 Cryptographie | Non | — |

### Patterns de menace connus

| Pattern | STRIDE | Mitigation standard |
|---------|--------|---------------------|
| Injection dans l'ID de route (`/artworks/abc`) | Tampering | `parseInt(id)` — retourne `NaN`, `notFound()` déclenché |
| Path traversal via URL d'image | Tampering | `assertSafeKey()` déjà implémenté dans `LocalStorageAdapter` |
| Exposition d'œuvres non publiées | Information Disclosure | Filtre `pipelineState = 'published'` dans TOUTES les requêtes galerie et détail |
| Scraping de données visiteurs | Information Disclosure | Pas de données visiteurs en Phase 3 — non applicable |

**Règle critique :** Chaque requête Drizzle exposant des données au public DOIT inclure `where: eq(artworks.pipelineState, 'published')`. Une œuvre en `pending`, `processing`, `awaiting_validation` ou `failed` ne doit jamais apparaître dans la galerie publique.

---

## Sources

### Primaires (confiance HIGH)

- [nextjs.org/docs/app/api-reference/functions/generate-metadata](https://nextjs.org/docs/app/api-reference/functions/generate-metadata) — generateMetadata, Open Graph, metadataBase (vérifié 2026-04-10, version 16.2.4)
- [nextjs.org/docs/app/api-reference/components/font](https://nextjs.org/docs/app/api-reference/components/font) — next/font/google, multiple fonts, variables CSS, Tailwind 4 (vérifié 2026-04-10, version 16.2.4)
- [developer.mozilla.org/en-US/docs/Web/CSS/columns](https://developer.mozilla.org/en-US/docs/Web/CSS/columns) — CSS columns, Baseline Widely Available depuis 2017
- [orm.drizzle.team/docs/rqb](https://orm.drizzle.team/docs/rqb) — Drizzle RQB findMany, with, where, orderBy
- `src/db/schema.ts` — schéma DB vérifié (artworks, artworkTypes, mediums, relations)
- `src/lib/storage/index.ts`, `src/lib/storage/local.ts` — StorageProvider vérifié
- `.planning/phases/03-public-gallery/03-UI-SPEC.md` — contrat UI verrouillé
- `.planning/phases/03-public-gallery/03-CONTEXT.md` — décisions verrouillées D-01 à D-18

### Secondaires (confiance MEDIUM)

- [developer.chrome.com/blog/masonry-update](https://developer.chrome.com/blog/masonry-update) — CSS Masonry Grid (flag Chrome 140+) — confirme que `columns` reste le choix production
- npm registry `npm view next version` → 16.2.4 (vs 15.5.15 installé) — version majeure ahead, mais projet stable sur 15.x

### Tertiaires (confiance LOW)

- WebSearch "next/font/google Cormorant_Garamond Space_Mono Oswald" — noms d'import confirmés par syntaxe underscore documentée

---

## Métadonnées

**Décomposition de la confiance :**
- Stack standard : HIGH — packages existants, docs officiels vérifiés
- Architecture : HIGH — patterns établis en Phase 1–2, cohérents avec le schéma DB
- Pièges : HIGH — vérifiés contre le code existant et la documentation officielle
- Filtrage côté client : MEDIUM → A1 est une hypothèse (taille de collection raisonnable)

**Date de recherche :** 2026-04-29
**Valable jusqu'au :** 2026-05-29 (stable — next/font, CSS columns, Drizzle évoluent lentement)
