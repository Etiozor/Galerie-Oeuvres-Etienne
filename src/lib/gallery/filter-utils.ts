/**
 * Fonctions utilitaires pour le filtrage de la galerie.
 *
 * POURQUOI extraire la logique hors du composant React ?
 * Testabilité : ces fonctions sont purement fonctionnelles (entrée → sortie)
 * et peuvent être testées avec Vitest sans monter de composant React.
 *
 * filterArtworks est utilisée par GalleryClient pour filtrer les œuvres
 * côté client sur les données chargées une seule fois côté serveur
 * (Pattern 1 RESEARCH.md — toutes les œuvres en une requête, filtrage local).
 *
 * buildFilterUrl est utilisée par FilterBar pour mettre à jour l'URL
 * sans rechargement de page (D-13 — persistance des filtres dans l'URL).
 */

/**
 * Interface minimale requise pour qu'une œuvre soit filtrable.
 *
 * On utilise un type générique T extends FilterableArtwork pour que
 * filterArtworks préserve le type complet de l'objet passé en entrée
 * (ex: ArtworkWithUrls dans GalleryClient) sans perdre ses propriétés.
 */
interface FilterableArtwork {
  typeId: number | null
  mediumId: number | null
  [key: string]: unknown
}

/**
 * Filtre une liste d'œuvres par type et/ou médium.
 *
 * Les filtres sont cumulatifs (ET logique) : si les deux sont actifs,
 * l'œuvre doit satisfaire les deux conditions pour apparaître.
 *
 * Une valeur "" (chaîne vide) signifie "pas de filtre actif".
 * Une œuvre avec typeId=null est EXCLUE si un filtre type est actif
 * (car null ne correspond à aucun ID valide).
 *
 * @param artworks - Liste complète des œuvres (chargées une seule fois côté serveur)
 * @param activeTypeId - ID du type actif sous forme de string (ex: "1"), "" si aucun
 * @param activeMediumId - ID du médium actif sous forme de string, "" si aucun
 * @returns Sous-liste des œuvres correspondant aux filtres actifs
 */
export function filterArtworks<T extends FilterableArtwork>(
  artworks: T[],
  activeTypeId: string,
  activeMediumId: string
): T[] {
  return artworks.filter((a) => {
    // Filtre type : si un type est sélectionné, l'œuvre doit y correspondre
    // String(null) = "null" ≠ "1" → les œuvres sans type sont exclues (comportement voulu)
    if (activeTypeId && String(a.typeId) !== activeTypeId) return false
    // Filtre médium : même logique
    if (activeMediumId && String(a.mediumId) !== activeMediumId) return false
    return true
  })
}

/**
 * Construit la chaîne de query string pour la mise à jour de l'URL des filtres.
 *
 * Prend les URLSearchParams courants, ajoute ou supprime le paramètre
 * spécifié selon si la valeur est non-vide ou vide.
 * Ne mute PAS les params originaux — crée une copie interne.
 *
 * Exemple :
 *   buildFilterUrl('type', '1', new URLSearchParams())       → "type=1"
 *   buildFilterUrl('type', '', new URLSearchParams('type=1&medium=2'))  → "medium=2"
 *   buildFilterUrl('type', '2', new URLSearchParams('type=1')) → "type=2"
 *
 * @param key - Clé du paramètre URL ('type' ou 'medium')
 * @param value - Nouvelle valeur, "" pour supprimer le paramètre
 * @param currentParams - URLSearchParams actuels (lus depuis useSearchParams)
 * @returns Nouvelle chaîne de query string (sans le '?' initial)
 */
export function buildFilterUrl(
  key: string,
  value: string,
  currentParams: URLSearchParams
): string {
  // IMPORTANT : créer une COPIE pour ne pas muter les params originaux
  // URLSearchParams est mutable — une mutation directe affecterait le state React
  const params = new URLSearchParams(currentParams.toString())

  if (value) {
    // Valeur non-vide → ajouter ou remplacer le paramètre
    params.set(key, value)
  } else {
    // Valeur vide → supprimer le paramètre (désactivation du filtre)
    params.delete(key)
  }

  return params.toString()
}
