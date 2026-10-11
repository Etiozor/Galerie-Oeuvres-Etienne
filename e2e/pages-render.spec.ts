/**
 * Test de régression : les pages détail d'œuvre se chargent sans erreur serveur.
 *
 * POURQUOI ce test existe ?
 * Un bug a planté en PROD la page /artworks/[id] de toute œuvre AYANT DES OFFRES :
 * `visitorSession` était utilisé dans le .map() des offres avant sa déclaration
 * (zone morte temporelle du const) → ReferenceError → « server-side exception ».
 * Le .map() ne s'exécutant que s'il y a au moins une offre, le bug restait
 * invisible tant qu'aucune offre n'existait, puis cassait dès la première.
 *
 * Ce test visite CHAQUE page détail liée depuis la galerie et vérifie que le
 * serveur ne renvoie pas d'erreur (statut < 400). Le seed crée des offres sur
 * la première œuvre → ce test aurait attrapé le bug (500 avant le correctif).
 *
 * Aucune connexion requise : la galerie et les pages détail sont publiques.
 */
import { test, expect } from '@playwright/test'

test("les pages détail d'œuvre se chargent sans erreur serveur", async ({ page }) => {
  await page.goto('/')
  await page.waitForLoadState('load')

  // Récupère les liens uniques vers les pages détail depuis la galerie.
  const hrefs = await page.locator('a[href^="/artworks/"]').evaluateAll((els) =>
    [...new Set(els.map((e) => e.getAttribute('href')).filter((h): h is string => !!h))],
  )

  // Base non seedée (aucune œuvre publiée) → rien à vérifier.
  test.skip(hrefs.length === 0, 'aucune œuvre publiée (base non seedée)')

  for (const href of hrefs) {
    const res = await page.goto(href)
    expect(
      res?.status() ?? 0,
      `${href} renvoie une erreur serveur (exception au rendu du Server Component ?)`,
    ).toBeLessThan(400)
  }
})
