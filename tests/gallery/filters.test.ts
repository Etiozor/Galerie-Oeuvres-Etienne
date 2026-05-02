/**
 * Tests unitaires pour la logique de filtrage de la galerie.
 *
 * Ces tests couvrent :
 * 1. filterArtworks : filtrage d'une liste d'œuvres par type et médium
 * 2. buildFilterUrl : construction des URL params pour la persistance des filtres
 *
 * La logique est extraite dans src/lib/gallery/filter-utils.ts pour
 * être testable indépendamment du composant React GalleryClient.
 *
 * POURQUOI tester ces fonctions séparément ?
 * filterArtworks et buildFilterUrl sont des fonctions pures (même entrée → même sortie).
 * Elles ne dépendent ni de React ni du navigateur — on peut les tester avec Vitest
 * sans monter de composant, ce qui est beaucoup plus rapide et fiable.
 */
import { describe, it, expect } from 'vitest'
import { filterArtworks, buildFilterUrl } from '@/lib/gallery/filter-utils'

// Fixtures d'œuvres pour les tests
const mockArtworks = [
  { id: 1, typeId: 1, mediumId: 1, title: 'Dessin crayon A' },
  { id: 2, typeId: 1, mediumId: 2, title: 'Dessin encre B' },
  { id: 3, typeId: 2, mediumId: 1, title: 'Peinture acrylique C' },
  { id: 4, typeId: 2, mediumId: 3, title: 'Peinture huile D' },
  { id: 5, typeId: null, mediumId: null, title: 'Sans classification' },
]

describe('filterArtworks', () => {
  it('retourne tous les items si aucun filtre actif', () => {
    expect(filterArtworks(mockArtworks, '', '')).toHaveLength(5)
  })

  it('filtre uniquement par type', () => {
    const result = filterArtworks(mockArtworks, '1', '')
    expect(result).toHaveLength(2)
    expect(result.map((a) => a.id)).toEqual([1, 2])
  })

  it('filtre uniquement par médium', () => {
    const result = filterArtworks(mockArtworks, '', '1')
    expect(result).toHaveLength(2)
    expect(result.map((a) => a.id)).toEqual([1, 3])
  })

  it('filtre par type ET médium (intersection)', () => {
    const result = filterArtworks(mockArtworks, '1', '2')
    expect(result).toHaveLength(1)
    // Accès sûr avec at(0) pour éviter TS2532 (noUncheckedIndexedAccess strict mode)
    expect(result.at(0)?.id).toBe(2)
  })

  it("retourne [] si aucune œuvre ne correspond au filtre", () => {
    expect(filterArtworks(mockArtworks, '99', '')).toHaveLength(0)
  })

  it('retourne [] pour une liste vide', () => {
    expect(filterArtworks([], '1', '')).toHaveLength(0)
  })

  it('exclut les œuvres sans typeId quand un filtre type est actif', () => {
    const result = filterArtworks(mockArtworks, '1', '')
    expect(result.map((a) => a.id)).not.toContain(5)
  })
})

describe('buildFilterUrl', () => {
  it('ajoute un paramètre de filtre à des params vides', () => {
    const params = new URLSearchParams()
    expect(buildFilterUrl('type', '1', params)).toBe('type=1')
  })

  it('supprime un paramètre quand la valeur est vide', () => {
    const params = new URLSearchParams('type=1&medium=2')
    expect(buildFilterUrl('type', '', params)).toBe('medium=2')
  })

  it('remplace un paramètre existant', () => {
    const params = new URLSearchParams('type=1')
    expect(buildFilterUrl('type', '2', params)).toBe('type=2')
  })

  it('conserve les autres params lors de la suppression', () => {
    const params = new URLSearchParams('type=1&medium=3')
    const result = buildFilterUrl('medium', '', params)
    expect(result).toBe('type=1')
  })
})
