/**
 * Pipeline de traitement d'image Sharp — Galerie POF.
 *
 * POURQUOI cette fonction est séparée de la Server Action ?
 * 1. Testabilité : une fonction pure Buffer → Buffer peut être testée
 *    sans Next.js, sans DB, sans StorageProvider.
 * 2. Réutilisabilité : l'action "Réessayer" (D-09) appelle la même
 *    fonction avec l'original stocké, sans dupliquer la logique Sharp.
 *
 * ORDRE OBLIGATOIRE des opérations Sharp :
 * .rotate() TOUJOURS en premier (D-11) — corrige l'orientation EXIF avant
 * que normalise() analyse les pixels. Si rotate() vient après, l'algorithme
 * d'exposition travaille sur des pixels mal orientés.
 *
 * .withMetadata() TOUJOURS présent (D-12) — préserve le profil ICC Display-P3
 * des iPhone récents. Sans lui, Sharp strip le profil et les couleurs paraissent
 * désaturées dans les navigateurs à gestion des couleurs.
 */
import sharp from 'sharp'

/**
 * Résultat du pipeline de traitement.
 */
export interface PipelineResult {
  /** Image pleine résolution en WebP (qualité 85), corrigée et ICC préservé */
  processedBuffer: Buffer
  /** Miniature 400px max en WebP (qualité 80), même pipeline de correction */
  thumbnailBuffer: Buffer
}

/**
 * Traite une image avec Sharp pour produire deux variantes WebP.
 *
 * @param inputBuffer  Buffer de l'image originale (JPEG ou PNG)
 * @returns            { processedBuffer, thumbnailBuffer }
 * @throws             Error si Sharp ne peut pas traiter le buffer (format invalide, corrompu)
 */
export async function processImage(inputBuffer: Buffer): Promise<PipelineResult> {
  // --- Version traitée — pleine résolution ---
  // POURQUOI cet ordre exact ?
  // 1. rotate() : lit le tag EXIF Orientation et réoriente les pixels PHYSIQUEMENT.
  //    Doit être en premier car toutes les opérations suivantes supposent une image bien orientée.
  // 2. normalise() : étire l'histogramme de luminosité pour corriger la sous/surexposition.
  //    lower:1 / upper:99 = ignore 1% des pixels les plus sombres et les plus clairs (PIPE-02).
  //    PIPE-03 : normalise() travaille par canal (R, G, B séparément) — cela effectue
  //    implicitement une balance des blancs en normalisant chaque canal indépendamment.
  // 3. withMetadata() : copie les métadonnées EXIF (incluant le profil ICC) dans l'output WebP (D-12).
  // 4. webp({ quality: 85 }) : encode en WebP, bon compromis qualité/taille pour les œuvres d'art.
  const processedBuffer = await sharp(inputBuffer)
    .rotate()                           // D-11 : EXIF rotation EN PREMIER (obligatoire)
    .normalise({ lower: 1, upper: 99 }) // PIPE-02/03 : exposition + contraste + balance couleurs
    .withMetadata()                     // D-12 : préserver profil ICC Display-P3 iPhone
    .webp({ quality: 85 })             // D-14 : sortie WebP qualité 85
    .toBuffer()

  // --- Miniature — largeur 400px maximum ---
  // Même pipeline de correction que la version traitée.
  // resize(400, null) = largeur fixe, hauteur proportionnelle.
  // withoutEnlargement: true = jamais agrandir une image déjà petite (évite les artefacts).
  const thumbnailBuffer = await sharp(inputBuffer)
    .rotate()                                              // D-11 : toujours en premier
    .resize(400, null, { withoutEnlargement: true })       // largeur 400px max (PIPE-03)
    .normalise({ lower: 1, upper: 99 })                   // même correction que la version traitée
    .withMetadata()                                        // D-12 : ICC préservé dans la miniature aussi
    .webp({ quality: 80 })                                // qualité légèrement réduite pour la miniature
    .toBuffer()

  return { processedBuffer, thumbnailBuffer }
}
