# Technology Stack

**Project:** Personal Art Gallery / Portfolio with Social + Marketplace Features
**Researched:** 2026-04-22
**Sources:** Next.js official docs (v15/v16, last updated 2026-04-21), Next.js 15 release blog, Next.js auth guide, Next.js deployment guide

---

## Recommended Stack

### Core Framework

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Next.js | 15.x (App Router) | Full-stack framework | SSR for gallery SEO, Server Actions for bid/like mutations, built-in image optimization via `next/image` + `sharp`, self-hostable with `next start`, official Railway/Render deploy templates. React 19 + Turbopack stable in v15. Removes need for a separate API layer. |
| React | 19.x | UI runtime | Bundled with Next.js 15 App Router. `useActionState`, Server Components, and Suspense are first-class and reduce client JS for image-heavy pages. |
| TypeScript | 5.x | Language | `next.config.ts` now natively typed. Type-safe Server Actions and Zod validation is the documented Next.js pattern. |

**Why Next.js over SvelteKit:** Next.js has larger ecosystem, more auth library integrations (Better Auth, NextAuth, Clerk all have documented Next.js adapters), more third-party upload/storage tooling, and official deploy templates for Railway and Render. SvelteKit is excellent but the library ecosystem for auth + uploads is thinner in 2025.

**Why Next.js over plain React + Express:** App Router Server Actions replace REST endpoints for likes, bids, and uploads. One codebase, one deploy unit, no CORS surface. Portable: runs as `next start` (Node.js) locally or in Docker on any cloud.

**Why App Router (not Pages Router):** Server Components reduce JS sent to browser — critical for a gallery with 50+ images. Streaming Suspense means images load progressively. The Pages Router is in maintenance mode.

---

### Styling

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Tailwind CSS | 4.x | Utility CSS | Near-zero runtime, mobile-first, vertical scroll layouts are trivial (`flex flex-col`, `overflow-y-auto`, `snap-y snap-mandatory`). No CSS-in-JS runtime overhead on image-heavy pages. |
| shadcn/ui | latest | Component primitives | Copy-paste components (dialogs, dropdowns, forms) built on Radix UI. No vendor lock-in — source lives in your repo. Perfect for admin back-office forms. |

**Why not CSS Modules:** Fine but more verbose for responsive gallery grids. Tailwind wins for speed of iteration.
**Why not MUI / Chakra:** Runtime overhead and opinionated themes that fight a custom art gallery aesthetic.

---

### Database

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| PostgreSQL | 16.x | Primary database | Handles users, artworks, likes (counts), bids, bid history, sessions. JSONB for flexible metadata. Works locally (Docker or native install) and on any cloud (Railway, Render, Supabase both offer managed Postgres). |
| Drizzle ORM | 0.30.x | ORM / query builder | TypeScript-native, no code generation step required at runtime, SQL-like syntax that matches Postgres semantics exactly. Drizzle Kit handles migrations. Significantly lighter than Prisma (no Rust binary), which matters for self-hosted Node.js deploys. |

**Why PostgreSQL over SQLite:** SQLite is local-only by default. Once you move to a cloud host, you need an external DB anyway. Start with Postgres locally (one `docker compose up db` command) and carry the same connection string to production.

**Why Drizzle over Prisma:** Prisma ships a Rust query engine binary that must be downloaded/compiled for each deployment target. This causes friction on Railway/Render and on Windows development machines. Drizzle is pure TypeScript/JS with no binary dependency. Drizzle is also the explicit recommendation in the Next.js authentication docs code examples as of 2026.

**Why not PlanetScale (MySQL):** PlanetScale changed pricing in 2024 and removed free tier. PostgreSQL is the safe default with more hosting options.

---

### ORM Schema Pattern

Use Drizzle with a `db/schema.ts` file. Tables: `users`, `sessions`, `artworks`, `artwork_likes`, `bids`.

```typescript
// Minimal sketch — not exhaustive
import { pgTable, serial, text, integer, timestamp, boolean, numeric } from 'drizzle-orm/pg-core'

export const artworks = pgTable('artworks', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  storageKey: text('storage_key').notNull(), // path in local FS or S3 key
  thumbnailKey: text('thumbnail_key'),
  processedAt: timestamp('processed_at'),
  basePrice: numeric('base_price', { precision: 10, scale: 2 }),
  published: boolean('published').default(false),
  createdAt: timestamp('created_at').defaultNow(),
})
```

---

### Image Processing Pipeline

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| sharp | 0.33.x | Server-side image processing | C-backed, fastest Node.js image library. Handles resize, format conversion (WebP/AVIF), normalise (auto contrast/exposure), gamma correction, and modulate (hue/saturation/lightness). Next.js 15 automatically uses `sharp` for `next/image` optimization — same binary, no extra install for delivery. |

**Key sharp operations for auto-correction pipeline:**

```typescript
import sharp from 'sharp'

async function processArtworkUpload(inputBuffer: Buffer): Promise<Buffer> {
  return sharp(inputBuffer)
    .rotate()                    // auto-rotate from EXIF orientation
    .normalise()                 // auto contrast/exposure stretch (histogram equalisation)
    .modulate({ saturation: 1.1 }) // slight saturation boost (optional)
    .toFormat('webp', { quality: 88 })
    .toBuffer()
}
```

**Confidence note:** `sharp.normalise()` provides histogram-based auto-contrast (equivalent to "auto levels"). True white-balance correction (colour temperature shift) requires more complex colour science — sharp's `modulate()` adjusts lightness/saturation/hue but does not perform a proper white-balance transform. For a first version, `normalise()` covers 80% of cases (underexposed scans, flat contrast). A later phase can add AI-based correction via Replicate (see Pitfalls).

**Why not Pillow (Python):** This is a Node.js/Next.js stack. Pillow would require a Python sidecar process or a separate microservice, adding deployment complexity. Sharp is native to the stack.

**Why not Cloudinary's transformation pipeline:** Cloudinary is SaaS-only and costs money at scale. sharp gives full control locally and in production at zero variable cost.

---

### File Storage

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Local filesystem (dev) | — | Image storage during local development | Zero config. Store originals under `uploads/originals/`, processed files under `uploads/processed/`. Mount as a Docker volume for persistence. |
| MinIO (local S3-compatible) | latest | Optional local S3 emulation | If you want dev/prod parity on storage APIs before moving to cloud. Run with `docker compose`. Single config switch (`STORAGE_ENDPOINT`) to flip from MinIO to S3/R2. |
| Cloudflare R2 (production) | — | Cloud object storage | S3-compatible API means zero code change from MinIO. No egress fees (unlike AWS S3). Free 10GB/month storage + 1M Class A operations. Fits a personal gallery with room to spare. Scales without per-GB-egress bills that hurt image-heavy sites. |

**Why not AWS S3 directly:** S3 egress pricing is painful for image delivery. R2 is S3-compatible and free egress to internet. Drop-in replacement.

**Why not Cloudinary for storage:** Cloudinary free tier (25 credits/month) runs out quickly with high-res artwork. R2 + sharp is cheaper and gives you control over processing.

**Why not Vercel Blob:** Only works seamlessly on Vercel. R2 works everywhere.

**S3 client library:** `@aws-sdk/client-s3` v3 (works with R2 and MinIO via endpoint override). Do not use v2 — it is deprecated.

---

### Authentication

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Better Auth | 1.x | Auth framework | Listed in Next.js official docs as a recommended auth library (alongside Clerk, Auth0, NextAuth). Full TypeScript, works with Drizzle ORM directly, supports email/password + OAuth providers, session management via database or cookies, role-based access (needed for artist admin vs. visitor). No external service dependency — runs entirely in your Node.js process. |

**Why Better Auth over NextAuth (Auth.js v5):** Auth.js v5 was in beta/RC status for an extended period and had breaking API changes. Better Auth has cleaner Drizzle integration and is self-contained. Both are listed in Next.js docs; Better Auth has better DX for custom role systems (artist admin vs. buyer).

**Why not Clerk:** Clerk is SaaS (external service, monthly cost, data stored on Clerk servers). Fine for funded products, over-engineered for a personal portfolio.

**Why not Supabase Auth:** Supabase Auth works but ties you to the Supabase ecosystem. If you want Supabase, use all of Supabase (DB + Auth + Storage). This stack keeps them separate for portability.

**Session strategy:** Database sessions (sessions table in Postgres, managed by Better Auth). Cookie holds encrypted session ID. More auditable than stateless JWT for a bid/offer system where you need to invalidate sessions.

---

### Email Notifications

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Resend | latest SDK | Transactional email | Send email when a bid is placed, when artist accepts/rejects an offer, account confirmation. Free tier: 3,000 emails/month, 100/day. Simple REST API with official React Email integration. No SMTP server to manage. |
| React Email | latest | Email templates | Write email templates as React components. Works with Resend, SendGrid, Nodemailer. Type-safe, previews in browser during development. |

**Why not Nodemailer:** Nodemailer requires an SMTP server or credentials for Gmail/SMTP provider. Deliverability is your problem. Resend handles deliverability, SPF/DKIM, and provides a dashboard. For a personal project, the free tier is sufficient indefinitely.

**Why not SendGrid:** More complex setup, legacy API, higher friction for a personal project. Resend has better DX.

---

### Validation

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Zod | 3.x | Schema validation | Validate Server Action form data, API inputs, bid amounts, file upload metadata. The documented pattern in Next.js auth guide. Runtime type safety at trust boundaries. |

---

### Development Tooling

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Turbopack | (built into Next.js 15) | Dev server bundler | Stable in Next.js 15. Up to 76% faster local server startup and 96% faster Fast Refresh. Critical for image-heavy development. Use `next dev --turbo`. |
| ESLint | 9.x | Linting | Next.js 15 supports ESLint 9 natively with flat config. |
| Prettier | 3.x | Formatting | Standard. |
| Docker Compose | — | Local services | Run Postgres + optional MinIO as containers. Single `docker compose up` gives you the full local environment without installing Postgres natively. |

---

### Deployment Path

#### Local Development
```
next dev --turbo         # Next.js dev server (port 3000)
docker compose up        # Postgres (port 5432) + optional MinIO (port 9000)
```

#### Self-hosted Production (local server or VPS)
```
next build
next start               # Node.js server, all features supported
nginx                    # Reverse proxy (required for streaming support)
```
Next.js 15 docs confirm: image optimization, middleware, streaming, and Server Actions all work with zero extra config under `next start`. Nginx must disable buffering (`X-Accel-Buffering: no`) for streaming to work.

#### Cloud Options (in order of recommendation)

| Platform | Fit | Notes |
|----------|-----|-------|
| **Railway** | Best | Official Next.js deploy template exists. Persistent disk, managed Postgres addon, reasonable pricing. `next start` runs as-is. No cold starts (unlike serverless). |
| **Render** | Good | Official Next.js deploy template. Web Service runs `next start`. Managed Postgres add-on. Free tier has cold starts (spin-down after 15min idle). |
| **Vercel** | Good but vendor-locked | Best Next.js support (they build it), but: no persistent filesystem (image uploads need R2 immediately), function timeout limits for image processing, and pricing scales steeply. Not recommended if you want full control. |
| **VPS (DigitalOcean, Hetzner)** | Best control | Full control, cheapest at scale. Run with Docker + Nginx. Requires more ops knowledge. Hetzner CX22 (2vCPU/4GB RAM) at ~4€/month handles a personal portfolio easily. |

**Recommendation: Start on Railway** for zero-ops cloud deployment. Migrate to a VPS (Hetzner) if traffic grows or you want cost control.

---

## Full Package Installation

```bash
# Create project
npx create-next-app@latest gallery --typescript --tailwind --app --src-dir

# Database
npm install drizzle-orm pg
npm install -D drizzle-kit @types/pg

# Auth
npm install better-auth

# Image processing
npm install sharp
npm install @aws-sdk/client-s3  # for R2 / MinIO

# Validation
npm install zod

# Email
npm install resend @react-email/components react-email

# UI components (shadcn/ui — copy-paste, not npm install)
npx shadcn@latest init

# Dev
npm install -D eslint prettier
```

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Framework | Next.js 15 | SvelteKit | Thinner auth/upload ecosystem; fewer library integrations |
| Framework | Next.js 15 | Remix | Smaller community, fewer hosting templates, no built-in image optimization |
| Database | PostgreSQL | SQLite | Not suitable for multi-user cloud deploy without workarounds (Turso/Litestream) |
| ORM | Drizzle | Prisma | Rust binary causes deploy friction; heavier runtime |
| Auth | Better Auth | NextAuth v5 | Extended beta period, more complex config for role-based access |
| Auth | Better Auth | Clerk | SaaS dependency, monthly cost, data leaves your infrastructure |
| Storage | Cloudflare R2 | AWS S3 | Egress fees make S3 expensive for image-heavy sites |
| Storage | Cloudflare R2 | Cloudinary | SaaS costs, free tier burns fast with large artwork files |
| Image processing | sharp | Pillow | Python sidecar adds deploy complexity to a Node.js stack |
| Image processing | sharp | Jimp | Pure JS, 10-20x slower than sharp for large images |
| Email | Resend | Nodemailer | Deliverability is your problem; no dashboard; more setup |
| Deploy | Railway | Vercel | No persistent filesystem; function timeouts during image processing; steep pricing |

---

## Confidence Assessment

| Area | Confidence | Source | Notes |
|------|------------|--------|-------|
| Next.js 15 as framework | HIGH | Official Next.js docs (version 16.2.4, updated 2026-04-21) | Current stable, all features documented |
| sharp for image processing | HIGH | Next.js 15 release blog (explicitly mentioned as auto-dependency) | Next.js 15 uses sharp automatically |
| sharp `normalise()` for auto-exposure | MEDIUM | sharp API docs (colour section) | Confirmed operation exists; white-balance correction is partial — histogram stretch only |
| Drizzle ORM | MEDIUM | Next.js auth guide code examples use Drizzle + Postgres pattern | Library is production-grade but docs checked via training knowledge, not live docs |
| Better Auth | MEDIUM | Listed in Next.js official auth docs as recommended library | Could not fetch better-auth.com directly (WebFetch restricted), but it appears in the official Next.js auth library list |
| Cloudflare R2 | MEDIUM | Training knowledge (post-cutoff changes possible) | R2 pricing/free tier based on knowledge cutoff Aug 2025; verify current free tier limits |
| Railway deployment | HIGH | Official Next.js deploy template exists (`github.com/nextjs/deploy-railway`) | Confirmed in Next.js deployment docs |
| Resend for email | MEDIUM | Training knowledge + documented in Next.js ecosystem | Verify current free tier (3k/month) has not changed |

---

## Open Questions for Later Phases

1. **White balance correction depth:** `sharp.normalise()` handles exposure, not true white balance (colour temperature). If the artist needs proper colour correction for scanned paintings, a later phase should research: (a) OpenCV WASM in a Node.js worker, (b) a Python microservice with Pillow + `PIL.ImageFilter`, or (c) Replicate API (AI upscale + correction). Defer this to the image processing phase.

2. **Real-time bid updates:** If bids should update live without page refresh, add polling (`setInterval` + Server Action) for v1. WebSockets (Pusher, Ably, or Next.js with Socket.io) can replace this in a later phase. Keep it simple first.

3. **Payment integration:** If price offers convert to real payments, Stripe is the standard. The bid system as scoped (offer + artist accepts/rejects) does not require Stripe in v1 — email notification is sufficient.

4. **CDN for image delivery:** R2 + Cloudflare CDN is automatic (R2 is Cloudflare infrastructure). If using Railway + local storage, add Cloudflare as a CDN proxy in a later phase for performance.
