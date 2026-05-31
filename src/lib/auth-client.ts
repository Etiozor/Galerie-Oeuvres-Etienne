/**
 * Client Better Auth — utilisé côté navigateur pour la connexion artiste.
 *
 * Le client Better Auth gère automatiquement le cookie de session
 * (contrairement à un fetch manuel qui ne pose pas le cookie).
 */

import { createAuthClient } from 'better-auth/client'

export const authClient = createAuthClient()
