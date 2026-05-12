# Phase 5: Admin Back-office — Pattern Map

**Mapped:** 2026-05-11
**Files analyzed:** 11 (new/modified)
**Analogs found:** 11 / 11

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/actions/artworkAdmin.ts` | service | CRUD | `src/actions/validation.ts` | exact |
| `src/actions/savedArtworks.ts` | service | CRUD | `src/actions/visitor.ts` | exact |
| `src/db/schema.ts` (modifié) | model | — | `src/db/schema.ts` (table offers, lignes 408-435) | exact |
| `src/app/admin/artworks/[id]/page.tsx` (modifié) | controller | request-response | `src/app/admin/artworks/[id]/page.tsx` (lui-même) + `src/app/admin/artworks/page.tsx` | exact |
| `src/app/admin/artworks/[id]/_components/ArtworkEditForm.tsx` | component | request-response | `src/components/visitor/VisitorProfileModal.tsx` | role-match |
| `src/app/admin/artworks/[id]/_components/StatusChangeForm.tsx` | component | request-response | `src/app/admin/artworks/[id]/validate/_components/ValidationActions.tsx` | exact |
| `src/app/admin/artworks/[id]/_components/DeleteArtworkButton.tsx` | component | request-response | `src/app/admin/artworks/[id]/validate/_components/ValidationActions.tsx` | exact |
| `src/app/mon-profil/page.tsx` | controller | request-response | `src/app/admin/artworks/[id]/page.tsx` | role-match |
| `src/components/visitor/SaveButton.tsx` | component | event-driven | `src/components/visitor/VisitorProfileModal.tsx` | role-match |
| `src/components/layout/SiteNav.tsx` (modifié) | component | request-response | `src/components/layout/SiteNav.tsx` (lui-même) | exact |
| `src/components/layout/ModalTrigger.tsx` | component | event-driven | `src/app/page.tsx` (GalleryClient pattern) | partial-match |

---

## Pattern Assignments

### `src/actions/artworkAdmin.ts` (service, CRUD)

**Analog principal:** `src/actions/validation.ts`
**Analog secondaire:** `src/actions/offers.ts` (pour le pattern Zod + useActionState)

**Imports pattern** (`src/actions/validation.ts` lignes 17-26) :
```typescript
'use server'

import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { db } from '@/db'
import { artworks } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { getStorage } from '@/lib/storage'
```

Pour `updateArtwork` ajouter :
```typescript
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
```

**Auth pattern artiste** (`src/actions/validation.ts` lignes 43-45) :
```typescript
// DOIT être la première vérification dans chaque Server Action admin (T-02-13)
const session = await auth.api.getSession({ headers: await headers() })
if (!session) return { error: 'Non autorisé.' }
```

Pour `updateArtwork` (avec useActionState), retourner un objet d'erreur typé, pas `{ error }` :
```typescript
if (!session) return { success: false, errors: { _form: ['Non autorisé.'] } }
```

**Core UPDATE pattern** (`src/actions/validation.ts` lignes 54-60) :
```typescript
await db.update(artworks)
  .set({
    pipelineState: 'published',
    publishedAt: new Date(),
  })
  .where(eq(artworks.id, artworkId))
```

Pour `updateArtwork` Phase 5 — point critique numeric→string :
```typescript
// CRITIQUE : les colonnes numeric Drizzle (widthCm, heightCm, basePrice, etc.)
// doivent être passées comme STRING en écriture, même si elles arrivent comme string en lecture.
await db.update(artworks)
  .set({
    title: data.title,
    widthCm: data.widthCm?.toString() ?? null,
    basePrice: data.basePrice?.toString() ?? null,
    priceTechnicality: data.priceTechnicality ?? null,  // smallint = number, pas toString()
  })
  .where(eq(artworks.id, artworkId))
revalidatePath(`/admin/artworks/${artworkId}`)
revalidatePath(`/artworks/${artworkId}`)
return { success: true }
```

**Core DELETE pattern** (`src/actions/validation.ts` lignes 117-148) :
```typescript
// Ordre OBLIGATOIRE : storage d'abord, DB ensuite (cohérence si DB échoue)
const artwork = await db.query.artworks.findFirst({
  where: eq(artworks.id, artworkId),
})
if (!artwork) return { error: 'Œuvre introuvable.' }

const storage = getStorage()

// .catch(() => {}) — idempotent : ignore ENOENT si fichier absent
if (artwork.originalPath) {
  await storage.delete(artwork.originalPath).catch(() => {})
}
if (artwork.processedPath) {
  await storage.delete(artwork.processedPath).catch(() => {})
}
if (artwork.thumbnailPath) {
  await storage.delete(artwork.thumbnailPath).catch(() => {})
}

// Cascade DB supprime les offers automatiquement (FK onDelete: 'cascade')
await db.delete(artworks).where(eq(artworks.id, artworkId))

redirect('/admin/artworks')
// ATTENTION : deleteArtwork utilise redirect(), PAS useActionState
// Le Client Component l'appelle via startTransition, pas useActionState
```

**Zod schema pattern** (`src/actions/offers.ts` lignes 41-52) :
```typescript
// z.coerce sur les champs FormData numériques (FormData retourne toujours des strings)
const offerSchema = z.object({
  artworkId: z.coerce.number().int().positive(),
  amount: z.coerce.number().positive().min(1, 'Le montant minimum est 1 €'),
  message: z.string().max(500, '…').optional(),
})
```

Pour `updateArtwork`, adapter avec les champs métadonnées :
```typescript
const updateArtworkSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  createdDate: z.string().optional(),
  typeId: z.coerce.number().int().positive().optional(),
  mediumId: z.coerce.number().int().positive().optional(),
  widthCm: z.coerce.number().positive().optional(),
  heightCm: z.coerce.number().positive().optional(),
  basePrice: z.coerce.number().positive().optional(),
  priceHoursSpent: z.coerce.number().min(0).optional(),
  priceFormat: z.coerce.number().min(0).optional(),
  priceFraming: z.coerce.number().min(0).optional(),
  priceMaterials: z.coerce.number().min(0).optional(),
  priceTechnicality: z.coerce.number().int().min(1).max(5).optional(),
  priceAttachment: z.coerce.number().int().min(1).max(5).optional(),
})
```

**Error handling pattern** (`src/actions/offers.ts` lignes 241-251) :
```typescript
// Erreur inattendue — ne jamais exposer les détails de l'infrastructure
} catch (error) {
  console.error('[updateArtwork] Erreur serveur inattendue :', error)
  return {
    success: false,
    errors: { _form: ['Une erreur serveur est survenue. Veuillez réessayer.'] },
  }
}
```

**Type de retour** (`src/actions/visitor.ts` lignes 62-66) :
```typescript
type ActionResult =
  | { success: true }
  | { success: false; errors: Record<string, string[]> }
```

**Signature updateArtwork avec useActionState** :
```typescript
// artworkId est bindé avec .bind(null, artworkId) depuis le composant parent
// Signature : (artworkId, prevState, formData)
export async function updateArtwork(
  artworkId: number,
  prevState: unknown,
  formData: FormData
): Promise<UpdateArtworkResult> { ... }
```

---

### `src/actions/savedArtworks.ts` (service, CRUD)

**Analog:** `src/actions/visitor.ts`

**Imports pattern** (`src/actions/visitor.ts` lignes 17-22) :
```typescript
'use server'

import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/db'
import { visitors } from '@/db/schema'
import { getVisitorSession } from '@/lib/session'
```

Pour `savedArtworks.ts`, remplacer `visitors` par `savedArtworks` et ajouter `and` :
```typescript
import { eq, and } from 'drizzle-orm'
import { savedArtworks } from '@/db/schema'
import { getVisitorSession } from '@/lib/session'
```

**Auth visiteur pattern** (`src/actions/offers.ts` lignes 95-107) :
```typescript
// Garde session visiteur — en premier, avant tout accès DB
const session = await getVisitorSession()

if (!session.visitorId) {
  return {
    success: false,
    errors: { _form: ['Vous devez être identifié pour enregistrer une œuvre.'] },
  }
}

const visitorId = session.visitorId
```

**Core toggle pattern** (décrit dans RESEARCH.md, Pattern 5) :
```typescript
// Vérifier si le favori existe déjà
const existing = await db.select()
  .from(savedArtworks)
  .where(and(
    eq(savedArtworks.visitorId, visitorId),
    eq(savedArtworks.artworkId, artworkId)
  ))
  .limit(1)

if (existing.length > 0) {
  // Retirer le favori
  await db.delete(savedArtworks)
    .where(and(
      eq(savedArtworks.visitorId, visitorId),
      eq(savedArtworks.artworkId, artworkId)
    ))
} else {
  // Ajouter le favori
  await db.insert(savedArtworks).values({ visitorId, artworkId })
}

revalidatePath(`/artworks/${artworkId}`)
revalidatePath('/mon-profil')

return { success: true, saved: existing.length === 0 }
```

**Error handling** — identique à `src/actions/visitor.ts` lignes 182-189 :
```typescript
} catch (error) {
  console.error('[toggleSavedArtwork] Erreur serveur :', error)
  return {
    success: false,
    errors: { _form: ['Une erreur serveur est survenue. Veuillez réessayer.'] },
  }
}
```

---

### `src/db/schema.ts` (modifié — ajout table savedArtworks)

**Analog:** Table `offers` dans `src/db/schema.ts` (lignes 408-435) pour le pattern FK avec onDelete cascade.

**Pattern table avec PK composite** (`src/db/schema.ts` lignes 344-355 — table artworkTags) :
```typescript
// Relation many-to-many — PK composite sur (artworkId, tagId)
export const artworkTags = pgTable('artwork_tags', {
  artworkId: integer('artwork_id')
    .notNull()
    .references(() => artworks.id, { onDelete: 'cascade' }),
  tagId: integer('tag_id')
    .notNull()
    .references(() => tags.id, { onDelete: 'cascade' }),
}, (table) => [
  primaryKey({ columns: [table.artworkId, table.tagId] }),
])
```

**Nouvelle table à ajouter** (après la table `offers`) :
```typescript
// TABLE : saved_artworks — Favoris des visiteurs (D-14 Phase 5)
export const savedArtworks = pgTable('saved_artworks', {
  visitorId: integer('visitor_id')
    .notNull()
    .references(() => visitors.id, { onDelete: 'cascade' }),
  artworkId: integer('artwork_id')
    .notNull()
    .references(() => artworks.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  // Clé primaire composite : un visiteur ne peut enregistrer la même œuvre qu'une fois
  primaryKey({ columns: [table.visitorId, table.artworkId] }),
])
```

**Relations à ajouter** (après `artworkRelations`) :
```typescript
export const savedArtworkRelations = relations(savedArtworks, ({ one }) => ({
  visitor: one(visitors, {
    fields: [savedArtworks.visitorId],
    references: [visitors.id],
  }),
  artwork: one(artworks, {
    fields: [savedArtworks.artworkId],
    references: [artworks.id],
  }),
}))
```

**Import à ajouter** : `primaryKey` est déjà importé ligne 28. `timestamp`, `integer` déjà présents.

---

### `src/app/admin/artworks/[id]/page.tsx` (modifié)

**Analog:** `src/app/admin/artworks/[id]/page.tsx` lui-même — extension, pas remplacement.

**Pattern params + auth** (`src/app/admin/artworks/[id]/page.tsx` lignes 39-46) :
```typescript
export default async function ArtworkDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  // Next.js 15 : await des params (params est une Promise — Piège 2 RESEARCH.md)
  const { id } = await params
  const artworkId = parseInt(id, 10)
  if (isNaN(artworkId)) notFound()

  // Auth — défense en profondeur (T-02-13)
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/admin/login')
```

**Pattern requête DB avec jointures** (`src/app/admin/artworks/[id]/page.tsx` lignes 48-62) :
```typescript
const rows = await db
  .select({
    artwork: artworks,
    type: artworkTypes,
    medium: mediums,
  })
  .from(artworks)
  .leftJoin(artworkTypes, eq(artworks.typeId, artworkTypes.id))
  .leftJoin(mediums, eq(artworks.mediumId, mediums.id))
  .where(eq(artworks.id, artworkId))
  .limit(1)

if (rows.length === 0) notFound()
const { artwork, type, medium } = rows[0]!
```

**Query offres admin (section dashboard)** (RESEARCH.md, section Code Examples) :
```typescript
// Jointure offers + visitors — téléphone visible UNIQUEMENT en admin (D-11)
const offerRows = await db
  .select({
    id: offers.id,
    amount: offers.amount,
    message: offers.message,
    belowFloor: offers.belowFloor,
    createdAt: offers.createdAt,
    visitorName: visitors.displayName,
    visitorPhone: visitors.phone,    // PRIVÉ — admin uniquement, jamais côté public
    visitorEmail: visitors.email,
  })
  .from(offers)
  .leftJoin(visitors, eq(offers.visitorId, visitors.id))
  .where(eq(offers.artworkId, artworkId))
  .orderBy(desc(offers.amount))  // Montant décroissant (D-10)
```

**Pattern bind Server Action + Client Component** (`src/app/admin/artworks/[id]/validate/page.tsx` lignes 77-79) :
```typescript
// L'ID est bindé côté serveur — jamais exposé en input client (T-02-15)
const approveWithId = approveArtwork.bind(null, artwork.id)
const rejectWithId = rejectArtwork.bind(null, artwork.id)
// Pour le formulaire d'édition :
const updateArtworkWithId = updateArtwork.bind(null, artwork.id)
```

**Style page admin** (`src/app/admin/artworks/page.tsx` ligne 52) :
```typescript
<main style={{ padding: '48px 16px', fontFamily: 'var(--font-geist-sans)', maxWidth: '960px', margin: '0 auto' }}>
```

---

### `src/app/admin/artworks/[id]/_components/ArtworkEditForm.tsx` (nouveau, 'use client')

**Analog:** `src/components/visitor/VisitorProfileModal.tsx` — même pattern useActionState + formulaire avec erreurs Zod par champ.

**Pattern 'use client' + useActionState** (`src/components/visitor/VisitorProfileModal.tsx` lignes 1, 23, 63) :
```typescript
'use client'

import { useActionState, useEffect } from 'react'
import { updateArtwork } from '@/actions/artworkAdmin'

// useActionState — remplace l'ancien useFormState (déprécié React 19)
// Le state initial est null (aucune soumission encore)
const [state, formAction, isPending] = useActionState(createOrLoginVisitor, null)
```

Pour `ArtworkEditForm`, artworkId est bindé depuis le parent :
```typescript
interface ArtworkEditFormProps {
  artworkId: number
  // Valeurs initiales pour pré-remplir le formulaire
  initialTitle: string
  initialDescription: string | null
  initialTypeId: number | null
  initialMediumId: number | null
  initialWidthCm: string | null  // numeric Drizzle → string
  initialHeightCm: string | null
  initialBasePrice: string | null
  // ...autres champs price
  artworkTypes: Array<{ id: number; name: string }>
  mediums: Array<{ id: number; name: string }>
}

// Le bind se fait dans le Server Component parent :
// const updateArtworkWithId = updateArtwork.bind(null, artwork.id)
// puis : <ArtworkEditForm updateAction={updateArtworkWithId} ... />
const [state, formAction, isPending] = useActionState(props.updateAction, null)
```

**Pattern affichage erreurs Zod par champ** (`src/components/visitor/VisitorProfileModal.tsx` lignes 181-206 + 247-259) :
```typescript
{/* Erreur globale _form */}
{state && !state.success && state.errors?._form && (
  <div role="alert" style={{
    backgroundColor: 'rgba(220, 50, 50, 0.1)',
    border: '1px solid rgba(220, 50, 50, 0.4)',
    padding: '8px 12px',
    marginBottom: '16px',
    // D-03 : pas de border-radius
  }}>
    {state.errors._form.map((err, i) => (
      <p key={i} style={{
        fontFamily: 'var(--font-space-mono)',
        fontSize: '11px',
        color: 'rgb(200, 50, 50)',
        margin: 0,
      }}>{err}</p>
    ))}
  </div>
)}

{/* Erreur par champ */}
{state && !state.success && state.errors?.title && (
  <p role="alert" style={{
    fontFamily: 'var(--font-space-mono)',
    fontSize: '11px',
    color: 'rgb(200, 50, 50)',
    margin: '4px 0 0 0',
  }}>
    {state.errors.title[0]}
  </p>
)}
```

**Pattern input avec inline styles** (`src/components/visitor/VisitorProfileModal.tsx` lignes 226-245) :
```typescript
// Tous les champs admin utilisent des inline styles — pas de classes Tailwind (pattern établi)
<input
  id="title"
  name="title"
  type="text"
  required
  defaultValue={initialTitle}
  style={{
    width: '100%',
    height: '40px',
    padding: '0 12px',
    fontFamily: 'var(--font-geist-sans)',
    fontSize: '13px',
    color: 'var(--color-ink)',
    backgroundColor: '#ffffff',
    border: '1px solid #d4d4d4',
    boxSizing: 'border-box',
    // D-03 : pas de border-radius
  }}
/>
```

**Pattern bouton submit** (`src/components/visitor/VisitorProfileModal.tsx` lignes 380-401) :
```typescript
<button
  type="submit"
  disabled={isPending}
  style={{
    height: '44px',   // WCAG 2.5.5 : cible tactile minimum
    backgroundColor: isPending ? '#a3a3a3' : '#171717',
    color: '#ffffff',
    fontFamily: 'var(--font-geist-sans)',
    fontSize: '14px',
    fontWeight: 600,
    border: 'none',
    cursor: isPending ? 'not-allowed' : 'pointer',
    // D-03 : pas de border-radius
    padding: '0 24px',
    minWidth: '120px',
  }}
>
  {isPending ? 'Enregistrement…' : 'Enregistrer'}
</button>
```

---

### `src/app/admin/artworks/[id]/_components/StatusChangeForm.tsx` (nouveau, 'use client')

**Analog:** `src/app/admin/artworks/[id]/validate/_components/ValidationActions.tsx` — même pattern useTransition + action bindée.

**Pattern 'use client' + useTransition** (`src/app/admin/artworks/[id]/validate/_components/ValidationActions.tsx` lignes 15-17, 52-54) :
```typescript
'use client'

import { useTransition, useState } from 'react'

export function StatusChangeForm({
  updateStatusAction,  // Server Action bindée avec artworkId + statut
}: {
  updateStatusAction: (status: string) => Promise<void>
}) {
  const [isPending, startTransition] = useTransition()
```

**Pattern appel Server Action dans handler** (`src/app/admin/artworks/[id]/validate/_components/ValidationActions.tsx` lignes 57-61) :
```typescript
function handleStatusChange(newStatus: string) {
  startTransition(async () => {
    await updateStatusAction(newStatus)
  })
}
```

---

### `src/app/admin/artworks/[id]/_components/DeleteArtworkButton.tsx` (nouveau, 'use client')

**Analog:** `src/app/admin/artworks/[id]/validate/_components/ValidationActions.tsx` — AlertDialog + useTransition, pattern identique à la section "Rejeter".

**Pattern AlertDialog complet** (`src/app/admin/artworks/[id]/validate/_components/ValidationActions.tsx` lignes 15-30 + 131-162) :
```typescript
'use client'

import { useTransition, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

// Dans le JSX :
<AlertDialog>
  <AlertDialogTrigger asChild>
    <Button
      variant="destructive"
      disabled={isPending}
      style={{ minHeight: '44px', fontSize: '16px', fontWeight: 600, borderRadius: 0 }}
    >
      Supprimer l'œuvre
    </Button>
  </AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Supprimer cette œuvre ?</AlertDialogTitle>
      <AlertDialogDescription>
        Cette action est irréversible. L&apos;image et toutes ses variantes seront supprimées.
        Les offres reçues seront aussi supprimées.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Annuler</AlertDialogCancel>
      <AlertDialogAction
        onClick={handleDelete}
        style={{ backgroundColor: '#dc2626', color: '#ffffff', borderRadius: 0 }}
      >
        {isPending ? 'Suppression…' : 'Supprimer définitivement'}
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

**Point critique D-03** (`src/app/admin/artworks/[id]/validate/_components/ValidationActions.tsx`) :
AlertDialog injecte des border-radius par défaut via shadcn — ajouter `borderRadius: 0` ou `borderRadius: '0'` explicitement sur `AlertDialogContent`, `AlertDialogAction`, et sur tous les boutons.

---

### `src/app/mon-profil/page.tsx` (nouveau, Server Component)

**Analog principal:** `src/app/admin/artworks/[id]/page.tsx` — pattern Server Component avec auth + DB queries + rendu.
**Analog secondaire:** `src/app/artworks/[id]/page.tsx` — pattern `getVisitorSession()` + requêtes parallèles.

**Pattern getVisitorSession + redirect** (`src/app/artworks/[id]/page.tsx` lignes 231-232 + RESEARCH.md Pattern 4) :
```typescript
// Lire la session visiteur — lecture uniquement, JAMAIS session.save() ici (T-04-01-02)
const session = await getVisitorSession()

if (!session.visitorId) {
  // Non connecté → rediriger ou afficher message (D-12)
  redirect('/')
}
const visitorId = session.visitorId
```

**Pattern requêtes parallèles** (`src/app/artworks/[id]/page.tsx` lignes 176-201) :
```typescript
// Promise.all pour exécuter les requêtes en parallèle (gain ~50% sur le temps de chargement)
const [myOffers, mySavedArtworks] = await Promise.all([
  // Requête 1 : offres du visiteur — toutes œuvres confondues
  db
    .select({
      artworkId: artworks.id,
      artworkTitle: artworks.title,
      artworkStatus: artworks.status,
      amount: offers.amount,
      message: offers.message,
      createdAt: offers.createdAt,
    })
    .from(offers)
    .leftJoin(artworks, eq(offers.artworkId, artworks.id))
    .where(eq(offers.visitorId, visitorId))
    .orderBy(desc(offers.createdAt)),

  // Requête 2 : favoris du visiteur
  db
    .select({ artwork: artworks })
    .from(savedArtworks)
    .leftJoin(artworks, eq(savedArtworks.artworkId, artworks.id))
    .where(eq(savedArtworks.visitorId, visitorId))
    .orderBy(desc(savedArtworks.createdAt)),
])
```

**Pattern acquisitions probables** (D-18) :
```typescript
// Acquisitions = œuvres sold où le visiteur a au moins une offre
// Dédoublonner : un visiteur peut avoir plusieurs offres sur la même œuvre vendue
const myAcquisitions = myOffers
  .filter(o => o.artworkStatus === 'sold')
  .reduce<typeof myOffers>((acc, curr) => {
    if (!acc.find(a => a.artworkId === curr.artworkId)) acc.push(curr)
    return acc
  }, [])
```

**Style page publique (non-admin)** — utiliser les variables CSS du design system (D-02, D-03) :
```typescript
// Page /mon-profil : utiliser les fonts et couleurs du design system public (pas geist-sans)
<main style={{
  maxWidth: '720px',
  margin: '0 auto',
  padding: '48px 24px',
  fontFamily: 'var(--font-space-mono)',  // espace perso — pas admin geist-sans
}}>
  <h1 style={{
    fontFamily: 'var(--font-oswald)',
    fontSize: '28px',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: 'var(--color-ink)',
  }}>
    Mon profil
  </h1>
```

---

### `src/components/visitor/SaveButton.tsx` (nouveau, 'use client')

**Analog:** `src/components/visitor/VisitorProfileModal.tsx` — pattern 'use client' + Server Action + état visuel.

**Pattern 'use client' + useTransition (bouton interactif)** (`src/app/admin/artworks/[id]/validate/_components/ValidationActions.tsx` lignes 52-54) :
```typescript
'use client'

import { useTransition, useState } from 'react'
import { toggleSavedArtwork } from '@/actions/savedArtworks'

interface SaveButtonProps {
  artworkId: number
  initialSaved: boolean  // état initial depuis le Server Component parent
}

export function SaveButton({ artworkId, initialSaved }: SaveButtonProps) {
  const [isPending, startTransition] = useTransition()
  const [isSaved, setIsSaved] = useState(initialSaved)

  function handleToggle() {
    startTransition(async () => {
      const result = await toggleSavedArtwork(artworkId)
      if (result.success) {
        setIsSaved(result.saved)  // retour du serveur : état après toggle
      }
    })
  }
```

**Style bouton cœur** — D-03 (zéro border-radius), D-16 (carré) :
```typescript
<button
  onClick={handleToggle}
  disabled={isPending}
  aria-label={isSaved ? 'Retirer des favoris' : 'Enregistrer dans les favoris'}
  style={{
    width: '36px',
    height: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: isSaved ? 'var(--color-ink)' : 'transparent',
    border: '1px solid var(--color-ink)',
    cursor: isPending ? 'not-allowed' : 'pointer',
    opacity: isPending ? 0.6 : 1,
    // D-03 : pas de border-radius
  }}
>
  {/* Cœur SVG ou caractère Unicode ♥ */}
  <span style={{
    color: isSaved ? '#ffffff' : 'var(--color-ink)',
    fontFamily: 'var(--font-space-mono)',
    fontSize: '14px',
  }}>
    {isSaved ? '♥' : '♡'}
  </span>
</button>
```

---

### `src/components/layout/SiteNav.tsx` (modifié — async Server Component)

**Analog:** `src/components/layout/SiteNav.tsx` lui-même — extension non-breaking.

**Transformation sync → async** (`src/components/layout/SiteNav.tsx` lignes 18-19) :
```typescript
// AVANT (sync)
export function SiteNav() {

// APRÈS (async — non-breaking pour les importeurs : les pages publiques n'ont pas besoin de changer)
import { getVisitorSession } from '@/lib/session'

export async function SiteNav() {
  // Lecture session — JAMAIS session.save() ici (réservé aux Server Actions, T-04-01-02)
  const session = await getVisitorSession()
  const isLoggedIn = !!session.visitorId
```

**Style icône compte visiteur** (D-15, D-16) :
```typescript
{isLoggedIn ? (
  <Link href="/mon-profil" style={{ textDecoration: 'none' }}>
    {/* D-16 : carré (0 border-radius), fond ink, initiale blanche, ~28px, Space Mono */}
    <div style={{
      width: '28px',
      height: '28px',
      backgroundColor: 'var(--color-ink)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      // D-03 : zéro border-radius
    }}>
      <span style={{
        fontFamily: 'var(--font-space-mono)',
        fontSize: '13px',
        fontWeight: 700,
        color: '#ffffff',
        lineHeight: 1,
      }}>
        {session.displayName?.[0]?.toUpperCase() ?? '?'}
      </span>
    </div>
  </Link>
) : (
  // D-17 : paramètre URL ?identify=1 pour déclencher le modal depuis SiteNav (Server Component)
  // Le ModalTrigger (Client Component) dans le layout détecte ce param et ouvre le modal
  <Link
    href="?identify=1"
    style={{
      fontFamily: 'var(--font-space-mono)',
      fontSize: '11px',
      fontWeight: 400,
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      color: 'var(--color-ink-muted)',
      textDecoration: 'none',
    }}
  >
    S&apos;identifier
  </Link>
)}
```

**Pattern liens nav existants** (`src/components/layout/SiteNav.tsx` lignes 53-81) :
```typescript
// Reproduire le même style pour tous les liens nav
<Link
  href="/"
  style={{
    fontFamily: 'var(--font-space-mono)',
    fontSize: '11px',
    fontWeight: 400,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: 'var(--color-ink-muted)',
    textDecoration: 'none',
  }}
>
```

---

### `src/components/layout/ModalTrigger.tsx` (nouveau, 'use client')

**Analog:** Pattern documenté dans `src/app/page.tsx` (Piège 2 — GalleryClient avec useSearchParams dans Suspense).

**Pattern Client Component avec useSearchParams** (RESEARCH.md Pattern 6) :
```typescript
'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { VisitorProfileModal } from '@/components/visitor/VisitorProfileModal'

/**
 * Déclenche le VisitorProfileModal si le param URL ?identify=1 est présent.
 *
 * POURQUOI un Client Component séparé ?
 * useSearchParams() est interdit dans les Server Components.
 * SiteNav devient async Server Component — il ne peut pas lire les params URL avec des hooks.
 * Ce composant est l'unique pont entre le paramètre URL et l'état client du modal. (D-17)
 *
 * PIÈGE Suspense : ce composant DOIT être enveloppé dans <Suspense fallback={null}>
 * partout où il est utilisé. Sans Suspense, `next build` échoue.
 * [VERIFIED: src/app/page.tsx lignes 19-22 — commentaire PIÈGE 2]
 */
export function ModalTrigger() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (searchParams.get('identify') === '1') {
      setIsOpen(true)
    }
  }, [searchParams])

  function handleClose() {
    setIsOpen(false)
    // Nettoyer le param URL sans rechargement de page (router.replace)
    router.replace(window.location.pathname)
  }

  return <VisitorProfileModal isOpen={isOpen} onClose={handleClose} />
}

// Utilisation dans le layout parent :
// <Suspense fallback={null}>
//   <ModalTrigger />
// </Suspense>
```

---

## Shared Patterns

### Auth artiste (admin)

**Source:** `src/actions/validation.ts` lignes 43-45
**Appliquer à:** `updateArtwork`, `updateArtworkStatus`, `deleteArtwork` dans `artworkAdmin.ts`
```typescript
// DOIT être la PREMIÈRE vérification dans chaque Server Action admin
const session = await auth.api.getSession({ headers: await headers() })
if (!session) return { error: 'Non autorisé.' }
// Pour les actions retournant ActionResult : return { success: false, errors: { _form: ['Non autorisé.'] } }
```

### Auth visiteur (actions publiques)

**Source:** `src/actions/offers.ts` lignes 95-107
**Appliquer à:** `toggleSavedArtwork` dans `savedArtworks.ts`
```typescript
const session = await getVisitorSession()
if (!session.visitorId) {
  return { success: false, errors: { _form: ['Vous devez être identifié.'] } }
}
const visitorId = session.visitorId
```

### Lecture session visiteur (Server Components)

**Source:** `src/app/artworks/[id]/page.tsx` lignes 231-232
**Appliquer à:** `src/app/mon-profil/page.tsx`, `src/components/layout/SiteNav.tsx`
```typescript
// Lecture UNIQUEMENT — JAMAIS session.save() dans un Server Component (T-04-01-02)
const session = await getVisitorSession()
```

### Error handling Server Actions

**Source:** `src/actions/offers.ts` lignes 241-251
**Appliquer à:** Tous les Server Actions de Phase 5
```typescript
} catch (error) {
  console.error('[nomAction] Erreur serveur inattendue :', error)
  return {
    success: false,
    errors: { _form: ['Une erreur serveur est survenue. Veuillez réessayer.'] },
  }
}
```

### Design system inline styles

**Source:** `src/components/visitor/VisitorProfileModal.tsx` (partout dans le fichier)
**Appliquer à:** Tous les composants nouveaux (SaveButton, ArtworkEditForm, ModalTrigger, page mon-profil)
- Palette : fond `#f2e8cf` (var(--color-bg)), ink `#1a1a1a` (var(--color-ink)), ink-muted `#5a5244` (var(--color-ink-muted)), surface `#ede0b8` (var(--color-surface))
- D-03 : `borderRadius: 0` ou `borderRadius: '0'` sur TOUS les éléments, y compris shadcn AlertDialog
- D-02 : `fontFamily: 'var(--font-oswald)'` (titres), `'var(--font-space-mono)'` (labels), `'var(--font-cormorant-garamond)'` (descriptions)
- Pages admin : `fontFamily: 'var(--font-geist-sans)'` (`src/app/admin/artworks/page.tsx` ligne 52)

### Numeric Drizzle → toString()

**Source:** `src/db/schema.ts` (types des colonnes artworks), `src/actions/offers.ts` ligne 195
**Appliquer à:** `updateArtwork` dans `artworkAdmin.ts`
```typescript
// Les colonnes numeric Drizzle (widthCm, heightCm, basePrice, priceHoursSpent, priceFormat,
// priceFraming, priceMaterials) arrivent comme string | null en lecture.
// Elles DOIVENT être passées comme string en écriture.
widthCm: data.widthCm?.toString() ?? null,   // numeric → toString()
priceTechnicality: data.priceTechnicality ?? null,  // smallint → number direct
```

### Next.js 15 async params

**Source:** `src/app/admin/artworks/[id]/page.tsx` lignes 39-42
**Appliquer à:** Toutes les pages dynamiques (le pattern est déjà dans les fichiers existants)
```typescript
// params est une Promise en Next.js 15 — await OBLIGATOIRE
const { id } = await params
const artworkId = parseInt(id, 10)
if (isNaN(artworkId)) notFound()
```

### Test pattern (Vitest)

**Source:** `tests/visitor/profile.test.ts` lignes 1-80
**Appliquer à:** `tests/admin/updateArtwork.test.ts`, `tests/admin/deleteArtwork.test.ts`, `tests/admin/toggleSavedArtwork.test.ts`
```typescript
// vi.hoisted() pour les variables disponibles dans les factories vi.mock()
const { mockSession } = vi.hoisted(() => {
  const mockSession = { visitorId: undefined as number | undefined }
  return { mockSession }
})

vi.mock('@/db', () => ({ db: { select: vi.fn(), insert: vi.fn(), delete: vi.fn(), update: vi.fn(), query: { artworks: { findFirst: vi.fn() } } } }))
vi.mock('@/lib/auth', () => ({ auth: { api: { getSession: vi.fn() } } }))
vi.mock('next/headers', () => ({ headers: vi.fn().mockResolvedValue({}) }))
vi.mock('next/navigation', () => ({ redirect: vi.fn() }))

// Import après les mocks (ordre critique en ESM)
import { updateArtwork } from '@/actions/artworkAdmin'
```

---

## No Analog Found

Tous les fichiers ont un analog existant dans la codebase. Aucun cas sans analogie.

---

## Metadata

**Analog search scope:** `src/actions/`, `src/app/admin/`, `src/app/artworks/`, `src/components/`, `src/db/`, `tests/`
**Files scanned:** 13 fichiers lus intégralement
**Pattern extraction date:** 2026-05-11
