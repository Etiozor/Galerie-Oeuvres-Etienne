/**
 * Barre de filtres par type et médium (placeholder Plan 01).
 *
 * Ce fichier est créé en Plan 01 uniquement pour que GalleryClient compile
 * sans erreur d'import manquant. Le Plan 02 remplacera ce contenu par
 * l'implémentation complète avec les boutons toggle, état actif jaune,
 * et persistance URL (D-12, D-13).
 *
 * Interface publique (ne pas modifier sans mettre à jour GalleryClient) :
 * - types, mediums : options de filtre chargées depuis la DB
 * - activeTypeId, activeMediumId : valeurs sélectionnées (ID en string)
 * - onTypeChange, onMediumChange : callbacks de sélection
 */
'use client'
import type { ArtworkType, Medium } from '@/db/schema'

interface FilterBarProps {
  types: ArtworkType[]
  mediums: Medium[]
  activeTypeId: string
  activeMediumId: string
  onTypeChange: (id: string) => void
  onMediumChange: (id: string) => void
}

/**
 * Placeholder — l'implémentation complète est en Plan 02.
 * Affiche une barre vide avec un label pour indiquer l'état placeholder.
 */
export function FilterBar({
  types: _types,
  mediums: _mediums,
  activeTypeId: _activeTypeId,
  activeMediumId: _activeMediumId,
  onTypeChange: _onTypeChange,
  onMediumChange: _onMediumChange,
}: FilterBarProps) {
  return (
    <div
      style={{
        height: '44px',
        backgroundColor: 'var(--color-surface)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        gap: '8px',
        // sticky top-56px (sous la nav de 56px) sera ajouté en Plan 02
      }}
    >
      {/* Plan 02 implémentera les boutons toggle ici */}
      <span
        style={{
          fontFamily: 'var(--font-space-mono)',
          fontSize: '10px',
          color: 'var(--color-ink-muted)',
        }}
      >
        Filtres — Plan 02
      </span>
    </div>
  )
}
