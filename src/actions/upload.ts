/**
 * Server Action d'upload d'œuvre — point d'entrée du pipeline image.
 *
 * POURQUOI ici et pas dans une API Route ?
 * Les Server Actions sont le pattern établi de ce projet pour toutes les mutations.
 * Pas besoin d'un endpoint REST séparé — Next.js gère le FormData directement.
 * Le client appelle cette fonction comme une fonction ordinaire via useActionState.
 *
 * Flux : Validation → DB INSERT (PENDING) → StorageProvider.put(original)
 * Le pipeline Sharp (rotation EXIF, normalisation, WebP) est déclenché dans le plan 02-02.
 *
 * Frontières de sécurité (threat model T-02-01 à T-02-03) :
 * - T-02-01 : file.type vérifié côté serveur (peut être falsifié par le client)
 * - T-02-02 : file.size vérifié avant arrayBuffer() pour éviter la saturation mémoire
 * - T-02-03 : session vérifiée en première ligne avant toute opération
 */
'use server'

import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { db } from '@/db'
import { artworks } from '@/db/schema'
import { getStorage } from '@/lib/storage'
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
 * Uploade une photo et crée une entrée en base avec l'état PENDING.
 *
 * POURQUOI créer l'entrée DB avant le traitement Sharp ?
 * L'artiste (D-01, D-02) voit l'image apparaître dans sa liste immédiatement
 * après l'upload. Le traitement Sharp est asynchrone et peut prendre quelques
 * secondes — l'artiste ne doit pas attendre devant un écran blanc.
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

  // Clé de stockage construite côté serveur — jamais issue de l'input client (T-02-04)
  const originalKey = `originals/${uuid}.${ext}`

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
  const storage = getStorage()
  await storage.put(originalKey, buffer, { contentType: file.type })

  return { success: true, artworkId: artwork.id }
}
