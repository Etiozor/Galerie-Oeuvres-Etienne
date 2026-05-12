/**
 * Tests pour toggleSavedArtwork (D-14).
 * Vérifie le comportement upsert/delete idempotent sur la table saved_artworks.
 *
 * POURQUOI ces tests ?
 * - T-05-04-04 : toggleSavedArtwork sans session → erreur non autorisée
 * - La logique insert/delete conditionnelle est critique pour l'idempotence
 * - Les deux états (saved: true / saved: false) doivent être couverts
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── vi.hoisted() : disponible dans les factories vi.mock() (exécutées avant imports) ──
// POURQUOI hoisted pour mockSelectResult ?
// vi.mock() est hoisted avant les imports — les variables const normales ne sont pas
// encore initialisées. vi.hoisted() garantit que ces valeurs existent au moment
// où les factories vi.mock() s'exécutent. [même pattern que profile.test.ts]
const { mockSession, mockSelectResult } = vi.hoisted(() => ({
  mockSession: { visitorId: undefined as number | undefined, displayName: '' },
  mockSelectResult: [] as unknown[],
}))

vi.mock('@/lib/session', () => ({
  getVisitorSession: vi.fn().mockResolvedValue(mockSession)
}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

// Mock Drizzle avec support de la chaîne fluente select().from().where().limit()
vi.mock('@/db', () => ({
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue(mockSelectResult)
        })
      })
    }),
    insert: vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) }),
    delete: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }),
  }
}))

import { toggleSavedArtwork } from '@/actions/savedArtworks'

describe('toggleSavedArtwork', () => {
  beforeEach(() => {
    // Réinitialiser la session et les mocks entre chaque test
    mockSession.visitorId = undefined
    vi.clearAllMocks()
    // Réinitialiser le tableau de résultats simulé
    mockSelectResult.length = 0
  })

  it('sans session visiteur → retourne erreur non autorisé', async () => {
    // Scénario : visiteur non identifié (session vide)
    const result = await toggleSavedArtwork(1)
    expect(result).toEqual({ success: false, errors: { _form: expect.any(Array) } })
  })

  it('avec session + favori absent → insère et retourne saved: true', async () => {
    // Scénario : visiteur connecté, favori pas encore enregistré → INSERT
    mockSession.visitorId = 42
    mockSelectResult.length = 0  // Aucun favori existant

    const result = await toggleSavedArtwork(1)
    expect(result).toEqual({ success: true, saved: true })
  })

  it('avec session + favori existant → supprime et retourne saved: false', async () => {
    // Scénario : visiteur connecté, favori déjà présent → DELETE
    mockSession.visitorId = 42
    mockSelectResult.length = 1  // Favori existant
    ;(mockSelectResult as unknown[])[0] = { visitorId: 42, artworkId: 1 }

    const result = await toggleSavedArtwork(1)
    expect(result).toEqual({ success: true, saved: false })
  })
})
