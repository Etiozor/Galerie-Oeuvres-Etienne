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
  /** Texte de recherche (titre + description) */
  searchQuery: string
  onSearchChange: (q: string) => void
  /** Tri par date de création de l'œuvre */
  sortOrder: 'date-desc' | 'date-asc'
  onSortChange: (order: 'date-desc' | 'date-asc') => void
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
  searchQuery,
  onSearchChange,
  sortOrder,
  onSortChange,
}: FilterBarProps) {
  return (
    /*
     * Barre en 2 lignes :
     * - Ligne 1 (44px) : champ de recherche + boutons tri
     * - Ligne 2 (44px) : filtres type + médium avec scroll horizontal
     * Total : 88px. Sticky sous SiteNav (top: 56px, z-index: 9).
     */
    <div
      style={{
        position: 'sticky',
        top: '56px',
        zIndex: 9,
        backgroundColor: 'var(--color-surface)',
      }}
    >

      {/* ── Ligne 1 : Recherche + Tri ──────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '0 8px',
          height: '44px',
          borderBottom: '1px solid rgba(90,82,68,0.15)',
        }}
      >
        {/* Champ de recherche : filtre titre + description */}
        <input
          type="search"
          placeholder="Rechercher une œuvre…"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          aria-label="Rechercher une œuvre par titre ou description"
          style={{
            flex: 1,
            fontFamily: 'var(--font-space-mono)',
            fontSize: '11px',
            color: 'var(--color-ink)',
            backgroundColor: 'transparent',
            border: '1px solid rgba(90,82,68,0.4)',
            padding: '0 10px',
            height: '28px',
            outline: 'none',
            // D-03 : pas de border-radius
          }}
        />

        {/* Boutons tri — toggle pair (un seul actif à la fois) */}
        <button
          onClick={() => onSortChange('date-desc')}
          aria-pressed={sortOrder === 'date-desc'}
          aria-label="Trier par date de création décroissante"
          style={filterButtonStyle(sortOrder === 'date-desc')}
          title="Plus récentes en premier"
        >
          ↓ Date
        </button>
        <button
          onClick={() => onSortChange('date-asc')}
          aria-pressed={sortOrder === 'date-asc'}
          aria-label="Trier par date de création croissante"
          style={filterButtonStyle(sortOrder === 'date-asc')}
          title="Plus anciennes en premier"
        >
          ↑ Date
        </button>
      </div>

      {/* ── Ligne 2 : Filtres type + médium ───────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '0 8px',
          gap: '6px',
          height: '44px',
          overflowX: 'auto',
          scrollbarWidth: 'none' as const,
        }}
      >
        {/* Label "TYPE :" */}
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
          TYPE :
        </span>

        {/* Boutons filtres par type */}
        {types.map((type) => {
          const isActive = activeTypeId === String(type.id)
          return (
            <button
              key={type.id}
              onClick={() => onTypeChange(isActive ? '' : String(type.id))}
              style={filterButtonStyle(isActive)}
              aria-pressed={isActive}
              aria-label={`Filtrer par type : ${type.name}`}
            >
              {type.name}
            </button>
          )
        })}

        {/* Séparateur vertical */}
        <span
          aria-hidden="true"
          style={{
            width: '1px',
            height: '20px',
            backgroundColor: 'var(--color-ink-muted)',
            opacity: 0.3,
            flexShrink: 0,
            margin: '0 6px',
          }}
        />

        {/* Label "MÉDIUM :" */}
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

        {/* Boutons filtres par médium */}
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
    </div>
  )
}
