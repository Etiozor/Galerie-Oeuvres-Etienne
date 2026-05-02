/**
 * Tests smoke pour les pages About et 404.
 *
 * Ces tests sont "smoke tests" : ils vérifient que les fichiers existent
 * et contiennent le contenu attendu, sans monter de composant React.
 *
 * POURQUOI des tests statiques et pas des tests de rendu ?
 * Ces pages sont des Server Components statiques sans logique complexe.
 * Un test de rendu (React Testing Library) nécessiterait de mocker Next.js,
 * Drizzle, et les polices — pour un gain de confiance minime.
 * La vérification du contenu texte via lecture de fichier est plus directe.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const ROOT = resolve(process.cwd())

describe('Page /about', () => {
  const aboutPath = resolve(ROOT, 'src/app/about/page.tsx')

  it('le fichier about/page.tsx existe', () => {
    expect(existsSync(aboutPath)).toBe(true)
  })

  it('contient le titre "À propos de l\'artiste"', () => {
    const content = readFileSync(aboutPath, 'utf-8')
    expect(content).toContain("propos de l'artiste")
  })

  it('contient le texte placeholder', () => {
    const content = readFileSync(aboutPath, 'utf-8')
    expect(content).toContain('Bio et démarche artistique à venir')
  })

  it('exporte une fonction default (Server Component)', () => {
    const content = readFileSync(aboutPath, 'utf-8')
    expect(content).toContain('export default')
    // Ne contient pas 'use client' — Server Component pur
    expect(content).not.toContain("'use client'")
  })

  it('utilise la police Oswald pour le titre (var(--font-oswald))', () => {
    const content = readFileSync(aboutPath, 'utf-8')
    expect(content).toContain('--font-oswald')
  })
})

describe('Page 404', () => {
  const notFoundPath = resolve(ROOT, 'src/app/not-found.tsx')

  it('le fichier not-found.tsx existe', () => {
    expect(existsSync(notFoundPath)).toBe(true)
  })

  it('contient le titre "404"', () => {
    const content = readFileSync(notFoundPath, 'utf-8')
    expect(content).toContain('"404"')
  })

  it('contient le sous-titre "Cette page n\'existe pas."', () => {
    const content = readFileSync(notFoundPath, 'utf-8')
    expect(content).toContain("Cette page n'existe pas")
  })

  it('contient le lien retour vers la galerie', () => {
    const content = readFileSync(notFoundPath, 'utf-8')
    expect(content).toContain('Retour à la galerie')
    expect(content).toContain('href="/"')
  })

  it('utilise la couleur teal pour le lien retour', () => {
    const content = readFileSync(notFoundPath, 'utf-8')
    expect(content).toContain('color-teal')
  })
})
