/**
 * Configuration Playwright — tests end-to-end (E2E) de la Galerie POF.
 *
 * POURQUOI Playwright et pas seulement Vitest ?
 * Vitest teste la LOGIQUE (Server Actions, formatage, filtres) avec des mocks.
 * Il ne rend jamais une vraie page dans un navigateur, donc il ne peut PAS
 * détecter un bug d'affichage — par exemple une page admin qui déborde en
 * largeur sur mobile. Playwright lance un vrai navigateur et mesure la page
 * réelle : c'est le seul moyen d'attraper ce type de régression visuelle.
 *
 * Deux tailles d'écran sont testées (« projects ») :
 * - mobile  : 390×844 (iPhone 12) — reproduit l'usage principal du site
 * - desktop : 1280×800 — vérifie la grille masonry
 *
 * webServer : Playwright démarre l'application automatiquement avant les tests
 * et l'arrête après. En local, si un serveur tourne déjà (npm run dev), il est
 * réutilisé. Le serveur a besoin de DATABASE_URL — Next.js lit .env.local
 * automatiquement en local ; en CI, les variables sont fournies par le workflow.
 */
import { defineConfig, devices } from '@playwright/test'

const PORT = 3000
const baseURL = `http://localhost:${PORT}`

export default defineConfig({
  testDir: './e2e',
  // 60s par test : en mode dev, la première compilation d'une page lourde
  // (ex. /admin/artworks) peut être longue. En CI (build de prod), c'est rapide.
  timeout: 60_000,
  // En CI, échoue si un test.only a été oublié dans le code.
  forbidOnly: !!process.env.CI,
  // En CI, réessaie une fois (démarrages de serveur parfois lents) ; 0 en local.
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',

  use: {
    baseURL,
    // Capture une trace au premier échec pour diagnostiquer visuellement.
    trace: 'on-first-retry',
  },

  projects: [
    {
      // Mobile = Chromium avec un viewport étroit (largeur d'un téléphone).
      // POURQUOI pas devices['iPhone 12'] ? Ce descripteur force le moteur WebKit
      // (Safari), qu'il faudrait installer en plus. Pour détecter un débordement
      // horizontal, seule la LARGEUR compte (les media queries CSS réagissent à la
      // largeur) — Chromium à 390px reproduit fidèlement la mise en page mobile.
      name: 'mobile',
      use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 } },
    },
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
    },
  ],

  webServer: {
    // En CI : mode production (`next start`) — l'app est déjà buildée par le
    // workflow. Évite les stalls de compilation à la première requête (flakiness)
    // et teste ce qui tourne réellement en production.
    // En local : `npm run dev` pour l'itération rapide (serveur réutilisé s'il tourne déjà).
    command: process.env.CI ? 'npm run start' : 'npm run dev',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
