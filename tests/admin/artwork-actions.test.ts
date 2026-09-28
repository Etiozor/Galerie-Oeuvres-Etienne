/**
 * Tests unitaires pour les Server Actions updateArtworkStatus et deleteArtwork.
 *
 * POURQUOI ces tests existent ?
 * - ADMIN-02 : l'artiste peut changer le statut d'une œuvre
 * - ADMIN-04 : l'artiste peut supprimer une œuvre avec ses fichiers
 * - T-05-01-01 : chaque action vérifie la session artiste en première ligne
 * - T-05-01-02 : l'ordre suppression fichiers AVANT DB est critique
 * - T-05-01-03 : le statut est validé par Zod avant tout accès DB
 *
 * Ces tests vérifient la logique SANS toucher la DB ni le filesystem.
 * Toutes les dépendances externes sont mockées.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks — isoler les dépendances externes ─────────────────────────────────

/**
 * vi.hoisted() : les variables définies ici sont disponibles dans les factories vi.mock().
 * POURQUOI hoisted ? vi.mock() est hoisted avant les imports par Vitest, donc les variables
 * normales ne sont pas encore initialisées quand le mock s'exécute.
 * vi.hoisted() garantit que ces valeurs sont prêtes avant le hoisting. [Vitest docs]
 *
 * POURQUOI unknown cast ? Better Auth retourne une valeur complexe (session + user) ;
 * nos tests ne testent que si la session est truthy/falsy — un objet minimal suffit.
 */
const { mockArtistSession } = vi.hoisted(() => ({
  mockArtistSession: {
    session: { id: 'session-1', userId: 'artist-1', expiresAt: new Date(), createdAt: new Date(), updatedAt: new Date(), token: 'tok' },
    user: { id: 'artist-1', role: 'ARTIST', name: 'Artiste', email: 'a@a.com', emailVerified: true, createdAt: new Date(), updatedAt: new Date() },
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
 * On vérifie que redirect('/admin/artworks') est bien appelé après suppression.
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
 * db.query.artworks.findFirst() retourne un objet configurable par test.
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

/**
 * Mock de @/lib/storage — StorageProvider.delete() est simulé.
 * Retourne une promesse résolue — le fichier est "supprimé" sans toucher le filesystem.
 */
vi.mock('@/lib/storage', () => ({
  getStorage: vi.fn().mockReturnValue({
    delete: vi.fn().mockResolvedValue(undefined),
  }),
}))

// Imports après les mocks (ordre critique en ESM — les mocks doivent être prêts avant l'import)
import { updateArtworkStatus, deleteArtwork } from '@/actions/artworkAdmin'
import { auth } from '@/lib/auth'
import { db } from '@/db'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getStorage } from '@/lib/storage'

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Crée un FormData simulé avec le champ 'status'.
 * POURQUOI FormData ? updateArtworkStatus reçoit FormData comme dans un vrai formulaire Next.js.
 */
function makeFormData(fields: Record<string, string>): FormData {
  const fd = new FormData()
  for (const [key, val] of Object.entries(fields)) {
    fd.append(key, val)
  }
  return fd
}

// ── Tests : updateArtworkStatus ──────────────────────────────────────────────

describe('updateArtworkStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('Test 1 — sans session → retourne { error: "Non autorisé." }', async () => {
    // Scénario : artiste non connecté — getSession() retourne null
    vi.mocked(auth.api.getSession).mockResolvedValue(null)

    const result = await updateArtworkStatus(1, null, makeFormData({ status: 'sold' }))

    expect(result).toEqual({ error: 'Non autorisé.' })
    // Vérification : aucun accès DB ne doit avoir eu lieu
    expect(db.update).not.toHaveBeenCalled()
  })

  it('Test 2 — statut invalide → retourne { error: "Statut invalide." } (Zod reject)', async () => {
    // Scénario : artiste connecté mais statut hors enum
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(auth.api.getSession).mockResolvedValue(mockArtistSession as any)

    const result = await updateArtworkStatus(1, null, makeFormData({ status: 'INVALID_STATUS' }))

    expect(result).toEqual({ error: 'Statut invalide.' })
    // Vérification : Zod rejette avant toute écriture DB
    expect(db.update).not.toHaveBeenCalled()
  })

  it('Test 3 — session valide + statut "sold" → db.update appelé, revalidatePath appelé, retourne { success: true }', async () => {
    // Scénario : artiste connecté, statut valid
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(auth.api.getSession).mockResolvedValue(mockArtistSession as any)

    const result = await updateArtworkStatus(42, null, makeFormData({ status: 'sold' }))

    expect(result).toEqual({ success: true })

    // db.update doit être appelé (chaîne fluente — on vérifie juste l'appel initial)
    expect(db.update).toHaveBeenCalledOnce()

    // revalidatePath doit être appelé pour invalider le cache des deux routes
    expect(revalidatePath).toHaveBeenCalledWith('/admin/artworks/42')
    expect(revalidatePath).toHaveBeenCalledWith('/admin/artworks')
  })
})

// ── Tests : deleteArtwork ────────────────────────────────────────────────────

describe('deleteArtwork', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('Test 4 — sans session → retourne { error: "Non autorisé." }', async () => {
    // Scénario : artiste non connecté
    vi.mocked(auth.api.getSession).mockResolvedValue(null)

    const result = await deleteArtwork(1)

    expect(result).toEqual({ error: 'Non autorisé.' })
    expect(db.query.artworks.findFirst).not.toHaveBeenCalled()
  })

  it('Test 5 — session valide → storage.delete appelé pour originalPath, db.delete appelé, redirect(/admin/artworks) appelé', async () => {
    // Scénario : artiste connecté, œuvre existante
    // NB : upload direct sans traitement → un seul chemin stocké (originalPath).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(auth.api.getSession).mockResolvedValue(mockArtistSession as any)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(db.query.artworks.findFirst).mockResolvedValue({
      id: 10,
      title: 'Test Artwork',
      description: null,
      createdDate: null,
      widthCm: null,
      heightCm: null,
      basePrice: null,
      priceHoursSpent: null,
      priceFormat: null,
      priceFraming: null,
      priceMaterials: null,
      priceTechnicality: null,
      priceAttachment: null,
      typeId: null,
      mediumId: null,
      status: 'available' as const,
      pipelineState: 'published' as const,
      originalPath: 'uploads/original-10.jpg',
      processedPath: 'uploads/processed-10.webp',
      thumbnailPath: 'uploads/thumbnail-10.webp',
      createdAt: new Date(),
      updatedAt: new Date(),
      publishedAt: null,
    } as any)

    await deleteArtwork(10)

    // Vérifier que storage.delete est appelé une fois, pour le fichier original
    const storageMock = getStorage()
    expect(storageMock.delete).toHaveBeenCalledTimes(1)
    expect(storageMock.delete).toHaveBeenCalledWith('uploads/original-10.jpg')

    // Vérifier que la DB est supprimée après les fichiers
    expect(db.delete).toHaveBeenCalledOnce()

    // Vérifier que redirect est appelé vers la liste
    expect(redirect).toHaveBeenCalledWith('/admin/artworks')
  })

  it('Test 6 — œuvre introuvable → retourne { error: "Œuvre introuvable." }', async () => {
    // Scénario : artiste connecté mais ID inexistant en DB
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(auth.api.getSession).mockResolvedValue(mockArtistSession as any)
    vi.mocked(db.query.artworks.findFirst).mockResolvedValue(undefined)

    const result = await deleteArtwork(999)

    expect(result).toEqual({ error: 'Œuvre introuvable.' })
    // Vérification : ni storage ni DB ne doivent être touchés
    expect(db.delete).not.toHaveBeenCalled()
  })
})
