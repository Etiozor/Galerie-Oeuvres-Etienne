# Phase 1: Foundation - Context

**Gathered:** 2026-04-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Mettre en place les fondations techniques du projet : schéma de base de données, authentification de l'artiste, abstraction du stockage de fichiers, et environnement de développement local. Aucune interface publique dans cette phase — les livrables sont des fondations sur lesquelles toutes les phases suivantes s'appuient.

</domain>

<decisions>
## Implementation Decisions

### Classification des œuvres

- **D-01:** Les types (dessin/peinture) et médiums (crayon, encre, acrylique, huile) sont **extensibles** — l'artiste doit pouvoir en ajouter depuis l'admin sans modification du code. Implique une table `artwork_categories` ou `mediums` gérable en base, pas des enums TypeScript fixes.
- **D-02:** Les œuvres supportent aussi des **tags libres** — l'artiste peut étiqueter une œuvre avec des mots-clés libres (ex: "portrait", "paysage", "abstrait", "offert à Paul"). Implique une table `tags` avec relation many-to-many sur les œuvres.
- **D-03:** La classification est donc sur 3 niveaux : type (dessin/peinture) + médium (extensible) + tags libres. Les types peuvent aussi être extensibles dans un premier temps.

### Accès admin

- **D-04:** L'interface admin est accessible à l'URL `/admin`.
- **D-05:** Protection par email + mot de passe uniquement — pas d'URL secrète ni de double authentification. C'est un usage personnel, la simplicité est prioritaire.
- **D-06:** Toute route sous `/admin/*` doit rediriger vers `/admin/login` si l'artiste n'est pas connecté.

### Commentaires dans le code

- **D-07:** Tout le code doit être commenté en français, de façon à ce qu'une personne non-développeur puisse comprendre et modifier. Expliquer le POURQUOI, pas seulement le QUOI.

### Claude's Discretion

- Structure exacte des tables (noms des colonnes, types, contraintes) — choix techniques laissés à l'appréciation du planner
- Gestion des migrations Drizzle — approche standard laissée au planner
- Docker Compose configuration — ports, volumes, etc. laissés au planner
- Seed de données de test — le planner peut inclure quelques artworks fictifs pour faciliter le développement

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Projet
- `.planning/PROJECT.md` — Vision, contraintes, décisions clés du projet
- `.planning/REQUIREMENTS.md` — Requirements complets v1 avec IDs (AUTH-04 pour cette phase)
- `.planning/ROADMAP.md` — Phase 1 plans (01-01 à 01-04), objectifs et critères de succès

### Recherche technique
- `.planning/research/STACK.md` — Stack recommandé avec versions et rationale (Next.js 15, Drizzle, Better Auth, Sharp, R2)
- `.planning/research/ARCHITECTURE.md` — Architecture composants, schéma de données, ordre de build recommandé
- `.planning/research/PITFALLS.md` — Pièges à éviter (M6 StorageProvider, M7 PostgreSQL dès le début, M8 système de tags flexible)
- `.planning/research/SUMMARY.md` — Synthèse de la recherche avec décisions finales

### Points d'attention critiques (de PITFALLS.md)
- **M7** : PostgreSQL via Docker dès le premier jour, pas de SQLite
- **M6** : `StorageProvider` interface abstraite dès maintenant — la DB stocke des clés de stockage, jamais des chemins absolus
- **M8** : Système de tags/catégories flexible en base (pas d'enum TypeScript) pour éviter des migrations coûteuses plus tard

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Aucun code existant — projet greenfield

### Established Patterns
- Aucun pattern établi — cette phase définit les patterns pour toutes les phases suivantes

### Integration Points
- Cette phase produit : schéma DB, session artiste, StorageProvider interface
- Toutes les phases suivantes consomment ces fondations

</code_context>

<specifics>
## Specific Ideas

- L'artiste est sur Windows 11 — s'assurer que Docker Desktop for Windows est le prérequis documenté, et que les commandes dans le README fonctionnent en bash/PowerShell
- Les commentaires dans le code doivent être en français, suffisamment détaillés pour qu'un non-développeur puisse s'y retrouver

</specifics>

<deferred>
## Deferred Ideas

- Données de démonstration (seed artworks) — l'artiste n'a pas demandé explicitement, mais le planner peut décider d'en inclure pour faciliter le développement des phases suivantes
- Page de login artiste avec branding/design — cette phase se concentre sur la fonctionnalité, le design vient en Phase 3-5

</deferred>

---

*Phase: 01-foundation*
*Context gathered: 2026-04-22*
