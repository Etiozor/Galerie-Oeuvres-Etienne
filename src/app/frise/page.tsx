/**
 * Page Frise — timeline chronologique des œuvres de la Galerie POF.
 *
 * Nouvelle destination du design « Shell » : les œuvres sont placées sur un axe
 * chronologique selon leur date de CRÉATION (createdYear / createdMonth), pas
 * leur date de publication. Le schéma porte déjà ces colonnes.
 *
 * Server Component : fetch Drizzle direct + résolution des URLs d'images côté
 * serveur (getStorage = node:fs, incompatible navigateur), puis passage à
 * TimelineClient qui gère le rendu de l'axe et le survol.
 *
 * SÉCURITÉ : isNotNull(publishedAt) — seules les œuvres publiées apparaissent.
 * On ne place que les œuvres ayant une année de création (sans année, pas de
 * position possible sur l'axe).
 */
import { db } from '@/db'
import { getStorage } from '@/lib/storage'
import { SiteNav } from '@/components/layout/SiteNav'
import { SiteFooter } from '@/components/layout/SiteFooter'
import { BackgroundDecor } from '@/components/layout/BackgroundDecor'
import { TimelineClient, type FriseItem } from '@/components/timeline/TimelineClient'

export const dynamic = 'force-dynamic'

export default async function FrisePage() {
  // Œuvres publiées, avec type et médiums (même garde que la galerie).
  const publishedArtworks = await db.query.artworks.findMany({
    where: (artworks, { isNotNull }) => isNotNull(artworks.publishedAt),
    with: {
      type: true,
      artworkMediums: { with: { medium: true } },
    },
  })

  const storage = getStorage()

  // Ne garder que les œuvres datées (année obligatoire pour un placement sur l'axe).
  const items: FriseItem[] = publishedArtworks
    .filter((a) => a.createdYear != null)
    .map((a) => ({
      id: a.id,
      title: a.title,
      status: a.status,
      year: a.createdYear as number,
      // Mois par défaut = 1 (janvier) si l'artiste n'a saisi que l'année.
      month: a.createdMonth ?? 1,
      mediumName: a.artworkMediums.map((am) => am.medium.name).join(', ') || null,
      widthCmNum: a.widthCm ? parseFloat(a.widthCm) || 1 : 1,
      heightCmNum: a.heightCm ? parseFloat(a.heightCm) || 1 : 1,
      imageUrl: a.originalPath ? storage.getUrl(a.originalPath) : null,
    }))

  return (
    <>
      <BackgroundDecor />
      <SiteNav />

      <main style={{ position: 'relative', zIndex: 1, padding: '20px 24px 0' }}>
        <TimelineClient items={items} />
      </main>

      <SiteFooter />
    </>
  )
}
