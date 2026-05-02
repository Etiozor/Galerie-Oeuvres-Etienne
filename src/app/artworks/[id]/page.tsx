/**
 * Page détail d'une œuvre — Galerie POF.
 *
 * Server Component : fetch Drizzle direct + generateMetadata Open Graph.
 * Accessible publiquement sans authentification (la galerie est publique — AUTH-01).
 *
 * SÉCURITÉ :
 * - parseInt(id, 10) + isNaN() protège contre les injections via l'URL (T-03-06)
 *   Ex: /artworks/../../etc/passwd → parseInt = NaN → notFound() immédiat
 * - Le filtre pipelineState='published' dans TOUTES les requêtes garantit que
 *   seules les œuvres publiées sont accessibles (T-03-07)
 *   Ex: /artworks/42 avec state=awaiting_validation → notFound()
 *
 * LAYOUT (D-14, UI-SPEC section 8) :
 * - Desktop (≥1024px) : grid 2 colonnes — 1fr (image) + 420px (panel info)
 * - Mobile (<1024px) : image pleine largeur puis panel info empilé
 *
 * NAVIGATION prev/next (Pattern 6 — RESEARCH.md) :
 * - "Précédent" = œuvre publiée plus récemment (publishedAt > courant, ORDER BY ASC)
 * - "Suivant" = œuvre publiée moins récemment (publishedAt < courant, ORDER BY DESC)
 */
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { db } from '@/db'
import { gt, lt, asc, desc, and, eq } from 'drizzle-orm'
import { artworks } from '@/db/schema'
import { getStorage } from '@/lib/storage'
import { ArtworkInfoPanel } from '@/components/artwork/ArtworkInfoPanel'
import { SiteNav } from '@/components/layout/SiteNav'
import { BackgroundDecor } from '@/components/layout/BackgroundDecor'

/** Type des props d'une page dynamique Next.js 15 (params est une Promise) */
type Props = { params: Promise<{ id: string }> }

/**
 * Génère les métadonnées Open Graph pour le partage social (WhatsApp, Instagram, Facebook).
 *
 * IMPORTANT : Next.js appelle generateMetadata() SÉPARÉMENT de la page.
 * Il faut donc ré-interroger la DB ici — on ne peut pas partager l'état avec le rendu.
 *
 * metadataBase est défini dans layout.tsx → les URLs relatives sont automatiquement
 * converties en absolues (obligatoire pour og:image).
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const artworkId = parseInt(id, 10)

  // ID non numérique (ex: "abc", "../../etc") → métadonnées 404 sans requête DB
  if (isNaN(artworkId)) return { title: '404 — Galerie POF' }

  const artwork = await db.query.artworks.findFirst({
    where: (a, { and, eq }) => and(
      eq(a.id, artworkId),
      // SÉCURITÉ : ne jamais exposer les métadonnées d'une œuvre non publiée via og:image
      eq(a.pipelineState, 'published')
    ),
    with: { type: true, medium: true },
  })

  if (!artwork) return { title: '404 — Galerie POF' }

  const storage = getStorage()
  const imageUrl = artwork.processedPath ? storage.getUrl(artwork.processedPath) : undefined

  // Description : texte de l'œuvre (tronqué) ou fallback type · médium · dimensions
  const description =
    artwork.description?.slice(0, 160) ??
    `${artwork.type?.name ?? ''} · ${artwork.medium?.name ?? ''} · ${artwork.widthCm ?? '?'}×${artwork.heightCm ?? '?'} cm`

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

export default async function ArtworkDetailPage({ params }: Props) {
  const { id } = await params

  // Validation de l'ID — retourne 404 si non numérique (protection T-03-06)
  // parseInt('abc') = NaN, parseInt('../../etc') = NaN → notFound() immédiat
  const artworkId = parseInt(id, 10)
  if (isNaN(artworkId)) notFound()

  // Charger l'œuvre avec ses relations type et médium
  const artwork = await db.query.artworks.findFirst({
    where: (a, { and, eq }) => and(
      eq(a.id, artworkId),
      // SÉCURITÉ CRITIQUE : filtre pipelineState = 'published' (mitigation T-03-07)
      // Une œuvre pending/processing/awaiting_validation/failed → notFound()
      eq(a.pipelineState, 'published')
    ),
    with: { type: true, medium: true },
  })

  // 404 si l'œuvre n'existe pas OU n'est pas publiée
  if (!artwork) notFound()

  // Résoudre l'URL de l'image côté serveur
  // POURQUOI côté serveur uniquement ?
  // getStorage() utilise node:fs (LocalStorageAdapter) — incompatible avec le bundle navigateur
  // (Piège 5 RESEARCH.md). L'URL résolue est passée en props au rendu client.
  const storage = getStorage()
  const processedUrl = artwork.processedPath ? storage.getUrl(artwork.processedPath) : null

  // ── Navigation précédent/suivant ──────────────────────────────────────────
  // Ordre galerie : published_at DESC (plus récent en premier)
  // "Précédent" (affiché ←) = publié plus récemment (publishedAt > courant)
  // "Suivant" (affiché →) = publié moins récemment (publishedAt < courant)
  // Pattern 6 RESEARCH.md : deux requêtes séparées (Drizzle ne supporte pas les sous-requêtes)

  const prevArtwork = artwork.publishedAt
    ? await db.query.artworks.findFirst({
        where: and(
          eq(artworks.pipelineState, 'published'),
          gt(artworks.publishedAt, artwork.publishedAt)
        ),
        orderBy: [asc(artworks.publishedAt)], // ASC = on prend le plus proche (le plus récent juste avant)
        columns: { id: true, title: true },
      })
    : null

  const nextArtwork = artwork.publishedAt
    ? await db.query.artworks.findFirst({
        where: and(
          eq(artworks.pipelineState, 'published'),
          lt(artworks.publishedAt, artwork.publishedAt)
        ),
        orderBy: [desc(artworks.publishedAt)], // DESC = on prend le plus proche (le plus ancien juste après)
        columns: { id: true, title: true },
      })
    : null

  // srcset pour l'image principale — 3 tailles déclarées (D-14 UI-SPEC)
  // En Phase 3, même URL pour toutes les tailles (les variantes seront générées en Phase 6)
  const srcset = processedUrl
    ? `${processedUrl} 640w, ${processedUrl} 1024w, ${processedUrl} 1440w`
    : undefined

  return (
    <>
      {/* Fond décoratif SVG (D-04 — position fixed, z-index 0, pointer-events none) */}
      <BackgroundDecor />

      {/* Navigation globale sticky (56px hauteur, z-index au-dessus du fond décoratif) */}
      <SiteNav />

      <main
        style={{
          position: 'relative',
          zIndex: 1, // Au-dessus du BackgroundDecor (z-index 0)
          minHeight: 'calc(100vh - 56px)', // 56px = hauteur SiteNav
        }}
      >
        {/*
         * CSS responsive via tag <style> inline.
         * POURQUOI <style> inline et pas Tailwind ?
         * La valeur "420px" n'est pas dans l'échelle Tailwind standard.
         * Les breakpoints responsive sur grid-template-columns nécessitent
         * des media queries que Tailwind ne peut pas générer sans config.
         */}
        <style>{`
          .detail-grid {
            display: grid;
            grid-template-columns: 1fr 420px;
            min-height: calc(100vh - 56px);
          }
          @media (max-width: 1023px) {
            .detail-grid {
              grid-template-columns: 1fr;
            }
          }
        `}</style>

        <div className="detail-grid">
          {/* ── Colonne gauche : image (D-14) ──────────────────────────────── */}
          <div
            style={{
              backgroundColor: 'var(--color-bg)',
              padding: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {processedUrl ? (
              <img
                src={processedUrl}
                srcSet={srcset}
                sizes="(max-width: 1023px) 100vw, calc(100vw - 420px)"
                alt={artwork.title}
                loading="eager" // Page dédiée — priorité haute (D-14 UI-SPEC)
                style={{
                  maxWidth: '100%',
                  maxHeight: 'calc(100vh - 120px)', // Évite que l'image déborde la fenêtre
                  objectFit: 'contain', // D-15 : ne JAMAIS recadrer une œuvre d'art
                  boxShadow: '0 2px 16px rgba(26,26,26,0.12)', // Ombre portée D-14
                  display: 'block',
                }}
              />
            ) : (
              /* Placeholder si l'image n'est pas encore disponible */
              <div
                style={{
                  width: '400px',
                  height: '500px',
                  backgroundColor: 'var(--color-surface)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  // D-03 : pas de border-radius
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--font-space-mono)',
                    fontSize: '11px',
                    color: 'var(--color-ink-muted)',
                  }}
                >
                  Image à venir
                </span>
              </div>
            )}
          </div>

          {/* ── Colonne droite : panel info (D-14) ─────────────────────────── */}
          <div
            style={{
              backgroundColor: 'var(--color-surface)', // #ede0b8 — fond panel info
              padding: '24px',
              overflowY: 'auto',     // Scroll si le contenu dépasse la hauteur fenêtre
              maxHeight: '100vh',    // Panel ne dépasse pas la fenêtre (D-14)
              position: 'sticky',    // Panel reste visible pendant le scroll de l'image
              top: 0,
            }}
          >
            <ArtworkInfoPanel
              title={artwork.title}
              status={artwork.status}
              createdDate={artwork.createdDate}
              widthCm={artwork.widthCm}
              heightCm={artwork.heightCm}
              description={artwork.description}
              typeName={artwork.type?.name ?? null}
              mediumName={artwork.medium?.name ?? null}
              basePrice={artwork.basePrice}
              prev={prevArtwork ?? null}
              next={nextArtwork ?? null}
            />
          </div>
        </div>
      </main>
    </>
  )
}
