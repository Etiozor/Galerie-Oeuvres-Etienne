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
import { artworks, artworkMediums } from '@/db/schema'
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

// ============================================================
// Schéma Zod pour la mise à jour des métadonnées d'une œuvre
// ============================================================

// POURQUOI z.preprocess et pas z.coerce ?
// z.coerce.number() convertit "" (champ vide) en 0, puis .positive() ou .min(1)
// rejette 0 — bloquant la sauvegarde si un champ est laissé vide.
// toOptionalNumber intercepte "" avant la coercion et retourne undefined,
// ce qui active .optional() correctement.
const toOptionalNumber = (v: unknown) => (v === '' || v == null) ? undefined : Number(v)

const updateArtworkSchema = z.object({
  title: z.string().min(1, 'Le titre est obligatoire.').max(255, 'Titre trop long.'),
  description: z.string().max(2000, 'Description trop longue.').optional(),
  createdYear:      z.preprocess(toOptionalNumber, z.number().int().min(1900).max(2100).optional()),
  createdMonth:     z.preprocess(toOptionalNumber, z.number().int().min(1).max(12).optional()),
  typeId:           z.preprocess(toOptionalNumber, z.number().int().positive().optional()),
  mediumId:         z.preprocess(toOptionalNumber, z.number().int().positive().optional()),
  widthCm:          z.preprocess(toOptionalNumber, z.number().positive().optional()),
  heightCm:         z.preprocess(toOptionalNumber, z.number().positive().optional()),
  basePrice:        z.preprocess(toOptionalNumber, z.number().positive().optional()),
  priceHoursSpent:  z.preprocess(toOptionalNumber, z.number().min(0).optional()),
  priceFormat:      z.preprocess(toOptionalNumber, z.number().min(0).optional()),
  priceFraming:     z.preprocess(toOptionalNumber, z.number().min(0).optional()),
  priceMaterials:   z.preprocess(toOptionalNumber, z.number().min(0).optional()),
  priceTechnicality:z.preprocess(toOptionalNumber, z.number().int().min(1).max(5).optional()),
  priceAttachment:  z.preprocess(toOptionalNumber, z.number().int().min(1).max(5).optional()),
})

/** Type de retour de updateArtwork — compatible avec useActionState */
type UpdateArtworkResult =
  | { success: true }
  | { success: false; errors: Record<string, string[]> }

/**
 * Met à jour les métadonnées d'une œuvre (titre, date, dimensions, prix, etc.).
 *
 * POURQUOI artworkId est passé par .bind(null, artworkId) et non en input caché ?
 * Un input caché côté client peut être falsifié. Binder l'ID côté serveur dans le
 * Server Component parent garantit que seul l'artiste authentifié peut modifier ses œuvres.
 *
 * POURQUOI la signature (artworkId, prevState, formData) ?
 * useActionState exige cette signature — artworkId est bindé comme 1er argument,
 * il arrive donc avant prevState (2e argument useActionState).
 *
 * CRITIQUE numeric → string : les colonnes numeric Drizzle (widthCm, heightCm, basePrice,
 * priceHoursSpent, priceFormat, priceFraming, priceMaterials) attendent une string en
 * écriture malgré leur représentation TypeScript — d'où les .toString().
 * Les colonnes smallint (priceTechnicality, priceAttachment) attendent un number direct.
 *
 * Sécurité (T-05-02) :
 * - T-05-02-01 : auth.api.getSession() EN PREMIERE LIGNE
 * - T-05-02-02 : Zod valide avant tout accès DB (anti-injection)
 * - T-05-02-03 : artworkId bindé côté serveur, jamais en input client
 * - T-05-02-04 : z.string().max(2000) limite la description
 *
 * @param artworkId  ID de l'œuvre à modifier (bindé côté serveur)
 * @param prevState  État précédent de useActionState (ignoré ici)
 * @param formData   Données du formulaire (15 champs)
 * @returns          { success: true } ou { success: false; errors: Record<string, string[]> }
 */
export async function updateArtwork(
  artworkId: number,
  prevState: unknown,
  formData: FormData
): Promise<UpdateArtworkResult> {
  // ── 1. Vérification de session — DOIT être la première instruction (T-05-02-01) ──
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return { success: false, errors: { _form: ['Non autorisé.'] } }

  // ── 2. Validation Zod — rejette toute donnée invalide avant accès DB (T-05-02-02) ──
  // Object.fromEntries(formData) convertit le FormData en objet plain pour safeParse
  const parseResult = updateArtworkSchema.safeParse(Object.fromEntries(formData))
  if (!parseResult.success) {
    return {
      success: false,
      errors: parseResult.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }
  const data = parseResult.data

  try {
    await db.update(artworks)
      .set({
        title: data.title,
        description: data.description ?? null,
        createdYear: data.createdYear ?? null,
        createdMonth: data.createdMonth ?? null,
        typeId: data.typeId ?? null,
        // CRITIQUE : colonnes numeric Drizzle → .toString() OBLIGATOIRE
        // Drizzle attend une string pour les colonnes numeric PostgreSQL,
        // même si le type TypeScript semble être "number | string | null"
        widthCm: data.widthCm?.toString() ?? null,
        heightCm: data.heightCm?.toString() ?? null,
        basePrice: data.basePrice?.toString() ?? null,
        priceHoursSpent: data.priceHoursSpent?.toString() ?? null,
        priceFormat: data.priceFormat?.toString() ?? null,
        priceFraming: data.priceFraming?.toString() ?? null,
        priceMaterials: data.priceMaterials?.toString() ?? null,
        // Colonnes smallint : number direct, PAS de .toString()
        // smallint PostgreSQL attend un entier, pas une string
        priceTechnicality: data.priceTechnicality ?? null,
        priceAttachment: data.priceAttachment ?? null,
      })
      .where(eq(artworks.id, artworkId))

    // ── 4. Invalider le cache des deux routes concernées ──
    // /admin/artworks/[id] : la page détail affiche les métadonnées mises à jour
    // /artworks/[id] : la page publique affiche aussi les métadonnées (ADMIN-01)
    revalidatePath(`/admin/artworks/${artworkId}`)
    revalidatePath(`/artworks/${artworkId}`)

    return { success: true }
  } catch (error) {
    // Ne jamais exposer les détails de l'infrastructure au client (T-05-02-05)
    console.error('[updateArtwork] Erreur serveur inattendue :', error)
    return {
      success: false,
      errors: { _form: ['Une erreur serveur est survenue. Veuillez réessayer.'] },
    }
  }
}

// ============================================================
// Actions légères pour l'édition inline (titre et description)
// ============================================================

/**
 * Met à jour uniquement le titre d'une œuvre — action légère pour l'édition inline.
 * Appelée via startTransition depuis InlineEditField (pas useActionState).
 */
export async function updateArtworkTitle(
  artworkId: number,
  title: string
): Promise<{ success: boolean; error?: string }> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return { success: false, error: 'Non autorisé.' }

  const parsed = z.string().min(1, 'Le titre est obligatoire.').max(255).safeParse(title.trim())
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message }

  await db.update(artworks).set({ title: parsed.data }).where(eq(artworks.id, artworkId))
  revalidatePath(`/admin/artworks/${artworkId}`)
  revalidatePath(`/artworks/${artworkId}`)
  return { success: true }
}

/**
 * Met à jour uniquement la description d'une œuvre — action légère pour l'édition inline.
 */
export async function updateArtworkDescription(
  artworkId: number,
  description: string
): Promise<{ success: boolean; error?: string }> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return { success: false, error: 'Non autorisé.' }

  const parsed = z.string().max(2000, 'Description trop longue.').safeParse(description)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message }

  await db.update(artworks).set({ description: parsed.data || null }).where(eq(artworks.id, artworkId))
  revalidatePath(`/admin/artworks/${artworkId}`)
  revalidatePath(`/artworks/${artworkId}`)
  return { success: true }
}

// ============================================================
// Schéma et action pour le formulaire "métadonnées secondaires"
// (date, type, médium, dimensions, prix — sans titre ni description)
// ============================================================

// mediumId est intentionnellement absent : les médiums multiples sont lus
// via formData.getAll('mediumId') et traités séparément de ce schéma.
const updateArtworkMetaSchema = z.object({
  createdYear:      z.preprocess(toOptionalNumber, z.number().int().min(1900).max(2100).optional()),
  createdMonth:     z.preprocess(toOptionalNumber, z.number().int().min(1).max(12).optional()),
  typeId:           z.preprocess(toOptionalNumber, z.number().int().positive().optional()),
  widthCm:          z.preprocess(toOptionalNumber, z.number().positive().optional()),
  heightCm:         z.preprocess(toOptionalNumber, z.number().positive().optional()),
  basePrice:        z.preprocess(toOptionalNumber, z.number().positive().optional()),
  priceHoursSpent:  z.preprocess(toOptionalNumber, z.number().min(0).optional()),
  priceFormat:      z.preprocess(toOptionalNumber, z.number().min(0).optional()),
  priceFraming:     z.preprocess(toOptionalNumber, z.number().min(0).optional()),
  priceMaterials:   z.preprocess(toOptionalNumber, z.number().min(0).optional()),
  priceTechnicality:z.preprocess(toOptionalNumber, z.number().int().min(1).max(5).optional()),
  priceAttachment:  z.preprocess(toOptionalNumber, z.number().int().min(1).max(5).optional()),
})

/**
 * Met à jour les métadonnées secondaires d'une œuvre (sans titre ni description).
 * Utilisé par le formulaire en bas de page — titre et description sont gérés
 * par l'édition inline via updateArtworkTitle / updateArtworkDescription.
 */
export async function updateArtworkMeta(
  artworkId: number,
  prevState: unknown,
  formData: FormData
): Promise<{ success: true } | { success: false; errors: Record<string, string[]> }> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return { success: false, errors: { _form: ['Non autorisé.'] } }

  const parseResult = updateArtworkMetaSchema.safeParse(Object.fromEntries(formData))
  if (!parseResult.success) {
    return { success: false, errors: parseResult.error.flatten().fieldErrors as Record<string, string[]> }
  }
  const data = parseResult.data

  // Les médiums multiples ne passent pas par Object.fromEntries (dernier value seulement).
  // getAll('mediumId') collecte TOUTES les valeurs cochées, filtre les invalides.
  const mediumIds = formData.getAll('mediumId')
    .map(v => parseInt(String(v), 10))
    .filter(n => !isNaN(n) && n > 0)

  try {
    await db.update(artworks)
      .set({
        createdYear: data.createdYear ?? null,
        createdMonth: data.createdMonth ?? null,
        typeId: data.typeId ?? null,
        widthCm: data.widthCm?.toString() ?? null,
        heightCm: data.heightCm?.toString() ?? null,
        basePrice: data.basePrice?.toString() ?? null,
        priceHoursSpent: data.priceHoursSpent?.toString() ?? null,
        priceFormat: data.priceFormat?.toString() ?? null,
        priceFraming: data.priceFraming?.toString() ?? null,
        priceMaterials: data.priceMaterials?.toString() ?? null,
        priceTechnicality: data.priceTechnicality ?? null,
        priceAttachment: data.priceAttachment ?? null,
      })
      .where(eq(artworks.id, artworkId))

    // Synchroniser la table de jonction artwork_mediums
    await db.delete(artworkMediums).where(eq(artworkMediums.artworkId, artworkId))
    if (mediumIds.length > 0) {
      await db.insert(artworkMediums)
        .values(mediumIds.map(mediumId => ({ artworkId, mediumId })))
        .onConflictDoNothing()
    }

    revalidatePath(`/admin/artworks/${artworkId}`)
    revalidatePath(`/artworks/${artworkId}`)
    revalidatePath('/')
    return { success: true }
  } catch (error) {
    console.error('[updateArtworkMeta] Erreur serveur :', error)
    return { success: false, errors: { _form: ['Erreur serveur. Réessayez.'] } }
  }
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

  // ── 3. Supprimer le fichier stocké — AVANT la DB (T-05-01-02) ──
  // .catch(() => {}) : idempotent — ignore ENOENT si le fichier est déjà absent
  if (artwork.originalPath) {
    await storage.delete(artwork.originalPath).catch(() => {})
  }

  // ── 4. Supprimer la ligne DB après les fichiers ──
  // La cascade FK supprime automatiquement les offres et artwork_tags liés
  await db.delete(artworks).where(eq(artworks.id, artworkId))

  // ── 5. Rediriger vers la liste après suppression ──
  // IMPORTANT : redirect() lève une erreur Next.js — ne pas mettre dans un try/catch
  redirect('/admin/artworks')
}
