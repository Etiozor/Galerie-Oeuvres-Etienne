# Feature Landscape: Galerie POF

**Domain:** Personal art gallery / portfolio with marketplace (solo artist)
**Researched:** 2026-04-22
**Confidence:** MEDIUM — WebSearch and WebFetch were unavailable; findings drawn from training-data knowledge of Saatchi Art, Artsy, Etsy, ArtStation, Behance, and independent portfolio sites (training cutoff August 2025). Patterns are stable and well-established; unlikely to have shifted significantly.

---

## Reference Sites Analyzed

| Site | Type | Relevant For |
|------|------|--------------|
| Saatchi Art | Marketplace, solo/group artists | Artwork metadata, offer UX, price justification |
| Artsy | Gallery-grade marketplace | Inquiry/bid flow, collector trust signals |
| Etsy (art category) | Peer marketplace | Make-offer UX, buyer metadata expectations |
| ArtStation | Portfolio, professional artists | Artwork classification, image display, grid UX |
| Behance | Portfolio, no marketplace | Gallery browsing patterns, project narrative |
| Personal portfolio sites (standard) | Solo artist, no marketplace | Minimal browsing, about page, contact |

---

## Table Stakes

Features users expect. Their absence signals an unfinished or unprofessional site; users leave or distrust the product.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Responsive image grid/gallery | Every gallery site has it; broken layout on mobile = immediate exit | Low-Med | Masonry or uniform-card grid; mobile-first |
| Individual artwork detail page | Each work must be inspectable in isolation | Low | URL-addressable, shareable link |
| High-resolution image view / zoom | Buyers need to assess quality before any purchase interest | Med | Pan-zoom on detail view; lightbox overlay acceptable |
| Artwork title + date visible on browse | Temporal context and identity are baseline metadata | Low | Visible in card or on hover |
| Medium / technique label | "Pencil on paper", "Oil on canvas" — buyers ask this first | Low | Part of artwork classification |
| Dimensions (format/size) | Physical size is critical for buyers — wall space planning | Low | cm or inches, consistent unit |
| Availability status (available / sold / given) | Prevents inquiries on unavailable works; reduces frustration | Low | Visible badge on card AND detail page |
| Artist about page | Establishes trust, story, voice — expected even on personal sites | Low | Bio, photo, inspirations |
| Navigation between works | Prev/Next on detail page so browsers stay in flow | Low | Keyboard-friendly; swipe on mobile |
| Mobile usability | Most visitors will arrive via phone (social media share, link) | Med | Touch-friendly tap targets, swipe gestures |
| Fast image loading | Slow images = high bounce rate; art sites are image-heavy | Med | Responsive srcset, lazy-load, WebP conversion |
| Social sharing hooks | Users share art they like; artist benefits from organic reach | Low | Open Graph meta tags (title, image, description) per artwork |

---

## Differentiators

Features that set this project apart from a generic gallery. Not universally expected, but create meaningful value when present.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Price breakdown / justification panel | Transparent pricing builds trust and educates the buyer on why the price is what it is — rare on personal sites | Med | Components: time spent, format, framed/unframed, materials, technique complexity, artist attachment level; shown as a breakdown table or visual bar |
| Soft price floor with bid warning | Lets buyers feel agency while protecting artist's minimum; honest signal without rejection | Low-Med | On bid submission: if offer < base price, show warning modal "This is below the artist's estimated value — you can still submit" |
| Public offer history per artwork | Creates social proof and market transparency — Artsy does this for gallery works at auction; rare on personal sites | Med | List of past offers (anonymized bidder, amount, date); sorted newest first |
| Likes / favorites system | Lets the artist see what resonates; creates return-visit incentive for logged-in users | Med | Like count visible publicly; personal favorites list in user account |
| Image auto-correction pipeline (pre-publish) | Smartphone photos of artworks are consistently poor; auto white-balance + exposure correction before artist validation is a real UX differentiator for the artist | High | Requires server-side image processing; artist sees before/after diff and approves; not visible to visitors but reduces friction for artist |
| Framed / unframed toggle with price impact | Buyers want to know if framing is included and what it costs | Low-Med | Binary toggle on artwork detail; price adjusts or note explains |
| Artwork narrative / process note | Going beyond title+description to "why I made this" — emotional connection increases purchase intent | Low | Optional long-form field on artwork; distinct from description |
| Classification browsing (filter by medium) | Pencil vs ink vs acrylic vs oil — lets repeat visitors explore a specific style | Low-Med | Faceted filter sidebar or tag pills on grid; single-artist so facets stay small |
| Chronological / date browsing | Artists' work evolves; date-sorted view tells a story | Low | Toggle: newest first / oldest first; optionally year grouping |

---

## Anti-Features

Features to deliberately NOT build in v1. Explicitly excluded to keep scope clean.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Integrated payment / checkout | Adds PCI compliance scope, Stripe integration complexity, legal/tax obligations for selling art across borders; transactions are better handled off-platform for a solo artist at this scale | Artist and buyer exchange contact via email after offer acceptance; no money flows through the app |
| Auction timer / countdown | Creates artificial urgency that feels mismatched with fine art context; Saatchi-style timed auctions require scheduling, notification, and dispute logic | Free-price offers (asynchronous) are sufficient and feel more personal |
| Inter-visitor social features (comments, follows between users) | Turns the site into a social network — not the goal; adds moderation burden | Likes only; no public comments or user-to-user interaction |
| Algorithmic recommendations / "you may also like" | Requires training data volume that a single-artist portfolio never generates meaningfully | Simple prev/next navigation and "other available works" static section |
| Wishlist / cart / multi-item offers | Each artwork is unique (non-fungible), so a cart makes no sense | One offer per artwork per submission |
| Print-on-demand / reproductions | Different business model entirely; muddies the "original art" positioning | If needed, link to an external POD service (out of scope) |
| Advanced SEO tooling / blog | Content marketing is orthogonal to the core value; distraction | Open Graph tags + clean URLs are sufficient SEO for v1 |
| Multi-artist / gallery mode | The site is explicitly for one artist; multi-tenancy adds auth complexity and access control surface | Single-artist admin only |

---

## UX Patterns for Artwork Browsing

### Grid Layout

**Recommended: Variable-height masonry with uniform column width**

Rationale: Artworks are not uniform aspect ratios (portrait drawings, landscape paintings, square formats). Forcing them into uniform cards crops or letterboxes images — deadly for art where the full composition matters. Masonry preserves proportions.

- Column count: 2 columns on mobile, 3 on tablet, 3-4 on desktop
- Card contents: image (full proportion) + title + medium + status badge; price only on hover or only on detail page
- Hover state: subtle overlay with "View" CTA; avoid aggressive overlays that obscure the art
- Status badge: small pill in corner — "Sold" (grey/red), "Available" (green), "Given" (neutral)

**Alternative: Instagram-style single-column vertical scroll**

The PROJECT.md explicitly calls for this. It works well for a curated, sequential experience — each artwork gets full attention. Implementation note: this is simpler than masonry but works best when images are square or near-square cropped to a consistent ratio. A hybrid is possible: vertical scroll with full-width images on mobile, masonry on desktop.

### Lightbox / Detail View

- Click on grid card opens either: (a) lightbox overlay with zoom, or (b) navigates to full detail page
- Recommendation for this project: full detail page (better for sharing, SEO, offer submission UX)
- Detail page layout: large image left (60-70% width), metadata + offer form right; stacked on mobile
- Zoom: pinch-zoom on mobile is native; desktop needs explicit zoom widget (click to zoom, pan with mouse) or a dedicated "View full resolution" link
- Navigation: left/right arrows to adjacent artwork in same filter context

### Browsing Filters

For a single-artist site with dozens to low-hundreds of artworks:

- Filter by medium: Drawing / Painting (top-level), then Pencil / Ink / Acrylic / Oil
- Filter by status: Available / All
- Sort: Newest / Oldest / (optionally: Most liked)
- Keep filter UI minimal — tag pills above grid, no complex faceted sidebar needed

---

## Bid / Offer UX Patterns

### Reference: How Etsy "Make Offer" Works

Etsy's offer flow (for listings that enable it):
1. Buyer clicks "Make Offer" button on listing page
2. Modal opens — buyer enters amount, optionally a message
3. Seller receives email notification; has 24-48h to accept / decline / counter
4. Buyer notified of seller decision via email

Key pattern: offer is private (between buyer and seller only). Etsy does not show offer history publicly.

### Reference: How Artsy / Saatchi Handle Offers

Artsy (gallery-grade):
- "Make an Offer" opens a form; buyer enters amount + shipping address
- Artsy routes the inquiry to the gallery; response via email
- Offer history is not public on Artsy; trust is established via gallery reputation

Saatchi Art:
- Listed price only; no "make offer" — buyer pays listed price or contacts artist
- Price is fixed; no negotiation UX built in

### Recommended Pattern for Galerie POF

Since the project uses a "free bid / price offer" model with a public offer history — this is more transparent than any reference site. Pattern recommendation:

**Offer submission flow:**
1. Artwork detail page: if status = "Available" and user is logged in, show "Make an Offer" section below the price breakdown
2. If not logged in: "Log in to make an offer" CTA (do not show form)
3. Offer form: single number input (price), optional message field (max 300 chars), submit button
4. Soft floor warning: before submission, if offer < base price, show inline warning (not a blocking modal): "Your offer is below the artist's estimated value of X€. You can still submit — the artist will review it."
5. On submit: offer recorded in DB; email sent to artist with offer amount, bidder name/email, artwork name, optional message
6. Public offer history: below the form (or in a collapsible section), show a table of past offers: Amount | Date | (bidder shown as "Visitor" or first name only to protect privacy)

**Privacy note:** Showing exact bidder identity publicly creates privacy risk. Recommendation: show anonymized handle ("A.D.", "Visitor #3", or just "Anonymous") and amount + date. The artist sees full details in the email and/or admin panel.

**Offer history sort:** Newest first. Shows the market moving — the most recent offer is most relevant.

---

## Image Quality Display Patterns

### What buyers need to assess:

1. **Overall composition** — does the work look good at gallery scale? (handled by the grid card)
2. **Detail / texture** — brushwork, pencil grain, ink line quality — requires zoom
3. **Color accuracy** — white balance matters; a warm-tinted photo of an artwork misrepresents it (motivates the image correction pipeline)
4. **Scale context** — knowing it's 40x60cm is insufficient without a reference; a secondary photo "in situ" (artwork hanging on a wall) is a standard Saatchi pattern

### Recommended display stack:

| View | Resolution | Implementation |
|------|------------|----------------|
| Grid thumbnail | 600-800px wide | Lazy-loaded WebP, cropped to masonry |
| Detail hero | 1200-1600px wide | Full proportion, WebP |
| Zoom | Full upload resolution | Pan-zoom on click, or separate "view full" page |
| In-situ photo (optional) | Same as detail | Secondary image slot on artwork form — artist can optionally add a "hanging on wall" photo |

**Color accuracy note:** The image pipeline (auto-correct exposure/white-balance) is precisely what buyers need. A corrected image should be closer to the true color of the artwork than a raw phone photo. This is a genuine differentiator vs. sites where artists upload uncorrected images.

---

## Metadata Buyers Want to See

Ranked by purchase-decision relevance (HIGH to LOW confidence, based on Saatchi Art, Artsy, Etsy art listings):

| Metadata | Priority | Notes |
|----------|----------|-------|
| Title | Critical | Identity of the work |
| Medium / technique | Critical | Pencil, oil, ink — affects perceived value and buyer expectation |
| Dimensions (W x H, cm) | Critical | Wall planning; buyers abandon if missing |
| Year created | High | Recency or historical placement in artist's trajectory |
| Status (available / sold / given) | High | Prevents wasted inquiries |
| Price (base price) | High | Or "Price on request" if private — but for this project, price is public |
| Price breakdown | High (differentiator) | Time, format, frame, materials, complexity, attachment |
| Framed or not | High | Affects buyer's cost and installation |
| Description / artist note | Medium | "What is this piece about?" — emotional context, technique notes |
| Series / collection | Medium | Useful if artist produces thematic series; low priority for v1 |
| Offer history | Medium (differentiator) | Market signal; builds trust |
| Like count | Low-Med | Social proof; less critical than for a social platform |
| Original / unique | Low | Implied by the site concept, but stating "unique original" is reassuring |

---

## Feature Dependencies

```
User account (auth)
  └── Like / favorite artwork
  └── Submit offer / bid
        └── Soft price floor warning (requires base price)
        └── Public offer history

Artwork upload (artist admin)
  └── Image ingestion
        └── Image auto-correction pipeline
              └── Artist validation / approval step
                    └── Publish to gallery

Artwork published
  └── Grid display (browse)
        └── Masonry / scroll layout
        └── Filter by medium / status
        └── Sort by date
  └── Detail page
        └── Zoom / high-res view
        └── Metadata display (title, medium, dimensions, date, status)
        └── Price breakdown panel
        └── Framed / unframed info
        └── Offer submission form (requires user account)
        └── Public offer history
        └── Prev / next navigation

Offer submitted
  └── Email notification to artist
  └── Recorded in offer history (public)

About page
  └── No dependencies — standalone static content
```

---

## MVP Recommendation

**Prioritize (core loop — must be in v1):**

1. Artwork upload with classification + metadata (title, date, medium, dimensions, description, status, frame info)
2. Image correction pipeline + artist validation
3. Gallery browse: vertical scroll (mobile) + masonry grid (desktop), filter by medium/status
4. Artwork detail page: full image + zoom + all metadata
5. User accounts (register / login)
6. Like system
7. Price breakdown display (static, artist-entered)
8. Offer submission form with soft floor warning + email notification to artist
9. Public offer history (anonymized)
10. About page

**Defer to v2 (after validating v1 with real users):**

- In-situ photo ("artwork on a wall") — artist can add later once workflow is established
- Artwork narrative / process note — currently merged with description; can be split later
- Series / collection grouping — only relevant if artist produces clearly delineated series
- Sort by most-liked — needs data volume first
- Keyboard navigation (arrow keys in lightbox) — polish, not launch-blocking

---

## Sources and Confidence

| Finding | Confidence | Basis |
|---------|------------|-------|
| Grid/masonry UX patterns | HIGH | Stable, well-documented across Saatchi, Artsy, ArtStation; patterns unchanged for 5+ years |
| Artwork metadata expectations | HIGH | Consistent across all reference platforms; buyer psychology well-documented |
| Etsy "Make Offer" flow | MEDIUM | Training data through 2025; flow may have changed in minor details but core pattern is stable |
| Artsy inquiry/offer flow | MEDIUM | Training data through 2025; Artsy has iterated on this but the basic pattern holds |
| Saatchi no-negotiation pattern | MEDIUM | Saatchi has historically been fixed-price; may have added offer features since training cutoff |
| Soft price floor UX (warning, not block) | HIGH | Standard e-commerce pattern; well-established in auction/marketplace research |
| Public offer history as differentiator | HIGH | No major art portfolio site for solo artists does this; it is genuinely rare and the project explicitly calls for it |
| Image zoom patterns | HIGH | Standard across all reference platforms; implementation details vary |

Note: WebSearch and WebFetch were unavailable during this research session. Findings are drawn from training knowledge (cutoff August 2025). For any specific feature verifications (e.g., "does Saatchi now support offers?"), a manual check of live sites is recommended before finalizing roadmap decisions.
