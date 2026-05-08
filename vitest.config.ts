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
 * Deux environnements :
 * - "node" : tests Server Actions (pas de DOM — accès cookies, DB, etc.)
 * - "jsdom" : tests composants React (rendu DOM simulé pour @testing-library)
 *   Appliqué automatiquement via environmentMatchGlobs sur les dossiers concernés.
 */
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    // Environnement par défaut : Node.js (Server Actions, logique métier)
    environment: 'node',
    // Globals true = pas besoin d'importer describe/it/expect dans chaque fichier de test
    globals: true,
    // Environnement jsdom pour les fichiers de test de composants React
    // POURQUOI environmentMatchGlobs ? Permet d'avoir Node pour les Server Actions
    // et jsdom pour les composants — sans créer deux configs séparées.
    environmentMatchGlobs: [
      ['tests/offers/**', 'jsdom'],
    ],
  },
  resolve: {
    alias: {
      // Résolution de l'alias TypeScript "@" → "./src" (identique à tsconfig.json)
      '@': path.resolve(__dirname, './src'),
    },
  },
})
