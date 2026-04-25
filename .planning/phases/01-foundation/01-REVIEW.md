---
phase: 01-foundation
reviewed: 2026-04-25T10:00:00Z
depth: standard
files_reviewed: 21
files_reviewed_list:
  - .env.example
  - .gitignore
  - .npmrc
  - docker-compose.yml
  - drizzle.config.ts
  - middleware.ts
  - next.config.ts
  - package.json
  - src/app/admin/login/page.tsx
  - src/app/admin/page.tsx
  - src/app/api/auth/[...all]/route.ts
  - src/app/globals.css
  - src/app/layout.tsx
  - src/app/page.tsx
  - src/db/index.ts
  - src/db/schema.ts
  - src/db/seed.ts
  - src/lib/auth.ts
  - src/lib/storage/index.ts
  - src/lib/storage/local.ts
  - tsconfig.json
findings:
  critical: 1
  warning: 4
  info: 3
  total: 8
status: issues_found
---

# Phase 01 : Code Review — Foundation (revue complète)

**Reviewed:** 2026-04-25T10:00:00Z
**Depth:** standard
**Files Reviewed:** 21
**Status:** issues_found

## Summary

La phase 01 (Foundation) est globalement bien construite. Le schéma de base de données est complet et cohérent avec les décisions d'architecture documentées dans CLAUDE.md. Le middleware respecte la contrainte Edge Runtime (aucun import de Better Auth ni de Kysely). L'abstraction StorageProvider est propre et bien documentée. Les commentaires en français expliquant le WHY sont présents sur l'ensemble des fichiers. TypeScript strict est activé avec `noUncheckedIndexedAccess`.

Deux findings du review précédent (CR-01 path traversal, IN-02 getUrl sans vérification) sont confirmés et précisés. De nouveaux problèmes ont été identifiés sur les colonnes `updatedAt` (ne se mettront jamais à jour), la redirection post-déconnexion, et le comportement du cache Next.js après connexion.

---

## Critical Issues

### CR-01 : Path traversal dans assertSafeKey — faux positif sur répertoires frères

**File:** `src/lib/storage/local.ts:63-69`

**Issue:** La vérification `filePath.startsWith(this.uploadDir)` est insuffisante. Si `uploadDir` vaut `/app/uploads`, un chemin résolu comme `/app/uploadsevil/foo.txt` (produit par une clé `../uploadsevil/foo.txt`) passe la vérification car la chaîne commence bien par `/app/uploads`. Ce cas est confirmé par test :

```
uploadDir  = F:\Vente POF\uploads
key        = ../uploadsevil/secret.txt
filePath   = path.join(uploadDir, key) = F:\Vente POF\uploadsevil\secret.txt
startsWith("F:\Vente POF\uploads") → true  ← faux positif confirmé
```

De plus, sur Windows (environnement de développement actuel), le système de fichiers est insensible à la casse, mais `startsWith` compare des chaînes de façon sensible à la casse — une clé contournant la casse passerait la vérification.

**Fix:**

```typescript
private assertSafeKey(key: string, filePath: string): void {
  // Résoudre le chemin de façon canonique (élimine les .. résiduels)
  const resolvedFile = path.resolve(filePath)

  // Ajouter path.sep garantit une correspondance de répertoire et non de préfixe de chaîne.
  // Sans path.sep : "/app/uploads" matche "/app/uploadsevil/" à tort.
  const safeBase = this.uploadDir.endsWith(path.sep)
    ? this.uploadDir
    : this.uploadDir + path.sep

  // Sur Windows : comparer en minuscules (FS insensible à la casse)
  const isWin = process.platform === 'win32'
  const normalizedBase = isWin ? safeBase.toLowerCase() : safeBase
  const normalizedFile = isWin ? resolvedFile.toLowerCase() : resolvedFile

  if (!normalizedFile.startsWith(normalizedBase)) {
    throw new Error(
      `Clé de stockage invalide : "${key}". ` +
      'La clé ne peut pas contenir de séquences "../" ou pointer hors du dossier uploads/.'
    )
  }
}
```

---

## Warnings

### WR-01 : updatedAt ne se met jamais à jour automatiquement (artworks, visitors)

**File:** `src/db/schema.ts:259` et `src/db/schema.ts:350`

**Issue:** Les colonnes `updatedAt` des tables `artworks` et `visitors` ont `.defaultNow()` (valeur initiale à l'INSERT), mais aucun mécanisme de mise à jour à l'UPDATE. PostgreSQL ne met pas automatiquement à jour les colonnes timestamp contrairement à MySQL. En pratique, quand l'artiste modifiera le titre d'une œuvre en Phase 5, le champ `updated_at` restera figé à la date d'insertion — rendant ce champ inutile pour trier par "dernière modification".

Drizzle ORM fournit `.$onUpdate()` pour ce cas.

**Fix:**

```typescript
// Dans la table artworks (ligne ~259) :
updatedAt: timestamp('updated_at', { withTimezone: true })
  .notNull()
  .defaultNow()
  .$onUpdate(() => new Date()),

// Dans la table visitors (ligne ~350) :
updatedAt: timestamp('updated_at', { withTimezone: true })
  .notNull()
  .defaultNow()
  .$onUpdate(() => new Date()),
```

Note : `.$onUpdate()` agit au niveau de Drizzle ORM uniquement — si des UPDATE sont faits via SQL brut ou un autre outil, le timestamp ne sera pas mis à jour. Pour ce projet, les mutations passent toutes par Drizzle, donc c'est suffisant.

---

### WR-02 : Déconnexion via formulaire HTML — affiche du JSON brut au lieu de rediriger

**File:** `src/app/admin/page.tsx:45-49`

**Issue:** Le formulaire `<form action="/api/auth/sign-out" method="POST">` soumet une requête POST native. Better Auth supprime le cookie de session et retourne `{ "success": true }` en JSON. Le navigateur affiche ce JSON brut à l'artiste au lieu de le rediriger vers `/admin/login`.

```html
<!-- Comportement actuel : le navigateur affiche {"success":true} -->
<form action="/api/auth/sign-out" method="POST">
  <button type="submit">Se déconnecter</button>
</form>
```

**Fix:** Extraire un petit Client Component pour gérer la déconnexion avec redirection explicite :

```tsx
// Créer : src/app/admin/_components/SignOutButton.tsx
'use client'

import { useRouter } from 'next/navigation'

/**
 * Bouton de déconnexion.
 * Appelle l'endpoint Better Auth puis redirige vers /admin/login.
 * Séparé en Client Component car il a besoin du hook useRouter.
 */
export function SignOutButton() {
  const router = useRouter()

  async function handleSignOut() {
    await fetch('/api/auth/sign-out', { method: 'POST' })
    router.push('/admin/login')
    router.refresh() // Invalider le cache Next.js
  }

  return (
    <button onClick={handleSignOut} style={{ padding: '0.5rem 1rem', cursor: 'pointer' }}>
      Se déconnecter
    </button>
  )
}
```

```tsx
// Dans src/app/admin/page.tsx, remplacer le <form> par :
import { SignOutButton } from './_components/SignOutButton'
// ...
<div style={{ marginTop: '2rem' }}>
  <SignOutButton />
</div>
```

---

### WR-03 : Connexion sans router.refresh() — risque de cache périmé

**File:** `src/app/admin/login/page.tsx:57`

**Issue:** Après connexion réussie, le code appelle uniquement `router.push('/admin')`. Dans Next.js App Router, `router.push` réutilise le cache du routeur client. Si `/admin` a été visité avant la connexion (page qui redirige vers le login), le cache peut contenir une version sans session. Le Server Component de `/admin` sera alors rendu avec les données en cache plutôt que de vérifier la nouvelle session.

**Fix:**

```typescript
// Connexion réussie — invalider le cache avant de naviguer
router.refresh() // Force le re-fetch des Server Components avec la nouvelle session
router.push('/admin')
```

---

### WR-04 : Le matcher du middleware peut ne pas couvrir /admin sans sous-chemin

**File:** `middleware.ts:50-53`

**Issue:** Le matcher `['/admin/:path*']` utilise `:path*` (zéro ou plusieurs segments). En Next.js, ce pattern couvre théoriquement `/admin` lui-même, mais le comportement exact peut varier selon la version. Si `/admin` sans slash final n'est pas intercepté, la route `src/app/admin/page.tsx` serait accessible sans cookie de session — seule la vérification interne à la page (`auth.api.getSession`) ferait la redirection, ce qui est la défense secondaire, pas primaire.

**Fix:** Rendre le matcher explicite pour lever toute ambiguïté :

```typescript
export const config = {
  // Couvre explicitement /admin (sans sous-chemin) ET /admin/login, /admin/works, etc.
  matcher: ['/admin', '/admin/:path*'],
}
```

---

## Info

### IN-01 : getUrl() n'applique pas assertSafeKey contrairement aux autres méthodes

**File:** `src/lib/storage/local.ts:169`

**Issue:** Les méthodes `put()`, `get()`, et `delete()` appellent toutes `assertSafeKey()`. La méthode `getUrl()` construit l'URL directement sans validation :

```typescript
getUrl(key: string): string {
  const normalizedKey = key.replace(/\\/g, '/')
  return `${this.baseUrl}/uploads/${normalizedKey}` // Pas d'assertSafeKey ici
}
```

Une clé `../../api/auth/sign-in/email` produirait l'URL `http://localhost:3000/uploads/../../api/auth/sign-in/email`. Les navigateurs normalisent ces URLs (risque faible en pratique car les clés viennent de la DB), mais l'incohérence avec les autres méthodes crée un code smell — surtout si `getUrl()` est appelée avec une clé externe dans les phases suivantes.

**Fix:**

```typescript
getUrl(key: string): string {
  // Même vérification défensive que put/get/delete pour la cohérence
  const filePath = path.join(this.uploadDir, key)
  this.assertSafeKey(key, filePath)

  const normalizedKey = key.replace(/\\/g, '/')
  return `${this.baseUrl}/uploads/${normalizedKey}`
}
```

---

### IN-02 : require() dynamique dans getStorage() — anti-pattern ESM

**File:** `src/lib/storage/index.ts:99`

**Issue:** La factory `getStorage()` utilise `require('./local')` (CommonJS) avec un `eslint-disable` pour éviter de charger le module `fs` en production. Next.js 15 utilise des bundles ESM. Le `require()` dynamique fonctionne dans le contexte Node.js runtime mais est inutilement complexe et le commentaire eslint-disable indique que c'est reconnu comme anti-pattern.

**Fix:** Utiliser un import dynamique ESM natif. La fonction devient alors `async`, ce qui est cohérent avec son caractère factory :

```typescript
export async function getStorage(): Promise<StorageProvider> {
  const backend = process.env.STORAGE_BACKEND ?? 'local'

  switch (backend) {
    case 'local': {
      // Import dynamique ESM — évite de bundler le module fs dans le contexte R2
      const { LocalStorageAdapter } = await import('./local')
      return new LocalStorageAdapter()
    }
    case 'r2':
      throw new Error('R2StorageAdapter non encore implémenté...')
    default:
      throw new Error(`Valeur STORAGE_BACKEND non reconnue : "${backend}".`)
  }
}
```

Note : rendre `getStorage()` async implique de mettre à jour tous les appelants avec `await getStorage()`. Acceptable car cette fonction sera utilisée uniquement dans des contextes serveur (Server Actions, Route Handlers).

---

### IN-03 : .env non versionné présent à la racine

**File:** `.gitignore:52`

**Issue:** Le `git status` initial montre `?? .env` — un fichier `.env` non versionné existe à la racine. `.gitignore` l'ignore correctement (ligne 52). Cependant, Next.js charge `.env` avant `.env.local` dans sa hiérarchie de priorité. Si `.env` contient `BETTER_AUTH_SECRET` avec une valeur réelle (pas un placeholder), ce fichier ne devrait pas cohabiter avec `.env.local` pour éviter la confusion.

**Fix:** S'assurer que les variables de développement sont uniquement dans `.env.local` (comme documenté dans `.env.example`). Supprimer `.env` s'il est redondant avec `.env.local`, ou le renommer en `.env.local`.

---

_Reviewed: 2026-04-25T10:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
