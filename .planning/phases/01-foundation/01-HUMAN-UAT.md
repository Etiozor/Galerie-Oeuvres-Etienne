---
status: partial
phase: 01-foundation
source: [01-VERIFICATION.md]
started: 2026-04-24T00:00:00Z
updated: 2026-04-24T00:00:00Z
---

## Current Test

[en attente de vérification humaine]

## Tests

### 1. Docker Compose démarrage
expected: `docker compose up -d` démarre PostgreSQL, `pg_isready -U pof_user -d galerie_pof` répond "accepting connections"
result: [pending]

### 2. Migration Drizzle
expected: `npm run db:push` s'exécute sans erreur et crée les 7 tables (artworks, artwork_types, mediums, tags, artwork_tags, visitors, offers). Note: les tables Better Auth (user, session, account, verification) nécessitent l'application manuelle du SQL documenté dans 01-03-SUMMARY.md (bug ESM du CLI @better-auth/cli)
result: [pending]

### 3. Seed script
expected: `npm run db:seed` affiche "Seed terminé avec succès !" avec les comptages corrects
result: [pending]

### 4. Redirection non authentifié
expected: visiter http://localhost:3000/admin sans session redirige vers /admin/login
result: [pending]

### 5. Flux connexion artiste
expected: créer un compte via l'API sign-up, se connecter sur /admin/login avec email+password, être redirigé vers /admin et voir le nom de l'artiste affiché
result: [pending]

## Summary

total: 5
passed: 0
issues: 0
pending: 5
skipped: 0
blocked: 0

## Gaps
