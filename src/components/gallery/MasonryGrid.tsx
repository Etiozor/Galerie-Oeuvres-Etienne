/**
 * Grille masonry CSS multi-colonnes pour la galerie.
 *
 * POURQUOI CSS columns et pas JavaScript (Masonry.js, CSS Grid masonry) ?
 * - CSS columns est "Baseline Widely Available" depuis 2017 — zéro dépendance JS
 * - CSS Grid masonry est toujours derrière un flag Chrome/Edge 140+ (2026)
 * - Masonry.js / Isotope causent du reflow JS — dégradent les perfs mobile
 * Voir "État de l'art" dans 03-RESEARCH.md.
 *
 * Colonnes (D-06 + décision Claude) :
 * - Desktop ≥1024px : 3 colonnes (GALLERY-02)
 * - Tablette 768–1023px : 2 colonnes (décision Claude)
 * - Mobile <768px : 1 colonne (GALLERY-01)
 *
 * Espacement : column-gap 2px, margin-bottom 2px sur chaque carte (D-06).
 * EXCEPTION à la règle 8-point : ces 2px sont voulus par design.
 */
import React from 'react'

interface MasonryGridProps {
  children: React.ReactNode
}

export function MasonryGrid({ children }: MasonryGridProps) {
  return (
    <>
      {/*
       * Style responsif via tag <style> inline.
       * POURQUOI pas Tailwind pour les columns ?
       * Tailwind 4 ne génère pas de classes `columns-3` responsives par défaut
       * sans plugin custom. Le tag <style> est plus explicite et maintenable ici.
       */}
      <style>{`
        .masonry-grid {
          columns: 3;
          column-gap: 2px;
        }
        @media (max-width: 1023px) {
          .masonry-grid { columns: 2; }
        }
        @media (max-width: 767px) {
          .masonry-grid { columns: 1; }
        }
      `}</style>
      <div className="masonry-grid" style={{ padding: '0 2px' }}>
        {children}
      </div>
    </>
  )
}
