---
phase: 09-responsive-pages-restantes
reviewed: 2026-06-08T10:00:00Z
depth: standard
files_reviewed: 7
files_reviewed_list:
  - src/components/gallery/FilterDrawer.tsx
  - src/components/gallery/FilterDrawer.test.tsx
  - src/components/gallery/GalleryClient.tsx
  - src/app/about/page.tsx
  - src/app/mon-profil/page.tsx
  - src/app/globals.css
  - src/app/admin/artworks/[id]/page.tsx
findings:
  critical: 0
  warning: 3
  info: 3
  total: 6
status: issues_found
---

# Phase 09: Code Review Report

**Reviewed:** 2026-06-08T10:00:00Z
**Depth:** standard
**Files Reviewed:** 7
**Status:** issues_found

## Summary

Phase 09 introduces `FilterDrawer` (bottom sheet mobile), its TDD test suite, responsive CSS additions to `GalleryClient`, `/about`, `/mon-profil`, `globals.css`, and `admin/artworks/[id]/page.tsx`. The overall structure is sound and follows established patterns (inline `<style>` + `@media`, `useEffect` cleanup, project conventions from CLAUDE.md). No security or critical correctness issues were found.

Three warnings are raised: a padding conflict in the bottom sheet that causes content to be clipped on iPhone, a missing `aria-modal` attribute that breaks screen-reader isolation, and a potential XSS vector from `storage.getUrl()` output rendered in an `<img src>` without sanitisation (low severity for an authenticated-only page but still worth noting). Three info items cover dead code, a missing test case, and a magic number.

## Warnings

### WR-01: Bottom sheet `paddingBottom` overrides safe-area padding — content clipped on iPhone

**File:** `src/components/gallery/FilterDrawer.tsx:183`

**Issue:** The `padding` shorthand on line 182 sets all four sides, then line 183 overrides only `paddingBottom` with the `env()` expression. However on the same element the shorthand already set `paddingBottom: '16px'` (the `padding: '16px 24px'` resolves top/bottom to 16 px). The intent is for `paddingBottom` to equal `env(safe-area-inset-bottom, 16px)` which is correct. The real bug is that when the `env()` evaluates to 0 on non-notched devices the bottom padding becomes 0, so the last filter chip sits flush against the edge. The fallback `16px` in `env(safe-area-inset-bottom, 16px)` is supposed to fix this but the browser uses the env value (0) not the fallback when the variable is supported but zero-valued.

**Fix:** Replace the two separate `padding` / `paddingBottom` properties with a single expression that adds a minimum bottom padding unconditionally:

```tsx
style={{
  // …other props…
  padding: '16px 24px',
  paddingBottom: 'max(16px, env(safe-area-inset-bottom, 16px))',
}}
```

`max()` ensures the bottom padding is never below 16 px regardless of whether the safe-area env var resolves to 0 or a larger value.

---

### WR-02: `role="dialog"` is missing `aria-modal="true"` — screen readers browse behind the overlay

**File:** `src/components/gallery/FilterDrawer.tsx:171`

**Issue:** The bottom sheet `div` has `role="dialog"` and `aria-label` but no `aria-modal="true"`. Without `aria-modal`, screen readers (especially VoiceOver / NVDA) continue to expose content behind the overlay to virtual cursor navigation, making it possible to interact with gallery cards while the sheet is open. `aria-modal="true"` signals to AT that only the dialog content should be accessible.

**Fix:**
```tsx
<div
  role="dialog"
  aria-label="Filtres de la galerie"
  aria-modal="true"
  className="filter-drawer-sheet"
  // …
>
```

---

### WR-03: `storage.getUrl()` result used as `<img src>` without validation — potential open redirect / mixed-content on misconfigured storage

**File:** `src/app/mon-profil/page.tsx:295`

**Issue:** `storage.getUrl(artwork.originalPath)` is rendered directly into `<img src={…}>`. The `getUrl` method is trusted infrastructure, but the `originalPath` value comes from the database, originally written by the upload flow. If the storage provider is misconfigured or if a future admin action writes a crafted path (e.g., `//evil.com/img.jpg`), the URL would be rendered as-is. This is a low-likelihood but zero-cost-to-fix path-injection vector.

The same pattern exists in `admin/artworks/[id]/page.tsx:283` (`imageUrl` from `storage.getUrl`) but that page is admin-only.

**Fix:** Validate that the resolved URL starts with the expected origin before rendering, or at minimum add `referrerPolicy="no-referrer"` and confirm `StorageProvider.getUrl()` always returns an absolute URL from a known domain. A lightweight guard in `StorageProvider`:
```ts
// In local provider + R2 provider getUrl():
if (!path || path.startsWith('http://') || path.startsWith('//')) {
  throw new Error(`Invalid storage key: ${path}`)
}
```

---

## Info

### IN-01: `next/link` mock in `FilterDrawer.test.tsx` is unused dead code

**File:** `src/components/gallery/FilterDrawer.test.tsx:16-19`

**Issue:** `FilterDrawer` does not import or use `next/link` at all, yet the test file mocks it. This mock is harmless but misleading — it implies the component renders links, which it does not.

**Fix:** Remove lines 16-19:
```ts
// Remove this block — FilterDrawer has no Link dependency
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) =>
    <a href={href}>{children}</a>,
}))
```

---

### IN-02: No test for `handleChipClick` toggle behaviour (active filter → 'all')

**File:** `src/components/gallery/FilterDrawer.test.tsx`

**Issue:** The test suite verifies open/close mechanics and badge rendering thoroughly, but does not cover the toggle behaviour in `handleChipClick`: clicking an already-active filter should call `onFilterChange('all')` rather than re-setting the same filter. This is the only non-trivial logic in the component and is currently untested.

**Fix:** Add a test case:
```ts
it("toggle — cliquer sur le filtre actif rappelle onFilterChange('all')", () => {
  const onFilterChange = vi.fn()
  render(<FilterDrawer {...baseProps} activeFilter="type:1" onFilterChange={onFilterChange} />)
  fireEvent.click(screen.getByRole('button', { name: /ouvrir les filtres/i }))
  fireEvent.click(screen.getByRole('button', { name: /dessin/i }))
  expect(onFilterChange).toHaveBeenCalledWith('all')
})
```

---

### IN-03: Magic number `56` for sticky `top` offset in `GalleryClient` duplicated across files

**File:** `src/components/gallery/GalleryClient.tsx:196`

**Issue:** The sticky filter bar uses `top: 56` (the SiteNav height). The same value `56px` appears in `globals.css` (`.pof-gallery .site-nav { height: 56px }`) and `admin/artworks/[id]/page.tsx` (sticky panel). There is no shared constant — if the nav height changes, all occurrences need manual updates.

**Fix:** Expose the value as a CSS custom property in `globals.css` and reference it everywhere:
```css
:root {
  --nav-height: 56px;
}
```
Then in JS/TSX: `top: 'var(--nav-height)'` (valid as a CSS string value in React style props), and in CSS: `top: var(--nav-height)`.

---

_Reviewed: 2026-06-08T10:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
