/**
 * Configuration de Vitest — framework de test pour la Galerie POF.
 *
 * POURQUOI Vitest et pas Jest ?
 * Vitest est compatible nativement avec les modules ESM et TypeScript
 * sans configuration Babel supplémentaire. Il est plus rapide à démarrer
 * et partage la même syntaxe que Jest (describe, it, expect, vi).
 *
 * L'alias "@" → "./src" reproduit la même résolution que Next.js,
 * ce qui permet d'importer @/actions/upload dans les tests exactement
 * comme dans le code applicatif.
 *
 * Deux environnements coexistent :
 * - "node" (défaut) : tests Server Actions, logique métier — pas de DOM
 * - "jsdom" : tests composants React — déclaré par directive en tête de fichier
 *   Exemple : // @vitest-environment jsdom (voir tests/offers/pricebreakdown.test.ts)
 *
 * POURQUOI @vitejs/plugin-react ?
 * Nécessaire pour transformer le JSX dans les tests de composants React.
 * Sans ce plugin, Vitest ne comprend pas la syntaxe JSX/TSX dans les tests.
 */
import { defineConfig, configDefaults } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    // Environnement par défaut : Node.js (Server Actions, accès cookies, DB)
    environment: 'node',
    // Globals true = pas besoin d'importer describe/it/expect dans chaque fichier
    globals: true,
    // Exclure le dossier e2e/ : ce sont des tests Playwright (vrai navigateur),
    // pas des tests Vitest. Ils se lancent avec `npm run test:e2e`.
    exclude: [...configDefaults.exclude, 'e2e/**'],
    // Variables d'environnement factices pour les tests unitaires.
    // POURQUOI ? Certains modules (ex: @/db) exigent DATABASE_URL dès l'import,
    // et Better Auth / iron-session exigent un secret. Ces tests sont MOCKÉS —
    // ils ne se connectent jamais réellement (le pool pg est paresseux) — mais
    // les modules doivent pouvoir s'importer. Ces valeurs rendent `npm test`
    // autonome : pas besoin de base de données ni de .env pour lancer les tests.
    env: {
      DATABASE_URL: 'postgres://test:test@localhost:5432/test',
      BETTER_AUTH_SECRET: 'test-secret-for-vitest-only-32-characters',
      BETTER_AUTH_URL: 'http://localhost:3000',
      VISITOR_SESSION_SECRET: 'test-visitor-session-secret-32-characters',
    },
  },
  resolve: {
    alias: {
      // Résolution de l'alias TypeScript "@" → "./src" (identique à tsconfig.json)
      '@': path.resolve(__dirname, './src'),
    },
  },
})
