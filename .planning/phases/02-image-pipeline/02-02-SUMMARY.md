---
phase: 02-image-pipeline
plan: 02
subsystem: image-pipeline
tags: [sharp, tdd, webp, exif, icc, server-actions, drizzle, pipeline]

requires:
  - phase: 02-image-pipeline
    plan: 01
    provides: uploadArtwork Server Action (PENDING state + original storage), Vitest infrastructure, tests/fixtures/test-image.jpg, StorageProvider interface

provides:
  - processImage() pure function: Buffer → { processedBuffer, thumbnailBuffer } (both WebP)
  - D-11 compliance: .rotate() is always first in Sharp chain (EXIF iPhone correction)
  - D-12 compliance: .withMetadata() on both chains (Display-P3 ICC profile preserved)
  - PIPE-02: auto-exposure + auto-contrast via normalise({ lower: 1, upper: 99 })
  - PIPE-03: thumbnail capped at 400px width, never enlarged
  - uploadArtwork extended with full state machine: PENDING → PROCESSING → AWAITING_VALIDATION / FAILED
  - Three storage keys persisted in DB: originalPath + processedPath + thumbnailPath (D-13)
  - Idempotent partial-file cleanup on pipeline failure (D-08)
  - 9 passing Vitest tests (5 process + 4 upload validation)

affects: [02-03-validation-ui, 02-04-retry-action, 05-admin-backoffice]

tech-stack:
  added: []
  patterns:
    - TDD RED/GREEN: test file committed before implementation (failing → passing)
    - Sharp chain order: rotate() → normalise() → withMetadata() → webp() — mandatory (D-11, D-12)
    - try/catch in Server Action catches Sharp + storage errors, transitions to FAILED, returns error string
    - Idempotent storage cleanup: storage.delete().catch(() => {}) for partial files

key-files:
  created:
    - src/lib/pipeline/process.ts
    - tests/pipeline/process.test.ts
  modified:
    - src/actions/upload.ts — added processImage call, PROCESSING→AWAITING_VALIDATION/FAILED state machine, eq import, processImage import

key-decisions:
  - "processImage() is a pure Buffer→Buffer function separate from the Server Action — enables testing without Next.js/DB/Storage and reuse for Retry action (D-09)"
  - "rotate() MUST be first in Sharp chain (D-11): normalise() analyses pixel values — working on mis-oriented pixels gives wrong exposure correction"
  - "withMetadata() on both chains (D-12): without it, Sharp strips the ICC profile and Display-P3 iPhone colors appear desaturated in color-managed browsers"
  - "normalise({ lower: 1, upper: 99 }) per channel implicitly performs white balance correction (PIPE-03) by normalising R/G/B independently"
  - "Same UUID for original/processed/thumbnail keys (D-13) — guarantees traceability and simplifies cleanup"
  - "Server Action catches and returns error string (not rethrow) — rethrow would produce generic Next.js error page instead of actionable French error message"
  - "storage.delete().catch(() => {}) for partial file cleanup — idempotent, silent failure is acceptable when file may not exist"

requirements-completed: [PIPE-02, PIPE-03]

duration: 6min
completed: 2026-04-26
---

# Phase 2 Plan 02: Sharp Pipeline Core Summary

**processImage() pure Sharp function (rotate → normalise → withMetadata → WebP) + uploadArtwork extended with full PENDING → PROCESSING → AWAITING_VALIDATION / FAILED state machine; 9 Vitest tests green**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-04-26T14:53:00Z
- **Completed:** 2026-04-26T14:59:52Z
- **Tasks:** 2 (Task 1 TDD + Task 2 integration)
- **Files modified:** 3 (2 created, 1 modified)

## Accomplishments

- `processImage(buffer)` produces valid WebP buffers (magic bytes `RIFF...WEBP`) for both processed (quality 85) and thumbnail (quality 80) variants
- Sharp chain order enforced: `.rotate()` always first (D-11), `.withMetadata()` always present on both chains (D-12)
- `normalise({ lower: 1, upper: 99 })` provides auto-exposure + auto-contrast + implicit per-channel white balance (PIPE-02/03)
- Thumbnail capped at 400px wide with `withoutEnlargement: true` — never upscales a small image (PIPE-03)
- `uploadArtwork` now transitions: PENDING → PROCESSING (before Sharp) → AWAITING_VALIDATION (success) or FAILED (catch)
- All three storage keys persisted in DB on success: `originalPath` (from 02-01) + `processedPath` + `thumbnailPath` (D-13)
- Partial file cleanup on failure: `storage.delete(processedKey).catch(() => {})` + `storage.delete(thumbnailKey).catch(() => {})` (D-08)
- 9 Vitest tests all green: 5 process tests + 4 upload validation tests from 02-01

## Task Commits

1. **Task 1 RED — Failing tests for processImage** — `778c344`
   - `tests/pipeline/process.test.ts` — 5 tests covering: non-empty buffers, WebP magic bytes (processed + thumbnail), max 400px thumbnail, error on invalid buffer
2. **Task 1 GREEN — processImage implementation** — `eea448a`
   - `src/lib/pipeline/process.ts` — PipelineResult interface + processImage() with D-11/D-12 Sharp chain
3. **Task 2 — uploadArtwork pipeline integration** — `ae7e942`
   - `src/actions/upload.ts` — full state machine + processImage call + eq import

## Files Created/Modified

- `src/lib/pipeline/process.ts` — Pure processImage(Buffer) → PipelineResult function with Sharp
- `tests/pipeline/process.test.ts` — 5 unit tests: WebP output, thumbnail width, error handling
- `src/actions/upload.ts` — Extended with PROCESSING→AWAITING_VALIDATION/FAILED state machine

## Decisions Made

- `processImage()` separated from Server Action for testability (runs without Next.js/DB/Storage) and reuse by the Retry action (D-09) in a later plan
- `rotate()` must be first: `normalise()` analyses pixel luminance values — rotating after normalisation processes mis-oriented pixels with wrong exposure metrics
- `withMetadata()` on both chains: Sharp strips ICC profiles by default; without it, Display-P3 photos from iPhone appear desaturated in Safari and Chrome (color-managed browsers)
- `normalise({ lower: 1, upper: 99 })` chosen over `modulate()` because it adapts to the image content (per-channel histogram stretch) rather than applying a fixed correction
- Same UUID for all three storage keys simplifies the FAILED cleanup path: `delete(processedKey)` + `delete(thumbnailKey)` using variables already in scope
- Server Action `catch {}` block returns `{ error: string }` rather than rethrowing — Next.js would render a generic error page on uncaught Server Action exceptions

## Deviations from Plan

None — plan executed exactly as written.

## TDD Gate Compliance

- RED gate: `778c344` — `test(02-02): add failing tests for processImage RED phase`
- GREEN gate: `eea448a` — `feat(02-02): implement processImage Sharp pipeline`
- REFACTOR gate: not needed — code was clean on first pass

## Known Stubs

None — processImage produces real WebP output verified by magic bytes. uploadArtwork writes real DB entries and storage keys.

## Threat Flags

None — no new network endpoints, auth paths, file access patterns, or schema changes introduced. The Sharp pipeline operates within the trust boundary established by the T-02-0x threat register in 02-02-PLAN.md.

---
*Phase: 02-image-pipeline*
*Completed: 2026-04-26*
