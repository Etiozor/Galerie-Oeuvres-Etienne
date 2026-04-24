---
phase: 01-foundation
reviewed: 2026-04-24T00:00:00Z
depth: standard
files_reviewed: 7
files_reviewed_list:
  - src/lib/auth.ts
  - src/app/api/auth/[...all]/route.ts
  - middleware.ts
  - src/app/admin/page.tsx
  - src/app/admin/login/page.tsx
  - src/lib/storage/index.ts
  - src/lib/storage/local.ts
findings:
  critical: 1
  warning: 3
  info: 2
  total: 6
status: issues_found
---

# Phase 01 : Code Review Report (Better Auth + Storage Layer)

**Reviewed:** 2026-04-24
**Depth:** standard
**Files Reviewed:** 7
**Status:** issues_found

## Summary

Ce second lot de fichiers couvre l'implémentation de Better Auth (auth.ts, route API, middleware, pages admin) et l'abstraction de stockage (StorageProvider + LocalStorageAdapter). La structure générale est bien conçue : le middleware est correctement placé, le StorageProvider est proprement abstrait, et les commentaires en français sont présents partout.

Un problème critique a été identifié dans l'adaptateur de stockage local : la vérification anti-path-traversal est insuffisante sur Windows (environnement de développement actuel) et face à des clés contenant des chemins absolus. Trois avertissements concernent des bugs potentiels réels : le matcher du middleware ne couvre pas `/admin` sans sous-chemin, le formulaire de déconnexion peut échouer silencieusement, et le formulaire de connexion ne redirige pas avec `router.refresh()` (risque de session périmée). Deux points d'information signalent des opportunités d'amélioration mineures.

---

## Critical Issues

### CR-01: Path traversal non bloqué pour les clés de chemin absolu (Windows)

**File:** `src/lib/storage/local.ts:63-69`

**Issue:** La méthode `assertSafeKey` vérifie que `filePath.startsWith(this.uploadDir)` pour prévenir la traversal de chemin. Cette vérification a deux failles :

1. **Clé de chemin absolu ignorée par `path.join` sur Windows** : `path.join('F:\\Vente POF\\uploads', 'C:\\Windows\\System32\\hosts')` retourne `C:\Windows\System32\hosts` sur Windows (car `path.join` traite les segments absolus comme des racines et écrase le chemin précédent). Ce résultat ne commence pas par `uploadDir`, donc l'erreur est bien levée — mais seulement si `uploadDir` est un chemin Windows. Si `uploadDir` contient des séparateurs mixtes (`/` vs `\`), la comparaison `startsWith` peut rater.

2. **Système de fichiers insensible à la casse (Windows/macOS)** : `filePath.startsWith(this.uploadDir)` est une comparaison de chaînes sensible à la casse. Sur Windows, `F:\Vente POF\uploads` et `f:\vente pof\uploads` référencent le même dossier mais la vérification `startsWith` échouerait ou accepterait à tort selon la casse utilisée. Une clé comme `../../../etc/passwd` normalisée différemment selon la casse des dossiers pourrait contourner la protection.

3. **Absence de normalisation avant comparaison** : `path.join` normalise les `..` mais `startsWith` compare des chaînes brutes. Si `uploadDir` ne se termine pas par un séparateur, une clé `../uploads-evil/file.jpg` pourrait produire un chemin qui commence par `uploadDir` mais pointe en dehors (ex: `uploadDir` = `/app/uploads`, chemin résolu = `/app/uploads-evil/file.jpg` — `startsWith` retournerait `true` à tort).

**Fix:**
```typescript
private assertSafeKey(key: string, filePath: string): void {
  // Normaliser les deux chemins de manière cohérente avant de comparer.
  // path.resolve() retourne un chemin absolu canonique.
  // Ajouter path.sep à la fin de uploadDir pour éviter les faux positifs
  // (ex: "/uploads" matche "/uploads-evil/..." sans le séparateur final).
  const safeBase = this.uploadDir.endsWith(path.sep)
    ? this.uploadDir
    : this.uploadDir + path.sep

  const resolvedFile = path.resolve(filePath)

  // Sur Windows, comparer en minuscules (système de fichiers insensible à la casse)
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

### WR-01: Le matcher du middleware ne couvre pas `/admin` sans sous-chemin

**File:** `middleware.ts:43-46`

**Issue:** Le matcher `['/admin/:path*']` utilise `:path*` (zéro ou plusieurs segments). En Next.js, `:path*` correspond effectivement à zéro segment également, donc `/admin` seul devrait être couvert. Cependant, le comportement exact dépend de la version de Next.js. Dans certaines versions, `/admin` (sans slash final et sans sous-chemin) ne déclenche pas le middleware avec ce pattern — seul `/admin/` ou `/admin/quelque-chose` le ferait. Si `/admin` n'est pas intercepté, la page `src/app/admin/page.tsx` serait accessible sans authentification (la vérification de session dans la page elle-même redirige, mais c'est une couche de défense secondaire, pas primaire).

**Fix:** Utiliser un matcher explicite couvrant les deux cas :
```typescript
export const config = {
  matcher: ['/admin', '/admin/:path*'],
}
```
Ou tester explicitement que `/admin` (sans slash final) déclenche bien une redirection vers `/admin/login` quand non authentifié.

### WR-02: Formulaire de déconnexion sans gestion d'erreur ni feedback utilisateur

**File:** `src/app/admin/page.tsx:45-49`

**Issue:** La déconnexion est implémentée comme un formulaire HTML natif `<form action="/api/auth/sign-out" method="POST">`. Cette approche présente deux problèmes :

1. **Pas de feedback utilisateur** : Si l'endpoint échoue (réseau, erreur serveur), la page ne donne aucun retour. L'artiste pense être déconnecté alors qu'il ne l'est peut-être pas.

2. **Comportement du cookie de session** : Better Auth gère la révocation de session côté serveur. Un POST simple sans les headers attendus par Better Auth (notamment `Content-Type: application/json` ou un token CSRF selon la configuration) peut retourner une erreur 4xx sans que l'utilisateur le voie. La session reste active côté serveur.

**Fix:** Remplacer par un bouton avec un `onClick` handler (ou une Server Action) qui gère explicitement la réponse :
```typescript
// Option 1 : Utiliser le client Better Auth dans un Client Component
import { authClient } from '@/lib/auth-client' // à créer si absent

async function handleSignOut() {
  await authClient.signOut()
  router.push('/admin/login')
}

// Option 2 : Server Action avec redirection
async function signOutAction() {
  'use server'
  // Appel à auth.api.signOut() puis redirect
}
```

### WR-03: Connexion réussie sans `router.refresh()` — risque de session périmée dans le cache Next.js

**File:** `src/app/admin/login/page.tsx:57`

**Issue:** Après une connexion réussie, le code appelle `router.push('/admin')` mais pas `router.refresh()`. Dans Next.js App Router, `router.push` réutilise le cache du routeur client. Si `/admin` a été visité précédemment (même sans session), le cache peut contenir une version de la page sans les données de session. `router.refresh()` force Next.js à re-fetcher les Server Components avec la nouvelle session.

Sans `router.refresh()`, il est possible que la page `/admin` s'affiche avec des données obsolètes ou déclenche une nouvelle redirection vers `/admin/login` parce que le middleware voit le cookie de session mais le Server Component du cache ne l'a pas encore.

**Fix:**
```typescript
// Après connexion réussie
router.refresh() // Invalider le cache Next.js pour prendre en compte la nouvelle session
router.push('/admin')
```
Ou utiliser `router.replace('/admin')` suivi de `router.refresh()`.

---

## Info

### IN-01: `require()` dynamique dans `getStorage()` — anti-pattern ESM mitigé

**File:** `src/lib/storage/index.ts:99`

**Issue:** La factory `getStorage()` utilise `require('./local')` (CommonJS) avec un commentaire eslint-disable pour charger l'adaptateur local. Le commentaire explique que c'est pour éviter de charger le module `fs` en production R2. Cependant, Next.js 15 avec App Router utilise des bundles ESM et peut avoir des comportements inattendus avec `require()` dynamique dans certains contextes (Edge Runtime, etc.).

De plus, le type casté `as { LocalStorageAdapter: new () => LocalStorageAdapter }` est techniquement inexact : le type `LocalStorageAdapter` importé en haut du fichier est le type de l'instance, pas du constructeur. TypeScript accepte ce cast mais c'est trompeur.

**Fix:** Utiliser un import dynamique ESM natif à la place :
```typescript
case 'local': {
  const { LocalStorageAdapter } = await import('./local')
  return new LocalStorageAdapter()
}
// Note : getStorage() doit alors être async
export async function getStorage(): Promise<StorageProvider> { ... }
```
Ou, plus simplement, puisque `fs` n'est pas disponible en Edge Runtime de toute façon, importer directement en haut du fichier et documenter que cet adaptateur ne fonctionne qu'en Node.js runtime.

### IN-02: `getUrl()` ne vérifie pas la sécurité de la clé

**File:** `src/lib/storage/local.ts:169`

**Issue:** La méthode `getUrl()` normalise les séparateurs Windows mais n'appelle pas `assertSafeKey()`. Une clé malveillante comme `../../admin/secret` produirait l'URL `http://localhost:3000/uploads/../../admin/secret`. Les navigateurs normalisent généralement ces URLs, mais selon le contexte d'utilisation (génération de liens dans des templates), cela pourrait exposer des URLs inattendues.

Ce risque est faible car `getUrl()` ne touche pas au système de fichiers — elle génère juste une chaîne. Mais la cohérence avec les autres méthodes (`put`, `get`, `delete`) qui toutes vérifient la clé serait préférable.

**Fix:**
```typescript
getUrl(key: string): string {
  // Vérification défensive : même logique que les autres méthodes
  const filePath = path.join(this.uploadDir, key)
  this.assertSafeKey(key, filePath)

  const normalizedKey = key.replace(/\\/g, '/')
  return `${this.baseUrl}/uploads/${normalizedKey}`
}
```

---

_Reviewed: 2026-04-24_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
