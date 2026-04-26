/**
 * Tests unitaires pour retryPipeline — relance du pipeline sur l'original.
 *
 * POURQUOI ces tests existent ?
 * La Server Action retryPipeline est le point d'entrée pour corriger les
 * œuvres en état FAILED. Ces tests vérifient les gardes de sécurité :
 * - Session artiste requise (T-02-10)
 * - Artwork doit exister
 * - État FAILED obligatoire (T-02-12)
 * - Succès du pipeline sur un artwork valide
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth', () => ({
  auth: { api: { getSession: vi.fn() } },
}))
vi.mock('@/db', () => ({
  db: {
    query: { artworks: { findFirst: vi.fn() } },
    update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn() })) })),
  },
}))
vi.mock('@/lib/storage', () => ({
  getStorage: vi.fn(() => ({
    get: vi.fn(),
    put: vi.fn(),
    // delete doit retourner une Promise pour que .catch(() => {}) fonctionne
    delete: vi.fn().mockResolvedValue(undefined),
  })),
}))
vi.mock('@/lib/pipeline/process', () => ({
  processImage: vi.fn(),
}))
vi.mock('next/headers', () => ({
  headers: vi.fn(() => new Headers()),
}))

import { retryPipeline } from '@/actions/pipeline'
import { auth } from '@/lib/auth'
import { db } from '@/db'
import { getStorage } from '@/lib/storage'
import { processImage } from '@/lib/pipeline/process'

describe('retryPipeline — D-09', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(auth.api.getSession).mockResolvedValue(null)
  })

  it('retourne une erreur si la session est absente', async () => {
    const result = await retryPipeline(1)
    expect(result).toEqual({ error: 'Non autorisé.' })
  })

  it("retourne une erreur si l'œuvre n'existe pas", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue({ user: { id: '1' } } as any)
    vi.mocked(db.query.artworks.findFirst).mockResolvedValue(null as any)
    const result = await retryPipeline(999)
    expect(result).toEqual({ error: 'Œuvre introuvable.' })
  })

  it("refuse de relancer si l'état n'est pas FAILED", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue({ user: { id: '1' } } as any)
    vi.mocked(db.query.artworks.findFirst).mockResolvedValue({
      id: 1,
      pipelineState: 'published',
      originalPath: 'originals/abc.jpg',
    } as any)
    const result = await retryPipeline(1)
    expect(result?.error).toMatch(/Impossible de réessayer/)
  })

  it('relance le pipeline et retourne success pour un artwork FAILED', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue({ user: { id: '1' } } as any)
    vi.mocked(db.query.artworks.findFirst).mockResolvedValue({
      id: 1,
      pipelineState: 'failed',
      originalPath: 'originals/abc.jpg',
      processedPath: 'processed/old.webp',
      thumbnailPath: 'thumbnails/old.webp',
    } as any)
    const fakeBuffer = Buffer.from('fake')
    vi.mocked(getStorage().get).mockResolvedValue(fakeBuffer)
    vi.mocked(processImage).mockResolvedValue({
      processedBuffer: Buffer.from('processed'),
      thumbnailBuffer: Buffer.from('thumb'),
    })
    const result = await retryPipeline(1)
    expect(result).toEqual({ success: true })
  })
})
