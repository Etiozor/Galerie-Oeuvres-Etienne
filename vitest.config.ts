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
 */
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    // Environnement Node.js (pas de DOM simulé) — les Server Actions s'exécutent côté serveur
    environment: 'node',
    // Globals true = pas besoin d'importer describe/it/expect dans chaque fichier de test
    globals: true,
  },
  resolve: {
    alias: {
      // Résolution de l'alias TypeScript "@" → "./src" (identique à tsconfig.json)
      '@': path.resolve(__dirname, './src'),
    },
  },
})
