/**
 * Tests unitaires pour la page détail d'une œuvre.
 *
 * Couvre :
 * 1. buildArtworkMetadata : construction des métadonnées Open Graph
 * 2. truncateDescription : troncature de la description à 160 caractères
 *
 * La logique est extraite dans metadata-utils.ts pour être testable
 * sans Next.js ni accès à la base de données.
 */
import { describe, it, expect } from 'vitest'
import { buildArtworkMetadata, truncateDescription } from '@/lib/gallery/metadata-utils'

const mockArtwork = {
  id: 42,
  title: 'Portrait au crayon',
  description: 'Une étude soignée du visage humain.',
  widthCm: '30',
  heightCm: '40',
  originalPath: 'originals/abc123.jpg',
  type: { name: 'Dessin' },
  medium: { name: 'Crayon graphite' },
}

const storageBaseUrl = 'http://localhost:3000/api/uploads/originals/abc123.jpg'

describe('truncateDescription', () => {
  it('retourne la description sans modification si < 160 chars', () => {
    expect(truncateDescription('Court texte')).toBe('Court texte')
  })

  it('tronque à 160 caractères exactement', () => {
    const long = 'a'.repeat(200)
    expect(truncateDescription(long)).toHaveLength(160)
  })

  it('retourne undefined si la description est null', () => {
    expect(truncateDescription(null)).toBeUndefined()
  })

  it('retourne undefined si la description est undefined', () => {
    expect(truncateDescription(undefined)).toBeUndefined()
  })
})

describe('buildArtworkMetadata', () => {
  it('construit le titre au format "{titre} — Galerie POF"', () => {
    const meta = buildArtworkMetadata(mockArtwork, storageBaseUrl)
    expect(meta.title).toBe('Portrait au crayon — Galerie POF')
  })

  it("utilise la description de l'œuvre tronquée à 160 chars", () => {
    const meta = buildArtworkMetadata(mockArtwork, storageBaseUrl)
    expect(meta.openGraph?.description).toBe('Une étude soignée du visage humain.')
  })

  it('génère une description fallback si pas de description', () => {
    const artwork = { ...mockArtwork, description: null }
    const meta = buildArtworkMetadata(artwork, storageBaseUrl)
    expect(meta.openGraph?.description).toContain('Dessin')
    expect(meta.openGraph?.description).toContain('Crayon graphite')
    expect(meta.openGraph?.description).toContain('30×40 cm')
  })

  it("inclut l'URL d'image dans og:images si originalPath présent", () => {
    const meta = buildArtworkMetadata(mockArtwork, storageBaseUrl)
    expect(meta.openGraph?.images).toHaveLength(1)
    expect((meta.openGraph?.images as string[])[0]).toContain('originals/abc123.jpg')
  })

  it('retourne og:images vide si pas de originalPath', () => {
    const artwork = { ...mockArtwork, originalPath: null }
    const meta = buildArtworkMetadata(artwork, storageBaseUrl)
    expect(meta.openGraph?.images).toHaveLength(0)
  })
})
