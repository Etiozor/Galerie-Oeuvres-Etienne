/**
 * Page d'accueil — Galerie publique de la Galerie POF.
 *
 * Server Component pur : fetch Drizzle direct, pas de useEffect, SEO natif.
 * Aucune authentification requise — la galerie est entièrement publique.
 *
 * ARCHITECTURE :
 * - Ce composant charge TOUTES les œuvres publiées en une seule requête
 *   (stratégie validée pour une collection < 500 œuvres)
 * - Il résout les URLs d'images CÔTÉ SERVEUR (jamais côté client)
 * - Il passe les données au Client Component GalleryClient pour le filtrage et le scroll
 *
 * SÉCURITÉ :
 * Le filtre publishedAt IS NOT NULL est obligatoire.
 * Une œuvre sans publishedAt (brouillon) ne doit jamais apparaître dans la galerie publique.
 *
 * GalleryClient utilise useSearchParams → il DOIT être enveloppé dans <Suspense>.
 * Sans cela, `next build` échoue avec "Missing Suspense boundary".
 */
import { Suspense } from 'react'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { artworkTypes, mediums, savedArtworks } from '@/db/schema'

import { getStorage } from '@/lib/storage'
import { getVisitorSession } from '@/lib/session'
import { GalleryClient } from '@/components/gallery/GalleryClient'
import { SiteNav } from '@/components/layout/SiteNav'
import { SiteFooter } from '@/components/layout/SiteFooter'
import { BackgroundDecor } from '@/components/layout/BackgroundDecor'

/**
 * Skeleton affiché pendant que GalleryClient se charge.
 * Requis par Next.js 15 : useSearchParams dans GalleryClient nécessite
 * un <Suspense> dans le Server Component parent.
 */
function GalleryLoadingSkeleton() {
  return (
    <div style={{ padding: '32px 24px', textAlign: 'center' }}>
      <span
        style={{
          fontFamily: 'var(--font-space-mono)',
          fontSize: '11px',
          color: 'var(--color-ink-muted)',
        }}
      >
        Chargement…
      </span>
    </div>
  )
}

export const dynamic = 'force-dynamic'

export default async function GalleryPage() {
  /*
   * Charger toutes les œuvres publiées avec leurs relations type et médium.
   *
   * ORDER BY published_at DESC → la plus récente publiée en premier.
   * with: { type, medium } → jointure automatique Drizzle (une seule requête SQL).
   *
   * SÉCURITÉ : isNotNull(publishedAt) est le garde obligatoire.
   * Une œuvre sans publishedAt (brouillon) ne doit jamais apparaître en galerie.
   */
  const publishedArtworks = await db.query.artworks.findMany({
    where: (artworks, { isNotNull }) => isNotNull(artworks.publishedAt),
    with: {
      type: true,
      artworkMediums: { with: { medium: true } },
    },
    orderBy: (artworks, { desc }) => [desc(artworks.publishedAt)],
  })

  /*
   * Résoudre les URLs d'images CÔTÉ SERVEUR.
   *
   * POURQUOI ici et pas dans GalleryClient ?
   * getStorage() importe node:fs — incompatible avec le bundle navigateur.
   * Les URLs sont construites une fois ici et passées en props simples (strings).
   *
   * Conversion numeric Drizzle → number (Piège 4 RESEARCH.md) :
   * widthCm et heightCm sont retournés comme strings par node-postgres.
   * parseFloat() + || 1 assure une valeur valide pour l'aspect-ratio CSS.
   */
  const storage = getStorage()
  const artworksWithUrls = publishedArtworks.map((a) => ({
    id: a.id,
    title: a.title,
    status: a.status,
    typeId: a.typeId,
    mediumIds: a.artworkMediums.map(am => am.mediumId),
    typeName: a.type?.name ?? null,
    // Médiums joints en chaîne pour l'affichage (ex: "Aquarelle, Crayon de graphite")
    mediumName: a.artworkMediums.map(am => am.medium.name).join(', ') || null,
    // parseFloat car Drizzle retourne numeric comme string
    widthCmNum: a.widthCm ? parseFloat(a.widthCm) || 1 : 1,
    heightCmNum: a.heightCm ? parseFloat(a.heightCm) || 1 : 1,
    // Prix de base (numeric → number) pour l'overlay de la carte
    basePriceNum: a.basePrice ? parseFloat(a.basePrice) || 0 : 0,
    // Image originale pour la grille et la page détail
    thumbnailUrl: a.originalPath ? storage.getUrl(a.originalPath) : null,
    processedUrl: a.originalPath ? storage.getUrl(a.originalPath) : null,
    // Recherche texte : on passe un extrait de description (500 chars max)
    // pour limiter le poids des props tout en permettant la recherche côté client
    descriptionSnippet: a.description ? a.description.slice(0, 500) : null,
    // Tri par date de création : timestamp numérique pour comparaison côté client
    // Clé de tri : année * 100 + mois → ex. 202403 > 202312 (tri chronologique correct)
    createdTimestamp: a.createdYear ? a.createdYear * 100 + (a.createdMonth ?? 0) : 0,
  }))

  // Options de filtre : types et médiums triés par sortOrder
  const types = await db.select().from(artworkTypes).orderBy(artworkTypes.sortOrder)
  const allMediums = await db.select().from(mediums).orderBy(mediums.sortOrder)

  /*
   * Session visiteur + favoris — lus côté serveur pour initialiser l'état du cœur.
   * Si le visiteur n'est pas identifié, visitorId est undefined et savedArtworkIds est [].
   * L'état optimiste dans SaveButton prend le relais après l'hydratation.
   */
  const session = await getVisitorSession()
  const visitorId = session.visitorId

  let savedArtworkIds: number[] = []
  if (visitorId) {
    const rows = await db
      .select({ artworkId: savedArtworks.artworkId })
      .from(savedArtworks)
      .where(eq(savedArtworks.visitorId, visitorId))
    savedArtworkIds = rows.map(r => r.artworkId)
  }

  return (
    <>
      {/*
       * Fond SVG décoratif — position fixed, z-index 0, pointer-events none (D-04).
       * Rendu en dehors du main pour ne pas affecter le flux du document.
       */}
      <BackgroundDecor />

      {/* Navigation globale — sticky top-0, z-index 10 (au-dessus du fond) */}
      <SiteNav />

      {/*
       * Galerie principale — Suspense OBLIGATOIRE (Piège 2 RESEARCH.md).
       * GalleryClient utilise useSearchParams → Next.js 15 exige <Suspense>.
       */}
      <main style={{ position: 'relative', zIndex: 1 }}>
        <Suspense fallback={<GalleryLoadingSkeleton />}>
          <GalleryClient
            artworks={artworksWithUrls}
            types={types}
            mediums={allMediums}
            visitorId={visitorId}
            savedArtworkIds={savedArtworkIds}
          />
        </Suspense>
      </main>

      {/* Contact — visible en bas de toutes les pages publiques */}
      <SiteFooter />
    </>
  )
}
