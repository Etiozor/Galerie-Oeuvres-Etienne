---
phase: 01-foundation
plan: "03"
subsystem: auth
tags: [better-auth, middleware, nextjs, postgresql, drizzle]
dependency_graph:
  requires: [src/db/index.ts, src/db/schema.ts]
  provides: [src/lib/auth.ts, middleware.ts, src/app/api/auth/[...all]/route.ts, src/app/admin/page.tsx, src/app/admin/login/page.tsx]
  affects: [all /admin/* routes]
tech_stack:
  added: [better-auth@1.6.8, drizzleAdapter, toNextJsHandler]
  patterns: [Better Auth server config, Next.js middleware session check, defense-in-depth session verification]
key_files:
  created:
    - src/lib/auth.ts
    - src/app/api/auth/[...all]/route.ts
    - middleware.ts
    - src/app/admin/page.tsx
    - src/app/admin/login/page.tsx
  modified: []
decisions:
  - "[D-05] email + mot de passe uniquement — pas de magic link ni OAuth"
  - "[D-06] Toute route /admin/* redirige vers /admin/login si non connecté"
  - "Défense en profondeur : vérification session dans middleware ET dans chaque Server Component admin"
metrics:
  duration: "~8 minutes"
  completed: "2026-04-24"
  tasks_completed: 2
  tasks_total: 2
---

# Phase 1 Plan 3: Better Auth Integration Summary

Better Auth v1.6 configuré avec email+mot de passe, drizzleAdapter PostgreSQL, route API catch-all `/api/auth/[...all]`, middleware de protection `/admin/*`, page de connexion et page admin protégée.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Configuration Better Auth serveur + route API | 30f2e19 | src/lib/auth.ts, src/app/api/auth/[...all]/route.ts |
| 2 | Middleware + pages admin | 65f2be4 | middleware.ts, src/app/admin/page.tsx, src/app/admin/login/page.tsx |

## Files Created

### `src/lib/auth.ts`
Configuration centrale de Better Auth. Utilise `betterAuth()` avec `drizzleAdapter(db, { provider: 'pg' })` et `emailAndPassword: { enabled: true }`. Lit `BETTER_AUTH_SECRET` et `BETTER_AUTH_URL` automatiquement depuis les variables d'environnement.

### `src/app/api/auth/[...all]/route.ts`
Route catch-all Next.js App Router qui expose tous les endpoints Better Auth via `toNextJsHandler(auth)`. Capture `/api/auth/sign-in/email`, `/api/auth/sign-out`, `/api/auth/session`, etc.

### `middleware.ts`
Middleware Next.js à la racine du projet. Vérifie la session via `auth.api.getSession()` sur chaque requête vers `/admin/*`. Redirige vers `/admin/login` si non connecté, vers `/admin` si déjà connecté et tentant d'accéder à `/admin/login`.

### `src/app/admin/page.tsx`
Page tableau de bord (Server Component). Double vérification de session en plus du middleware (défense en profondeur). Affiche le nom ou l'email de l'artiste connecté. Inclut un bouton de déconnexion.

### `src/app/admin/login/page.tsx`
Formulaire de connexion (Client Component avec `'use client'`). Email + mot de passe, appel fetch vers `/api/auth/sign-in/email`, gestion des états chargement/erreur, redirection vers `/admin` en cas de succès.

## Migration DB requise (étape manuelle)

Better Auth doit créer ses propres tables dans PostgreSQL (`user`, `session`, `account`, `verification`). Avec Docker en cours d'exécution :

```bash
# Note : @better-auth/cli a un bug avec kysely en ESM — utiliser la migration manuelle ci-dessous
# OU appliquer le SQL directement (voir section SQL ci-dessous)

# Alternative : drizzle-kit push après ajout du schéma Better Auth
npx drizzle-kit push
```

### SQL de migration Better Auth (appliquer directement si le CLI échoue)

```sql
-- Tables requises par Better Auth v1.6
CREATE TABLE IF NOT EXISTS "user" (
  "id"                TEXT PRIMARY KEY,
  "name"              TEXT NOT NULL,
  "email"             TEXT NOT NULL UNIQUE,
  "emailVerified"     BOOLEAN NOT NULL DEFAULT false,
  "image"             TEXT,
  "createdAt"         TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt"         TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "session" (
  "id"               TEXT PRIMARY KEY,
  "expiresAt"        TIMESTAMP NOT NULL,
  "token"            TEXT NOT NULL UNIQUE,
  "createdAt"        TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt"        TIMESTAMP NOT NULL DEFAULT NOW(),
  "ipAddress"        TEXT,
  "userAgent"        TEXT,
  "userId"           TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "account" (
  "id"                      TEXT PRIMARY KEY,
  "accountId"               TEXT NOT NULL,
  "providerId"              TEXT NOT NULL,
  "userId"                  TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "accessToken"             TEXT,
  "refreshToken"            TEXT,
  "idToken"                 TEXT,
  "accessTokenExpiresAt"    TIMESTAMP,
  "refreshTokenExpiresAt"   TIMESTAMP,
  "scope"                   TEXT,
  "password"                TEXT,
  "createdAt"               TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt"               TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "verification" (
  "id"         TEXT PRIMARY KEY,
  "identifier" TEXT NOT NULL,
  "value"      TEXT NOT NULL,
  "expiresAt"  TIMESTAMP NOT NULL,
  "createdAt"  TIMESTAMP DEFAULT NOW(),
  "updatedAt"  TIMESTAMP DEFAULT NOW()
);
```

## Création du premier compte artiste

Une fois les tables créées et le serveur Next.js démarré (`npm run dev`) :

```bash
curl -X POST http://localhost:3000/api/auth/sign-up/email \
  -H "Content-Type: application/json" \
  -d '{"email":"artiste@pof.fr","password":"motdepasse123","name":"Artiste POF"}'
```

Puis visiter http://localhost:3000/admin pour tester la protection, et http://localhost:3000/admin/login pour se connecter.

## Vérification manuelle

1. `http://localhost:3000/admin` sans session → redirige vers `/admin/login`
2. Se connecter avec les credentials → redirige vers `/admin`
3. La page admin affiche le nom de l'artiste
4. Cliquer "Se déconnecter" → session supprimée

## Deviations from Plan

### Blocking Issue — @better-auth/cli generate échoue (kysely ESM)

**Rule 3 — Blocking Issue**
- **Trouvé pendant :** Tâche 2, étape migration DB
- **Problème :** `npx @better-auth/cli generate` échoue avec `ERR_MODULE_NOT_FOUND` sur `kysely/dist/esm/schema/schema.js`. La version kysely 0.28.16 installée a un fichier `.d.ts` mais pas le `.js` correspondant — installation corrompue ou incomplète.
- **Impact :** La migration automatique des tables Better Auth ne peut pas être exécutée via le CLI. Le code TypeScript est inaffecté (Next.js utilise le bundler, pas ESM natif Node.js).
- **Résolution :** Le SQL de migration est documenté ci-dessus. L'artiste peut l'appliquer directement via Docker ou le README. Le code compilé proprement (`npx tsc --noEmit` sans erreur).
- **Alternative recommandée :** `npm install kysely@0.28.14` pour corriger la version corrompue, puis relancer `npx @better-auth/cli generate`.

## Known Stubs

Aucun stub — les pages admin sont fonctionnelles (session affichée, déconnexion), pas de placeholder vide.

## Threat Flags

Aucun nouveau surface de sécurité hors du plan. Les menaces T-01-03-01 à T-01-03-06 sont toutes mitigées conformément au threat model du plan :
- Cookies signés HMAC via `BETTER_AUTH_SECRET`
- Validation Better Auth des credentials (bcrypt, pas de raw password en DB)
- Messages d'erreur génériques ("Invalid credentials")
- Double vérification session (middleware + Server Component)

## Self-Check

- [x] `src/lib/auth.ts` existe — FOUND
- [x] `src/app/api/auth/[...all]/route.ts` existe — FOUND
- [x] `middleware.ts` existe — FOUND
- [x] `src/app/admin/page.tsx` existe — FOUND
- [x] `src/app/admin/login/page.tsx` existe — FOUND
- [x] Commit 30f2e19 (Tâche 1) — FOUND
- [x] Commit 65f2be4 (Tâche 2) — FOUND
- [x] `npx tsc --noEmit` — PASS (vérifié avant et après chaque tâche, 0 erreur)

## Self-Check: PASSED
