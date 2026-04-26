/**
 * Server Action d'upload d'œuvre — pipeline complet.
 *
 * POURQUOI ici et pas dans une API Route ?
 * Les Server Actions sont le pattern établi de ce projet pour toutes les mutations.
 * Pas besoin d'un endpoint REST séparé — Next.js gère le FormData directement.
 * Le client appelle cette fonction comme une fonction ordinaire via useActionState.
 *
 * Flux complet (depuis RESEARCH.md Architecture Patterns) :
 * 1. Validation session, MIME, taille (PIPE-01)
 * 2. DB INSERT avec pipelineState='pending' (D-02)
 * 3. StorageProvider.put(originalKey) — original jamais écrasé (D-13)
 * 4. DB UPDATE pipelineState='processing'
 * 5. Sharp pipeline : rotate() → normalise() → withMetadata() → webp() (D-11, D-12, PIPE-02/03)
 * 6. StorageProvider.put(processedKey)
 * 7. Sharp thumbnail : rotate() → resize(400) → normalise() → withMetadata() → webp()
 * 8. StorageProvider.put(thumbnailKey)
 * 9a. Succès → DB UPDATE pipelineState='awaiting_validation', processedPath, thumbnailPath
 * 9b. Échec (catch) → DB UPDATE pipelineState='failed' + delete fichiers partiels (D-08)
 *
 * Frontières de sécurité (threat model T-02-01 à T-02-09) :
 * - T-02-01 : file.type vérifié côté serveur (peut être falsifié par le client)
 * - T-02-02 : file.size vérifié avant arrayBuffer() pour éviter la saturation mémoire
 * - T-02-03 : session vérifiée en première ligne avant toute opération
 * - T-02-09 : le catch couvre Sharp + les deux storage.put() — si le process Node.js crash,
 *             l'entrée reste en PROCESSING (nettoyée par un job Phase 5)
 */
'use server'

import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { db } from '@/db'
import { artworks } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { getStorage } from '@/lib/storage'
import { processImage } from '@/lib/pipeline/process'
import { randomUUID } from 'crypto'

/** Taille maximum acceptée : 20 MB (couvre les iPhone Pro en qualité maximale — D-07) */
const MAX_SIZE_BYTES = 20 * 1024 * 1024

/** Formats MIME acceptés : JPEG et PNG uniquement (D-06) */
const ALLOWED_TYPES = ['image/jpeg', 'image/png']

/**
 * Types MIME des photos HEIC/HEIF (format natif iPhone).
 * Ces fichiers sont rejetés car libheif n'est pas disponible sur les déploiements standard.
 * On les détecte séparément pour afficher un message d'aide spécifique à l'iPhone (D-06).
 */
const HEIC_TYPES = ['image/heic', 'image/heif']

/** Type retourné par la Server Action — compatible useActionState React 19 */
export type UploadResult = {
  error?: string
  success?: boolean
  artworkId?: number
} | null

/**
 * Uploade une photo et fait passer le pipeline complet synchrone.
 *
 * POURQUOI créer l'entrée DB avant le traitement Sharp ?
 * L'artiste (D-01, D-02) voit l'image apparaître dans sa liste immédiatement
 * après l'upload. Le traitement Sharp est synchrone dans cette version mais
 * pourrait devenir asynchrone — l'entrée DB est le point de reprise si le
 * process crash (état PROCESSING → Phase 5 cleanup job).
 *
 * POURQUOI stocker d'abord en DB, puis en storage (et pas l'inverse) ?
 * Si le stockage échoue après l'INSERT, l'entrée DB orpheline sera visible
 * en état FAILED — l'artiste peut réessayer. Si l'ordre était inversé, le
 * fichier serait stocké sans entrée DB traçable.
 *
 * @param _prevState  État précédent (requis par useActionState React 19 — ignoré ici)
 * @param formData    FormData contenant le champ 'file' (File)
 * @returns           Objet avec error (string) ou success + artworkId (number)
 */
export async function uploadArtwork(
  _prevState: UploadResult,
  formData: FormData
): Promise<UploadResult> {
  // ── 1. Vérification de session — DOIT être la première vérification (T-02-03) ──
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return { error: 'Non autorisé.' }
  }

  // ── 2. Récupération et vérification de base du fichier ──
  const file = formData.get('file')
  if (!(file instanceof File) || file.size === 0) {
    return { error: 'Aucun fichier reçu.' }
  }

  // ── 3. Rejet HEIC en premier — message spécifique pour les iPhones (D-06) ──
  // Vérification avant ALLOWED_TYPES car HEIC ne serait sinon que "format non supporté",
  // sans indiquer comment exporter en JPEG depuis l'app Photos.
  if (HEIC_TYPES.includes(file.type)) {
    return {
      error: "Les photos iPhone en format HEIC ne sont pas supportées. Exporte en JPEG depuis l'app Photos.",
    }
  }

  // ── 4. Validation du format MIME (T-02-01) ──
  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      error: "Ce format de fichier n'est pas supporté. Utilise un fichier JPEG ou PNG.",
    }
  }

  // ── 5. Validation de la taille — AVANT arrayBuffer() pour économiser la mémoire (T-02-02) ──
  if (file.size > MAX_SIZE_BYTES) {
    return {
      error: "Le fichier est trop lourd (max 20 MB). Compresse-le avant d'uploader.",
    }
  }

  // ── 6. Lecture du contenu en mémoire — uniquement après toutes les validations ──
  const buffer = Buffer.from(new Uint8Array(await file.arrayBuffer()))
  const ext = file.type === 'image/png' ? 'png' : 'jpg'
  const uuid = randomUUID()

  // Clés de stockage construites côté serveur avec le même UUID — jamais issues de l'input client (T-02-04)
  // POURQUOI le même UUID pour les trois clés ?
  // Cela garantit que original/processed/thumbnail d'une même œuvre partagent
  // le même identifiant — facilite la gestion et le nettoyage (D-13).
  const originalKey = `originals/${uuid}.${ext}`
  const processedKey = `processed/${uuid}.webp`
  const thumbnailKey = `thumbnails/${uuid}.webp`
  const storage = getStorage()

  // ── 7. Création de l'entrée DB en PENDING (D-02) ──
  // Titre = 'Sans titre' par défaut (D-01 : l'artiste complète les métadonnées après upload)
  const inserted = await db
    .insert(artworks)
    .values({
      title: 'Sans titre',
      pipelineState: 'pending',
      originalPath: originalKey,
    })
    .returning({ id: artworks.id })

  const artwork = inserted[0]
  if (!artwork) {
    // Ne devrait jamais arriver — Drizzle lève une exception avant de retourner un tableau vide
    return { error: "Erreur lors de la création de l'œuvre en base de données." }
  }

  // ── 8. Stockage du fichier original — JAMAIS écrasé (D-13) ──
  await storage.put(originalKey, buffer, { contentType: file.type })

  // ── 9. Passer en PROCESSING ──
  // POURQUOI cette mise à jour avant Sharp ?
  // Si le process Node.js crash pendant Sharp, l'entrée restera en PROCESSING
  // (pas en PENDING). Un job de nettoyage Phase 5 pourra la marquer FAILED.
  // Sans cette transition, un crash serait indiscernable d'un upload en attente.
  await db.update(artworks)
    .set({ pipelineState: 'processing' })
    .where(eq(artworks.id, artwork.id))

  // ── 10. Pipeline Sharp synchrone : PROCESSING → AWAITING_VALIDATION ou FAILED ──
  try {
    // Sharp génère les deux variantes (voir src/lib/pipeline/process.ts pour l'ordre des opérations)
    const { processedBuffer, thumbnailBuffer } = await processImage(buffer)

    // Stocker les deux variantes WebP — contentType explicite pour le Content-Type HTTP
    await storage.put(processedKey, processedBuffer, { contentType: 'image/webp' })
    await storage.put(thumbnailKey, thumbnailBuffer, { contentType: 'image/webp' })

    // ── Succès → AWAITING_VALIDATION + enregistrer les trois chemins (D-13) ──
    await db.update(artworks)
      .set({
        pipelineState: 'awaiting_validation',
        processedPath: processedKey,
        thumbnailPath: thumbnailKey,
      })
      .where(eq(artworks.id, artwork.id))

    return { success: true, artworkId: artwork.id }
  } catch {
    // ── Échec Sharp → FAILED (D-08) ──
    // POURQUOI ne pas rethrow ? La Server Action doit retourner une valeur,
    // pas lever une exception — sinon Next.js affiche une page d'erreur générique.
    // L'artiste voit le badge FAILED dans son admin et peut utiliser "Réessayer" (D-09).
    await db.update(artworks)
      .set({ pipelineState: 'failed' })
      .where(eq(artworks.id, artwork.id))

    // Nettoyer les fichiers partiels — silencieux si absents (idempotent).
    // POURQUOI .catch(() => {}) ? Si seul processed a été écrit avant le crash,
    // la suppression de thumbnailKey échoue silencieusement — acceptable.
    await storage.delete(processedKey).catch(() => {})
    await storage.delete(thumbnailKey).catch(() => {})

    return {
      error: 'Le traitement a échoué. Utilisez "Réessayer le traitement" dans la liste.',
    }
  }
}
