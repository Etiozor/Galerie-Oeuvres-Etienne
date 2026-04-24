/**
 * Route API Better Auth — capture toutes les requêtes /api/auth/*.
 *
 * Better Auth expose plusieurs endpoints sous /api/auth/ :
 * - POST /api/auth/sign-in/email — connexion avec email + mot de passe
 * - POST /api/auth/sign-out — déconnexion
 * - GET  /api/auth/session  — vérification de la session active
 * - POST /api/auth/sign-up/email — inscription (désactivée côté UI pour l'artiste)
 *
 * toNextJsHandler() convertit l'objet auth en handlers GET/POST compatibles
 * avec le format Route Handler de Next.js 15 App Router.
 *
 * Le fichier [...all] capture tous les sous-chemins (route catch-all).
 */

import { toNextJsHandler } from 'better-auth/next-js'
import { auth } from '@/lib/auth'

// Export des handlers GET et POST — Next.js route les requêtes automatiquement
export const { GET, POST } = toNextJsHandler(auth)
