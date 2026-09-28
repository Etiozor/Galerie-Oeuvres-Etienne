/**
 * Test E2E anti-régression : aucune page ne doit déborder en largeur.
 *
 * LE BUG QU'ON ATTRAPE :
 * « Sur mobile, les pages admin ne s'ajustent pas à la largeur de l'écran. »
 * Ce défaut se traduit techniquement par un débordement horizontal : le
 * contenu est plus large que la fenêtre (scrollWidth > innerWidth), ce qui
 * provoque une barre de défilement horizontale et du texte coupé.
 *
 * Ce test charge chaque page clé aux deux tailles d'écran (mobile + desktop,
 * définies dans playwright.config.ts) et vérifie qu'AUCUNE ne déborde.
 * Si un futur développement casse la mise en page, ce test devient rouge.
 *
 * Pages publiques : testées sans connexion.
 * Pages admin     : nécessitent une connexion → voir le helper login().
 *                   Elles ne sont testées que si les identifiants de test
 *                   sont fournis (E2E_ARTIST_EMAIL / E2E_ARTIST_PASSWORD),
 *                   sinon le bloc est ignoré (utile en local sans base de données).
 */
import { test, expect, type Page } from '@playwright/test'

// Marge de tolérance en pixels : évite les faux positifs dus aux arrondis
// sous-pixel du moteur de rendu. Au-delà, c'est un vrai débordement.
const OVERFLOW_TOLERANCE = 2

/**
 * Vérifie qu'une page ne déborde pas horizontalement.
 * Compare la largeur totale du contenu (scrollWidth) à la largeur visible.
 */
async function expectNoHorizontalOverflow(page: Page, path: string) {
  await page.goto(path)
  // Attendre que le rendu soit stabilisé (réseau au repos).
  await page.waitForLoadState('networkidle')

  const { scrollWidth, innerWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }))

  expect(
    scrollWidth,
    `${path} déborde en largeur : contenu ${scrollWidth}px pour une fenêtre de ${innerWidth}px`,
  ).toBeLessThanOrEqual(innerWidth + OVERFLOW_TOLERANCE)
}

// ── Pages publiques (aucune connexion requise) ──────────────────────────────
const PUBLIC_PAGES = ['/', '/about', '/frise']

for (const path of PUBLIC_PAGES) {
  test(`page publique ${path} ne déborde pas en largeur`, async ({ page }) => {
    await expectNoHorizontalOverflow(page, path)
  })
}

// ── Pages admin (connexion requise) ─────────────────────────────────────────
const ADMIN_EMAIL = process.env.E2E_ARTIST_EMAIL
const ADMIN_PASSWORD = process.env.E2E_ARTIST_PASSWORD
const ADMIN_PAGES = ['/admin/artworks', '/admin/upload']

/**
 * Connecte l'artiste via le formulaire /admin/login, exactement comme un humain.
 * Better Auth pose le cookie de session ; on attend la redirection vers /admin/artworks.
 */
async function login(page: Page) {
  await page.goto('/admin/login')
  await page.fill('#email', ADMIN_EMAIL!)
  await page.fill('#password', ADMIN_PASSWORD!)
  await page.click('button[type="submit"]')
  // waitUntil:'commit' → on valide dès que l'URL passe à /admin/artworks (auth OK),
  // sans attendre le chargement complet de cette page lourde. En mode dev, sa
  // première compilation peut être longue, d'où le timeout généreux.
  await page.waitForURL('**/admin/artworks', { timeout: 45_000, waitUntil: 'commit' })
}

// skip() si pas d'identifiants de test → ne casse pas les runs locaux sans DB.
test.describe('pages admin', () => {
  test.skip(
    !ADMIN_EMAIL || !ADMIN_PASSWORD,
    'E2E_ARTIST_EMAIL / E2E_ARTIST_PASSWORD non définis — pages admin ignorées',
  )

  for (const path of ADMIN_PAGES) {
    test(`page admin ${path} ne déborde pas en largeur`, async ({ page }) => {
      await login(page)
      await expectNoHorizontalOverflow(page, path)
    })
  }

  // Page d'édition d'une œuvre — /admin/artworks/[id].
  // C'est la page admin la plus complexe (colonnes, grilles) — donc la plus
  // susceptible de déborder. On ne connaît pas l'ID à l'avance : on récupère le
  // lien « Éditer » de la première œuvre de la liste. Si la base ne contient
  // aucune œuvre (pas de seed), le test est ignoré proprement.
  test("page admin édition d'une œuvre ne déborde pas en largeur", async ({ page }) => {
    await login(page)
    await page.goto('/admin/artworks')
    await page.waitForLoadState('networkidle')

    const editLinks = page.getByRole('link', { name: 'Éditer' })
    const count = await editLinks.count()
    test.skip(count === 0, 'aucune œuvre à éditer (base non seedée)')

    const editHref = await editLinks.first().getAttribute('href')
    await expectNoHorizontalOverflow(page, editHref!)
  })
})
