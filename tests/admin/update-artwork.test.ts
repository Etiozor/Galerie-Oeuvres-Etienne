/**
 * Tests unitaires pour la Server Action updateArtwork.
 *
 * POURQUOI ces tests existent ?
 * - ADMIN-01 : l'artiste peut modifier les métadonnées d'une œuvre (titre, date, dimensions, etc.)
 * - ADMIN-02 : la décomposition du prix est éditable (6 facteurs)
 * - T-05-02-01 : auth.api.getSession() vérifié en première ligne (sécurité)
 * - T-05-02-02 : Zod valide les données avant tout accès DB (anti-injection)
 * - Numeric → string : les colonnes numeric Drizzle exigent des strings en écriture
 * - Smallint → number : priceTechnicality et priceAttachment sont passés sans toString()
 *
 * Ces tests vérifient la logique SANS toucher la DB réelle.
 * Toutes les dépendances externes sont mockées.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks — isoler les dépendances externes ─────────────────────────────────

/**
 * vi.hoisted() : les variables définies ici sont disponibles dans les factories vi.mock().
 * POURQUOI hoisted ? vi.mock() est hoisted avant les imports par Vitest, donc les variables
 * normales ne sont pas encore initialisées quand le mock s'exécute.
 * vi.hoisted() garantit que ces valeurs sont prêtes avant le hoisting. [Vitest docs]
 */
const { mockArtistSession } = vi.hoisted(() => ({
  mockArtistSession: {
    session: {
      id: 'session-1',
      userId: 'artist-1',
      expiresAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      token: 'tok',
    },
    user: {
      id: 'artist-1',
      role: 'ARTIST',
      name: 'Artiste',
      email: 'a@a.com',
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  } as unknown as null,
}))

/**
 * Mock de @/lib/auth — la vérification de session artiste.
 * Chaque test contrôle ce que getSession() retourne.
 */
vi.mock('@/lib/auth', () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}))

/**
 * Mock de next/headers — non disponible hors contexte Next.js.
 * headers() retourne un objet vide — suffisant pour passer à getSession().
 */
vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue({}),
}))

/**
 * Mock de next/navigation — redirect() serait jeté comme erreur sinon.
 */
vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}))

/**
 * Mock de next/cache — revalidatePath ne fait rien en test.
 * On vérifie qu'il est appelé avec les bons chemins.
 */
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

/**
 * Mock de @/db — on ne touche jamais une vraie DB dans les tests unitaires.
 * La chaîne fluente Drizzle (update().set().where()) est simulée.
 */
vi.mock('@/db', () => ({
  db: {
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockReturnThis(),
    query: {
      artworks: {
        findFirst: vi.fn(),
      },
    },
  },
}))

// Imports après les mocks (ordre critique en ESM — les mocks doivent être prêts avant l'import)
import { updateArtwork } from '@/actions/artworkAdmin'
import { auth } from '@/lib/auth'
import { db } from '@/db'
import { revalidatePath } from 'next/cache'

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Crée un FormData simulé avec les champs spécifiés.
 * POURQUOI FormData ? updateArtwork reçoit FormData comme dans un vrai formulaire Next.js.
 */
function makeFormData(fields: Record<string, string>): FormData {
  const fd = new FormData()
  for (const [key, val] of Object.entries(fields)) {
    fd.append(key, val)
  }
  return fd
}

/** Données valides de base pour les tests happy path */
const validFormData = {
  title: 'Portrait de Marie',
  description: 'Une belle description',
  createdDate: '2024-06-15',
  typeId: '1',
  mediumId: '2',
  widthCm: '42.5',
  heightCm: '60',
  basePrice: '350',
  priceHoursSpent: '200',
  priceFormat: '50',
  priceFraming: '80',
  priceMaterials: '20',
  priceTechnicality: '3',
  priceAttachment: '4',
}

// ── Tests : updateArtwork ────────────────────────────────────────────────────

describe('updateArtwork', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('Test 1 — sans session → retourne { success: false, errors: { _form: ["Non autorisé."] } }', async () => {
    // Scénario : artiste non connecté — getSession() retourne null
    vi.mocked(auth.api.getSession).mockResolvedValue(null)

    const result = await updateArtwork(1, null, makeFormData(validFormData))

    expect(result).toEqual({
      success: false,
      errors: { _form: ['Non autorisé.'] },
    })
    // Vérification : aucun accès DB ne doit avoir eu lieu
    expect(db.update).not.toHaveBeenCalled()
  })

  it('Test 2 — title vide → retourne { success: false, errors: { title: [...] } }', async () => {
    // Scénario : artiste connecté mais titre absent (champ obligatoire)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(auth.api.getSession).mockResolvedValue(mockArtistSession as any)

    const formWithEmptyTitle = { ...validFormData, title: '' }
    const result = await updateArtwork(1, null, makeFormData(formWithEmptyTitle))

    expect(result).toMatchObject({
      success: false,
      errors: expect.objectContaining({ title: expect.any(Array) }),
    })
    // Vérification : Zod rejette avant toute écriture DB
    expect(db.update).not.toHaveBeenCalled()
  })

  it('Test 3 — title trop long (>255 chars) → retourne { success: false, errors: { title: [...] } }', async () => {
    // Scénario : artiste connecté mais titre dépasse 255 caractères
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(auth.api.getSession).mockResolvedValue(mockArtistSession as any)

    const longTitle = 'A'.repeat(256)
    const formWithLongTitle = { ...validFormData, title: longTitle }
    const result = await updateArtwork(1, null, makeFormData(formWithLongTitle))

    expect(result).toMatchObject({
      success: false,
      errors: expect.objectContaining({ title: expect.any(Array) }),
    })
    expect(db.update).not.toHaveBeenCalled()
  })

  it('Test 4 — priceTechnicality = 6 (hors plage 1-5) → retourne { success: false, errors: { priceTechnicality: [...] } }', async () => {
    // Scénario : artiste connecté mais score hors plage
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(auth.api.getSession).mockResolvedValue(mockArtistSession as any)

    const formWithBadScore = { ...validFormData, priceTechnicality: '6' }
    const result = await updateArtwork(1, null, makeFormData(formWithBadScore))

    expect(result).toMatchObject({
      success: false,
      errors: expect.objectContaining({ priceTechnicality: expect.any(Array) }),
    })
    expect(db.update).not.toHaveBeenCalled()
  })

  it('Test 5 — données valides → db.update appelé avec widthCm comme string ("42.5"), revalidatePath appelé, retourne { success: true }', async () => {
    // Scénario : artiste connecté, toutes données valides
    // Vérification CRITIQUE : la colonne numeric widthCm doit être passée comme string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(auth.api.getSession).mockResolvedValue(mockArtistSession as any)

    const result = await updateArtwork(1, null, makeFormData(validFormData))

    expect(result).toEqual({ success: true })

    // db.update doit être appelé (chaîne fluente — on vérifie l'appel initial)
    expect(db.update).toHaveBeenCalledOnce()

    // db.set doit avoir reçu widthCm comme string (conversion numeric → string CRITIQUE)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((db as any).set).toHaveBeenCalledWith(
      expect.objectContaining({
        widthCm: '42.5',  // number 42.5 doit avoir été converti en string via .toString()
      })
    )

    // revalidatePath doit être appelé pour invalider le cache des deux routes
    expect(revalidatePath).toHaveBeenCalledWith('/admin/artworks/1')
    expect(revalidatePath).toHaveBeenCalledWith('/artworks/1')
  })

  it('Test 6 — données valides → priceTechnicality passé comme number (smallint, pas de toString)', async () => {
    // Scénario : vérifier que les smallint sont passés sans .toString()
    // CRITIQUE : priceTechnicality est un smallint, pas un numeric — il attend un number
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(auth.api.getSession).mockResolvedValue(mockArtistSession as any)

    const result = await updateArtwork(1, null, makeFormData(validFormData))

    expect(result).toEqual({ success: true })

    // db.set doit avoir reçu priceTechnicality comme number (3), pas comme string ('3')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((db as any).set).toHaveBeenCalledWith(
      expect.objectContaining({
        priceTechnicality: 3,  // number — PAS de toString() pour les smallint
      })
    )
  })
})
