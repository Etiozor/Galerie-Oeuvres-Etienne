'use server'
/**
 * Actions serveur pour la gestion des favoris visiteur (table saved_artworks).
 *
 * POURQUOI des Server Actions ?
 * Les Server Actions s'exécutent côté serveur — le visitorId est lu depuis la session
 * chiffrée iron-session, jamais depuis le client. Cela garantit que seul le visiteur
 * lui-même peut modifier ses favoris. [T-05-04-04]
 *
 * SÉCURITÉ : vérification session visiteur en première ligne — T-05-04-04.
 */
import { and, eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/db'
import { savedArtworks } from '@/db/schema'
import { getVisitorSession } from '@/lib/session'

// ── Type de retour ───────────────────────────────────────────────────────────

/**
 * Résultat typé de toggleSavedArtwork.
 * - success: true + saved: true → favori ajouté
 * - success: true + saved: false → favori retiré
 * - success: false + errors → non autorisé ou erreur serveur
 */
type ToggleResult =
  | { success: true; saved: boolean }
  | { success: false; errors: Record<string, string[]> }

// ── toggleSavedArtwork ───────────────────────────────────────────────────────

/**
 * Ajoute ou retire une œuvre des favoris du visiteur connecté.
 *
 * IDEMPOTENCE : si le favori existe → supprime ; sinon → insère.
 * Pas d'upsert PostgreSQL : on a besoin de connaître l'état AVANT pour retourner
 * le bon résultat (saved: true/false) au Client Component SaveButton.
 *
 * PARALLÉLISME : revalidatePath invalide le cache des deux routes concernées
 * pour que le Server Component relise l'état depuis la DB à la prochaine requête.
 *
 * Sécurité : getVisitorSession() vérifié en première ligne — T-05-04.
 *
 * @param artworkId - ID de l'œuvre à basculer dans les favoris
 */
export async function toggleSavedArtwork(artworkId: number): Promise<ToggleResult> {
  // ── Guard session — T-05-04-04 ───────────────────────────────────────────
  const session = await getVisitorSession()

  if (!session.visitorId) {
    return {
      success: false,
      errors: { _form: ['Identifiez-vous pour enregistrer une œuvre.'] },
    }
  }

  const visitorId = session.visitorId

  try {
    // ── Vérifier si le favori existe déjà ───────────────────────────────────
    const existing = await db
      .select()
      .from(savedArtworks)
      .where(and(
        eq(savedArtworks.visitorId, visitorId),
        eq(savedArtworks.artworkId, artworkId),
      ))
      .limit(1)

    if (existing.length > 0) {
      // ── Favori existant → supprimer ────────────────────────────────────────
      await db.delete(savedArtworks)
        .where(and(
          eq(savedArtworks.visitorId, visitorId),
          eq(savedArtworks.artworkId, artworkId),
        ))
    } else {
      // ── Favori absent → insérer ────────────────────────────────────────────
      await db.insert(savedArtworks).values({ visitorId, artworkId })
    }

    // ── Invalider le cache — page détail de l'œuvre + page profil ──────────
    revalidatePath(`/artworks/${artworkId}`)
    revalidatePath('/mon-profil')

    // saved: true si on vient d'insérer (existing était vide)
    return { success: true, saved: existing.length === 0 }

  } catch (error) {
    console.error('[toggleSavedArtwork] Erreur serveur :', error)
    return {
      success: false,
      errors: { _form: ['Une erreur serveur est survenue. Veuillez réessayer.'] },
    }
  }
}
