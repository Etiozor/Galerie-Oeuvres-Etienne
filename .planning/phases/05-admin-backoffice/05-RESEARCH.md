# Phase 5: Admin Back-office — Research

**Researched:** 2026-05-11
**Domain:** Next.js 15 Server Actions, Drizzle ORM UPDATE/DELETE, iron-session async Server Components, shadcn/ui form components
**Confidence:** HIGH — all critical claims verified directly from codebase

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Ordre d'exécution**
- D-01 : Admin d'abord (05-01, 05-02, 05-03), puis visiteur (05-04, 05-05).

**Page liste admin (05-01)**
- D-02 : La liste `/admin/artworks` reste la page principale. En Phase 5, chaque ligne est cliquable vers `/admin/artworks/[id]` où se trouvent toutes les actions.
- D-03 : Pas de dropdown inline pour changer le statut. L'artiste clique sur l'œuvre → page détail → y change le statut.

**Page détail admin (05-01 / 05-02)**
- D-04 : `/admin/artworks/[id]` est déjà créé (Phase 4 residual). En Phase 5 : on y ajoute formulaire de métadonnées + changement de statut + suppression + liste des offres. La route `/validate` reste accessible depuis la liste.
- D-05 : Suppression : confirmation requise (AlertDialog). Supprime entrée DB + 3 fichiers storage (original, processed, thumbnail). Cascade DB supprime les offres.

**Formulaire d'édition des métadonnées (05-02)**
- D-06 : L'artiste uploade d'abord, puis remplit les métadonnées. Pas de formulaire avant upload.
- D-07 : Champs : titre, date de création, description, type (select), médium (select), dimensions, prix de base + 6 colonnes de décomposition.
- D-08 : Décomposition du prix dans le même formulaire que les métadonnées. PriceBreakdown sert de référence pour les labels.
- D-09 : Server Action `updateArtwork(artworkId, data)` — même pattern que `submitOffer`. Retour `{ success: true }` ou `{ success: false, errors: ... }`.

**Dashboard offres (05-03)**
- D-10 : Section en bas de `/admin/artworks/[id]`. Colonnes : visiteur (displayName), téléphone, email, montant, message, date. Triable par montant décroissant par défaut.
- D-11 : Téléphone et email affichés uniquement dans l'admin.

**Page profil visiteur /mon-profil (05-04)**
- D-12 : Route `/mon-profil` — Server Component. Si non connecté → redirect ou message. Si connecté → affichage du profil.
- D-13 : 4 sections : Mes informations, Mes offres, Mes acquisitions, Mes œuvres enregistrées.
- D-14 : Favoris : nouvelle table `saved_artworks` (visitorId, artworkId, createdAt — PK composite). Bouton cœur sur la page détail. Server Action `toggleSavedArtwork(artworkId)`.

**Indicateur de connexion SiteNav (05-05)**
- D-15 : SiteNav devient async Server Component. Si connecté : carré initiale + lien `/mon-profil`. Si non connecté : bouton "S'identifier" ouvre le modal.
- D-16 : D-03 s'applique à l'icône compte : carré (0 border-radius), fond `var(--color-ink)`, initiale blanche, ~28px, Space Mono.
- D-17 : Pour déclencher VisitorProfileModal depuis SiteNav : param URL `?identify=1` + Client Component dans le layout qui détecte ce param et ouvre le modal.

**Acquisitions**
- D-18 : "Acquisition probable" = artwork.status === 'sold' ET visitor a au moins une offre sur cet artwork.

### Claude's Discretion

(Aucune — toutes les décisions sont verrouillées dans le CONTEXT.md)

### Deferred Ideas (OUT OF SCOPE)

- Champ `offers.accepted_at` pour marquer l'offre acceptée
- Gestion des types et médiums depuis l'admin (ajouter "pastel", "fusain")
- Exports CSV des offres
- Tableau de bord avec statistiques (nb vues, nb offres, CA potentiel)
- Zoom interactif sur la page détail admin
- Notifications push navigateur pour les nouvelles offres
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ADMIN-01 | L'artiste peut ajouter une nouvelle œuvre avec tous ses champs (titre, date, description, classification, dimensions) et la fiche de prix de base détaillée | Le formulaire updateArtwork (D-09) couvre l'édition complète ; la création est déjà assurée par l'upload (Phase 2) qui crée la ligne DB avec titre par défaut |
| ADMIN-02 | L'artiste peut modifier ou supprimer une œuvre existante | Drizzle `db.update().set().where()` déjà utilisé dans validation.ts ; delete pattern déjà dans rejectArtwork ; StorageProvider.delete() implémenté et testé |
| ADMIN-04 | L'artiste peut changer le statut d'une œuvre (disponible → vendue / donnée / réservée) | artworkStatusEnum en DB : ['available', 'sold', 'given', 'reserved'] ; UPDATE Drizzle exact même pattern que approveArtwork |
| ADMIN-05 | L'artiste peut consulter toutes les offres reçues avec les informations complètes du visiteur (pseudo/nom, téléphone, email si fourni, montant, message) | Table offers + jointure visitors via Drizzle .select().from(offers).leftJoin(visitors) ; pattern sécurisé car admin uniquement |
</phase_requirements>

---

## Summary

Phase 5 est principalement une phase d'**assembly** : tous les patterns techniques nécessaires existent déjà dans la codebase. Le pattern Server Action avec useActionState est maîtrisé (visitor.ts, offers.ts). Drizzle UPDATE est déjà utilisé dans validation.ts (`db.update(artworks).set({...}).where(eq(...))`). StorageProvider.delete() est implémenté et idempotent (ENOENT ignoré). La cascade DB sur offers.artworkId est confirmée (`onDelete: 'cascade'`).

Les seules nouveautés techniques sont : (1) `SiteNav` devient un async Server Component — pattern simple car `getVisitorSession()` est déjà async et iron-session fonctionne normalement dans les Server Components en lecture ; (2) la table `saved_artworks` doit être ajoutée au schéma et pushée via `npm run db:push` ; (3) le mécanisme d'ouverture du modal depuis SiteNav (param URL `?identify=1`) nécessite un Client Component dans le layout public.

La page `/admin/artworks/[id]` **existe déjà** (créée pendant le développement de Phase 4) avec une version basique affichant les métadonnées en lecture seule. Phase 5 la transforme en page de gestion complète.

**Primary recommendation:** Suivre l'ordre D-01 strictement. Commencer par 05-01 (étendre la page détail avec changement de statut + suppression), puis 05-02 (formulaire édition métadonnées), puis 05-03 (section offres), puis 05-04 (table saved_artworks + /mon-profil), puis 05-05 (SiteNav async).

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Changement de statut artwork | API / Backend (Server Action) | — | Mutation DB — Server Action, jamais client |
| Suppression artwork + fichiers | API / Backend (Server Action) | Storage layer | Suppression storage PUIS DB (ordre correct déjà dans rejectArtwork) |
| Formulaire édition métadonnées | Frontend Server (SSR) + Client | API / Backend (Server Action) | Server Component pour les données initiales, Client Component pour useActionState |
| Dashboard offres (lecture) | Frontend Server (SSR) | Database | Lecture pure — Server Component suffit, pas de mutation |
| /mon-profil (lecture session) | Frontend Server (SSR) | — | iron-session lecture dans Server Component = OK ; écriture interdite |
| Toggle favori (heart button) | API / Backend (Server Action) | — | Mutation saved_artworks — Server Action avec revalidatePath |
| Indicateur connexion SiteNav | Frontend Server (SSR) | — | SiteNav devient async Server Component — lit getVisitorSession() en lecture seule |
| Ouverture modal depuis SiteNav | Browser / Client | — | Paramètre URL `?identify=1` + Client Component layout détecte et ouvre le modal |

---

## Standard Stack

### Core (déjà installé — aucune installation requise)

| Library | Version installée | Purpose | Notes |
|---------|---------|---------|-------|
| drizzle-orm | 0.45.2 | UPDATE/DELETE/INSERT DB | Pattern UPDATE vérifié dans validation.ts |
| next | 15.5.15 | App Router, Server Components, Server Actions | params est une Promise — await requis |
| react | 19.1.0 | useActionState pour formulaires | useFormState déprécié — useActionState est le remplacement |
| zod | 4.3.6 | Validation Server Action | z.e164(), z.coerce.number() déjà utilisés |
| iron-session | 8.0.4 | Lecture session visiteur dans Server Components | getVisitorSession() est async — await requis |
| @radix-ui/react-alert-dialog | 1.1.15 | Dialog de confirmation suppression | alert-dialog.tsx déjà dans src/components/ui/ |

### Shadcn/ui composants disponibles

[VERIFIED: src/components/ui/] Composants installés :
- `alert-dialog.tsx` — dialog confirmation suppression (D-05)
- `button.tsx`
- `badge.tsx`
- `card.tsx`
- `alert.tsx`

**Composants manquants** — à ajouter via shadcn CLI :
- `input` — champ texte formulaire métadonnées
- `textarea` — champ description
- `select` — sélecteur type et médium

**Commande d'ajout shadcn sur Windows (PowerShell execution policy workaround) :**

[VERIFIED: codebase — pattern établi en Phase 4]

```powershell
# Sur Windows, npx shadcn@latest échoue souvent à cause de l'execution policy
# Utiliser le binaire npx directement ou passer par node:
npx shadcn@latest add input textarea select
```

**Note :** `components.json` est présent à la racine avec style `base-nova`. La commande shadcn lit ce fichier pour savoir où placer les composants (`src/components/ui/`).

**Alternative si shadcn CLI bloque :** Les composants Input, Textarea, Select sont en réalité de simples wrappers HTML. Compte tenu que le projet **n'utilise pas les classes Tailwind dans les composants admin** (inline styles partout), les formulaires de la Phase 5 peuvent utiliser des `<input>`, `<textarea>`, `<select>` natifs avec inline styles — cohérent avec le reste de l'admin. Cela évite entièrement le problème shadcn CLI.

**Recommandation :** Utiliser les éléments HTML natifs avec inline styles dans les formulaires admin (cohérence avec le style établi), sans ajouter de nouveaux composants shadcn. AlertDialog est déjà disponible et est le seul composant shadcn nécessaire.

### Nouvelles dépendances DB

Aucune dépendance npm supplémentaire. Uniquement un ajout de table au schéma :

```typescript
// À ajouter dans src/db/schema.ts
export const savedArtworks = pgTable('saved_artworks', {
  visitorId: integer('visitor_id').notNull().references(() => visitors.id, { onDelete: 'cascade' }),
  artworkId: integer('artwork_id').notNull().references(() => artworks.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  primaryKey({ columns: [table.visitorId, table.artworkId] }),
])
```

**Appliquer le schéma :**
```bash
npm run db:push
```
[VERIFIED: package.json scripts — `"db:push": "drizzle-kit push"`]

---

## Architecture Patterns

### System Architecture Diagram

```
Artiste navigateur
    │
    ├─→ GET /admin/artworks          Server Component
    │       │ auth check (Better Auth)
    │       │ db.select().from(artworks).orderBy(desc)
    │       └─→ liste cliquable → /admin/artworks/[id]
    │
    ├─→ GET /admin/artworks/[id]     Server Component (ÉTENDU Phase 5)
    │       │ auth check
    │       │ db.select() artworks + leftJoin artworkTypes + leftJoin mediums
    │       │ db.select() offers + leftJoin visitors (pour section offres)
    │       ├─→ Section image + pipeline state
    │       ├─→ [Client] ArtworkEditForm (useActionState → updateArtwork)
    │       ├─→ [Client] StatusChangeForm (useActionState → updateArtworkStatus)
    │       ├─→ Section offres reçues (lecture seule, triée par montant desc)
    │       └─→ [Client] DeleteArtworkButton (AlertDialog → deleteArtwork)
    │
    ├─→ POST updateArtwork()         Server Action
    │       │ auth check
    │       │ Zod parse (titre, date, description, type, médium, dimensions, prix)
    │       │ db.update(artworks).set({...}).where(eq(artworks.id, artworkId))
    │       │ revalidatePath('/admin/artworks/[id]')
    │       └─→ { success: true | false, errors? }
    │
    ├─→ POST updateArtworkStatus()   Server Action
    │       │ auth check
    │       │ db.update(artworks).set({ status }).where(eq(...))
    │       │ revalidatePath(...)
    │       └─→ redirect ou { success }
    │
    └─→ POST deleteArtwork()         Server Action
            │ auth check
            │ db.query findFirst (récupérer les 3 clés de fichiers)
            │ storage.delete(originalPath), processedPath, thumbnailPath
            │ db.delete(artworks).where(eq(...))  → cascade DB supprime les offers
            └─→ redirect('/admin/artworks')

Visiteur navigateur
    │
    ├─→ GET /mon-profil              Server Component
    │       │ session = await getVisitorSession()
    │       │ if (!session.visitorId) → redirect('/') ou message
    │       │ db.select() offers WHERE visitorId + leftJoin artworks
    │       │ db.select() saved_artworks WHERE visitorId + leftJoin artworks
    │       └─→ sections : infos, offres, acquisitions, favoris
    │
    ├─→ POST toggleSavedArtwork()    Server Action
    │       │ garde session visiteur
    │       │ check si existe dans saved_artworks
    │       │ si existe → db.delete ; si absent → db.insert
    │       └─→ revalidatePath('/artworks/[id]') + revalidatePath('/mon-profil')
    │
    └─→ SiteNav (async Server Component)
            │ session = await getVisitorSession()
            │ if (session.visitorId) → afficher carré initiale + lien /mon-profil
            └─→ sinon → lien "S'identifier" avec href="?identify=1"

Layout public (Client Component detecteur)
    │ useSearchParams() → param 'identify'
    └─→ if (identify === '1') → ouvrir VisitorProfileModal
```

### Recommended Project Structure

```
src/
├── actions/
│   ├── artworks.ts          # updateArtwork, updateArtworkStatus, deleteArtwork (nouveau)
│   └── savedArtworks.ts     # toggleSavedArtwork (nouveau)
├── app/
│   ├── admin/artworks/[id]/
│   │   └── page.tsx         # ÉTENDU — page détail complète Phase 5
│   │   └── _components/
│   │       ├── ArtworkEditForm.tsx      # nouveau — 'use client', useActionState
│   │       ├── StatusChangeForm.tsx     # nouveau — 'use client', useActionState
│   │       └── DeleteArtworkButton.tsx  # nouveau — 'use client', AlertDialog
│   └── mon-profil/
│       └── page.tsx         # nouveau — Server Component
├── components/
│   └── layout/
│       └── SiteNav.tsx      # MODIFIÉ — async Server Component
│       └── ModalTrigger.tsx # nouveau — 'use client', lit ?identify=1
└── db/
    └── schema.ts            # MODIFIÉ — ajout savedArtworks table
```

### Pattern 1 : Drizzle UPDATE (updateArtwork)

[VERIFIED: src/actions/validation.ts — approveArtwork et publishRaw l'utilisent déjà]

```typescript
// Source: src/actions/validation.ts (lignes 54-60)
await db.update(artworks)
  .set({
    pipelineState: 'published',
    publishedAt: new Date(),
  })
  .where(eq(artworks.id, artworkId))
```

Pour updateArtwork Phase 5 :

```typescript
await db.update(artworks)
  .set({
    title,
    description: description ?? null,
    createdDate: createdDate ?? null,
    typeId: typeId ?? null,
    mediumId: mediumId ?? null,
    widthCm: widthCm?.toString() ?? null,      // numeric Drizzle attend une string
    heightCm: heightCm?.toString() ?? null,
    basePrice: basePrice?.toString() ?? null,
    priceHoursSpent: priceHoursSpent?.toString() ?? null,
    priceFormat: priceFormat?.toString() ?? null,
    priceFraming: priceFraming?.toString() ?? null,
    priceMaterials: priceMaterials?.toString() ?? null,
    priceTechnicality: priceTechnicality ?? null,  // smallint = number
    priceAttachment: priceAttachment ?? null,
    // updatedAt est mis à jour automatiquement par .$onUpdate() dans schema.ts
  })
  .where(eq(artworks.id, artworkId))
```

**Point critique :** Les colonnes `numeric` Drizzle (basePrice, widthCm, etc.) attendent une **string**, pas un number. Toujours utiliser `.toString()` avant d'écrire. Les colonnes `smallint` (priceTechnicality, priceAttachment) attendent un **number**.

[VERIFIED: src/db/schema.ts — types des colonnes]

### Pattern 2 : Drizzle DELETE avec suppression fichiers (deleteArtwork)

[VERIFIED: src/actions/validation.ts — rejectArtwork utilise exactement ce pattern]

```typescript
// Source: src/actions/validation.ts (lignes 117-148)
// 1. Récupérer les clés de fichiers
const artwork = await db.query.artworks.findFirst({ where: eq(artworks.id, artworkId) })

// 2. Supprimer les fichiers storage (silencieux si absents)
if (artwork.originalPath) await storage.delete(artwork.originalPath).catch(() => {})
if (artwork.processedPath) await storage.delete(artwork.processedPath).catch(() => {})
if (artwork.thumbnailPath) await storage.delete(artwork.thumbnailPath).catch(() => {})

// 3. Supprimer la ligne DB (cascade supprime les offers automatiquement)
await db.delete(artworks).where(eq(artworks.id, artworkId))

redirect('/admin/artworks')
```

**Cascade DB confirmée :** [VERIFIED: src/db/schema.ts lignes 411-414]
```typescript
artworkId: integer('artwork_id')
  .notNull()
  .references(() => artworks.id, { onDelete: 'cascade' }),
```
La suppression d'une œuvre déclenche automatiquement la suppression de toutes ses offres et ses artwork_tags.

### Pattern 3 : Server Action avec useActionState (formulaire édition)

[VERIFIED: src/actions/visitor.ts, src/components/visitor/VisitorProfileModal.tsx]

```typescript
// Server Action (src/actions/artworks.ts)
'use server'
export async function updateArtwork(
  artworkId: number,
  prevState: unknown,
  formData: FormData
): Promise<UpdateArtworkResult> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return { success: false, errors: { _form: ['Non autorisé.'] } }
  // ... Zod parse, db.update, revalidatePath
}

// Client Component (ArtworkEditForm.tsx)
'use client'
const updateArtworkWithId = updateArtwork.bind(null, artworkId)
const [state, formAction, isPending] = useActionState(updateArtworkWithId, null)
```

**Note .bind() :** Le pattern `action.bind(null, artworkId)` est utilisé dans validation.ts pour pré-remplir l'artworkId côté serveur sans l'exposer en input client. [VERIFIED: src/app/admin/artworks/[id]/validate/page.tsx lignes 77-79]

### Pattern 4 : getVisitorSession() dans un async Server Component

[VERIFIED: src/lib/session.ts — getVisitorSession() est async, utilise await cookies()]

```typescript
// SiteNav.tsx MODIFIÉ
export async function SiteNav() {
  const session = await getVisitorSession()
  const isLoggedIn = !!session.visitorId
  // IMPORTANT : pas de session.save() ici — lecture uniquement (T-04-01-02)
  // ...
}
```

**Contrainte critique :** `session.save()` est interdit dans les Server Components. Uniquement dans les Server Actions. [VERIFIED: src/lib/session.ts commentaire lignes 117-123]

**Impact sur le layout :** SiteNav est actuellement dans `src/app/page.tsx` et `src/app/artworks/[id]/page.tsx` directement (pas dans un layout). Vérifier dans chaque page où SiteNav est importé.

[VERIFIED: src/components/layout/SiteNav.tsx — SiteNav est une fonction sync `export function SiteNav()`. La rendre async est un changement non-breaking : les pages parentes qui l'importent n'ont pas besoin de changer (React gère les async Server Components de façon transparente).]

### Pattern 5 : toggleSavedArtwork — upsert/delete sur PK composite

```typescript
// Vérifier l'existence
const existing = await db.select()
  .from(savedArtworks)
  .where(and(
    eq(savedArtworks.visitorId, visitorId),
    eq(savedArtworks.artworkId, artworkId)
  ))
  .limit(1)

if (existing.length > 0) {
  // Supprimer le favori
  await db.delete(savedArtworks)
    .where(and(
      eq(savedArtworks.visitorId, visitorId),
      eq(savedArtworks.artworkId, artworkId)
    ))
} else {
  // Ajouter le favori
  await db.insert(savedArtworks).values({ visitorId, artworkId })
}
```

**Pas d'upsert PostgreSQL ici :** On n'utilise pas `onConflictDoNothing()` car on a besoin de savoir si l'enregistrement existait pour retourner le bon état (ajouté/retiré) au client.

### Pattern 6 : Ouverture modal depuis SiteNav (D-17)

Le VisitorProfileModal est un Client Component avec props `isOpen` et `onClose`. SiteNav devient async Server Component — il ne peut pas appeler des hooks React.

**Approche params URL :**
```typescript
// SiteNav.tsx (Server Component)
<Link href="?identify=1">S'identifier</Link>

// ModalTrigger.tsx (nouveau Client Component dans le layout public)
'use client'
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
    // Nettoyer le param URL sans recharger la page
    router.replace(window.location.pathname)
  }

  return <VisitorProfileModal isOpen={isOpen} onClose={handleClose} />
}
```

**Piège useSearchParams :** Ce composant utilise `useSearchParams()` — il doit être enveloppé dans `<Suspense>` dans le layout parent. Sans Suspense, `next build` échoue. [VERIFIED: src/app/page.tsx lignes 19-22 — le commentaire PIÈGE 2 documente exactement ce problème]

### Anti-Patterns to Avoid

- **Ne jamais appeler session.save() dans un Server Component** — uniquement dans les Server Actions. SiteNav lit la session mais ne la modifie jamais.
- **Ne jamais calculer belowFloor côté client** — toujours calculer côté serveur depuis la DB (déjà documenté dans offers.ts).
- **Ne jamais supprimer la ligne DB avant les fichiers storage** — supprimer storage d'abord, puis DB (ordre correct dans rejectArtwork, à reproduire dans deleteArtwork).
- **Ne jamais oublier toString() pour les colonnes numeric Drizzle** — widthCm, heightCm, basePrice, priceHoursSpent, priceFormat, priceFraming, priceMaterials sont `string` en lecture, doivent être passées comme `string` en écriture.
- **Ne jamais utiliser useFormState** — déprécié React 19, remplacé par useActionState. [VERIFIED: src/components/visitor/VisitorProfileModal.tsx commentaire ligne 16]

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Suppression cascade offres | Code DELETE offers manuellement | Cascade FK PostgreSQL (`onDelete: 'cascade'`) | Déjà configuré dans schema.ts — automatique |
| Suppression storage idempotente | Try/catch complexe sur delete | `storage.delete(key).catch(() => {})` | LocalStorageAdapter ignore déjà ENOENT — pattern dans rejectArtwork |
| Vérification session admin | Guards manuels multiples | `auth.api.getSession({ headers: await headers() })` | Pattern établi dans toutes les pages admin |
| État pending du formulaire | useState loading manuel | `isPending` de useActionState | Inclus nativement dans le retour useActionState |
| Dialog confirmation suppression | Dialog HTML custom | AlertDialog de `@radix-ui/react-alert-dialog` | Déjà installé — `src/components/ui/alert-dialog.tsx` |
| Typage colonnes numeric | Conversion manuelle string↔number | Connaissance du schéma Drizzle | Les colonnes numeric Drizzle arrivent comme `string \| null` en lecture |

**Key insight :** La codebase Phase 5 est principalement de l'**assembly de patterns existants**, pas du développement de nouvelles primitives. Le seul vrai nouveau patron est `toggleSavedArtwork` et la table `saved_artworks`.

---

## Runtime State Inventory

Phase 5 n'est pas une phase de rename/refactor. Cependant, elle **ajoute une table DB** qui nécessite un `db:push` :

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | Table `saved_artworks` n'existe pas encore en DB | `npm run db:push` après modification schema.ts |
| Live service config | Aucun | — |
| OS-registered state | Aucun | — |
| Secrets/env vars | Aucun nouveau secret requis | — |
| Build artifacts | Aucun | — |

**`db:push` sur Windows :** La commande `npm run db:push` appelle `drizzle-kit push` qui fonctionne correctement sous PowerShell. Pas de problème d'execution policy pour cette commande (elle passe par npm script, pas par PowerShell directement).

---

## Common Pitfalls

### Pitfall 1 : numeric Drizzle = string en TypeScript

**What goes wrong :** `artwork.basePrice` est `string | null` en TypeScript (Drizzle type pour les colonnes `numeric`). Écrire `artwork.basePrice > 0` provoque une erreur TypeScript. Écrire `await db.update(artworks).set({ basePrice: 500 })` provoque une erreur de type Drizzle.

**Why it happens :** PostgreSQL `NUMERIC` est précis à l'infini — JavaScript `number` (float64) perdrait de la précision. Drizzle retourne donc des strings pour préserver la précision exacte.

**How to avoid :**
- Lecture : `parseFloat(artwork.basePrice ?? '0')` pour les comparaisons numériques
- Écriture : `basePrice: amount.toString()` dans `.set()`
- [VERIFIED: src/actions/offers.ts lignes 183-186 — `parseFloat(artwork.basePrice)` pour belowFloor]

### Pitfall 2 : params est une Promise en Next.js 15

**What goes wrong :** `const { id } = params` sans `await` — TypeScript accepte mais la valeur est une Promise, pas un objet.

**How to avoid :** `const { id } = await params` — pattern établi dans toutes les pages existantes.

[VERIFIED: src/app/admin/artworks/[id]/validate/page.tsx ligne 45]

### Pitfall 3 : SiteNav dans plusieurs layouts — vérifier tous les points d'import

**What goes wrong :** SiteNav n'est pas dans un layout partagé — il est importé directement dans chaque page publique (`page.tsx`, `artworks/[id]/page.tsx`, `about/page.tsx`). Rendre SiteNav async change sa signature mais pas ses props (aucune prop). Le changement est non-breaking pour les importeurs.

**How to avoid :** Vérifier les imports SiteNav dans toutes les pages et s'assurer qu'aucune n'appelle SiteNav de façon synchrone.

[VERIFIED: src/app/page.tsx ligne 29 — `import { SiteNav }`; src/app/artworks/[id]/page.tsx — à vérifier]

### Pitfall 4 : useSearchParams dans ModalTrigger sans Suspense

**What goes wrong :** `next build` échoue avec "Missing Suspense boundary with useSearchParams".

**How to avoid :** Envelopper `<ModalTrigger />` dans `<Suspense fallback={null}>` partout où il est utilisé dans le layout.

[VERIFIED: src/app/page.tsx lignes 19-22 — ce piège est explicitement documenté pour GalleryClient]

### Pitfall 5 : AlertDialog nécessite un Client Component parent

**What goes wrong :** AlertDialog utilise des hooks React (état open/closed) — impossible dans un Server Component.

**How to avoid :** Créer `DeleteArtworkButton.tsx` avec `'use client'` qui encapsule AlertDialog + Server Action de suppression. Pattern identique à ValidationActions.tsx.

[VERIFIED: src/app/admin/artworks/[id]/validate/_components/ValidationActions.tsx — pattern existant]

### Pitfall 6 : deleteArtwork utilise redirect() — incompatible avec useActionState

**What goes wrong :** Si `deleteArtwork` appelle `redirect()`, le composant appelant ne peut pas recevoir de retour `{ success, errors }`. Les deux sont incompatibles.

**How to avoid :** `deleteArtwork` doit appeler `redirect('/admin/artworks')` directement (comme rejectArtwork) sans retourner de valeur. Le Client Component l'appelle via `startTransition` ou `<form action={deleteAction}>`, pas via useActionState. `redirect()` dans une Server Action est géré nativement par Next.js.

[VERIFIED: src/actions/validation.ts lignes 100-101, 147-148 — rejectArtwork utilise redirect() sans useActionState]

### Pitfall 7 : D-03 — zéro border-radius PARTOUT

**What goes wrong :** Les composants shadcn/ui (Button, AlertDialog) ont des border-radius par défaut. Les inline styles dans les nouvelles pages admin doivent explicitement supprimer ces valeurs.

**How to avoid :** Pour AlertDialog, surcharger les styles ou utiliser l'attribut `style`. Pour les boutons inline admin, utiliser les inline styles directement (le projet évite les classes Tailwind dans les composants admin). Ajouter `borderRadius: 0` ou `borderRadius: '0'` explicitement.

[VERIFIED: src/components/visitor/VisitorProfileModal.tsx — commentaires D-03 partout]

---

## Code Examples

### Server Action updateArtwork — structure complète

```typescript
// Source: pattern établi dans src/actions/validation.ts + src/actions/offers.ts
'use server'

import { z } from 'zod'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { db } from '@/db'
import { artworks } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

const updateArtworkSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  // date picker → string ISO → coerce en Date
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

type UpdateArtworkResult =
  | { success: true }
  | { success: false; errors: Record<string, string[]> }

export async function updateArtwork(
  artworkId: number,
  prevState: unknown,
  formData: FormData
): Promise<UpdateArtworkResult> {
  // 1. Auth
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return { success: false, errors: { _form: ['Non autorisé.'] } }

  // 2. Zod parse
  const parseResult = updateArtworkSchema.safeParse(Object.fromEntries(formData))
  if (!parseResult.success) {
    return { success: false, errors: parseResult.error.flatten().fieldErrors as Record<string, string[]> }
  }
  const data = parseResult.data

  // 3. UPDATE Drizzle — numeric → toString()
  await db.update(artworks)
    .set({
      title: data.title,
      description: data.description ?? null,
      createdDate: data.createdDate ? new Date(data.createdDate) : null,
      typeId: data.typeId ?? null,
      mediumId: data.mediumId ?? null,
      widthCm: data.widthCm?.toString() ?? null,
      heightCm: data.heightCm?.toString() ?? null,
      basePrice: data.basePrice?.toString() ?? null,
      priceHoursSpent: data.priceHoursSpent?.toString() ?? null,
      priceFormat: data.priceFormat?.toString() ?? null,
      priceFraming: data.priceFraming?.toString() ?? null,
      priceMaterials: data.priceMaterials?.toString() ?? null,
      priceTechnicality: data.priceTechnicality ?? null,
      priceAttachment: data.priceAttachment ?? null,
    })
    .where(eq(artworks.id, artworkId))

  revalidatePath(`/admin/artworks/${artworkId}`)
  revalidatePath(`/artworks/${artworkId}`)  // galerie publique aussi

  return { success: true }
}
```

### Query dashboard offres (05-03)

```typescript
// Jointure offers + visitors pour l'admin — téléphone visible uniquement ici
const offerRows = await db
  .select({
    id: offers.id,
    amount: offers.amount,
    message: offers.message,
    belowFloor: offers.belowFloor,
    createdAt: offers.createdAt,
    visitorName: visitors.displayName,
    visitorPhone: visitors.phone,    // privé — admin uniquement
    visitorEmail: visitors.email,
  })
  .from(offers)
  .leftJoin(visitors, eq(offers.visitorId, visitors.id))
  .where(eq(offers.artworkId, artworkId))
  .orderBy(desc(offers.amount))  // montant décroissant par défaut (D-10)
```

### /mon-profil — sections Mes offres + Mes acquisitions

```typescript
// Offres du visiteur connecté — toutes œuvres confondues
const myOffers = await db
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
  .where(eq(offers.visitorId, session.visitorId))
  .orderBy(desc(offers.createdAt))

// Acquisitions probables (D-18) — œuvres sold où le visiteur a soumis une offre
const myAcquisitions = myOffers.filter(o => o.artworkStatus === 'sold')
// (dédoublonner si plusieurs offres sur la même œuvre vendue)
```

### Schema savedArtworks — complet avec relations

```typescript
// src/db/schema.ts — à ajouter après la table offers

export const savedArtworks = pgTable('saved_artworks', {
  visitorId: integer('visitor_id')
    .notNull()
    .references(() => visitors.id, { onDelete: 'cascade' }),
  artworkId: integer('artwork_id')
    .notNull()
    .references(() => artworks.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  primaryKey({ columns: [table.visitorId, table.artworkId] }),
])

// Relations à ajouter dans artworkRelations et visitorRelations
export const savedArtworkRelations = relations(savedArtworks, ({ one }) => ({
  visitor: one(visitors, { fields: [savedArtworks.visitorId], references: [visitors.id] }),
  artwork: one(artworks, { fields: [savedArtworks.artworkId], references: [artworks.id] }),
}))
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `useFormState` | `useActionState` | React 19 | useFormState déprécié — useActionState est identique avec meilleure API |
| `cookies()` synchrone | `await cookies()` | Next.js 15 | Breaking change — toutes les pages doivent await cookies() |
| `params.id` direct | `const { id } = await params` | Next.js 15 | params est maintenant une Promise |

---

## Open Questions

1. **Bouton cœur (favori) sur la page détail — quand est-il visible ?**
   - Ce qu'on sait : D-14 dit "visible uniquement si le visiteur est connecté"
   - Ce qui est unclear : comment la page détail publique `/artworks/[id]` sait si le visiteur est connecté ? Elle doit déjà lire `getVisitorSession()` pour afficher OfferForm.
   - Vérification : `src/app/artworks/[id]/page.tsx` lit déjà la session (ligne 33 `import { getVisitorSession }`). Le bouton cœur peut donc utiliser `session.visitorId` directement.
   - Recommandation : pas de complexité supplémentaire — utiliser la session déjà lue dans la page.

2. **Estado del carré initiale dans SiteNav — que faire si displayName est vide ?**
   - Ce qu'on sait : displayName est `varchar(100) NOT NULL` en DB — il est toujours présent.
   - Recommandation : `displayName[0].toUpperCase()` — jamais vide car contrainte NOT NULL.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| PostgreSQL (Docker) | Table saved_artworks | ✓ | via Docker | — |
| drizzle-kit | db:push | ✓ | 0.31.10 | — |
| Node.js | npm scripts | ✓ | inféré (Next.js 15) | — |

**db:push sur Windows :** `npm run db:push` fonctionne correctement. La commande est dans package.json et s'exécute via npm — pas de problème PowerShell execution policy pour cette commande.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.5 |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run tests/admin/` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ADMIN-01 | updateArtwork valide les champs Zod, rejette les invalides, écrit en DB | unit | `npx vitest run tests/admin/updateArtwork.test.ts` | ❌ Wave 0 |
| ADMIN-02 | deleteArtwork supprime fichiers puis DB, rejette si non-auth | unit | `npx vitest run tests/admin/deleteArtwork.test.ts` | ❌ Wave 0 |
| ADMIN-04 | updateArtworkStatus accepte les 4 valeurs de l'enum, rejette les autres | unit | `npx vitest run tests/admin/updateArtworkStatus.test.ts` | ❌ Wave 0 |
| ADMIN-05 | query offres retourne téléphone et email du visiteur (admin only) | unit | `npx vitest run tests/admin/offersDashboard.test.ts` | ❌ Wave 0 |
| D-14 | toggleSavedArtwork ajoute/retire le favori correctement | unit | `npx vitest run tests/admin/toggleSavedArtwork.test.ts` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit :** `npx vitest run tests/admin/`
- **Per wave merge :** `npx vitest run`
- **Phase gate :** Full suite green avant `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `tests/admin/updateArtwork.test.ts` — couvre ADMIN-01, ADMIN-02
- [ ] `tests/admin/deleteArtwork.test.ts` — couvre ADMIN-02
- [ ] `tests/admin/updateArtworkStatus.test.ts` — couvre ADMIN-04
- [ ] `tests/admin/offersDashboard.test.ts` — couvre ADMIN-05
- [ ] `tests/admin/toggleSavedArtwork.test.ts` — couvre D-14

**Pattern de mock à suivre :** [VERIFIED: tests/visitor/profile.test.ts] — `vi.hoisted()` pour les mocks session, `vi.mock('@/db')` pour Drizzle, `vi.mock('@/lib/auth')` pour Better Auth. Reproduire exactement ce pattern dans les tests admin.

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | oui | `auth.api.getSession()` en première ligne de chaque Server Action admin |
| V3 Session Management | oui | iron-session pour visiteurs — lecture uniquement dans Server Components |
| V4 Access Control | oui | Session artistle vérifiée avant chaque mutation admin ; données visiteur (téléphone) uniquement dans admin |
| V5 Input Validation | oui | Zod parse côté serveur AVANT tout accès DB dans chaque Server Action |
| V6 Cryptography | non — pas de hachage nouveau | iron-session AES-256-CBC géré par la bibliothèque |

### Known Threat Patterns for this Phase

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| IDOR — accéder/modifier l'œuvre d'un autre artiste | Spoofing / Tampering | Vérification session artiste en première ligne de chaque Server Action |
| Téléphone visiteur exposé côté public | Info Disclosure | Téléphone jamais dans les props/retours publics — uniquement dans la query admin (D-11) |
| Suppression sans confirmation | Tampering | AlertDialog obligatoire (D-05) — le bouton "Confirmer" déclenche la Server Action |
| Path traversal sur storage.delete() | Tampering | assertSafeKey() dans LocalStorageAdapter vérifie déjà que la clé reste dans uploadDir |
| XSS via displayName dans SiteNav | XSS | React échappe automatiquement les strings dans JSX — `{session.displayName[0]}` est safe |

---

## Project Constraints (from CLAUDE.md)

- **Commenter tout le code en français** — expliquer le POURQUOI, pas seulement le QUOI
- **TypeScript strict partout** — pas de `any`, pas de `!` non justifié
- **Server Actions pour les mutations** — pas d'API REST séparée
- **Server Components pour le rendu public**
- **D-03 (Phase 3) : zéro border-radius sur TOUS les éléments** — s'applique à l'icône compte visiteur et à tous les formulaires admin
- **D-02 (Phase 3) : Oswald (titres), Space Mono (labels/nav), Cormorant Garamond (descriptions)**
- **Admin pages : `fontFamily: 'var(--font-geist-sans)'`** — pattern établi dans toutes les pages admin
- **Palette : fond `#f2e8cf`, ink `#1a1a1a`, ink-muted `#5a5244`, surface `#ede0b8`**
- **Inline styles dans les composants admin** — pas de classes Tailwind (pattern établi)
- **StorageProvider via getStorage()** — jamais importer LocalStorageAdapter directement
- **DB stocke des clés, pas des chemins absolus** — jamais `/public/uploads/...`

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Le bouton cœur dans la page détail `/artworks/[id]` utilise la session déjà lue dans cette page | Open Questions | Faible — la page importe déjà getVisitorSession, confirmé par lecture de l'import |
| A2 | `npm run db:push` fonctionne sans problème sur Windows pour ajouter saved_artworks | Environment Availability | Faible — commande via npm script, pas de PowerShell direct |

**Si ce tableau est vide :** Non applicable — 2 assumptions documentées, toutes à risque faible.

---

## Sources

### Primary (HIGH confidence — verified from codebase)

- `src/actions/validation.ts` — Pattern UPDATE/DELETE Drizzle, pattern redirect(), storage.delete()
- `src/actions/offers.ts` — Pattern Server Action complet avec Zod + useActionState
- `src/actions/visitor.ts` — Pattern createOrLoginVisitor, session.save() uniquement en Server Action
- `src/lib/storage/index.ts` — Interface StorageProvider avec delete() confirmée
- `src/lib/storage/local.ts` — Implémentation delete() avec ENOENT handling
- `src/db/schema.ts` — onDelete cascade sur offers.artworkId confirmé; types numeric vs smallint
- `src/lib/session.ts` — getVisitorSession() async, contrainte save() Server Action only
- `src/components/layout/SiteNav.tsx` — SiteNav actuellement synchrone, non-breaking async
- `src/components/visitor/VisitorProfileModal.tsx` — useActionState pattern, props isOpen/onClose
- `src/app/admin/artworks/[id]/page.tsx` — Page détail existante avec jointures type+medium
- `package.json` — versions installées vérifiées

### Secondary (MEDIUM confidence)

- Next.js 15 documentation sur async params — [ASSUMED] mais cohérent avec le code existant
- React 19 useActionState — useFormState déprécié confirmé par commentaire dans VisitorProfileModal.tsx

### Tertiary (LOW confidence)

Aucune.

---

## Metadata

**Confidence breakdown:**
- Standard stack : HIGH — tout vérifié depuis les fichiers installés et le code existant
- Architecture : HIGH — patterns extraits directement du code existant (validation.ts, offers.ts)
- Pitfalls : HIGH — identifiés depuis les commentaires explicites dans le code et les pièges documentés
- Table saved_artworks : HIGH — structure validée depuis le CONTEXT.md et cohérente avec schema.ts existant

**Research date:** 2026-05-11
**Valid until:** 2026-06-11 (stack stable — Next.js 15, Drizzle 0.45 peu susceptibles de changer)
