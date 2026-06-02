/**
 * Configuration Better Auth — authentification de l'artiste.
 *
 * Better Auth gère :
 * - La création et vérification des sessions (cookies httpOnly signés)
 * - Le hashage sécurisé des mots de passe (bcrypt intégré)
 * - Ses propres tables en base (user, session, account) via le Drizzle adapter
 *
 * [D-05] : email + mot de passe uniquement, pas de magic link ni OAuth
 */

import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { db } from '@/db'
import * as schema from '@/db/schema'

export const auth = betterAuth({
  // URL de base — indispensable pour que Better Auth construise correctement
  // les cookies et les redirections en production.
  baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:3000',

  // Origines autorisées à faire des requêtes auth (CORS + cookie samesite).
  // Inclure toutes les URLs possibles : locale, Railway, et toute URL custom.
  trustedOrigins: [
    process.env.BETTER_AUTH_URL ?? 'http://localhost:3000',
    'http://localhost:3000',
    ...(process.env.RAILWAY_PUBLIC_DOMAIN
      ? [`https://${process.env.RAILWAY_PUBLIC_DOMAIN}`]
      : []),
  ],

  database: drizzleAdapter(db, {
    provider: 'pg',
    schema,
  }),

  emailAndPassword: {
    enabled: true,
  },
})
