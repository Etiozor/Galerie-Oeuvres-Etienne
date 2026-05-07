/**
 * Gestion des sessions visiteurs — Galerie POF.
 *
 * POURQUOI iron-session et pas les sessions Better Auth ?
 * Better Auth gère les sessions de l'artiste (email + mot de passe).
 * Les visiteurs n'ont pas de mot de passe — ils s'identifient par téléphone.
 * iron-session gère un cookie chiffré AES-256-CBC SÉPARÉ du cookie Better Auth.
 * Les deux coexistent sans conflit sur le même domaine. [AUTH-02, AUTH-03]
 *
 * POURQUOI un cookie chiffré et pas un JWT ?
 * iron-session chiffre côté serveur avec VISITOR_SESSION_SECRET.
 * L'utilisateur ne peut PAS modifier son visitorId sans la clé secrète.
 * Un JWT signé serait lisible en clair côté client (données exposées). [T-04-01-05]
 */

import { getIronSession, type IronSessionOptions } from 'iron-session'
import { cookies } from 'next/headers'

// ── Type de données stockées dans le cookie de session visiteur ──────────────

/**
 * Données stockées dans le cookie chiffré du visiteur.
 *
 * INTENTIONNELLEMENT MINIMAL :
 * - Seuls visitorId et displayName sont stockés — jamais le numéro de téléphone.
 * - Le téléphone reste uniquement en DB (mitigation T-04-01-06).
 * - displayName affiché dans l'UI ne compromet aucune donnée sensible.
 */
export interface VisitorSessionData {
  /** Identifiant DB du visiteur — undefined si le visiteur n'est pas identifié */
  visitorId?: number
  /** Pseudo affiché dans le panel d'une œuvre si la session est active */
  displayName?: string
}

// ── Options du cookie iron-session ──────────────────────────────────────────

/**
 * Validation de la clé secrète au démarrage du module.
 *
 * POURQUOI valider ici et pas dans getVisitorSession() ?
 * Cette vérification s'exécute une seule fois au chargement du module.
 * Si VISITOR_SESSION_SECRET est absent ou trop court, on le signale immédiatement
 * plutôt que de découvrir le problème lors du premier accès d'un visiteur.
 *
 * EXCEPTION pour les tests (NODE_ENV === 'test') :
 * Vitest importe ce module sans contexte Next.js ni variable d'environnement.
 * On laisse passer pour éviter de casser tous les tests qui importent session.ts.
 *
 * EXCEPTION pour le build Next.js (NODE_ENV === 'production' au build time) :
 * Au moment du build, les variables d'env de production ne sont pas forcément présentes.
 * On avertit sans bloquer. L'erreur sera levée à la première requête si manquante.
 */
const secret = process.env.VISITOR_SESSION_SECRET

if (process.env.NODE_ENV !== 'test') {
  if (!secret) {
    console.warn(
      '[session.ts] ATTENTION : VISITOR_SESSION_SECRET est absent. ' +
      'Générer avec : openssl rand -base64 32 et ajouter au .env.local. ' +
      'Les sessions visiteurs ne fonctionneront pas sans cette variable.'
    )
  } else if (secret.length < 32) {
    console.warn(
      `[session.ts] ATTENTION : VISITOR_SESSION_SECRET est trop court (${secret.length} caractères). ` +
      'Minimum requis : 32 caractères pour AES-256-CBC. [T-04-01-03]'
    )
  }
}

/**
 * Configuration du cookie pof_visitor_session.
 *
 * cookieName 'pof_visitor_session' : nom distinct du cookie Better Auth
 * pour qu'ils ne se chevauchent pas. [T-04-01-02]
 *
 * maxAge 365 jours : un visiteur reste identifié pendant 1 an.
 * Évite qu'il doive ressaisir son numéro à chaque visite.
 *
 * httpOnly: true — le cookie n'est pas accessible depuis JavaScript navigateur.
 * Protection contre le vol de session via XSS. [T-04-01-02]
 *
 * sameSite: 'lax' — protection CSRF : le cookie est envoyé sur navigation
 * directe mais pas sur les requêtes cross-site silencieuses. [T-04-01-02]
 */
export const sessionOptions: IronSessionOptions = {
  // Utiliser un fallback vide en cas d'absence — l'erreur sera loguée ci-dessus
  // et levée si quelqu'un tente d'accéder à la session sans la clé.
  password: secret ?? 'fallback-invalide-remplacez-moi-en-production-32chars',
  cookieName: 'pof_visitor_session',
  cookieOptions: {
    httpOnly: true,
    // secure: true uniquement en production — en dev HTTP local, le cookie doit fonctionner
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    // 1 an en secondes = 60s × 60min × 24h × 365j
    maxAge: 60 * 60 * 24 * 365,
  },
}

// ── Helper principal ─────────────────────────────────────────────────────────

/**
 * Récupère (ou crée) la session du visiteur actuel.
 *
 * POURQUOI async et pas sync ?
 * Next.js 15 rend cookies() asynchrone (breaking change vs Next.js 14).
 * Il FAUT utiliser `await cookies()` — `cookies()` synchrone provoque une erreur
 * dans les Server Components et les Server Actions. [Piège 1 RESEARCH.md]
 *
 * USAGE :
 *   // Lecture (Server Component) :
 *   const session = await getVisitorSession()
 *   const visitorId = session.visitorId // undefined si non identifié
 *
 *   // Écriture (Server Action UNIQUEMENT) :
 *   const session = await getVisitorSession()
 *   session.visitorId = 42
 *   await session.save() // JAMAIS dans un Server Component [Piège 2]
 *
 * SÉCURITÉ : session.save() ne doit JAMAIS être appelé dans un Server Component.
 * Les Server Components sont appelés à chaque requête — sauvegarder la session
 * à ce niveau causerait des bugs de concurrence et des failles de sécurité. [T-04-01-02]
 */
export async function getVisitorSession() {
  // CRITIQUE : await cookies() — pas cookies() synchrone (Next.js 15)
  return getIronSession<VisitorSessionData>(await cookies(), sessionOptions)
}
