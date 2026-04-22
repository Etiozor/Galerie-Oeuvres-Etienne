# Research Summary: Galerie POF

**Synthesized:** 2026-04-22
**Sources:** STACK.md, FEATURES.md, ARCHITECTURE.md, PITFALLS.md
**Confidence:** HIGH (architecture, pitfalls), MEDIUM (stack library choices, feature benchmarks)

---

## Executive Summary

Galerie POF is a personal art portfolio with a soft marketplace layer: public gallery, image upload pipeline with auto-correction, user accounts, likes, and price offers with public bid history. The correct technical approach is a **Next.js 15 App Router full-stack monolith** — one codebase, one deployment unit, no separate API service. Server Components handle the public gallery (SEO-critical), Server Actions handle mutations (likes, bids), and a Node.js image pipeline using Sharp runs in-process.

The most technically risky component is the image pipeline. All four research streams converge on the same warning: the pipeline must handle color profiles, EXIF orientation, HEIC format rejection, failure states, and storage abstraction correctly from the start. These are not polish items — getting any of them wrong creates either data loss (destroying originals) or a broken primary user experience (artist cannot upload from their iPhone).

The marketplace layer introduces a genuine design risk: public offer amounts anchor buyer expectations downward. The recommended mitigation is to show offer count and highest offer by default, with full history opt-in. This is a product decision that must be resolved before building the bid UI.

---

## Recommended Stack (Decisive)

| Layer | Technology | Version | Rationale |
|-------|-----------|---------|-----------|
| Framework | Next.js App Router | 15.x | SSR for SEO, Server Actions replace a separate API, Railway deploy template |
| Language | TypeScript | 5.x | Type-safe Server Actions and Zod validation |
| Styling | Tailwind CSS | 4.x | Vertical scroll and masonry layouts trivial |
| UI Primitives | shadcn/ui | latest | Copy-paste components, ideal for admin forms |
| Database | PostgreSQL | 16.x | Multi-user cloud deploy; use Docker locally from day one (not SQLite) |
| ORM | Drizzle ORM | 0.30.x | Pure TypeScript, no Rust binary, recommended in Next.js auth docs |
| Auth | Better Auth | 1.x | Native Drizzle integration, role-based access (VISITOR/ARTIST) |
| Image processing | Sharp | 0.33.x | Fastest Node.js image library; used by next/image internally |
| File storage (dev) | Local filesystem | — | Zero config; abstract behind StorageProvider interface immediately |
| File storage (prod) | Cloudflare R2 | — | S3-compatible, zero egress fees, free 10 GB/month |
| S3 client | @aws-sdk/client-s3 | v3 | Works with R2 via endpoint override |
| Email | Resend | latest | SPF/DKIM managed, 3k emails/month free |
| Validation | Zod | 3.x | Server Action form validation, bid amount validation |
| Deployment | Railway | — | Official Next.js template, managed Postgres addon |

**Ruled out:** Prisma (Rust binary friction on Railway/Windows), Clerk (SaaS cost), Cloudinary (egress costs), Vercel (no persistent filesystem), SQLite for production (dialect differences cause CI-passing / prod-failing bugs).

---

## Table Stakes Features (Must-Haves for Launch)

1. Responsive gallery — masonry (desktop) + vertical scroll (mobile)
2. Individual artwork detail page — URL-addressable, shareable
3. High-resolution zoom — buyers assess brushwork before any interest
4. Core metadata — title, medium, dimensions (cm), year, availability status
5. Availability badge — AVAILABLE / SOLD / GIVEN on card and detail page
6. Artist about page — trust and story
7. Prev/next navigation on detail page — keyboard + swipe
8. Fast image loading — WebP, lazy load, responsive srcset, explicit width/height (no CLS)
9. Open Graph tags — per-artwork, for social sharing
10. User accounts — register/login (gate for likes and bids)
11. Like system — count publicly visible
12. Offer submission with soft floor warning — inline, not blocking
13. Public offer history — count + highest offer default, full list opt-in
14. Artist admin — artwork CRUD, pipeline validation, status management
15. Image upload pipeline — auto-correct, before/after validation UI, FAILED state recovery

**Deferred to v2:** In-situ photo, series grouping, sort by most-liked, keyboard lightbox, Stripe payment integration.

---

## Top Pitfalls (Ranked by Risk)

### Critical — Address Before Building

**C1: Storing only the processed image destroys the original.**
Prevention: Three DB columns from day one — `original_path`, `processed_path`, `thumbnail_path`. Original is immutable and never public.

**C2: Stripping ICC color profiles causes color mismatch.**
iPhones shoot in Display-P3 wide gamut. Strip the profile and vivid artwork colors become muddy on sRGB displays.
Prevention: `sharp().withMetadata()` to retain ICC; explicitly convert to sRGB with embedded ICC on output.

**C3: Sharp does not auto-rotate — portrait uploads appear sideways.**
Prevention: `.rotate()` (no arguments) as the first Sharp operation, always.

**C4: HEIC files from iPhone crash the pipeline.**
Sharp requires separately compiled `libheif`; standard cloud deploys fail on `.heic` input.
Prevention (v1): Reject at upload endpoint with clear user message.

**C5: Async pipeline failures leave orphaned "processing" records.**
Prevention: `FAILED` state in artwork schema from day one. On failure: set state, delete partial files, surface error in admin.

### Moderate — Painful but Recoverable

**M2:** Offer spam and low-ball flooding. Rate limit: 3 offers per user per artwork.

**M3:** Public offer amounts anchor buyer expectations downward. Show count + highest offer by default; full history behind a toggle.

**M6:** Hardcoded local file paths block cloud migration. `StorageProvider` interface from day one.

**M7:** SQLite locally + PostgreSQL in production causes CI-passing, production-failing bugs. PostgreSQL via Docker from day one.

---

## Suggested Phase Order

### Phase 1 — Foundation
PostgreSQL schema (Drizzle), Better Auth (email+password, VISITOR/ARTIST roles), StorageProvider abstraction, Docker Compose.

### Phase 2 — Image Upload Pipeline
Upload endpoint, Sharp pipeline (`.rotate()` first, ICC-preserving WebP output), three-file storage, pipeline state machine (PENDING → PROCESSING → AWAITING_VALIDATION → PUBLISHED | FAILED), admin validation screen (before/after comparison).
**Flag:** Validate with real iPhone photos before finalizing.

### Phase 3 — Public Gallery
Gallery page (vertical scroll mobile, masonry desktop), lazy loading, srcset, artwork detail page with zoom, prev/next navigation, Open Graph tags, schema.org/VisualArtwork JSON-LD, about page.

### Phase 4 — Social and Marketplace
Like toggle, offer submission with soft floor warning, rate limiting, offer history display, admin offer moderation, Resend email notification on new offer.
**Flag:** Offer history display format is a product decision — validate with artist before building UI.

### Phase 5 — Production Readiness
Swap StorageProvider to R2 adapter, Railway managed Postgres, sitemap.xml, end-to-end email test.

---

## Open Questions Requiring Product Decisions

| Question | Recommendation |
|----------|----------------|
| Offer history display: all amounts public, or count + highest by default? | Count + highest by default; full history opt-in |
| HEIC handling: reject or server-side convert? | Reject in v1 with clear instructions |
| Image correction strength: fixed or artist-adjustable? | Conservative fixed for v1 |
| Offer anonymization: "Anonymous", initials, or "Visitor #N"? | Artist's preference |
| White balance depth: sharp.normalise() only, or AI-based (Replicate)? | normalise() for v1 |

---

*Last updated: 2026-04-22 after research synthesis*
