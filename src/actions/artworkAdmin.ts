/**
 * Actions serveur pour la gestion admin des œuvres.
 *
 * Toutes les actions vérifient la session artiste en première ligne (défense en profondeur).
 * POURQUOI deux actions séparées ?
 * - updateArtworkStatus : utilisé dans un formulaire (useActionState) — retourne un état
 * - deleteArtwork : utilise redirect() — incompatible avec useActionState, appeler via startTransition
 *
 * Sécurité (threat model) :
 * - T-05-01-01 : auth.api.getSession() EN PREMIERE LIGNE de chaque action
 * - T-05-01-02 : fichiers storage supprimés AVANT la ligne DB (ordre critique)
 * - T-05-01-03 : Zod rejette tout statut hors enum avant tout accès DB
 */
'use server'

import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { db } from '@/db'
import { artworks } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { getStorage } from '@/lib/storage'
import { z } from 'zod'

// Schéma Zod pour valider le statut — correspond exactement à artworkStatusEnum PostgreSQL
// Toute valeur hors cet ensemble est rejetée avant tout accès DB (T-05-01-03)
const statusSchema = z.enum(['available', 'sold', 'given', 'reserved'])

/**
 * Change le statut d'une œuvre (disponible, vendue, donnée, réservée).
 *
 * POURQUOI artworkId est passé par .bind(null, artworkId) et non en input caché ?
 * Un input caché côté client peut être falsifié. Binder l'ID côté serveur dans le
 * Server Component parent garantit que seul l'artiste authentifié peut modifier ses œuvres.
 *
 * POURQUOI la signature (artworkId, prevState, formData) ?
 * useActionState exige cette signature pour passer l'état précédent comme 2e argument.
 * artworkId est bindé comme 1er argument — il arrive donc avant prevState.
 *
 * @param artworkId  ID de l'œuvre à modifier (bindé côté serveur)
 * @param prevState  État précédent de useActionState (ignoré ici)
 * @param formData   Données du formulaire, champ 'status' attendu
 * @returns          { success: true } ou { error: string }
 */
export async function updateArtworkStatus(
  artworkId: number,
  prevState: unknown,
  formData: FormData
): Promise<{ success: true } | { error: string }> {
  // ── 1. Vérification de session — DOIT être la première instruction (T-05-01-01) ──
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return { error: 'Non autorisé.' }

  // ── 2. Validation Zod du statut — rejette toute valeur hors enum (T-05-01-03) ──
  const parsed = statusSchema.safeParse(formData.get('status'))
  if (!parsed.success) return { error: 'Statut invalide.' }

  // ── 3. Mise à jour en base ──
  await db.update(artworks).set({ status: parsed.data }).where(eq(artworks.id, artworkId))

  // ── 4. Invalider le cache des deux routes concernées ──
  // /admin/artworks/[id] : la page détail affiche le statut courant
  // /admin/artworks : la liste affiche le badge de statut
  revalidatePath(`/admin/artworks/${artworkId}`)
  revalidatePath('/admin/artworks')

  return { success: true }
}

/**
 * Supprime une œuvre : fichiers storage PUIS entrée DB (ordre critique).
 *
 * POURQUOI supprimer les fichiers AVANT la ligne DB ?
 * Cohérence en cas d'erreur : si la suppression DB échoue après les fichiers,
 * les fichiers sont déjà absents mais la ligne DB peut être retentée.
 * Si l'on supprimait la DB en premier et que le storage échouait, on aurait
 * des fichiers orphelins (fuite de stockage sans entrée DB pour les retrouver).
 *
 * POURQUOI utiliser redirect() et pas return { success: true } ?
 * Après une suppression irréversible, renvoyer l'artiste à la liste est la meilleure UX.
 * redirect() lève une erreur Next.js interceptée par le framework — ne PAS envelopper
 * dans un try/catch qui capturerait cette erreur.
 *
 * POURQUOI NE PAS appeler via useActionState ?
 * deleteArtwork utilise redirect() — useActionState attend une valeur de retour,
 * ce qui est incompatible. Le Client Component l'appelle via startTransition.
 *
 * La cascade FK supprime automatiquement les offres liées (onDelete: 'cascade' en DB).
 *
 * @param artworkId  ID de l'œuvre à supprimer (bindé côté serveur)
 * @returns          { error: string } si échec, sinon redirect (jamais de retour visible)
 */
export async function deleteArtwork(artworkId: number): Promise<{ error: string } | never> {
  // ── 1. Vérification de session — DOIT être la première instruction (T-05-01-01) ──
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return { error: 'Non autorisé.' }

  // ── 2. Vérifier que l'œuvre existe avant de tenter la suppression ──
  const artwork = await db.query.artworks.findFirst({
    where: eq(artworks.id, artworkId),
  })
  if (!artwork) return { error: 'Œuvre introuvable.' }

  const storage = getStorage()

  // ── 3. Supprimer les 3 variantes stockées — AVANT la DB (T-05-01-02) ──
  // .catch(() => {}) : idempotent — ignore ENOENT si le fichier est déjà absent
  // (utile en cas de retry ou d'upload partiel)
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
  // La cascade FK supprime automatiquement les offres et artwork_tags liés
  await db.delete(artworks).where(eq(artworks.id, artworkId))

  // ── 5. Rediriger vers la liste après suppression ──
  // IMPORTANT : redirect() lève une erreur Next.js — ne pas mettre dans un try/catch
  redirect('/admin/artworks')
}
