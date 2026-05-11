/**
 * Module email de la Galerie POF — notifications à l'artiste.
 *
 * Ce module est SERVEUR UNIQUEMENT (pas de directive 'use client').
 * POURQUOI ? La clé API Resend est secrète — elle ne doit jamais figurer
 * dans le bundle navigateur. Si ce fichier était importé depuis un Client Component,
 * Next.js l'inclurait dans le JS côté client, exposant la clé. (T-04-04-02)
 *
 * Utilisation correcte : importer uniquement depuis des Server Actions,
 * des Server Components, ou des Route Handlers.
 */
import { Resend } from 'resend'

// ── Instance Resend au niveau module ────────────────────────────────────────

/**
 * Client Resend instancié UNE SEULE FOIS au niveau module.
 *
 * POURQUOI au niveau module et pas dans la fonction sendNewOfferEmail ?
 * En serverless (Vercel, Railway), les modules Node.js sont mis en cache
 * entre les invocations "chaudes" (warm starts). Si on créait le client
 * dans la fonction, on instancierait une nouvelle connexion HTTPS à chaque
 * appel Server Action — inutile et légèrement plus lent.
 * L'instance module-level est réutilisée gratuitement. [RESEARCH.md Piège 3]
 *
 * SÉCURITÉ : RESEND_API_KEY est une variable d'environnement côté serveur.
 * Next.js ne l'inclut JAMAIS dans le bundle client. (T-04-04-02)
 *
 * POURQUOI null et pas new Resend(undefined) ?
 * Le constructeur Resend lève une exception si la clé est absente — ce qui plante
 * le module entier au chargement et empêche la page d'œuvre de s'afficher.
 * On préfère désactiver silencieusement les emails et laisser les offres fonctionner.
 */
const RESEND_API_KEY = process.env.RESEND_API_KEY

if (!RESEND_API_KEY && process.env.NODE_ENV !== 'test') {
  console.warn(
    '[email.ts] RESEND_API_KEY absent — les notifications email sont désactivées. ' +
    'Ajouter RESEND_API_KEY dans .env.local pour activer les emails (Phase 6 pour la prod).'
  )
}

// null si la clé est absente — sendNewOfferEmail vérifie avant d'envoyer
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null

// ── Constantes d'email ──────────────────────────────────────────────────────

/**
 * Adresse email de réception des notifications d'offres.
 *
 * POURQUOI une valeur par défaut ?
 * En développement, la variable d'environnement ARTIST_EMAIL peut ne pas être
 * configurée dans le .env.local. La valeur par défaut permet de ne pas planter
 * l'application et d'envoyer quand même l'email au bon destinataire.
 *
 * SÉCURITÉ : ARTIST_EMAIL est une constante serveur — jamais passée en props
 * à un Client Component (T-04-04-03).
 */
const ARTIST_EMAIL = process.env.ARTIST_EMAIL ?? 'etienne.le.pironnec1@gmail.com'

/**
 * Adresse expéditrice selon l'environnement.
 *
 * POURQUOI deux adresses différentes ?
 * Resend impose de vérifier un domaine pour envoyer depuis une adresse personnalisée.
 * En développement, 'onboarding@resend.dev' est une adresse sandbox qui fonctionne
 * sans vérification de domaine — pratique pour tester.
 * En production (Phase 6), on utilisera notifications@galeriepof.fr après
 * avoir vérifié le domaine galeriepof.fr dans le tableau de bord Resend.
 */
const FROM_EMAIL =
  process.env.NODE_ENV === 'production'
    ? 'Galerie POF <notifications@galeriepof.fr>'
    : 'Galerie POF <onboarding@resend.dev>'

// ── sendNewOfferEmail ───────────────────────────────────────────────────────

/**
 * Envoie un email de notification à l'artiste quand une nouvelle offre est soumise.
 *
 * POURQUOI envoyer un email et pas juste une notification dans l'admin ?
 * L'artiste peut recevoir des offres à tout moment — il ne consulte pas son
 * back-office en permanence. L'email garantit une réactivité maximale pour
 * ne pas rater une opportunité de vente.
 *
 * SÉCURITÉ — données incluses dans l'email :
 * - Le numéro de téléphone du visiteur EST inclus dans l'email privé artiste.
 *   C'est le seul moyen pour l'artiste de contacter l'acheteur potentiel.
 *   Le téléphone n'est JAMAIS exposé publiquement sur le site. (T-04-04-01)
 *   L'email est transmis via TLS par Resend — risque résiduel acceptable. (T-04-04-05)
 *
 * ARCHITECTURE — pourquoi cette fonction ne throw pas ?
 * Si Resend est temporairement indisponible (quota dépassé, réseau),
 * on log l'erreur côté serveur SANS la propager à l'appelant.
 * L'offre est déjà enregistrée en DB — c'est l'essentiel.
 * Bloquer la réponse pour un problème email serait disproportionné. (T-04-04-04)
 *
 * @param params.artworkTitle - Titre de l'œuvre concernée
 * @param params.visitorName - Pseudo du visiteur (displayName, pas le téléphone)
 * @param params.visitorPhone - Numéro de téléphone (canal privé artiste uniquement)
 * @param params.amount - Montant proposé en euros
 * @param params.message - Message optionnel du visiteur
 */
export async function sendNewOfferEmail(params: {
  artworkTitle: string
  visitorName: string
  visitorPhone: string
  amount: number
  message?: string | null
}): Promise<void> {
  // Construire le corps de l'email en texte brut
  // POURQUOI texte brut et pas HTML ? Plus simple, plus fiable, aucun rendu CSS nécessaire
  // pour une notification interne à l'artiste.
  const lines = [
    `Nouvelle offre reçue pour "${params.artworkTitle}"`,
    ``,
    `Visiteur : ${params.visitorName}`,
    // Téléphone inclus ICI UNIQUEMENT — canal email privé artiste (T-04-04-01)
    `Téléphone : ${params.visitorPhone}`,
    `Montant proposé : ${params.amount.toLocaleString('fr-FR')} €`,
    // Message du visiteur inclus seulement s'il en a rédigé un
    params.message ? `Message : ${params.message}` : null,
    ``,
    `Connectez-vous à votre back-office pour gérer cette offre.`,
  ].filter(Boolean) as string[]

  // Si la clé API est absente, on ne peut pas envoyer — log et retour silencieux.
  // L'offre est déjà en DB, c'est l'essentiel. L'email est optionnel en dev.
  if (!resend) {
    console.warn('[sendNewOfferEmail] Resend non initialisé (RESEND_API_KEY absent) — email ignoré.')
    return
  }

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: ARTIST_EMAIL,
    subject: `Nouvelle offre — ${params.artworkTitle}`,
    text: lines.join('\n'),
  })

  // POURQUOI ne pas throw si error est présent ?
  // L'offre est déjà en DB — c'est la donnée critique.
  // Un email raté ne doit pas faire croire à l'utilisateur que son offre a échoué.
  // On log pour que l'artiste puisse diagnostiquer si les emails n'arrivent plus.
  if (error) {
    console.error('[sendNewOfferEmail] Erreur Resend :', error)
  }
}
