/**
 * Tests unitaires de FilterDrawer — Bottom sheet filtres mobile.
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
import { FilterDrawer } from './FilterDrawer'

// Mock next/link si nécessaire
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) =>
    <a href={href}>{children}</a>,
}))

// Props minimales pour le composant
const baseProps = {
  activeFilter: 'all',
  onFilterChange: vi.fn(),
  types: [{ id: 1, name: 'Dessin', slug: 'dessin', createdAt: new Date() }],
  mediums: [{ id: 1, name: 'Crayon', slug: 'crayon', createdAt: new Date() }],
}

describe('FilterDrawer', () => {
  beforeEach(() => {
    document.body.style.overflow = ''
  })
  afterEach(() => {
    document.body.style.overflow = ''
    vi.clearAllMocks()
  })

  it('rend le bouton "Filtres" fermé par défaut', () => {
    render(<FilterDrawer {...baseProps} />)
    const btn = screen.getByRole('button', { name: /ouvrir les filtres/i })
    expect(btn).toBeDefined()
    expect(btn.getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('ouvre le bottom sheet au clic sur le bouton', () => {
    render(<FilterDrawer {...baseProps} />)
    fireEvent.click(screen.getByRole('button', { name: /ouvrir les filtres/i }))
    expect(screen.getByRole('dialog')).toBeDefined()
    expect(screen.getByRole('button', { name: /ouvrir les filtres/i }).getAttribute('aria-expanded')).toBe('true')
  })

  it("ferme le bottom sheet au clic sur l'overlay", () => {
    render(<FilterDrawer {...baseProps} />)
    fireEvent.click(screen.getByRole('button', { name: /ouvrir les filtres/i }))
    const overlay = document.querySelector('[aria-hidden="true"]')
    expect(overlay).not.toBeNull()
    fireEvent.click(overlay!)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('ferme le bottom sheet au clic sur la croix', () => {
    render(<FilterDrawer {...baseProps} />)
    fireEvent.click(screen.getByRole('button', { name: /ouvrir les filtres/i }))
    fireEvent.click(screen.getByRole('button', { name: /fermer les filtres/i }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('ferme le bottom sheet sur la touche Escape', () => {
    render(<FilterDrawer {...baseProps} />)
    fireEvent.click(screen.getByRole('button', { name: /ouvrir les filtres/i }))
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('bloque document.body.style.overflow quand ouvert', () => {
    render(<FilterDrawer {...baseProps} />)
    fireEvent.click(screen.getByRole('button', { name: /ouvrir les filtres/i }))
    expect(document.body.style.overflow).toBe('hidden')
  })

  it('restaure document.body.style.overflow quand fermé', () => {
    render(<FilterDrawer {...baseProps} />)
    fireEvent.click(screen.getByRole('button', { name: /ouvrir les filtres/i }))
    fireEvent.click(screen.getByRole('button', { name: /fermer les filtres/i }))
    expect(document.body.style.overflow).toBe('')
  })

  it("n'affiche pas de badge quand aucun filtre actif (activeFilter === 'all')", () => {
    render(<FilterDrawer {...baseProps} activeFilter="all" />)
    // Le bouton doit afficher "Filtres" sans badge numérique
    const btn = screen.getByRole('button', { name: /ouvrir les filtres/i })
    expect(btn.textContent).not.toMatch(/·\s*\d/)
  })

  it("affiche le badge '· 1' quand un filtre est actif", () => {
    render(<FilterDrawer {...baseProps} activeFilter="type:1" />)
    const btn = screen.getByRole('button', { name: /ouvrir les filtres/i })
    expect(btn.textContent).toMatch(/·\s*1/)
  })

  it('D-03 — le bottom sheet dialog a borderRadius 0 (zéro coins arrondis)', () => {
    render(<FilterDrawer {...baseProps} />)
    fireEvent.click(screen.getByRole('button', { name: /ouvrir les filtres/i }))
    const panel = screen.getByRole('dialog')
    const style = panel.getAttribute('style') ?? ''
    expect(style).not.toMatch(/border-radius\s*:\s*[1-9]/)
  })
})
