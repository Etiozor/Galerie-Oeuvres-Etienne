# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-22)

**Core value:** Une vitrine centralisée où chaque œuvre est mise en valeur et peut trouver preneur — remplacement définitif du "chercher dans ses photos de téléphone".
**Current focus:** Phase 2 — Image Pipeline

## Current Position

Phase: 2 of 6 (Image Pipeline)
Plan: 3 of 4 in current phase
Status: In progress
Last activity: 2026-04-26 — Plan 02-03 complete: retryPipeline Server Action + /admin/artworks page with PipelineBadge, PipelinePoller, RetryButton

Progress: [███░░░░░░░] 15%

## Performance Metrics

**Velocity:**
- Total plans completed: 3
- Average duration: 6 min
- Total execution time: 0.3 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 2. Image Pipeline | 3 | 17 min | 5.7 min |

**Recent Trend:**
- Last 5 plans: 7 min
- Trend: —

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
- 02-01: proxyClientMaxBodySize cast as NextConfig['experimental'] — present at runtime but absent from @types/next 15.x types
- 02-02: processImage() separated from Server Action for testability (no Next.js/DB/Storage) and reuse by Retry action (D-09)
- 02-02: rotate() must be first in Sharp chain — normalise() analyses pixels; rotating after gives wrong exposure correction
- 02-02: normalise({ lower: 1, upper: 99 }) per-channel implicitly performs white balance by normalising R/G/B independently
- 02-03: retryPipeline generates fresh UUID for processed/thumbnail keys on each retry — avoids CDN/HTTP cache on stale images
- 02-03: PipelineBadge uses inline styles — spec-exact colors cannot be guaranteed via Tailwind utility cascade
- 02-03: storage.delete mock must return Promise (.mockResolvedValue) — vi.fn() returns undefined, breaking .catch() chaining

### Pending Todos

None yet.

### Blockers/Concerns

- Phase 2: Must validate Sharp ICC color profile handling with real iPhone photos (Display-P3 wide gamut)
- Phase 4: Offer history display format (anonymization of visitor names) needs artist preference before building UI

## Deferred Items

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| v2 | Like system on artworks | Deferred | Init |
| v2 | Social sharing / Open Graph share button | Deferred | Init |
| v2 | SMS OTP verification for visitor accounts | Deferred | Init |
| v2 | In-situ artwork photos | Deferred | Init |
| v2 | Series grouping | Deferred | Init |

## Session Continuity

Last session: 2026-04-26
Stopped at: Completed 02-03-PLAN.md — retryPipeline Server Action + /admin/artworks page with PipelineBadge, PipelinePoller, RetryButton
Resume file: None
