import type { Config } from 'drizzle-kit'

/**
 * Configuration de Drizzle Kit.
 *
 * Drizzle Kit est l'outil qui gère les migrations de base de données.
 * Il lit ce fichier pour savoir :
 * - Où trouver le schéma (nos définitions de tables)
 * - À quelle base de données se connecter
 * - Où stocker les fichiers de migration générés
 *
 * COMMANDES UTILES :
 *   npm run db:push    → appliquer le schéma directement sur la base (développement)
 *   npm run db:studio  → ouvrir l'explorateur visuel de la base de données
 *   npm run db:seed    → peupler la base avec des données de test
 */
export default {
  // Chemin vers le fichier qui définit toutes nos tables
  schema: './src/db/schema.ts',

  // Dossier où Drizzle Kit stockera les fichiers de migration SQL
  // Ces fichiers décrivent les changements à appliquer à la base
  out: './drizzle',

  // Type de base de données : PostgreSQL
  dialect: 'postgresql',

  // URL de connexion — lue depuis les variables d'environnement
  // En développement : définie dans .env.local
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config
