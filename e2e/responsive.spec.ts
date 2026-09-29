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
 * Vérifie qu'une page ne déborde pas horizontalement — DEUX contrôles :
 *
 * 1. scrollWidth vs innerWidth : détecte un vrai scroll horizontal de page.
 *
 * 2. Éléments plus larges que l'écran : détecte le débordement « rogné » —
 *    un élément à largeur fixe qui dépasse l'écran mais qu'un ancêtre en
 *    `overflow:hidden` masque (donc invisible au contrôle scrollWidth, mais
 *    le contenu est coupé sur un vrai téléphone). C'était le bug des grilles
 *    admin en `1fr` (colonne figée à 432/491px). On ignore les éléments situés
 *    dans un conteneur volontairement scrollable (`overflow-x: auto/scroll`),
 *    comme le pipeline de la page upload.
 */
async function expectNoHorizontalOverflow(page: Page, path: string) {
  await page.goto(path)
  // 'load' plutôt que 'networkidle' : des images de démo peuvent renvoyer 404
  // et empêcher le réseau de se calmer, ce qui bloquerait le test.
  await page.waitForLoadState('load')
  await page.waitForTimeout(500) // laisser la mise en page se stabiliser

  const res = await page.evaluate((tol) => {
    const clientW = document.documentElement.clientWidth
    // Un ancêtre scrollable horizontalement (auto/scroll) légitime le débordement.
    const inScrollable = (el: Element): boolean => {
      let p: Element | null = el.parentElement
      while (p) {
        const ox = getComputedStyle(p).overflowX
        if (ox === 'auto' || ox === 'scroll') return true
        p = p.parentElement
      }
      return false
    }
    const wide: string[] = []
    document.querySelectorAll('body *').forEach((el) => {
      const r = el.getBoundingClientRect()
      if (r.width === 0 || r.height === 0) return
      if (r.right > clientW + tol && !inScrollable(el)) {
        const e = el as HTMLElement
        const cls = typeof e.className === 'string' && e.className ? '.' + e.className.trim().split(/\s+/).join('.') : ''
        wide.push(`${e.tagName.toLowerCase()}${cls} (right=${Math.round(r.right)}, w=${Math.round(r.width)})`)
      }
    })
    return { clientW, scrollWidth: document.documentElement.scrollWidth, wide: wide.slice(0, 8) }
  }, OVERFLOW_TOLERANCE)

  expect(
    res.scrollWidth,
    `${path} : scroll horizontal de page (contenu ${res.scrollWidth}px > écran ${res.clientW}px)`,
  ).toBeLessThanOrEqual(res.clientW + OVERFLOW_TOLERANCE)

  expect(
    res.wide,
    `${path} : éléments plus larges que l'écran (${res.clientW}px), rognés sur mobile :\n  ${res.wide.join('\n  ')}`,
  ).toEqual([])
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
