/**
 * Navigation précédent/suivant entre les œuvres publiées.
 *
 * Affiché en bas du panel info sur la page détail (/artworks/[id]).
 * L'ordre est chronologique inversé par published_at DESC :
 * - "Précédente" = l'œuvre publiée plus récemment (à gauche, ←)
 * - "Suivante" = l'œuvre publiée moins récemment (à droite, →)
 *
 * POURQUOI des flèches Unicode et pas lucide-react ?
 * D-17 (verrouillé) : ← → Unicode sont plus sobres que les icônes
 * SVG qui tendent à être trop "rondes" pour ce design.
 *
 * Composant Server (pas de 'use client') — liens statiques, aucun état côté client.
 */
import Link from 'next/link'

/** Données minimales pour un lien de navigation */
interface ArtworkNavItem {
  id: number
  title: string
}

interface ArtworkNavProps {
  /** Œuvre plus récente (publiée après) — affiché à gauche avec ← */
  prev: ArtworkNavItem | null
  /** Œuvre plus ancienne (publiée avant) — affiché à droite avec → */
  next: ArtworkNavItem | null
}

/**
 * Affiche les liens de navigation vers l'œuvre précédente et suivante.
 *
 * Les slots sans destination affichent un <span> vide pour maintenir
 * le justifyContent: 'space-between' même si un seul lien est présent.
 */
export function ArtworkNav({ prev, next }: ArtworkNavProps) {
  return (
    <nav
      aria-label="Navigation entre œuvres"
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: '32px',
        paddingTop: '16px',
        // Séparateur visuel discret au-dessus de la navigation (--color-ink-muted opacity 0.3)
        borderTop: '1px solid rgba(90,82,68,0.3)',
      }}
    >
      {/* Précédente = plus récente (publiée APRÈS l'œuvre courante dans le temps réel) */}
      {prev ? (
        <Link
          href={`/artworks/${prev.id}`}
          style={{
            fontFamily: 'var(--font-space-mono)',
            fontSize: '11px',
            color: 'var(--color-ink-muted)',
            textDecoration: 'none',
            // Limiter la largeur pour éviter le débordement sur les titres longs
            maxWidth: '45%',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          title={`Œuvre précédente : ${prev.title}`}
        >
          ← {prev.title}
        </Link>
      ) : (
        <span /> // Espace réservé pour maintenir l'alignement
      )}

      {/* Suivante = plus ancienne (publiée AVANT l'œuvre courante dans le temps réel) */}
      {next ? (
        <Link
          href={`/artworks/${next.id}`}
          style={{
            fontFamily: 'var(--font-space-mono)',
            fontSize: '11px',
            color: 'var(--color-ink-muted)',
            textDecoration: 'none',
            maxWidth: '45%',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            textAlign: 'right',
          }}
          title={`Œuvre suivante : ${next.title}`}
        >
          {next.title} →
        </Link>
      ) : (
        <span /> // Espace réservé pour maintenir l'alignement
      )}
    </nav>
  )
}
