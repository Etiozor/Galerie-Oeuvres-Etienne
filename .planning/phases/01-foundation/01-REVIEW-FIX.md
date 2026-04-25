---
phase: 01-foundation
fixed_at: 2026-04-25T10:30:00Z
review_path: .planning/phases/01-foundation/01-REVIEW.md
iteration: 1
findings_in_scope: 5
fixed: 5
skipped: 0
status: all_fixed
---

# Phase 01 : Code Review Fix Report

**Fixed at:** 2026-04-25T10:30:00Z
**Source review:** .planning/phases/01-foundation/01-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 5 (1 Critical + 4 Warning)
- Fixed: 5
- Skipped: 0

## Fixed Issues

### CR-01 : Path traversal dans assertSafeKey

**Files modified:** `src/lib/storage/local.ts`
**Commit:** aca9abe
**Applied fix:** La méthode `assertSafeKey` utilise maintenant `path.resolve()` pour canonicaliser le chemin résolu, ajoute `path.sep` à `uploadDir` pour garantir une correspondance de répertoire (et non de préfixe de chaîne), et normalise les deux chemins en minuscules sur Windows pour gérer l'insensibilité à la casse du système de fichiers.

---

### WR-01 : updatedAt ne se met jamais à jour automatiquement

**Files modified:** `src/db/schema.ts`
**Commit:** 200ca38
**Applied fix:** Ajout de `.$onUpdate(() => new Date())` sur les colonnes `updatedAt` des tables `artworks` (ligne 263) et `visitors` (ligne 357). Les deux colonnes conservent `.defaultNow()` pour l'INSERT initial. Les commentaires en français expliquent pourquoi PostgreSQL n'a pas de mécanisme équivalent à MySQL `ON UPDATE CURRENT_TIMESTAMP`.

---

### WR-02 : Déconnexion via formulaire HTML affiche du JSON brut

**Files modified:** `src/app/admin/_components/SignOutButton.tsx` (nouveau fichier), `src/app/admin/page.tsx`
**Commit:** f7f4c0c
**Applied fix:** Création du Client Component `SignOutButton` qui appelle `/api/auth/sign-out` via `fetch()`, puis appelle `router.refresh()` et `router.push('/admin/login')`. Le `<form method="POST">` dans `admin/page.tsx` a été remplacé par `<SignOutButton />`. Le composant est isolé dans `src/app/admin/_components/` pour préserver le caractère Server Component de la page admin.

---

### WR-03 : Connexion sans router.refresh() — risque de cache périmé

**Files modified:** `src/app/admin/login/page.tsx`
**Commit:** 24704d7
**Applied fix:** Ajout de `router.refresh()` avant `router.push('/admin')` dans le handler `handleSubmit`. Un commentaire en français explique pourquoi ce refresh est indispensable pour forcer le re-fetch des Server Components avec la nouvelle session plutôt que de servir une version en cache.

---

### WR-04 : Matcher du middleware peut ne pas couvrir /admin sans sous-chemin

**Files modified:** `middleware.ts`
**Commit:** 8e68c5b
**Applied fix:** Le matcher est passé de `['/admin/:path*']` à `['/admin', '/admin/:path*']` pour couvrir explicitement `/admin` (sans sous-chemin) en plus de toutes les sous-routes. Le commentaire explique l'ambiguïté du comportement de `:path*` selon les versions de Next.js.

---

_Fixed: 2026-04-25T10:30:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
