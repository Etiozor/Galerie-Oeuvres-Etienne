/**
 * Server Action de retry pipeline — relance le traitement sur l'original (D-09).
 *
 * POURQUOI un fichier séparé et pas dans upload.ts ?
 * Le retry est conceptuellement distinct de l'upload initial :
 * - Il lit depuis le stockage (pas de FormData)
 * - Il s'applique uniquement aux artworks en état FAILED
 * - Il sera aussi utilisé depuis la page d'administration en Phase 5
 *
 * Flux : Vérification auth → lecture artwork (FAILED only) →
 *        lecture original depuis storage → processImage() → AWAITING_VALIDATION
 *
 * Frontières de sécurité (threat model T-02-10 à T-02-12) :
 * - T-02-10 : session vérifiée en première ligne (artiste uniquement)
 * - T-02-12 : guard explicite sur pipelineState === 'failed' — empêche
 *             le retraitement d'une œuvre déjà publiée ou en cours
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

/**
 * Relance le pipeline Sharp sur l'image originale d'une œuvre en état FAILED.
 *
 * POURQUOI générer un nouveau UUID pour les clés ?
 * Évite le cache HTTP/CDN sur les anciennes clés — les navigateurs voient
 * les nouvelles clés comme de nouveaux fichiers et refont la requête.
 *
 * POURQUOI conserver l'originalPath inchangé ?
 * L'original est immuable (D-13) — on ne retouche jamais au fichier source.
 * Le retry ne fait que regénérer les variantes processed + thumbnail.
 *
 * @param artworkId  ID de l'œuvre à retraiter
 * @returns          { success: true } ou { error: string }
 */
export async function retryPipeline(
  artworkId: number
): Promise<{ error?: string; success?: boolean }> {
  // ── 1. Vérification de session — DOIT être la première vérification (T-02-10) ──
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return { error: 'Non autorisé.' }

  // ── 2. Récupérer l'artwork — doit exister en base ──
  const artwork = await db.query.artworks.findFirst({
    where: eq(artworks.id, artworkId),
  })
  if (!artwork) return { error: 'Œuvre introuvable.' }

  // ── 3. Sécurité : refuser le retry si l'état n'est pas FAILED (T-02-12) ──
  // POURQUOI ? Empêcher de "réessayer" une œuvre déjà publiée ou en cours de traitement.
  // Retraiter une œuvre PUBLISHED écraserait les clés processed/thumbnail sans raison.
  if (artwork.pipelineState !== 'failed') {
    return {
      error: `Impossible de réessayer : l'œuvre est en état "${artwork.pipelineState}", pas "failed".`,
    }
  }

  // ── 4. Vérifier que l'original est disponible ──
  // L'originalPath doit toujours exister (D-13), mais vérification défensive
  if (!artwork.originalPath) {
    return { error: "L'original est introuvable — l'œuvre ne peut pas être retraitée." }
  }

  // ── 5. Nouvelles clés pour les variantes retraitées ──
  // Nouveau UUID à chaque retry — évite le cache HTTP/CDN sur les anciennes URLs
  const uuid = randomUUID()
  const newProcessedKey = `processed/${uuid}.webp`
  const newThumbnailKey = `thumbnails/${uuid}.webp`
  const storage = getStorage()

  // ── 6. Passer en PROCESSING — signal visible dans la liste admin ──
  await db.update(artworks)
    .set({ pipelineState: 'processing' })
    .where(eq(artworks.id, artworkId))

  try {
    // ── 7. Lire l'original depuis le stockage (D-09 : l'original est TOUJOURS conservé — D-13) ──
    const buffer = await storage.get(artwork.originalPath)

    // ── 8. Retraiter avec Sharp (même pipeline que l'upload initial) ──
    const { processedBuffer, thumbnailBuffer } = await processImage(buffer)

    // ── 9. Stocker les nouvelles variantes ──
    await storage.put(newProcessedKey, processedBuffer, { contentType: 'image/webp' })
    await storage.put(newThumbnailKey, thumbnailBuffer, { contentType: 'image/webp' })

    // ── 10. Supprimer les anciennes variantes partielles si elles existent ──
    // POURQUOI .catch(() => {}) ? Les anciennes clés peuvent déjà avoir été nettoyées
    // lors de l'échec initial (D-08) — une erreur de suppression est acceptable.
    if (artwork.processedPath) {
      await storage.delete(artwork.processedPath).catch(() => {})
    }
    if (artwork.thumbnailPath) {
      await storage.delete(artwork.thumbnailPath).catch(() => {})
    }

    // ── 11. Succès → AWAITING_VALIDATION avec les nouvelles clés ──
    await db.update(artworks)
      .set({
        pipelineState: 'awaiting_validation',
        processedPath: newProcessedKey,
        thumbnailPath: newThumbnailKey,
      })
      .where(eq(artworks.id, artworkId))

    return { success: true }
  } catch {
    // ── Retry échoué → rester en FAILED (D-08) ──
    // L'artiste voit le badge FAILED de nouveau et peut réessayer plus tard
    // ou contacter le support si le problème persiste.
    await db.update(artworks)
      .set({ pipelineState: 'failed' })
      .where(eq(artworks.id, artworkId))

    // Nettoyer les nouvelles variantes partielles (silencieux si absentes)
    await storage.delete(newProcessedKey).catch(() => {})
    await storage.delete(newThumbnailKey).catch(() => {})

    return {
      error: 'Le retraitement a échoué de nouveau. Vérifiez le fichier original.',
    }
  }
}
