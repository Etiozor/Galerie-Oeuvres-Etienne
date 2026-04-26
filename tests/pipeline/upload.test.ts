/**
 * Tests unitaires pour la Server Action uploadArtwork.
 *
 * POURQUOI ces tests existent ?
 * La validation des fichiers uploadés est la première ligne de défense du pipeline.
 * Un HEIC non rejeté, un fichier trop lourd accepté, ou un accès non authentifié
 * peut corrompre la base de données ou saturer le stockage.
 *
 * Ces tests vérifient la logique de validation SANS toucher la DB ni le stockage.
 * Ils doivent ÉCHOUER avant l'implémentation (phase RED du TDD) et PASSER après (GREEN).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock des dépendances extérieures — on ne touche pas la DB ni le stockage

// next/headers n'est disponible que dans un contexte de requête Next.js.
// En dehors (Vitest, Node.js natif), headers() lance une erreur.
// On le mock pour retourner des en-têtes vides — auth.api.getSession est
// lui-même mocké donc la valeur réelle des headers n'a aucun impact sur les tests.
vi.mock('next/headers', () => ({
  headers: vi.fn(() => new Headers()),
}))

vi.mock('@/lib/auth', () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}))
vi.mock('@/db', () => ({ db: {} }))
vi.mock('@/lib/storage', () => ({
  getStorage: vi.fn(() => ({
    put: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
    getUrl: vi.fn(),
  })),
}))
// Mock du pipeline Sharp — pas encore implémenté en 02-01
vi.mock('@/lib/pipeline/process', () => ({
  processImage: vi.fn(),
}))

import { uploadArtwork } from '@/actions/upload'
import { auth } from '@/lib/auth'

describe('uploadArtwork — validation', () => {
  beforeEach(() => {
    // Par défaut : session absente (utilisateur non connecté)
    vi.mocked(auth.api.getSession).mockResolvedValue(null)
  })

  it('retourne une erreur si la session est absente', async () => {
    const formData = new FormData()
    const result = await uploadArtwork(null, formData)
    expect(result).toEqual({ error: 'Non autorisé.' })
  })

  it('rejette un fichier HEIC avec message explicatif', async () => {
    // Simuler une session artiste connecté
    vi.mocked(auth.api.getSession).mockResolvedValue({ user: { id: '1' } } as any)
    const file = new File([new Uint8Array(10)], 'photo.heic', { type: 'image/heic' })
    const formData = new FormData()
    formData.append('file', file)
    const result = await uploadArtwork(null, formData)
    expect(result).toEqual({
      error: "Les photos iPhone en format HEIC ne sont pas supportées. Exporte en JPEG depuis l'app Photos.",
    })
  })

  it('rejette un fichier > 20 MB', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue({ user: { id: '1' } } as any)
    // Simuler un fichier de 21 MB via redéfinition de size (File.size est en lecture seule)
    const file = new File([new Uint8Array(10)], 'photo.jpg', { type: 'image/jpeg' })
    Object.defineProperty(file, 'size', { value: 21 * 1024 * 1024 })
    const formData = new FormData()
    formData.append('file', file)
    const result = await uploadArtwork(null, formData)
    expect(result).toEqual({
      error: "Le fichier est trop lourd (max 20 MB). Compresse-le avant d'uploader.",
    })
  })

  it('rejette un format non supporté', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue({ user: { id: '1' } } as any)
    const file = new File([new Uint8Array(10)], 'image.bmp', { type: 'image/bmp' })
    const formData = new FormData()
    formData.append('file', file)
    const result = await uploadArtwork(null, formData)
    expect(result).toEqual({
      error: "Ce format de fichier n'est pas supporté. Utilise un fichier JPEG ou PNG.",
    })
  })
})
