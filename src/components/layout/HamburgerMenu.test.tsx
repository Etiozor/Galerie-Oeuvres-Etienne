/**
 * Tests unitaires de HamburgerMenu — Client Component hamburger menu mobile.
 *
 * POURQUOI jsdom et pas le rendu réel ?
 * Les media queries CSS ne sont pas simulées par jsdom — ces tests vérifient
 * uniquement le comportement interactif (état, accessibilité, overflow body).
 * La vérification visuelle responsive est manuelle (DevTools 375px).
 *
 * @vitest-environment jsdom
 */
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { HamburgerMenu } from './HamburgerMenu'

// Mock next/link — simplification pour tests unitaires
vi.mock('next/link', () => ({
  default: ({ href, children, onClick, style }: {
    href: string
    children: React.ReactNode
    onClick?: () => void
    style?: React.CSSProperties
  }) => <a href={href} onClick={onClick} style={style}>{children}</a>,
}))

describe('HamburgerMenu', () => {
  beforeEach(() => {
    // Réinitialiser overflow body avant chaque test
    document.body.style.overflow = ''
  })

  afterEach(() => {
    // Nettoyage — s'assurer que overflow est restauré
    document.body.style.overflow = ''
  })

  it('rend le bouton hamburger fermé par défaut', () => {
    render(<HamburgerMenu isLoggedIn={false} />)
    const btn = screen.getByRole('button', { name: /ouvrir le menu/i })
    expect(btn).toBeDefined()
    expect(btn.getAttribute('aria-expanded')).toBe('false')
    // Panneau fermé — pas de dialog
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('ouvre le panneau au clic sur le bouton hamburger', () => {
    render(<HamburgerMenu isLoggedIn={false} />)
    const btn = screen.getByRole('button', { name: /ouvrir le menu/i })
    fireEvent.click(btn)
    expect(screen.getByRole('dialog')).toBeDefined()
    expect(btn.getAttribute('aria-expanded')).toBe('true')
  })

  it("ferme le panneau au clic sur l'overlay", () => {
    render(<HamburgerMenu isLoggedIn={false} />)
    fireEvent.click(screen.getByRole('button', { name: /ouvrir le menu/i }))
    // Overlay = div avec aria-hidden="true"
    const overlay = document.querySelector('[aria-hidden="true"]')
    expect(overlay).not.toBeNull()
    fireEvent.click(overlay!)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('ferme le panneau au clic sur la croix', () => {
    render(<HamburgerMenu isLoggedIn={false} />)
    fireEvent.click(screen.getByRole('button', { name: /ouvrir le menu/i }))
    fireEvent.click(screen.getByRole('button', { name: /fermer le menu/i }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('ferme le panneau sur la touche Escape', () => {
    render(<HamburgerMenu isLoggedIn={false} />)
    fireEvent.click(screen.getByRole('button', { name: /ouvrir le menu/i }))
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('bloque document.body.style.overflow quand le panneau est ouvert', () => {
    render(<HamburgerMenu isLoggedIn={false} />)
    fireEvent.click(screen.getByRole('button', { name: /ouvrir le menu/i }))
    expect(document.body.style.overflow).toBe('hidden')
  })

  it('restaure document.body.style.overflow quand le panneau est fermé', () => {
    render(<HamburgerMenu isLoggedIn={false} />)
    fireEvent.click(screen.getByRole('button', { name: /ouvrir le menu/i }))
    fireEvent.click(screen.getByRole('button', { name: /fermer le menu/i }))
    expect(document.body.style.overflow).toBe('')
  })

  it("affiche le lien S'identifier quand non connecté", () => {
    render(<HamburgerMenu isLoggedIn={false} />)
    fireEvent.click(screen.getByRole('button', { name: /ouvrir le menu/i }))
    expect(screen.getByText(/s'identifier/i)).toBeDefined()
  })

  it('affiche Mon profil + initiale quand connecté', () => {
    render(<HamburgerMenu isLoggedIn={true} displayName="Alice" />)
    fireEvent.click(screen.getByRole('button', { name: /ouvrir le menu/i }))
    expect(screen.getByText(/mon profil/i)).toBeDefined()
    expect(screen.getByText('A')).toBeDefined()
  })

  it('D-03 — le panneau latéral a borderRadius 0 (zéro coins arrondis)', () => {
    render(<HamburgerMenu isLoggedIn={false} />)
    fireEvent.click(screen.getByRole('button', { name: /ouvrir le menu/i }))
    const panel = screen.getByRole('dialog')
    // borderRadius doit être absent ou 0 — D-03 zéro coins arrondis
    const style = panel.getAttribute('style') ?? ''
    expect(style).not.toMatch(/border-radius\s*:\s*[1-9]/)
  })

  it('les liens Galerie et À propos sont présents dans le panneau', () => {
    render(<HamburgerMenu isLoggedIn={false} />)
    fireEvent.click(screen.getByRole('button', { name: /ouvrir le menu/i }))
    expect(screen.getByText('Galerie')).toBeDefined()
    expect(screen.getByText('À propos')).toBeDefined()
  })
})
