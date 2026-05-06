/**
 * Tests unitaires pour la Server Action createOrLoginVisitor.
 *
 * POURQUOI ces tests existent ?
 * La gestion des profils visiteurs est une zone sensible :
 * - AUTH-02 : un visiteur doit pouvoir créer un profil léger (pseudo + téléphone)
 * - AUTH-03 : un visiteur avec un numéro existant retrouve son compte sans doublons
 * - Validation Zod e164 : rejette les numéros sans indicatif pays
 *
 * Ces tests vérifient la logique SANS toucher la DB ni les cookies de session.
 * Les dépendances sont mockées pour isoler l'unité testée.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks — isoler les dépendances externes ─────────────────────────────────

/**
 * Mock de @/db — on ne touche jamais une vraie DB dans les tests unitaires.
 * Les résultats sont contrôlés par chaque test individuellement.
 */
vi.mock('@/db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
  },
}))

/**
 * Mock de @/lib/session — on ne crée pas de vrais cookies en test.
 * getVisitorSession() retourne un objet session simulé avec un spy sur save().
 */
const mockSessionSave = vi.fn().mockResolvedValue(undefined)
const mockSession = {
  visitorId: undefined as number | undefined,
  displayName: undefined as string | undefined,
  save: mockSessionSave,
  destroy: vi.fn().mockResolvedValue(undefined),
}

vi.mock('@/lib/session', () => ({
  getVisitorSession: vi.fn().mockResolvedValue(mockSession),
}))

/**
 * Mock de next/headers — non disponible hors contexte Next.js.
 * Les cookies sont gérés via le mock de session ci-dessus.
 */
vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  }),
}))

// Import après les mocks (ordre critique en ESM)
import { createOrLoginVisitor } from '@/actions/visitor'
import { db } from '@/db'

// ── Helpers de test ──────────────────────────────────────────────────────────

/**
 * Crée un FormData simulé avec les champs du formulaire visiteur.
 * POURQUOI FormData ? createOrLoginVisitor reçoit FormData comme dans un vrai formulaire Next.js.
 */
function makeFormData(fields: Record<string, string>): FormData {
  const fd = new FormData()
  for (const [key, val] of Object.entries(fields)) {
    fd.append(key, val)
  }
  return fd
}

/**
 * Configure le mock Drizzle pour simuler une requête SELECT.
 * Reproduit la chaîne fluente : db.select().from().where().limit()
 */
function mockSelectReturning(rows: unknown[]) {
  const limitMock = vi.fn().mockResolvedValue(rows)
  const whereMock = vi.fn().mockReturnValue({ limit: limitMock })
  const fromMock = vi.fn().mockReturnValue({ where: whereMock })
  vi.mocked(db.select).mockReturnValue({ from: fromMock } as any)
}

/**
 * Configure le mock Drizzle pour simuler un INSERT.
 * Reproduit la chaîne : db.insert().values().returning()
 */
function mockInsertReturning(rows: unknown[]) {
  const returningMock = vi.fn().mockResolvedValue(rows)
  const valuesMock = vi.fn().mockReturnValue({ returning: returningMock })
  vi.mocked(db.insert).mockReturnValue({ values: valuesMock } as any)
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('createOrLoginVisitor — AUTH-02 : création d\'un nouveau visiteur', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Réinitialiser les champs de session entre chaque test
    mockSession.visitorId = undefined
    mockSession.displayName = undefined
  })

  it('crée un nouveau visiteur avec téléphone E.164 valide et pose le cookie de session', async () => {
    // Scénario : aucun visiteur existant avec ce numéro → INSERT
    mockSelectReturning([]) // SELECT ne trouve rien
    mockInsertReturning([{ id: 42, displayName: 'Alice', phone: '+33612345678' }]) // INSERT retourne le visiteur

    const formData = makeFormData({
      displayName: 'Alice',
      phone: '+33612345678',
      email: '',
    })

    const result = await createOrLoginVisitor(null, formData)

    // Vérifier le retour success
    expect(result).toEqual({ success: true })

    // Vérifier que session.save() a été appelé (cookie posé)
    expect(mockSessionSave).toHaveBeenCalledOnce()

    // Vérifier que le visitorId a bien été assigné à la session
    expect(mockSession.visitorId).toBe(42)
    expect(mockSession.displayName).toBe('Alice')
  })

  it('rejette un téléphone sans indicatif pays (AUTH-02 — validation E.164)', async () => {
    // "0612345678" est un format français local, pas E.164 (pas d'indicatif +33)
    const formData = makeFormData({
      displayName: 'Alice',
      phone: '0612345678', // Invalide : manque +33
    })

    const result = await createOrLoginVisitor(null, formData)

    // Zod doit rejeter ce format avec une erreur sur le champ phone
    expect(result).toMatchObject({ success: false })
    expect((result as any).errors?.phone).toBeDefined()

    // Aucune requête DB ne doit avoir été lancée
    expect(db.select).not.toHaveBeenCalled()
    expect(db.insert).not.toHaveBeenCalled()
  })

  it('rejette un displayName vide (trop court)', async () => {
    const formData = makeFormData({
      displayName: 'A', // 1 char — minimum est 2
      phone: '+33612345678',
    })

    const result = await createOrLoginVisitor(null, formData)

    expect(result).toMatchObject({ success: false })
    expect((result as any).errors?.displayName).toBeDefined()
  })

  it('rejette un displayName complètement vide', async () => {
    const formData = makeFormData({
      displayName: '',
      phone: '+33612345678',
    })

    const result = await createOrLoginVisitor(null, formData)

    expect(result).toMatchObject({ success: false })
    expect((result as any).errors?.displayName).toBeDefined()
  })
})

describe('createOrLoginVisitor — AUTH-03 : retrouver un visiteur existant', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSession.visitorId = undefined
    mockSession.displayName = undefined
  })

  it('retourne le visiteur existant sans créer de doublon (AUTH-03)', async () => {
    // Scénario : visiteur déjà en DB avec ce numéro
    const existingVisitor = { id: 7, displayName: 'Bob', phone: '+33698765432' }
    mockSelectReturning([existingVisitor]) // SELECT trouve l'existant

    const formData = makeFormData({
      displayName: 'Bob Nouveau Pseudo', // Le displayName fourni n'est pas utilisé
      phone: '+33698765432',
    })

    const result = await createOrLoginVisitor(null, formData)

    // L'action doit réussir
    expect(result).toEqual({ success: true })

    // Aucun INSERT — le visiteur existait déjà
    expect(db.insert).not.toHaveBeenCalled()

    // La session doit utiliser l'ID existant (pas un nouveau)
    expect(mockSession.visitorId).toBe(7)

    // session.save() doit avoir été appelé
    expect(mockSessionSave).toHaveBeenCalledOnce()
  })

  it('accepte les téléphones belges et internationaux E.164', async () => {
    // Belgique : +32, Suisse : +41, UK : +44
    const phones = ['+32497123456', '+41791234567', '+447911123456']

    for (const phone of phones) {
      vi.clearAllMocks()
      mockSession.visitorId = undefined
      mockSelectReturning([])
      mockInsertReturning([{ id: 1, displayName: 'Test', phone }])

      const formData = makeFormData({ displayName: 'Test', phone })
      const result = await createOrLoginVisitor(null, formData)

      expect(result).toEqual({ success: true })
    }
  })

  it('rejette un téléphone invalide (caractères non numériques)', async () => {
    const formData = makeFormData({
      displayName: 'Charlie',
      phone: '+33abc123456', // Invalide : lettres dans le numéro
    })

    const result = await createOrLoginVisitor(null, formData)

    expect(result).toMatchObject({ success: false })
    expect((result as any).errors?.phone).toBeDefined()
    expect(db.select).not.toHaveBeenCalled()
  })
})
