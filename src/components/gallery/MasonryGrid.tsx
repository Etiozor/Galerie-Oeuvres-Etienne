'use client'
/**
 * Grille masonry de la galerie — répartition round-robin en colonnes flex.
 *
 * POURQUOI PAS CSS `columns` ?
 * CSS multi-colonnes équilibre les colonnes à hauteur égale : au scroll infini,
 * l'ajout de nouvelles œuvres recalcule cet équilibre et fait « sauter » les
 * œuvres déjà affichées → l'ordre de tri visuel est cassé (bug signalé).
 *
 * ICI : l'élément i va toujours dans la colonne i % cols.
 * - Ordre de lecture gauche→droite, haut→bas (rangée par rangée)
 * - Ajouter des éléments (loadMore) ne déplace JAMAIS ceux déjà placés
 * ponytail: round-robin ≠ vrai équilibrage par hauteur — colonnes possiblement
 * inégales si les ratios varient beaucoup. Passer à une répartition par hauteur
 * mesurée seulement si le déséquilibre devient visible.
 *
 * Colonnes : desktop ≥1024px = 3 · tablette 768–1023 = 2 · mobile <768 = 1.
 */
import React, { useEffect, useState } from 'react'

/** Nombre de colonnes selon la largeur — resynchronisé au redimensionnement. */
function useColumnCount(): number {
  const [cols, setCols] = useState(3) // 3 au SSR → pas de mismatch d'hydratation
  useEffect(() => {
    const compute = () => {
      const w = window.innerWidth
      setCols(w <= 767 ? 1 : w <= 1023 ? 2 : 3)
    }
    compute()
    window.addEventListener('resize', compute)
    return () => window.removeEventListener('resize', compute)
  }, [])
  return cols
}

export function MasonryGrid({ children }: { children: React.ReactNode }) {
  const cols = useColumnCount()
  const items = React.Children.toArray(children)

  // Répartition round-robin en `cols` colonnes.
  const columns: React.ReactNode[][] = Array.from({ length: cols }, () => [])
  items.forEach((child, i) => columns[i % cols]!.push(child))

  const gap = cols === 3 ? 20 : 16
  return (
    <div style={{ display: 'flex', gap, padding: '0 24px', alignItems: 'flex-start' }}>
      {columns.map((col, i) => (
        <div key={i} style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          {col}
        </div>
      ))}
    </div>
  )
}
