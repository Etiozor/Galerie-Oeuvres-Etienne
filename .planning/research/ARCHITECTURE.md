# Architecture Patterns

**Project:** Galerie POF — Personal Art Gallery / Portfolio Marketplace
**Researched:** 2026-04-22
**Confidence:** HIGH (Next.js App Router docs verified; patterns drawn from well-established portfolio/marketplace architecture)

---

## Recommended Architecture

A **Next.js full-stack monolith** using the App Router. All concerns live in one codebase: server-rendered public pages, API Route Handlers, auth middleware, and image processing. This is correct for a solo-artist project — no need to split frontend and backend into separate services.

```
Browser / Mobile
      |
      v
[Next.js App Router]
  ├── /app/(public)/         ← gallery, artwork detail, about, login, register
  ├── /app/(auth)/           ← likes, bid submission (requires session)
  ├── /app/admin/            ← artist back-office (requires artist role)
  └── /app/api/
        ├── /artworks        ← CRUD
        ├── /bids            ← submit, list history
        ├── /upload          ← receive file, trigger pipeline
        └── /auth            ← Auth.js handlers

[Next.js Proxy / Middleware]   ← auth gate for /admin/* and /api/bids, /api/likes
      |
      ├── [Prisma ORM]  ──── [SQLite (local) / PostgreSQL (prod)]
      |
      ├── [Sharp]            ← image correction inside API Route Handler
      |
      ├── [Local filesystem / public/uploads/]   ← local dev
      │   (swapped for S3-compatible bucket in production)
      |
      └── [Nodemailer / Resend]   ← email on new bid
```

---

## Component Boundaries

### What Talks to What

| From | To | Channel | Notes |
|------|----|---------|-------|
| Browser | Next.js pages | HTTP (SSR / RSC) | Public gallery, artwork pages |
| Browser | `/api/*` Route Handlers | HTTP (fetch / form action) | Bids, likes, upload |
| Next.js Proxy (middleware) | Auth session cookie | JWT cookie check | Guards `/admin/*`, bid/like endpoints |
| Route Handler `/api/upload` | Sharp pipeline | In-process Node.js call | No queue needed at this scale |
| Sharp pipeline | Filesystem / Storage | Node.js `fs` or S3 SDK | Writes processed + original |
| Route Handler `/api/bids` | Nodemailer / Resend | SMTP / HTTP API | Fires on bid creation |
| All Route Handlers | Prisma client | In-process ORM | Single DB connection pool |
| Prisma | SQLite file (local) / PostgreSQL (prod) | TCP / file | Portable via env var |

### Key Rule: Auth Must Be Layered

Next.js middleware (now called `proxy.ts` in Next.js 16+, formerly `middleware.ts`) runs **before** every request. Use it for coarse-grained gating (redirect unauthenticated users). Also validate auth **inside** each Route Handler — do not rely solely on the proxy layer, because server functions (Server Actions) bypass the proxy matcher in some cases (confirmed in Next.js 16 docs).

---

## Data Models

### Artwork

```
Artwork {
  id            String   @id @default(cuid())
  title         String
  description   String?
  createdAt     DateTime            // date de création de l'œuvre (pas du record)
  publishedAt   DateTime?           // null = non publiée
  status        ArtworkStatus       // AVAILABLE | GIVEN | SOLD
  pipelineState PipelineState       // PENDING | PROCESSING | AWAITING_VALIDATION | PUBLISHED | FAILED
  basePrice     Decimal             // plancher souple
  width         Float               // cm
  height        Float               // cm
  medium        String              // "huile sur toile", "aquarelle"...
  category      String              // free text or enum (dessin, peinture...)
  originalPath  String              // path/key of original file
  processedPath String?             // path/key of auto-corrected file
  thumbPath     String?             // path/key of thumbnail
  likes         Like[]
  bids          Bid[]
}
```

### User

```
User {
  id            String   @id @default(cuid())
  email         String   @unique
  name          String?
  role          Role     // VISITOR | ARTIST
  passwordHash  String?  // null if OAuth-only
  createdAt     DateTime
  likes         Like[]
  bids          Bid[]
}
```

### Bid (Offer)

```
Bid {
  id            String   @id @default(cuid())
  amount        Decimal
  message       String?
  createdAt     DateTime
  artwork       Artwork  @relation(...)
  artworkId     String
  user          User     @relation(...)
  userId        String
  belowFloor    Boolean  // true if amount < artwork.basePrice
  // No timer, no auto-accept — pure async offer
}
```

### Like

```
Like {
  id            String   @id @default(cuid())
  user          User     @relation(...)
  userId        String
  artwork       Artwork  @relation(...)
  artworkId     String
  createdAt     DateTime
  @@unique([userId, artworkId])  // one like per user per artwork
}
```

### Enums

```
enum ArtworkStatus    { AVAILABLE  GIVEN  SOLD }
enum PipelineState    { PENDING  PROCESSING  AWAITING_VALIDATION  PUBLISHED  FAILED }
enum Role             { VISITOR  ARTIST }
```

---

## Image Pipeline Architecture

### Flow

```
1. Artist uploads file (multipart/form-data → /api/upload)
         |
         v
2. API Route Handler saves RAW file to storage
   - Sets artwork.pipelineState = PROCESSING
         |
         v
3. Sharp (in-process) auto-corrects:
   - Normalize exposure (linear stretch or gamma)
   - White balance correction (color temperature shift)
   - Strip EXIF metadata (privacy)
   - Generate thumbnail (400px wide, WebP)
   - Generate display version (max 2000px, WebP)
         |
         v
4. Saves processed files, updates DB paths
   - Sets pipelineState = AWAITING_VALIDATION
         |
         v
5. Artist opens /admin/validate — sees side-by-side:
   original vs corrected, can APPROVE or REJECT
         |
    APPROVE ──► pipelineState = PUBLISHED, publishedAt = now()
    REJECT  ──► pipelineState = FAILED, processedPath = null
                (artist can re-upload or skip correction)
```

### Why In-Process (No Queue) for v1

At this scale (one artist, infrequent uploads), running Sharp synchronously inside the API Route Handler is correct. A background job queue (BullMQ, etc.) adds meaningful complexity for no gain. The upload endpoint can take a few seconds — that is acceptable.

If processing ever takes > 10 s (very large canvases at high resolution), move it to a `waitUntil` background task or a separate Next.js API background route, but do not pre-optimize.

### Pipeline Failure Handling

```
if (Sharp throws) {
  artwork.pipelineState = FAILED
  artwork.processedPath = null
  // original is still saved — artist can publish raw or retry
}
```

Never silently swallow errors. Always persist the FAILED state so the admin dashboard can surface it. The artist must be able to:
1. Publish the original without correction (bypass pipeline)
2. Re-trigger correction on an existing upload
3. Delete and re-upload

### Storage Strategy: Original vs Processed

Always store both:

| File | Path Pattern | Why |
|------|-------------|-----|
| Original | `uploads/originals/{artworkId}.{ext}` | Source of truth, re-process if algorithm improves |
| Display version | `uploads/display/{artworkId}.webp` | Served to visitors (max 2000px) |
| Thumbnail | `uploads/thumbs/{artworkId}.webp` | Gallery scroll (400px) |

**Local dev:** write to `/public/uploads/` — served by Next.js static file serving.

**Production:** write to S3-compatible storage (Cloudflare R2 is cheapest, AWS S3 also fine). Switch by changing a single env var and the storage adapter. Keep the same path scheme.

Next.js `remotePatterns` in `next.config.js` must whitelist the bucket URL for `<Image>` to serve remote files.

---

## Admin vs Public Surfaces

### Route Structure

```
/app
  /(public)
    /page.tsx                  ← gallery root (vertical scroll)
    /artwork/[id]/page.tsx     ← artwork detail + bid history
    /about/page.tsx
    /login/page.tsx
    /register/page.tsx

  /(auth)                      ← routes requiring any logged-in user
    /account/page.tsx
    /bid/[artworkId]/page.tsx  ← bid submission form

  /admin                       ← artist only (role = ARTIST)
    /page.tsx                  ← dashboard: pending uploads, recent bids
    /artworks/page.tsx         ← list all with status
    /artworks/new/page.tsx     ← upload form
    /artworks/[id]/edit/page.tsx
    /validate/[id]/page.tsx    ← approve/reject pipeline result

/app/api
  /auth/[...nextauth]/route.ts ← Auth.js handler
  /artworks/route.ts           ← GET (list), POST (create)
  /artworks/[id]/route.ts      ← GET, PATCH, DELETE
  /upload/route.ts             ← POST multipart
  /bids/route.ts               ← POST (submit), GET (list by artwork)
  /likes/route.ts              ← POST (toggle)
```

### Auth Middleware (proxy.ts)

```typescript
// proxy.ts
export const config = {
  matcher: ['/admin/:path*', '/api/bids/:path*', '/api/likes/:path*', '/bid/:path*'],
}

export function proxy(request: NextRequest) {
  const session = getSessionFromCookie(request)  // verify JWT
  if (!session) return NextResponse.redirect('/login')
  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (session.role !== 'ARTIST') return NextResponse.redirect('/')
  }
  return NextResponse.next()
}
```

**Note (verified in Next.js 16 docs):** Always re-check auth inside each Route Handler and Server Action. The proxy is a coarse filter and can be bypassed in edge cases. Do not trust it as the sole authorization layer.

---

## Data Flow

### Public Gallery Load

```
User visits /
  → Next.js RSC fetches artworks (status=PUBLISHED, pipelineState=PUBLISHED)
    via Prisma (no API round-trip, direct DB in Server Component)
  → Renders <ArtworkCard> grid/scroll
  → Images served from storage (local /public or remote bucket via <Image>)
```

### Bid Submission

```
Logged-in user fills bid form
  → POST /api/bids { artworkId, amount, message }
  → Middleware verifies session
  → Route Handler:
      1. Validate input (amount > 0)
      2. Check artwork exists, status = AVAILABLE
      3. Compute belowFloor flag
      4. prisma.bid.create(...)
      5. Send email to artist (Nodemailer/Resend) — do not block response on email
      6. Return 201 { bid }
  → Client shows confirmation
  → Bid appears immediately in artwork's public history (re-fetch or optimistic update)
```

### Artist Upload Flow

```
Artist opens /admin/artworks/new
  → Selects file (mobile camera or PC)
  → POST multipart/form-data → /api/upload
  → Route Handler:
      1. Validate file type (JPEG, PNG, HEIF)
      2. Save original to storage → path A
      3. Create Artwork record (pipelineState=PROCESSING)
      4. Run Sharp pipeline synchronously
         - On success: save display + thumb → paths B, C
                       pipelineState = AWAITING_VALIDATION
         - On failure: pipelineState = FAILED
      5. Return artwork id
  → Artist redirected to /admin/validate/[id]
  → Artist sees original vs corrected, approves or rejects
  → PATCH /api/artworks/[id] { pipelineState: PUBLISHED }
```

---

## Local Development vs Production Differences

| Concern | Local | Production |
|---------|-------|------------|
| Database | SQLite file (`dev.db`) | PostgreSQL (Railway, Supabase, Neon) |
| Image storage | `/public/uploads/` (served by Next.js) | S3 / Cloudflare R2 (CDN-served) |
| Email | Ethereal (fake SMTP, preview in browser) | Resend or SMTP (real delivery) |
| Auth secret | Local `.env` secret | Env var in hosting platform |
| `next/image` remote patterns | Not needed (local files) | Required (whitelist bucket hostname) |
| Process manager | `next dev` | `next start` behind Nginx or Vercel |

The architecture is designed so only env vars change between environments — no code changes for the transition.

---

## Suggested Build Order (Dependencies)

Build in this order. Each phase unlocks the next.

### Layer 1 — Foundation (no business logic yet)
1. Database schema (Prisma + SQLite): User, Artwork, Bid, Like tables
2. Auth (Auth.js): email+password login, session JWT, proxy middleware
3. File storage module: abstract interface with local adapter

*Rationale: everything else depends on having users, artworks in DB, and a way to identify who's calling.*

### Layer 2 — Core Gallery (read path)
4. Public gallery page (vertical scroll, artworks from DB)
5. Artwork detail page (full info, no bids yet)
6. Admin artwork list + basic CRUD (no pipeline yet)

*Rationale: proves the data model before adding complexity. The artist can manually insert artworks during this phase to test the gallery.*

### Layer 3 — Image Pipeline
7. Upload endpoint + Sharp pipeline (auto-correct + thumbnail)
8. Admin validation screen (approve/reject)
9. Failed state recovery (bypass or retry)

*Rationale: isolated from the bid/social layer. Can be tested independently. Pipeline is the riskiest technical component.*

### Layer 4 — Social / Marketplace
10. Like system (toggle, count display)
11. Bid submission (form, validation, belowFloor warning)
12. Bid history on artwork page (public)
13. Email notification on new bid

*Rationale: requires auth (Layer 1) and artworks (Layer 2). Bid email requires the bid record to exist first.*

### Layer 5 — Polish & Production Readiness
14. About page
15. Artwork status management (AVAILABLE → SOLD / GIVEN) in admin
16. Swap storage adapter to S3/R2
17. Swap DB to PostgreSQL
18. Deploy to hosting (Railway / Vercel)

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Storing Processed Images Only

**What:** Delete the original after processing.
**Why bad:** When the correction algorithm improves (or is wrong), you cannot reprocess. The original phone photo is your source of truth.
**Instead:** Always keep the original. Store it at a separate path. Only serve processed versions publicly.

### Anti-Pattern 2: Serving Originals Directly to Public

**What:** Expose the raw upload URL in the gallery.
**Why bad:** Phone photos contain GPS coordinates in EXIF data. Also, full-resolution raw files are large and slow.
**Instead:** Sharp strips EXIF during processing. Only the processed/display version is linked from public pages. Originals stay in a non-public storage path.

### Anti-Pattern 3: Blocking the Bid Response on Email Delivery

**What:** `await sendEmail(...)` before returning 201 to the user.
**Why bad:** Email delivery can take 1-3 seconds or fail. The bid is already saved — the user should not wait.
**Instead:** Fire the email and do not await it (or use `waitUntil` in the Route Handler). Log failures, but return the bid immediately.

### Anti-Pattern 4: Hardcoding Local File Paths Across the Codebase

**What:** Dozens of places reference `/public/uploads/...` directly.
**Why bad:** Swapping to S3 in production becomes a large refactor.
**Instead:** Create a single `storage.ts` module that exports `saveFile(path, buffer)` and `getPublicUrl(path)`. Local adapter writes to `/public/uploads/`; production adapter writes to S3. Switch via env var.

### Anti-Pattern 5: Trusting Proxy Middleware Alone for Authorization

**What:** Route handlers skip auth checks because "middleware protects them."
**Why bad:** Confirmed in Next.js 16 docs — Server Functions (Server Actions) receive POST requests to the page's route, not the function's path. A proxy matcher that excludes `/api/*` will also skip Server Action calls on that path.
**Instead:** Every Route Handler and Server Action independently verifies the session and role before executing.

### Anti-Pattern 6: Using One Image Size for Everything

**What:** Serve the full 2000px display image in the gallery scroll.
**Why bad:** Mobile users on a gallery of 20 artworks download 40 MB.
**Instead:** Three sizes minimum: thumbnail (400px, gallery), display (2000px, detail page), original (unrestricted, never public). Use Next.js `<Image>` with `sizes` prop for responsive serving.

---

## Scalability Considerations

This is a personal portfolio — scale is not a primary concern. These notes exist to avoid painting into a corner.

| Concern | At 50 artworks (v1) | At 500 artworks | At 5,000 artworks |
|---------|---------------------|-----------------|-------------------|
| DB | SQLite is fine | Still fine | Migrate to PostgreSQL |
| Image processing | In-process Sharp | Still fine | Move to background worker |
| Storage | Local or small S3 | S3 / R2 with CDN | CDN + image transform service |
| Email | Nodemailer / Resend | Resend handles it | No change needed |
| Gallery load | SSR with all artworks | Paginate (cursor-based) | Same |

---

## Sources

- Next.js 16 App Router docs (verified 2026-04-21): proxy/middleware matcher, route execution order, `<Image>` remote patterns — https://nextjs.org/docs
- Auth note on Server Actions bypassing proxy: https://nextjs.org/docs/app/api-reference/file-conventions/proxy (confirmed in "Good to know" section)
- Image storage pattern (original + display + thumb): HIGH confidence, standard practice in media-heavy web apps
- Prisma + SQLite → PostgreSQL migration path: HIGH confidence, documented capability (provider swap via datasource block)
- Sharp image processing capabilities: HIGH confidence, well-established Node.js library (pixelplumbing.com)
- In-process vs queue pattern at small scale: HIGH confidence, standard engineering tradeoff
- EXIF stripping necessity: HIGH confidence, standard privacy practice for user-uploaded photos
