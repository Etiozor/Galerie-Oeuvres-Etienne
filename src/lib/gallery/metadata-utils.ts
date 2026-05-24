/**
 * Fonctions utilitaires pour la construction des métadonnées Open Graph
 * des pages détail d'œuvres.
 *
 * POURQUOI extraire hors du composant de page ?
 * Testabilité unitaire sans instancier Next.js ni accéder à la DB.
 * La fonction buildArtworkMetadata est purement fonctionnelle :
 * mêmes entrées → mêmes sorties, sans effet de bord.
 */
import type { Metadata } from 'next'

/**
 * Interface minimale représentant une œuvre pour la construction des métadonnées.
 * N'inclut que les champs strictement nécessaires aux balises Open Graph.
 */
interface ArtworkForMetadata {
  title: string
  description: string | null | undefined
  widthCm: string | null | undefined
  heightCm: string | null | undefined
  originalPath: string | null | undefined
  type: { name: string } | null
  medium: { name: string } | null
}

/**
 * Tronque une description à 160 caractères (limite recommandée pour og:description).
 *
 * POURQUOI 160 caractères ?
 * C'est la limite couramment citée pour les descriptions Open Graph.
 * Les crawlers sociaux (Facebook, Twitter, WhatsApp) tronquent au-delà.
 *
 * @param description - Texte à tronquer (null/undefined retourne undefined)
 * @returns Texte tronqué, ou undefined si la valeur est vide
 */
export function truncateDescription(
  description: string | null | undefined
): string | undefined {
  if (!description) return undefined
  return description.slice(0, 160)
}

/**
 * Construit l'objet Metadata Next.js pour une page détail d'œuvre.
 *
 * Utilisé dans generateMetadata() de src/app/artworks/[id]/page.tsx.
 * Extrait ici pour permettre les tests unitaires sans infrastructure Next.js.
 *
 * @param artwork      - Données de l'œuvre avec ses relations type et médium
 * @param imageBaseUrl - URL complète de l'image (retournée par storage.getUrl() côté serveur)
 *                       Transmise telle quelle dans og:images — doit être absolue en production
 *                       (Piège 1 RESEARCH.md : og:image doit être une URL absolue pour les crawlers)
 * @returns Objet Metadata Next.js avec title et openGraph
 */
export function buildArtworkMetadata(
  artwork: ArtworkForMetadata,
  imageBaseUrl: string
): Metadata {
  // Description : utilise la description de l'œuvre (tronquée à 160 chars)
  // ou génère un fallback formaté depuis le type, médium et dimensions
  const description =
    truncateDescription(artwork.description) ??
    `${artwork.type?.name ?? ''} · ${artwork.medium?.name ?? ''} · ${artwork.widthCm ?? '?'}×${artwork.heightCm ?? '?'} cm`

  // URL de l'image og:image — incluse seulement si originalPath est présent
  const imageUrl = artwork.originalPath ? imageBaseUrl : null

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
