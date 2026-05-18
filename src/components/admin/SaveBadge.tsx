'use client'

/**
 * SaveBadge — Indicateur d'état de sauvegarde dans le page hero.
 *
 * États possibles :
 * - editing     → "● Modifications non enregistrées" (orange)
 * - saving      → "Enregistrement…" (gris)
 * - saved       → pill verte "Enregistré"
 * - publishing  → "Publication…" (gris)
 * - published   → pill verte "Publiée"
 */

export type SaveStatus = 'editing' | 'saving' | 'saved' | 'publishing' | 'published'

interface SaveBadgeProps {
  status: SaveStatus
}

export function SaveBadge({ status }: SaveBadgeProps) {
  if (status === 'saving' || status === 'publishing') {
    return (
      <span className="eyebrow" style={{ color: 'var(--color-admin-mute-3)' }}>
        {status === 'saving' ? 'Enregistrement…' : 'Publication…'}
      </span>
    )
  }
  if (status === 'editing') {
    return (
      <span className="eyebrow" style={{ color: 'var(--badge-validate-fg)' }}>
        ● Modifications non enregistrées
      </span>
    )
  }
  return (
    <span className="saved-pill">
      {status === 'published' ? 'Publiée' : 'Enregistré'}
    </span>
  )
}
