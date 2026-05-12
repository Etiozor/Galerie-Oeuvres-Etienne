# Roadmap: Galerie POF

## Overview

Six phases take the project from a bare database schema to a publicly deployed art gallery with image pipeline, offer system, and artist back-office. Each phase delivers a complete, independently testable capability. Foundation first, then the image pipeline (the highest-risk component), then the public-facing gallery, then the marketplace layer, then the admin tools, and finally the production deployment swap.

## Phases

- [x] **Phase 1: Foundation** - Database schema, artist authentication, storage abstraction, and local dev environment
- [x] **Phase 2: Image Pipeline** - Upload endpoint, Sharp auto-correction, pipeline state machine, and artist validation screen
- [x] **Phase 3: Public Gallery** - Responsive gallery, artwork detail pages, filters, and the about page
- [ ] **Phase 4: Visitor Profiles & Offers** - Lightweight visitor accounts, offer submission, offer history, and email notifications
- [ ] **Phase 5: Admin Back-office** - Artwork CRUD, status management, and offer review dashboard
- [ ] **Phase 6: Production Readiness** - R2 storage swap, Railway deployment, and end-to-end smoke test

## Phase Details

### Phase 1: Foundation
**Goal**: The project runs locally with a typed database schema, working artist login, and a storage abstraction ready to swap between local disk and R2.
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-04
**Success Criteria** (what must be TRUE):
  1. Running `docker compose up` starts PostgreSQL and the Next.js dev server with no errors
  2. An artist can log in at `/admin` with email and password and reach a protected page; unauthenticated access redirects to login
  3. The Drizzle schema compiles and migrates cleanly against the local PostgreSQL container
  4. A `StorageProvider` interface exists with a local filesystem adapter; swapping it requires no changes to calling code
**Plans**: TBD

Plans:
- [ ] 01-01: Docker Compose setup, Next.js 15 project scaffold, Tailwind 4, TypeScript config
- [ ] 01-02: Drizzle schema (artworks, offers, visitors, pipeline states), migration tooling, seed script
- [ ] 01-03: Better Auth integration (email+password, ARTIST role), `/admin` route protection, session middleware
- [ ] 01-04: StorageProvider interface + local filesystem adapter, environment config skeleton

### Phase 2: Image Pipeline
**Goal**: The artist can upload a photo from any device, the pipeline auto-corrects it and stores three file variants, and the artist approves or rejects the result before anything is published.
**Depends on**: Phase 1
**Requirements**: PIPE-01, PIPE-02, PIPE-03, PIPE-04, PIPE-05, ADMIN-03
**Success Criteria** (what must be TRUE):
  1. The artist uploads a JPEG or PNG from a phone or desktop and the upload completes without error; HEIC files are rejected with a clear explanatory message
  2. The pipeline stores three immutable paths (`original_path`, `processed_path`, `thumbnail_path`); the original is never overwritten
  3. The processed image is auto-rotated (EXIF), exposure-corrected, contrast-normalised, and white-balanced, with the ICC color profile preserved in the output WebP
  4. The artist sees a side-by-side before/after comparison screen and can approve the correction, reject it, or publish the raw original instead
  5. If the pipeline crashes at any step, the artwork record enters a `FAILED` state visible in the admin; no orphaned files or stuck `PROCESSING` records remain
**Plans**: 4 plans

Plans:
- [x] 02-01-PLAN.md — Upload endpoint, validation HEIC/taille/format, Route Handler fichiers, next.config.ts bodySizeLimit, vitest
- [x] 02-02-PLAN.md — Sharp pipeline (processImage), intégration dans uploadArtwork (PROCESSING → AWAITING_VALIDATION / FAILED)
- [x] 02-03-PLAN.md — Liste admin /admin/artworks, badges pipeline, polling 3s, Server Action retryPipeline
- [ ] 02-04-PLAN.md — Écran de validation côte à côte, 3 Server Actions (approveArtwork / publishRaw / rejectArtwork), shadcn/ui
**UI hint**: yes

### Phase 3: Public Gallery
**Goal**: Any visitor — without an account — can browse all published artworks on a responsive gallery page and open a dedicated detail page for any artwork.
**Depends on**: Phase 2
**Requirements**: GALLERY-01, GALLERY-02, GALLERY-03, GALLERY-04, ART-01, ART-02, ART-03, ART-04, ART-05, ABOUT-01
**Success Criteria** (what must be TRUE):
  1. On mobile, artworks appear in a single-column vertical scroll; on desktop, they appear in a 2–3 column masonry grid
  2. A visitor can filter the gallery by type (drawing / painting) and by medium (pencil, ink, acrylic, oil) and the grid updates without a page reload
  3. Each artwork detail page has a clean URL, displays title, date, description, dimensions, medium, and availability status, supports high-resolution zoom, and has working previous/next navigation to adjacent artworks
  4. The about page exists at `/about` and presents the artist's story and approach
  5. Images load with lazy loading, responsive `srcset` WebP variants, and no layout shift; each detail page has Open Graph meta tags for social sharing
**Plans**: TBD

Plans:
- [x] 03-01: Gallery page layout — vertical scroll (mobile) + CSS masonry (desktop), lazy loading, srcset, availability badge
- [x] 03-02: Filter bar (type + medium), client-side filter state, URL param persistence
- [x] 03-03: Artwork detail page — URL routing, metadata display, zoom component, prev/next navigation, Open Graph tags
- [x] 03-04: About page, global navigation, 404 and empty-state handling
**UI hint**: yes

### Phase 4: Visitor Profiles & Offers
**Goal**: A visitor can create a lightweight profile with a phone number to submit purchase offers, and the artist receives an email notification for each new offer.
**Depends on**: Phase 3
**Requirements**: AUTH-01, AUTH-02, AUTH-03, MARKET-01, MARKET-02, MARKET-03, MARKET-04
**Success Criteria** (what must be TRUE):
  1. The full gallery, all artwork detail pages, and offer history counts are accessible to any visitor with no account required
  2. A visitor can create a profile by providing a pseudo or name + mandatory phone number (email optional), and can retrieve their account later by entering their phone number
  3. On an available artwork, a logged-in visitor can submit an offer with an amount and optional message; a visible warning appears if the amount is below the base price, but does not block submission
  4. The artwork detail page shows the base price with its full cost breakdown (time, format, framing, materials, skill level, artist attachment)
  5. Each artwork shows total offer count and the highest offer by default; a visitor can expand a full offer history list via an opt-in button; the artist receives an email within seconds of a new offer containing the amount and visitor contact details
**Plans**: TBD

Plans:
- [x] 04-01: Visitor profile model (pseudo/name, phone required, email optional), phone-based account retrieval flow, session management separate from artist auth
- [x] 04-02: Base price model and breakdown UI component (time, format, framing, materials, technicality, artist attachment)
- [x] 04-03: Offer submission form with soft floor warning, Server Action, rate limiting (3 offers per visitor per artwork), Zod validation
- [x] 04-04: Offer history display (count + highest offer default, full list opt-in toggle), Resend email notification on new offer
**UI hint**: yes

### Phase 5: Admin Back-office
**Goal**: The artist can manage the full lifecycle of their collection — create, edit, delete artworks, change statuses, and review all incoming offers — from a protected admin dashboard.
**Depends on**: Phase 4
**Requirements**: ADMIN-01, ADMIN-02, ADMIN-04, ADMIN-05
**Success Criteria** (what must be TRUE):
  1. The artist can create a new artwork entry with all fields (title, date, description, type, medium, dimensions) and a complete base price breakdown before uploading an image
  2. The artist can edit any field on an existing artwork and can permanently delete an artwork (removing its files and database record)
  3. The artist can change an artwork's status from Available to Sold, Given, or Reserved from either the artwork list or the detail page
  4. The artist can view a list of all offers received for any artwork, including visitor pseudo/name, phone number, email (if provided), offer amount, and message
**Plans**: 5 plans

Plans:
- [x] 05-01-PLAN.md — Status badges on artwork list, StatusChangeForm + DeleteArtworkButton on detail page, Server Actions updateArtworkStatus + deleteArtwork
- [x] 05-02-PLAN.md — ArtworkEditForm (15 fields, useActionState), Server Action updateArtwork with Zod validation and numeric→string conversion
- [x] 05-03-PLAN.md — Offers dashboard section in /admin/artworks/[id] — full visitor contact details (phone, email), sorted by amount desc
- [ ] 05-04-PLAN.md — Page /mon-profil (4 sections), saved_artworks schema + db:push, toggleSavedArtwork Server Action, SaveButton heart on artwork detail
- [ ] 05-05-PLAN.md — SiteNav async Server Component with visitor connection indicator, ModalTrigger Client Component with Suspense in layout
**UI hint**: yes

**Demandes artiste (session 2026-05-10) :**
- Page profil visiteur (/mon-profil) : infos du compte, mes offres, mes acquisitions, mes œuvres enregistrées
- Indicateur de connexion dans la nav : rien n'indique qu'on est connecté sur la page d'accueil → icône/initiale dans SiteNav avec lien vers /mon-profil

### Phase 6: Production Readiness
**Goal**: The application runs on Railway with Cloudflare R2 for image storage, a managed PostgreSQL database, and verified end-to-end functionality in the production environment.
**Depends on**: Phase 5
**Requirements**: (infrastructure phase — no new v1 functional requirements; delivers the deployment contract implicit in all prior phases)
**Success Criteria** (what must be TRUE):
  1. Swapping the `StorageProvider` to the R2 adapter requires only an environment variable change; no application code changes
  2. The Railway deployment builds and starts successfully from the repository using the official Next.js template
  3. An end-to-end smoke test passes: artist logs in, uploads and approves an image, a visitor browses the gallery and submits an offer, the artist receives the notification email
  4. All environment secrets (database URL, R2 credentials, Resend API key, auth secret) are managed via Railway environment variables and never committed to the repository
**Plans**: TBD

Plans:
- [ ] 06-01: R2 StorageProvider adapter (@aws-sdk/client-s3 with endpoint override), environment variable wiring
- [ ] 06-02: Railway project setup — managed PostgreSQL addon, environment variables, build configuration, domain
- [ ] 06-03: End-to-end smoke test script (upload → gallery → offer → email), production environment validation

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 4/4 | Complete | 2026-04-22 |
| 2. Image Pipeline | 4/4 | Complete | 2026-04-26 |
| 3. Public Gallery | 4/4 | Complete | 2026-05-02 |
| 4. Visitor Profiles & Offers | 4/4 | Complete | 2026-05-10 |
| 5. Admin Back-office | 3/5 | In Progress|  |
| 6. Production Readiness | 0/3 | Not started | - |
