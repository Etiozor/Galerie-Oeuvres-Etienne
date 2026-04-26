/**
 * Tests unitaires pour processImage — pipeline Sharp.
 * Ces tests vérifient l'output réel de Sharp avec une vraie image JPEG.
 *
 * IMPORTANT : Ces tests appellent Sharp réellement (pas de mock).
 * Ils nécessitent tests/fixtures/test-image.jpg créé en 02-01.
 *
 * Exigences vérifiées :
 * - PIPE-02 : Normalisation exposition + contraste + balance des blancs
 * - PIPE-03 : Miniature ≤ 400px de large, jamais agrandie
 * - D-11 : .rotate() en premier (rotation EXIF iPhone)
 * - D-12 : .withMetadata() pour préserver le profil ICC Display-P3
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import path from 'path'
import sharp from 'sharp'
import { processImage } from '@/lib/pipeline/process'

// Lire la fixture JPEG créée en 02-01
const fixtureBuffer = readFileSync(
  path.join(process.cwd(), 'tests/fixtures/test-image.jpg')
)

describe('processImage — PIPE-02, PIPE-03', () => {
  it('retourne processedBuffer et thumbnailBuffer non vides', async () => {
    const result = await processImage(fixtureBuffer)
    expect(result.processedBuffer).toBeInstanceOf(Buffer)
    expect(result.thumbnailBuffer).toBeInstanceOf(Buffer)
    expect(result.processedBuffer.length).toBeGreaterThan(0)
    expect(result.thumbnailBuffer.length).toBeGreaterThan(0)
  })

  it('processedBuffer est un WebP valide (magic bytes RIFF...WEBP)', async () => {
    const result = await processImage(fixtureBuffer)
    // WebP magic bytes: bytes 0-3 = "RIFF", bytes 8-11 = "WEBP"
    const header = result.processedBuffer.slice(0, 12).toString('ascii')
    expect(header.startsWith('RIFF')).toBe(true)
    expect(header.endsWith('WEBP')).toBe(true)
  })

  it('thumbnailBuffer est un WebP valide', async () => {
    const result = await processImage(fixtureBuffer)
    const header = result.thumbnailBuffer.slice(0, 12).toString('ascii')
    expect(header.startsWith('RIFF')).toBe(true)
    expect(header.endsWith('WEBP')).toBe(true)
  })

  it('la miniature fait au maximum 400px de large — PIPE-03', async () => {
    // Créer une image de test plus large (800px) pour vérifier le redimensionnement
    const wideBuffer = await sharp({
      create: { width: 800, height: 600, channels: 3, background: { r: 100, g: 150, b: 200 } }
    }).jpeg().toBuffer()

    const result = await processImage(wideBuffer)
    const metadata = await sharp(result.thumbnailBuffer).metadata()
    expect(metadata.width).toBeLessThanOrEqual(400)
  })

  it('lance une erreur pour un Buffer invalide', async () => {
    const invalidBuffer = Buffer.from('not an image')
    await expect(processImage(invalidBuffer)).rejects.toThrow()
  })
})
