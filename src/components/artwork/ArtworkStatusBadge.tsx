/**
 * Badges de statut "funky" pour les œuvres.
 *
 * Ces badges remplacent les pills arrondis standards par des rendus
 * visuellement distinctifs selon le statut (décision D-10).
 *
 * POURQUOI des styles inline ?
 * Les styles inline garantissent la conformité exacte avec la spec UI-SPEC section 6.
 * Tailwind pourrait purger des classes arbitraires ou la cascade les écraser.
 *
 * POURQUOI pas de coins arrondis ?
 * D-03 (verrouillé) : zéro coins arrondis sur tous les éléments.
 *
 * Statuts définis par l'enum PostgreSQL artwork_status (schema.ts) :
 * - available : petit carré teal + texte "dispo" — discret, positif
 * - sold : fond rouge, texte "VENDU", rotation -4deg (effet stamp tampon)
 * - reserved : bordure orange, texte "RÉSERVÉ" — en attente, provisoire
 * - given : texte vert barré — l'œuvre est partie mais sans transaction
 */
import React from 'react'

type ArtworkStatus = 'available' | 'sold' | 'given' | 'reserved'

// Configuration des styles par statut — indices visuels immédiats (D-10)
const STATUS_CONFIG: Record<
  ArtworkStatus,
  { label: string; style: React.CSSProperties; dotStyle?: React.CSSProperties }
> = {
  available: {
    label: 'dispo',
    // Carré teal 6×6px + texte monospace minuscule — discret mais identifiable
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      fontFamily: 'var(--font-space-mono)',
      fontSize: '9px',
      letterSpacing: '0.05em',
      color: 'var(--color-teal)',
      // lowercase car la spec UI dit "dispo" (pas DISPO) pour ce statut
      textTransform: 'lowercase',
    },
    dotStyle: {
      // Carré teal collé à gauche du texte (UI-SPEC section 6 : "6×6px collé en haut à gauche")
      width: '6px',
      height: '6px',
      backgroundColor: 'var(--color-teal)',
      flexShrink: 0,
    },
  },
  sold: {
    label: 'VENDU',
    // Stamp rouge incliné — "tamponné" sur l'info strip (UI-SPEC : rotate(-4deg))
    style: {
      display: 'inline-block',
      fontFamily: 'var(--font-space-mono)',
      fontSize: '9px',
      fontWeight: 700,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      color: '#f2e8cf',                    // texte sur fond rouge
      backgroundColor: 'var(--color-red)', // #bc4b51
      padding: '2px 5px',
      transform: 'rotate(-4deg)',          // effet tampon diagonal
      // D-03 : pas de border-radius
    },
  },
  reserved: {
    label: 'RÉSERVÉ',
    // Encadré orange — en attente, pas encore conclu
    style: {
      display: 'inline-block',
      fontFamily: 'var(--font-space-mono)',
      fontSize: '9px',
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      color: 'var(--color-orange)',
      border: '2px solid var(--color-orange)',
      padding: '1px 5px',
      // D-03 : pas de border-radius
    },
  },
  given: {
    label: 'DONNÉ',
    // Texte vert barré — l'œuvre n'est plus disponible mais n'a pas été vendue
    style: {
      display: 'inline-block',
      fontFamily: 'var(--font-space-mono)',
      fontSize: '9px',
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      color: 'var(--color-green)',
      textDecoration: 'line-through',
    },
  },
}

interface ArtworkStatusBadgeProps {
  /** Statut de l'œuvre depuis la DB (artwork_status enum) */
  status: ArtworkStatus | string
}

/**
 * Affiche le badge de statut "funky" d'une œuvre.
 * Chaque statut a un rendu visuel distinct (stamp, encadré, barré, puce).
 * Utilisé dans la grille masonry ET sur la page détail.
 */
export function ArtworkStatusBadge({ status }: ArtworkStatusBadgeProps) {
  const config = STATUS_CONFIG[status as ArtworkStatus]

  // Statut inconnu (futur statut non prévu en Phase 3) : affichage neutre
  if (!config) {
    return (
      <span
        style={{
          fontFamily: 'var(--font-space-mono)',
          fontSize: '9px',
          color: 'var(--color-ink-muted)',
        }}
      >
        {status}
      </span>
    )
  }

  // "available" a un carré puce coloré en plus du texte (UI-SPEC : "carré teal 6×6px")
  if (status === 'available' && config.dotStyle) {
    return (
      <span style={config.style}>
        <span style={config.dotStyle} />
        {config.label}
      </span>
    )
  }

  return <span style={config.style}>{config.label}</span>
}
