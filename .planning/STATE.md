---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: executing
stopped_at: "09-01 terminé — FilterDrawer + GalleryClient responsive (commits 3f0865a, 2832153). Prochaine étape : 09-02 (responsive pages /about, /mon-profil, admin)"
last_updated: "2026-06-08T00:00:00Z"
last_activity: 2026-06-08
progress:
  total_phases: 6
  completed_phases: 4
  total_plans: 21
  completed_plans: 19
  percent: 90
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-22)

**Core value:** Une vitrine centralisée où chaque œuvre est mise en valeur et peut trouver preneur — remplacement définitif du "chercher dans ses photos de téléphone".
**Current focus:** Phase 5 — Admin Back-office

## Current Position

Phase: 9 of 9 (Responsive Pages Restantes)
Plan: 2 of 2 in wave 1 (09-01 terminé)
Status: Executing — 09-01 completed
Last activity: 2026-06-08

Progress: [█████████░] 86%

## Performance Metrics

**Velocity:**

- Total plans completed: 14
- Average duration: ~10 min
- Total execution time: ~2 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1. Foundation | 4 | ~40 min | ~10 min |
| 2. Image Pipeline | 4 | ~42 min | 10.5 min |
| 3. Public Gallery | 4 | ~40 min | ~10 min |

**Recent Trend:**

- Last 5 plans: ~10 min
- Trend: stable

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
- 02-02: processImage() separated from Server Action for testability (no Next.js/DB/Storage) and reuse by Retry action (D-09)
- 02-02: rotate() must be first in Sharp chain — normalise() analyses pixels; rotating after gives wrong exposure correction
- 02-02: normalise({ lower: 1, upper: 99 }) per-channel implicitly performs white balance by normalising R/G/B independently
- 02-03: retryPipeline generates fresh UUID for processed/thumbnail keys on each retry — avoids CDN/HTTP cache on stale images
- 02-03: PipelineBadge uses inline styles — spec-exact colors cannot be guaranteed via Tailwind utility cascade
- 02-04: vi.hoisted() required when vi.mock() factory references variables declared in the same file — Vitest hoists vi.mock() above all declarations
- 02-04: shadcn base-nova style @base-ui/react has incomplete ESM build on Windows/Node 24 — replaced with Radix UI-based equivalents (same API)
- 03-01: parseDimension() casts Drizzle numeric string → number for aspect-ratio calculation
- 03-01: ArtworkCard uses inline style for aspectRatio (not Tailwind) — computed from real DB dimensions
- 03-02: FilterBar uses router.replace with scroll:false — no page reload, URL updated, browser history not polluted
- 03-03: generateMetadata queries DB with pipelineState=published guard — unpublished artworks return notFound()
- 03-04: "Faire une offre" button is disabled with cursor:not-allowed — intentional Phase 3 stub, wired in Phase 4
- 04-01: iron-session cookie 'pof_visitor_session' separate from Better Auth cookie — no conflict on same domain
- 04-01: Session stores only visitorId + displayName, never phone number (T-04-01-06 mitigation)
- 04-01: VisitorProfileModal wiring deferred to 04-03 (Wave 2) to avoid wave-1 merge conflict on artworks/[id]/page.tsx
- 04-01: vi.hoisted() required for mockSession in vi.mock() factory — same pattern as 02-04
- 04-02: PriceBreakdownData as lightweight type separate from Artwork — avoids strong coupling in ArtworkInfoPanel tests
- 04-02: smallint for priceTechnicality/priceAttachment (scores 1-5) — 2 bytes vs 4 for integer
- 04-02: @vitest-environment jsdom per-file directive (vitest v4) instead of environmentMatchGlobs (invalid API)
- 05-01: useActionState pour updateArtworkStatus (retour état visible), startTransition pour deleteArtwork (redirect — incompatible useActionState)
- 05-01: mockArtistSession casté as any dans les tests — Better Auth Session type est complexe ({ session, user }), le cast évite les erreurs TypeScript sur les mocks
- 05-01: D-03 appliqué rétrospectivement aux pages modifiées — tous les borderRadius non-zero corrigés à 0
- 05-02: Numeric Drizzle → .toString() obligatoire pour 7 colonnes (widthCm, heightCm, basePrice, priceHoursSpent, priceFormat, priceFraming, priceMaterials) ; smallint sans toString
- 05-02: (db as any).set dans les tests de chaîne fluente Drizzle — TypeScript ne voit pas .set() sur le type DB directement
- 05-02: (artwork.createdDate ? ... : null) ?? null pour éliminer undefined du type TypeScript ternaire
- 05-02: Promise.all pour artwork + artworkTypes + mediums en parallèle dans la page détail admin
- 05-03: Tests d'isolation PII via readFileSync — vérifie statiquement que visitorPhone/visitorEmail sont absents de la page publique sans serveur Next.js
- 05-03: Promise.all étendu de 3 à 4 branches pour inclure la query offers JOIN visitors en parallèle
- 09-01: FilterDrawer séparé de GalleryClient — pattern HamburgerMenu (état ouvert/fermé isolé du filtrage URL)
- 09-01: Bottom sheet (slideInFromBottom) choisi plutôt que panneau latéral — plus naturel mobile portrait galerie
- 09-01: CSS @media .filterbar-desktop/.filterbar-mobile dans GalleryClient — D-14 cohérent avec SiteNav, MasonryGrid

### Pending Todos

Phase 5 — en cours d'exécution :

- 05-01 : DONE — Badges statut + StatusChangeForm + DeleteArtworkButton (commits 95b7178, 2f2ce3b)
- 05-02 : DONE — updateArtwork + ArtworkEditForm 15 champs (commits 8ef2f34, 294785b)
- 05-03 : DONE — Section "Offres reçues" dans /admin/artworks/[id] (commits 9582550, 3433739)
- 05-04 : /mon-profil visiteur + table saved_artworks + SaveButton + db:push
- 05-05 : SiteNav async + ModalTrigger (Suspense) + indicateur connexion visiteur

Phase 3 human-verification items (toujours en attente — navigateur requis) :

- Masonry grid responsive layout (visual browser test)
- Artwork card hover overlay (visual browser test)
- Infinite scroll IntersectionObserver (live behavior test)
- Filter toggle + URL persistence (live behavior test)
- Open Graph tags on detail page (curl or browser source test)
- BackgroundDecor SVG pointer-events (visual browser test)

### Blockers/Concerns

- Phase 4: Offer history display format (anonymization of visitor names) needs artist preference before building UI
- Phase 3 human verification: 6 visual/behavioral tests require a running browser — see 03-VERIFICATION.md

## Roadmap Evolution

- Phase 8 added: Responsive Mobile/Tablette — adapter l'ensemble du site pour une consultation optimale sur mobile et tablette (2026-06-07)

## Deferred Items

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| v2 | Like system on artworks | Deferred | Init |
| v2 | Social sharing / Open Graph share button | Deferred | Init |
| v2 | SMS OTP verification for visitor accounts | Deferred | Init |
| v2 | In-situ artwork photos | Deferred | Init |
| v2 | Series grouping | Deferred | Init |

## Session Continuity

Last session: 2026-06-08
Stopped at: Completed 09-01-PLAN.md — FilterDrawer + GalleryClient responsive (2 commits: 3f0865a, 2832153). 10 tests TDD passent, TypeScript 0 erreur sur les fichiers modifiés. Prochaine étape : 09-02 (responsive /about, /mon-profil, admin pages).
Resume file: None
