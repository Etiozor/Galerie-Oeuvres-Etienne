# Domain Pitfalls: Art Portfolio / Gallery / Marketplace

**Domain:** Personal art gallery with image pipeline, likes, bid system, and admin back-office
**Project:** Galerie POF
**Researched:** 2026-04-22
**Confidence:** HIGH (well-documented domain; pitfalls drawn from established engineering patterns in image-heavy web apps and marketplace systems)

---

## Critical Pitfalls

Mistakes that cause rewrites, data loss, or destroy user trust. Fix before you encounter them.

---

### Pitfall C1: Storing Only the Processed Version, Not the Original

**What goes wrong:** The upload pipeline auto-corrects exposure and white balance and saves only the corrected image. Six months later the correction algorithm improves, or the artist decides a batch of corrections was too aggressive. There is no original to reprocess — every artwork must be re-photographed.

**Why it happens:** Saving one file seems simpler. The "original" feels redundant when the pipeline just ran. Disk cost looks like a reason to skip it.

**Consequences:** Irreversible data loss. The artist's photographic record of their work is gone. Future pipeline improvements cannot be applied retroactively. Any exhibition or print request that needs the uncompressed original fails.

**Prevention:**
- Always write `original/` and `processed/` as separate paths in storage from day one.
- The original must be immutable — never overwritten, never deleted by the pipeline.
- Schema: `artworks.image_original_path`, `artworks.image_processed_path`, `artworks.image_thumbnail_path`. Three columns, always populated independently.
- If storage cost is a concern, the processed version and thumbnails are the expensive ones (many sizes); the original is a single file.

**Warning signs:**
- Any code path that calls `fs.unlink` or `storage.delete` on the source file after processing.
- A single `image_path` column on the artwork model.

**Phase:** Image pipeline phase (Phase 2 or whichever phase builds the upload flow). Non-negotiable before first upload.

---

### Pitfall C2: Color Profile Stripping — sRGB vs Display-P3 Mismatch

**What goes wrong:** The artist photographs a painting on an iPhone 12+ which captures in Display-P3 (wide gamut). Sharp or ImageMagick processes the file and strips the ICC color profile, or converts to sRGB without proper gamut mapping. The vivid reds and greens that were accurate to the physical painting become muddy on screen. Worse: on P3-capable displays the colors are correct, but on sRGB displays they clip and over-saturate, making the gallery look inconsistent across devices.

**Why it happens:** Most image processing libraries default to stripping metadata for file size. Developers test on one screen. The problem only appears when comparing physical artwork to the web version on calibrated hardware.

**Consequences:** Artwork is misrepresented. A collector buys a piece expecting one color palette and receives another. This is a trust-destroying defect for a sales platform.

**Prevention:**
- In Sharp: explicitly set `withMetadata()` to retain ICC profile, or use `toColorspace('srgb')` with proper gamut mapping rather than stripping.
- Store the original with its native color profile intact.
- Generate processed/display versions explicitly converted to sRGB with embedded ICC profile.
- Test by opening files in a color-managed viewer (macOS Preview with color matching enabled) vs the browser.
- For the web: use `<img>` tags; browsers handle sRGB ICC profiles correctly. Do not strip the ICC chunk.

**Warning signs:**
- Processing code that does not explicitly call `withMetadata()` in Sharp.
- Output files smaller than expected (ICC profile is ~2-3 KB — its absence is a hint).
- Reds that look "too orange" on screen vs. the physical work.

**Phase:** Image pipeline phase. Lock this in before any processed images reach the database.

---

### Pitfall C3: EXIF Orientation Ignored — Rotated Images Displayed Sideways

**What goes wrong:** A photo taken in portrait orientation on a phone is stored with `Orientation: 6` (90° clockwise) in EXIF. The file's pixel data is landscape; the EXIF tag tells software to rotate it. Browsers apply the EXIF rotation, but Sharp — by default — does not. The processed/resized image has pixel data in the wrong orientation. On display: sideways artwork.

**Why it happens:** Sharp's `rotate()` without arguments applies EXIF-based auto-rotation, but it must be called explicitly. Developers testing on desktop-photographed images (always upright) never encounter the bug.

**Consequences:** Every portrait-mode mobile upload appears sideways. The artist uploads from their phone — this will be the common case.

**Prevention:**
- Always call `.rotate()` (no arguments) as the first operation in Sharp before any resize or crop. This reads and applies the EXIF orientation tag and strips the tag from the output.
- Verify by uploading a photo taken in portrait mode on a real iPhone.
- After `.rotate()`, strip EXIF location data (privacy) but keep color profile.

**Warning signs:**
- Processing code that never calls `.rotate()`.
- Test uploads done exclusively from desktop files.
- Images look fine in macOS Finder (which applies EXIF rotation for preview) but wrong in the browser (which also applies EXIF rotation) — an inconsistency that only appears in Sharp output.

**Phase:** Image pipeline phase. Add to the processing chain before writing any test images.

---

### Pitfall C4: HEIC/HEIF Format From iPhones Not Processed

**What goes wrong:** iPhones default to HEIC format (High Efficiency Image Container) since iOS 11. Sharp does not support HEIC natively — it requires `libheif` to be compiled into the libvips build. A standard `npm install sharp` on most hosting platforms will fail silently or throw an unsupported format error when an iPhone user uploads their artwork photo directly.

**Why it happens:** Developers test with JPEG files. The first iPhone upload in production crashes the pipeline with a cryptic `VipsOperation: class "heifload" not found` error.

**Consequences:** The artist — the sole uploader — cannot upload from their iPhone without a workaround. The entire mobile upload feature is broken for the primary use case.

**Prevention:**
- Option A (recommended for v1): Validate and reject HEIC at the upload endpoint with a clear message: "Please export your photo as JPEG from the iPhone Photos app (Share > Save to Files as JPEG)." Add a help note in the upload UI.
- Option B (robust but complex): Install `libheif` on the server and use Sharp's HEIC support, or use `heic-convert` npm package to pre-convert before Sharp processes the file.
- Option C: Use the browser-side `<input accept="image/jpeg,image/png,image/webp,image/heic">` and add client-side HEIC detection with a conversion library (heic2any).
- Regardless: test the upload pipeline with an actual `.heic` file from an iPhone before calling mobile upload complete.

**Warning signs:**
- Upload endpoint accepts `image/*` without format validation.
- No test coverage for `.heic` input.
- Processing error logs referencing `heifload` in production.

**Phase:** Image pipeline phase. Decide the HEIC strategy before building the upload UI — it affects what the upload form accepts.

---

### Pitfall C5: Async Pipeline Failure Leaves Orphaned Files and Broken Records

**What goes wrong:** The upload creates a database record for the artwork (status: `processing`), then kicks off an async job to process the image. The job fails halfway through — Sharp throws on a corrupt file, disk fills up, the server restarts. The database record remains with `status: processing` forever. Storage accumulates partial files. The artist sees a stuck "processing" spinner indefinitely.

**Why it happens:** Happy-path development. The async handler is written without failure cleanup. There is no timeout, no dead-letter queue, no retry logic.

**Consequences:** The admin back-office fills with ghost artworks. Re-uploading creates duplicates. Storage bill grows from unreferenced files. The artist loses confidence in the platform.

**Prevention:**
- Every pipeline job must have: (1) a timeout, (2) a maximum retry count, (3) a final failure state (`status: failed`) with an error message visible in the admin.
- On final failure: delete partial files from storage, set `status: failed`, send a notification or log visibly.
- Add a cleanup cron (or admin button) that finds records stuck in `status: processing` for more than N minutes and resets them.
- Use a proper job queue (BullMQ, pg-boss) rather than fire-and-forget `setTimeout`. Job queues persist across server restarts.

**Warning signs:**
- Pipeline triggered with `async function processImage() { ... }` called without awaiting or error catching at the call site.
- No `status: failed` state in the artwork status enum.
- No admin view showing artworks by processing status.

**Phase:** Image pipeline phase. Build failure states and cleanup into the pipeline from the start, not as a retrofit.

---

### Pitfall C6: Storage Bloat From Unthrottled Multi-Size Generation

**What goes wrong:** Every artwork upload generates: original, processed full, thumbnail 400px, thumbnail 800px, WebP version, AVIF version. For 200 artworks at 8 MB originals, that is 200 × 6 variants × average 3 MB = 3.6 GB for a personal portfolio. Local disk fills up. Cloud storage costs escalate for what should be trivial.

**Why it happens:** "Generate all formats at upload time" is the obvious approach. The number of variants multiplies silently as features are added.

**Prevention:**
- Define the exact variant set and stick to it: original (immutable), processed/display (full resolution corrected), thumbnail (one size, e.g. 800px wide WebP). Three variants maximum for v1.
- Do not generate AVIF at upload time unless there is measured evidence of need — modern browsers handle WebP fine.
- Use a CDN with on-demand resizing (Cloudflare Images, imgix, Bunny Optimize) so the server stores one processed version and the CDN generates thumbnails at request time.
- Set a per-upload file size limit (e.g. 25 MB) to cap the worst case.

**Warning signs:**
- Storage directory audit shows 6+ files per artwork.
- No documented "canonical variant list" in the codebase.
- Disk usage grows faster than artwork count.

**Phase:** Image pipeline phase (define the variant set), Infrastructure phase (CDN planning).

---

## Moderate Pitfalls

Painful to fix but recoverable without a full rewrite.

---

### Pitfall M1: Over-Correction Pipeline — Destroying the Artist's Intent

**What goes wrong:** Auto white-balance and exposure correction is applied uniformly and aggressively. A painting done intentionally in warm tones gets "corrected" to neutral white, losing the mood. The artist validates quickly without noticing. The public version misrepresents the work.

**Why it happens:** The pipeline targets "technically correct" rather than "faithful to intent." Auto-correction algorithms optimize for a neutral gray card, not for art.

**Prevention:**
- Apply correction conservatively by default (small multipliers, e.g. exposure ±0.5 EV max, white balance shift capped).
- Show a before/after slider in the validation UI so the artist can see exactly what changed.
- Provide a "keep original without correction" escape hatch — some photos will already be well-exposed.
- Consider making correction strength an artist-adjustable parameter (light / medium / strong) rather than a fixed algorithm.

**Warning signs:**
- The validation screen shows only the corrected version, not a comparison.
- The correction algorithm is a fixed formula with no tunable parameters.
- Artist feedback after first use mentions "the colors look wrong."

**Phase:** Image pipeline phase.

---

### Pitfall M2: Bid Spam and Low-Ball Offer Flooding

**What goes wrong:** The offer history is public. Bots or trolls submit dozens of offers at €1 for every artwork. The public history shows a wall of insulting bids, devaluing the work in the eyes of legitimate visitors.

**Why it happens:** "Account required to bid" reduces spam but does not eliminate it — account creation itself is trivially automated. There is no rate limiting at the offer submission level.

**Prevention:**
- Rate limit offer submission per account: maximum 3 offers per artwork, cooldown between offer revisions.
- The "soft floor" warning (already planned in PROJECT.md) is correct — implement it as a visible friction point.
- Allow the artist to hide or soft-delete individual offers from the public history (admin control) without deleting them from the internal record.
- Consider email verification as a prerequisite for bidding (account creation does not require verification, but submitting an offer does trigger a verification gate if not yet verified).

**Warning signs:**
- No rate limiting on POST /offers.
- Offer history can be dominated by a single account.
- No admin moderation tool for the offer list.

**Phase:** Bid system phase and Auth phase together.

---

### Pitfall M3: Public Offer History Creates Perverse Price Anchoring

**What goes wrong:** The public offer history was designed for transparency and trust. But it backfires: legitimate buyers see that someone offered €200 for a €500 piece and anchor their own offer to €200, not €500. The visible low bids set the social proof floor far below the artist's actual floor.

**Why it happens:** The intention is openness, but offer history in art markets typically anchors to the lowest visible number, not the highest (unlike auction bid history which anchors upward because the format implies competition).

**Prevention:**
- Show only the count of offers, not the amounts, until an offer is accepted — OR —
- Show the range (highest offer: €X) without full history — OR —
- Show full history but only display amounts after the artist accepts or declines (retrospective transparency).
- The PROJECT.md decision to make history public is architecturally correct for trust, but the display format needs design care. Implement a "show history" toggle that defaults to hidden.

**Warning signs:**
- Offer amounts displayed prominently on the artwork page in chronological order.
- No design review of what the history actually communicates to a potential buyer.

**Phase:** Bid system phase. Design decision, not a code bug — but it must be explicit.

---

### Pitfall M4: "Forgot Password" Flow Using Expired or Single-Use Tokens Incorrectly

**What goes wrong:** The password reset link uses a token stored in the database. The user clicks the link, lands on the reset page, but their email client (Outlook, Gmail) pre-fetches the URL to generate a link preview, consuming the single-use token before the user can use it. The user arrives at the reset page and sees "invalid or expired token."

**Why it happens:** Standard single-use token reset links are vulnerable to email pre-fetching. This is a known flaw in naive implementations.

**Prevention:**
- Use a two-step reset: the link navigates to a page that accepts the token as a query param and shows a form, but the token is only consumed when the user submits the new password (POST), not on GET.
- Use short-lived tokens (15 minutes) but not single-use until POST.
- Or use the PKCE-style approach: the email link validates the token exists and marks it as "clicked" but only invalidates it on successful password change.
- Libraries like Lucia Auth, Better Auth, or Auth.js handle this correctly by default — this is a strong reason to use an established auth library rather than rolling your own.

**Warning signs:**
- Reset token is invalidated on the GET request that loads the reset form.
- Using `DELETE FROM tokens WHERE token = $1` inside the GET handler.

**Phase:** Auth phase.

---

### Pitfall M5: Email Deliverability — Notifications Going to Spam

**What goes wrong:** The artist receives an email for every new offer. After one week, those emails reliably land in spam. They stop monitoring. A serious offer is missed. The relationship between site and artist — the primary user — is broken.

**Why it happens:** Transactional emails sent from a VPS IP with no SPF, DKIM, or DMARC records are rated as spam by Gmail, Outlook, and Apple Mail. Even a single-user site needs proper email authentication.

**Prevention:**
- Use a transactional email provider (Resend, Postmark, or SendGrid free tier) rather than sending from the server's IP directly. These providers have pre-warmed IPs and handle SPF/DKIM automatically.
- Add SPF and DKIM DNS records for the sending domain from day one — retrofitting them after the domain has a spam reputation is slow (reputation rebuilds over weeks).
- Test with mail-tester.com before going live with any email flow.
- Use a `noreply@` address that actually accepts bounces (configure bounce handling in the provider).

**Warning signs:**
- Email sent via `nodemailer` directly from the server without an ESP.
- No SPF/DKIM records on the domain.
- From address is a Gmail or generic domain address.

**Phase:** Auth phase (email verification) and Bid system phase (offer notification). Configure the ESP before writing a single email template.

---

### Pitfall M6: Hardcoded Local Paths Break Cloud Migration

**What goes wrong:** During local development, images are stored at `/uploads/artworks/original/` and served as static files. The path is hardcoded in 40 places: database strings, image processing code, static file middleware config, and the artist's import scripts. Moving to cloud storage (S3, Cloudflare R2) requires a multi-day find-and-replace plus database migration to fix stored paths.

**Why it happens:** "Local first" naturally leads to `path.join(__dirname, 'uploads', ...)` sprinkled everywhere. The abstraction is deferred until it is expensive.

**Prevention:**
- From day one, abstract all storage access behind a `StorageProvider` interface with two implementations: `LocalStorageProvider` and `S3StorageProvider`. The interface has `store(key, buffer)`, `retrieve(key)`, `delete(key)`, `publicUrl(key)` methods.
- The database stores only the storage key (e.g. `artworks/original/abc123.jpg`), never an absolute path.
- The environment variable `STORAGE_BACKEND=local|s3` controls which provider is used.
- This abstraction costs one afternoon to set up correctly and saves two days of migration pain.

**Warning signs:**
- Database `image_path` column contains `/Users/artist/projects/...` or `C:\uploads\...` style paths.
- No `StorageProvider` abstraction in the codebase.
- Image serving middleware configured as `express.static('./uploads')` without any abstraction.

**Phase:** Architecture phase (define the interface), Infrastructure phase (implement S3 provider).

---

### Pitfall M7: SQLite to PostgreSQL Migration Pain

**What goes wrong:** Development uses SQLite for simplicity. PostgreSQL is used in production. The ORM (Prisma, Drizzle) claims to abstract this, but: SQLite does not enforce foreign key constraints by default (`PRAGMA foreign_keys = ON` must be set), SQLite datetime handling differs from PostgreSQL (no timezone-aware types), SQLite's `LIKE` is case-insensitive while PostgreSQL's is case-sensitive, and some Prisma features (e.g. `createMany` with `skipDuplicates` on SQLite pre-v5.0) behave differently. The test suite passes on SQLite; production breaks on PostgreSQL.

**Why it happens:** "It works locally" syndrome. The ORM abstraction is leaky — dialect differences surface at runtime.

**Prevention:**
- Use PostgreSQL locally from day one via Docker (`docker run -e POSTGRES_PASSWORD=dev -p 5432:5432 postgres:16-alpine`). The added setup is 5 minutes; the saved debugging is hours.
- If SQLite is chosen deliberately for simplicity, document every known SQLite-PostgreSQL difference in the codebase and run CI against both dialects.
- Never store application logic in SQL that is dialect-specific (avoid SQLite-only pragma hacks, use timezone-aware datetime types from the start).

**Warning signs:**
- `DATABASE_URL` in `.env` points to a `.sqlite` file while production uses PostgreSQL.
- No Docker setup or database container in the development environment documentation.

**Phase:** Architecture phase. Decision must be made before the first migration is written.

---

### Pitfall M8: Taxonomy Regret — Classification System Too Rigid

**What goes wrong:** The artwork classification schema is designed as a fixed enum: `technique: ['huile', 'aquarelle', 'dessin', 'acrylique']`. Six months in, the artist creates a mixed-media piece, experiments with a new technique, or wants to tag works by series, theme, and material simultaneously. The enum must be altered, existing records migrated, and the filtering UI rebuilt.

**Why it happens:** Enums feel clean and safe. The full range of an artist's practice is not known at v1.

**Prevention:**
- Use a tag/label system rather than fixed enums for artistic classification: `artworks_tags` join table, `tags` table with `name` and `category` columns. Categories can be `technique`, `theme`, `series`, `format`.
- Reserve enums only for machine-critical status fields (availability: `available | sold | given`) where controlled vocabulary is a correctness requirement, not a UX preference.
- The filtering UI works the same whether there are 4 or 40 tags.

**Warning signs:**
- `technique ENUM('huile', 'aquarelle', ...)` in the schema with no extension mechanism.
- Classification UI is a fixed-option radio button with no free-text input.

**Phase:** Data modeling phase (first migration). Much cheaper to design correctly now than to migrate data later.

---

### Pitfall M9: SEO — Images Not Indexed, No Structured Data

**What goes wrong:** The gallery is built as a client-side SPA (React without SSR). Google's crawler fetches the page, gets an empty HTML shell, and indexes nothing. The artwork titles, descriptions, and images never appear in Google Image Search — a meaningful discovery channel for art. Additionally, there is no `schema.org/VisualArtwork` structured data, so the site gets no rich results.

**Why it happens:** SPAs feel natural for an image-heavy scrolling gallery. SEO is treated as "later." By the time it matters, the routing and rendering architecture is set.

**Prevention:**
- Use server-side rendering or static generation for all public pages (Next.js App Router, Nuxt, SvelteKit). Each artwork page must return a full HTML response with `<title>`, `<meta name="description">`, and `<meta property="og:image">` populated server-side.
- Add `schema.org/VisualArtwork` JSON-LD to each artwork page (title, creator, dateCreated, artMedium, image URL, offers).
- Every `<img>` displaying an artwork must have a descriptive `alt` attribute (artwork title + technique + year at minimum) — not `alt=""` and not `alt="artwork"`.
- Generate and serve a `sitemap.xml` that includes artwork pages.
- Submit to Google Search Console on deployment.

**Warning signs:**
- `curl -A Googlebot https://yoursite.com/artwork/123 | grep "<title>"` returns nothing.
- Images rendered via CSS `background-image` instead of `<img>` tags.
- No JSON-LD in artwork page source.

**Phase:** Architecture phase (SSR vs SPA decision), Launch/SEO phase (structured data, sitemap).

---

### Pitfall M10: Performance — Image-Heavy Pages With No Loading Strategy

**What goes wrong:** The Instagram-style vertical scroll loads all artworks at once: 50 images × 800 KB each = 40 MB on initial load. Mobile users on 4G wait 20+ seconds. The Largest Contentful Paint fails Core Web Vitals. Google downgrades the site in search rankings.

**Why it happens:** The gallery works fine during development with 5 test images. The problem surfaces in production with real content volume.

**Prevention:**
- Lazy load images using `loading="lazy"` on all `<img>` tags below the fold (native browser support, zero JavaScript needed).
- Implement virtual/windowed scrolling if the artwork count exceeds 100 (react-virtual, TanStack Virtual).
- Serve images via a CDN, never directly from the application server.
- Use correct `srcset` and `sizes` attributes so mobile devices download mobile-sized images.
- Set explicit `width` and `height` attributes on every `<img>` to eliminate Cumulative Layout Shift (CLS) — images that reflow the page after loading.
- Blur-up or skeleton loading placeholders prevent the "all white then images appear" jump.

**Warning signs:**
- `<img src="/artworks/processed/abc.jpg">` with no `loading`, `width`, `height`, or `srcset` attributes.
- Network tab in DevTools shows all images loading on initial page load regardless of scroll position.
- No CDN in the infrastructure plan.

**Phase:** Frontend phase (image rendering) and Infrastructure phase (CDN).

---

## Minor Pitfalls

Annoying but low-severity with obvious fixes.

---

### Pitfall L1: Account Spam Without Email Verification Gate

**What goes wrong:** The like and bid features require accounts. Spammers create 50 accounts to spam offers. The offer history floods with noise.

**Prevention:**
- Require email verification before any interactive action (like, bid). Account creation itself can be instant, but the first interactive action triggers a verification prompt.
- Use a verified email as the unique identifier anchor, not just username.

**Phase:** Auth phase.

---

### Pitfall L2: Missing File Size Limit on Upload

**What goes wrong:** A photographer uploads a 120 MB RAW-exported TIFF. The Node.js server buffers the entire file in memory before Sharp touches it. Memory spikes. If multiple uploads happen simultaneously, the server crashes.

**Prevention:**
- Set a hard limit (e.g. 25 MB) at the HTTP layer before the file reaches the application (nginx `client_max_body_size`, or multer's `limits.fileSize`).
- Return a 413 error with a helpful message: "Maximum file size is 25 MB. Export your photo as JPEG from the Camera Roll."
- Streaming upload to avoid full memory buffering: pipe directly to disk or object storage, do not buffer in memory.

**Phase:** Image pipeline phase.

---

### Pitfall L3: Artwork Status Machine Not Modeled Explicitly

**What goes wrong:** Artwork status (`available`, `sold`, `given`) transitions are scattered across multiple endpoints with no centralized validation. An artwork in `sold` state somehow receives a new bid. A database inconsistency causes a sold artwork to appear available after a page refresh.

**Prevention:**
- Define all valid transitions explicitly: `available → sold`, `available → given`, `sold → available` (if a deal falls through). Any other transition is rejected at the service layer, not just the UI.
- A bid can only be submitted against an `available` artwork — validate at the database level (check constraint or trigger) as the final defense.

**Phase:** Data modeling phase and Bid system phase.

---

### Pitfall L4: EXIF Location Data Leaking From Uploaded Photos

**What goes wrong:** Photos taken on a phone embed GPS coordinates in EXIF. The original file is served publicly (or the URL is guessable). The artist's home address or studio location is exposed in image metadata.

**Prevention:**
- Strip all EXIF location data from every output file (original stored privately, processed version served publicly with location EXIF removed).
- In Sharp: use `withMetadata({ exif: {} })` to strip EXIF while retaining the ICC color profile. Or more precisely, retain only the ICC profile using `withMetadata()` selectively.
- Never make the original file URL publicly accessible. Only processed/stripped versions should have public URLs.

**Phase:** Image pipeline phase. Add to the processing checklist alongside `.rotate()`.

---

## Phase-Specific Warnings

| Phase Topic | Pitfall(s) | Key Mitigation |
|-------------|------------|----------------|
| Data modeling / first migration | C1 (three image columns), M7 (PostgreSQL from day one), M8 (tag system not enum), L3 (status machine) | Design schema before writing any code |
| Upload and image pipeline | C2 (color profile), C3 (EXIF rotation), C4 (HEIC format), C5 (async failures), C6 (storage bloat), M1 (over-correction), L2 (file size limit), L4 (EXIF location) | Process pipeline as a checklist, not an afterthought |
| Auth | M4 (forgot-password token), M5 (email deliverability), L1 (account spam) | Use an established auth library; configure ESP before first email |
| Bid system | M2 (offer spam), M3 (price anchoring), L3 (status machine) | Rate limit from day one; design history display deliberately |
| Frontend / gallery rendering | M9 (SEO / SSR), M10 (lazy loading, CLS) | SSR architecture decision must be made before routing is built |
| Infrastructure / deployment | M6 (hardcoded paths), M7 (SQLite → PostgreSQL), M10 (CDN) | StorageProvider abstraction; PostgreSQL locally; CDN in architecture |

---

## Decision Register: Pitfall-Driven

The following decisions should be made explicitly before implementation begins to avoid the pitfalls above.

| Decision | Recommended | Pitfall Avoided |
|----------|-------------|-----------------|
| Image storage columns | Three separate columns: original_path, processed_path, thumbnail_path | C1 |
| Color profile handling | `withMetadata()` in Sharp, ICC profile preserved on processed output | C2 |
| EXIF rotation | `.rotate()` as first Sharp operation, always | C3 |
| HEIC strategy | Reject with helpful message in v1; revisit if needed | C4 |
| Pipeline failure states | BullMQ or pg-boss with `failed` status and cleanup cron | C5 |
| Storage abstraction | `StorageProvider` interface with `local` and `s3` implementations | M6 |
| Database | PostgreSQL via Docker locally, never SQLite for production parity | M7 |
| Classification | Tags table with category column, not enums | M8 |
| Rendering | SSR (Next.js App Router or SvelteKit) for all public pages | M9 |
| Email | Resend or Postmark ESP with SPF/DKIM configured before first send | M5 |
| Auth library | Established library (Better Auth, Lucia, Auth.js) not hand-rolled | M4 |
| Offer history display | Show count + highest offer only by default; full history toggleable | M3 |

---

*Confidence: HIGH — pitfalls drawn from established patterns in image processing (Sharp docs, browser rendering specs, EXIF/ICC standards), marketplace design (anchoring literature, rate-limiting best practices), and web deployment (email deliverability, CDN architecture, SQLite/PostgreSQL dialect differences). No speculative claims.*
