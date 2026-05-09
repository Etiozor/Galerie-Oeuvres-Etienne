/**
 * Tests unitaires pour la Server Action submitOffer — Galerie POF.
 *
 * POURQUOI ces tests existent ?
 * submitOffer est un point d'entrée critique : elle reçoit des données non validées
 * depuis le navigateur et doit protéger contre :
 * - MARKET-02 : rate limit 3 offres par visiteur par œuvre
 * - T-04-03-02 : belowFloor calculé côté serveur (jamais côté client)
 * - T-04-03-04 : soumission sans session (pas de visitorId → rejet)
 * - T-04-03-05 : offre sur une œuvre non disponible
 *
 * Ces tests vérifient la logique SANS toucher la DB réelle ni les cookies.
 * Toutes les dépendances sont mockées pour isoler l'unité testée.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks — isoler les dépendances externes ─────────────────────────────────

/**
 * vi.hoisted() : les variables définies ici sont disponibles dans les factories vi.mock().
 * POURQUOI hoisted ? vi.mock() est hoisted avant les imports par Vitest, donc les variables
 * normales (const mockSession = ...) ne sont pas encore initialisées quand le mock s'exécute.
 * vi.hoisted() garantit que ces valeurs sont prêtes avant le hoisting. [Vitest docs]
 */
const { mockSession } = vi.hoisted(() => {
  const mockSession = {
    visitorId: undefined as number | undefined,
    displayName: undefined as string | undefined,
  }
  return { mockSession }
})

/**
 * Mock de @/db — on ne touche jamais une vraie DB dans les tests unitaires.
 * Les résultats (artworks lookup, COUNT offers, INSERT) sont contrôlés par chaque test.
 */
vi.mock('@/db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    query: {
      artworks: {
        findFirst: vi.fn(),
      },
    },
  },
}))

/**
 * Mock de @/lib/session — on ne crée pas de vrais cookies en test.
 * getVisitorSession() retourne l'objet session simulé.
 */
vi.mock('@/lib/session', () => ({
  getVisitorSession: vi.fn().mockImplementation(async () => mockSession),
}))

/**
 * Mock de next/cache — revalidatePath doit être appelé après un INSERT réussi.
 * On l'espionne pour vérifier qu'il est appelé avec le bon chemin.
 */
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

// Import après les mocks (ordre critique en ESM)
import { submitOffer } from '@/actions/offers'
import { db } from '@/db'
import { revalidatePath } from 'next/cache'

// ── Helpers de test ──────────────────────────────────────────────────────────

/**
 * Crée un FormData simulé avec les champs du formulaire d'offre.
 * POURQUOI FormData ? submitOffer reçoit FormData comme dans un vrai formulaire Next.js.
 */
function makeFormData(fields: Record<string, string>): FormData {
  const fd = new FormData()
  for (const [key, val] of Object.entries(fields)) {
    fd.append(key, val)
  }
  return fd
}

/**
 * Configure le mock Drizzle pour simuler db.query.artworks.findFirst().
 * Retourne un objet artwork simulé ou undefined (œuvre introuvable).
 */
function mockArtworkFindFirst(artwork: unknown) {
  vi.mocked(db.query.artworks.findFirst).mockResolvedValue(artwork as any)
}

/**
 * Configure le mock Drizzle pour simuler la chaîne db.select().from().where().
 * Le COUNT rate limit retourne { total: string } (bigint retourné comme string par pg).
 * Reproduit la chaîne : db.select({ total: count() }).from(offers).where(and(...))
 */
function mockCountOffers(total: number) {
  const whereMock = vi.fn().mockResolvedValue([{ total: String(total) }])
  const fromMock = vi.fn().mockReturnValue({ where: whereMock })
  vi.mocked(db.select).mockReturnValue({ from: fromMock } as any)
}

/**
 * Configure le mock Drizzle pour simuler un INSERT d'offre réussi.
 * Reproduit la chaîne : db.insert(offers).values({...})
 */
function mockInsertOffer() {
  const valuesMock = vi.fn().mockResolvedValue([{ id: 1 }])
  vi.mocked(db.insert).mockReturnValue({ values: valuesMock } as any)
}

// ── Suite de tests ───────────────────────────────────────────────────────────

describe('submitOffer — Garde 1 : session visiteur', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Par défaut : visiteur NON identifié
    mockSession.visitorId = undefined
    mockSession.displayName = undefined
  })

  it('retourne une erreur si le visiteur n\'est pas identifié (pas de session)', async () => {
    // Scénario : cookie de session absent ou expiré → visitorId undefined
    mockSession.visitorId = undefined

    const formData = makeFormData({ artworkId: '1', amount: '300' })
    const result = await submitOffer(null, formData)

    // La garde session doit rejeter AVANT toute requête DB
    expect(result).toMatchObject({ success: false })
    expect((result as any).errors?._form).toBeDefined()
    expect((result as any).errors?._form[0]).toMatch(/identifi/i)

    // Aucune requête DB ne doit avoir été lancée
    expect(db.select).not.toHaveBeenCalled()
    expect(db.insert).not.toHaveBeenCalled()
  })
})

describe('submitOffer — Validation Zod', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Visiteur identifié pour ces tests
    mockSession.visitorId = 42
    mockSession.displayName = 'Alice'
  })

  it('rejette un montant de 0 (minimum 1 €)', async () => {
    const formData = makeFormData({ artworkId: '1', amount: '0' })
    const result = await submitOffer(null, formData)

    expect(result).toMatchObject({ success: false })
    // L'erreur doit être sur le champ amount
    expect((result as any).errors?.amount ?? (result as any).errors?._form).toBeDefined()
  })

  it('rejette un montant négatif (nombre positif requis)', async () => {
    const formData = makeFormData({ artworkId: '1', amount: '-50' })
    const result = await submitOffer(null, formData)

    expect(result).toMatchObject({ success: false })
    expect((result as any).errors?.amount ?? (result as any).errors?._form).toBeDefined()
  })

  it('rejette un message de plus de 500 caractères', async () => {
    const longMessage = 'A'.repeat(501)
    const formData = makeFormData({ artworkId: '1', amount: '300', message: longMessage })
    const result = await submitOffer(null, formData)

    expect(result).toMatchObject({ success: false })
    expect((result as any).errors?.message ?? (result as any).errors?._form).toBeDefined()
  })
})

describe('submitOffer — Garde 2 : statut de l\'œuvre', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSession.visitorId = 42
    mockSession.displayName = 'Alice'
  })

  it('rejette si l\'œuvre n\'est pas disponible (status !== available)', async () => {
    // Scénario : œuvre déjà vendue
    mockArtworkFindFirst({ id: 1, status: 'sold', basePrice: '800.00' })

    const formData = makeFormData({ artworkId: '1', amount: '500' })
    const result = await submitOffer(null, formData)

    expect(result).toMatchObject({ success: false })
    expect((result as any).errors?._form).toBeDefined()
    expect((result as any).errors?._form[0]).toMatch(/disponible/i)

    // Pas d'INSERT si l'œuvre n'est pas disponible
    expect(db.insert).not.toHaveBeenCalled()
  })
})

describe('submitOffer — Rate limit (MARKET-02)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSession.visitorId = 42
    mockSession.displayName = 'Alice'
  })

  it('rejette si le visiteur a déjà 3 offres pour cette œuvre', async () => {
    // Scénario : œuvre disponible mais visiteur a déjà atteint la limite
    mockArtworkFindFirst({ id: 1, status: 'available', basePrice: '800.00' })
    // COUNT retourne 3 → limite atteinte
    mockCountOffers(3)

    const formData = makeFormData({ artworkId: '1', amount: '500' })
    const result = await submitOffer(null, formData)

    expect(result).toMatchObject({ success: false })
    expect((result as any).errors?._form).toBeDefined()
    expect((result as any).errors?._form[0]).toMatch(/limite.*3|3.*offre/i)

    // Pas d'INSERT si le rate limit est atteint
    expect(db.insert).not.toHaveBeenCalled()
  })

  it('accepte l\'offre si le visiteur a 2 offres (sous la limite de 3)', async () => {
    // Scénario : visiteur avec 2 offres existantes — la 3e est autorisée
    mockArtworkFindFirst({ id: 1, status: 'available', basePrice: '800.00' })
    // COUNT retourne 2 → encore 1 offre possible
    mockCountOffers(2)
    mockInsertOffer()

    const formData = makeFormData({ artworkId: '1', amount: '900' })
    const result = await submitOffer(null, formData)

    expect(result).toMatchObject({ success: true })
    expect(db.insert).toHaveBeenCalledOnce()
  })
})

describe('submitOffer — Calcul belowFloor (côté serveur — T-04-03-02)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSession.visitorId = 42
    mockSession.displayName = 'Alice'
  })

  it('retourne belowFloor=true si amount < basePrice', async () => {
    // Scénario : base_price = 800€, offre = 500€ → sous le plancher
    mockArtworkFindFirst({ id: 1, status: 'available', basePrice: '800.00' })
    mockCountOffers(0)
    mockInsertOffer()

    const formData = makeFormData({ artworkId: '1', amount: '500' })
    const result = await submitOffer(null, formData)

    expect(result).toMatchObject({ success: true })
    // belowFloor doit être true — calculé côté serveur depuis la DB
    expect((result as any).belowFloor).toBe(true)
    // revalidatePath doit être appelé après l'INSERT
    expect(revalidatePath).toHaveBeenCalledWith('/artworks/1')
  })

  it('retourne belowFloor=false si amount >= basePrice', async () => {
    // Scénario : base_price = 800€, offre = 900€ → au-dessus du plancher
    mockArtworkFindFirst({ id: 1, status: 'available', basePrice: '800.00' })
    mockCountOffers(0)
    mockInsertOffer()

    const formData = makeFormData({ artworkId: '1', amount: '900' })
    const result = await submitOffer(null, formData)

    expect(result).toMatchObject({ success: true })
    // belowFloor doit être false
    expect((result as any).belowFloor).toBe(false)
    expect(revalidatePath).toHaveBeenCalledWith('/artworks/1')
  })

  it('retourne belowFloor=false si basePrice est null (pas de plancher défini)', async () => {
    // Scénario : l'artiste n'a pas fixé de prix de base → pas de plancher
    mockArtworkFindFirst({ id: 1, status: 'available', basePrice: null })
    mockCountOffers(0)
    mockInsertOffer()

    const formData = makeFormData({ artworkId: '1', amount: '100' })
    const result = await submitOffer(null, formData)

    expect(result).toMatchObject({ success: true })
    // Pas de plancher → belowFloor = false
    expect((result as any).belowFloor).toBe(false)
  })
})
