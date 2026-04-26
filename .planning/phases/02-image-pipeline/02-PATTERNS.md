# Phase 2: Image Pipeline - Pattern Map

**Mapped:** 2026-04-25
**Files analyzed:** 10 new/modified files
**Analogs found:** 8 / 10

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `next.config.ts` | config | — | `next.config.ts` (existing) | exact |
| `src/db/schema.ts` | model | — | `src/db/schema.ts` (existing) | exact |
| `src/lib/pipeline/process.ts` | utility | transform | `src/lib/storage/local.ts` | role-partial (same pure-function library wrapper pattern) |
| `src/actions/upload.ts` | service | file-I/O | `src/app/admin/login/page.tsx` (auth pattern) + `src/db/index.ts` (db pattern) | partial |
| `src/actions/pipeline.ts` | service | file-I/O | `src/actions/upload.ts` (sibling) | sibling |
| `src/actions/validation.ts` | service | CRUD | `src/actions/upload.ts` (sibling) | sibling |
| `src/app/api/uploads/[...key]/route.ts` | route | file-I/O | `src/app/api/auth/[...all]/route.ts` | role-match |
| `src/app/admin/upload/page.tsx` | component | request-response | `src/app/admin/login/page.tsx` | exact |
| `src/app/admin/artworks/page.tsx` | component | request-response | `src/app/admin/page.tsx` | role-match |
| `src/app/admin/artworks/[id]/validate/page.tsx` | component | request-response | `src/app/admin/page.tsx` + `src/app/admin/login/page.tsx` | role-match |
| `src/app/admin/artworks/_components/ArtworkList.tsx` | component | event-driven | `src/app/admin/_components/SignOutButton.tsx` | role-match |
| `src/app/admin/artworks/_components/PipelineBadge.tsx` | component | — | `src/app/admin/_components/SignOutButton.tsx` | role-match |
| `vitest.config.ts` | config | — | — | no analog |
| `tests/pipeline/process.test.ts` | test | — | — | no analog |

---

## Pattern Assignments

### `next.config.ts` (config — modify)

**Analog:** `next.config.ts` (existing file, lines 1-38)

**Modification target** — add `experimental.serverActions.bodySizeLimit` and `experimental.proxyClientMaxBodySize`.

**Existing structure to extend** (lines 12-36):
```typescript
const nextConfig: NextConfig = {
  // Existing: serverExternalPackages, typescript, eslint, images
  serverExternalPackages: ['kysely', '@better-auth/kysely-adapter'],
  typescript: { ignoreBuildErrors: false },
  eslint: { ignoreDuringBuilds: false },
  images: { remotePatterns: [] },
}
```

**Add inside `nextConfig`** — insert after `serverExternalPackages`:
```typescript
// Augmente la limite de taille pour les Server Actions (défaut: 1 MB).
// POURQUOI 25 MB ? L'artiste uploade des JPEG iPhone jusqu'à 20 MB.
// La marge de 5 MB couvre les métadonnées FormData et les variations de taille.
experimental: {
  serverActions: {
    bodySizeLimit: '25mb',
  },
  // Limite proxy interne Next.js 15 standalone — même valeur que bodySizeLimit.
  // Sans ce paramètre, les builds standalone en production échouent pour les
  // fichiers > 1 MB (bug Next.js 15.5+). Ignoré silencieusement si non supporté.
  proxyClientMaxBodySize: '25mb',
},
```

---

### `src/db/schema.ts` (model — modify)

**Analog:** `src/db/schema.ts` (existing file, lines 206-269)

**Modification target** — the `artworks` table `title` column already has `.notNull()` but no `.default()`. Add `'Sans titre'` default to support D-01/D-02 (upload before metadata).

**Current column** (line 210):
```typescript
title: varchar('title', { length: 255 }).notNull(),
```

**Change to:**
```typescript
// Titre par défaut 'Sans titre' pour les uploads sans métadonnées (D-01, D-02).
// L'artiste mettra à jour ce titre depuis l'admin en Phase 5.
title: varchar('title', { length: 255 }).notNull().default('Sans titre'),
```

**Comment style to follow** — the schema uses block comments in French before each field group. See lines 208-209 (existing comment pattern):
```typescript
// === Métadonnées de l'œuvre ===
title: varchar('title', { length: 255 }).notNull(),
```

---

### `src/lib/pipeline/process.ts` (utility, transform)

**Analog:** `src/lib/storage/local.ts`

**Imports pattern** (local.ts lines 21-23):
```typescript
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import type { StorageProvider } from './index'
```

**Adapted imports for process.ts:**
```typescript
import sharp from 'sharp'
```

**Pure function + interface export pattern** (local.ts lines 29-88 — class approach; adapt to function):
The project uses single-responsibility modules with a clear exported interface. For `process.ts`, export a typed interface and a single async function (not a class):
```typescript
export interface PipelineResult {
  processedBuffer: Buffer
  thumbnailBuffer: Buffer
}

export async function processImage(inputBuffer: Buffer): Promise<PipelineResult> { ... }
```

**Error handling pattern** (local.ts lines 133-141):
```typescript
try {
  const data = await fs.readFile(filePath)
  return Buffer.from(data)
} catch {
  // Transformer l'erreur système en message compréhensible
  throw new Error(
    `Fichier introuvable dans le stockage local : "${key}". ` +
    `Chemin vérifié : ${filePath}`
  )
}
```

**Comment style** (local.ts lines 1-20): Each file opens with a JSDoc block in French explaining POURQUOI. Each method/function has a JSDoc comment. Inline comments explain critical ordering or decisions.

**Core Sharp chain** — from RESEARCH.md Pattern 1 (verified):
```typescript
// Version traitée — pleine résolution
const processedBuffer = await sharp(inputBuffer)
  .rotate()                           // D-11 : EXIF rotation EN PREMIER (obligatoire)
  .normalise({ lower: 1, upper: 99 }) // PIPE-02/03 : exposition + contraste
  .withMetadata()                     // D-12 : préserver profil ICC Display-P3
  .webp({ quality: 85 })             // D-14 : sortie WebP
  .toBuffer()

// Miniature — largeur 400px max
const thumbnailBuffer = await sharp(inputBuffer)
  .rotate()
  .resize(400, null, { withoutEnlargement: true })
  .normalise({ lower: 1, upper: 99 })
  .withMetadata()
  .webp({ quality: 80 })
  .toBuffer()
```

---

### `src/actions/upload.ts` (service, file-I/O)

**Analog 1 (auth pattern):** `src/app/admin/page.tsx` lines 23-30
**Analog 2 (db pattern):** `src/db/index.ts` lines 1-43

**`'use server'` directive** — required at top of all Server Action files. Not yet established in codebase (Phase 1 has no Server Actions), but this is the Next.js App Router convention:
```typescript
'use server'
```

**Auth check pattern** (admin/page.tsx lines 23-30):
```typescript
// Récupérer la session de l'artiste connecté
const session = await auth.api.getSession({
  headers: await headers(),
})
// Si, malgré le middleware, la session est absente, rediriger
if (!session) {
  redirect('/admin/login')
}
```

**Adapted for Server Actions** (redirect → return error):
```typescript
const session = await auth.api.getSession({ headers: await headers() })
if (!session) return { error: 'Non autorisé.' }
```

**Imports pattern** (combining admin/page.tsx + db/index.ts patterns):
```typescript
'use server'

import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { db } from '@/db'
import { artworks } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { getStorage } from '@/lib/storage'
import { processImage } from '@/lib/pipeline/process'
import { randomUUID } from 'crypto'
```

**Drizzle insert pattern** (from schema.ts type exports, lines 488-490):
```typescript
// Créer l'entrée DB en PENDING (D-02)
const [artwork] = await db.insert(artworks).values({
  title: 'Sans titre',       // valeur par défaut jusqu'à édition Phase 5
  pipelineState: 'pending',
  originalPath: originalKey,
}).returning({ id: artworks.id })
```

**Drizzle update pattern** (from RESEARCH.md Code Examples):
```typescript
await db.update(artworks)
  .set({ pipelineState: 'processing' })
  .where(eq(artworks.id, artwork.id))
```

**Error handling pattern** — catch block must set FAILED state + clean partial files (RESEARCH.md Pattern 2):
```typescript
try {
  // ... pipeline ...
  return { success: true, artworkId: artwork.id }
} catch (err) {
  // D-08 : état FAILED explicite si Sharp plante
  await db.update(artworks)
    .set({ pipelineState: 'failed' })
    .where(eq(artworks.id, artwork.id))
  // Nettoyer les fichiers partiels — silencieux si absents
  await storage.delete(processedKey).catch(() => {})
  await storage.delete(thumbnailKey).catch(() => {})
  return { error: 'Le traitement a échoué. Utilisez "Réessayer le traitement" dans la liste.' }
}
```

**Return shape convention** — all Server Actions in this project return `{ error: string }` on failure or `{ success: true, ... }` on success (consistent with RESEARCH.md Pattern 2 and admin/login pattern).

---

### `src/actions/pipeline.ts` (service, file-I/O — retryPipeline)

**Analog:** `src/actions/upload.ts` (sibling, same pipeline + auth pattern)

Same `'use server'` directive, same auth check, same Drizzle update pattern. The retry action reads the stored `originalPath`, re-runs `processImage()`, and updates DB state. Copy all structural patterns from `upload.ts`.

**Key difference:** No file upload — reads from StorageProvider instead:
```typescript
// Lire le fichier original depuis le stockage (jamais écrasé — D-13)
const buffer = await storage.get(artwork.originalPath)
```

---

### `src/actions/validation.ts` (service, CRUD)

**Analog:** `src/actions/upload.ts` (sibling) + `src/db/schema.ts` (field names)

Same `'use server'`, auth, and Drizzle patterns. Three actions:

**approveArtwork** — sets pipeline_state to 'published' and published_at:
```typescript
await db.update(artworks)
  .set({ pipelineState: 'published', publishedAt: new Date() })
  .where(eq(artworks.id, artworkId))
```

**publishRaw** — copies original_path into processed_path then publishes:
```typescript
await db.update(artworks)
  .set({
    processedPath: artwork.originalPath, // PIPE-05 : original becomes the processed version
    pipelineState: 'published',
    publishedAt: new Date(),
  })
  .where(eq(artworks.id, artworkId))
```

**rejectArtwork** — deletes all 3 storage files + DB row:
```typescript
// Supprimer les 3 variantes stockées avant de supprimer la ligne DB
await storage.delete(artwork.originalPath).catch(() => {})
await storage.delete(artwork.processedPath ?? '').catch(() => {})
await storage.delete(artwork.thumbnailPath ?? '').catch(() => {})
await db.delete(artworks).where(eq(artworks.id, artworkId))
```

---

### `src/app/api/uploads/[...key]/route.ts` (route, file-I/O)

**Analog:** `src/app/api/auth/[...all]/route.ts` (lines 1-20)

**Catch-all route pattern** (auth route lines 14-20):
```typescript
import { toNextJsHandler } from 'better-auth/next-js'
import { auth } from '@/lib/auth'

export const { GET, POST } = toNextJsHandler(auth)
```

**Adapted imports for uploads route:**
```typescript
import { type NextRequest, NextResponse } from 'next/server'
import { getStorage } from '@/lib/storage'
```

**Route Handler with dynamic params** — Next.js 15 App Router requires `params` to be awaited (Promise):
```typescript
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string[] }> }
) {
  const { key } = await params
  const storageKey = key.join('/')
  // ...
}
```

**Error response pattern** (following local.ts error pattern):
```typescript
try {
  const storage = getStorage()
  const buffer = await storage.get(storageKey)
  const contentType = detectContentType(storageKey)
  return new Response(buffer, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=3600',
    },
  })
} catch {
  return new NextResponse('Fichier introuvable', { status: 404 })
}
```

**Content-type helper** — pure function, no imports needed:
```typescript
function detectContentType(key: string): string {
  if (key.endsWith('.webp')) return 'image/webp'
  if (key.endsWith('.jpg') || key.endsWith('.jpeg')) return 'image/jpeg'
  if (key.endsWith('.png')) return 'image/png'
  return 'application/octet-stream'
}
```

---

### `src/app/admin/upload/page.tsx` (component, request-response)

**Analog:** `src/app/admin/login/page.tsx` (exact role match — admin form page with `'use client'`, state, submit handler)

**`'use client'` + useState pattern** (login/page.tsx lines 16-28):
```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminUploadPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
```

**Form submit pattern with loading state** (login/page.tsx lines 37-67):
```typescript
async function handleSubmit(e: React.FormEvent) {
  e.preventDefault()
  setLoading(true)
  setError(null)

  try {
    // ... call Server Action ...
    router.refresh()
    router.push('/admin/artworks')
  } catch {
    setError('Erreur inattendue. Vérifiez votre réseau.')
  } finally {
    setLoading(false)
  }
}
```

**Server Action call via `startTransition`** — for upload, use `useTransition` + `useActionState` (React 19 pattern established in RESEARCH.md) instead of `fetch`. The action is called directly:
```typescript
import { useActionState } from 'react'
import { uploadArtwork } from '@/actions/upload'

const [state, formAction, isPending] = useActionState(uploadArtwork, null)
```

**Error display pattern** (login/page.tsx lines 115-117):
```typescript
{error && (
  <p style={{ color: '#c00', marginBottom: '1rem' }}>{error}</p>
)}
```

**Button disabled during loading** (login/page.tsx lines 120-132):
```typescript
<button
  type="submit"
  disabled={loading}
  style={{ cursor: loading ? 'not-allowed' : 'pointer' }}
>
  {loading ? 'Chargement…' : 'Texte normal'}
</button>
```

**File input specifics** (D-05/D-06 — no analog in codebase, use HTML directly):
```html
<input
  type="file"
  name="file"
  accept="image/jpeg,image/png"
  required
  disabled={isPending}
/>
```

---

### `src/app/admin/artworks/page.tsx` (component, request-response — Server Component)

**Analog:** `src/app/admin/page.tsx` (lines 1-51 — admin Server Component with auth check)

**Server Component auth + redirect pattern** (admin/page.tsx lines 14-31):
```typescript
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function AdminArtworksPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session) {
    redirect('/admin/login')
  }
  // ... render ...
}
```

**Drizzle query pattern** (from db/index.ts singleton + schema.ts types):
```typescript
import { db } from '@/db'
import { artworks } from '@/db/schema'
import { desc } from 'drizzle-orm'

const allArtworks = await db
  .select()
  .from(artworks)
  .orderBy(desc(artworks.createdAt))
```

**Pass data to Client Component for polling** — the Server Component renders the list and passes `hasPendingItems` to `PipelinePoller`:
```typescript
const hasPendingItems = allArtworks.some(
  a => a.pipelineState === 'pending' || a.pipelineState === 'processing'
)
// Then render: <PipelinePoller hasPendingItems={hasPendingItems} />
```

---

### `src/app/admin/artworks/[id]/validate/page.tsx` (component, request-response)

**Analog:** `src/app/admin/page.tsx` (Server Component auth) + `src/app/admin/login/page.tsx` (Client Component for button states)

**Server Component pattern for dynamic route** (admin/page.tsx lines 19-31 + Next.js 15 async params):
```typescript
export default async function ValidatePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/admin/login')

  // Fetch artwork with both image paths
  const artwork = await db.query.artworks.findFirst({
    where: eq(artworks.id, parseInt(id)),
  })
  if (!artwork) notFound()

  const storage = getStorage()
  const originalUrl = storage.getUrl(artwork.originalPath ?? '')
  const processedUrl = storage.getUrl(artwork.processedPath ?? '')

  return (
    // ... side-by-side layout with Server Actions ...
  )
}
```

**Validation action buttons** — use `<form action={serverAction}>` pattern (Server Actions in Next.js 15 App Router; no `'use client'` needed for form submission):
```typescript
import { approveArtwork, publishRaw, rejectArtwork } from '@/actions/validation'

// Bind artworkId to each action
const approveWithId = approveArtwork.bind(null, artwork.id)
const publishRawWithId = publishRaw.bind(null, artwork.id)
const rejectWithId = rejectArtwork.bind(null, artwork.id)

<form action={approveWithId}>
  <button type="submit">Approuver la correction</button>
</form>
```

---

### `src/app/admin/artworks/_components/ArtworkList.tsx` (component, event-driven — Client Component)

**Analog:** `src/app/admin/_components/SignOutButton.tsx` (lines 1-46 — `'use client'` component with `useRouter`)

**`'use client'` + `useRouter` pattern** (SignOutButton.tsx lines 13-15):
```typescript
'use client'
import { useRouter } from 'next/navigation'
```

**Polling with `useEffect`** — not in existing codebase, but follows the same `useRouter` pattern. From RESEARCH.md Pattern 4:
```typescript
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  hasPendingItems: boolean
}

export function PipelinePoller({ hasPendingItems }: Props) {
  const router = useRouter()

  useEffect(() => {
    if (!hasPendingItems) return
    // Rafraîchir toutes les 3 secondes pour suivre PENDING → AWAITING_VALIDATION
    const id = setInterval(() => router.refresh(), 3000)
    return () => clearInterval(id) // Nettoyer l'intervalle quand le composant est démonté
  }, [hasPendingItems, router])

  return null // Composant purement comportemental — aucun rendu visible
}
```

---

### `src/app/admin/artworks/_components/PipelineBadge.tsx` (component — display only)

**Analog:** `src/app/admin/_components/SignOutButton.tsx` (Client Component structure)

This is a pure display component (no hooks needed — can be a Server Component). Pattern from SignOutButton.tsx for export style:
```typescript
// PipelineBadge.tsx — composant de rendu pur, pas de 'use client' requis
export function PipelineBadge({ state }: { state: string }) {
  // Map état pipeline → couleur badge
  const config: Record<string, { label: string; color: string }> = {
    pending:              { label: 'En attente',   color: '#888' },
    processing:           { label: 'En traitement', color: '#f90' },
    awaiting_validation:  { label: 'À valider',     color: '#09f' },
    published:            { label: 'Publié',         color: '#0a0' },
    failed:               { label: 'Échec',          color: '#c00' },
  }
  const { label, color } = config[state] ?? { label: state, color: '#888' }
  return (
    <span style={{ padding: '0.2rem 0.5rem', borderRadius: '4px',
                   backgroundColor: color, color: '#fff', fontSize: '0.75rem' }}>
      {label}
    </span>
  )
}
```

---

### `vitest.config.ts` + `tests/pipeline/*.test.ts` (config + tests)

**No analog in codebase** — no test infrastructure exists yet. Use RESEARCH.md Validation Architecture section directly. See "No Analog Found" table below.

---

## Shared Patterns

### Authentication Check (Server Components and Server Actions)

**Source:** `src/app/admin/page.tsx` lines 23-30

**Apply to:** All files in `src/app/admin/**` (Server Components) and all files in `src/actions/**`

**Server Component version** (redirects on failure):
```typescript
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

const session = await auth.api.getSession({ headers: await headers() })
if (!session) redirect('/admin/login')
```

**Server Action version** (returns error on failure):
```typescript
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'

const session = await auth.api.getSession({ headers: await headers() })
if (!session) return { error: 'Non autorisé.' }
```

---

### Drizzle ORM DB Access

**Source:** `src/db/index.ts` lines 13-43 (singleton), `src/db/schema.ts` lines 206-269 (artworks table)

**Apply to:** All Server Actions and Server Components that query the DB

**Import pattern:**
```typescript
import { db } from '@/db'
import { artworks } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'
```

**State update pattern:**
```typescript
await db.update(artworks)
  .set({ pipelineState: 'awaiting_validation', processedPath: key, thumbnailPath: thumbKey })
  .where(eq(artworks.id, artworkId))
```

---

### StorageProvider Usage

**Source:** `src/lib/storage/index.ts` lines 92-118 (getStorage factory)

**Apply to:** `src/actions/upload.ts`, `src/actions/pipeline.ts`, `src/actions/validation.ts`, `src/app/api/uploads/[...key]/route.ts`, `src/app/admin/artworks/[id]/validate/page.tsx`

**Import and usage pattern:**
```typescript
import { getStorage } from '@/lib/storage'

const storage = getStorage()
await storage.put(key, buffer, { contentType: 'image/webp' })
const buffer = await storage.get(key)
await storage.delete(key).catch(() => {}) // idempotent delete
const url = storage.getUrl(key)
```

---

### French Comment Style (Project-wide Convention)

**Source:** All existing files — `src/lib/storage/local.ts`, `src/db/schema.ts`, `src/app/admin/page.tsx`

**Apply to:** Every new file

**Pattern:**
- File-level JSDoc block explaining POURQUOI (not QUOI)
- Each function/method has a JSDoc comment
- Inline comments explain critical decisions, pointing to decision IDs (D-11, PIPE-02, etc.)
- Error messages are in French, actionable for the artist

```typescript
/**
 * [One-line description].
 *
 * POURQUOI [explain architectural reason] ?
 * [Detail linking to decision or constraint].
 */
```

---

### Next.js 15 Async Params Pattern

**Source:** RESEARCH.md + Next.js 15 App Router spec (no existing analog yet)

**Apply to:** `src/app/api/uploads/[...key]/route.ts`, `src/app/admin/artworks/[id]/validate/page.tsx`

**Pattern** — params are a Promise in Next.js 15:
```typescript
// Route Handler
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string[] }> }
) {
  const { key } = await params
}

// Page Component
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
}
```

---

### Server Action Return Shape

**Source:** RESEARCH.md Pattern 2 (no existing analog in codebase yet — Phase 1 had no Server Actions)

**Apply to:** All files in `src/actions/`

**Convention:**
```typescript
// Échec — toujours { error: string }
return { error: 'Message en français compréhensible pour l\'artiste.' }

// Succès — { success: true } + payload optionnel
return { success: true, artworkId: artwork.id }
```

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `vitest.config.ts` | config | — | No test framework installed; no existing test config |
| `tests/pipeline/process.test.ts` | test | — | No tests exist in the codebase yet (Wave 0 gap identified in RESEARCH.md) |
| `tests/pipeline/upload.test.ts` | test | — | Same — no test infrastructure |
| `tests/pipeline/validation.test.ts` | test | — | Same — no test infrastructure |
| `tests/fixtures/test-image.jpg` | fixture | — | No test fixtures exist |

For all test files: use RESEARCH.md "Validation Architecture" section (Vitest + `@vitejs/plugin-react`, ESM config, `npx vitest run`).

---

## Metadata

**Analog search scope:** `src/` (all TypeScript/TSX files — 12 files scanned)
**Files scanned:** 12
**Pattern extraction date:** 2026-04-25
