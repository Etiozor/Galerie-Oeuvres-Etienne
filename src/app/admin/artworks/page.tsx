/**
 * Page Mes œuvres — /admin/artworks (07-02 Direction B).
 *
 * Server Component : charge les données depuis la DB avec jointures,
 * calcule les statistiques (comptes d'offres, favoris) et passe
 * tout au Client Component ArtworksClient.
 *
 * POURQUOI trois requêtes séparées et pas une seule avec agrégation ?
 * Drizzle ORM ne supporte pas nativement les GROUP BY avec COUNT dans
 * les jointures multiples. Trois requêtes ciblées puis fusion JS est
 * plus lisible et performant que du SQL complexe avec sous-requêtes.
 *
 * SÉCURITÉ : double vérification auth (middleware + page).
 */

import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { db } from '@/db'
import { artworks, artworkTypes, mediums, offers, visitors, savedArtworks } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'
import { getStorage } from '@/lib/storage'
import type { ArtworkRow, OfferDetail } from './_components/ArtworksClient'
import { ArtworksClient } from './_components/ArtworksClient'

export const dynamic = 'force-dynamic'

export default async function AdminArtworksPage() {
  // ── 1. Vérification de session ──
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/admin/login')

  // ── 2. Charger les œuvres avec noms de type et de médium ──
  // LEFT JOIN pour ne pas exclure les œuvres sans type/médium assigné
  const artworkRows = await db
    .select({
      id:           artworks.id,
      title:        artworks.title,
      status:       artworks.status,
      publishedAt:  artworks.publishedAt,
      originalPath: artworks.originalPath,
      widthCm:      artworks.widthCm,
      heightCm:     artworks.heightCm,
      basePrice:    artworks.basePrice,
      createdYear:  artworks.createdYear,
      createdMonth: artworks.createdMonth,
      createdAt:    artworks.createdAt,
      typeName:     artworkTypes.name,
      mediumName:   mediums.name,
    })
    .from(artworks)
    .leftJoin(artworkTypes, eq(artworks.typeId, artworkTypes.id))
    .leftJoin(mediums, eq(artworks.mediumId, mediums.id))
    .orderBy(desc(artworks.createdAt))

  // ── 3. Charger toutes les offres avec les infos visiteur ──
  // Trié par montant décroissant pour que la meilleure offre soit en tête dans le drawer
  const allOffers = await db
    .select({
      id:                   offers.id,
      artworkId:            offers.artworkId,
      amount:               offers.amount,
      message:              offers.message,
      createdAt:            offers.createdAt,
      visitorDisplayName:   visitors.displayName,
      visitorPhone:         visitors.phone,
      visitorEmail:         visitors.email,
    })
    .from(offers)
    .leftJoin(visitors, eq(offers.visitorId, visitors.id))
    .orderBy(desc(offers.amount))

  // ── 4. Charger les favoris pour calculer le compte par œuvre ──
  const savedRows = await db
    .select({ artworkId: savedArtworks.artworkId })
    .from(savedArtworks)

  // ── 5. Construire les maps d'agrégation ──

  // Regrouper les offres par artworkId
  const offersByArtworkId = new Map<number, typeof allOffers>()
  for (const o of allOffers) {
    const existing = offersByArtworkId.get(o.artworkId) ?? []
    existing.push(o)
    offersByArtworkId.set(o.artworkId, existing)
  }

  // Compter les favoris par artworkId
  const savedCountByArtworkId = new Map<number, number>()
  for (const s of savedRows) {
    savedCountByArtworkId.set(s.artworkId, (savedCountByArtworkId.get(s.artworkId) ?? 0) + 1)
  }

  // ── 6. Résoudre les URLs de stockage et assembler la structure finale ──
  const storage = getStorage()

  const data: ArtworkRow[] = artworkRows.map(a => {
    const artworkOffers = offersByArtworkId.get(a.id) ?? []

    // Calculer la meilleure offre (max) — null si aucune offre
    const topOffer = artworkOffers.length > 0
      ? Math.max(...artworkOffers.map(o => parseFloat(o.amount)))
      : null

    // Nettoyer les champs visiteur (nulls de LEFT JOIN — en pratique jamais null)
    const offerDetails: OfferDetail[] = artworkOffers.map(o => ({
      id:                   o.id,
      amount:               o.amount,
      message:              o.message,
      createdAt:            o.createdAt,
      visitorDisplayName:   o.visitorDisplayName ?? 'Visiteur inconnu',
      visitorPhone:         o.visitorPhone ?? '',
      visitorEmail:         o.visitorEmail ?? null,
    }))

    return {
      id:           a.id,
      title:        a.title,
      status:       a.status,
      publishedAt:  a.publishedAt,
      // Résoudre la clé de stockage en URL publique
      imageUrl:     a.originalPath ? storage.getUrl(a.originalPath) : null,
      widthCm:      a.widthCm,
      heightCm:     a.heightCm,
      basePrice:    a.basePrice,
      createdYear:  a.createdYear ?? null,
      createdMonth: a.createdMonth ?? null,
      createdAt:    a.createdAt,
      typeName:     a.typeName ?? null,
      mediumName:   a.mediumName ?? null,
      offerCount:   artworkOffers.length,
      topOffer,
      savedCount:   savedCountByArtworkId.get(a.id) ?? 0,
      offers:       offerDetails,
    }
  })

  return (
    <ArtworksClient
      artworks={data}
      userEmail={session.user.email ?? undefined}
    />
  )
}
