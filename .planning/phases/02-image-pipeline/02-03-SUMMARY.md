---
phase: 02-image-pipeline
plan: 03
subsystem: admin-ui
tags: [tdd, vitest, next.js, server-actions, drizzle, polling, admin, pipeline-badge]

requires:
  - phase: 02-image-pipeline
    plan: 02
    provides: processImage() pure function, uploadArtwork state machine (PENDING→PROCESSING→AWAITING_VALIDATION/FAILED), StorageProvider interface, artworks schema with pipelineState enum

provides:
  - retryPipeline(artworkId) Server Action: re-runs Sharp pipeline on stored original (D-09)
  - PipelineBadge: 5-state badge component with exact UI-SPEC colors (no Tailwind — inline styles)
  - PipelinePoller: client polling component (setInterval 3s, clearInterval cleanup, router.refresh())
  - RetryButton: client button with useTransition loading state, calls retryPipeline
  - /admin/artworks page: Server Component list with auth, Drizzle sort, badges, Valider link, retry button
  - 13 passing Vitest tests (4 upload + 5 process + 4 pipeline)

affects: [02-04-validation-ui, 05-admin-backoffice]

tech-stack:
  added: []
  patterns:
    - TDD RED/GREEN: failing test committed before implementation (f3442ab → 29959f6)
    - PipelinePoller pattern: hasPendingItems flag drives setInterval/clearInterval lifecycle
    - Server Component + Client Component split: page.tsx (server) renders PipelinePoller/RetryButton (client)
    - retryPipeline generates fresh UUID per retry to avoid CDN/browser cache on processed/thumbnail keys

key-files:
  created:
    - src/actions/pipeline.ts
    - src/app/admin/artworks/page.tsx
    - src/app/admin/artworks/_components/PipelineBadge.tsx
    - src/app/admin/artworks/_components/PipelinePoller.tsx
    - src/app/admin/artworks/_components/RetryButton.tsx
    - tests/pipeline/pipeline.test.ts
  modified: []

key-decisions:
  - "retryPipeline generates a new UUID for processed/thumbnail keys on each retry — avoids CDN/HTTP cache serving stale images"
  - "PipelineBadge uses inline styles instead of Tailwind classes — spec-exact colors cannot be purged or overridden by utility cascade"
  - "PipelinePoller stops polling when hasPendingItems is false — terminal states (AWAITING_VALIDATION, PUBLISHED, FAILED) need no polling"
  - "storage.delete mock must return Promise (.mockResolvedValue) — vi.fn() returns undefined by default, breaking .catch() chaining on the cleanup path"
  - "RetryButton uses useTransition instead of useState(loading) — React 19 pattern, isPending from hook, no manual boolean management"

requirements-completed: []

duration: 4min
completed: 2026-04-26
---

# Phase 2 Plan 03: Admin Artwork List Summary

**retryPipeline Server Action (D-09 FAILED retry on original) + /admin/artworks page with 5-state PipelineBadge, 3s PipelinePoller, and RetryButton loading state; 13 Vitest tests green**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-26T15:03:25Z
- **Completed:** 2026-04-26T15:07:30Z
- **Tasks:** 2 (1 TDD task + 1 UI task)
- **Files modified:** 6 (6 created, 0 modified)

## Accomplishments

- `retryPipeline(artworkId)` validates session, checks FAILED state, reads original from StorageProvider (never re-uploads), runs processImage(), transitions to AWAITING_VALIDATION
- Fresh UUID generated per retry — processed/thumbnail keys change so CDN/browser cache never serves stale images
- Security guards implemented: T-02-10 (session check first) + T-02-12 (pipelineState !== 'failed' blocked)
- `PipelineBadge` renders 5 states with exact UI-SPEC colors via inline styles — no Tailwind purge risk
- `PipelinePoller` polls every 3 seconds only while `hasPendingItems` is true; cleans up with `clearInterval` on unmount
- `RetryButton` uses `useTransition` for non-blocking pending state; calls `retryPipeline` then `router.refresh()`
- `/admin/artworks` page: Server Component auth check, `desc(artworks.createdAt)` sort, empty state with exact UI-SPEC copy ("Aucune œuvre pour l'instant. Uploader votre première photo pour commencer."), conditional 'Valider' link and 'Réessayer' button
- All 13 Vitest tests pass (4 upload + 5 process + 4 pipeline); 0 TypeScript errors

## Task Commits

1. **Task 1 RED — Failing tests for retryPipeline** — `f3442ab`
   - `tests/pipeline/pipeline.test.ts` — 4 tests: auth guard, not found, wrong state, success path
2. **Task 1 GREEN — retryPipeline implementation** — `29959f6`
   - `src/actions/pipeline.ts` — full Server Action with security guards, storage read, processImage call
   - `tests/pipeline/pipeline.test.ts` — fixed storage.delete mock to return Promise
3. **Task 2 — Admin artwork list UI** — `8b1ba81`
   - `src/app/admin/artworks/page.tsx` — Server Component list page
   - `src/app/admin/artworks/_components/PipelineBadge.tsx` — 5-state badge
   - `src/app/admin/artworks/_components/PipelinePoller.tsx` — 3s polling with cleanup
   - `src/app/admin/artworks/_components/RetryButton.tsx` — client button with useTransition

## Files Created/Modified

- `src/actions/pipeline.ts` — retryPipeline Server Action (auth guard, state guard, storage read, processImage, AWAITING_VALIDATION transition)
- `src/app/admin/artworks/page.tsx` — Server Component list with auth, Drizzle query, hasPendingItems, full artwork row rendering
- `src/app/admin/artworks/_components/PipelineBadge.tsx` — Pure component, 5 UI-SPEC badge configs, inline styles
- `src/app/admin/artworks/_components/PipelinePoller.tsx` — 'use client', useEffect, setInterval(3000), clearInterval
- `src/app/admin/artworks/_components/RetryButton.tsx` — 'use client', useTransition, retryPipeline call, router.refresh()
- `tests/pipeline/pipeline.test.ts` — 4 unit tests for retryPipeline

## Decisions Made

- Generated fresh UUID for processed/thumbnail keys on each retry — CDN and browser HTTP cache uses URLs as cache keys; same key = stale content served even after reprocessing
- Inline styles on PipelineBadge instead of Tailwind utility classes — colors like `#a16207` (amber-700) are exact spec values that Tailwind's JIT cannot guarantee won't be purged or overridden by cascade order
- PipelinePoller stops when `hasPendingItems` is false — AWAITING_VALIDATION/PUBLISHED/FAILED are terminal states requiring human action; polling would waste server and network resources
- `useTransition` over `useState(isLoading)` for RetryButton — React 19 recommended pattern; `isPending` is derived from the transition, not manually managed boolean

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] storage.delete mock returned undefined — broke .catch() chaining in test 4**
- **Found during:** Task 1 GREEN phase (first test run — test 4 failed with `Cannot read properties of undefined (reading 'catch')`)
- **Issue:** `vi.fn()` returns `undefined` by default. The plan specified `delete: vi.fn()` in the storage mock, but `retryPipeline` calls `storage.delete(key).catch(() => {})` in the success path cleanup. `.catch()` is called on `undefined`, causing a runtime error.
- **Fix:** Changed mock to `delete: vi.fn().mockResolvedValue(undefined)` so it returns a resolved Promise that supports `.catch()`.
- **Files modified:** `tests/pipeline/pipeline.test.ts`
- **Verification:** All 4 tests pass after fix
- **Committed in:** `29959f6` (Task 1 GREEN commit)

## TDD Gate Compliance

- RED gate: `f3442ab` — `test(02-03): add failing tests for retryPipeline RED phase`
- GREEN gate: `29959f6` — `feat(02-03): implement retryPipeline Server Action — D-09 retry on FAILED`
- REFACTOR gate: not needed — code was clean on first pass

## Known Stubs

None — retryPipeline calls real processImage() (tested with real Sharp in process.test.ts). The admin page renders real DB data. No hardcoded empty values or placeholder content.

## Threat Flags

None — no new network endpoints introduced. retryPipeline uses the same auth pattern as uploadArtwork (T-02-10 already in threat register). The IDOR risk (T-02-11) is accepted per the threat model (single artist user).

---
*Phase: 02-image-pipeline*
*Completed: 2026-04-26*
