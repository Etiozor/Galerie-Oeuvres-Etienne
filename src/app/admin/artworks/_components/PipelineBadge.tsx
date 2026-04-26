/**
 * Badge d'état pipeline — affiche l'état courant d'une œuvre dans la liste admin.
 *
 * POURQUOI pas 'use client' ?
 * Ce composant est purement déclaratif — il reçoit un state et affiche un badge.
 * Pas besoin d'interactivité. Il peut être rendu côté serveur.
 *
 * Couleurs : EXACTEMENT celles définies dans 02-UI-SPEC.md (section "Palette sémantique
 * des badges pipeline"). Les couleurs spécifiques sont en inline style pour garantir
 * la conformité avec la spec UI — les classes Tailwind arbitraires pourraient
 * être purgées ou surchargées.
 */

// États possibles du pipeline (reflet du pipelineStateEnum en base)
type PipelineState = 'pending' | 'processing' | 'awaiting_validation' | 'published' | 'failed'

interface PipelineBadgeProps {
  state: PipelineState | string
}

// Configuration des badges — couleurs et libellés de UI-SPEC.md (section "Palette sémantique")
const BADGE_CONFIG: Record<PipelineState, { label: string; bg: string; color: string }> = {
  pending: {
    label: 'En attente',
    bg: '#fafafa',
    color: '#737373',
  },
  processing: {
    label: 'En traitement',
    bg: '#eff6ff',
    color: '#1d4ed8',
  },
  awaiting_validation: {
    label: 'À valider',
    bg: '#fefce8',
    color: '#a16207',
  },
  published: {
    label: 'Publiée',
    bg: '#f0fdf4',
    color: '#15803d',
  },
  failed: {
    label: 'Échec',
    bg: '#fef2f2',
    color: '#dc2626',
  },
}

/**
 * Affiche un badge coloré représentant l'état du pipeline d'une œuvre.
 *
 * @param state  État pipeline de l'œuvre (pipelineStateEnum)
 */
export function PipelineBadge({ state }: PipelineBadgeProps) {
  // Fallback pour un état inconnu (défense en profondeur)
  const config = BADGE_CONFIG[state as PipelineState] ?? {
    label: state,
    bg: '#fafafa',
    color: '#737373',
  }

  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: '4px',
        backgroundColor: config.bg,
        color: config.color,
        fontSize: '14px',
        fontWeight: 600,
        border: `1px solid ${config.color}22`, // bordure légère semi-transparente
        whiteSpace: 'nowrap',
      }}
    >
      {config.label}
    </span>
  )
}
