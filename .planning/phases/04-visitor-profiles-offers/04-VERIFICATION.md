---
phase: 04-visitor-profiles-offers
verified: 2026-05-10T21:54:00Z
status: human_needed
score: 5/5 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Open an artwork detail page in a browser without a session cookie. Verify the page loads with offer count and best offer summary visible, and no login wall is shown."
    expected: "Gallery page and artwork detail pages render fully without any authentication prompt."
    why_human: "AUTH-01 public access requires a real browser request — no middleware blocks the route in code, but visual confirmation is needed."
  - test: "On an available artwork (with a basePrice set), type a montant below the base price in the OfferForm and observe before submitting."
    expected: "A visible orange-bordered warning block appears in real time stating the offer is below the base price, and the submit button remains enabled."
    why_human: "The live warning is a client-side UX behavior (useState comparison) that cannot be verified by static code analysis alone."
  - test: "Submit a valid offer on an available artwork as an identified visitor. Check the artist inbox (etienne.le.pironnec1@gmail.com) within 30 seconds."
    expected: "An email arrives from onboarding@resend.dev with the artwork title, visitor name, phone number, offer amount, and (optionally) message."
    why_human: "Requires RESEND_API_KEY configured in .env.local and a real network call — cannot be verified statically."
---

# Phase 4: Visitor Profiles & Offers Verification Report

**Phase Goal:** A visitor can create a lightweight profile with a phone number to submit purchase offers, and the artist receives an email notification for each new offer.
**Verified:** 2026-05-10T21:54:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | The full gallery, all artwork detail pages, and offer history counts are accessible to any visitor with no account required | ✓ VERIFIED | `middleware.ts` covers only `/admin` and `/admin/:path*`. The artwork detail page (`src/app/artworks/[id]/page.tsx`) has no auth guard — comment on line 5 states "AUTH-01". |
| 2 | A visitor can create a profile by providing a pseudo or name + mandatory phone number (email optional), and can retrieve their account later by entering their phone number | ✓ VERIFIED | `createOrLoginVisitor` in `src/actions/visitor.ts`: Zod `z.e164()` validates phone; `SELECT … WHERE phone = phone` implements account retrieval (AUTH-03); `INSERT` on new visitor. `VisitorProfileModal.tsx` exposes all three fields with email optional. 7/7 unit tests green. |
| 3 | On an available artwork, a logged-in visitor can submit an offer with an amount and optional message; a visible warning appears if the amount is below the base price, but does not block submission | ✓ VERIFIED | `submitOffer` in `src/actions/offers.ts`: Guard checks `session.visitorId`, Zod validates amount ≥ 1, checks `artwork.status === 'available'`. `OfferForm.tsx` has `showLiveWarning` state computed from `parsedAmount < parsedBasePrice` wired to an orange-bordered block; submit button remains enabled regardless. 10/10 tests green. |
| 4 | The artwork detail page shows the base price with its full cost breakdown (time, format, framing, materials, skill level, artist attachment) | ✓ VERIFIED | `PriceBreakdown.tsx` renders all 6 factors (`priceHoursSpent`, `priceFormat`, `priceFraming`, `priceMaterials`, `priceTechnicality`, `priceAttachment`). Wired in `ArtworkInfoPanel` (section 5.5). Page queries all 6 columns via `findFirst` + `with`. Schema exports `PriceBreakdownData` type. 8/8 tests green. |
| 5 | Each artwork shows total offer count and the highest offer by default; a visitor can expand a full offer history list via an opt-in button; the artist receives an email within seconds of a new offer containing the amount and visitor contact details | ✓ VERIFIED | `OfferHistory.tsx`: always renders `{offerCount} offre(s) · Meilleure: X €` summary; `useState(false)` toggle reveals full list on opt-in click. `page.tsx` uses `Promise.all` with `count()` + `max()`. `email.ts` uses module-level Resend; `sendNewOfferEmail` called fire-and-forget from `submitOffer` with `artworkTitle`, `visitorName`, `visitorPhone`, `amount`. 12/12 tests green. |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/session.ts` | getVisitorSession() + VisitorSessionData + sessionOptions | ✓ VERIFIED | Exports `getVisitorSession`, `sessionOptions`, `VisitorSessionData`. Cookie: `pof_visitor_session`, httpOnly, sameSite=lax, maxAge=365d. Startup warning if VISITOR_SESSION_SECRET absent or < 32 chars. |
| `src/actions/visitor.ts` | createOrLoginVisitor Server Action | ✓ VERIFIED | `'use server'`, Zod `z.e164()`, SELECT+INSERT upsert, `session.save()` only here, `logoutVisitor()` exported. |
| `src/components/visitor/VisitorProfileModal.tsx` | Modal dialog visitor identification | ✓ VERIFIED | 406 lines, `'use client'`, `useActionState(createOrLoginVisitor, null)`, no border-radius, overlay+panel, per-field Zod errors, submit 44px. |
| `src/actions/offers.ts` | submitOffer Server Action | ✓ VERIFIED | 5 guards (session, Zod, status, rate-limit, belowFloor), `db.insert(offers)`, `revalidatePath`, fire-and-forget `sendNewOfferEmail`. |
| `src/components/artwork/OfferForm.tsx` | Offer form Client Component | ✓ VERIFIED | `'use client'`, `useActionState(submitOffer, null)`, real-time floor warning, D-03 compliant, success state. |
| `src/components/artwork/OfferSection.tsx` | Client Component isolating offer interactivity | ✓ VERIFIED | `'use client'`, conditional: unauthenticated visitor → modal button, identified visitor → OfferForm. D-03 compliant. |
| `src/components/artwork/OfferHistory.tsx` | Offer count + best offer summary + opt-in list | ✓ VERIFIED | `'use client'`, `return null` if offerCount=0, singulier/pluriel, toggle, phone never in OfferHistoryItem. |
| `src/lib/email.ts` | Resend client + sendNewOfferEmail | ✓ VERIFIED | Module-level `new Resend(...)`, `sendNewOfferEmail` exported, fire-and-forget safe (logs error, never throws). |
| `src/components/artwork/PriceBreakdown.tsx` | Price breakdown Server Component | ✓ VERIFIED | No `'use client'`, null guard, 6 rows conditionally rendered, D-03 compliant. |
| `src/db/schema.ts` | 6 price_* columns + PriceBreakdownData type | ✓ VERIFIED | `priceHoursSpent`, `priceFormat`, `priceFraming`, `priceMaterials`, `priceTechnicality` (smallint), `priceAttachment` (smallint) all present. `PriceBreakdownData` type exported. |
| `src/app/artworks/[id]/page.tsx` | Detail page with session + offer queries | ✓ VERIFIED | `getVisitorSession()` read, `Promise.all([COUNT/MAX, full list])`, phone excluded from SELECT, all props passed to `ArtworkInfoPanel`. |
| `src/components/artwork/ArtworkInfoPanel.tsx` | Panel with all Phase 4 props wired | ✓ VERIFIED | Imports `PriceBreakdown`, `OfferSection`, `OfferHistory`. Props: `visitorId`, `visitorName`, `priceBreakdown`, `artworkId`, `offerCount`, `bestOffer`, `allOffers`. Section 8 shows history+form. Remains Server Component. |
| `tests/visitor/profile.test.ts` | Unit tests createOrLoginVisitor | ✓ VERIFIED | 7 tests (AUTH-02, AUTH-03, E.164 validation, international numbers). All green. |
| `tests/offers/submit.test.ts` | Unit tests submitOffer | ✓ VERIFIED | 10 tests (session guard, rate limit, belowFloor, status guard, validation). All green. |
| `tests/offers/pricebreakdown.test.ts` | Unit tests PriceBreakdown | ✓ VERIFIED | 8 tests (null guard, partial data, scores). All green. |
| `tests/offers/history.test.ts` | Unit tests OfferHistory | ✓ VERIFIED | 12 tests (empty state, singular/plural, summary, opt-in toggle, phone absence). All green. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `VisitorProfileModal.tsx` | `src/actions/visitor.ts` | `useActionState(createOrLoginVisitor, null)` | ✓ WIRED | Line 63 of modal. |
| `src/app/artworks/[id]/page.tsx` | `src/lib/session.ts` | `await getVisitorSession()` | ✓ WIRED | Line 231 of page. |
| `src/actions/visitor.ts` | `src/db/schema.ts visitors` | `db.select().from(visitors).where(eq(visitors.phone, phone))` | ✓ WIRED | Lines 117-121 of visitor.ts. |
| `OfferForm.tsx` | `src/actions/offers.ts` | `useActionState(submitOffer, null)` | ✓ WIRED | Line 64 of OfferForm. |
| `src/actions/offers.ts` | `src/db/schema.ts offers` | `db.insert(offers).values({...})` | ✓ WIRED | Line 189 of offers.ts. |
| `src/actions/offers.ts` | `src/lib/session.ts` | `getVisitorSession() → session.visitorId` | ✓ WIRED | Lines 95-107 of offers.ts. |
| `ArtworkInfoPanel.tsx` | `OfferForm.tsx` via `OfferSection.tsx` | `import OfferSection + conditional render` | ✓ WIRED | Lines 25, 307-315 of panel. |
| `src/actions/offers.ts` | `src/lib/email.ts` | `sendNewOfferEmail(...).catch(...)` — fire-and-forget | ✓ WIRED | Lines 218-226 of offers.ts. |
| `src/app/artworks/[id]/page.tsx` | `src/db/schema.ts (offers + visitors join)` | `db.select().from(offers).leftJoin(visitors, ...)` | ✓ WIRED | Lines 188-201 of page. |
| `ArtworkInfoPanel.tsx` | `OfferHistory.tsx` | `import OfferHistory + <OfferHistory .../>` | ✓ WIRED | Lines 26, 300-304 of panel. |
| `ArtworkInfoPanel.tsx` | `PriceBreakdown.tsx` | `import PriceBreakdown + <PriceBreakdown data={priceBreakdown} />` | ✓ WIRED | Lines 24, 251-256 of panel. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|-------------------|--------|
| `OfferHistory.tsx` | `offerCount`, `bestOffer`, `allOffers` | `Promise.all([COUNT/MAX query, SELECT+JOIN query])` in `page.tsx` | DB queries via Drizzle | ✓ FLOWING |
| `OfferForm.tsx` | `artworkId`, `basePrice`, `visitorName` | Props from `OfferSection` → `ArtworkInfoPanel` → `page.tsx` (DB + session) | Real DB artwork + iron-session | ✓ FLOWING |
| `PriceBreakdown.tsx` | `data` (6 price_* columns) | `priceBreakdown` object built in `page.tsx` from `artwork.*` fields | DB via `findFirst` | ✓ FLOWING |
| `VisitorProfileModal.tsx` | Form state | `useActionState(createOrLoginVisitor, null)` | Server Action → DB + session | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| All 37 unit tests pass | `npx vitest run tests/visitor/ tests/offers/` | 4 files, 37 tests passed | ✓ PASS |
| Zero TypeScript errors | `npx tsc --noEmit` | No output (0 errors) | ✓ PASS |
| Phone absent from session module | `grep phone src/lib/session.ts` | Comments only, no data storage | ✓ PASS |
| Resend at module level | `grep "new Resend" src/lib/email.ts` | Line 29, outside any function | ✓ PASS |
| No border-radius in offer components | grep borderRadius/border-radius/rounded in artwork components | Comments only, zero CSS property assignments | ✓ PASS |
| Phone absent from OfferHistoryItem | grep phone OfferHistory.tsx | Comments documenting absence only | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|---------|
| AUTH-01 | 04-01 | Gallery, detail pages, offer history accessible without account | ✓ SATISFIED | `middleware.ts` limits protection to `/admin`. Page detail has no auth check. |
| AUTH-02 | 04-01 | Visitor creates profile: pseudo/name + mandatory phone + optional email | ✓ SATISFIED | `VisitorProfileModal.tsx` + `createOrLoginVisitor` with Zod z.e164() + email optional. |
| AUTH-03 | 04-01 | Visitor can retrieve account by phone number | ✓ SATISFIED | `createOrLoginVisitor` SELECTs existing visitor by phone before INSERT. 7 unit tests cover this path. |
| MARKET-01 | 04-02 | Artwork shows base price with 6-factor breakdown | ✓ SATISFIED | `PriceBreakdown.tsx` renders all 6 factors. Schema has 6 `price_*` columns. Wired in `ArtworkInfoPanel`. |
| MARKET-02 | 04-03 | Visitor submits offer; warning if below base price, not blocked | ✓ SATISFIED | `submitOffer` inserts offer regardless. `OfferForm` shows live warning but keeps submit enabled. Rate limit 3 offers enforced. |
| MARKET-03 | 04-04 | Artist receives email on each new offer (amount + visitor contact) | ✓ SATISFIED | `sendNewOfferEmail` called fire-and-forget from `submitOffer`. Email contains artworkTitle, visitorName, visitorPhone, amount. |
| MARKET-04 | 04-04 | Artwork shows offer count + best offer by default; full history via opt-in | ✓ SATISFIED | `OfferHistory.tsx` always shows summary; opt-in toggle reveals full list. `return null` if 0 offers. |

No orphaned requirements found. All 7 requirement IDs from PLAN frontmatter are accounted for and satisfied.

### Anti-Patterns Found

| File | Pattern | Severity | Assessment |
|------|---------|----------|------------|
| `ArtworkInfoPanel.tsx` lines 13-19 | Comment referencing "PLACEHOLDER OFFRES (Phase 3)" | ℹ️ Info | Stale comment — the placeholder was replaced by `OfferSection` in 04-03. Not a runtime issue. |
| `PriceBreakdown.tsx` | `return null` if no price data | ℹ️ Info | Correct guard, not a stub — data entry deferred intentionally to Phase 5 admin. |
| `OfferHistory.tsx` | `return null` if offerCount=0 | ℹ️ Info | Correct guard, not a stub — expected behavior when no offers exist. |

No blockers or warnings. All `return null` cases are conditional guards with documented intent, not stubs.

### Human Verification Required

#### 1. Public gallery access (AUTH-01)

**Test:** Open `http://localhost:3000` and `/artworks/[any-id]` in a browser with no cookies set (incognito).
**Expected:** Gallery grid renders and artwork detail page loads fully with offer count visible. No login redirect, no error.
**Why human:** The middleware code correctly limits protection to `/admin`, but confirming no hidden auth check exists in earlier Phase 3 code requires a live request in a real browser.

#### 2. Real-time below-floor warning

**Test:** On an artwork detail page with a `basePrice` set (e.g., 800 €), type "500" into the offer amount field before submitting.
**Expected:** An orange-bordered warning block appears immediately with text about the offer being below the base price. The submit button remains active and enabled.
**Why human:** The `showLiveWarning` logic is correct in code (uses `useState`), but the visual rendering and button state require a browser with JavaScript executing to confirm.

#### 3. Artist email notification (MARKET-03)

**Test:** Configure `RESEND_API_KEY` in `.env.local`, submit a valid offer as an identified visitor on an available artwork.
**Expected:** Within 30 seconds, an email arrives at `etienne.le.pironnec1@gmail.com` from `onboarding@resend.dev` containing: artwork title, visitor display name, visitor phone number, offer amount, and optional message.
**Why human:** Requires a real API key, live Resend network call, and external email inbox verification — none of which can be confirmed by static analysis.

### Gaps Summary

No gaps. All 5 success criteria are satisfied with substantive, wired, data-flowing implementations. Phase goal is achieved at the code level. Three human verification items remain to confirm runtime behavior that cannot be validated statically.

---

_Verified: 2026-05-10T21:54:00Z_
_Verifier: Claude (gsd-verifier)_
