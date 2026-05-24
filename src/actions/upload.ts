/**
 * Server Action d'upload d'œuvre.
 *
 * Flux simplifié :
 * 1. Validation session, MIME, taille
 * 2. DB INSERT avec originalPath et publishedAt = maintenant
 * 3. StorageProvider.put(originalKey)
 * 4. Retour avec l'artworkId
 *
 * L'œuvre est immédiatement visible dans la galerie après l'upload.
 * Aucun traitement d'image : le fichier original est utilisé tel quel.
 */
'use server'

import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { db } from '@/db'
import { artworks } from '@/db/schema'
import { getStorage } from '@/lib/storage'
import { randomUUID } from 'crypto'

/** Taille maximum acceptée : 20 MB (couvre les iPhone Pro en qualité maximale) */
const MAX_SIZE_BYTES = 20 * 1024 * 1024

/** Formats MIME acceptés : JPEG et PNG uniquement */
const ALLOWED_TYPES = ['image/jpeg', 'image/png']

/**
 * Types MIME des photos HEIC/HEIF (format natif iPhone).
 * Rejetés avec un message d'aide spécifique à l'iPhone.
 */
const HEIC_TYPES = ['image/heic', 'image/heif']

/** Type retourné par la Server Action — compatible useActionState React 19 */
export type UploadResult = {
  error?: string
  success?: boolean
  artworkId?: number
} | null

/**
 * Uploade une photo et crée l'entrée œuvre en base.
 *
 * @param _prevState  État précédent (requis par useActionState React 19 — ignoré ici)
 * @param formData    FormData contenant le champ 'file' (File)
 * @returns           Objet avec error (string) ou success + artworkId (number)
 */
export async function uploadArtwork(
  _prevState: UploadResult,
  formData: FormData
): Promise<UploadResult> {
  // ── 1. Vérification de session ──
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return { error: 'Non autorisé.' }
  }

  // ── 2. Récupération et vérification de base du fichier ──
  const file = formData.get('file')
  if (!(file instanceof File) || file.size === 0) {
    return { error: 'Aucun fichier reçu.' }
  }

  // ── 3. Rejet HEIC — message spécifique pour les iPhones ──
  if (HEIC_TYPES.includes(file.type)) {
    return {
      error: "Les photos iPhone en format HEIC ne sont pas supportées. Exporte en JPEG depuis l'app Photos.",
    }
  }

  // ── 4. Validation du format MIME ──
  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      error: "Ce format de fichier n'est pas supporté. Utilise un fichier JPEG ou PNG.",
    }
  }

  // ── 5. Validation de la taille — AVANT arrayBuffer() pour économiser la mémoire ──
  if (file.size > MAX_SIZE_BYTES) {
    return {
      error: "Le fichier est trop lourd (max 20 MB). Compresse-le avant d'uploader.",
    }
  }

  // ── 6. Lecture du contenu en mémoire ──
  const buffer = Buffer.from(new Uint8Array(await file.arrayBuffer()))
  const ext = file.type === 'image/png' ? 'png' : 'jpg'
  const uuid = randomUUID()

  // Clé de stockage construite côté serveur — jamais issue de l'input client
  const originalKey = `originals/${uuid}.${ext}`
  const storage = getStorage()

  // ── 7. Création de l'entrée DB — publiée immédiatement ──
  const inserted = await db
    .insert(artworks)
    .values({
      title: 'Sans titre',
      originalPath: originalKey,
      publishedAt: new Date(),
    })
    .returning({ id: artworks.id })

  const artwork = inserted[0]
  if (!artwork) {
    return { error: "Erreur lors de la création de l'œuvre en base de données." }
  }

  // ── 8. Stockage du fichier original ──
  await storage.put(originalKey, buffer, { contentType: file.type })

  return { success: true, artworkId: artwork.id }
}
