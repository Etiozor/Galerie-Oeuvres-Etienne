/**
 * Tests unitaires pour les fonctions helper de la galerie.
 *
 * Ces helpers convertissent les valeurs numeric Drizzle (retournées comme
 * string par node-postgres) en nombres pour l'aspect-ratio CSS.
 *
 * Voir piège 4 dans 03-RESEARCH.md : Drizzle retourne PostgreSQL `numeric`
 * comme des strings JavaScript — parseFloat est nécessaire.
 */
import { describe, it, expect } from 'vitest'
import { parseDimension, buildAspectRatio } from '@/lib/gallery/helpers'

describe('parseDimension', () => {
  it('convertit une string numérique en number', () => {
    expect(parseDimension('45.5')).toBe(45.5)
  })
  it('retourne 1 pour null (fallback dimensions manquantes)', () => {
    expect(parseDimension(null)).toBe(1)
  })
  it('retourne 1 pour undefined', () => {
    expect(parseDimension(undefined)).toBe(1)
  })
  it('retourne 1 pour string vide', () => {
    expect(parseDimension('')).toBe(1)
  })
  it('retourne 1 pour "0" (évite division par zéro)', () => {
    expect(parseDimension('0')).toBe(1)
  })
})

describe('buildAspectRatio', () => {
  it('construit la string aspect-ratio CSS correctement', () => {
    expect(buildAspectRatio('30', '20')).toBe('30 / 20')
  })
  it('retourne "1 / 1" si width est null', () => {
    expect(buildAspectRatio(null, '20')).toBe('1 / 1')
  })
  it('retourne "1 / 1" si height est null', () => {
    expect(buildAspectRatio('30', null)).toBe('1 / 1')
  })
})
