'use server'

/**
 * Server Actions pour les offres d'achat — Galerie POF.
 *
 * POURQUOI une Server Action et pas une API REST ?
 * Les Server Actions s'exécutent côté serveur, sont appelées directement
 * depuis useActionState dans le formulaire React, et bénéficient du typage
 * TypeScript de bout en bout sans endpoint HTTP séparé.
 *
 * SÉCURITÉ (voir threat model 04-03) :
 * - Zod valide toutes les données FormData côté serveur AVANT tout accès DB (T-04-03-01)
 * - belowFloor calculé depuis la DB côté serveur — jamais côté client (T-04-03-02)
 * - Rate limit via COUNT Drizzle avant INSERT — rejet si >= 3 offres (T-04-03-03)
 * - Garde session : visitorId requis avant tout traitement (T-04-03-04)
 * - Garde statut : artwork.status === 'available' requis (T-04-03-05)
 * - Le message est stocké en texte brut, rendu via React (échappement XSS automatique) (T-04-03-07)
 * - deleteOfferAsAdmin : session artiste requise (T-05-01-01)
 * - deleteOfferAsVisitor : ownership vérifié en DB — jamais côté client
 */

import { z } from 'zod'
import { eq, and, count } from 'drizzle-orm'
import { db } from '@/db'
import { offers, artworks, visitors } from '@/db/schema'
import { getVisitorSession } from '@/lib/session'
import { revalidatePath } from 'next/cache'
import { sendNewOfferEmail } from '@/lib/email'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'

// ── Schéma de validation Zod ─────────────────────────────────────────────────

/**
 * Schéma de validation du formulaire d'offre.
 *
 * POURQUOI z.coerce sur artworkId et amount ?
 * FormData retourne toujours des strings (ex: "42", "300").
 * z.coerce.number() parse automatiquement "150" → 150 sans conversion manuelle.
 * Sans coerce, Zod rejetterait les strings même valides. [Piège FormData, RESEARCH.md]
 *
 * Minimum 1€ sur amount : évite les offres symboliques à 0€ ou 0,50€.
 * Max 500 caractères sur message : évite le spam de messages très longs.
 */
const offerSchema = z.object({
  // ID de l'œuvre — doit être un entier positif (protège contre les IDs trafiqués)
  artworkId: z.coerce.number().int().positive(),

  // Montant en euros — minimum 1€ pour éviter les offres symboliques à 0
  // POURQUOI coerce ? FormData retourne "300" → coerce.number() donne 300
  amount: z.coerce.number().positive().min(1, 'Le montant minimum est 1 €'),

  // Message optionnel — limité pour éviter le spam
  // max(500) avant l'optional() pour que la validation s'applique si le message est fourni
  message: z.string().max(500, 'Message limité à 500 caractères').optional(),
})

// ── Type de retour de submitOffer ────────────────────────────────────────────

/**
 * Type de retour standardisé.
 *
 * POURQUOI retourner belowFloor dans le cas success ?
 * Le composant OfferForm doit afficher un message post-soumission différent
 * si l'offre est sous le prix de base — même si elle est acceptée.
 * Le client reçoit cette information UNIQUEMENT depuis le serveur (T-04-03-02).
 */
type SubmitOfferResult =
  | { success: true; belowFloor: boolean }
  | { success: false; errors: Record<string, string[]> }

// ── submitOffer — Server Action principale ───────────────────────────────────

/**
 * Soumet une offre d'achat pour une œuvre disponible.
 *
 * Flux d'exécution :
 * a. GARDE 1 — Session visiteur : visitorId requis (T-04-03-04)
 * b. PARSE Zod — validation FormData côté serveur (T-04-03-01)
 * c. GARDE 2 — Statut œuvre : status === 'available' requis (T-04-03-05)
 * d. RATE LIMIT — COUNT offres du visiteur pour cette œuvre (T-04-03-03, MARKET-02)
 * e. CALCUL belowFloor — toujours côté serveur depuis la DB (T-04-03-02)
 * f. INSERT — Enregistrer l'offre en base de données
 * g. revalidatePath — Invalider le cache Next.js pour que l'offre soit visible
 * h. Retour { success: true, belowFloor }
 *
 * @param prevState - État précédent requis par useActionState (ignoré ici)
 * @param formData - Données du formulaire soumis depuis OfferForm
 */
export async function submitOffer(
  prevState: unknown,
  formData: FormData
): Promise<SubmitOfferResult> {
  try {
    // ── a. GARDE 1 : Vérifier la session visiteur ─────────────────────────
    // POURQUOI en premier ? Évite tout traitement si le visiteur n'est pas identifié.
    // La session iron-session chiffrée garantit que visitorId ne peut pas être forgé
    // côté client (T-04-03-04).
    const session = await getVisitorSession()

    if (!session.visitorId) {
      // Visiteur non identifié — rejeter avant tout accès DB
      return {
        success: false,
        errors: {
          _form: ['Vous devez être identifié pour soumettre une offre. Veuillez créer un profil.'],
        },
      }
    }

    const visitorId = session.visitorId

    // ── b. PARSE Zod : Valider les données FormData ───────────────────────
    // CRITIQUE : toujours valider côté serveur — les données client ne sont jamais fiables
    // FormData.get() retourne string | null — Zod coerce gère la conversion vers number
    const rawData = {
      artworkId: formData.get('artworkId'),
      amount: formData.get('amount'),
      message: formData.get('message') ?? undefined,
    }

    const parseResult = offerSchema.safeParse(rawData)

    if (!parseResult.success) {
      // Retourner les erreurs Zod par champ pour affichage dans le formulaire
      return {
        success: false,
        errors: parseResult.error.flatten().fieldErrors as Record<string, string[]>,
      }
    }

    const { artworkId, amount, message } = parseResult.data

    // ── c. GARDE 2 : Vérifier le statut de l'œuvre ────────────────────────
    // POURQUOI vérifier en DB et pas se fier au client ?
    // L'artworkId peut être trafiqué et une œuvre peut changer de statut entre
    // le chargement de la page et la soumission du formulaire. (T-04-03-05)
    const artwork = await db.query.artworks.findFirst({
      where: eq(artworks.id, artworkId),
      // POURQUOI ajouter title ici ? Nécessaire pour l'email de notification à l'artiste.
      // On évite une seconde requête DB en récupérant le titre en même temps que le statut.
      columns: { status: true, basePrice: true, title: true },
    })

    if (!artwork || artwork.status !== 'available') {
      // Œuvre introuvable ou non disponible — offre impossible
      return {
        success: false,
        errors: {
          _form: ["Cette œuvre n'est plus disponible à l'achat."],
        },
      }
    }

    // ── d. RATE LIMIT : Compter les offres existantes (MARKET-02) ─────────
    // POURQUOI COUNT en DB et pas en mémoire ?
    // Un cache en mémoire ne résiste pas aux redémarrages du serveur ni aux
    // déploiements multi-instances. La DB est la source de vérité. (T-04-03-03)
    //
    // IMPORTANT : count() retourne un bigint interprété comme string par le driver pg.
    // → Coercion explicite Number(...) nécessaire avant la comparaison.
    const countResult = await db
      .select({ total: count() })
      .from(offers)
      .where(and(eq(offers.visitorId, visitorId), eq(offers.artworkId, artworkId)))

    const existingOfferCount = Number(countResult[0]?.total ?? 0)

    if (existingOfferCount >= 3) {
      // Limite atteinte — rejeter sans INSERT
      return {
        success: false,
        errors: {
          _form: ['Vous avez atteint la limite de 3 offres pour cette œuvre.'],
        },
      }
    }

    // ── e. CALCUL belowFloor — CÔTÉ SERVEUR UNIQUEMENT ────────────────────
    // POURQUOI côté serveur et jamais côté client ?
    // Si belowFloor était calculé côté client (OfferForm), un visiteur pourrait
    // manipuler la valeur et soumettre une offre "au-dessus du plancher" alors
    // qu'elle est réellement sous le prix de base. (T-04-03-02, Piège 5 RESEARCH.md)
    //
    // artwork.basePrice est une string Drizzle numeric (ex: "800.00")
    // parseFloat() la convertit pour la comparaison avec amount (déjà un number via Zod coerce)
    const belowFloor = artwork.basePrice
      ? amount < parseFloat(artwork.basePrice)
      : false
    // Si pas de prix de base défini → pas de plancher → belowFloor = false

    // ── f. INSERT : Enregistrer l'offre en DB ─────────────────────────────
    await db.insert(offers).values({
      artworkId,
      visitorId,
      // Drizzle attend un string pour les colonnes numeric — toString() garantit
      // le bon format même si amount est déjà un number (Zod coerce.number())
      amount: amount.toString(),
      message: message ?? null,
      belowFloor,
    })

    // ── g.1. Notification email à l'artiste — FIRE-AND-FORGET ─────────────
    // POURQUOI fire-and-forget (pas d'await) ?
    // On ne bloque PAS la réponse sur l'envoi d'email. Si Resend est lent ou
    // indisponible, le visiteur ne doit pas attendre ni recevoir une erreur.
    // L'offre est déjà en DB — c'est le seul résultat critique.
    //
    // POURQUOI récupérer le visiteur ici et pas dans la garde 1 ?
    // On a besoin du téléphone pour l'email — cette donnée est PRIVÉE (T-04-04-01).
    // On ne la lit que pour l'email artiste, jamais pour le retour client.
    const visitor = await db.query.visitors.findFirst({
      where: eq(visitors.id, visitorId),
      // SÉCURITÉ : sélectionner UNIQUEMENT les colonnes nécessaires à l'email
      // JAMAIS passer phone dans un retour client ou des props (T-04-04-01)
      columns: { displayName: true, phone: true },
    })

    // Pattern fire-and-forget : pas d'await — la Promise est lancée sans bloquer
    // .catch() capture les exceptions non prévues dans sendNewOfferEmail elle-même
    // (les erreurs Resend sont déjà loggées à l'intérieur de sendNewOfferEmail)
    sendNewOfferEmail({
      artworkTitle: artwork.title,
      visitorName: visitor?.displayName ?? 'Visiteur',
      visitorPhone: visitor?.phone ?? '',
      amount,
      message: message ?? null,
    }).catch((err) =>
      console.error('[submitOffer] sendNewOfferEmail exception inattendue :', err)
    )

    // ── g.2. revalidatePath : Invalider le cache Next.js ─────────────────
    // POURQUOI revalider ? La page détail affiche le nombre d'offres et la meilleure.
    // Sans revalidation, un visiteur verrait l'ancienne valeur pendant maxAge secondes.
    // revalidatePath() force Next.js à regénérer la page au prochain accès.
    revalidatePath(`/artworks/${artworkId}`)

    // ── h. Retour succès avec l'information belowFloor ────────────────────
    // Le client (OfferForm) affiche un message différent si belowFloor est true,
    // mais cette information vient UNIQUEMENT du serveur — jamais calculée côté client.
    return {
      success: true,
      belowFloor,
    }
  } catch (error) {
    // Erreur inattendue (DB indisponible, etc.) — ne jamais exposer les détails
    // au client pour éviter de donner des informations sur l'infrastructure.
    console.error('[submitOffer] Erreur serveur inattendue :', error)
    return {
      success: false,
      errors: {
        _form: ['Une erreur serveur est survenue. Veuillez réessayer dans quelques instants.'],
      },
    }
  }
}

// ── deleteOfferAsAdmin — Suppression par l'artiste ───────────────────────────

/**
 * Supprime une offre depuis l'interface admin.
 *
 * SÉCURITÉ :
 * - Session artiste vérifiée via Better Auth en première ligne (T-05-01-01)
 * - L'offerId est vérifié en DB avant suppression (pas de confiance côté client)
 * - Les deux pages sont revalidées pour que le cache soit à jour
 *
 * @param offerId  ID de l'offre à supprimer (passé via .bind(null, offer.id))
 */
export async function deleteOfferAsAdmin(
  offerId: number
): Promise<{ success: true } | { error: string }> {
  // ── 1. Vérification session artiste — DOIT être la première instruction ──
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return { error: 'Non autorisé.' }

  // ── 2. Récupérer l'offre pour obtenir artworkId (nécessaire pour revalidatePath) ──
  const offer = await db.query.offers.findFirst({
    where: eq(offers.id, offerId),
    columns: { artworkId: true },
  })

  if (!offer) return { error: 'Offre introuvable.' }

  // ── 3. Supprimer l'offre ──
  await db.delete(offers).where(eq(offers.id, offerId))

  // ── 4. Invalider le cache des deux pages concernées ──
  revalidatePath(`/artworks/${offer.artworkId}`)
  revalidatePath(`/admin/artworks/${offer.artworkId}`)

  return { success: true }
}

// ── deleteOfferAsVisitor — Suppression par le visiteur propriétaire ──────────

/**
 * Supprime une offre depuis la galerie publique.
 *
 * SÉCURITÉ :
 * - Session visiteur requise (visitorId depuis iron-session chiffrée)
 * - Ownership vérifié en DB : WHERE id = offerId AND visitorId = session.visitorId
 *   → Un visiteur ne peut jamais supprimer l'offre d'un autre
 * - La double condition dans le DELETE est redondante mais défensive (defense in depth)
 *
 * @param offerId  ID de l'offre à supprimer
 */
export async function deleteOfferAsVisitor(
  offerId: number
): Promise<{ success: true } | { error: string }> {
  // ── 1. Vérification session visiteur ──
  const session = await getVisitorSession()
  if (!session.visitorId) return { error: 'Non autorisé.' }

  // ── 2. Vérifier que l'offre existe ET appartient à ce visiteur ──
  // POURQUOI vérifier en DB et pas se fier à l'offerId seul ?
  // Un visiteur pourrait forger un offerId appartenant à quelqu'un d'autre.
  // La condition AND visitorId = session.visitorId garantit l'ownership côté serveur.
  const offer = await db.query.offers.findFirst({
    where: and(
      eq(offers.id, offerId),
      eq(offers.visitorId, session.visitorId)
    ),
    columns: { artworkId: true },
  })

  if (!offer) return { error: 'Offre introuvable ou non autorisée.' }

  // ── 3. Supprimer avec double condition — defense in depth ──
  await db
    .delete(offers)
    .where(and(eq(offers.id, offerId), eq(offers.visitorId, session.visitorId)))

  // ── 4. Invalider le cache de la page publique ──
  revalidatePath(`/artworks/${offer.artworkId}`)

  return { success: true }
}
