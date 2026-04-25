/**
 * Configuration Better Auth — authentification de l'artiste.
 *
 * Better Auth gère :
 * - La création et vérification des sessions (cookies httpOnly signés)
 * - Le hashage sécurisé des mots de passe (bcrypt intégré)
 * - Ses propres tables en base (user, session, account) via le Drizzle adapter
 *
 * POURQUOI Better Auth et pas NextAuth ?
 * Better Auth est plus simple pour un usage email+mot de passe seul,
 * et son adapter Drizzle s'intègre directement avec notre pool PostgreSQL
 * existant — pas besoin d'une connexion séparée.
 *
 * [D-05] : email + mot de passe uniquement, pas de magic link ni OAuth
 */

import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { db } from '@/db'
import * as schema from '@/db/schema'

export const auth = betterAuth({
  // Connexion à PostgreSQL via le pool Drizzle existant.
  // On passe le schéma complet pour que Better Auth trouve ses tables
  // (user, session, account, verification) définies dans schema.ts.
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema, // Better Auth lit les tables user/session/account/verification ici
  }),

  // Activation de l'authentification par email + mot de passe [D-05]
  // Les magic links et OAuth sont désactivés — usage personnel simple
  emailAndPassword: {
    enabled: true,
  },

  // Better Auth lit automatiquement BETTER_AUTH_SECRET et BETTER_AUTH_URL
  // depuis les variables d'environnement Next.js
})
