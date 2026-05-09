# Phase 3 : Galerie Publique — Carte des patterns

**Cartographié :** 2026-04-29
**Fichiers analysés :** 13 fichiers nouveaux/modifiés
**Analogues trouvés :** 11 / 13

---

## Classification des fichiers

| Fichier nouveau/modifié | Rôle | Flux de données | Analogue le plus proche | Qualité |
|---|---|---|---|---|
| `src/app/layout.tsx` | layout | config | `src/app/layout.tsx` (existant) | exact — modifier en place |
| `src/app/globals.css` | config | config | `src/app/globals.css` (existant) | exact — modifier en place |
| `src/app/page.tsx` | page (Server Component) | request-response | `src/app/admin/artworks/page.tsx` | role-match |
| `src/app/about/page.tsx` | page (Server Component) | request-response | `src/app/admin/artworks/page.tsx` | role-match (simpler) |
| `src/app/artworks/[id]/page.tsx` | page (Server Component + generateMetadata) | request-response | `src/app/admin/artworks/[id]/page.tsx` | exact |
| `src/app/not-found.tsx` | page | request-response | aucun existant | aucun |
| `src/components/gallery/GalleryClient.tsx` | composant client | event-driven | `src/app/admin/artworks/_components/PipelinePoller.tsx` | partiel (`useEffect` pattern) |
| `src/components/gallery/MasonryGrid.tsx` | composant | request-response | aucun équivalent CSS columns | aucun |
| `src/components/gallery/ArtworkCard.tsx` | composant | request-response | `src/app/admin/artworks/[id]/page.tsx` (section images) | partiel |
| `src/components/gallery/FilterBar.tsx` | composant client | event-driven | aucun existant | aucun |
| `src/components/gallery/ScrollSentinel.tsx` | composant client | event-driven | aucun existant | aucun |
| `src/components/artwork/ArtworkStatusBadge.tsx` | composant | request-response | `src/app/admin/artworks/_components/PipelineBadge.tsx` | exact |
| `src/components/artwork/ArtworkInfoPanel.tsx` | composant | request-response | `src/app/admin/artworks/[id]/page.tsx` (colonne métadonnées) | role-match |
| `src/components/artwork/ArtworkNav.tsx` | composant | request-response | aucun existant | aucun |
| `src/components/layout/SiteNav.tsx` | composant layout | request-response | aucun existant | aucun |
| `src/components/layout/BackgroundDecor.tsx` | composant | request-response | aucun existant | aucun |

---

## Affectations de patterns par fichier

### `src/app/layout.tsx` (layout, config)

**Analogue :** `src/app/layout.tsx` (existant — modifier en place)

**Pattern imports** (lignes 1-4) :
```typescript
import type { Metadata } from 'next'
import './globals.css'
```

**Modification à apporter — ajouter les polices** (lignes 3-33, à insérer avant l'export metadata) :
```typescript
// POURQUOI next/font/google ?
// Auto-hébergement au build, zéro layout shift, pas de requête réseau runtime.
// Les trois polices couvrent les trois niveaux typographiques du design system.
import { Oswald, Space_Mono, Cormorant_Garamond } from 'next/font/google'

const oswald = Oswald({
  subsets: ['latin'],
  variable: '--font-oswald',  // Variable CSS injectée dans <html>
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
```

**Pattern body/html** (lignes 27-37, remplacer `<html lang="fr">`) :
```typescript
// Injecter les trois variables CSS de polices sur l'élément <html>
// pour qu'elles soient accessibles via var(--font-oswald) etc. dans tout le CSS.
// metadataBase est obligatoire pour que og:image soit une URL absolue.
export const metadata: Metadata = {
  metadataBase: new URL(process.env.BETTER_AUTH_URL ?? 'http://localhost:3000'),
  title: 'Galerie POF',
  description: "Galerie personnelle de l'artiste — dessins et peintures",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="fr"
      className={`${oswald.variable} ${spaceMono.variable} ${cormorantGaramond.variable}`}
    >
      <body>{children}</body>
    </html>
  )
}
```

---

### `src/app/globals.css` (config, CSS tokens)

**Analogue :** `src/app/globals.css` (existant — modifier en place)

**Pattern existant à préserver** (ligne 1) :
```css
@import "tailwindcss";
```

**Remplacement complet du bloc `@theme inline` et `body`** :
```css
/* POURQUOI @theme inline ?
   Tailwind 4 lit ce bloc pour générer les classes utilitaires correspondantes.
   Ex : --color-bg → classe bg-bg, text-bg, etc. */
@theme inline {
  /* Palette issue de D-01 */
  --color-bg: #f2e8cf;
  --color-surface: #ede0b8;
  --color-teal: #5b8e7d;
  --color-orange: #f4a259;
  --color-green: #8cb369;
  --color-yellow: #f4e285;
  --color-red: #bc4b51;
  --color-ink: #1a1a1a;
  --color-ink-muted: #5a5244;

  /* Variables de polices — injectées par next/font/google dans <html> */
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

### `src/app/page.tsx` (Server Component, galerie principale)

**Analogue :** `src/app/admin/artworks/page.tsx`

**Pattern imports** (lignes 19-28 de l'analogue) :
```typescript
// Copier la structure d'import — adapter pour galerie publique (pas d'auth)
import { db } from '@/db'
import { artworkTypes, mediums } from '@/db/schema'
import { getStorage } from '@/lib/storage'
import { Suspense } from 'react'
import { GalleryClient } from '@/components/gallery/GalleryClient'
```

**Pattern de requête Drizzle** (lignes 39-42 de l'analogue — adapter) :
```typescript
// DIFFÉRENCE CLÉ vs la page admin :
// 1. Pas d'auth check (galerie publique)
// 2. Filtre pipelineState = 'published' OBLIGATOIRE (sécurité GALLERY-public-01)
// 3. Utiliser db.query.artworks.findMany() avec { with: { type, medium } }
//    pour récupérer les relations en une seule requête

export default async function GalleryPage() {
  const publishedArtworks = await db.query.artworks.findMany({
    where: (artworks, { eq }) => eq(artworks.pipelineState, 'published'),
    with: {
      type: true,
      medium: true,
    },
    orderBy: (artworks, { desc }) => [desc(artworks.publishedAt)],
  })

  // Résoudre les URLs côté serveur — JAMAIS dans un Client Component
  // (getStorage() utilise node:fs, incompatible avec le bundle navigateur)
  const storage = getStorage()
  const artworksWithUrls = publishedArtworks.map((a) => ({
    ...a,
    thumbnailUrl: a.thumbnailPath ? storage.getUrl(a.thumbnailPath) : null,
    processedUrl: a.processedPath ? storage.getUrl(a.processedPath) : null,
    // Piège 4 : convertir numeric → number pour l'aspect-ratio CSS
    widthCmNum: parseFloat(a.widthCm ?? '1'),
    heightCmNum: parseFloat(a.heightCm ?? '1'),
  }))

  const types = await db.select().from(artworkTypes).orderBy(artworkTypes.sortOrder)
  const allMediums = await db.select().from(mediums).orderBy(mediums.sortOrder)

  // OBLIGATOIRE : Suspense autour de GalleryClient pour useSearchParams (Piège 2)
  return (
    <>
      <SiteNav />
      <BackgroundDecor />
      <Suspense fallback={<GalleryLoadingSkeleton />}>
        <GalleryClient
          artworks={artworksWithUrls}
          types={types}
          mediums={allMediums}
        />
      </Suspense>
    </>
  )
}
```

---

### `src/app/artworks/[id]/page.tsx` (Server Component + generateMetadata)

**Analogue :** `src/app/admin/artworks/[id]/page.tsx`

**Pattern params Next.js 15** (lignes 34-42 de l'analogue) :
```typescript
// Next.js 15 : params est une Promise — OBLIGATOIRE d'await-er
export default async function ArtworkDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const artworkId = parseInt(id, 10)
  // Piège sécurité (V5 ASVS) : parseInt retourne NaN pour les IDs non numériques
  if (isNaN(artworkId)) notFound()
```

**Pattern requête Drizzle avec relations** (lignes 49-62 de l'analogue — adapter pour db.query) :
```typescript
// Utiliser db.query (RQB) au lieu de db.select().from() pour avoir les relations typées
// CRITIQUE : eq(artworks.pipelineState, 'published') dans TOUTES les requêtes publiques
const artwork = await db.query.artworks.findFirst({
  where: (a, { and, eq }) => and(
    eq(a.id, artworkId),
    eq(a.pipelineState, 'published')  // Sécurité : ne jamais exposer les brouillons
  ),
  with: { type: true, medium: true },
})
if (!artwork) notFound()
```

**Pattern construction URLs images** (lignes 64-68 de l'analogue) :
```typescript
// Même pattern que la page admin — résoudre côté serveur
const storage = getStorage()
const processedUrl = artwork.processedPath ? storage.getUrl(artwork.processedPath) : null
const thumbnailUrl = artwork.thumbnailPath ? storage.getUrl(artwork.thumbnailPath) : null
```

**Pattern generateMetadata** (spécifique Phase 3 — aucun analogue existant) :
```typescript
// IMPORTANT : generateMetadata doit être dans le même fichier que la page
// et requêter la DB indépendamment (Next.js l'appelle séparément)
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const artworkId = parseInt(id, 10)
  if (isNaN(artworkId)) return { title: '404 — Galerie POF' }

  const artwork = await db.query.artworks.findFirst({
    where: (a, { and, eq }) => and(eq(a.id, artworkId), eq(a.pipelineState, 'published')),
    with: { type: true, medium: true },
  })
  if (!artwork) return { title: '404 — Galerie POF' }

  const storage = getStorage()
  const imageUrl = artwork.processedPath ? storage.getUrl(artwork.processedPath) : undefined

  return {
    title: `${artwork.title} — Galerie POF`,
    openGraph: {
      title: artwork.title,
      description: artwork.description?.slice(0, 160)
        ?? `${artwork.type?.name ?? ''} · ${artwork.medium?.name ?? ''} · ${artwork.widthCm}×${artwork.heightCm} cm`,
      images: imageUrl ? [imageUrl] : [],
    },
  }
}
```

**Pattern navigation prev/next** (aucun analogue existant — depuis RESEARCH.md) :
```typescript
// Requête prev/next : deux db.query distincts (pas de sous-requête Drizzle)
// "Précédent" = plus récent (publishedAt plus grand dans l'ordre DESC)
const prev = await db.query.artworks.findFirst({
  where: (a, { and, eq, gt }) => and(
    eq(a.pipelineState, 'published'),
    gt(a.publishedAt, artwork.publishedAt!)
  ),
  orderBy: (a, { asc }) => [asc(a.publishedAt)],
  columns: { id: true, title: true },
})
// "Suivant" = plus ancien
const next = await db.query.artworks.findFirst({
  where: (a, { and, eq, lt }) => and(
    eq(a.pipelineState, 'published'),
    lt(a.publishedAt, artwork.publishedAt!)
  ),
  orderBy: (a, { desc }) => [desc(a.publishedAt)],
  columns: { id: true, title: true },
})
```

---

### `src/app/about/page.tsx` (Server Component statique)

**Analogue :** `src/app/admin/artworks/page.tsx` (structure simplifiée, pas de requête DB)

**Pattern Server Component minimal** :
```typescript
// Pas d'auth, pas de requête DB — page statique avec contenu placeholder
// Copier la structure export default async function + return JSX
// Pas de 'use client' — Server Component pur

export default async function AboutPage() {
  return (
    <main>
      {/* ... contenu placeholder ... */}
    </main>
  )
}
```

---

### `src/components/artwork/ArtworkStatusBadge.tsx` (composant, badges funky)

**Analogue :** `src/app/admin/artworks/_components/PipelineBadge.tsx` — correspondance exacte de structure

**Pattern complet à copier** (lignes 14-80 de l'analogue) :
```typescript
// Même pattern BADGE_CONFIG avec Record<Status, { ... }>
// DIFFÉRENCE : statuts artwork_status (available/sold/given/reserved) au lieu de pipelineState
// DIFFÉRENCE : le rendu est "funky" (D-10) — pas un simple span coloré
// Les styles inline garantissent la conformité spec UI (pas de purge Tailwind)

type ArtworkStatus = 'available' | 'sold' | 'given' | 'reserved'

const STATUS_CONFIG: Record<ArtworkStatus, { label: string; style: React.CSSProperties }> = {
  available: {
    label: 'disponible',
    style: {
      // D-10 : petit carré teal, texte monospace minuscule
      display: 'inline-block',
      padding: '2px 6px',
      backgroundColor: '#5b8e7d',  // --color-teal
      color: '#f2e8cf',
      fontSize: '10px',
      fontFamily: 'var(--font-space-mono)',
      letterSpacing: '0.05em',
      textTransform: 'lowercase',
      // D-03 : zéro coins arrondis
    },
  },
  sold: {
    label: 'vendue',
    style: {
      // D-10 : stamp rouge (ex: position relative + pseudo-element via classe CSS)
      color: '#bc4b51',  // --color-red
      fontFamily: 'var(--font-space-mono)',
      fontSize: '10px',
      textTransform: 'uppercase',
      border: '2px solid #bc4b51',
      padding: '1px 5px',
      transform: 'rotate(-3deg)',
      display: 'inline-block',
    },
  },
  // given et reserved : au planner selon D-10 / D-03
}

export function ArtworkStatusBadge({ status }: { status: ArtworkStatus | string }) {
  const config = STATUS_CONFIG[status as ArtworkStatus] ?? {
    label: status,
    style: { color: '#5a5244', fontSize: '10px' },
  }
  return <span style={config.style}>{config.label}</span>
}
```

---

### `src/components/artwork/ArtworkInfoPanel.tsx` (composant, panel info détail)

**Analogue :** `src/app/admin/artworks/[id]/page.tsx` (colonne gauche métadonnées, lignes 113-189)

**Pattern méta-grille** (lignes 117-142 de l'analogue — adapter au design Phase 3) :
```typescript
// Même structure <dl> avec dt/dd — adapter les styles pour la palette Phase 3
// Remplacer les couleurs grises (#737373, #171717) par les tokens de la palette
// (--color-ink-muted, --color-ink)
<dl style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 8px', fontSize: '14px' }}>
  <dt style={{ color: 'var(--color-ink-muted)', fontFamily: 'var(--font-space-mono)', fontSize: '11px' }}>Technique</dt>
  <dd style={{ color: 'var(--color-ink)', margin: 0 }}>{medium?.name ?? '—'}</dd>
  {/* ... titre, année, dimensions, prix de base ... */}
</dl>
```

**Pattern description** (lignes 144-153 de l'analogue — adapter typographie) :
```typescript
// D-02 : description en Cormorant Garamond italique
{artwork.description && (
  <p style={{
    fontFamily: 'var(--font-cormorant)',
    fontStyle: 'italic',
    fontSize: '18px',
    color: 'var(--color-ink)',
    lineHeight: '1.6',
  }}>
    {artwork.description}
  </p>
)}
```

---

### `src/components/gallery/GalleryClient.tsx` (Client Component, filtres + infinite scroll)

**Analogue :** `src/app/admin/artworks/_components/PipelinePoller.tsx` (pattern `useEffect` + `'use client'` uniquement — structure partielle)

**Pattern 'use client' + imports** :
```typescript
'use client'
// POURQUOI 'use client' ?
// Ce composant utilise :
// 1. useSearchParams (lire les filtres depuis l'URL)
// 2. useRouter (mettre à jour l'URL sans rechargement)
// 3. useState (visibleCount, filtres actifs)
// 4. useEffect + IntersectionObserver (infinite scroll)
import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
```

**Pattern infinite scroll** (depuis RESEARCH.md Pattern 3) :
```typescript
const BATCH_SIZE = 6

// Réinitialiser visibleCount quand les filtres changent — CRITIQUE (Piège 6 RESEARCH.md)
// Sans ce reset, changer de filtre peut afficher 0 résultat si les N premiers items
// chargés ne correspondent pas au filtre actif.
useEffect(() => {
  setVisibleCount(BATCH_SIZE)
}, [activeType, activeMedium])

// IntersectionObserver : observer le div sentinel 1px en bas de liste
useEffect(() => {
  const observer = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting) {
        setVisibleCount((n) => Math.min(n + BATCH_SIZE, filteredArtworks.length))
      }
    },
    { threshold: 0.1 }
  )
  if (sentinelRef.current) observer.observe(sentinelRef.current)
  return () => observer.disconnect()  // Cleanup obligatoire
}, [filteredArtworks.length])
```

**Pattern URL params** (depuis RESEARCH.md Pattern 2) :
```typescript
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
  // scroll: false évite le scroll vers le haut à chaque changement de filtre
  router.replace(`/?${params.toString()}`, { scroll: false })
}
```

---

### `src/components/gallery/ArtworkCard.tsx` (composant, carte vignette)

**Analogue :** `src/app/admin/artworks/[id]/page.tsx` (lignes 194-216 — section images)

**Pattern image standard** (lignes 199-204 de l'analogue) :
```typescript
// D-15 : <img> standard — PAS next/image (Piège 1 RESEARCH.md, anti-pattern)
// Les URLs sont résolues côté serveur et passées en props (Piège 5 RESEARCH.md)
<img
  src={artwork.thumbnailUrl}
  alt={artwork.title}
  style={{
    width: '100%',
    height: 'auto',
    display: 'block',
    // D-07 : aspect-ratio calculé depuis les dimensions réelles
    // Piège 4 : widthCmNum et heightCmNum sont déjà convertis en number côté serveur
    aspectRatio: `${artwork.widthCmNum} / ${artwork.heightCmNum}`,
    maxHeight: '640px',  // Décision de discretion Claude (RESEARCH.md)
    objectFit: 'cover',
  }}
/>
```

**Pattern hover overlay** (D-11 — aucun analogue existant, CSS pur) :
```typescript
// Conteneur relatif requis pour le positionnement de l'overlay
// ATTENTION (Piège RESEARCH.md) : break-inside: avoid ne fonctionne pas
// si la carte utilise position: absolute. L'overlay est position: absolute
// dans un div enfant, pas sur la carte elle-même.
<div style={{ position: 'relative', breakInside: 'avoid', marginBottom: '2px' }}>
  <img ... />
  {/* Overlay hover — opacity 0 par défaut, 1 au survol via CSS */}
  <div className="artwork-overlay" style={{
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(42,42,42,0.55)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0,
    transition: 'opacity 0.25s',
  }}>
    <span style={{ fontFamily: 'var(--font-space-mono)', color: '#f2e8cf', textTransform: 'uppercase', fontSize: '12px', letterSpacing: '0.1em' }}>
      Voir l&apos;œuvre
    </span>
  </div>
  {/* Info strip D-09 */}
  <div style={{ padding: '6px 4px' }}>
    <span style={{ fontFamily: 'var(--font-oswald)', fontSize: '14px', color: 'var(--color-ink)' }}>
      {artwork.title}
    </span>
    <ArtworkStatusBadge status={artwork.status} />
  </div>
</div>
```

---

### `src/components/gallery/MasonryGrid.tsx` (composant CSS columns)

**Analogue :** Aucun — premier layout CSS columns du projet

**Pattern CSS columns** (depuis RESEARCH.md exemples de code) :
```typescript
// Pas de JS de layout — CSS columns natif (Baseline Widely Available 2017)
// break-inside: avoid sur CHAQUE carte enfant directe (Piège 3 RESEARCH.md)
export function MasonryGrid({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      columns: 3,          // Desktop : 3 colonnes
      columnGap: '2px',    // D-06 exact
    }}
    // Responsive via classes Tailwind ou style tag inline
    // Tablette 768-1023px : columns: 2 (décision Claude — RESEARCH.md)
    // Mobile <768px : columns: 1 (GALLERY-01)
    >
      {children}
    </div>
  )
}
```

---

### `src/components/layout/BackgroundDecor.tsx` (composant SVG décoratif)

**Analogue :** Aucun — premier composant SVG du projet

**Contraintes de pattern** (D-04) :
```typescript
// SVG fixe, z-index 0, pointer-events none — ne bloque JAMAIS les interactions
// Rendu côté serveur (pas de 'use client' nécessaire — SVG statique)
export function BackgroundDecor() {
  return (
    <svg
      aria-hidden="true"  // Décoratif — invisible aux lecteurs d'écran
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        pointerEvents: 'none',
      }}
    >
      <defs>
        <filter id="turbulence">
          {/* feTurbulence simule le rendu à la main (D-04) */}
          <feTurbulence type="turbulence" baseFrequency="0.015" numOctaves="4" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="8" />
        </filter>
      </defs>
      {/* Formes à opacité 0.15-0.22, couleurs de la palette D-01 */}
    </svg>
  )
}
```

---

### `src/components/artwork/ArtworkNav.tsx` (composant navigation prev/next)

**Analogue :** `src/app/admin/artworks/[id]/page.tsx` (lignes 81-87 — lien retour avec flèche)

**Pattern lien flèche** (lignes 81-87 de l'analogue — adapter) :
```typescript
// D-17 : flèches Unicode ← → (pas lucide-react — non installé, non requis)
// Copier le style du lien retour de la page admin
import Link from 'next/link'

export function ArtworkNav({ prev, next }: { prev: { id: number; title: string } | null; next: { id: number; title: string } | null }) {
  return (
    <nav style={{ display: 'flex', justifyContent: 'space-between', marginTop: '32px' }}>
      {prev ? (
        <Link href={`/artworks/${prev.id}`} style={{ color: 'var(--color-ink-muted)', fontFamily: 'var(--font-space-mono)', fontSize: '12px', textDecoration: 'none' }}>
          ← {prev.title}
        </Link>
      ) : <span />}
      {next ? (
        <Link href={`/artworks/${next.id}`} style={{ color: 'var(--color-ink-muted)', fontFamily: 'var(--font-space-mono)', fontSize: '12px', textDecoration: 'none' }}>
          {next.title} →
        </Link>
      ) : <span />}
    </nav>
  )
}
```

---

## Patterns partagés

### Commentaires en français
**Source :** Tout le codebase existant (convention CLAUDE.md)
**Appliquer à :** Tous les fichiers Phase 3
```typescript
/**
 * [Nom du composant / fichier] — [Une phrase décrivant le rôle].
 *
 * POURQUOI [décision technique] ?
 * [Explication du pourquoi, pas du quoi.]
 */
```

### Résolution des URLs d'images côté serveur
**Source :** `src/app/admin/artworks/[id]/page.tsx` lignes 64-68 + `src/app/admin/artworks/[id]/validate/page.tsx` lignes 66-70
**Appliquer à :** `src/app/page.tsx`, `src/app/artworks/[id]/page.tsx`
```typescript
// TOUJOURS dans le Server Component — jamais dans un Client Component
// (getStorage() utilise node:fs, incompatible navigateur — Piège 5 RESEARCH.md)
const storage = getStorage()
const url = artwork.processedPath ? storage.getUrl(artwork.processedPath) : null
```

### Gestion du paramètre `id` dynamique Next.js 15
**Source :** `src/app/admin/artworks/[id]/page.tsx` lignes 34-42
**Appliquer à :** `src/app/artworks/[id]/page.tsx`
```typescript
// Next.js 15 : params est une Promise — OBLIGATOIRE d'await-er
const { id } = await params
const artworkId = parseInt(id, 10)
if (isNaN(artworkId)) notFound()
```

### Filtre sécurité œuvres publiées
**Source :** aucun analogue existant — nouvelle règle Phase 3
**Appliquer à :** `src/app/page.tsx`, `src/app/artworks/[id]/page.tsx`
```typescript
// CRITIQUE : chaque requête publique DOIT inclure ce filtre
// Une œuvre pending/processing/awaiting_validation/failed ne doit JAMAIS
// être visible dans la galerie publique.
where: (artworks, { eq }) => eq(artworks.pipelineState, 'published')
```

### Conversion numeric Drizzle → number
**Source :** Piège 4 RESEARCH.md (vérifié contre `src/db/schema.ts` lignes 221-222)
**Appliquer à :** `src/app/page.tsx`, `src/app/artworks/[id]/page.tsx`
```typescript
// PostgreSQL numeric → JavaScript string via node-postgres (comportement connu)
// Convertir EXPLICITEMENT pour l'aspect-ratio CSS et l'affichage des dimensions
widthCmNum: parseFloat(artwork.widthCm ?? '1'),
heightCmNum: parseFloat(artwork.heightCm ?? '1'),
```

### Styles inline pour les tokens de palette
**Source :** `src/app/admin/artworks/_components/PipelineBadge.tsx` lignes 63-78
**Appliquer à :** `ArtworkStatusBadge.tsx`, `ArtworkCard.tsx`, `ArtworkInfoPanel.tsx`
```typescript
// Les styles de la palette utilisent les variables CSS --color-* définies dans globals.css
// Les styles de composants critiques (badges, overlay) utilisent des inline styles
// pour garantir la conformité avec la spec UI (pas de risque de purge Tailwind arbitraire)
style={{ color: 'var(--color-teal)', fontFamily: 'var(--font-space-mono)' }}
```

### Polices via variables CSS
**Source :** Pattern 5 RESEARCH.md + `src/app/layout.tsx` (après modification Phase 3)
**Appliquer à :** Tous les composants visuels Phase 3
```typescript
// D-02 : trois niveaux typographiques via variables CSS injectées par next/font/google
// Oswald      → titres, prix, labels importants
// Space Mono  → badges, méta, navigation, labels techniques
// Cormorant Garamond → descriptions en italique
fontFamily: 'var(--font-oswald)'       // Titres
fontFamily: 'var(--font-space-mono)'   // Labels, méta
fontFamily: 'var(--font-cormorant)'    // Descriptions
```

---

## Sans analogue — utiliser RESEARCH.md

| Fichier | Rôle | Flux | Raison |
|---|---|---|---|
| `src/app/not-found.tsx` | page 404 | request-response | Aucune page 404 n'existe dans le projet |
| `src/components/gallery/FilterBar.tsx` | composant client | event-driven | Aucun composant de filtre n'existe dans le projet — Pattern 2 RESEARCH.md |
| `src/components/gallery/ScrollSentinel.tsx` | composant client | event-driven | Aucun composant IntersectionObserver n'existe — Pattern 3 RESEARCH.md |
| `src/components/layout/SiteNav.tsx` | composant layout | request-response | Aucune navigation publique n'existe dans le projet |
| `src/components/layout/BackgroundDecor.tsx` | composant SVG | request-response | Aucun SVG décoratif n'existe dans le projet — D-04 CONTEXT.md |

---

## Métadonnées

**Périmètre de recherche :** `src/app/`, `src/components/`, `src/lib/`, `src/db/`
**Fichiers scannés :** 15
**Date d'extraction des patterns :** 2026-04-29
