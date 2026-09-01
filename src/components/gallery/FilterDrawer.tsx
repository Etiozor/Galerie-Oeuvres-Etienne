/**
 * FilterDrawer — Bouton compact + bottom sheet filtres galerie (mobile uniquement).
 *
 * POURQUOI un composant séparé de GalleryClient ?
 * GalleryClient est un Client Component qui utilise useSearchParams — il ne peut
 * pas contenir un deuxième setState pour l'ouverture du tiroir sans complexifier
 * sa logique de filtrage. Ce composant fils isole l'état ouvert/fermé du tiroir.
 * Pattern identique à HamburgerMenu.tsx (décision State.md 08-01).
 *
 * CONTRAINTES DESIGN (09-CONTEXT.md) :
 * - D-03/D-12 : border-radius: 0 sur TOUS les éléments — bouton, badge, bottom sheet
 * - D-05/D-13 : touch target bouton ≥ 44px de hauteur
 * - D-14 : styles via <style> inline + @media — jamais de classes Tailwind responsive
 * - z-index : overlay 50, bottom sheet 51 (cohérent avec HamburgerMenu)
 * - Safe area iPhone : env(safe-area-inset-bottom, 16px)
 */
'use client'

import { useState, useEffect } from 'react'
import type { ArtworkType, Medium } from '@/db/schema'

interface FilterDrawerProps {
  /** Filtre actuellement actif — "all" | "type:{id}" | "medium:{id}" | "status:{value}" */
  activeFilter: string
  /** Callback appelé quand l'utilisateur sélectionne un filtre */
  onFilterChange: (filter: string) => void
  /** Types d'œuvres disponibles */
  types: ArtworkType[]
  /** Médiums disponibles */
  mediums: Medium[]
}

/**
 * Compte le nombre de filtres actifs pour le badge du bouton.
 * Un filtre actif = activeFilter !== 'all'.
 * Retourne 0 si aucun filtre, 1 sinon (une seule sélection possible à la fois).
 */
function countActiveFilters(activeFilter: string): number {
  return activeFilter === 'all' ? 0 : 1
}

export function FilterDrawer({ activeFilter, onFilterChange, types, mediums }: FilterDrawerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const activeCount = countActiveFilters(activeFilter)

  /**
   * Bloquer le scroll du body quand le bottom sheet est ouvert.
   * POURQUOI nécessaire sur iOS ?
   * Sur iPhone, position:fixed de l'overlay ne bloque pas le scroll du body.
   * document.body.style.overflow = 'hidden' est la seule méthode fiable.
   * Cleanup restaure l'état au démontage. [HamburgerMenu pattern]
   */
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  /**
   * Fermer le bottom sheet sur la touche Escape — accessibilité clavier.
   * Écoute uniquement quand le tiroir est ouvert pour éviter des listeners inutiles.
   */
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen])

  /**
   * Sélectionner un filtre dans le bottom sheet.
   * Toggle : cliquer sur le filtre actif remet "all" (comportement identique aux chips desktop).
   */
  function handleChipClick(filterId: string) {
    onFilterChange(activeFilter === filterId && filterId !== 'all' ? 'all' : filterId)
    setIsOpen(false)
  }

  return (
    <>
      {/* Animation bottom sheet — keyframe dans le composant pour éviter un fichier CSS global */}
      <style>{`
        @keyframes slideInFromBottom {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
        .filter-drawer-sheet {
          animation: slideInFromBottom 0.22s ease-out;
        }
      `}</style>

      {/*
       * Bouton compact "Filtres ▾" — touch target 44px minimum (D-13).
       * Fond coloré (--color-teal) quand filtre actif, sobre sinon.
       * D-03 : borderRadius: 0 obligatoire.
       */}
      <button
        onClick={() => setIsOpen(true)}
        aria-label="Ouvrir les filtres"
        aria-expanded={isOpen}
        style={{
          height: '44px',
          padding: '0 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: activeCount > 0 ? 'var(--color-teal)' : 'var(--color-bg)',
          border: '1px solid rgba(0,0,0,0.12)',
          cursor: 'pointer',
          borderRadius: 'var(--radius-sm)',
          fontFamily: 'var(--font-space-mono)',
          fontSize: '12px',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: activeCount > 0 ? '#fff' : 'var(--color-ink)',
          whiteSpace: 'nowrap',
        }}
      >
        Filtres
        {/* Badge de comptage — visible uniquement quand filtre(s) actif(s) (D-03) */}
        {activeCount > 0 && (
          <span
            aria-label={`${activeCount} filtre actif`}
            style={{
              background: 'rgba(255,255,255,0.25)',
              padding: '2px 6px',
              fontSize: '11px',
              borderRadius: 'var(--radius-sm)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            · {activeCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          {/*
           * Overlay semi-transparent derrière le bottom sheet.
           * position:fixed inset:0 couvre toute la fenêtre.
           * z-index: 50 — cohérent avec HamburgerMenu overlay.
           * aria-hidden="true" — non annoncé aux lecteurs d'écran.
           */}
          <div
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 50,
              background: 'rgba(26,26,26,0.5)',
            }}
          />

          {/*
           * Bottom sheet — glisse depuis le bas, pleine largeur.
           * role="dialog" + aria-modal="true" pour accessibilité.
           * aria-modal="true" indique aux lecteurs d'écran (VoiceOver, NVDA) que seul
           * le contenu du tiroir est accessible — ils ne lisent pas le fond de page.
           * D-03 : borderRadius: 0 — pas de coins arrondis sur le tiroir.
           * Safe area iPhone : max(16px, env(safe-area-inset-bottom, 16px)).
           * max() garantit un paddingBottom minimum de 16px même si env() vaut 0
           * (appareils sans encoche qui supportent la propriété env() mais retournent 0).
           * z-index: 51 — au-dessus de l'overlay (50) et de la SiteNav sticky (10).
           */}
          <div
            role="dialog"
            aria-label="Filtres de la galerie"
            aria-modal="true"
            className="filter-drawer-sheet"
            style={{
              position: 'fixed',
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 51,
              background: 'var(--color-surface)',
              borderTopLeftRadius: 'var(--radius-sm)',
              borderTopRightRadius: 'var(--radius-sm)',
              padding: '16px 24px',
              paddingBottom: 'max(16px, env(safe-area-inset-bottom, 16px))',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              maxHeight: '70vh',
              overflowY: 'auto',
            }}
          >
            {/* En-tête du tiroir : titre + croix de fermeture */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{
                fontFamily: 'var(--font-space-mono)',
                fontSize: '11px',
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                color: 'var(--color-ink-muted)',
              }}>
                Filtres
              </span>
              {/* Croix fermeture — touch target 44×44px (D-13) */}
              <button
                onClick={() => setIsOpen(false)}
                aria-label="Fermer les filtres"
                style={{
                  width: '44px',
                  height: '44px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '22px',
                  color: 'var(--color-ink)',
                  lineHeight: 1,
                  borderRadius: 0,
                }}
              >
                ×
              </button>
            </div>

            {/* Groupe chips filtres — flexWrap: wrap (pas de scroll dans le tiroir) */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {/* Chip "Tous" — remet activeFilter à 'all' */}
              <FilterChip
                label="Tous"
                filterId="all"
                active={activeFilter === 'all'}
                onClick={handleChipClick}
              />

              {/* Chips par type */}
              {types.length > 0 && (
                <>
                  <ChipSeparator label="Type" />
                  {types.map(t => (
                    <FilterChip
                      key={t.id}
                      label={t.name}
                      filterId={`type:${t.id}`}
                      active={activeFilter === `type:${t.id}`}
                      onClick={handleChipClick}
                    />
                  ))}
                </>
              )}

              {/* Chips par médium */}
              {mediums.length > 0 && (
                <>
                  <ChipSeparator label="Médium" />
                  {mediums.map(m => (
                    <FilterChip
                      key={m.id}
                      label={m.name}
                      filterId={`medium:${m.id}`}
                      active={activeFilter === `medium:${m.id}`}
                      onClick={handleChipClick}
                    />
                  ))}
                </>
              )}

              {/* Chips par statut */}
              <ChipSeparator label="Statut" />
              <FilterChip label="Disponibles" filterId="status:available" active={activeFilter === 'status:available'} onClick={handleChipClick} color="var(--color-teal)" />
              <FilterChip label="Réservées"   filterId="status:reserved"  active={activeFilter === 'status:reserved'}  onClick={handleChipClick} color="var(--color-orange)" />
              <FilterChip label="Vendues"     filterId="status:sold"      active={activeFilter === 'status:sold'}      onClick={handleChipClick} color="var(--color-red)" />
            </div>
          </div>
        </>
      )}
    </>
  )
}

/**
 * Chip individuel dans le bottom sheet.
 * D-03 : borderRadius: 0 obligatoire.
 * Touch target : padding vertical 10px → hauteur effective ~34px + marges gestuelles.
 */
function FilterChip({
  label,
  filterId,
  active,
  onClick,
  color,
}: {
  label: string
  filterId: string
  active: boolean
  onClick: (id: string) => void
  color?: string
}) {
  return (
    <button
      onClick={() => onClick(filterId)}
      style={{
        padding: '10px 14px',
        border: '1px solid rgba(0,0,0,0.08)',
        background: active ? (color ?? 'var(--color-teal)') : 'var(--color-bg)',
        color: active ? '#fff' : 'var(--color-ink)',
        fontFamily: 'var(--font-space-mono)',
        fontSize: '12px',
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        cursor: 'pointer',
        borderRadius: 'var(--radius-sm)',
        whiteSpace: 'nowrap',
        transition: 'background 140ms, color 140ms',
      }}
    >
      {label}
    </button>
  )
}

/**
 * Séparateur de section dans le tiroir filtres.
 * Label Space Mono uppercase muted — cohérent avec les sections de la barre desktop.
 */
function ChipSeparator({ label }: { label: string }) {
  return (
    <span
      style={{
        display: 'flex',
        alignItems: 'center',
        width: '100%',
        fontFamily: 'var(--font-space-mono)',
        fontSize: '10px',
        textTransform: 'uppercase',
        letterSpacing: '0.12em',
        color: 'var(--color-ink-muted)',
        marginTop: '4px',
      }}
    >
      {label}
    </span>
  )
}
