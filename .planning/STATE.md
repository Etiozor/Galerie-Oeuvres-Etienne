# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-22)

**Core value:** Une vitrine centralisée où chaque œuvre est mise en valeur et peut trouver preneur — remplacement définitif du "chercher dans ses photos de téléphone".
**Current focus:** Phase 1 — Foundation

## Current Position

Phase: 1 of 6 (Foundation)
Plan: 0 of 4 in current phase
Status: Ready to plan
Last activity: 2026-04-22 — Roadmap created, requirements mapped, files written

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**
- Total plans completed: 0
- Average duration: —
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**
- Last 5 plans: —
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

Last session: 2026-04-22
Stopped at: Roadmap created — ROADMAP.md, STATE.md, REQUIREMENTS.md traceability written
Resume file: None
