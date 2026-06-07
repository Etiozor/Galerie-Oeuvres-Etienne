---
phase: 08-responsive-mobile-tablette
reviewed: 2026-06-07T00:00:00Z
depth: standard
files_reviewed: 6
files_reviewed_list:
  - src/components/layout/HamburgerMenu.tsx
  - src/components/layout/HamburgerMenu.test.tsx
  - src/components/layout/SiteNav.tsx
  - src/app/admin/artworks/_components/ArtworksClient.tsx
  - src/components/gallery/FilterBar.tsx
  - src/app/artworks/[id]/page.tsx
findings:
  critical: 0
  warning: 3
  info: 4
  total: 7
status: issues_found
---

# Phase 08 : Code Review Report

**Reviewed:** 2026-06-07
**Depth:** standard
**Files Reviewed:** 6
**Status:** issues_found

## Summary

Phase 8 ajoute le support responsive mobile/tablette via HamburgerMenu, des `@media` CSS inline, et quelques ajustements de layout sur la page détail et le back-office admin. Le code est globalement bien structuré, commenté en français, et respecte les contraintes de design (D-03, D-02). Aucun problème de sécurité critique n'a été détecté.

Trois avertissements sont relevés : un bug de focus-trap manquant dans HamburgerMenu qui nuit à l'accessibilité clavier, un risque de desynchronisation d'état dans le drawer admin si `startTransition` est appelé sans `await`, et un potentiel débordement de layout sur mobile très étroit dans `artworks/[id]/page.tsx`. Quatre points informatifs concernent la duplication de styles de liens, un test qui ne vérifie pas la fermeture du panneau après navigation, et deux magic numbers sans constante nommée.

---

## Warnings

### WR-01: HamburgerMenu — focus-trap absent, le focus s'échappe du panneau au clavier

**File:** `src/components/layout/HamburgerMenu.tsx:140`

**Issue:** Quand le panneau est ouvert, appuyer sur Tab permet au focus de sortir du `role="dialog"` et d'atteindre les éléments de la page en dessous (y compris les éléments cachés par l'overlay). ARIA 1.1 exige qu'un dialog modal confine le focus à ses éléments interactifs. Sans focus-trap, un utilisateur au clavier ne peut pas fermer le panneau proprement et accède à des éléments inaccessibles visuellement.

**Fix:** Ajouter un `useEffect` qui confine Tab/Shift+Tab aux éléments focusables du panneau, en cohérence avec le listener `Escape` déjà en place (lignes 61-68) :

```tsx
useEffect(() => {
  if (!isOpen) return
  // Sélectionner tous les éléments focusables dans le panneau
  const panel = document.querySelector('[role="dialog"]') as HTMLElement | null
  if (!panel) return
  const focusable = panel.querySelectorAll<HTMLElement>(
    'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
  )
  const first = focusable[0]
  const last  = focusable[focusable.length - 1]
  const trap = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus() }
    } else {
      if (document.activeElement === last)  { e.preventDefault(); first.focus() }
    }
  }
  document.addEventListener('keydown', trap)
  // Mettre le focus sur le bouton fermer à l'ouverture
  ;(panel.querySelector('button[aria-label="Fermer le menu"]') as HTMLElement)?.focus()
  return () => document.removeEventListener('keydown', trap)
}, [isOpen])
```

---

### WR-02: ArtworksClient — `deleteArtwork` appelé sans `await` dans `startTransition`

**File:** `src/app/admin/artworks/_components/ArtworksClient.tsx:157`

**Issue:** `startTransition(() => { deleteArtwork(selectedArtwork.id) })` appelle la Server Action sans `await`. React `startTransition` accepte un callback synchrone ou `async` ; sans `await`, la promesse est abandonnée silencieusement si elle rejette. Le `router.refresh()` n'est jamais appelé après suppression (contrairement à `handleStatusChange`), ce qui signifie que la liste ne se met pas à jour côté client après une suppression réussie.

**Fix:** Rendre le callback `async` et `await` l'action, puis rafraîchir le router :

```tsx
function handleDelete() {
  if (!selectedArtwork) return
  if (!confirm(`Supprimer "${selectedArtwork.title}" définitivement ?\nCette action est irréversible.`)) return
  setSelectedId(null)
  startTransition(async () => {
    await deleteArtwork(selectedArtwork.id)
    router.refresh()
  })
}
```

---

### WR-03: artworks/[id]/page.tsx — colonne image fixe 400×500px visible sur mobile très étroit

**File:** `src/app/artworks/[id]/page.tsx:376`

**Issue:** Quand `processedUrl` est `null` (pas d'image), le placeholder affiche `width: '400px', height: '500px'` en style inline. En layout 1-colonne sur mobile (breakpoint `≤1023px`), un `width` fixe de 400px déborde sur les écrans de 375px (iPhone SE) et provoque un scroll horizontal inattendu.

**Fix:** Remplacer les dimensions fixes par des valeurs fluides :

```tsx
<div
  style={{
    width: '100%',
    maxWidth: '400px',
    aspectRatio: '4 / 5',   // conserve la proportion 400×500
    backgroundColor: 'var(--color-surface)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }}
>
```

---

## Info

### IN-01: HamburgerMenu — styles de liens dupliqués six fois

**File:** `src/components/layout/HamburgerMenu.tsx:190`

**Issue:** Les six `<Link>` du panneau (Galerie, À propos, Mon profil, S'identifier) partagent les mêmes propriétés CSS (`fontFamily`, `fontSize`, `fontWeight`, `textTransform`, `letterSpacing`, `color`, `textDecoration`, `height`, `padding`, `display`, `alignItems`). La duplication rend la maintenance coûteuse : changer la police ou la taille de touch-target exige six modifications.

**Fix:** Extraire un objet de style partagé en haut du composant :

```tsx
const navLinkStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  height: '48px',
  padding: '0 24px',
  fontFamily: 'var(--font-space-mono)',
  fontSize: '14px',
  fontWeight: 400,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: 'var(--color-ink)',
  textDecoration: 'none',
}
// Puis chaque lien : style={navLinkStyle} ou style={{ ...navLinkStyle, color: 'var(--color-ink-muted)' }}
```

---

### IN-02: HamburgerMenu.test.tsx — pas de test vérifiant la fermeture du panneau après clic sur un lien de navigation

**File:** `src/components/layout/HamburgerMenu.test.tsx:112`

**Issue:** Les tests couvrent bien la fermeture via l'overlay, la croix et Escape. Cependant, le scénario "cliquer sur un lien de navigation (Galerie, À propos) ferme le panneau" n'est pas testé. Les liens appellent `onClick={() => setIsOpen(false)}` — une régression ici serait silencieuse.

**Fix:** Ajouter un test :

```tsx
it('ferme le panneau au clic sur le lien Galerie', () => {
  render(<HamburgerMenu isLoggedIn={false} />)
  fireEvent.click(screen.getByRole('button', { name: /ouvrir le menu/i }))
  fireEvent.click(screen.getByText('Galerie'))
  expect(screen.queryByRole('dialog')).toBeNull()
})
```

---

### IN-03: ArtworksClient — `borderRadius: 3` présent sur plusieurs éléments admin

**File:** `src/app/admin/artworks/_components/ArtworksClient.tsx:278`

**Issue:** La contrainte D-03 spécifie "zéro coins arrondis" sur tous les nouveaux éléments. Dans `ArtworksClient.tsx`, de nombreux éléments (bouton upload, chips médium, select tri, pills, bouton fermer drawer) utilisent `borderRadius: 3`. Cela était apparemment déjà présent avant la Phase 8, mais l'ajout de nouveau code CSS dans cette phase (les règles `@media` responsive) n'a pas aligné les éléments existants.

**Note:** Si D-03 s'applique strictement au back-office admin (interface artiste uniquement), ces `borderRadius: 3` peuvent être acceptables comme convention interne distincte de la galerie publique. À clarifier avec l'artiste. Aucune correction imposée.

---

### IN-04: artworks/[id]/page.tsx — `scroll-padding-bottom: 80px` appliqué sur `.detail-info-panel` plutôt que sur le scroll container

**File:** `src/app/artworks/[id]/page.tsx:297`

**Issue:** `scroll-padding-bottom` est une propriété du **scroll container** (l'élément avec `overflow: scroll/auto`), pas de l'élément défilé. Sur mobile (layout 1-colonne), la page principale (`html` / `body`) est le scroll container — `scroll-padding-bottom: 80px` sur `.detail-info-panel` (qui passe à `overflow-y: visible` via le même `@media`) n'a aucun effet. La propriété est ignorée silencieusement.

**Fix:** Appliquer `scroll-padding-bottom` au scroll container réel. Pour le clavier virtuel iOS/Android, la solution correcte est de l'ajouter sur `html` ou `body` via un `@media` ciblé :

```css
@media (max-width: 1023px) {
  html {
    scroll-padding-bottom: 80px;
  }
  .detail-info-panel {
    position: static;
    max-height: none;
    overflow-y: visible;
  }
}
```

Alternativement, cette règle peut être placée dans le fichier CSS global du layout.

---

_Reviewed: 2026-06-07_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
