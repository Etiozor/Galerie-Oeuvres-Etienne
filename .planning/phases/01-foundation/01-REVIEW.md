---
phase: 01-foundation
reviewed: 2026-04-23T00:00:00Z
depth: standard
files_reviewed: 14
files_reviewed_list:
  - package.json
  - next.config.ts
  - tsconfig.json
  - src/app/layout.tsx
  - src/app/page.tsx
  - src/app/globals.css
  - docker-compose.yml
  - .env.example
  - .gitignore
  - .npmrc
  - drizzle.config.ts
  - src/db/schema.ts
  - src/db/index.ts
  - src/db/seed.ts
findings:
  critical: 1
  warning: 4
  info: 3
  total: 8
status: issues_found
---

# Phase 01 : Code Review Report

**Reviewed:** 2026-04-23
**Depth:** standard
**Files Reviewed:** 14
**Status:** issues_found

## Summary

La fondation du projet est solide. La structure de la base de données est bien pensée, le schéma Drizzle est complet et cohérent avec les décisions d'architecture documentées. Les commentaires en français sont présents partout, conformément aux conventions du projet.

Deux problèmes structurels méritent une attention immédiate : la présence d'un mot de passe de développement dans `.env.example` (qui sera engagé dans git) et l'absence de gestion de la déconnexion du pool de base de données dans le seed script. Quatre avertissements concernent des risques de bugs potentiels en production ou en développement. Trois points d'information signalent des opportunités d'amélioration mineures.

---

## Critical Issues

### CR-01: Mot de passe de développement en clair dans un fichier versionné

**File:** `.env.example:14`
**Issue:** La `DATABASE_URL` dans `.env.example` contient le mot de passe de développement en clair (`pof_dev_password`). Ce fichier est explicitement versionné (checké dans git). Bien que ce mot de passe soit uniquement pour le développement local, il correspond exactement aux credentials définis dans `docker-compose.yml`, ce qui crée un couplage entre les deux fichiers et normalise la pratique de commiter des credentials. Si un développeur copie ce fichier et le déploie sans modification, les credentials de dev seront exposés. De plus, le pattern dans `.gitignore` ne protège que `.env.local` et `.env.*.local` — un `.env` simple ne serait pas ignoré.

**Fix:** Remplacer les vraies valeurs par des placeholders explicites dans `.env.example` :
```bash
# Avant (actuel — credentials en clair) :
DATABASE_URL="postgresql://pof_user:pof_dev_password@localhost:5432/galerie_pof"

# Après (placeholder sûr) :
DATABASE_URL="postgresql://VOTRE_USER:VOTRE_MOT_DE_PASSE@localhost:5432/galerie_pof"
# Valeurs dev locales : postgresql://pof_user:pof_dev_password@localhost:5432/galerie_pof
```
Alternativement, ajouter `.env` (sans suffixe) à `.gitignore` pour couvrir ce cas.

---

## Warnings

### WR-01: Pool de connexions non fermé dans le seed script — risque de hang

**File:** `src/db/seed.ts:214`
**Issue:** Le script seed appelle `process.exit(0)` directement, sans fermer le pool de connexions PostgreSQL (`pool.end()`). Bien que `process.exit()` tue le processus, certaines versions de `node-postgres` peuvent bloquer la sortie si le pool est actif, ou laisser des connexions pendantes côté serveur. Le pattern robuste est de fermer explicitement le pool avant de quitter.

Le pool est créé dans `src/db/index.ts` mais n'est pas exporté — seul `db` est exporté. Pour fermer proprement, soit le pool doit être exporté, soit Drizzle expose une méthode `$client`.

**Fix:**
```typescript
// Dans src/db/index.ts — exporter le pool pour le seed
export const pool = new Pool({ connectionString: process.env.DATABASE_URL })
export const db = drizzle(pool, { schema })

// Dans src/db/seed.ts — fermer le pool avant process.exit
seed()
  .then(async () => {
    await pool.end()
    process.exit(0)
  })
  .catch(async (error) => {
    console.error('❌ Erreur lors du seed :', error)
    await pool.end()
    process.exit(1)
  })
```

### WR-02: `updatedAt` non mis à jour automatiquement — risque de données obsolètes

**File:** `src/db/schema.ts:190` et `src/db/schema.ts:281`
**Issue:** Les colonnes `updatedAt` sur `artworks` (ligne 190) et `visitors` (ligne 281) ont `.defaultNow()` pour l'insertion, mais il n'existe aucun mécanisme pour les mettre à jour automatiquement lors des modifications. En Drizzle ORM, `.defaultNow()` ne s'applique qu'à l'INSERT, pas à l'UPDATE. Résultat : `updatedAt` restera figé à la date de création pour toutes les œuvres et tous les visiteurs modifiés depuis l'admin.

**Fix:** Deux options :
1. Créer un trigger PostgreSQL (robuste, indépendant de l'ORM) :
```sql
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER artworks_updated_at
BEFORE UPDATE ON artworks
FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```
2. Ou rappeler explicitement dans chaque Server Action de mise à jour :
```typescript
await db.update(artworks)
  .set({ ...data, updatedAt: new Date() })
  .where(eq(artworks.id, id))
```
L'option 2 est plus simple à maintenir dans ce projet. Documenter ce choix dans le schéma pour éviter les oublis en Phase 5.

### WR-03: `drizzle.config.ts` utilise l'opérateur non-null assertion (`!`) sur DATABASE_URL

**File:** `drizzle.config.ts:32`
**Issue:** `process.env.DATABASE_URL!` utilise l'assertion non-null TypeScript qui supprime l'erreur de type sans vérification à l'exécution. Si `DATABASE_URL` n'est pas définie lors de l'exécution de `drizzle-kit push` ou `drizzle-kit studio`, l'outil recevra `undefined` converti en chaîne `"undefined"` comme URL de connexion, produisant une erreur de connexion confuse au lieu d'un message d'erreur clair.

La vérification défensive existe dans `src/db/index.ts` (lignes 19-24) mais pas dans `drizzle.config.ts`.

**Fix:**
```typescript
// drizzle.config.ts
const dbUrl = process.env.DATABASE_URL
if (!dbUrl) {
  throw new Error(
    'Variable DATABASE_URL manquante pour drizzle-kit. ' +
    'Vérifiez votre fichier .env.local.'
  )
}

export default {
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url: dbUrl },
} satisfies Config
```

### WR-04: Références FK nullables sur `artworks.typeId` et `artworks.mediumId` sans index

**File:** `src/db/schema.ts:154-157`
**Issue:** Les colonnes `typeId` et `mediumId` sur `artworks` sont des clés étrangères nullable (pas de `.notNull()`), ce qui est cohérent avec le fait qu'une œuvre peut ne pas encore avoir de type/médium assigné. Cependant, ces colonnes n'ont pas d'index, alors qu'elles seront utilisées dans les requêtes de filtre de la galerie (ex: "afficher toutes les peintures", "afficher les acryliques"). Les index `artworks_status_idx` et `artworks_pipeline_idx` sont présents, mais les colonnes de jointure FK sont oubliées.

**Fix:** Ajouter des index sur les FK dans la définition de la table :
```typescript
export const artworks = pgTable('artworks', {
  // ... colonnes existantes ...
}, (table) => [
  index('artworks_status_idx').on(table.status),
  index('artworks_pipeline_idx').on(table.pipelineState),
  // Ajouter :
  index('artworks_type_idx').on(table.typeId),
  index('artworks_medium_idx').on(table.mediumId),
])
```

---

## Info

### IN-01: Variables CSS référencent des polices non importées (`--font-geist-sans`, `--font-geist-mono`)

**File:** `src/app/globals.css:11-12`
**Issue:** Le bloc `@theme` référence `var(--font-geist-sans)` et `var(--font-geist-mono)` comme valeurs de `--font-sans` et `--font-mono`. Ces variables CSS seront `undefined` au runtime car les polices Geist ne sont pas importées dans `layout.tsx` (aucune importation `next/font/google` ou `next/font/local`). La police de repli définie sur `body` (`Arial, Helvetica, sans-serif`) s'appliquera, mais la déclaration `@theme` est trompeuse et pourrait causer des surprises lors du passage à une vraie police en Phase 3.

**Fix:** Soit importer les polices Geist dans `layout.tsx` dès maintenant, soit supprimer les lignes 11-12 de `globals.css` et garder uniquement la police Arial jusqu'en Phase 3 :
```css
/* Supprimer ou mettre en commentaire jusqu'en Phase 3 : */
/* --font-sans: var(--font-geist-sans); */
/* --font-mono: var(--font-geist-mono); */
```

### IN-02: Le script `build` utilise `--turbopack` — flag expérimental en production

**File:** `package.json:7`
**Issue:** Le script `"build": "next build --turbopack"` active Turbopack pour les builds de production. Turbopack est stable pour le développement (`next dev`) mais son support pour les builds de production (`next build`) était encore expérimental dans Next.js 15. Cela peut causer des différences de comportement entre dev et prod, ou des erreurs de build inattendues lors du déploiement sur Railway en Phase 6.

**Fix:** Retirer `--turbopack` du script `build` et le conserver uniquement pour `dev` :
```json
"scripts": {
  "dev": "next dev --turbopack",
  "build": "next build",
  "start": "next start"
}
```

### IN-03: Absence de `.env` (sans suffixe) dans `.gitignore`

**File:** `.gitignore:35`
**Issue:** Le `.gitignore` protège `.env.local` et `.env.*.local` mais pas `.env` tout seul. Si un développeur crée un fichier `.env` (pratique courante dans certains workflows), il sera commité accidentellement. Ce risque est amplifié par CR-01 (les credentials réels sont facilement reconnaissables dans `.env.example`).

**Fix:** Ajouter `.env` au `.gitignore` :
```gitignore
# Variables d'environnement locales (contiennent des secrets)
.env
.env.local
.env.*.local
```

---

_Reviewed: 2026-04-23_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
