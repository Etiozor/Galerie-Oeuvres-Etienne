/**
 * Page d'accueil — Galerie publique de la Galerie POF.
 *
 * Server Component pur : fetch Drizzle direct, pas de useEffect, SEO natif.
 * Aucune authentification requise — la galerie est entièrement publique.
 *
 * ARCHITECTURE :
 * - Ce composant charge TOUTES les œuvres publiées en une seule requête
 *   (stratégie validée pour une collection < 500 œuvres — hypothèse A1 RESEARCH.md)
 * - Il résout les URLs d'images CÔTÉ SERVEUR (jamais côté client — Piège 5 RESEARCH.md)
 * - Il passe les données au Client Component GalleryClient pour le filtrage et le scroll
 *
 * SÉCURITÉ (T-03-01) :
 * Le filtre pipelineState = 'published' est OBLIGATOIRE.
 * Une œuvre en pending/processing/awaiting_validation/failed ne doit JAMAIS
 * apparaître dans la galerie publique.
 *
 * PIÈGE 2 (03-RESEARCH.md) :
 * GalleryClient utilise useSearchParams → il DOIT être enveloppé dans <Suspense>.
 * Sans cela, `next build` échoue avec "Missing Suspense boundary".
 */
import { Suspense } from 'react'
import { db } from '@/db'
import { artworkTypes, mediums } from '@/db/schema'
import { getStorage } from '@/lib/storage'
import { GalleryClient } from '@/components/gallery/GalleryClient'
import { SiteNav } from '@/components/layout/SiteNav'
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

export default async function GalleryPage() {
  /*
   * Charger toutes les œuvres publiées avec leurs relations type et médium.
   *
   * ORDER BY published_at DESC → la plus récente publiée en premier.
   * with: { type, medium } → jointure automatique Drizzle (une seule requête SQL).
   *
   * SÉCURITÉ : eq(artworks.pipelineState, 'published') est le garde obligatoire.
   * Sans ce filtre, des œuvres en cours de traitement seraient visibles.
   */
  const publishedArtworks = await db.query.artworks.findMany({
    where: (artworks, { eq }) => eq(artworks.pipelineState, 'published'),
    with: {
      type: true,
      medium: true,
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
    mediumId: a.mediumId,
    // parseFloat car Drizzle retourne numeric comme string
    widthCmNum: a.widthCm ? parseFloat(a.widthCm) || 1 : 1,
    heightCmNum: a.heightCm ? parseFloat(a.heightCm) || 1 : 1,
    // Thumbnail pour la grille (400px), null si pas encore traité
    thumbnailUrl: a.thumbnailPath ? storage.getUrl(a.thumbnailPath) : null,
    // Processed pour la page détail, null si pas encore traité
    processedUrl: a.processedPath ? storage.getUrl(a.processedPath) : null,
    // Recherche texte : on passe un extrait de description (500 chars max)
    // pour limiter le poids des props tout en permettant la recherche côté client
    descriptionSnippet: a.description ? a.description.slice(0, 500) : null,
    // Tri par date de création : timestamp numérique pour comparaison côté client
    // createdDate est un timestamp PostgreSQL → Date JS → .getTime() → number
    createdTimestamp: a.createdDate ? a.createdDate.getTime() : 0,
  }))

  // Options de filtre : types et médiums triés par sortOrder
  const types = await db.select().from(artworkTypes).orderBy(artworkTypes.sortOrder)
  const allMediums = await db.select().from(mediums).orderBy(mediums.sortOrder)

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
          />
        </Suspense>
      </main>
    </>
  )
}
