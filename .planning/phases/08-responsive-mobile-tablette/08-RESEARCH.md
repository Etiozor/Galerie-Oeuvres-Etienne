# Phase 8: Responsive Mobile/Tablette — Research

**Researched:** 2026-06-07
**Domain:** CSS responsive, Client Component hamburger menu, virtual keyboard handling
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Sur mobile (≤768px), SiteNav bascule en mode hamburger : logo à gauche, icône hamburger à droite (touch target 44×44px minimum). La nav horizontale actuelle est masquée.
- **D-02:** Le menu hamburger ouvre un panneau latéral glissant depuis la droite (280px de large), fond `#ede0b8` (surface), overlay sombre semi-transparent `rgba(26,26,26,0.5)`. Fermeture : tap overlay ou croix dans le panneau. Liens Space Mono uppercase ≥14px, touch targets 48px de hauteur.
- **D-03:** Sur desktop (≥769px), la SiteNav horizontale actuelle reste inchangée — aucune modification côté large écran.
- **D-03 (hérité Phase 3):** Zéro coins arrondis sur tous les éléments — s'applique aussi au panneau hamburger et à l'overlay.
- **D-06 (hérité Phase 3):** MasonryGrid CSS columns déjà responsive (3/2/1 col) — ne pas toucher.
- **D-11 (hérité Phase 3):** Hover overlay desktop uniquement — sur tactile, tap navigue directement vers la page détail.

### Claude's Discretion

- **Admin back-office:** Optimiser pour les tablettes (≥768px). Drawer 100% largeur sur écrans < 768px. Ne pas prioriser le téléphone pour l'admin.
- **Hover → tactile galerie (D-11):** Sur appareils tactiles, tap sur une carte = navigation directe (pas d'overlay intermédiaire).
- **Touch targets généraux:** Minimum 44×44px sur tous les éléments interactifs.
- **Filtres galerie sur mobile:** Barre scrollable horizontalement (overflow-x: auto, pas de tiroir séparé, pas de border-radius conformément à D-03).
- **Formulaire d'offre:** `scroll-padding-bottom` ou `padding-bottom` dynamique pour clavier virtuel.
- **Images page détail:** Pinch-to-zoom natif du navigateur (pas de zoom JS — D-15).

### Deferred Ideas (OUT OF SCOPE)

- Bottom navigation bar (Instagram-style)
- Admin sur téléphone
- Gestes de swipe prev/next entre les œuvres
- Pull-to-refresh sur la galerie
</user_constraints>

---

## Summary

Cette phase est une phase pure UI/CSS — aucune logique métier ne change. Elle consiste à adapter la présentation et l'ergonomie tactile de composants déjà fonctionnels. Le seul nouveau composant à créer est `HamburgerMenu` (Client Component fils de SiteNav), qui gère l'état ouvert/fermé du panneau latéral mobile.

Le codebase utilise exclusivement des styles inline et des balises `<style>` avec `@media` queries pour le responsive (pas de classes Tailwind responsives). Ce pattern est établi et doit être suivi rigoureusement. Les breakpoints existants sont `max-width: 767px` (mobile) et `max-width: 1023px` (tablette) — à réutiliser tels quels.

L'analyse du code révèle que le layout détail (`artworks/[id]/page.tsx`) est déjà responsive (grid 2-col desktop / 1-col mobile via `<style>` inline). La `MasonryGrid` est déjà responsive. Le seul grand chantier est le hamburger nav, le drawer admin pleine largeur sur petits écrans, et les touch targets.

**Primary recommendation:** Créer `HamburgerMenu` comme Client Component isolé importé dans `SiteNav` (Server Component async). Utiliser le pattern `<style>` + `@media` existant pour tous les ajustements responsifs.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Hamburger menu state (open/close) | Browser / Client | — | useState requis — interaction pure client |
| SiteNav rendering (session, links) | Frontend Server (SSR) | — | async Server Component lit la session iron-session |
| Responsive breakpoints CSS | Browser / Client | — | @media queries dans `<style>` inline |
| Admin drawer width adaptation | Browser / Client | — | useState drawerWidth déjà dans ArtworksClient |
| Virtual keyboard padding | Browser / Client | — | CSS + éventuellement JS (window resize listener) |
| Touch target sizes | Browser / Client | — | CSS padding/min-height sur éléments existants |

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React `useState` | déjà installé | État ouvert/fermé du hamburger menu | Pattern Client Component établi dans le projet |
| CSS `@media` queries | natif | Breakpoints responsive | Pattern établi via `<style>` inline dans MasonryGrid, artworks/[id]/page.tsx |
| CSS `overflow-x: auto` | natif | Filtres galerie scrollables horizontalement | Pattern standard mobile |
| CSS `scroll-padding-bottom` | natif | Formulaire visible au-dessus du clavier virtuel | Approche CSS-first sans JS |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `window.visualViewport` API | natif | Détecter hauteur clavier virtuel | Si `scroll-padding-bottom` insuffisant sur certains appareils |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `<style>` inline + @media | Tailwind responsive classes | Le projet a établi le pattern `<style>` — ne pas mélanger |
| CSS `scroll-padding-bottom` | JS `visualViewport` listener | CSS-first est préférable ; JS uniquement en fallback |
| Panneau latéral glissant CSS | React transition library | Trop lourd pour un seul composant ; `transform: translateX` CSS suffit |

**Installation:** Aucune dépendance supplémentaire — cette phase n'introduit pas de nouveaux paquets.

---

## Architecture Patterns

### System Architecture Diagram

```
Mobile request (≤768px)
        │
        ▼
SiteNav (async Server Component)
  ├── Logo (Link)
  └── HamburgerMenu (Client Component)
            │
            ├── [closed] → icône hamburger ≡ (button 44×44px)
            │
            └── [open] →
                  ├── Overlay (div, rgba(26,26,26,0.5), position:fixed, onClick:close)
                  └── Panneau (div, 280px, translateX, background:#ede0b8)
                        ├── Croix fermeture (button, 44×44px)
                        ├── Link "Galerie" (48px height touch target)
                        ├── Link "À propos" (48px height touch target)
                        └── [isLoggedIn?]
                              ├── Link carré initiale → /mon-profil
                              └── Link "S'identifier" → ?identify=1

Desktop request (≥769px)
        │
        ▼
SiteNav (async Server Component)
  ├── Logo (Link)
  └── Liens horizontaux (inchangés) + indicateur connexion
```

### Recommended Project Structure

```
src/
├── components/
│   └── layout/
│       ├── SiteNav.tsx              # Modifié — importe HamburgerMenu
│       └── HamburgerMenu.tsx        # NOUVEAU — Client Component
└── app/
    ├── artworks/[id]/page.tsx       # Vérifier — déjà responsive (à confirmer)
    └── admin/artworks/
        └── _components/
            └── ArtworksClient.tsx   # Modifié — drawer pleine largeur < 768px
```

### Pattern 1: SiteNav async + HamburgerMenu Client

**What:** SiteNav reste un async Server Component. Il passe les données de session comme props à HamburgerMenu, qui est un Client Component gérant l'état ouvert/fermé.

**When to use:** Chaque fois qu'un Server Component async a besoin d'un enfant interactif.

**Example:**
```tsx
// SiteNav.tsx (Server Component — inchangé sauf ajout HamburgerMenu)
export async function SiteNav() {
  const session = await getVisitorSession()
  const isLoggedIn = !!session.visitorId

  return (
    <nav style={{ height: '56px', backgroundColor: 'var(--color-surface)', /* ... */ }}>
      {/* Logo — inchangé */}
      <Link href="/">Galerie POF</Link>

      {/* Desktop : liens horizontaux (masqués sur mobile via @media) */}
      {/* ... style existant ... */}

      {/* Mobile : hamburger (visible seulement sur mobile via @media) */}
      <HamburgerMenu
        isLoggedIn={isLoggedIn}
        displayName={session.displayName}
      />
    </nav>
  )
}
```

```tsx
// HamburgerMenu.tsx (Client Component)
'use client'
import { useState } from 'react'
import Link from 'next/link'

interface HamburgerMenuProps {
  isLoggedIn: boolean
  displayName?: string
}

export function HamburgerMenu({ isLoggedIn, displayName }: HamburgerMenuProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {/* Bouton hamburger — touch target 44×44px */}
      <button
        onClick={() => setIsOpen(true)}
        aria-label="Ouvrir le menu"
        aria-expanded={isOpen}
        style={{
          width: '44px', height: '44px',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: '5px',
          background: 'transparent', border: 'none', cursor: 'pointer',
          padding: 0,
        }}
      >
        <span style={{ width: '20px', height: '1.5px', background: 'var(--color-ink)' }} />
        <span style={{ width: '20px', height: '1.5px', background: 'var(--color-ink)' }} />
        <span style={{ width: '20px', height: '1.5px', background: 'var(--color-ink)' }} />
      </button>

      {isOpen && (
        <>
          {/* Overlay */}
          <div
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
            style={{
              position: 'fixed', inset: 0, zIndex: 50,
              background: 'rgba(26,26,26,0.5)',
            }}
          />
          {/* Panneau latéral */}
          <div
            role="dialog"
            aria-label="Menu de navigation"
            style={{
              position: 'fixed', top: 0, right: 0, bottom: 0,
              width: '280px', zIndex: 51,
              background: 'var(--color-surface)',
              display: 'flex', flexDirection: 'column',
              padding: '16px 0',
            }}
          >
            {/* Croix fermeture */}
            <button
              onClick={() => setIsOpen(false)}
              aria-label="Fermer le menu"
              style={{
                alignSelf: 'flex-end', marginRight: '16px',
                width: '44px', height: '44px',
                background: 'transparent', border: 'none',
                cursor: 'pointer', fontSize: '22px',
                color: 'var(--color-ink)',
              }}
            >×</button>

            {/* Liens — 48px de hauteur pour touch target */}
            {[
              { href: '/', label: 'Galerie' },
              { href: '/about', label: 'À propos' },
            ].map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setIsOpen(false)}
                style={{
                  display: 'flex', alignItems: 'center',
                  height: '48px', padding: '0 24px',
                  fontFamily: 'var(--font-space-mono)',
                  fontSize: '14px', fontWeight: 400,
                  textTransform: 'uppercase', letterSpacing: '0.08em',
                  color: 'var(--color-ink)', textDecoration: 'none',
                }}
              >{label}</Link>
            ))}

            {/* Indicateur connexion — même logique que desktop */}
            {isLoggedIn ? (
              <Link
                href="/mon-profil"
                onClick={() => setIsOpen(false)}
                style={{
                  display: 'flex', alignItems: 'center',
                  height: '48px', padding: '0 24px',
                  fontFamily: 'var(--font-space-mono)',
                  fontSize: '14px', textTransform: 'uppercase',
                  letterSpacing: '0.08em', color: 'var(--color-ink)',
                  textDecoration: 'none', gap: '12px',
                }}
              >
                {/* Carré initiale — D-03 borderRadius: 0 */}
                <span style={{
                  width: '28px', height: '28px',
                  background: 'var(--color-ink)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: 0,
                }}>
                  <span style={{ color: '#fff', fontSize: '13px', fontFamily: 'var(--font-space-mono)' }}>
                    {displayName?.[0]?.toUpperCase() ?? '?'}
                  </span>
                </span>
                Mon profil
              </Link>
            ) : (
              <Link
                href="?identify=1"
                onClick={() => setIsOpen(false)}
                style={{
                  display: 'flex', alignItems: 'center',
                  height: '48px', padding: '0 24px',
                  fontFamily: 'var(--font-space-mono)',
                  fontSize: '14px', textTransform: 'uppercase',
                  letterSpacing: '0.08em', color: 'var(--color-ink-muted)',
                  textDecoration: 'none',
                }}
              >S&apos;identifier</Link>
            )}
          </div>
        </>
      )}
    </>
  )
}
```

### Pattern 2: Masquage conditionnel desktop/mobile via `<style>` inline

**What:** Un seul composant contient les deux états (desktop liens + mobile hamburger). CSS @media masque l'un ou l'autre selon la largeur. Aucun JS de détection de viewport nécessaire.

**When to use:** Basculement entre deux rendus visuellement différents pour le même composant.

**Example:**
```tsx
// Dans SiteNav.tsx — ajout d'une balise <style> pour masquer/afficher
<style>{`
  .sitenav-desktop-links { display: flex; }
  .sitenav-hamburger { display: none; }
  @media (max-width: 768px) {
    .sitenav-desktop-links { display: none; }
    .sitenav-hamburger { display: flex; }
  }
`}</style>

{/* Desktop links — classe sitenav-desktop-links */}
<div className="sitenav-desktop-links" style={{ gap: '24px', alignItems: 'center' }}>
  {/* ... liens existants ... */}
</div>

{/* Mobile hamburger — classe sitenav-hamburger */}
<div className="sitenav-hamburger">
  <HamburgerMenu isLoggedIn={isLoggedIn} displayName={session.displayName} />
</div>
```

### Pattern 3: Panneau de navigation mobile avec animation CSS

**What:** Le panneau glisse depuis la droite via `transform: translateX`. Pas de bibliothèque de transitions — CSS pur.

**When to use:** Éléments qui entrent/sortent du viewport horizontalement.

**Example:**
```tsx
// Animation d'entrée via CSS dans le panneau
<style>{`
  @keyframes slideInFromRight {
    from { transform: translateX(100%); }
    to { transform: translateX(0); }
  }
  .hamburger-panel {
    animation: slideInFromRight 0.22s ease-out;
  }
`}</style>
<div className="hamburger-panel" style={{ position: 'fixed', /* ... */ }} />
```

### Pattern 4: Formulaire visible au-dessus du clavier virtuel mobile

**What:** Sur iOS/Android, le clavier virtuel réduit le viewport. `scroll-padding-bottom` avec la valeur `env(keyboard-insets-bottom, 0px)` ou un padding dynamique permet de garder le formulaire visible.

**When to use:** Formulaires avec champs de saisie sur mobile.

**Example:**
```tsx
// Approche CSS-first — dans OfferForm ou son conteneur
// Utiliser scroll-padding-bottom sur le scroll container (info panel)
// OU padding-bottom sur le formulaire lui-même

// Option 1 — CSS pur (fonctionne sur les navigateurs modernes)
<style>{`
  @supports (padding-bottom: env(keyboard-insets-bottom)) {
    .offer-form-container {
      padding-bottom: calc(env(keyboard-insets-bottom, 0px) + 16px);
    }
  }
`}</style>

// Option 2 — scroll-padding-bottom sur le conteneur parent scrollable
// (le panel droit dans artworks/[id]/page.tsx)
<style>{`
  .detail-info-panel {
    scroll-padding-bottom: 80px;
  }
`}</style>
```

**Note pratique:** Sur iOS Safari moderne (≥15.4), `env(keyboard-insets-bottom)` est disponible mais requiert `<meta name="viewport" content="...interactive-widget=resizes-content">`. L'approche la plus compatible reste `scroll-padding-bottom` sur le conteneur scrollable. [ASSUMED — à tester sur appareil réel]

### Pattern 5: Drawer admin pleine largeur sur petits écrans

**What:** Dans `ArtworksClient.tsx`, le drawer utilise `drawerWidth` (useState, min 360px). Sur mobile (< 768px), forcer `width: 100%` et `DRAWER_MIN = 0` via CSS `@media`.

**When to use:** Panneaux latéraux dont la largeur minimale dépasse la largeur de l'écran.

**Example:**
```tsx
// Dans ArtworksClient.tsx — modifier la logique de drawerWidth
// Ajouter un état ou CSS pour forcer 100% sur petits écrans

// Approche CSS (préférée — cohérente avec le pattern du projet)
<style>{`
  @media (max-width: 767px) {
    .admin-drawer-panel {
      width: 100% !important;
    }
    .admin-grid-padding { padding-right: 0 !important; }
  }
`}</style>
```

### Anti-Patterns to Avoid

- **Importer un state manager externe pour le hamburger menu:** `useState` est suffisant — ne pas introduire Zustand ou Context pour cela.
- **Modifier `SiteNav` en Client Component:** SiteNav lit la session async — le convertir en Client Component briserait ce pattern et forcerait un chargement client. HamburgerMenu DOIT être un composant fils séparé.
- **Utiliser `window.innerWidth` pour détecter mobile en JS:** Le CSS `@media` est la bonne approche — aucun JS de détection de viewport.
- **Ajouter `border-radius` au panneau hamburger:** D-03 s'applique aussi au panneau et à l'overlay. Tout `border-radius` non nul viole cette contrainte.
- **Modifier MasonryGrid:** Il est déjà responsive. Ne pas y toucher.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Animation panneau latéral | Bibliothèque de transition | CSS `transform: translateX` + `animation` | Pas de dépendance ; contrôle total ; suffisant pour 280px |
| Détection tactile vs souris | JS `pointer: coarse` detection | CSS `@media (pointer: coarse)` | Le navigateur gère nativement ; pas de JS hydration |
| Clavier virtuel hauteur | `window.visualViewport` listener | CSS `env(keyboard-insets-bottom)` + `scroll-padding-bottom` | CSS-first ; moins fragile sur iOS |
| Fermeture modal sur Escape | Event listener custom | `useEffect` avec `keydown` dans HamburgerMenu | Pattern standard accessibilité |

**Key insight:** Cette phase est 95% CSS. Résister à la tentation d'introduire des dépendances ou du JS complexe pour des problèmes résolus nativement par le navigateur.

---

## Common Pitfalls

### Pitfall 1: SiteNav converti en Client Component par erreur

**What goes wrong:** Pour ajouter `useState` dans SiteNav, le développeur ajoute `'use client'` en haut du fichier. `getVisitorSession()` (qui appelle `cookies()`) ne fonctionne plus — erreur au build.
**Why it happens:** Confusion entre le composant parent (async Server) et son enfant interactif (Client).
**How to avoid:** Ne jamais modifier `SiteNav.tsx` pour y mettre `'use client'`. Créer `HamburgerMenu.tsx` séparé comme Client Component.
**Warning signs:** Build error "You're importing a component that needs `useState`. It only works in a Client Component but none of its parents are marked with `'use client'`."

### Pitfall 2: z-index insuffisant pour l'overlay hamburger

**What goes wrong:** L'overlay du hamburger menu passe sous certains éléments (BackgroundDecor a `z-index: 0`, SiteNav a `z-index: 10`). Le panneau latéral doit être au-dessus de tout, y compris la SiteNav sticky.
**Why it happens:** Les contextes d'empilement créent des surprises.
**How to avoid:** Overlay à `z-index: 50`, panneau à `z-index: 51`, SiteNav reste à `z-index: 10`. Le panneau et l'overlay sont en `position: fixed` — ils créent leur propre contexte d'empilement hors du flow.
**Warning signs:** Overlay visible mais éléments de la SiteNav still clickables derrière.

### Pitfall 3: Touch target insuffisant sur le bouton hamburger

**What goes wrong:** Le bouton hamburger est visuellement petit (20×16px icône) mais le touch target doit être 44×44px minimum.
**Why it happens:** Confusion entre la taille visuelle de l'icône et la taille du bouton cliquable.
**How to avoid:** Le bouton `<button>` fait 44×44px ; l'icône (lignes SVG ou spans) est plus petite, centrée dans ce bouton.
**Warning signs:** Tests sur vrais appareils mobiles où le bouton est difficile à tapper.

### Pitfall 4: `position: fixed` et scrollbar sur iOS

**What goes wrong:** Sur iOS, quand le panneau hamburger est ouvert et qu'on scroll le body derrière l'overlay, le fond scrolle (scroll-through). L'overlay bloque visuellement mais pas le scroll.
**Why it happens:** iOS ne supporte pas nativement `overflow: hidden` sur `body` de façon fiable.
**How to avoid:** Quand le panneau est ouvert, appliquer `document.body.style.overflow = 'hidden'` dans un `useEffect`. Bien nettoyer dans le cleanup du `useEffect` (ou à la fermeture du panneau).
**Warning signs:** Fond galerie scrollable derrière l'overlay ouvert sur iPhone.

### Pitfall 5: Drawer admin width forcé à 0 sur mobile

**What goes wrong:** Sur mobile (< 375px), un drawer de 360px prend plus de place que l'écran. L'utilisateur ne peut pas voir la grille d'œuvres.
**Why it happens:** `DRAWER_MIN = 360` est une constante JS — le CSS `@media` ne l'overriderait pas si la largeur est injectée en style inline.
**How to avoid:** Utiliser une classe CSS `.admin-drawer-mobile` avec `width: 100% !important; min-width: 0 !important` sous `@media (max-width: 767px)`. Le `!important` est nécessaire car `width` est défini en style inline.
**Warning signs:** Le drawer s'affiche mais déborde hors de l'écran.

### Pitfall 6: Panneau hamburger bloqué derrière le bottom safe area sur iPhone

**What goes wrong:** Sur iPhone avec encoche/Dynamic Island, le contenu du bas du panneau hamburger est coupé par la zone sûre du système.
**Why it happens:** `padding-bottom: 0` sur le panneau — la home bar occupe env. 34px en bas.
**How to avoid:** `padding-bottom: env(safe-area-inset-bottom, 16px)` sur le panneau latéral.
**Warning signs:** Le dernier lien du menu est partiellement caché.

### Pitfall 7: `artworks/[id]/page.tsx` — info panel sticky sur mobile

**What goes wrong:** En mode 1-colonne mobile, le panel info a `position: sticky; top: 0; maxHeight: 100vh` — ce comportement a du sens en 2-col desktop mais sur mobile il confine le panel dans 100vh scroll, pouvant cacher le formulaire d'offre.
**Why it happens:** Les règles sticky/maxHeight ne sont pas wrappées dans un media query desktop-only.
**How to avoid:** Vérifier le comportement actuel sur mobile. Si problématique, ajouter `@media (max-width: 1023px) { .detail-info-panel { position: static; max-height: none; } }` dans la balise `<style>` existante.
**Warning signs:** Impossible de scroller jusqu'au bouton "Faire une offre" sur iPhone.

---

## Code Examples

### Masquage conditionnel avec `<style>` inline (pattern existant du projet)

```tsx
// Source : pattern établi dans MasonryGrid.tsx et artworks/[id]/page.tsx
<style>{`
  .sitenav-desktop-links { display: flex; }
  .sitenav-hamburger { display: none; }

  @media (max-width: 768px) {
    .sitenav-desktop-links { display: none; }
    .sitenav-hamburger { display: flex; }
  }
`}</style>
```

### Prévention du scroll body pendant l'overlay (iOS fix)

```tsx
// Source : pattern React standard [ASSUMED]
import { useEffect } from 'react'

// Dans HamburgerMenu.tsx
useEffect(() => {
  if (isOpen) {
    // Bloquer le scroll du body quand le panneau est ouvert
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = ''
  }
  // Cleanup : restaurer le scroll à la destruction du composant
  return () => { document.body.style.overflow = '' }
}, [isOpen])
```

### Fermeture du panneau sur Escape (accessibilité clavier)

```tsx
// Source : pattern standard accessibilité [ASSUMED]
useEffect(() => {
  if (!isOpen) return
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') setIsOpen(false)
  }
  document.addEventListener('keydown', onKey)
  return () => document.removeEventListener('keydown', onKey)
}, [isOpen])
```

### CSS safe area iPhone (panneau hamburger)

```css
/* Source : MDN env() [ASSUMED] */
.hamburger-panel {
  padding-bottom: env(safe-area-inset-bottom, 16px);
}
```

---

## Existing Code — État réel du responsive

### Ce qui est déjà en place (NE PAS MODIFIER)

| Composant | Responsive existant | Vérification |
|-----------|--------------------|-|
| `MasonryGrid.tsx` | 3 col ≥1024px / 2 col ≤1023px / 1 col ≤767px | VÉRIFIÉ — code lu |
| `artworks/[id]/page.tsx` | grid 2-col desktop / 1-col ≤1023px via `<style>` inline | VÉRIFIÉ — code lu |
| `globals.css` (.pof-gallery .split) | `@media (max-width: 1023px) { grid-template-columns: 1fr; }` | VÉRIFIÉ — code lu |

### Ce qui a besoin d'attention

| Composant | Problème identifié | Action Phase 8 |
|-----------|-------------------|----------------|
| `SiteNav.tsx` | Aucun breakpoint responsive — liens 11px non adaptés mobile | Créer `HamburgerMenu.tsx` + masquage CSS |
| `ArtworksClient.tsx` | `DRAWER_MIN = 360` — drawer déborde sur écran < 375px | CSS @media force `width: 100%` sur < 768px |
| `artworks/[id]/page.tsx` | Panel sticky `maxHeight: 100vh` peut bloquer l'offre form sur mobile | Vérifier + corriger si nécessaire |
| `OfferForm.tsx` | Pas de gestion du clavier virtuel | `scroll-padding-bottom` sur conteneur parent |
| `FilterBar.tsx` | `flexWrap: 'wrap'` — chips passent à la ligne, pas scrollable | Ajouter `overflow-x: auto; flexWrap: 'nowrap'` sur mobile |
| Boutons interactifs généraux | Touch targets potentiellement < 44px | Audit + padding |

### ArtworksClient.tsx — drawer: analyse précise

Le drawer utilise `width: drawerWidth` en style inline (React state). Il n'y a PAS de variable CSS ni de classe CSS pour le width — c'est du JS pur. Pour forcer 100% sur mobile, deux options :

1. **Option CSS `!important`** (cohérente avec le pattern du projet) : classe `.admin-drawer-panel` + règle `@media (max-width: 767px) { .admin-drawer-panel { width: 100% !important; } }`.
2. **Option JS** : lire `window.innerWidth` au montage et setter `drawerWidth = window.innerWidth` si < 768px.

Option 1 recommandée — pas de JS côté client supplémentaire, cohérente avec le pattern.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Bottom navigation bar mobile | Hamburger menu glissant | Decision Phase 8 | Meilleure continuité avec le design galerie |
| Overlay click-through iOS (position:fixed) | `document.body.style.overflow = 'hidden'` | Standard actuel | Empêche le scroll du fond |
| `window.innerHeight` resize listener | `env(keyboard-insets-bottom)` CSS | iOS 15.4+ / Chrome 113+ | Moins de JS, plus robuste |
| Tailwind responsive classes | `<style>` + `@media` inline | Établi Phase 3 projet | Pattern de ce projet — ne pas changer |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `env(keyboard-insets-bottom)` disponible sur iOS 15.4+ et Chrome 113+ | Patterns, Pitfalls | Si non supporté → fallback JS nécessaire |
| A2 | `document.body.style.overflow = 'hidden'` bloque le scroll iOS suffisamment | Pitfall 4 | Sur certains iOS anciens, peut ne pas fonctionner → fallback `position: fixed; width: 100%` sur body |
| A3 | `artworks/[id]/page.tsx` panel sticky + `maxHeight: 100vh` bloque le scroll vers OfferForm sur mobile | Code Analysis | Si ça marche déjà → aucune action requise sur ce composant |
| A4 | Le panneau hamburger à 280px fixe est suffisant sur tablette étroite (768px) | Architecture | Si trop étroit → ajustement à 320px ou % de viewport |

**Si ce tableau est vide, toutes les affirmations ont été vérifiées ou citées — aucune confirmation utilisateur requise. Ce tableau n'est pas vide** — A3 en particulier doit être testé sur appareil réel avant/pendant implémentation.

---

## Open Questions

1. **Comportement actuel du panel sticky sur mobile**
   - Ce qu'on sait : `artworks/[id]/page.tsx` ligne 380 — `position: sticky; top: 0; maxHeight: 100vh` sur le panel info
   - Ce qui est flou : Est-ce que ce style est actif en mode 1-colonne (<1024px) ? Le panel devient-il 2ème élément empilé (stacked) — dans ce cas sticky est ignoré. À vérifier sur appareil réel.
   - Recommandation : Plan doit inclure une tâche "vérifier + corriger si nécessaire".

2. **Animation du panneau hamburger (CSS animation vs CSS transition)**
   - Ce qu'on sait : l'animation doit être "glissant depuis la droite"
   - Ce qui est flou : Préférer `animation: slideIn` (1 seul état) ou `transition: transform` (basculement entre 2 classes) ?
   - Recommandation : `animation` CSS sur le panneau à l'apparition est plus simple — pas besoin de gérer l'état "en train de fermer".

---

## Environment Availability

Cette phase n'a pas de dépendances externes — uniquement des modifications de fichiers TypeScript/CSS existants. Section ignorée.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (déjà installé — utilisé dans toutes les phases précédentes) |
| Config file | `vitest.config.ts` (racine du projet) |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

Cette phase est UI-only (responsive CSS + Client Component). Les tests automatisés ont une valeur limitée pour vérifier l'apparence sur mobile — les tests manuels sur appareil réel sont essentiels.

| Comportement | Test Type | Automated Command | Notes |
|-------------|-----------|-------------------|-------|
| HamburgerMenu s'ouvre/ferme (useState) | unit | `npx vitest run --reporter=verbose src/components/layout/HamburgerMenu.test.tsx` | Test React Testing Library + jsdom |
| Overlay onClick déclenche fermeture | unit | idem | |
| Escape key ferme le panneau | unit | idem | |
| body overflow bloqué quand ouvert | unit | idem | |
| SiteNav passe les props isLoggedIn correctement | unit | `npx vitest run --reporter=verbose src/components/layout/SiteNav.test.tsx` | Nécessite mock getVisitorSession |
| Responsive CSS — visuel mobile | manual | N/A | DevTools 375px + appareil réel |
| Touch targets ≥ 44px | manual | N/A | Vérification visuelle DevTools |
| Panneau n'a aucun border-radius (D-03) | unit snapshot | Dans HamburgerMenu.test.tsx | Snapshot ou assertion sur style |

### Sampling Rate

- **Par commit de task:** `npx vitest run src/components/layout/`
- **Par wave merge:** `npx vitest run`
- **Phase gate:** Suite complète verte + vérification manuelle sur DevTools mobile (375px iPhone SE)

### Wave 0 Gaps

- [ ] `src/components/layout/HamburgerMenu.test.tsx` — tests unitaires du nouveau composant
- [ ] `src/components/layout/SiteNav.test.tsx` — si inexistant, tests de rendu server component avec mock session

*(Si tests layout déjà existants : vérifier leur présence avant de créer)*

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | non | Aucune logique auth dans cette phase |
| V3 Session Management | non | Session lue (Server Component) mais pas modifiée |
| V4 Access Control | non | Admin route protection inchangée |
| V5 Input Validation | non | Aucun nouveau champ de saisie |
| V6 Cryptography | non | Pas de cryptographie |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| XSS via `displayName` dans HamburgerMenu | Tampering | React escape automatique — pas de `dangerouslySetInnerHTML` |
| Clickjacking via overlay | Spoofing | N/A — overlay dans le même domaine |

**Note sécurité:** Le composant `HamburgerMenu` reçoit `displayName` comme prop depuis un Server Component qui lit la session iron-session (cookie chiffré). Aucun risque XSS supplémentaire par rapport à l'existant — React échappe automatiquement les valeurs dans JSX.

---

## Sources

### Primary (HIGH confidence)

- `src/components/layout/SiteNav.tsx` — code lu directement [VERIFIED: codebase]
- `src/components/gallery/MasonryGrid.tsx` — pattern `<style>` + @media confirmé [VERIFIED: codebase]
- `src/app/artworks/[id]/page.tsx` — layout 2-col / 1-col déjà implémenté [VERIFIED: codebase]
- `src/app/admin/artworks/_components/ArtworksClient.tsx` — `DRAWER_MIN = 360`, style inline width [VERIFIED: codebase]
- `src/components/artwork/OfferForm.tsx` — pas de gestion clavier virtuel actuellement [VERIFIED: codebase]
- `src/components/gallery/FilterBar.tsx` — `flexWrap: 'wrap'` sans scroll horizontal [VERIFIED: codebase]
- `.planning/phases/08-responsive-mobile-tablette/08-CONTEXT.md` — toutes les décisions D-01 à D-03 [VERIFIED: codebase]
- `src/app/globals.css` — `.pof-gallery .split` a déjà un @media 1023px [VERIFIED: codebase]

### Secondary (MEDIUM confidence)

- Pattern async Server Component + Client Component child : documenté dans STATE.md (décision 05-05) et le code existant ModalTrigger [VERIFIED: codebase]

### Tertiary (LOW confidence — marqués ASSUMED)

- Comportement `env(keyboard-insets-bottom)` sur iOS [ASSUMED]
- Comportement `document.body.style.overflow = 'hidden'` sur iOS [ASSUMED]
- Rendu actuel du panel sticky artworks/[id] sur mobile [ASSUMED — à tester]

---

## Metadata

**Confidence breakdown:**
- Analyse du code existant: HIGH — tous les fichiers pertinents ont été lus
- Patterns CSS à implémenter: HIGH — pattern `<style>` + @media établi et clair
- Comportement mobile (virtual keyboard, safe area): MEDIUM/LOW — requiert test sur appareil réel
- Architecture HamburgerMenu: HIGH — pattern Server+Client Component identique à ModalTrigger/SiteNav existant

**Research date:** 2026-06-07
**Valid until:** 2026-07-07 (stable — aucune dépendance externe susceptible de changer)
