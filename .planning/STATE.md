# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-22)

**Core value:** Une vitrine centralisée où chaque œuvre est mise en valeur et peut trouver preneur — remplacement définitif du "chercher dans ses photos de téléphone".
**Current focus:** Phase 4 — Visitor Profiles & Offers

## Current Position

Phase: 4 of 6 (Visitor Profiles & Offers)
Plan: 1 of 4 in current phase
Status: In progress — Plan 04-01 complete
Last activity: 2026-05-07 — Plan 04-01 complete: iron-session cookie visiteur, createOrLoginVisitor Server Action (z.e164, upsert AUTH-03), VisitorProfileModal, lecture session dans page détail. 7 tests passants.

Progress: [██████░░░░] 54%

## Performance Metrics

**Velocity:**
- Total plans completed: 12
- Average duration: ~10 min
- Total execution time: ~2 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1. Foundation | 4 | ~40 min | ~10 min |
| 2. Image Pipeline | 4 | ~42 min | 10.5 min |
| 3. Public Gallery | 4 | ~40 min | ~10 min |

**Recent Trend:**
- Last 5 plans: ~10 min
- Trend: stable

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Roadmap: Image pipeline is the highest-risk phase — validate with real iPhone photos before finalizing Phase 2
- Roadmap: Offer history shows count + highest offer by default; full list is opt-in (anchoring risk mitigation)
- Roadmap: HEIC files are rejected at upload with a clear message (libheif not available on standard deploys)
- Roadmap: PostgreSQL via Docker from day one — no SQLite locally to avoid CI-pass/prod-fail dialect bugs
- Roadmap: StorageProvider interface abstracted from day one so R2 swap in Phase 6 is env-var-only
- 02-01: Mock next/headers with vi.fn(() => new Headers()) in Vitest — headers() throws outside a Next.js request scope
- 02-01: Buffer → new Uint8Array(buffer) cast for Response BodyInit compatibility in TypeScript 5 strict mode
- 02-02: processImage() separated from Server Action for testability (no Next.js/DB/Storage) and reuse by Retry action (D-09)
- 02-02: rotate() must be first in Sharp chain — normalise() analyses pixels; rotating after gives wrong exposure correction
- 02-02: normalise({ lower: 1, upper: 99 }) per-channel implicitly performs white balance by normalising R/G/B independently
- 02-03: retryPipeline generates fresh UUID for processed/thumbnail keys on each retry — avoids CDN/HTTP cache on stale images
- 02-03: PipelineBadge uses inline styles — spec-exact colors cannot be guaranteed via Tailwind utility cascade
- 02-04: vi.hoisted() required when vi.mock() factory references variables declared in the same file — Vitest hoists vi.mock() above all declarations
- 02-04: shadcn base-nova style @base-ui/react has incomplete ESM build on Windows/Node 24 — replaced with Radix UI-based equivalents (same API)
- 03-01: parseDimension() casts Drizzle numeric string → number for aspect-ratio calculation
- 03-01: ArtworkCard uses inline style for aspectRatio (not Tailwind) — computed from real DB dimensions
- 03-02: FilterBar uses router.replace with scroll:false — no page reload, URL updated, browser history not polluted
- 03-03: generateMetadata queries DB with pipelineState=published guard — unpublished artworks return notFound()
- 03-04: "Faire une offre" button is disabled with cursor:not-allowed — intentional Phase 3 stub, wired in Phase 4
- 04-01: iron-session cookie 'pof_visitor_session' separate from Better Auth cookie — no conflict on same domain
- 04-01: Session stores only visitorId + displayName, never phone number (T-04-01-06 mitigation)
- 04-01: VisitorProfileModal wiring deferred to 04-03 (Wave 2) to avoid wave-1 merge conflict on artworks/[id]/page.tsx
- 04-01: vi.hoisted() required for mockSession in vi.mock() factory — same pattern as 02-04

### Pending Todos

Phase 4 human-verification items (before starting Phase 5):
- Masonry grid responsive layout (visual browser test)
- Artwork card hover overlay (visual browser test)
- Infinite scroll IntersectionObserver (live behavior test)
- Filter toggle + URL persistence (live behavior test)
- Open Graph tags on detail page (curl or browser source test)
- BackgroundDecor SVG pointer-events (visual browser test)

### Blockers/Concerns

- Phase 4: Offer history display format (anonymization of visitor names) needs artist preference before building UI
- Phase 3 human verification: 6 visual/behavioral tests require a running browser — see 03-VERIFICATION.md

## Deferred Items

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| v2 | Like system on artworks | Deferred | Init |
| v2 | Social sharing / Open Graph share button | Deferred | Init |
| v2 | SMS OTP verification for visitor accounts | Deferred | Init |
| v2 | In-situ artwork photos | Deferred | Init |
| v2 | Series grouping | Deferred | Init |

## Session Continuity

Last session: 2026-05-07
Stopped at: Plan 04-01 complete — visitor session layer done (iron-session, createOrLoginVisitor, VisitorProfileModal, detail page wired). Ready for Plan 04-02 (offers model + Server Action).
Resume file: None
