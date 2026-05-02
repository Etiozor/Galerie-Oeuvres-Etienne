/**
 * Barre de filtres de la galerie — filtrage par type et médium.
 *
 * Positionée en sticky sous la navigation (top: 56px — hauteur exacte de SiteNav).
 * Chaque bouton toggle met à jour l'URL sans rechargement de page (D-13).
 *
 * ARCHITECTURE (D-12) :
 * - Les filtres s'appliquent sans round-trip réseau : GalleryClient
 *   refiltre le state local quand les params URL changent.
 * - FilterBar ne fait que lire/écrire les URL params — la logique
 *   de filtrage elle-même est dans GalleryClient + filter-utils.ts.
 *
 * PIÈGE 2 (RESEARCH.md) : Ce composant utilise useSearchParams.
 * Il doit être enveloppé dans <Suspense> dans son composant parent.
 * C'est déjà fait dans GalleryClient.tsx via page.tsx (Plan 01).
 *
 * DESIGN (UI-SPEC section 3 FilterBar) :
 * - Hauteur 44px (touch target minimum)
 * - État inactif : fond transparent, bordure 1px solid #5a5244, texte #5a5244
 * - État actif : fond #f4e285 (jaune), bordure 1px solid #1a1a1a, texte #1a1a1a
 * - Transition 0.15s entre les états
 * - D-03 : zéro coins arrondis — aucune propriété borderRadius dans ce fichier
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
 * Styles des boutons de filtre.
 *
 * Styles inline pour garantir la conformité exacte avec la UI-SPEC —
 * même décision que pour ArtworkStatusBadge (Phase 2 PipelineBadge).
 * Évite le risque de classes Tailwind purgées ou de conflits de spécificité.
 *
 * D-03 : aucune propriété borderRadius → angles droits par défaut du navigateur.
 */
function filterButtonStyle(isActive: boolean): React.CSSProperties {
  return {
    fontFamily: 'var(--font-space-mono)',
    fontSize: '11px',
    fontWeight: 400,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em',
    padding: '0 12px',
    height: '28px',
    border: isActive ? '1px solid #1a1a1a' : '1px solid #5a5244',
    // Fond jaune #f4e285 si actif (D-UI-SPEC section 3), transparent si inactif
    backgroundColor: isActive ? '#f4e285' : 'transparent',
    color: isActive ? '#1a1a1a' : '#5a5244',
    cursor: 'pointer',
    flexShrink: 0,
    // Transition douce entre les états actif/inactif (0.15s — UI-SPEC)
    transition: 'background-color 0.15s, border-color 0.15s, color 0.15s',
    // D-03 : pas de borderRadius → angles droits
  }
}

/**
 * Barre de filtres sticky avec boutons toggle type + médium.
 *
 * Les boutons fonctionnent en toggle : cliquer sur un filtre actif le désactive
 * (onTypeChange('') ou onMediumChange('')).
 * Les callbacks de changement sont fournis par GalleryClient qui gère la mise
 * à jour de l'URL via router.replace({ scroll: false }).
 */
export function FilterBar({
  types,
  mediums,
  activeTypeId,
  activeMediumId,
  onTypeChange,
  onMediumChange,
}: FilterBarProps) {
  return (
    <div
      style={{
        position: 'sticky',
        top: '56px',    // Hauteur exacte de SiteNav (UI-SPEC section 2)
        zIndex: 9,      // Sous SiteNav (z-index 10) mais au-dessus de la grille
        backgroundColor: 'var(--color-surface)', // #ede0b8 — fond surface
        height: '44px', // Touch target minimum (UI-SPEC)
        display: 'flex',
        alignItems: 'center',
        padding: '0 8px',
        gap: '6px',
        // Scroll horizontal sur mobile si trop de médiums — pas de wrap qui casserait la hauteur
        overflowX: 'auto',
        // Masquer la scrollbar sur mobile pour ne pas gêner visuellement
        scrollbarWidth: 'none' as const,
      }}
    >
      {/* Label "TYPE :" — repère visuel pour le groupe de filtres type */}
      <span
        style={{
          fontFamily: 'var(--font-space-mono)',
          fontSize: '10px',
          color: 'var(--color-ink-muted)', // #5a5244
          letterSpacing: '0.05em',
          flexShrink: 0,
          marginRight: '2px',
        }}
      >
        TYPE :
      </span>

      {/* Boutons filtres par type (ex: Dessin, Peinture) */}
      {types.map((type) => {
        const isActive = activeTypeId === String(type.id)
        return (
          <button
            key={type.id}
            onClick={() => onTypeChange(isActive ? '' : String(type.id))}
            style={filterButtonStyle(isActive)}
            // aria-pressed indique l'état toggle aux lecteurs d'écran
            aria-pressed={isActive}
            aria-label={`Filtrer par type : ${type.name}`}
          >
            {type.name}
          </button>
        )
      })}

      {/* Séparateur vertical entre les deux groupes de filtres */}
      <span
        aria-hidden="true"
        style={{
          width: '1px',
          height: '20px',
          backgroundColor: 'var(--color-ink-muted)', // #5a5244
          opacity: 0.3,
          flexShrink: 0,
          margin: '0 6px',
        }}
      />

      {/* Label "MÉDIUM :" — repère visuel pour le groupe de filtres médium */}
      <span
        style={{
          fontFamily: 'var(--font-space-mono)',
          fontSize: '10px',
          color: 'var(--color-ink-muted)',
          letterSpacing: '0.05em',
          flexShrink: 0,
          marginRight: '2px',
        }}
      >
        MÉDIUM :
      </span>

      {/* Boutons filtres par médium (ex: Crayon, Encre, Acrylique, Huile) */}
      {mediums.map((medium) => {
        const isActive = activeMediumId === String(medium.id)
        return (
          <button
            key={medium.id}
            onClick={() => onMediumChange(isActive ? '' : String(medium.id))}
            style={filterButtonStyle(isActive)}
            aria-pressed={isActive}
            aria-label={`Filtrer par médium : ${medium.name}`}
          >
            {medium.name}
          </button>
        )
      })}
    </div>
  )
}
