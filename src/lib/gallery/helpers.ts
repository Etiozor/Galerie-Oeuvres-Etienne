/**
 * Fonctions helper pour la galerie publique.
 *
 * POURQUOI ces helpers ?
 * Drizzle retourne les colonnes `numeric` PostgreSQL comme des strings JavaScript.
 * (Comportement du driver node-postgres — voir piège 4 dans 03-RESEARCH.md)
 * Ces fonctions convertissent de manière sûre pour l'aspect-ratio CSS.
 *
 * Exemple d'usage :
 *   const ratio = buildAspectRatio(artwork.widthCm, artwork.heightCm)
 *   // → "30 / 20" (pour une œuvre 30×20 cm)
 *   // → "1 / 1" (si les dimensions sont absentes)
 */

/**
 * Convertit une valeur numeric Drizzle (string) en number.
 *
 * POURQUOI retourner 1 pour "0" ?
 * Un aspect-ratio avec 0 serait invalide CSS et causerait des dimensions nulles.
 * En pratique, une œuvre de 0 cm n'existe pas — c'est une donnée manquante.
 *
 * @param value Valeur retournée par Drizzle (string ou null/undefined)
 * @returns     Number valide, toujours ≥ 1
 */
export function parseDimension(value: string | null | undefined): number {
  // Cas vides (null, undefined, string vide) → fallback 1
  if (!value) return 1
  const n = parseFloat(value)
  // NaN (string non numérique) ou 0 (invalide pour aspect-ratio) → fallback 1
  return isNaN(n) || n === 0 ? 1 : n
}

/**
 * Construit la string CSS aspect-ratio depuis les dimensions en cm.
 *
 * Exemple : widthCm="30", heightCm="20" → "30 / 20"
 * L'œuvre s'affichera avec le bon ratio dans la grille masonry (D-07).
 *
 * @param widthCm  Largeur en cm (string Drizzle ou null)
 * @param heightCm Hauteur en cm (string Drizzle ou null)
 * @returns        String CSS valide pour la propriété aspect-ratio
 */
export function buildAspectRatio(
  widthCm: string | null | undefined,
  heightCm: string | null | undefined
): string {
  // Si l'une des dimensions est absente, retourner un ratio carré
  if (!widthCm || !heightCm) return '1 / 1'
  const w = parseDimension(widthCm)
  const h = parseDimension(heightCm)
  // Si l'une des valeurs est au fallback (0 ou invalide), ratio carré
  if (w === 1 && widthCm === '0') return '1 / 1'
  if (h === 1 && heightCm === '0') return '1 / 1'
  return `${w} / ${h}`
}
