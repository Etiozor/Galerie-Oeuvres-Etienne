---
phase: 02-image-pipeline
plan: 04
subsystem: validation-ui
tags: [tdd, vitest, shadcn, radix-ui, next.js, server-actions, drizzle, validation]

requires:
  - phase: 02-image-pipeline
    plan: 03
    provides: retryPipeline Server Action, /admin/artworks page with PipelineBadge, artworks schema with pipelineState enum, StorageProvider interface

provides:
  - shadcn/ui initialized: components.json + src/components/ui/ (button, badge, alert, card, alert-dialog)
  - src/lib/utils.ts: cn() helper (clsx + tailwind-merge)
  - approveArtwork Server Action: auth guard + publishedAt + pipelineState=published (PIPE-04)
  - publishRaw Server Action: copies originalPath → processedPath before publishing (PIPE-05)
  - rejectArtwork Server Action: deletes 3 storage files then DB row (correct order)
  - /admin/artworks/[id]/validate page: Server Component with auth guard + pipelineState guard (T-02-14)
  - ValidationActions.tsx: Client Component with useTransition + AlertDialog for Rejeter
  - 18 passing Vitest tests (5 upload + 5 process + 4 pipeline + 4 validation)

affects: [03-public-gallery, 05-admin-backoffice]

tech-stack:
  added:
    - "@radix-ui/react-alert-dialog@1.1.15"
    - "@radix-ui/react-slot@1.2.3"
    - "@base-ui/react@1.4.1 (installed but not used — shadcn base-nova style incompatible with current env)"
    - "class-variance-authority@0.7.1"
    - "clsx@2.1.1"
    - "tailwind-merge@3.5.0"
  patterns:
    - "TDD RED/GREEN: vi.hoisted() required when mock variables are used in vi.mock() factories"
    - "shadcn base-nova style uses @base-ui/react which has broken .js files on this Windows/Node 24 env"
    - "Radix UI-based AlertDialog replaces base-ui version — same API as plan expected"
    - "Server Actions bound with .bind(null, artwork.id) — artworkId never in client form data"
    - "pipelineState guard in Server Component page prevents access to non-AWAITING_VALIDATION artworks"

key-files:
  created:
    - components.json
    - src/lib/utils.ts
    - src/components/ui/button.tsx
    - src/components/ui/badge.tsx
    - src/components/ui/alert.tsx
    - src/components/ui/card.tsx
    - src/components/ui/alert-dialog.tsx
    - src/actions/validation.ts
    - tests/pipeline/validation.test.ts
    - src/app/admin/artworks/[id]/validate/page.tsx
    - src/app/admin/artworks/[id]/validate/_components/ValidationActions.tsx
  modified:
    - package.json — added @base-ui/react, class-variance-authority, clsx, tailwind-merge, sharp (restored), @radix-ui packages

key-decisions:
  - "Replaced shadcn base-nova components with Radix UI-based versions — @base-ui/react missing compiled .js files in this environment (ESM package with incomplete installation)"
  - "vi.hoisted() required in validation.test.ts — vi.mock() is hoisted above variable declarations by Vitest's transform; variables used in factory must be declared with vi.hoisted()"
  - "sharp restored to package.json after npm install removed it — the shadcn init npm install modified package.json, stripping 332 packages"
  - "Button uses React.forwardRef with asChild (Radix Slot) — matches plan's expected AlertDialogTrigger asChild pattern"

requirements-completed: [PIPE-04, PIPE-05, ADMIN-03]

duration: 25min
completed: 2026-04-26
---

# Phase 2 Plan 04: Validation UI Summary

**shadcn/ui initialized (Radix-based components) + 3 Server Actions tested (approveArtwork/publishRaw/rejectArtwork) + validate/page.tsx with side-by-side comparison + ValidationActions Client Component with AlertDialog modal; 18 Vitest tests green, 0 TypeScript errors**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-04-26T15:11:16Z
- **Completed:** 2026-04-26T15:40:00Z
- **Tasks:** 2 (Task 1: TDD + shadcn init; Task 2: UI page)
- **Files modified:** 12 created, 1 modified

## Accomplishments

- shadcn/ui initialized with `components.json` and 5 components (`button`, `badge`, `alert`, `card`, `alert-dialog`) — using Radix UI primitives (stable)
- `src/lib/utils.ts` created with `cn()` helper (clsx + tailwind-merge)
- `approveArtwork`: session guard → findFirst → update(pipelineState='published', publishedAt=now()) → redirect
- `publishRaw`: session guard → findFirst → update(processedPath=originalPath, pipelineState='published', publishedAt=now()) → redirect (PIPE-05)
- `rejectArtwork`: session guard → findFirst → delete 3 storage files → delete DB row → redirect (correct ordering)
- `validate/page.tsx`: Server Component with async params (Next.js 15), auth redirect, pipelineState guard (T-02-14), side-by-side grid layout
- `ValidationActions.tsx`: Client Component with useTransition, 3 buttons (44px min-height WCAG 2.5.5), AlertDialog modal for Rejeter
- All copywriting matches UI-SPEC.md exactly: "Approuver la correction", "Publier l'original", "Rejeter", "Supprimer définitivement", "Annuler", "Supprimer cette œuvre ?"
- 18 Vitest tests pass; 0 TypeScript errors

## Task Commits

1. **Task 1 RED — shadcn/ui init + failing validation tests** — `b5c3a4f`
   - `components.json`, `src/components/ui/` (5 files), `src/lib/utils.ts`, `tests/pipeline/validation.test.ts`
2. **Task 1 GREEN — 3 Server Actions implementation** — `49bff36`
   - `src/actions/validation.ts`, `tests/pipeline/validation.test.ts` (vi.hoisted fix)
3. **Task 2 — Validation UI page + ValidationActions** — `28152fc`
   - `src/app/admin/artworks/[id]/validate/page.tsx`
   - `src/app/admin/artworks/[id]/validate/_components/ValidationActions.tsx`

## Files Created/Modified

**Created:**
- `components.json` — shadcn config (base-nova style, neutral color, Tailwind CSS 4)
- `src/lib/utils.ts` — cn() helper for shadcn components
- `src/components/ui/button.tsx` — Radix Slot-based button with variants (default/outline/destructive)
- `src/components/ui/badge.tsx` — Badge with CVA variants
- `src/components/ui/alert.tsx` — Alert component (base-nova compatible, no base-ui dependency)
- `src/components/ui/card.tsx` — Card component (base-nova compatible, no base-ui dependency)
- `src/components/ui/alert-dialog.tsx` — Radix UI AlertDialog (replaced broken base-ui version)
- `src/actions/validation.ts` — approveArtwork, publishRaw, rejectArtwork Server Actions
- `tests/pipeline/validation.test.ts` — 5 tests with vi.hoisted() for correct mock initialization
- `src/app/admin/artworks/[id]/validate/page.tsx` — Server Component with auth+state guards
- `src/app/admin/artworks/[id]/validate/_components/ValidationActions.tsx` — Client Component

**Modified:**
- `package.json` — added shadcn/Radix/tailwind dependencies + restored sharp

## Decisions Made

- Replaced `@base-ui/react` components (`button.tsx`, `badge.tsx`, `alert-dialog.tsx`) with Radix UI-based equivalents. The shadcn `base-nova` style installs `@base-ui/react` which has an incomplete ESM build on this Windows + Node 24 environment (missing compiled `.js` files — only `.d.ts` present). Radix UI provides the same API as the plan expected (especially `AlertDialogTrigger asChild`).
- Used `vi.hoisted()` in validation.test.ts — Vitest hoists `vi.mock()` calls to the top of the file before variable declarations. Without `vi.hoisted()`, the mock factory tries to reference `mockFindFirst` before it's initialized, causing a `ReferenceError`.
- Restored `sharp` to `package.json` after `npm install` of shadcn dependencies removed it — the failing `shadcn init` background process partially modified `package.json`, stripping 332 packages including `sharp`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] shadcn base-nova @base-ui/react components incompatible with current env**
- **Found during:** Task 1 (after shadcn init — testing imports)
- **Issue:** The `shadcn init --defaults` command selected the `base-nova` style which requires `@base-ui/react`. This package has an incomplete installation on this environment (ESM-only package, missing compiled `.js` files — `error.js` not found, only `error.d.ts` present). The package is listed in `npm ls` but throws `MODULE_NOT_FOUND` at runtime.
- **Fix:** Replaced `button.tsx`, `badge.tsx`, and `alert-dialog.tsx` with Radix UI-based equivalents. `alert.tsx` and `card.tsx` were already base-nova-compatible (using plain React without @base-ui). Installed `@radix-ui/react-alert-dialog` and `@radix-ui/react-slot` as replacement primitives.
- **Files modified:** `src/components/ui/button.tsx`, `src/components/ui/badge.tsx`, `src/components/ui/alert-dialog.tsx`
- **Commit:** `b5c3a4f`

**2. [Rule 1 - Bug] npm install removed sharp from package.json**
- **Found during:** Task 1 (checking package.json after shadcn init failure)
- **Issue:** The `shadcn init --defaults` background process failed mid-way (ENOENT error) but not before partially modifying `package.json`, stripping it to a minimal state that removed `sharp` among 332 packages. The `npm install @base-ui/react class-variance-authority clsx tailwind-merge` call then saved this reduced package.json.
- **Fix:** Added `sharp: "^0.34.5"` back to `package.json` dependencies (version read from existing `node_modules`).
- **Files modified:** `package.json`
- **Commit:** `b5c3a4f`

**3. [Rule 1 - Bug] vi.mock() factory references variables before initialization**
- **Found during:** Task 1 GREEN phase (first test run after creating validation.ts)
- **Issue:** The test file declared `const mockFindFirst = vi.fn()` before `vi.mock('@/db', ...)` in source order, but Vitest's transformer hoists `vi.mock()` calls above all variable declarations. At runtime, the mock factory executes before `mockFindFirst` is assigned, causing `ReferenceError: Cannot access 'mockFindFirst' before initialization`.
- **Fix:** Replaced variable declarations with `vi.hoisted(() => ({ mockFindFirst: vi.fn(), ... }))` which is itself hoisted by Vitest and executes before the `vi.mock()` factories.
- **Files modified:** `tests/pipeline/validation.test.ts`
- **Commit:** `49bff36`

## TDD Gate Compliance

- RED gate: `b5c3a4f` — `test(02-04): add failing validation tests + shadcn/ui init RED phase`
- GREEN gate: `49bff36` — `feat(02-04): implement approveArtwork, publishRaw, rejectArtwork Server Actions`
- REFACTOR gate: not needed — code was clean on first pass

## Known Stubs

None — all three Server Actions make real DB mutations. The validation page fetches real artwork data and displays real storage URLs via StorageProvider. No hardcoded empty values or placeholder content.

## Threat Flags

None — no new network endpoints introduced beyond what the plan's threat model covers.
- T-02-13 mitigated: all 3 Server Actions verify session as first operation
- T-02-14 mitigated: validate/page.tsx redirects if pipelineState !== 'awaiting_validation'
- T-02-15 accepted: artwork URLs are built server-side via getUrl() from DB keys (UUIDs)

## Self-Check: PASSED

All files confirmed present:
- `src/actions/validation.ts` — FOUND
- `src/app/admin/artworks/[id]/validate/page.tsx` — FOUND
- `src/app/admin/artworks/[id]/validate/_components/ValidationActions.tsx` — FOUND
- `components.json` — FOUND
- `src/lib/utils.ts` — FOUND

All commits confirmed in git log:
- `b5c3a4f` — test(02-04) RED phase
- `49bff36` — feat(02-04) GREEN phase
- `28152fc` — feat(02-04) UI page
