# Phase 2: Image Pipeline — Research

**Researched:** 2026-04-25
**Domain:** Sharp image processing, Next.js 15 Server Actions file upload, pipeline state machine, admin validation UI
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Upload photo FIRST, then metadata. Upload triggers pipeline immediately.
- **D-02:** Upload creates a DB row with `PENDING` state immediately, even before metadata.
- **D-03:** Validation screen: side-by-side layout (original left, corrected right). No slider.
- **D-04:** Three validation actions: "Approuver la correction" / "Publier l'original" / "Rejeter".
- **D-05:** Simple `<input type="file">` — no drag-drop.
- **D-06:** JPEG and PNG only. HEIC rejected with French message.
- **D-07:** Max 20 MB. Reject with French message if exceeded.
- **D-08:** FAILED state visible in admin with red badge on pipeline crash.
- **D-09:** "Réessayer" button on FAILED entries — reruns pipeline on the stored original.
- **D-10:** No email notification for pipeline failures.
- **D-11:** `.rotate()` ALWAYS first in Sharp chain (EXIF rotation before any operation).
- **D-12:** `withMetadata()` ALWAYS to preserve ICC profile (Display-P3 iPhone).
- **D-13:** Store 3 distinct paths: `original_path`, `processed_path`, `thumbnail_path`. Original never overwritten.
- **D-14:** WebP output for processed and thumbnail variants. Original kept as-is.

### Claude's Discretion

- Exact thumbnail dimensions (e.g., 400px wide).
- Sharp `normalise()` parameter values — default `{lower: 1, upper: 99}` applies.
- UI polling interval for PENDING → PROCESSING → AWAITING_VALIDATION transitions.

### Deferred Ideas (OUT OF SCOPE)

- Progress bar during Sharp processing — polling of state is sufficient for v1.
- Email notification on pipeline failure — Phase 5 evaluation.
- Manual crop/rotation before publishing — v2.
- Batch upload (multiple photos at once) — v2.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PIPE-01 | Artist can upload an image from any device (phone or desktop) | Server Action + FormData + `<input type="file">` pattern verified |
| PIPE-02 | Pipeline auto-corrects exposure and contrast | Sharp `normalise({lower:1, upper:99})` verified in Sharp 0.34.5 |
| PIPE-03 | Pipeline applies basic white balance (colour normalisation) | Sharp `modulate()` + `stats()` grey-world approach — or `normalise()` alone covers most cases |
| PIPE-04 | Artist sees before/after comparison screen and manually validates | Route `/admin/artworks/[id]/validate`, side-by-side, 3 actions |
| PIPE-05 | Artist can choose to publish the raw original without correction | "Publier l'original" action in validation screen |
| ADMIN-03 | Artist accesses pipeline validation screen: validate, reject, or publish raw | Same as PIPE-04 — single screen covers both requirements |
</phase_requirements>

---

## Summary

Phase 2 builds the complete image ingestion path: upload → Sharp processing → artist approval → DB state update. The Sharp library is already installed (v0.34.5, verified against npm registry as latest). All required Sharp operations (`rotate`, `normalise`, `modulate`, `withMetadata`, `webp`, `resize`, `toBuffer`, `stats`) are confirmed available and working via local testing.

The main technical challenge is **Next.js 15's Server Action body size limit**: the default is 1 MB, must be raised to `'20mb'` in `next.config.ts` under `experimental.serverActions.bodySizeLimit`. In Next.js 15.5.x there is also a known proxy body limit issue in standalone production builds — set `experimental.proxyClientMaxBodySize: '25mb'` as a precaution. Sharp is in Next.js's automatic `serverExternalPackages` exclusion list — no explicit config needed.

The pipeline runs **synchronously inside the Server Action** on the first upload: the action creates the DB row (PENDING), stores the original file, then immediately processes it with Sharp, stores processed + thumbnail, and transitions the row to AWAITING_VALIDATION (or FAILED on error). This is the simplest model — no background queue, no separate worker. Given that Sharp processes a 20 MB JPEG in well under 5 seconds on any modern server, synchronous execution is appropriate for v1.

The upload directory (`/uploads`) is served via a **Next.js Route Handler** at `/api/uploads/[...key]/route.ts` since files live outside the `public/` folder and are written at runtime. The `getUrl()` method of `LocalStorageAdapter` already returns `http://localhost:3000/uploads/...` — this must be backed by a Route Handler, not a rewrite.

**Primary recommendation:** Synchronous Sharp pipeline inside the Server Action; Route Handler to serve uploaded files; polling at 3-second intervals with `setInterval` in a `useEffect` Client Component for the admin artworks list.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| File validation (MIME, size) | API / Server Action | — | Must happen server-side to avoid client bypass |
| Original file storage | API / Server Action → Storage | — | Writes to StorageProvider before any processing |
| Sharp pipeline (rotate, normalise, WebP output) | API / Server Action | — | CPU-bound Node.js; cannot run in Edge runtime |
| DB state transitions (PENDING → PROCESSING → AWAITING_VALIDATION / FAILED) | API / Server Action | — | Atomic DB updates co-located with processing |
| Serving uploaded images | Route Handler (/api/uploads) | — | Files are outside /public, written at runtime |
| Pipeline status polling | Browser / Client Component | — | `setInterval` + `fetch` or `router.refresh()` |
| Before/after validation UI | Frontend (Server + Client) | — | Server renders page; Client Component handles button loading states |
| Validation actions (approve / publish-raw / reject) | API / Server Action | — | All mutations are Server Actions per project pattern |

---

## Standard Stack

### Core (already installed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| sharp | 0.34.5 | Image processing: rotate, normalise, WebP, resize, ICC | The canonical Node.js image processing library |
| drizzle-orm | 0.45.2 | DB queries and state updates | Already in use from Phase 1 |
| zod | 4.3.6 | File validation (size, MIME check) | Already in use; validates Server Action inputs |
| react | 19.1.0 | `useActionState` for form error state | Phase 1 established |
| next | 15.5.15 | Server Actions, Route Handlers | Phase 1 established |

### Supporting (not yet installed)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| shadcn/ui | latest | Button, Badge, Card, Alert, AlertDialog components | Required for plan 02-04 (validation UI) |
| lucide-react | bundled with shadcn | Icons (spinner, check, x) | Bundled automatically with shadcn |

**shadcn/ui initialisation:** Run `npx shadcn init` at the start of plan 02-04. The `02-UI-SPEC.md` specifies: style "default", baseColor "neutral", Tailwind CSS 4 mode. Then add individual components: `npx shadcn add button badge alert card alert-dialog`.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Sync Server Action pipeline | Background queue (BullMQ, etc.) | Queue adds infra complexity with no benefit at v1 scale (single user, <5s processing) |
| Route Handler for uploads serving | `next.config.ts` rewrites | Rewrites serve static assets but cannot serve files written to disk at runtime outside `/public` |
| `setInterval` polling | Server-Sent Events | SSE is more elegant but requires a persistent connection handler; overkill for a single-artist admin |

**Installation (plan 02-02):**
```bash
# sharp is already installed — no install needed
# shadcn init at start of plan 02-04:
npx shadcn init
npx shadcn add button badge alert card alert-dialog
```

**Version verification:** Sharp 0.34.5 confirmed as latest via `npm view sharp version` on 2026-04-25 (published 2026-04-25T08:32:45.362Z). [VERIFIED: npm registry]

---

## Architecture Patterns

### System Architecture Diagram

```
Artist browser
     │
     │  POST FormData (file ≤ 20 MB)
     ▼
[Server Action: uploadArtwork()]
     │
     ├─ 1. Validate: MIME type, size, auth session
     │       └─ HEIC or >20MB → return { error: "..." }
     │
     ├─ 2. DB INSERT artworks { pipeline_state: 'pending', original_path }
     │
     ├─ 3. StorageProvider.put("originals/<uuid>.jpg", buffer)
     │
     ├─ 4. DB UPDATE { pipeline_state: 'processing' }
     │
     ├─ 5. Sharp chain:
     │       .rotate()                          ← EXIF correction first
     │       .normalise({lower:1, upper:99})    ← exposure + contrast
     │       .withMetadata()                    ← preserve ICC (Display-P3)
     │       .webp({quality: 85})               ← processed output
     │       .toBuffer()
     │
     ├─ 6. StorageProvider.put("processed/<uuid>.webp", processedBuf)
     │
     ├─ 7. Sharp chain (thumbnail):
     │       .rotate()
     │       .resize(400, null, {withoutEnlargement: true})
     │       .normalise({lower:1, upper:99})
     │       .withMetadata()
     │       .webp({quality: 80})
     │       .toBuffer()
     │
     ├─ 8. StorageProvider.put("thumbnails/<uuid>.webp", thumbBuf)
     │
     ├─ 9a. SUCCESS → DB UPDATE { pipeline_state: 'awaiting_validation',
     │                             processed_path, thumbnail_path }
     │
     └─ 9b. FAILURE (catch) → DB UPDATE { pipeline_state: 'failed' }
                                delete("processed/<uuid>.webp") if partial write

Admin artworks list (/admin/artworks)
     │
     └─ Client Component polls GET /api/artworks/status every 3s
              └─ Badge updates: PENDING → PROCESSING → AWAITING_VALIDATION
              └─ Stops polling when terminal state reached

Validation screen (/admin/artworks/[id]/validate)
     │
     ├─ Server Component renders side-by-side with getUrl(original_path) and getUrl(processed_path)
     │
     └─ Three Server Actions:
           approveArtwork(id)  → pipeline_state = 'published', published_at = now()
           publishRaw(id)      → processed_path = original_path, pipeline_state = 'published'
           rejectArtwork(id)   → delete 3 storage files, DELETE artworks row

Uploaded file serving
     GET /api/uploads/[...key]
          └─ Route Handler reads StorageProvider.get(key) → returns Response(buffer, content-type)
```

### Recommended Project Structure

```
src/
├── app/
│   ├── admin/
│   │   ├── upload/
│   │   │   └── page.tsx             # /admin/upload — upload form
│   │   └── artworks/
│   │       ├── page.tsx             # /admin/artworks — list with status badges
│   │       ├── _components/
│   │       │   ├── ArtworkList.tsx  # Client Component (polling)
│   │       │   └── PipelineBadge.tsx
│   │       └── [id]/
│   │           └── validate/
│   │               └── page.tsx     # /admin/artworks/[id]/validate
│   └── api/
│       └── uploads/
│           └── [...key]/
│               └── route.ts         # Serve files from StorageProvider
├── lib/
│   └── pipeline/
│       └── process.ts               # Sharp pipeline function (pure, testable)
└── actions/
    ├── upload.ts                    # uploadArtwork Server Action
    ├── pipeline.ts                  # retryPipeline Server Action
    └── validation.ts                # approve / publishRaw / rejectArtwork
```

### Pattern 1: Sharp Pipeline Function (pure, isolated)

**What:** Extract the Sharp processing into a pure async function that takes a Buffer and returns `{ processedBuffer, thumbnailBuffer }`. This isolates Sharp from Next.js and makes it independently testable.

**When to use:** Always — keeps Server Action thin, pipeline logic reusable for "retry" action.

```typescript
// Source: Sharp docs /lovell/sharp + local verification 2026-04-25
// src/lib/pipeline/process.ts

import sharp from 'sharp'

export interface PipelineResult {
  processedBuffer: Buffer
  thumbnailBuffer: Buffer
}

/**
 * Traite une image avec Sharp :
 * 1. Corrige la rotation EXIF (indispensable pour les photos iPhone)
 * 2. Normalise l'exposition et le contraste (normalise)
 * 3. Préserve le profil ICC (Display-P3 iPhone via withMetadata)
 * 4. Génère une version traitée en WebP (qualité 85)
 * 5. Génère une miniature 400px en WebP (qualité 80)
 *
 * ORDRE OBLIGATOIRE : .rotate() TOUJOURS en premier.
 * Si rotate() est appelé après normalise(), les pixels déjà normalisés
 * sont réinterprétés avec une orientation incorrecte.
 */
export async function processImage(inputBuffer: Buffer): Promise<PipelineResult> {
  // Version traitée — pleine résolution
  const processedBuffer = await sharp(inputBuffer)
    .rotate()                           // D-11 : EXIF rotation en premier
    .normalise({ lower: 1, upper: 99 }) // PIPE-02/03 : exposition + contraste
    .withMetadata()                     // D-12 : préserver profil ICC Display-P3
    .webp({ quality: 85 })             // D-14 : sortie WebP
    .toBuffer()

  // Miniature — largeur 400px max, même pipeline de correction
  const thumbnailBuffer = await sharp(inputBuffer)
    .rotate()
    .resize(400, null, { withoutEnlargement: true }) // jamais agrandir
    .normalise({ lower: 1, upper: 99 })
    .withMetadata()
    .webp({ quality: 80 })
    .toBuffer()

  return { processedBuffer, thumbnailBuffer }
}
```

### Pattern 2: Server Action for Upload with Atomic State Transitions

**What:** Upload Server Action handles validation, DB insert, storage write, pipeline execution, and state update in a single transaction-aware flow. The FAILED state is set in the `catch` block.

**When to use:** For the upload endpoint (plan 02-01 + 02-02 + 02-03).

```typescript
// Source: Next.js docs /vercel/next.js + local verification 2026-04-25
// src/actions/upload.ts
'use server'

import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { db } from '@/db'
import { artworks } from '@/db/schema'
import { getStorage } from '@/lib/storage'
import { processImage } from '@/lib/pipeline/process'
import { randomUUID } from 'crypto'

const MAX_SIZE_BYTES = 20 * 1024 * 1024 // 20 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png']
const HEIC_TYPES = ['image/heic', 'image/heif']

export async function uploadArtwork(formData: FormData) {
  // Vérifier la session artiste
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return { error: 'Non autorisé.' }

  const file = formData.get('file')
  if (!(file instanceof File)) return { error: 'Aucun fichier reçu.' }

  // Validation MIME et taille
  if (HEIC_TYPES.includes(file.type)) {
    return { error: "Les photos iPhone en format HEIC ne sont pas supportées. Exporte en JPEG depuis l'app Photos." }
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { error: 'Ce format de fichier n\'est pas supporté. Utilise un fichier JPEG ou PNG.' }
  }
  if (file.size > MAX_SIZE_BYTES) {
    return { error: 'Le fichier est trop lourd (max 20 MB). Compresse-le avant d\'uploader.' }
  }

  // Convertir File → Buffer pour Sharp et StorageProvider
  const buffer = Buffer.from(new Uint8Array(await file.arrayBuffer()))
  const ext = file.type === 'image/png' ? 'png' : 'jpg'
  const uuid = randomUUID()
  const originalKey = `originals/${uuid}.${ext}`
  const processedKey = `processed/${uuid}.webp`
  const thumbnailKey = `thumbnails/${uuid}.webp`
  const storage = getStorage()

  // Créer l'entrée DB en PENDING (D-02)
  const [artwork] = await db.insert(artworks).values({
    title: 'Sans titre',
    pipelineState: 'pending',
    originalPath: originalKey,
  }).returning({ id: artworks.id })

  // Stocker l'original (jamais écrasé — D-13)
  await storage.put(originalKey, buffer, { contentType: file.type })

  // Lancer le pipeline en passant à PROCESSING
  await db.update(artworks)
    .set({ pipelineState: 'processing' })
    .where(eq(artworks.id, artwork.id))

  try {
    const { processedBuffer, thumbnailBuffer } = await processImage(buffer)
    await storage.put(processedKey, processedBuffer, { contentType: 'image/webp' })
    await storage.put(thumbnailKey, thumbnailBuffer, { contentType: 'image/webp' })

    await db.update(artworks)
      .set({
        pipelineState: 'awaiting_validation',
        processedPath: processedKey,
        thumbnailPath: thumbnailKey,
      })
      .where(eq(artworks.id, artwork.id))

    return { success: true, artworkId: artwork.id }
  } catch (err) {
    // D-08 : état FAILED explicite si Sharp plante
    await db.update(artworks)
      .set({ pipelineState: 'failed' })
      .where(eq(artworks.id, artwork.id))
    // Nettoyer les fichiers partiels
    await storage.delete(processedKey).catch(() => {})
    await storage.delete(thumbnailKey).catch(() => {})
    return { error: 'Le traitement a échoué. Utilisez "Réessayer le traitement" dans la liste.' }
  }
}
```

### Pattern 3: Route Handler for Serving Upload Files

**What:** A catch-all Route Handler at `/api/uploads/[...key]` reads from `StorageProvider.get()` and returns the file as a binary `Response`. This backs the `getUrl()` URLs produced by `LocalStorageAdapter`.

**When to use:** Required in plan 02-01 — the admin validation UI displays images via `getUrl()` which resolves to `http://localhost:3000/uploads/...`.

```typescript
// Source: Next.js docs route handler pattern + StorageProvider interface
// src/app/api/uploads/[...key]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getStorage } from '@/lib/storage'

/**
 * Route Handler pour servir les fichiers uploadés depuis le stockage local.
 *
 * POURQUOI une route API et pas le dossier /public ?
 * Les fichiers uploadés sont écrits au runtime dans ./uploads/ (hors de /public).
 * Next.js ne sert pas les fichiers hors /public comme assets statiques.
 * En production R2, ce handler peut être supprimé ou redirigé.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string[] }> }
) {
  const { key } = await params
  const storageKey = key.join('/')

  try {
    const storage = getStorage()
    const buffer = await storage.get(storageKey)
    const contentType = detectContentType(storageKey)
    return new Response(buffer, {
      headers: { 'Content-Type': contentType, 'Cache-Control': 'public, max-age=3600' },
    })
  } catch {
    return new NextResponse('Fichier introuvable', { status: 404 })
  }
}

function detectContentType(key: string): string {
  if (key.endsWith('.webp')) return 'image/webp'
  if (key.endsWith('.jpg') || key.endsWith('.jpeg')) return 'image/jpeg'
  if (key.endsWith('.png')) return 'image/png'
  return 'application/octet-stream'
}
```

### Pattern 4: Polling Client Component for Admin Artworks List

**What:** A `'use client'` component that polls `/api/artworks/status` (a lightweight Route Handler returning pipeline states) every 3 seconds. Stops polling when all visible entries are in terminal states.

**When to use:** Admin artworks list page — required to show PENDING → PROCESSING → AWAITING_VALIDATION transitions without full page reloads.

```typescript
// Source: UI-SPEC.md (polling interval: 3s) + React 19 useEffect pattern
// Simplest approach: router.refresh() every 3s for non-terminal entries

'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  hasPendingItems: boolean // passed from Server Component
}

/**
 * Composant de polling — force un rafraîchissement de la page
 * toutes les 3 secondes si des œuvres sont en cours de traitement.
 * Utilisé dans la liste admin pour suivre les transitions PENDING → AWAITING_VALIDATION.
 */
export function PipelinePoller({ hasPendingItems }: Props) {
  const router = useRouter()

  useEffect(() => {
    if (!hasPendingItems) return
    const id = setInterval(() => router.refresh(), 3000)
    return () => clearInterval(id)
  }, [hasPendingItems, router])

  return null // Pas de rendu visible — composant purement comportemental
}
```

### Anti-Patterns to Avoid

- **Running Sharp in Edge Runtime:** Sharp uses native binaries (libvips). Any route or middleware using the Edge Runtime will fail silently. Only use Sharp in Server Actions, Route Handlers, or API routes with Node.js runtime.
- **Calling `.rotate()` after `.normalise()`:** Normalise operates on pixel values; if orientation is wrong at that point, the algorithm analyses incorrectly-oriented pixels. `.rotate()` must be the absolute first operation. [VERIFIED: local testing]
- **Omitting `withMetadata()` for WebP output:** Without `withMetadata()`, Sharp strips the ICC profile. A Display-P3 iPhone photo rendered without its ICC profile will appear desaturated/colour-shifted in colour-managed browsers. [CITED: sharp.pixelplumbing.com/api-output]
- **Using `file.stream()` instead of `file.arrayBuffer()`:** Sharp accepts a Buffer directly. Streaming is unnecessary complexity for ≤20 MB files.
- **Hardcoding file paths like `/uploads/originals/abc.jpg`:** The DB stores keys (`originals/abc.jpg`), the StorageProvider translates to URLs. Breaking this invariant breaks the R2 swap in Phase 6.
- **Not catching Sharp errors atomically:** If the Sharp call throws and no `catch` updates `pipeline_state` to `failed`, the row stays in `processing` permanently — invisible to the artist. Always set FAILED in the catch block.
- **Setting only `serverActions.bodySizeLimit` without `proxyClientMaxBodySize` in Next.js 15.5+:** In standalone production builds, the internal proxy has its own 1 MB limit. Both must be set.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| EXIF rotation | Manual EXIF parsing + rotation matrix | `sharp().rotate()` | iPhone EXIF has 8 orientation values; Sharp handles all of them via libvips |
| ICC profile preservation | Manual profile copy between formats | `sharp().withMetadata()` | ICC is embedded as binary JFIF/Exif data; Sharp handles extraction and re-embedding |
| WebP encoding | Writing WebP binary format | `sharp().webp({quality})` | WebP bitstream format is complex; Sharp delegates to libwebp |
| Image normalisation | Manual histogram stretching | `sharp().normalise()` | Correct per-channel histogram clipping requires statistical analysis; Sharp uses libvips implementation |
| MIME type spoofing defence | Checking file extension only | Check `file.type` + validate buffer magic bytes if needed | Extensions can be renamed; MIME type from browser is more reliable; add magic byte check for paranoid validation |
| UUID generation for storage keys | Custom ID scheme | `crypto.randomUUID()` | Node.js built-in since v14.17; no external dependency needed |

**Key insight:** Sharp encapsulates libvips, a production-hardened C library. Every colour space, metadata, and rotation edge case has been handled. Any hand-rolled alternative will fail on uncommon but real inputs (CMYK JPEGs, images with no EXIF, images with corrupt EXIF, wide-gamut TIFFs accidentally renamed to .jpg).

---

## Common Pitfalls

### Pitfall 1: `serverActions.bodySizeLimit` default is 1 MB

**What goes wrong:** Artist uploads a 12 MB iPhone photo; Server Action receives an empty or truncated `FormData`, `file.size` is 0 or the upload silently fails.

**Why it happens:** Next.js defaults `serverActions.bodySizeLimit` to `'1mb'`. Additionally, in Next.js 15.5+ standalone builds, an internal proxy also has a 1 MB cap (`proxyClientMaxBodySize`).

**How to avoid:** Add to `next.config.ts`:
```typescript
experimental: {
  serverActions: {
    bodySizeLimit: '25mb', // headroom above the 20 MB product limit
  },
  proxyClientMaxBodySize: '25mb', // required for standalone/production
}
```

**Warning signs:** `formData.get('file')` returns `null` or `file.size === 0` for large uploads. [CITED: nextjs.org/docs/app/api-reference/config/next-config-js/serverActions + github.com/vercel/next.js/discussions/86985]

---

### Pitfall 2: Sharp not auto-excluded causes build errors

**What goes wrong:** If `sharp` is bundled by Next.js's RSC bundler, the build fails with `Cannot find module './build/Release/sharp-...'` because native binaries can't be bundled.

**Why it happens:** Sharp uses a pre-built native `.node` file. The bundler cannot include binary files.

**How to avoid:** Sharp is in Next.js's automatic `serverExternalPackages` list as of Next.js 13.4+. [CITED: nextjs.org/docs/app/api-reference/config/next-config-js/serverExternalPackages] No explicit entry in `next.config.ts` is required. If a build error appears, add `sharp` to `serverExternalPackages` explicitly.

**Warning signs:** Build error mentioning `sharp` native binary or `Cannot find module './build'`.

---

### Pitfall 3: `rotate()` not first in chain corrupts normalisation

**What goes wrong:** A portrait photo shot on iPhone is stored with EXIF orientation=6 (rotated 90°). If `normalise()` runs before `rotate()`, it analyses the wrongly-oriented pixel array — the computed histogram is for a landscape image, not portrait. The exposure correction may over- or under-expose because highlights/shadows are in different pixel regions.

**Why it happens:** Sharp's `rotate()` with no arguments reads the EXIF orientation tag and physically reorients the pixel matrix. All subsequent operations then see correctly-oriented pixels.

**How to avoid:** Always start the chain with `.rotate()`. This is locked in CLAUDE.md (D-11).

**Warning signs:** Processed images appear correctly oriented but have incorrect exposure on portrait iPhone photos.

---

### Pitfall 4: ICC profile stripped on WebP conversion

**What goes wrong:** A Display-P3 iPhone photo processed through Sharp to WebP loses its colour profile. The WebP is displayed in sRGB by the browser, causing all saturated colours (especially reds and cyans) to appear muted — "washed out".

**Why it happens:** By default, Sharp strips all metadata (including ICC profiles) during format conversion.

**How to avoid:** Always call `.withMetadata()` before `.webp()`. This is locked in CLAUDE.md (D-12). [CITED: sharp.pixelplumbing.com/api-output — `withMetadata()` documentation]

**Warning signs:** Artwork photos look different on the website compared to the iPhone Photos app, especially in saturated colour areas.

---

### Pitfall 5: Partial pipeline write leaves orphaned files

**What goes wrong:** Sharp processes the image and writes `processed_path` to storage. Then the thumbnail generation crashes. The DB is updated to `failed` (correctly) but the `processed_path` file exists on disk with no DB reference pointing to it. Over time, orphaned files accumulate.

**Why it happens:** The pipeline writes to storage in two steps (processed then thumbnail). A crash after the first write leaves the first file without a DB reference.

**How to avoid:** In the `catch` block, call `storage.delete(processedKey).catch(() => {})` and `storage.delete(thumbnailKey).catch(() => {})` — silently ignore "file not found" errors (idempotent). The "Réessayer" action will re-generate both files from the original. [VERIFIED: LocalStorageAdapter.delete() silently handles ENOENT]

**Warning signs:** The `uploads/processed/` directory grows unexpectedly for artworks in FAILED state.

---

### Pitfall 6: `getUrl()` URLs return 404 for uploaded files

**What goes wrong:** Images uploaded via the pipeline display broken in the admin validation screen. `getUrl("originals/abc.jpg")` returns `http://localhost:3000/uploads/originals/abc.jpg` — but there is no Next.js route serving this path.

**Why it happens:** Next.js only serves files statically from `/public`. Files written at runtime to `./uploads/` outside `/public` require an explicit Route Handler or reverse proxy.

**How to avoid:** Create the Route Handler at `src/app/api/uploads/[...key]/route.ts` in plan 02-01 (same plan as the upload endpoint). [CITED: LocalStorageAdapter.ts comment — "À faire en Phase 2 lors de la première utilisation"]

**Warning signs:** Images in the admin show broken `<img>` tags; 404 responses for `/uploads/...` URLs in browser devtools.

---

## Code Examples

### Sharp pipeline — verified working patterns

```typescript
// Source: /lovell/sharp Context7 + local verification 2026-04-25
// Full pipeline: buffer in → WebP buffer out
const processedBuffer = await sharp(inputBuffer)
  .rotate()                           // auto-rotate from EXIF — no angle argument
  .normalise({ lower: 1, upper: 99 }) // default: 1% clipping at both ends
  .withMetadata()                     // preserves ICC profile in WebP output
  .webp({ quality: 85 })
  .toBuffer()

// Thumbnail: 400px wide, no upscaling
const thumbnailBuffer = await sharp(inputBuffer)
  .rotate()
  .resize(400, null, { withoutEnlargement: true })
  .normalise({ lower: 1, upper: 99 })
  .withMetadata()
  .webp({ quality: 80 })
  .toBuffer()
```

### File → Buffer conversion in Server Action

```typescript
// Source: Web File API spec + local verification 2026-04-25
// FormData.get('file') returns a File (extends Blob)
const file = formData.get('file') as File
const buffer = Buffer.from(new Uint8Array(await file.arrayBuffer()))
// buffer is now a Node.js Buffer — pass directly to sharp(buffer)
```

### Drizzle ORM state update pattern

```typescript
// Source: drizzle-orm 0.45.2 installed in project
import { eq } from 'drizzle-orm'
await db.update(artworks)
  .set({ pipelineState: 'awaiting_validation', processedPath: key, thumbnailPath: thumbKey })
  .where(eq(artworks.id, artworkId))
```

### next.config.ts — body size limit

```typescript
// Source: nextjs.org/docs/app/api-reference/config/next-config-js/serverActions
// + github.com/vercel/next.js/discussions/86985
const nextConfig: NextConfig = {
  serverExternalPackages: ['kysely', '@better-auth/kysely-adapter'],
  experimental: {
    serverActions: {
      bodySizeLimit: '25mb',
    },
    proxyClientMaxBodySize: '25mb',
  },
  // ...rest
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `formidable` / `multer` for file uploads | `FormData` native in Server Actions | Next.js 13.4 stable Server Actions | No separate parser library needed |
| `useFormState` (React 18) | `useActionState` (React 19) | React 19 / Next.js 15 | Import from `react`, not `react-dom/server`; same API surface |
| Manual `serverExternalPackages: ['sharp']` | Auto-excluded by Next.js | Next.js 13.4+ | No explicit config needed for Sharp |
| Sharp chained `.toFile()` | Sharp `.toBuffer()` + `StorageProvider.put()` | Always possible | Avoids file system coupling; StorageProvider pattern requires Buffer |

**Deprecated/outdated:**
- `experimental.serverActions: true` — no longer needed; Server Actions are stable and on by default since Next.js 14.
- `useFormState` from `react-dom` — replaced by `useActionState` from `react` in React 19.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `proxyClientMaxBodySize` is available in Next.js 15.5.15 (not only in v16+) | Pitfall 1 / Code Examples | If not available, remove the key — `serverActions.bodySizeLimit` alone works in dev; standalone prod may need upgrade |
| A2 | Processing a 20 MB JPEG with Sharp completes in <10s synchronously | Architecture Patterns | If slow, the Server Action may timeout — mitigation: move to background worker |
| A3 | `normalise({lower:1, upper:99})` provides sufficient exposure correction for artwork photos | Standard Stack / Patterns | If insufficient, may need `linear()` or per-channel `modulate()` — can be adjusted after real-world testing |

**Note on A1:** One GitHub commenter reported `proxyClientMaxBodySize` only available in v16+, but the Next.js docs at `nextjs.org/docs/15/pages/api-reference/config/next-config-js/middlewareClientMaxBodySize` reference it for v15. Include it with a comment — Next.js will ignore unknown experimental keys silently.

---

## Open Questions

1. **White balance implementation depth (PIPE-03)**
   - What we know: `normalise()` corrects luminance/contrast. PIPE-03 asks for white balance.
   - What's unclear: Does `normalise()` alone satisfy PIPE-03 (normalises per channel, which shifts colour balance), or should a grey-world `stats()` + `modulate()` approach be added?
   - Recommendation: `normalise()` is per-channel and will shift colour balance — this satisfies PIPE-03. The planner should note this in plan 02-02 and flag if testing with real iPhone photos shows insufficient colour correction.

2. **`title` field for upload-before-metadata flow (D-01/D-02)**
   - What we know: D-01/D-02 require creating a DB row before the artist fills metadata. The `artworks.title` column is `notNull()`.
   - What's unclear: What default title to use for the initial PENDING insert.
   - Recommendation: Use `'Sans titre'` as the initial title. The artist will update it in Phase 5 (metadata editing). Acceptable as a temporary placeholder.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| sharp | PIPE-02, PIPE-03 | Yes | 0.34.5 (latest) | — |
| Node.js `crypto.randomUUID` | Storage key generation | Yes | Node 24.13.0 | — |
| Docker (PostgreSQL) | DB state transitions | Assumed running (Phase 1) | — | — |
| `drizzle-orm` | DB queries | Yes | 0.45.2 | — |
| `zod` | Input validation | Yes | 4.3.6 | — |
| shadcn/ui | Admin UI (plan 02-04) | Not yet installed | — | Run `npx shadcn init` at start of 02-04 |

**Missing dependencies with no fallback:** None.
**Missing dependencies with fallback:** shadcn/ui — install at start of plan 02-04.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None installed (Wave 0 gap) |
| Config file | none — Wave 0 must create `vitest.config.ts` |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

**Rationale for Vitest over Jest:** The project uses Vite-compatible tooling (Turbopack). Vitest is the standard for Next.js App Router projects using ESM. Jest requires additional transform configuration for TypeScript + ESM.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PIPE-01 | Upload Server Action rejects HEIC files with French message | unit | `npx vitest run tests/pipeline/upload.test.ts` | Wave 0 |
| PIPE-01 | Upload Server Action rejects files >20 MB | unit | `npx vitest run tests/pipeline/upload.test.ts` | Wave 0 |
| PIPE-01 | Upload Server Action rejects unauthenticated requests | unit | `npx vitest run tests/pipeline/upload.test.ts` | Wave 0 |
| PIPE-02 | `processImage()` returns a WebP buffer with correct properties | unit | `npx vitest run tests/pipeline/process.test.ts` | Wave 0 |
| PIPE-02 | Processed WebP preserves input image dimensions | unit | `npx vitest run tests/pipeline/process.test.ts` | Wave 0 |
| PIPE-03 | `processImage()` thumbnail is ≤400px wide | unit | `npx vitest run tests/pipeline/process.test.ts` | Wave 0 |
| PIPE-04 | Validation screen renders original + processed images | manual | — | manual only |
| PIPE-05 | `publishRaw()` action sets processed_path to original_path | unit | `npx vitest run tests/pipeline/validation.test.ts` | Wave 0 |
| ADMIN-03 | Validation actions require auth session | unit | `npx vitest run tests/pipeline/validation.test.ts` | Wave 0 |

**Note on PIPE-02/03 unit tests:** The `processImage()` function is a pure async function (Buffer → Buffer). It can be tested with a tiny test JPEG fixture. Tests verify: output is a valid WebP buffer (magic bytes `52 49 46 46`), thumbnail width ≤ 400px (use `sharp(result).metadata()`), FAILED state tests use `jest.spyOn(sharp, ...)` or test with a corrupt buffer.

### Sampling Rate

- **Per task commit:** `npx vitest run tests/pipeline/`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `vitest.config.ts` — framework config (ESM + TypeScript)
- [ ] `tests/pipeline/process.test.ts` — covers PIPE-02, PIPE-03 (pure function tests)
- [ ] `tests/pipeline/upload.test.ts` — covers PIPE-01 (Server Action validation logic)
- [ ] `tests/pipeline/validation.test.ts` — covers PIPE-05, ADMIN-03
- [ ] `tests/fixtures/test-image.jpg` — small JPEG fixture (use Sharp to generate synthetically)
- [ ] Framework install: `npm install --save-dev vitest @vitejs/plugin-react`

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Yes | `auth.api.getSession()` in every Server Action — already established in Phase 1 |
| V3 Session Management | No | Sessions managed by Better Auth from Phase 1 |
| V4 Access Control | Yes | All `/admin/*` routes protected by middleware + Server Action auth check |
| V5 Input Validation | Yes | Zod-equivalent manual validation: MIME check, file size check, HEIC check |
| V6 Cryptography | No | No encryption in this phase; storage keys use `crypto.randomUUID()` |
| V12 File Upload | Yes | MIME type validation, size limit, no execution of uploaded content |

### Known Threat Patterns for Sharp + Server Actions

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Path traversal in storage key | Tampering | `LocalStorageAdapter.assertSafeKey()` already implemented in Phase 1 |
| MIME spoofing (rename .exe to .jpg) | Tampering | Check `file.type` (browser-set) + optionally check JPEG/PNG magic bytes (`0xFF 0xD8` / `0x89 0x50 0x4E 0x47`) |
| Zip bomb / pixel flood via image | Denial of Service | 20 MB size limit limits input; Sharp/libvips has per-pixel limits internally |
| Unauthenticated upload | Elevation of Privilege | `auth.api.getSession()` check at top of every Server Action |
| Serving arbitrary files via `/api/uploads` | Information Disclosure | `assertSafeKey()` in `LocalStorageAdapter.get()` prevents path traversal reads |

---

## Sources

### Primary (HIGH confidence)

- `/lovell/sharp` (Context7) — rotate, normalise, withMetadata, WebP, resize, stats, modulate, toBuffer — all verified
- Local runtime verification — Sharp 0.34.5 API confirmed working, pipeline chain tested with `toBuffer()` output
- `nextjs.org/docs/app/api-reference/config/next-config-js/serverActions` — bodySizeLimit syntax confirmed
- `nextjs.org/docs/app/api-reference/config/next-config-js/serverExternalPackages` — Sharp in auto-exclude list confirmed
- `/vercel/next.js` (Context7) — FormData Server Action pattern, revalidatePath, route handlers

### Secondary (MEDIUM confidence)

- `github.com/vercel/next.js/discussions/86985` — proxyClientMaxBodySize issue in Next.js 15.5 standalone, confirmed via WebFetch
- `sharp.pixelplumbing.com/api-output` — withMetadata ICC preservation behaviour, cited from official docs

### Tertiary (LOW confidence / needs validation)

- Claim that `proxyClientMaxBodySize` is available in Next.js 15 vs. only v16 — conflicting reports; marked A1 in Assumptions Log

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Sharp installed and all methods verified locally; Next.js patterns confirmed via Context7
- Architecture: HIGH — Synchronous pipeline pattern is straightforward; Route Handler for uploads is confirmed necessary
- Pitfalls: HIGH — Most pitfalls verified via local testing or official docs; proxyClientMaxBodySize is MEDIUM
- Sharp parameters: MEDIUM — `normalise({lower:1, upper:99})` defaults are documented; real-world quality depends on actual iPhone photos (untested in this research)

**Research date:** 2026-04-25
**Valid until:** 2026-05-25 (stable ecosystem; Sharp and Next.js 15.x unlikely to introduce breaking changes within 30 days)
