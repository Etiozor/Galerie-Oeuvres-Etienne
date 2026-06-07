/**
 * Barre de filtres de la galerie — chips "Tous" + types + médiums.
 *
 * Design révisé (Home.html) :
 * - Une seule ligne de chips (suppression recherche texte et tri)
 * - Chip actif = fond jaune (--color-yellow), pas de bordure visible
 * - Compteur par chip en tabular-nums
 * - Chips à 0 résultat = désactivés et atténués
 * - borderRadius: var(--radius-sm) — D-03 révisé (3px)
 *
 * Comportement responsive (08-02) :
 * - Desktop (>768px) : les chips peuvent passer à la ligne (flexWrap: wrap)
 * - Mobile (≤768px) : scroll horizontal sur une seule ligne, scrollbar masquée
 *   POURQUOI @media et pas style inline ?
 *   flexWrap et overflow-x doivent avoir des valeurs différentes desktop/mobile.
 *   CSS @media est la seule façon d'exprimer deux valeurs conditionnelles.
 *   [08-RESEARCH.md Pattern 2]
 */
'use client'
import type { ArtworkType, Medium } from '@/db/schema'

interface FilterBarProps {
  types: ArtworkType[]
  mediums: Medium[]
  /** "all" | "type:{id}" | "medium:{id}" */
  activeFilter: string
  onFilterChange: (filter: string) => void
  /** Comptage par chip id */
  counts: Record<string, number>
}

export function FilterBar({ types, mediums, activeFilter, onFilterChange, counts }: FilterBarProps) {
  const chips = [
    { id: 'all', label: 'Tous', count: counts['all'] ?? 0 },
    ...types.map((t) => ({ id: `type:${t.id}`, label: t.name, count: counts[`type:${t.id}`] ?? 0 })),
    ...mediums.map((m) => ({ id: `medium:${m.id}`, label: m.name, count: counts[`medium:${m.id}`] ?? 0 })),
  ]

  return (
    <>
      {/*
       * Règles CSS responsive du conteneur filterbar.
       * Sur mobile (≤768px) : flex-wrap: nowrap + overflow-x: auto → scroll horizontal.
       * Scrollbar masquée (cosmétique) via scrollbar-width: none et ::-webkit-scrollbar.
       * Sur desktop (>768px) : flex-wrap: wrap → les chips passent à la ligne normalement.
       */}
      <style>{`
        .filterbar-container {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          align-items: center;
        }
        @media (max-width: 768px) {
          .filterbar-container {
            flex-wrap: nowrap;
            overflow-x: auto;
            /* Défilement tactile fluide sur iOS */
            -webkit-overflow-scrolling: touch;
            /* Masquer la scrollbar horizontale — cosmétique uniquement */
            scrollbar-width: none;
          }
          .filterbar-container::-webkit-scrollbar {
            display: none;
          }
        }
      `}</style>
      <div className="filterbar-container">
        {chips.map((c) => {
        const isActive = activeFilter === c.id
        const isEmpty = c.count === 0 && !isActive
        return (
          <button
            key={c.id}
            onClick={() => {
              // Toggle : cliquer sur le chip actif remet "all"
              onFilterChange(isActive && c.id !== 'all' ? 'all' : c.id)
            }}
            disabled={isEmpty}
            style={{
              padding: '7px 12px',
              border: isActive ? '1px solid var(--color-teal)' : 'var(--border-hairline)',
              background: isActive ? 'var(--color-teal)' : 'var(--color-bg)',
              color: isActive ? '#fff' : isEmpty ? 'var(--color-ink-muted)' : 'var(--color-ink)',
              opacity: isEmpty ? 0.4 : 1,
              fontFamily: 'var(--font-space-mono)',
              fontSize: '11px',
              fontWeight: 400,
              lineHeight: 1,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              cursor: isEmpty ? 'default' : 'pointer',
              borderRadius: 'var(--radius-sm)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              transition: 'background 160ms ease, border-color 160ms ease',
            }}
          >
            <span>{c.label}</span>
            <span style={{ opacity: isActive ? 0.75 : 0.55, fontVariantNumeric: 'tabular-nums' }}>{c.count}</span>
          </button>
        )
      })}
      </div>
    </>
  )
}
