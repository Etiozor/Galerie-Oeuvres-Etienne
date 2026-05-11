'use server'

/**
 * Server Actions pour la gestion des profils visiteurs — Galerie POF.
 *
 * POURQUOI des Server Actions et pas une API REST ?
 * Les Server Actions s'exécutent côté serveur et sont appelées directement
 * depuis le formulaire React via useActionState. Pas besoin d'un endpoint
 * /api/visitors séparé — le typage TypeScript s'applique de bout en bout.
 *
 * SÉCURITÉ :
 * - Toutes les données FormData passent par Zod AVANT tout accès DB (T-04-01-01)
 * - session.save() est appelé UNIQUEMENT ici, jamais dans un Server Component (T-04-01-02)
 * - Le téléphone n'est jamais exposé côté client — seul displayName est en session (T-04-01-06)
 */

import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/db'
import { visitors } from '@/db/schema'
import { getVisitorSession } from '@/lib/session'

// ── Schéma de validation Zod ─────────────────────────────────────────────────

/**
 * Schéma de validation du formulaire d'identification visiteur.
 *
 * POURQUOI z.e164() et pas une regex ?
 * z.e164() valide le format international E.164 (+33612345678, +32497..., etc.)
 * C'est le standard normalisé par l'ITU pour les numéros de téléphone mondiaux.
 * Une regex maison serait complexe à maintenir et raterait des cas limites.
 * Zod v4 intègre cette validation — zéro dépendance supplémentaire. [Pattern 2 RESEARCH.md]
 *
 * Format E.164 : + suivi de 1 à 15 chiffres (indicatif pays + numéro)
 * Valide : +33612345678, +32497123456, +447911123456
 * Invalide : 0612345678 (pas d'indicatif), +33abc (non numérique)
 */
const visitorProfileSchema = z.object({
  displayName: z
    .string()
    .min(2, 'Le pseudo doit faire au moins 2 caractères')
    .max(100, 'Le pseudo ne peut pas dépasser 100 caractères'),

  phone: z.e164(
    'Téléphone invalide — inclure l\'indicatif pays, ex: +33612345678'
  ),

  // Email optionnel — s'il est fourni, il doit être valide ; sinon, on l'ignore
  email: z.string().email('Email invalide').optional().or(z.literal('')),
})

// ── Type de retour des Server Actions ────────────────────────────────────────

/**
 * Type de retour standardisé pour createOrLoginVisitor.
 *
 * POURQUOI un type union avec success: true/false ?
 * useActionState dans le composant peut discriminer avec un if (state.success)
 * pour afficher soit le message de succès, soit les erreurs de champ.
 * C'est le pattern React 19 recommandé pour les Server Actions. [RESEARCH.md]
 */
type ActionResult =
  | { success: true }
  | { success: false; errors: Record<string, string[]> }

// ── createOrLoginVisitor ─────────────────────────────────────────────────────

/**
 * Identifie un visiteur par pseudo + téléphone.
 *
 * Logique upsert :
 * 1. Valider les données FormData via Zod (rejet immédiat si invalide)
 * 2. Chercher un visiteur existant avec ce numéro de téléphone
 *    → Trouvé  : utiliser son ID (AUTH-03 — pas de doublon)
 *    → Pas trouvé : créer un nouveau visiteur en DB
 * 3. Stocker visitorId + displayName dans le cookie chiffré iron-session
 * 4. Retourner { success: true }
 *
 * SÉCURITÉ :
 * - Zod parse côté serveur AVANT tout accès aux champs (T-04-01-01)
 * - session.save() UNIQUEMENT ici — jamais dans un Server Component (T-04-01-02)
 * - Le téléphone n'est JAMAIS stocké en session (T-04-01-06)
 *
 * @param prevState - État précédent (requis par useActionState, ignoré ici)
 * @param formData - Données du formulaire soumis
 */
export async function createOrLoginVisitor(
  prevState: unknown,
  formData: FormData
): Promise<ActionResult> {
  try {
    // ── Étape 1 : Extraire les valeurs brutes du FormData ─────────────────
    const rawData = {
      displayName: formData.get('displayName') as string,
      phone: formData.get('phone') as string,
      email: (formData.get('email') as string) ?? '',
    }

    // ── Étape 2 : Valider via Zod — rejet si invalide ────────────────────
    // CRITIQUE : parse côté serveur avant tout accès à la DB (T-04-01-01)
    const parseResult = visitorProfileSchema.safeParse(rawData)

    if (!parseResult.success) {
      return {
        success: false,
        errors: parseResult.error.flatten().fieldErrors as Record<string, string[]>,
      }
    }

    const { displayName, phone, email } = parseResult.data

    // Normaliser l'email : chaîne vide → undefined (ne pas stocker '' en DB)
    const normalizedEmail = email === '' ? undefined : email

    // ── Étape 3 : Lookup visiteur existant par téléphone (AUTH-03) ────────
    // Le téléphone est unique en DB — un seul visiteur peut avoir ce numéro
    const existingVisitors = await db
      .select()
      .from(visitors)
      .where(eq(visitors.phone, phone))
      .limit(1)

    let visitorId: number
    let visitorDisplayName: string

    if (existingVisitors.length > 0 && existingVisitors[0]) {
      // Visiteur existant — on utilise son ID sans créer de doublon (AUTH-03)
      const existing = existingVisitors[0]
      visitorId = existing.id
      // POURQUOI garder l'ancien displayName ? Cohérence de l'historique des offres.
      // Le visiteur retrouve son profil tel qu'il était lors de sa première visite.
      visitorDisplayName = existing.displayName
    } else {
      // Nouveau visiteur — INSERT en DB
      const inserted = await db
        .insert(visitors)
        .values({
          displayName,
          phone,
          email: normalizedEmail,
        })
        .returning()

      const newVisitor = inserted[0]
      if (!newVisitor) {
        throw new Error('INSERT visiteur n\'a retourné aucune ligne — erreur DB inattendue')
      }
      visitorId = newVisitor.id
      visitorDisplayName = newVisitor.displayName
    }

    // ── Étape 4 : Stocker la session dans le cookie chiffré ───────────────
    // POURQUOI await getVisitorSession() ici et pas en haut ?
    // iron-session nécessite le contexte de requête Next.js pour lire les cookies.
    // On l'appelle le plus tard possible, après la validation, pour éviter
    // des appels inutiles si Zod rejette les données.
    const session = await getVisitorSession()

    // Assigner les données à la session (JAMAIS le numéro de téléphone — T-04-01-06)
    session.visitorId = visitorId
    session.displayName = visitorDisplayName

    // session.save() UNIQUEMENT dans une Server Action — jamais dans un Server Component
    // POURQUOI ? Les Server Components ne doivent pas muter l'état des cookies. [Piège 2]
    await session.save()

    // Revalider toutes les pages d'œuvres pour que la session visiteur soit relue côté serveur.
    // POURQUOI revalidatePath('/artworks', 'layout') ?
    // Sans revalidation, le Server Component page.tsx lit session.visitorId = undefined même
    // après un login réussi (il a été rendu avant la soumission). revalidatePath force Next.js
    // à re-exécuter le Server Component avec les cookies mis à jour → OfferSection reçoit
    // visitorId défini → affiche OfferForm au lieu du bouton "S'identifier". (WR-03)
    //
    // EXCEPTION tests : revalidatePath nécessite le contexte de requête Next.js (static store).
    // En Vitest il n'existe pas — même guard que session.ts pour le secret.
    if (process.env.NODE_ENV !== 'test') {
      revalidatePath('/artworks', 'layout')
    }

    return { success: true }
  } catch (error) {
    // Erreur inattendue (DB down, etc.) — ne jamais exposer les détails au client
    console.error('[createOrLoginVisitor] Erreur serveur :', error)
    return {
      success: false,
      errors: { _form: ['Une erreur serveur est survenue. Veuillez réessayer.'] },
    }
  }
}

// ── logoutVisitor ────────────────────────────────────────────────────────────

/**
 * Déconnecte le visiteur en effaçant le cookie de session.
 *
 * POURQUOI session.destroy() et pas session.save() avec données vides ?
 * destroy() supprime le cookie côté client ET invalide la session serveur.
 * Réinitialiser manuellement les champs laisserait un cookie vide mais valide.
 *
 * Usage futur : bouton "Se déconnecter" dans le panel visiteur (Phase 4-03+).
 */
export async function logoutVisitor(): Promise<{ success: true }> {
  const session = await getVisitorSession()
  // Effacer le cookie pof_visitor_session — le visiteur redevient anonyme
  await session.destroy()
  return { success: true }
}
