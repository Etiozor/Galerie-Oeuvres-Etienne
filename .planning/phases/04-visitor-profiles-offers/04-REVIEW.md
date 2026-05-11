---
phase: 04-visitor-profiles-offers
reviewed: 2026-05-10T00:00:00Z
depth: standard
files_reviewed: 17
files_reviewed_list:
  - src/lib/session.ts
  - src/lib/email.ts
  - src/actions/visitor.ts
  - src/actions/offers.ts
  - src/components/visitor/VisitorProfileModal.tsx
  - src/components/artwork/OfferForm.tsx
  - src/components/artwork/OfferHistory.tsx
  - src/components/artwork/OfferSection.tsx
  - src/components/artwork/PriceBreakdown.tsx
  - src/components/artwork/ArtworkInfoPanel.tsx
  - src/app/artworks/[id]/page.tsx
  - src/db/schema.ts
  - middleware.ts
  - tests/visitor/profile.test.ts
  - tests/offers/pricebreakdown.test.ts
  - tests/offers/submit.test.ts
  - tests/offers/history.test.ts
findings:
  critical: 2
  warning: 4
  info: 3
  total: 9
status: issues_found
---

# Phase 04: Code Review Report

**Reviewed:** 2026-05-10
**Depth:** standard
**Files Reviewed:** 17
**Status:** issues_found

## Summary

This phase implements visitor profiles (pseudo + phone, no password), offer submission with a soft price floor, and an opt-in offer history. The security architecture is sound: phone numbers stay server-side only, iron-session stores only `visitorId` and `displayName`, and `belowFloor` is computed server-side. The data flow from page.tsx through ArtworkInfoPanel to the client components is well-structured.

Two critical issues were found: a weak fallback secret in `session.ts` that could allow session forgery in production if the env var is misconfigured, and a missing `aria-describedby` / `role` linkage that is less critical but worth noting. The more significant findings are four warnings: a TOCTOU race condition in the offer submission flow, a silent data loss when a visitor's `displayName` is null, a missing `revalidatePath` after visitor creation (causing stale session UI), and an unsafe `!` non-null assertion in the page component.

---

## Critical Issues

### CR-01: Hardcoded fallback session secret enables session forgery if env var is missing

**File:** `src/lib/session.ts:89`

**Issue:** When `VISITOR_SESSION_SECRET` is absent, `iron-session` is initialized with the literal string `'fallback-invalide-remplacez-moi-en-production-32chars'`. This string is checked into version control. Anyone who can read the source code can forge valid `pof_visitor_session` cookies, impersonating any `visitorId` and bypassing the session guard in `submitOffer`. The `console.warn` on lines 57-61 fires only at module load time during startup — it is easily missed in log noise, and the application continues to accept sessions "protected" by this public key.

**Fix:** Fail hard rather than falling back to a known-public secret. If the secret is absent, refuse to handle requests involving sessions:

```typescript
// session.ts — replace the fallback with a hard failure
const secret = process.env.VISITOR_SESSION_SECRET

if (!secret && process.env.NODE_ENV !== 'test') {
  throw new Error(
    '[session.ts] VISITOR_SESSION_SECRET est absent. ' +
    'Générer avec : openssl rand -base64 32 et ajouter au .env.local.'
  )
}

export const sessionOptions: SessionOptions = {
  // En test, la clé fictive n'est jamais utilisée (iron-session est mocké)
  password: secret ?? 'test-only-key-never-used-outside-test-env-32chars',
  // ...
}
```

If a graceful degradation is required (e.g., not crashing during Next.js static build), wrap the throw so it only fires during actual request handling rather than at module import time.

---

### CR-02: Middleware authentication relies on cookie presence alone, not signature verification

**File:** `middleware.ts:29`

**Issue:** The admin middleware checks `!!request.cookies.get('better-auth.session_token')?.value` — i.e., whether the cookie *exists* and is non-empty — but does not verify the signature or validity of the token value. In the Edge Runtime this is an acceptable trade-off (Node.js `pg`/`kysely` cannot run there), and the comment on lines 22-27 correctly documents this. However, the comment says "la vérification complète se fait dans chaque Server Component protégé" — if any `/admin` Server Component page ever fails to call `auth.api.getSession()`, an attacker who crafts a cookie with any non-empty value gains UI access to the admin shell.

This is partially a documentation/convention issue, but the risk is real enough to call out as critical because there is currently no compile-time or lint enforcement preventing an admin page from skipping the second check.

**Fix:** Add a runtime guard at the top of every `/admin` Server Component layout (e.g., `src/app/admin/layout.tsx`) that unconditionally calls `auth.api.getSession()` and redirects on failure. This makes the middleware a speed-of-light first filter and the layout the authoritative gate:

```typescript
// src/app/admin/layout.tsx (Server Component)
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/admin/login')
  return <>{children}</>
}
```

---

## Warnings

### WR-01: TOCTOU race condition — artwork status checked before INSERT, not inside a transaction

**File:** `src/actions/offers.ts:134-197`

**Issue:** Between the artwork status check (step c, line 141) and the offer INSERT (step f, line 189) there are two additional async DB round-trips (the COUNT at step d and the visitor lookup at step g.1). If the artwork's status changes from `available` to `sold` between these two points — for example, the artist marks it sold in the admin panel while a visitor is submitting an offer — the offer will be inserted for a non-available artwork. The `belowFloor` flag is also based on `basePrice` read at step c; if the price changes between step c and step f the stored `belowFloor` value will be wrong.

**Fix:** Wrap the CHECK + INSERT in a single serializable transaction, or at minimum re-check the status immediately before the INSERT:

```typescript
// Option simple : re-vérifier le statut juste avant l'INSERT
const artworkAtInsert = await db.query.artworks.findFirst({
  where: eq(artworks.id, artworkId),
  columns: { status: true },
})
if (!artworkAtInsert || artworkAtInsert.status !== 'available') {
  return {
    success: false,
    errors: { _form: ["Cette œuvre n'est plus disponible à l'achat."] },
  }
}
await db.insert(offers).values({ ... })
```

For higher concurrency, use a `BEGIN; ... COMMIT;` transaction with Drizzle's `db.transaction()`.

---

### WR-02: Silent data loss — offers with null `visitorName` are silently dropped from history

**File:** `src/app/artworks/[id]/page.tsx:211-219`

**Issue:** The LEFT JOIN on line 199 means `visitorName` can be `null` if a visitor row was deleted after the offer was inserted (the `onDelete: 'cascade'` on `offers.visitorId` would normally prevent this, but manual DB interventions could create orphaned states). The `.filter((o) => o.visitorName !== null)` on line 211 silently discards those offers from the history, making `offerCount` (from the COUNT aggregate) disagree with `allOffers.length`. The UI would show "3 offres · Meilleure : 850 €" but only render 2 items in the expanded list — confusing the visitor.

**Fix:** Either use a placeholder name for deleted visitors, or make the count consistent with the filtered list:

```typescript
// Option A : conserver l'offre avec un nom de substitution
const allOffers: OfferHistoryItem[] = allOffersRaw.map((o) => ({
  id: o.id,
  amount: o.amount,
  message: o.message,
  visitorName: o.visitorName ?? 'Visiteur supprimé',
  createdAt: o.createdAt,
}))

// Option B : dériver offerCount depuis la liste filtrée pour la cohérence UI
const offerCount = allOffers.length // au lieu du COUNT agrégat
```

---

### WR-03: After `createOrLoginVisitor` succeeds, the visitor's session is not reflected in the page until a hard reload

**File:** `src/components/artwork/OfferSection.tsx:164-167`

**Issue:** `VisitorProfileModal` is rendered with `onClose={() => setIsModalOpen(false)}` but no `onSuccess` prop. The comment on line 163 says "la page se revalidera automatiquement via `revalidatePath` dans `createOrLoginVisitor`". However, `createOrLoginVisitor` does **not** call `revalidatePath` — only `submitOffer` does. The iron-session cookie is set, but Next.js does not automatically re-render the Server Component that reads the session. The visitor must perform a full page reload to see the `OfferForm` instead of the "S'identifier" invitation. This is a functional bug: clicking "S'identifier", successfully submitting, closing the modal, and then trying to submit an offer will re-open the modal instead of showing the form.

**Fix:** Add a `revalidatePath` call at the end of `createOrLoginVisitor`, or use `router.refresh()` in the `onSuccess` callback:

```typescript
// Option A — dans createOrLoginVisitor (src/actions/visitor.ts, après session.save())
import { revalidatePath } from 'next/cache'
// ...
await session.save()
revalidatePath('/', 'layout') // Invalide le layout complet pour rafraîchir la session côté serveur
return { success: true }
```

```typescript
// Option B — dans OfferSection.tsx (côté client)
import { useRouter } from 'next/navigation'
const router = useRouter()
// ...
<VisitorProfileModal
  isOpen={isModalOpen}
  onClose={() => setIsModalOpen(false)}
  onSuccess={() => {
    setIsModalOpen(false)
    router.refresh() // Re-fetch les Server Components avec la nouvelle session
  }}
/>
```

Option B is preferred as it is more targeted and avoids invalidating the entire cache.

---

### WR-04: Unsafe non-null assertion on `allOffersRaw` result

**File:** `src/app/artworks/[id]/page.tsx:217`

**Issue:** The non-null assertion `o.visitorName!` on line 217 is used after the `.filter((o) => o.visitorName !== null)` on line 211. TypeScript cannot narrow the type through a chained `.filter()` without a type predicate, so TypeScript still infers `visitorName` as `string | null` inside `.map()`, and the `!` suppresses that safely only if the filter is correct. However, if the filter predicate is ever changed or the chain is refactored, this assertion will become a silent lie. Using a proper type predicate is safer and more explicit.

**Fix:**

```typescript
const allOffers: OfferHistoryItem[] = allOffersRaw
  .filter((o): o is typeof o & { visitorName: string } => o.visitorName !== null)
  .map((o) => ({
    id: o.id,
    amount: o.amount,
    message: o.message,
    visitorName: o.visitorName, // string — TypeScript le sait grâce au type predicate
    createdAt: o.createdAt,
  }))
```

---

## Info

### IN-01: `z.e164()` is a Zod v4 API — verify it is available in the installed version

**File:** `src/actions/visitor.ts:44`

**Issue:** `z.e164()` is used for phone validation. This method is available in Zod v4+. If the project is on Zod v3 (which remains common in Next.js 15 projects as of the knowledge cutoff), this will fail at runtime with `TypeError: z.e164 is not a function`. The comment on line 30 attributes this to "Zod v4" but there is no lock-file verification here.

**Fix:** Confirm the installed Zod version:
```bash
npm ls zod
```
If on Zod v3, replace with an explicit regex:
```typescript
phone: z
  .string()
  .regex(/^\+[1-9]\d{1,14}$/, 'Téléphone invalide — inclure l\'indicatif pays, ex: +33612345678'),
```

---

### IN-02: `srcSet` in page.tsx repeats the same URL three times — non-functional responsive images

**File:** `src/app/artworks/[id]/page.tsx:143-145`

**Issue:** The `srcset` is constructed as `${processedUrl} 640w, ${processedUrl} 1024w, ${processedUrl} 1440w` — three identical URLs with different width hints. The browser will always receive and render the same file regardless of viewport width, and the `sizes` attribute is misleading. This is acknowledged in the code comment ("En Phase 3, même URL pour toutes les tailles"), but it should be cleaned up or removed to avoid confusion, not left as dead markup that does nothing.

**Fix:** Until the three image variants are generated (Phase 6), omit `srcSet` entirely or set it to a single entry:
```typescript
const srcset = processedUrl ? `${processedUrl} 1440w` : undefined
// Or simply: const srcset = undefined
```

---

### IN-03: `PriceBreakdown` uses `data!` non-null assertion after a guard that already narrows the type

**File:** `src/components/artwork/PriceBreakdown.tsx:91-92`

**Issue:** After `if (!hasData) return null`, the code assigns `const d = data!` to "help TypeScript". But `hasData` is defined as `data && Object.values(data).some(...)` — TypeScript already knows `data` is non-null after the guard because the guard returns early. The `!` is unnecessary and adds noise. More importantly, `hasData` checks that *some value* is non-null, but `data` itself could theoretically be an empty object `{}` (where `Object.values` returns `[]` and `some()` returns `false`) — the guard already handles that. The `!` assertion is a code smell that suggests the author was uncertain about the narrowing.

**Fix:** Remove the assertion and use `data` directly, or extract the narrowing explicitly:
```typescript
if (!data || !Object.values(data).some(v => v !== null)) return null
// À ce stade, TypeScript sait que data est non-null — pas besoin de !
const d = data
```

---

_Reviewed: 2026-05-10_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
