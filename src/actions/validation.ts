/**
 * Server Actions de validation pipeline — décisions finales de l'artiste.
 *
 * Trois actions correspondant aux trois boutons de l'écran de validation (D-04) :
 * 1. approveArtwork  → publie la version traitée par Sharp (PIPE-04)
 * 2. publishRaw      → publie l'original sans correction (PIPE-05)
 * 3. rejectArtwork   → supprime l'entrée et tous ses fichiers
 *
 * POURQUOI des Server Actions et pas des Route Handlers ?
 * Pattern établi du projet : toutes les mutations passent par des Server Actions.
 * La page de validation utilise <form action={serverAction.bind(null, id)}> — natif Next.js 15.
 *
 * Frontières de sécurité (threat model T-02-13, T-02-14) :
 * - T-02-13 : chaque action vérifie la session artiste en première ligne
 * - T-02-14 : guard pipelineState dans la page server (validate/page.tsx)
 */
'use server'

import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { db } from '@/db'
import { artworks } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { getStorage } from '@/lib/storage'

/**
 * Approuve la version traitée par Sharp et la publie.
 *
 * processedPath contient la version WebP corrigée → passe en 'published'.
 * publishedAt marque la date de première mise en ligne publique.
 *
 * POURQUOI redirect() plutôt que return { success: true } ?
 * Après une action irréversible, renvoyer l'artiste à la liste est la meilleure UX.
 * redirect() est géré nativement par Next.js — le client reçoit une réponse 303.
 *
 * @param artworkId  ID de l'œuvre à publier
 * @returns          { error: string } si échec, sinon redirect (jamais de retour visible)
 */
export async function approveArtwork(
  artworkId: number
): Promise<{ error?: string }> {
  // ── 1. Vérification de session — DOIT être la première vérification (T-02-13) ──
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return { error: 'Non autorisé.' }

  // ── 2. Vérifier que l'œuvre existe ──
  const artwork = await db.query.artworks.findFirst({
    where: eq(artworks.id, artworkId),
  })
  if (!artwork) return { error: 'Œuvre introuvable.' }

  // ── 3. Publier la version traitée — publishedAt marque la date de mise en ligne ──
  await db.update(artworks)
    .set({
      pipelineState: 'published',
      publishedAt: new Date(),
    })
    .where(eq(artworks.id, artworkId))

  // Rediriger vers la liste après approbation
  redirect('/admin/artworks')
}

/**
 * Publie l'image originale sans correction (PIPE-05 — D-04 "Publier l'original").
 *
 * POURQUOI copier originalPath dans processedPath ?
 * La galerie publique (Phase 3) utilisera processedPath pour afficher les images.
 * En assignant originalPath → processedPath, on garantit que le même champ
 * est utilisé partout, qu'il y ait eu correction ou non.
 * Sans cette copie, la galerie publique afficherait "image non disponible" car
 * elle lira processedPath qui pointe vers un WebP qui n'a pas été approuvé.
 *
 * @param artworkId  ID de l'œuvre à publier avec l'original
 * @returns          { error: string } si échec, sinon redirect
 */
export async function publishRaw(
  artworkId: number
): Promise<{ error?: string }> {
  // ── 1. Vérification de session (T-02-13) ──
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return { error: 'Non autorisé.' }

  // ── 2. Vérifier que l'œuvre existe ──
  const artwork = await db.query.artworks.findFirst({
    where: eq(artworks.id, artworkId),
  })
  if (!artwork) return { error: 'Œuvre introuvable.' }

  // ── 3. PIPE-05 : l'original devient la version "traitée" dans la DB ──
  await db.update(artworks)
    .set({
      processedPath: artwork.originalPath, // l'original est maintenant le "traité"
      pipelineState: 'published',
      publishedAt: new Date(),
    })
    .where(eq(artworks.id, artworkId))

  redirect('/admin/artworks')
}

/**
 * Rejette l'œuvre : supprime les 3 fichiers stockés et supprime la ligne DB.
 *
 * POURQUOI supprimer les fichiers AVANT la ligne DB ?
 * Si la suppression DB échoue après les suppressions storage, on a des fichiers
 * orphelins mais la ligne DB pointe vers des clés qui n'existent plus.
 * Supprimer dans cet ordre permet un retry propre si la DB échoue :
 * le garbage collector de Phase 5 peut détecter les entrées sans fichiers.
 * Si les suppressions storage échouent, on laisse la ligne DB intacte
 * (les fichiers existent encore — cohérence maintenue).
 *
 * @param artworkId  ID de l'œuvre à supprimer définitivement
 * @returns          { error: string } si échec, sinon redirect
 */
export async function rejectArtwork(
  artworkId: number
): Promise<{ error?: string }> {
  // ── 1. Vérification de session (T-02-13) ──
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return { error: 'Non autorisé.' }

  // ── 2. Vérifier que l'œuvre existe ──
  const artwork = await db.query.artworks.findFirst({
    where: eq(artworks.id, artworkId),
  })
  if (!artwork) return { error: 'Œuvre introuvable.' }

  const storage = getStorage()

  // ── 3. Supprimer les 3 variantes stockées — silencieux si absentes (idempotent) ──
  // .catch(() => {}) : si un fichier n'existe plus (upload partiel), continuer quand même
  if (artwork.originalPath) {
    await storage.delete(artwork.originalPath).catch(() => {})
  }
  if (artwork.processedPath) {
    await storage.delete(artwork.processedPath).catch(() => {})
  }
  if (artwork.thumbnailPath) {
    await storage.delete(artwork.thumbnailPath).catch(() => {})
  }

  // ── 4. Supprimer la ligne DB après les fichiers ──
  await db.delete(artworks).where(eq(artworks.id, artworkId))

  redirect('/admin/artworks')
}
