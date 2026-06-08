# Phase 9 : Responsive — Pages restantes — Pattern Map

**Mapped:** 2026-06-08
**Files analyzed:** 6
**Analogs found:** 6 / 6

---

## File Classification

| Fichier nouveau/modifié | Rôle | Data Flow | Analogue le plus proche | Qualité du match |
|-------------------------|------|-----------|-------------------------|-----------------|
| `src/components/gallery/FilterBar.tsx` | component (refactor) | event-driven | `src/components/layout/HamburgerMenu.tsx` | exact (Client Component + `<style>`/@media + panneau overlay) |
| `src/app/page.tsx` | page (intégration) | request-response | lui-même (déjà Server Component) | role-match |
| `src/app/about/page.tsx` | page (ajustement CSS) | request-response | lui-même (style inline + `<style>`/@media déjà en place) | exact |
| `src/app/mon-profil/page.tsx` | page (ajustement CSS) | request-response | `src/app/about/page.tsx` (même pattern inline + @media) | role-match |
| `src/app/admin/upload/_components/DocumenterClient.tsx` | component (CSS only) | event-driven | `src/app/globals.css` `.pof-gallery .split` + `src/app/admin/artworks/[id]/page.tsx` | role-match |
| `src/app/admin/artworks/[id]/page.tsx` | page (ajustement CSS) | request-response | `src/app/about/page.tsx` (style inline + `<style>`) | role-match |

---

## Pattern Assignments

### `src/components/gallery/FilterBar.tsx` (component, event-driven) — REFACTOR MAJEUR

**Analogue :** `src/components/layout/HamburgerMenu.tsx`

**Contexte :** La FilterBar actuelle (Phase 8) est un Client Component avec scroll horizontal sur mobile. Phase 9 ajoute un bouton "Filtres ▾" compact sur mobile qui ouvre un tiroir (bottom sheet ou panneau). Les chips existants sont déplacés dans ce tiroir. Le comportement desktop (chips wrappés) reste inchangé.

**Imports pattern** (HamburgerMenu.tsx lignes 1-23) :
```tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
```
Pour FilterBar, l'import sera :
```tsx
'use client'

import { useState, useEffect } from 'react'
import type { ArtworkType, Medium } from '@/db/schema'
```

**Pattern useState + useEffect overflow** (HamburgerMenu.tsx lignes 37-68) :
```tsx
const [isOpen, setIsOpen] = useState(false)

// Bloquer le scroll du body quand le panneau est ouvert (iOS fix)
useEffect(() => {
  if (isOpen) {
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = ''
  }
  return () => {
    document.body.style.overflow = ''
  }
}, [isOpen])

// Fermer sur Escape — accessibilité clavier
useEffect(() => {
  if (!isOpen) return
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') setIsOpen(false)
  }
  document.addEventListener('keydown', onKey)
  return () => document.removeEventListener('keydown', onKey)
}, [isOpen])
```

**Pattern `<style>` + @media masquage conditionnel** (HamburgerMenu.tsx lignes 73-81 + SiteNav pattern 08-RESEARCH.md) :
```tsx
<style>{`
  /* Bouton compact — visible uniquement sur mobile */
  .filterbar-mobile-btn { display: flex; }
  /* Chips desktop — masqués sur mobile */
  .filterbar-desktop-chips { display: flex; }

  @media (max-width: 768px) {
    .filterbar-mobile-btn { display: flex; }
    .filterbar-desktop-chips { display: none; }
  }
  @media (min-width: 769px) {
    .filterbar-mobile-btn { display: none; }
    .filterbar-desktop-chips { display: flex; }
  }

  /* Animation bottom sheet (même keyframe que HamburgerMenu) */
  @keyframes slideInFromBottom {
    from { transform: translateY(100%); }
    to   { transform: translateY(0); }
  }
  .filterbar-sheet {
    animation: slideInFromBottom 0.22s ease-out;
  }
`}</style>
```

**Pattern bouton mobile touch target 44px** (HamburgerMenu.tsx lignes 89-111) :
```tsx
{/* Bouton "Filtres ▾" — touch target 44px min, D-03 pas de borderRadius */}
<button
  onClick={() => setIsOpen(true)}
  aria-label="Ouvrir les filtres"
  aria-expanded={isOpen}
  style={{
    height: '44px',
    padding: '0 16px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: activeFilter !== 'all' ? 'var(--color-teal)' : 'var(--color-surface)',
    border: '1px solid rgba(0,0,0,0.12)',
    cursor: 'pointer',
    borderRadius: 0, // D-03 obligatoire
    fontFamily: 'var(--font-space-mono)',
    fontSize: '12px',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: activeFilter !== 'all' ? '#fff' : 'var(--color-ink)',
  }}
>
  Filtres
  {/* Badge de comptage quand filtres actifs */}
  {activeFilter !== 'all' && (
    <span style={{
      background: 'rgba(255,255,255,0.25)',
      padding: '2px 6px',
      fontSize: '11px',
      borderRadius: 0, // D-03
    }}>
      · 1
    </span>
  )}
</button>
```

**Pattern overlay + panneau** (HamburgerMenu.tsx lignes 114-304) :
```tsx
{isOpen && (
  <>
    {/* Overlay semi-transparent — z-index 50, aria-hidden */}
    <div
      onClick={() => setIsOpen(false)}
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        background: 'rgba(26,26,26,0.5)',
        // D-03 : pas de borderRadius
      }}
    />

    {/* Bottom sheet — depuis le bas, pleine largeur, z-index 51 */}
    <div
      role="dialog"
      aria-label="Filtres de la galerie"
      className="filterbar-sheet"
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 51,
        background: 'var(--color-surface)',
        borderRadius: 0, // D-03 obligatoire
        padding: '16px 24px',
        paddingBottom: 'env(safe-area-inset-bottom, 16px)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
    >
      {/* Croix fermeture — touch target 44×44px, alignée à droite */}
      <button
        onClick={() => setIsOpen(false)}
        aria-label="Fermer les filtres"
        style={{
          alignSelf: 'flex-end',
          width: '44px',
          height: '44px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          fontSize: '22px',
          color: 'var(--color-ink)',
          lineHeight: 1,
        }}
      >×</button>

      {/* Chips dans le tiroir — flexWrap: wrap (pas de scroll ici) */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
        {chips.map(/* même map que l'actuel FilterBar */)}
      </div>
    </div>
  </>
)}
```

**Chips desktop inchangés** (FilterBar.tsx lignes 32-108 — conserver intégralement) :
```tsx
// Section desktop : chips wrappés, comportement Phase 8 inchangé
<div className="filterbar-desktop-chips filterbar-container">
  {chips.map((c) => (
    <button key={c.id} /* ... styles existants inchangés ... */ />
  ))}
</div>
```

---

### `src/app/page.tsx` (page, request-response) — INTÉGRATION MINEURE

**Analogue :** lui-même

**Contexte :** `page.tsx` passe `types`, `mediums`, `activeFilter` à `GalleryClient` qui lui-même rend `FilterBar`. L'intégration du nouveau bouton mobile est transparente — `FilterBar` gère l'UI mobile en interne. Aucune modification de `page.tsx` n'est requise à moins que `GalleryClient` ne soit restructuré.

**Pattern Server Component → Client Component passthrough** (page.tsx lignes 147-155) :
```tsx
<Suspense fallback={<GalleryLoadingSkeleton />}>
  <GalleryClient
    artworks={artworksWithUrls}
    types={types}          // ← transmis tel quel à FilterBar
    mediums={allMediums}   // ← transmis tel quel à FilterBar
    visitorId={visitorId}
    savedArtworkIds={savedArtworkIds}
  />
</Suspense>
```

**Si GalleryClient passe `searchParams` à FilterBar** — vérifier `src/components/gallery/GalleryClient.tsx` pour confirmer que `activeFilter` reste le même prop. Aucun changement de signature de `FilterBar` n'est prévu.

---

### `src/app/about/page.tsx` (page, request-response) — AJUSTEMENTS PADDING

**Analogue :** lui-même

**Contexte :** La page a déjà un `<style>` avec `@media (max-width: 1023px)`. Il faut ajouter les règles mobiles pour les paddings.

**Pattern `<style>` existant à étendre** (about/page.tsx lignes 23-35) :
```tsx
<style>{`
  .about-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    min-height: calc(100vh - 56px);
  }
  @media (max-width: 1023px) {
    .about-grid {
      grid-template-columns: 1fr;
    }
  }
`}</style>
```

**Ajout des règles mobiles** — étendre le `<style>` existant (ne pas créer un deuxième `<style>`) :
```tsx
<style>{`
  .about-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    min-height: calc(100vh - 56px);
  }
  @media (max-width: 1023px) {
    .about-grid {
      grid-template-columns: 1fr;
    }
  }
  /* Ajout Phase 9 — réduction paddings sur mobile */
  @media (max-width: 768px) {
    .about-text-col {
      padding: 32px 24px;
    }
    .about-text-col h1 {
      font-size: 22px; /* réduit de 28px */
    }
    .about-photo-col {
      padding: 24px;
      min-height: 280px;
    }
  }
`}</style>
```

**Styles inline à migrer vers className** (about/page.tsx lignes 39-103) :
- `div` colonne gauche (ligne 40) → ajouter `className="about-photo-col"`
- `div` colonne droite (ligne 66) → ajouter `className="about-text-col"`
- Les `padding: '48px 40px'` desktop restent inline, les overrides mobiles viennent du `<style>` @media

---

### `src/app/mon-profil/page.tsx` (page, request-response) — AJUSTEMENTS SPACING

**Analogue :** `src/app/about/page.tsx`

**Contexte :** La page est déjà en colonne unique (maxWidth 680px). Ajustements : padding top réduit sur mobile, flex-row titre+montant des offres adapté sur très petit écran, grille saved artworks 1 colonne si nécessaire.

**Pattern `<style>` à ajouter** — la page n'a pas encore de balise `<style>`. L'ajouter au début du `return` :
```tsx
<style>{`
  /* Réduction padding top sur mobile */
  @media (max-width: 768px) {
    .profil-main {
      padding-top: 24px;
    }
    /* Liste offres : si titre trop long, passer en 2 lignes */
    .profil-offer-row {
      flex-wrap: wrap;
    }
    /* Grille œuvres enregistrées : 2 colonnes minimum sur petit écran */
    .profil-saved-grid {
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    }
  }
`}</style>
```

**Styles inline cibles** (mon-profil/page.tsx) :
- `<main>` ligne 64 : ajouter `className="profil-main"` — le `padding: '48px 24px 80px'` devient l'état desktop, l'@media override le padding-top sur mobile
- `<div>` flex row offre (ligne 149) : ajouter `className="profil-offer-row"` — permet wrap sur très petit écran
- `<div>` grille saved (ligne 241) : ajouter `className="profil-saved-grid"` — `gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))'` reste inline pour desktop, @media réduit le minmax à 140px

**Contrainte D-07** : la liste offres en flex-row (titre + montant) reste `flex-wrap: wrap` plutôt que de passer en 2 lignes forcées — le wrap naturel gère le cas d'un très long titre.

---

### `src/app/admin/upload/_components/DocumenterClient.tsx` (component, event-driven) — CSS ONLY

**Analogue :** `src/app/globals.css` (section `.pof-gallery`) + `src/app/admin/artworks/[id]/page.tsx`

**Contexte :** DocumenterClient utilise les classes CSS `.pof-gallery .split`, `.image-col`, `.form-col` définies dans `globals.css`. La règle `@media (max-width: 1023px)` existe déjà pour passer en 1 colonne. Il faut ajouter les règles pour mobile (padding réduit, `form-col` non-sticky) et réordonner image-col avant form-col (ce qui est déjà le cas dans le HTML — D-09 satisfait).

**Layout CSS existant à étendre** (globals.css lignes 618-634) :
```css
/* Existant — NE PAS MODIFIER */
.pof-gallery .split {
  position: relative; z-index: 1;
  display: grid; grid-template-columns: 1fr 460px;
  border-top: 1px solid rgba(0,0,0,0.08); flex: 1;
}
@media (max-width: 1023px) { .pof-gallery .split { grid-template-columns: 1fr; } }

.pof-gallery .image-col {
  padding: 40px 32px 56px; background: var(--color-bg);
  display: flex; flex-direction: column; gap: 18px;
}
.pof-gallery .form-col {
  background: var(--color-surface); padding: 32px 32px 0;
  position: sticky; top: 56px; align-self: start;
  max-height: calc(100vh - 56px); overflow-y: auto;
}
```

**Ajout Phase 9 dans globals.css** — après la règle @media 1023px existante :
```css
/* Phase 9 — mobile adjustments pour upload */
@media (max-width: 768px) {
  .pof-gallery .image-col {
    padding: 24px 16px 32px;
  }
  .pof-gallery .form-col {
    /* Annuler le sticky sur mobile — formulaire empilé normalement */
    position: static;
    max-height: none;
    padding: 24px 16px 80px;
  }
  .pof-gallery .hero {
    padding: 24px 16px 20px;
    flex-direction: column;
    align-items: flex-start;
  }
  .pof-gallery .hero h1 {
    font-size: 26px;
  }
  .pof-gallery .row-2 {
    /* 2 colonnes sur tablette/mobile si largeur suffisante, 1 col sinon */
    grid-template-columns: 1fr;
  }
}
```

**IMPORTANT :** Toutes les modifications pour DocumenterClient se font dans `globals.css`, pas dans `DocumenterClient.tsx`. Le composant lui-même (logique, JSX) est inchangé — D-08/D-09 sont purement des ajustements CSS.

---

### `src/app/admin/artworks/[id]/page.tsx` (page, request-response) — AJUSTEMENTS CSS

**Analogue :** `src/app/about/page.tsx` (pattern `<style>` + @media inline)

**Contexte :** Le hero split utilise `grid-template-columns: 'minmax(0, 1fr) 400px'` en style inline (ligne 227). La grille métadonnées `ArtworkEditForm` utilise 6 colonnes. Il faut passer en 1 colonne sur tablette/mobile.

**Pattern `<style>` à ajouter** — la page n'a pas de balise `<style>` dédiée au responsive. L'ajouter dans le JSX après `<BackgroundDecor />` :

```tsx
{/* Responsive breakpoints — <style> inline pattern projet (08-RESEARCH.md) */}
<style>{`
  /* Hero split : 1 colonne sur tablette ≤1023px */
  @media (max-width: 1023px) {
    .admin-detail-hero {
      grid-template-columns: 1fr !important;
    }
  }
  /* Padding main réduit sur tablette */
  @media (max-width: 1023px) {
    .admin-detail-main {
      padding: 24px 20px 60px;
    }
  }
  /* Padding encore réduit sur mobile */
  @media (max-width: 768px) {
    .admin-detail-main {
      padding: 16px 16px 60px;
    }
  }
`}</style>
```

**Style inline hero à migrer vers className** (admin/artworks/[id]/page.tsx lignes 225-231) :
```tsx
{/* AVANT — style inline pur */}
<section style={{
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) 400px',
  gap: 40,
  marginBottom: 56,
}}>

{/* APRÈS — ajouter className, style inline reste pour desktop */}
<section
  className="admin-detail-hero"
  style={{
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) 400px',
    gap: 40,
    marginBottom: 56,
  }}
>
```

**Style inline main à migrer vers className** (admin/artworks/[id]/page.tsx lignes 153-158) :
```tsx
{/* AVANT */}
<main style={{
  padding: '44px 32px 80px',
  maxWidth: 1200,
  margin: '0 auto',
  fontFamily: 'var(--font-geist-sans)',
}}>

{/* APRÈS */}
<main
  className="admin-detail-main"
  style={{
    padding: '44px 32px 80px',
    maxWidth: 1200,
    margin: '0 auto',
    fontFamily: 'var(--font-geist-sans)',
  }}
>
```

**Concernant `ArtworkEditForm`** — le formulaire 6 colonnes est dans `src/app/admin/artworks/[id]/_components/ArtworkEditForm.tsx`. Selon D-10, il passe en 2 colonnes sur tablette et 1 colonne sur mobile. Les modifications CSS de ce composant suivent le même pattern `<style>` + className.

---

## Shared Patterns

### Pattern `<style>` inline + @media

**Source :** `src/components/gallery/FilterBar.tsx` lignes 47-67 (implémentation Phase 8) + `src/app/about/page.tsx` lignes 23-35
**Appliquer à :** Tous les fichiers de cette phase

```tsx
// Toujours une seule balise <style> par composant/page
// Toujours en CSS-first — pas de Tailwind responsive
<style>{`
  .nom-classe-desktop { /* règles desktop par défaut */ }
  @media (max-width: 1023px) { .nom-classe-tablette { /* ... */ } }
  @media (max-width: 768px)  { .nom-classe-mobile   { /* ... */ } }
`}</style>
```

### Pattern `borderRadius: 0` partout (D-03)

**Source :** `src/components/layout/HamburgerMenu.tsx` lignes 105, 129, 157, 264
**Appliquer à :** Tous les nouveaux éléments visuels — bouton mobile FilterBar, tiroir bottom sheet, badges

```tsx
style={{
  // TOUJOURS explicite — pas d'omission silencieuse
  borderRadius: 0,
}}
```

### Pattern touch target 44×44px minimum

**Source :** `src/components/layout/HamburgerMenu.tsx` lignes 93-107 (bouton hamburger) + lignes 160-181 (croix fermeture)
**Appliquer à :** Bouton "Filtres ▾" + croix fermeture du tiroir

```tsx
style={{
  height: '44px',      // minimum 44px
  minWidth: '44px',    // si bouton compact
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}}
```

### Pattern overlay + safe area iOS

**Source :** `src/components/layout/HamburgerMenu.tsx` lignes 120-131 (overlay) + ligne 155 (safe area)
**Appliquer à :** Tiroir FilterBar bottom sheet

```tsx
// Overlay
style={{
  position: 'fixed', inset: 0, zIndex: 50,
  background: 'rgba(26,26,26,0.5)',
}}

// Panneau / bottom sheet
style={{
  paddingBottom: 'env(safe-area-inset-bottom, 16px)',
  zIndex: 51,
}}
```

### Pattern commentaires en français

**Source :** Tous les fichiers existants — CLAUDE.md exige des commentaires en français sur chaque fonction/section
**Appliquer à :** Tout nouveau code

```tsx
/**
 * NomComposant — Description courte.
 *
 * POURQUOI cette approche ?
 * Explication de la décision architecturale.
 * [Référence à la contrainte design si pertinent]
 */
```

---

## Fichiers sans analogue codebase (N/A)

Aucun — tous les fichiers modifiés ont un analogue direct. Le pattern `<style>` + @media est universel dans ce projet.

---

## Metadata

**Scope de recherche :** `src/components/layout/`, `src/components/gallery/`, `src/app/about/`, `src/app/mon-profil/`, `src/app/admin/upload/`, `src/app/admin/artworks/[id]/`, `src/app/globals.css`
**Fichiers lus :** 9 fichiers sources + globals.css (section .pof-gallery)
**Date extraction patterns :** 2026-06-08

### Breakpoints établis (à utiliser tels quels)

| Token | Valeur | Usage |
|-------|--------|-------|
| mobile | `max-width: 768px` | Bouton FilterBar compact, padding réduit pages |
| tablette | `max-width: 1023px` | Hero split → 1 col, formulaire admin 2 col |
| desktop | `min-width: 1024px` | Comportements Phase 8 inchangés |

### Contraintes design rappel exécuteur

| Contrainte | Règle | Source |
|------------|-------|--------|
| D-03 | `borderRadius: 0` ou `border-radius: 0` PARTOUT — bouton, tiroir, badges | 03-CONTEXT.md |
| D-05 | D-12/D-13 | Touch targets ≥ 44×44px | 08-UI-SPEC.md |
| D-14 | `<style>` inline + @media — jamais classes Tailwind responsive | 08-RESEARCH.md |
| D-15 | Commentaires français — CLAUDE.md | CLAUDE.md |
