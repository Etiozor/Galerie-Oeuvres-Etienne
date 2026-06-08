---
phase: 09-responsive-pages-restantes
fixed_at: 2026-06-08T10:30:00Z
review_path: .planning/phases/09-responsive-pages-restantes/09-REVIEW.md
iteration: 1
findings_in_scope: 3
fixed: 3
skipped: 0
status: all_fixed
---

# Phase 09: Code Review Fix Report

**Fixed at:** 2026-06-08T10:30:00Z
**Source review:** .planning/phases/09-responsive-pages-restantes/09-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 3
- Fixed: 3
- Skipped: 0

## Fixed Issues

### WR-01: Bottom sheet `paddingBottom` overrides safe-area padding — content clipped on iPhone

**Files modified:** `src/components/gallery/FilterDrawer.tsx`
**Commit:** 6549af6
**Applied fix:** Remplacé `paddingBottom: 'env(safe-area-inset-bottom, 16px)'` par
`paddingBottom: 'max(16px, env(safe-area-inset-bottom, 16px))'` (ligne 188).
La fonction `max()` garantit un padding bottom minimal de 16px même sur les appareils
sans encoche qui supportent la propriété CSS `env()` mais retournent 0.
Le commentaire inline a été mis à jour pour expliquer le pourquoi du `max()`.

---

### WR-02: `role="dialog"` is missing `aria-modal="true"` — screen readers browse behind the overlay

**Files modified:** `src/components/gallery/FilterDrawer.tsx`
**Commit:** 6549af6
**Applied fix:** Ajouté `aria-modal="true"` sur le `div` avec `role="dialog"` (ligne 177).
Ce commit est combiné avec WR-01 car les deux touchent le même fichier et le même bloc JSX.
L'attribut signale aux lecteurs d'écran (VoiceOver, NVDA) que seul le contenu du tiroir
est accessible pendant que le bottom sheet est ouvert.

---

### WR-03: `storage.getUrl()` result used as `<img src>` without validation

**Files modified:** `src/lib/storage/local.ts`, `src/lib/storage/r2.ts`
**Commit:** a4ab424
**Applied fix:** Ajouté un guard identique dans `LocalStorageAdapter.getUrl()` et
`R2StorageAdapter.getUrl()` qui rejette toute clé vide ou commençant par `http://`,
`https://` ou `//`. Le guard couvre également `https://` (absent de la suggestion
originale mais cohérent avec la protection). Une `Error` explicite est levée avec
un message en français décrivant le format attendu d'une clé valide.
Note : la page `mon-profil/page.tsx` n'a pas été modifiée car c'est le StorageProvider
lui-même — point d'entrée unique — qui est désormais la barrière de validation.

---

_Fixed: 2026-06-08T10:30:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
