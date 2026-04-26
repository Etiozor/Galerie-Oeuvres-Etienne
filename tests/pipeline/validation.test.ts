/**
 * Tests unitaires pour les Server Actions de validation pipeline.
 *
 * POURQUOI ces tests ?
 * Les trois actions (approveArtwork, publishRaw, rejectArtwork) prennent des
 * décisions irréversibles sur les données de l'artiste. Elles doivent être
 * testées avant l'implémentation (TDD RED) pour garantir :
 * - La vérification de session en première ligne (sécurité T-02-13)
 * - Le comportement PIPE-05 : publishRaw copie originalPath → processedPath
 * - La suppression correcte des fichiers avant la ligne DB (rejectArtwork)
 * - Le retour d'erreur pour un artwork introuvable
 *
 * Couvre : PIPE-04, PIPE-05, ADMIN-03
 *
 * NOTE TECHNIQUE : vi.mock() est hoisted (remonté) au début du fichier par Vitest.
 * Les variables déclarées après ne sont pas encore initialisées au moment du hoist.
 * On utilise vi.hoisted() pour déclarer les mocks AVANT leur référencement dans vi.mock().
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// vi.hoisted() garantit que ces mocks sont disponibles quand vi.mock() est exécuté
const { mockFindFirst, mockSet, mockWhere, mockDeleteWhere } = vi.hoisted(() => ({
  mockFindFirst: vi.fn(),
  mockSet: vi.fn(),
  mockWhere: vi.fn(),
  mockDeleteWhere: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  auth: { api: { getSession: vi.fn() } },
}))

// Mocks Drizzle ORM — on simule les méthodes chaînables de Drizzle
vi.mock('@/db', () => ({
  db: {
    query: { artworks: { findFirst: mockFindFirst } },
    update: vi.fn(() => ({ set: mockSet.mockReturnValue({ where: mockWhere }) })),
    delete: vi.fn(() => ({ where: mockDeleteWhere })),
  },
}))

// Mock du StorageProvider — delete doit retourner une Promise (pour .catch())
vi.mock('@/lib/storage', () => ({
  getStorage: vi.fn(() => ({
    delete: vi.fn().mockResolvedValue(undefined),
  })),
}))

// Mock next/headers et next/navigation — requis pour les Server Actions hors de Next.js
vi.mock('next/headers', () => ({
  headers: vi.fn(() => new Headers()),
}))
vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}))

import { approveArtwork, publishRaw, rejectArtwork } from '@/actions/validation'
import { auth } from '@/lib/auth'

describe('Validation Server Actions — PIPE-04, PIPE-05, ADMIN-03', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Par défaut : pas de session (non authentifié)
    vi.mocked(auth.api.getSession).mockResolvedValue(null)
    // Par défaut : les opérations Drizzle résolvent sans valeur
    mockWhere.mockResolvedValue(undefined)
    mockDeleteWhere.mockResolvedValue(undefined)
  })

  // ── approveArtwork ─────────────────────────────────────────────
  describe('approveArtwork', () => {
    it('retourne { error } si session absente', async () => {
      const result = await approveArtwork(1)
      expect(result).toEqual({ error: 'Non autorisé.' })
    })

    it("retourne { error } si l'artwork n'existe pas", async () => {
      vi.mocked(auth.api.getSession).mockResolvedValue({ user: { id: '1' } } as any)
      mockFindFirst.mockResolvedValue(null)
      const result = await approveArtwork(999)
      expect(result).toEqual({ error: 'Œuvre introuvable.' })
    })

    it('met pipelineState=published et publishedAt pour un artwork AWAITING_VALIDATION', async () => {
      vi.mocked(auth.api.getSession).mockResolvedValue({ user: { id: '1' } } as any)
      mockFindFirst.mockResolvedValue({
        id: 1,
        pipelineState: 'awaiting_validation',
        originalPath: 'originals/abc.jpg',
        processedPath: 'processed/abc.webp',
        thumbnailPath: 'thumbnails/abc.webp',
      })
      await approveArtwork(1)
      // Vérifie que la mise à jour DB contient les champs corrects
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          pipelineState: 'published',
          publishedAt: expect.any(Date),
        })
      )
    })
  })

  // ── publishRaw — PIPE-05 ────────────────────────────────────────
  describe('publishRaw — PIPE-05', () => {
    it('copie originalPath dans processedPath avant de publier', async () => {
      vi.mocked(auth.api.getSession).mockResolvedValue({ user: { id: '1' } } as any)
      mockFindFirst.mockResolvedValue({
        id: 1,
        pipelineState: 'awaiting_validation',
        originalPath: 'originals/abc.jpg',
        processedPath: 'processed/abc.webp',
        thumbnailPath: 'thumbnails/abc.webp',
      })
      await publishRaw(1)
      // PIPE-05 : l'original doit devenir la version "traitée" dans la DB
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          processedPath: 'originals/abc.jpg', // originalPath copié dans processedPath
          pipelineState: 'published',
          publishedAt: expect.any(Date),
        })
      )
    })
  })

  // ── rejectArtwork ───────────────────────────────────────────────
  describe('rejectArtwork', () => {
    it('supprime la ligne DB pour un artwork existant', async () => {
      vi.mocked(auth.api.getSession).mockResolvedValue({ user: { id: '1' } } as any)
      mockFindFirst.mockResolvedValue({
        id: 1,
        pipelineState: 'awaiting_validation',
        originalPath: 'originals/abc.jpg',
        processedPath: 'processed/abc.webp',
        thumbnailPath: 'thumbnails/abc.webp',
      })
      await rejectArtwork(1)
      // Vérifie que la suppression DB a été appelée
      expect(mockDeleteWhere).toHaveBeenCalled()
    })
  })
})
