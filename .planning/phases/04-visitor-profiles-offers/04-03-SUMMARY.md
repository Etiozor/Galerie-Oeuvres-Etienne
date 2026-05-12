---
phase: "04-visitor-profiles-offers"
plan: "03"
subsystem: "offer-submission"
tags: [server-action, zod-coerce, rate-limit, belowFloor, useActionState, server-client-composition]
dependency_graph:
  requires:
    - "04-01: getVisitorSession() — session helper iron-session"
    - "04-01: VisitorProfileModal — modal identification visiteur"
    - "04-02: ArtworkInfoPanel + basePrice prop"
    - "01-01: src/db/schema.ts offers table"
  provides:
    - "submitOffer Server Action — validation Zod + rate limit + INSERT offers"
    - "OfferForm Client Component — useActionState, soft floor warning, D-03"
    - "OfferSection Client Component — Server+Client composition pattern"
  affects:
    - "04-04: OfferSection câblée, submitOffer disponible — peut ajouter historique public"
    - "05-xx: admin verra les offres soumises via offers table"
tech_stack:
  added: []
  patterns:
    - "z.coerce.number() — Zod parse FormData strings vers number (artworkId, amount)"
    - "count() Drizzle — rate limit DB-only avant INSERT (bigint → Number() coercion)"
    - "OfferSection 'use client' importé dans Server Component ArtworkInfoPanel — composition pattern"
    - "belowFloor calculé côté serveur uniquement — jamais depuis le client (T-04-03-02)"
    - "useState pour avertissement live côté client (UX seulement, valeur authoritative = serveur)"
key_files:
  created:
    - path: "src/actions/offers.ts"
      role: "submitOffer Server Action — 5 gardes, rate limit COUNT, belowFloor serveur, revalidatePath"
    - path: "src/components/artwork/OfferForm.tsx"
      role: "Formulaire offre Client Component — useActionState, avertissement soft floor temps réel"
    - path: "src/components/artwork/OfferSection.tsx"
      role: "Client Component isolant l'interactivité offres — modal identification ou OfferForm"
  modified:
    - path: "src/components/artwork/ArtworkInfoPanel.tsx"
      role: "Remplacement placeholder par OfferSection + ajout prop artworkId"
    - path: "src/app/artworks/[id]/page.tsx"
      role: "Passage artworkId={artworkId} à ArtworkInfoPanel"
decisions:
  - "OfferSection Client Component séparé — ArtworkInfoPanel reste Server Component (composition Server+Client)"
  - "belowFloor calculé côté serveur uniquement — affichage live côté client est informatif/UX seulement (T-04-03-02)"
  - "z.coerce.number() pour artworkId et amount — FormData retourne toujours des strings"
  - "COUNT Drizzle retourne bigint comme string via driver pg — coercion Number() explicite nécessaire"
  - "Rate limit 3 offres par visiteur par œuvre via COUNT avant INSERT (MARKET-02)"
metrics:
  duration: "~25 minutes"
  completed_date: "2026-05-08"
  tasks_completed: 3
  tasks_total: 3
  files_created: 3
  files_modified: 2
  tests_added: 10
  tests_passing: 10
---

# Phase 04 Plan 03: Offer Submission Summary

submitOffer Server Action with Zod validation, rate limit (MARKET-02), server-side belowFloor — wired into OfferForm (Client) and OfferSection (Client) with Server+Client composition pattern in ArtworkInfoPanel.

## What Was Built

### Task 1 (TDD) — submitOffer Server Action

**RED commit:** `be2427f` — 10 tests written, failing (module absent)

**`tests/offers/submit.test.ts`** (pre-authored by planner)
- `vi.hoisted()` for `mockSession` (same pattern as 04-01 — Vitest hoisting requirement)
- Helpers: `mockArtworkFindFirst()`, `mockCountOffers()`, `mockInsertOffer()`
- 5 describe blocks covering all guards and business logic

**GREEN commit:** `d17880b` — 10/10 tests passing

**`src/actions/offers.ts`**
- `'use server'` directive
- `offerSchema`: `z.coerce.number().int().positive()` for artworkId, `z.coerce.number().positive().min(1)` for amount, `z.string().max(500).optional()` for message
- Guard 1: `session.visitorId` check before any DB query (T-04-03-04)
- Guard 2: `artwork.status === 'available'` check (T-04-03-05)
- Rate limit: `db.select({ total: count() }).from(offers).where(and(...))` — `Number(result[0]?.total ?? 0) >= 3` → reject (MARKET-02, T-04-03-03)
- belowFloor: `amount < parseFloat(artwork.basePrice)` — server-side only (T-04-03-02)
- `db.insert(offers).values({ artworkId, visitorId, amount: amount.toString(), message, belowFloor })`
- `revalidatePath(\`/artworks/${artworkId}\`)` after successful INSERT
- Returns `{ success: true, belowFloor }` or `{ success: false, errors: Record<string, string[]> }`

### Task 2 — OfferForm Client Component

**Commit:** `4ed2eac`

**`src/components/artwork/OfferForm.tsx`**
- `'use client'` directive
- `useActionState(submitOffer, null)` — React 19 pattern
- `useState(amountValue)` for real-time below-floor warning (UX only — authoritative value from server)
- Props: `artworkId: number`, `basePrice: string | null`, `visitorName: string`
- Live warning: `parsedAmount < parsedBasePrice` → orange border block (D-03)
- Submit button: height 44px, `var(--color-orange)`, Oswald uppercase, `disabled={isPending}`, D-03
- Success state: confirmation message + `state.belowFloor` note
- Field errors: `state.errors.amount`, `state.errors.message` per field; `state.errors._form` global
- D-03: zero `borderRadius`/`border-radius`/`rounded` in any CSS property

### Task 3 — OfferSection + ArtworkInfoPanel wiring

**Commit:** `de0c3d3`

**`src/components/artwork/OfferSection.tsx`**
- `'use client'` directive
- `useState(false)` for `isModalOpen`
- Props: `{ visitorId?, visitorName?, artworkId, basePrice, status }`
- `status !== 'available'` → return null
- `!visitorId` → teal info block + "Créer mon profil / S'identifier" button → `VisitorProfileModal`
- `visitorId` defined → `<OfferForm artworkId={artworkId} basePrice={basePrice} visitorName={visitorName ?? 'Visiteur'} />`
- D-03: zero border-radius

**`src/components/artwork/ArtworkInfoPanel.tsx`**
- Import `OfferSection` added
- New prop `artworkId: number` added to `ArtworkInfoPanelProps`
- Placeholder offer section (disabled button + static text) replaced by:
  ```tsx
  {status === 'available' && (
    <>
      <Separator />
      <OfferSection visitorId={visitorId} visitorName={visitorName} artworkId={artworkId} basePrice={basePrice} status={status} />
    </>
  )}
  ```
- ArtworkInfoPanel remains a Server Component (no `'use client'`)

**`src/app/artworks/[id]/page.tsx`**
- `artworkId={artworkId}` added to `<ArtworkInfoPanel>` props

## TDD Gate Compliance

- RED gate: commit `be2427f` — `test(04-03): add failing tests for submitOffer Server Action (TDD RED)` (10 tests, 0 passing — module absent)
- GREEN gate: commit `d17880b` — `feat(04-03): implement submitOffer Server Action (TDD GREEN)` (10/10 passing)
- REFACTOR: not needed — clean first-pass implementation

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None. The offer form is fully functional:
- Identified visitor → OfferForm wired to submitOffer
- Non-identified visitor → VisitorProfileModal opens on button click
- All server guards (session, status, rate limit, belowFloor) are active

## Threat Surface

All mitigations from the threat model implemented:
- T-04-03-01: Zod `coerce.number().positive()` validates amount server-side
- T-04-03-02: belowFloor computed from DB in submitOffer — client preview is UX-only
- T-04-03-03: COUNT Drizzle rate limit ≥ 3 → reject before INSERT
- T-04-03-04: Guard 1 — `session.visitorId` check before any processing
- T-04-03-05: Guard 2 — `artwork.status === 'available'` check from DB
- T-04-03-06: Race condition accepted (low-traffic personal site)
- T-04-03-07: message stored as plain text, React auto-escapes on render

## Self-Check: PASSED

- `src/actions/offers.ts` — FOUND
- `src/components/artwork/OfferForm.tsx` — FOUND
- `src/components/artwork/OfferSection.tsx` — FOUND
- `src/components/artwork/ArtworkInfoPanel.tsx` (artworkId prop + OfferSection) — FOUND
- `src/app/artworks/[id]/page.tsx` (artworkId passed) — FOUND
- Commits be2427f, d17880b, 4ed2eac, de0c3d3 — FOUND
- `npx vitest run tests/offers/submit.test.ts` → 10/10 passing
- `npx tsc --noEmit` → 0 errors
- `grep belowFloor src/components/artwork/OfferSection.tsx` → empty (no calculation client-side)
- `grep borderRadius|border-radius|rounded OfferForm.tsx OfferSection.tsx` → comments only (D-03 compliant)
