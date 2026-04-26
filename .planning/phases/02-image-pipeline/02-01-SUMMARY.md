---
phase: 02-image-pipeline
plan: 01
subsystem: upload
tags: [vitest, sharp, next.js, drizzle, server-actions, storage, image-upload]

requires:
  - phase: 01-foundation
    provides: StorageProvider interface (put/get/delete/getUrl), artworks schema with pipeline_state enum, auth.api.getSession pattern

provides:
  - Vitest test infrastructure with @ alias resolving to ./src
  - 4 passing upload validation tests (HEIC, size, format, session)
  - uploadArtwork Server Action with full validation and DB INSERT PENDING
  - GET /api/uploads/[...key] Route Handler serving files from StorageProvider
  - /admin/upload page with useActionState, 44px touch targets, exact copywriting
  - artworks.title default 'Sans titre' active in PostgreSQL
  - next.config.ts bodySizeLimit 25mb for large iPhone photos

affects: [02-02-image-pipeline, 03-public-gallery, 05-admin-backoffice]

tech-stack:
  added: [vitest@4.1.5, @vitejs/plugin-react]
  patterns:
    - TDD RED/GREEN: write failing tests first, implement to make them pass
    - Mock next/headers in Vitest (not available outside Next.js request scope)
    - Server Action uploadArtwork with useActionState(uploadArtwork, null)
    - Route Handler with await params (Next.js 15 async params)

key-files:
  created:
    - vitest.config.ts
    - tests/pipeline/upload.test.ts
    - tests/fixtures/test-image.jpg
    - src/actions/upload.ts
    - src/app/api/uploads/[...key]/route.ts
    - src/app/admin/upload/page.tsx
  modified:
    - src/db/schema.ts — artworks.title gets .default('Sans titre')
    - next.config.ts — experimental.serverActions.bodySizeLimit 25mb + proxyClientMaxBodySize 25mb
    - package.json — vitest + @vitejs/plugin-react added to devDependencies

key-decisions:
  - "Mock next/headers with vi.mock('next/headers') in Vitest — the real headers() throws outside a Next.js request scope"
  - "Buffer → new Uint8Array(buffer) cast needed for Response BodyInit compatibility in TypeScript"
  - "proxyClientMaxBodySize cast as NextConfig['experimental'] — property exists at runtime but not yet in @types/next 15.x"
  - "Guard Drizzle .returning() result with explicit undefined check — TypeScript infers array may be empty"

patterns-established:
  - "Server Action validation order: session first, then HEIC, then format, then size — fail fast before any I/O"
  - "HEIC rejected before generic format check to provide iPhone-specific export instructions"
  - "StorageProvider used exclusively via getStorage() — never LocalStorageAdapter directly"
  - "Vitest mocks: vi.mock('@/lib/auth'), vi.mock('@/db'), vi.mock('@/lib/storage'), vi.mock('next/headers')"

requirements-completed: [PIPE-01]

duration: 7min
completed: 2026-04-26
---

# Phase 2 Plan 01: Upload Entry Point Summary

**Vitest infrastructure + uploadArtwork Server Action (HEIC/size/format/session validation) + GET /api/uploads/[...key] Route Handler + /admin/upload page; artworks.title default 'Sans titre' pushed to PostgreSQL**

## Performance

- **Duration:** 7 min
- **Started:** 2026-04-26T14:45:12Z
- **Completed:** 2026-04-26T14:52:40Z
- **Tasks:** 3 (2 TDD tasks + 1 DB push)
- **Files modified:** 9 (6 created, 3 modified)

## Accomplishments

- Vitest installed and configured with `@` alias — runs in under 1 second
- `uploadArtwork` Server Action validates session, HEIC, MIME type, and file size with exact French error messages before any DB/storage I/O
- GET `/api/uploads/[...key]` Route Handler uses StorageProvider abstraction so dev/prod behavior is identical
- `/admin/upload` page uses `useActionState` (React 19), 44px touch targets (WCAG 2.5.5), `#171717` CTA, auto-redirects after success
- `artworks.title` default `'Sans titre'` applied to PostgreSQL via `drizzle-kit push`
- `next.config.ts` extended to accept 25 MB Server Actions (covers 20 MB iPhone JPEG + 5 MB FormData overhead)

## Task Commits

1. **Task 1: Vitest infra + schema + next.config** - `48f04be` (test — RED phase)
2. **Task 2: uploadArtwork + Route Handler + upload page** - `ddb4a1b` (feat — GREEN phase)
3. **Task 3: DB push** — no file changes; `drizzle-kit push` applied directly to PostgreSQL

## Files Created/Modified

- `vitest.config.ts` — Vitest config with node environment and `@` alias
- `tests/pipeline/upload.test.ts` — 4 upload validation tests (session, HEIC, size, format)
- `tests/fixtures/test-image.jpg` — 10x10 JPEG fixture generated via Sharp
- `src/actions/upload.ts` — uploadArtwork Server Action (validation + DB INSERT + storage.put)
- `src/app/api/uploads/[...key]/route.ts` — GET handler serving files via StorageProvider
- `src/app/admin/upload/page.tsx` — Upload form with useActionState, error/success states
- `src/db/schema.ts` — artworks.title: added `.default('Sans titre')`
- `next.config.ts` — added experimental.serverActions.bodySizeLimit + proxyClientMaxBodySize
- `package.json` / `package-lock.json` — vitest + @vitejs/plugin-react in devDependencies

## Decisions Made

- Mocked `next/headers` with `vi.mock('next/headers', () => ({ headers: vi.fn(() => new Headers()) }))` — `headers()` throws `"called outside a request scope"` in Vitest (not a Next.js server); since `auth.api.getSession` is itself mocked, the actual header values don't matter.
- Cast `new Uint8Array(buffer)` for `Response` constructor — TypeScript 5 doesn't consider `Buffer` a valid `BodyInit` even though `Buffer extends Uint8Array`; the cast is safe and the bytes are identical.
- Cast `experimental` block as `NextConfig['experimental']` — `proxyClientMaxBodySize` exists at runtime in Next.js 15.5+ but is absent from the published TypeScript type; cast avoids TS2353 without disabling `ignoreBuildErrors`.
- Guard `inserted[0]` with explicit `undefined` check after `.returning()` — Drizzle types the result as `Array<{id: number}>` and TypeScript flags destructuring without a guard; added explicit check with error return for defensive programming.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Mocked next/headers to fix test scope error**
- **Found during:** Task 2 (GREEN phase — first test run)
- **Issue:** `headers()` from `next/headers` throws `"called outside a request scope"` when called in Vitest (not inside a Next.js request). The plan specified mocking `@/lib/auth` but not `next/headers`, which is called inside `uploadArtwork` before `auth.api.getSession`.
- **Fix:** Added `vi.mock('next/headers', () => ({ headers: vi.fn(() => new Headers()) }))` to the test file. The mock value is unused since `auth.api.getSession` is itself mocked.
- **Files modified:** `tests/pipeline/upload.test.ts`
- **Verification:** All 4 tests pass after fix
- **Committed in:** `ddb4a1b` (Task 2 commit)

**2. [Rule 1 - Bug] Fixed TypeScript errors in upload.ts and route.ts**
- **Found during:** Task 2 (`npx tsc --noEmit`)
- **Issue 1:** `artwork` possibly undefined — Drizzle `.returning()` returns an array; destructuring `const [artwork] =` gives TypeScript no guarantee the array is non-empty.
- **Issue 2:** `Buffer` not assignable to `BodyInit` for `Response` constructor — TypeScript 5 strict mode.
- **Fix:** Replaced destructuring with indexed access `inserted[0]` + explicit undefined guard; wrapped Buffer in `new Uint8Array(buffer)` for Response.
- **Files modified:** `src/actions/upload.ts`, `src/app/api/uploads/[...key]/route.ts`
- **Verification:** `npx tsc --noEmit` returns 0 errors
- **Committed in:** `ddb4a1b` (Task 2 commit)

**3. [Rule 1 - Bug] Cast proxyClientMaxBodySize to bypass missing type**
- **Found during:** Task 1 (IDE diagnostic on next.config.ts edit)
- **Issue:** `proxyClientMaxBodySize` is not declared in `NextConfig['experimental']` for this version of `@types/next`, causing TS2353.
- **Fix:** Added `as NextConfig['experimental']` cast to the `experimental` object literal.
- **Files modified:** `next.config.ts`
- **Verification:** `npx tsc --noEmit` returns 0 errors
- **Committed in:** `48f04be` (Task 1 commit)

---

**Total deviations:** 3 auto-fixed (3x Rule 1 — Bug)
**Impact on plan:** All three fixes required for correct test execution and TypeScript compliance. No scope creep — all fixes internal to the plan's own files.

## TDD Gate Compliance

- RED gate: `48f04be` — `test(02-01): add failing Vitest tests + infra RED phase`
- GREEN gate: `ddb4a1b` — `feat(02-01): upload action, file route handler, admin upload page`
- REFACTOR gate: not needed — code was clean on first pass

## Issues Encountered

- `proxyClientMaxBodySize` absent from `@types/next` 15.x types — resolved with cast (documented above)
- `Buffer` vs `BodyInit` type mismatch in Response constructor — resolved with `Uint8Array` wrapper

## User Setup Required

None — no external service configuration required. Docker PostgreSQL was already running from Phase 1.

## Next Phase Readiness

- `uploadArtwork` creates a DB entry in PENDING state and stores the original file — ready for Phase 02-02 to pick up the `originalPath` and run the Sharp pipeline
- `GET /api/uploads/[...key]` serves originals immediately — the validation UI can display the original before processing
- Tests confirm validation logic is solid — Phase 02-02 can add more pipeline tests on the same infrastructure

---
*Phase: 02-image-pipeline*
*Completed: 2026-04-26*
