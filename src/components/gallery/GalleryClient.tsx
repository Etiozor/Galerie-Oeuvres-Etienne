/**
 * Composant client principal de la galerie.
 *
 * POURQUOI 'use client' ?
 * Ce composant utilise des hooks React qui ne fonctionnent que côté navigateur :
 * 1. useSearchParams — lire les filtres depuis l'URL (?type=...&medium=...)
 * 2. useRouter — mettre à jour l'URL sans rechargement de page
 * 3. useState — compteur d'œuvres visibles pour l'infinite scroll
 * 4. useEffect — réinitialiser le compteur à chaque changement de filtre
 *
 * ARCHITECTURE (Pattern 1 — 03-RESEARCH.md) :
 * Le Server Component parent (page.tsx) charge TOUTES les œuvres publiées
 * une seule fois, les passe en props ici. On filtre et on pagine côté client.
 * Viable pour une collection < 500 œuvres (hypothèse A1 RESEARCH.md).
 *
 * PIÈGE 2 (03-RESEARCH.md) : useSearchParams DOIT être dans un composant
 * enveloppé par <Suspense> dans le Server Component parent. Sinon `next build`
 * échoue avec "Missing Suspense boundary with useSearchParams".
 * → page.tsx enveloppe ce composant dans <Suspense fallback={...}>.
 */
'use client'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { MasonryGrid } from './MasonryGrid'
import { ArtworkCard } from './ArtworkCard'
import { ScrollSentinel } from './ScrollSentinel'
import { FilterBar } from './FilterBar'
import type { ArtworkType, Medium } from '@/db/schema'

// Nombre d'œuvres affichées par lot (D-08 : 6 au départ, 6 de plus)
const BATCH_SIZE = 6

/**
 * Artwork avec URLs pré-résolues côté serveur.
 * Les URLs ne sont jamais calculées côté client (Piège 5 : getStorage() = node:fs).
 */
interface ArtworkWithUrls {
  id: number
  title: string
  status: string
  thumbnailUrl: string | null
  processedUrl: string | null
  widthCmNum: number
  heightCmNum: number
  typeId: number | null
  mediumId: number | null
  /** Extrait de description (≤500 chars) pour la recherche texte côté client */
  descriptionSnippet: string | null
  /** Timestamp de création de l'œuvre — pour le tri par date côté client */
  createdTimestamp: number
}

interface GalleryClientProps {
  /** Toutes les œuvres publiées, triées par published_at DESC */
  artworks: ArtworkWithUrls[]
  /** Types d'œuvres disponibles pour les filtres */
  types: ArtworkType[]
  /** Médiums disponibles pour les filtres */
  mediums: Medium[]
}

export function GalleryClient({ artworks, types, mediums }: GalleryClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Lire les filtres depuis l'URL (persistance D-13)
  // Les valeurs sont des IDs de type et médium sous forme de string
  const activeTypeId = searchParams.get('type') ?? ''
  const activeMediumId = searchParams.get('medium') ?? ''

  // Recherche texte libre — filtre sur titre + description côté client
  const [searchQuery, setSearchQuery] = useState('')

  // Tri : 'date-desc' = plus récentes en premier (défaut), 'date-asc' = plus anciennes
  const [sortOrder, setSortOrder] = useState<'date-desc' | 'date-asc'>('date-desc')

  // Compteur d'œuvres visibles — démarre à BATCH_SIZE (D-08 : 6 au départ)
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE)

  /**
   * CRITIQUE — Piège 6 (03-RESEARCH.md) :
   * Réinitialiser le compteur à chaque changement de filtre ou de recherche.
   * Sans ce reset, on peut afficher 0 résultat si les N premiers items
   * ne correspondent pas au filtre actif.
   */
  useEffect(() => {
    setVisibleCount(BATCH_SIZE)
  }, [activeTypeId, activeMediumId, searchQuery, sortOrder])

  // Filtrage côté client — type, médium, recherche texte (titre + description)
  const filteredArtworks = artworks
    .filter((a) => {
      if (activeTypeId && String(a.typeId) !== activeTypeId) return false
      if (activeMediumId && String(a.mediumId) !== activeMediumId) return false
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        const inTitle = a.title.toLowerCase().includes(q)
        const inDesc = a.descriptionSnippet?.toLowerCase().includes(q) ?? false
        if (!inTitle && !inDesc) return false
      }
      return true
    })
    // Tri par date de création de l'œuvre
    .sort((a, b) =>
      sortOrder === 'date-asc'
        ? a.createdTimestamp - b.createdTimestamp
        : b.createdTimestamp - a.createdTimestamp
    )

  // Tranche visible — les N premières œuvres filtrées
  const visibleArtworks = filteredArtworks.slice(0, visibleCount)
  const hasMore = visibleCount < filteredArtworks.length

  /** Charge le lot suivant quand ScrollSentinel est atteint */
  function loadMore() {
    setVisibleCount((n) => Math.min(n + BATCH_SIZE, filteredArtworks.length))
  }

  /** Met à jour un filtre dans l'URL sans rechargement (D-13) */
  function setFilter(key: 'type' | 'medium', value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    // scroll: false → évite le saut en haut de page à chaque clic de filtre
    router.replace(`/?${params.toString()}`, { scroll: false })
  }

  return (
    <div style={{ position: 'relative', zIndex: 1 }}>
      {/* Barre de filtres — type, médium, recherche texte, tri */}
      <FilterBar
        types={types}
        mediums={mediums}
        activeTypeId={activeTypeId}
        activeMediumId={activeMediumId}
        onTypeChange={(id) => setFilter('type', id)}
        onMediumChange={(id) => setFilter('medium', id)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        sortOrder={sortOrder}
        onSortChange={setSortOrder}
      />

      {/* État vide — UI-SPEC section 12 */}
      {filteredArtworks.length === 0 && (
        <div style={{ textAlign: 'center', padding: '64px 24px' }}>
          <p
            style={{
              fontFamily: 'var(--font-oswald)',
              fontSize: '20px',
              fontWeight: 700,
              color: 'var(--color-ink)',
              marginBottom: '8px',
            }}
          >
            {activeTypeId || activeMediumId
              ? 'Aucun résultat pour ces filtres. Essayez une autre combinaison.'
              : "Aucune œuvre publiée pour l'instant."}
          </p>
          {!activeTypeId && !activeMediumId && (
            <p
              style={{
                fontFamily: 'var(--font-space-mono)',
                fontSize: '11px',
                color: 'var(--color-ink-muted)',
              }}
            >
              Revenez bientôt.
            </p>
          )}
        </div>
      )}

      {/* Grille masonry — rendue seulement s'il y a des œuvres à afficher */}
      {visibleArtworks.length > 0 && (
        <MasonryGrid>
          {visibleArtworks.map((artwork) => (
            <ArtworkCard key={artwork.id} {...artwork} />
          ))}
        </MasonryGrid>
      )}

      {/* Sentinel invisible — déclenche loadMore quand il entre dans le viewport */}
      <ScrollSentinel onIntersect={loadMore} hasMore={hasMore} />
    </div>
  )
}
