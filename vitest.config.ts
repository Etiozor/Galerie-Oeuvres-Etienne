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
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    // Environnement par défaut : Node.js (Server Actions, accès cookies, DB)
    environment: 'node',
    // Globals true = pas besoin d'importer describe/it/expect dans chaque fichier
    globals: true,
  },
  resolve: {
    alias: {
      // Résolution de l'alias TypeScript "@" → "./src" (identique à tsconfig.json)
      '@': path.resolve(__dirname, './src'),
    },
  },
})
