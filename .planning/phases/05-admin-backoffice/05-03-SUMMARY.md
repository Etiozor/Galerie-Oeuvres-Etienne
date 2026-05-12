---
phase: 05-admin-backoffice
plan: 03
subsystem: admin
tags: [tdd, offers, visitors, pii, privacy, server-component, drizzle-join]
dependency_graph:
  requires:
    - 05-01  # page /admin/artworks/[id] existante (étendue)
    - 04-01  # table visitors + table offers créées en Phase 4
  provides:
    - Section "Offres reçues" dans /admin/artworks/[id]
    - Query Drizzle offers JOIN visitors avec visitorPhone/visitorEmail
    - Tests statiques d'isolation PII visiteur (D-11)
  affects:
    - /admin/artworks/[id] (nouvelle section en bas de page)
tech_stack:
  added: []
  patterns:
    - TDD RED/GREEN — test lecture fichier source (readFileSync sur .tsx)
    - Drizzle leftJoin visitors sur offers — champs PII admin-only
    - desc(offers.amount) — tri montant décroissant (D-10)
    - Promise.all à 4 branches — parallélisation query artwork + types + mediums + offers
    - Badge "Meilleure offre" index === 0 (première ligne = montant max)
    - borderRadius: 0 sur badge (D-03)
key_files:
  created:
    - tests/admin/offer-list.test.ts
  modified:
    - src/app/admin/artworks/[id]/page.tsx
decisions:
  - "Tests d'isolation PII via readFileSync — vérifie statiquement que visitorPhone/visitorEmail sont absents de la page publique sans serveur Next.js"
  - "Promise.all étendu de 3 à 4 branches pour inclure la query offers en parallèle"
metrics:
  duration: "~2 min"
  completed: "2026-05-12"
  tasks_completed: 1
  files_modified: 2
---

# Phase 5 Plan 3: Dashboard Offres Admin Summary

Section "Offres reçues" avec coordonnées visiteur complètes (téléphone, email) dans la page détail admin — tableau 6 colonnes trié par montant décroissant avec badge "Meilleure offre", isolé par auth artiste (ADMIN-05).

## What Was Built

La page `/admin/artworks/[id]` reçoit une section "Offres reçues" en bas de page. Elle affiche toutes les offres soumises pour l'œuvre courante avec :

- **Colonne Visiteur** — `displayName` + badge "Meilleure offre" sur la première ligne (index 0, car tri `desc(offers.amount)`)
- **Colonne Téléphone** — `visitors.phone` (PII, admin-only, D-11)
- **Colonne Email** — `visitors.email` (optionnel, PII, admin-only)
- **Colonne Montant** — `parseFloat(amount).toLocaleString('fr-FR')` en Space Mono 16px/600, aligné à droite
- **Colonne Message** — tronqué à 80 caractères + `…` si trop long
- **Colonne Date** — format `dd/mm/yyyy` en Space Mono ink-muted

État vide : bandeau gris "Aucune offre reçue pour cette œuvre."

## TDD Gate Compliance

| Gate | Commit | Description |
|------|--------|-------------|
| RED  | 9582550 | `test(05-03): add failing tests for offer-list privacy isolation` |
| GREEN | 3433739 | `feat(05-03): add offer list section to admin artwork detail page` |

Les 4 tests passent après l'implémentation. La phase REFACTOR n'était pas nécessaire (code lisible dès le premier jet).

## Commits

| Hash | Type | Description |
|------|------|-------------|
| 9582550 | test | RED — 4 tests isolation PII visiteur (3 échouaient avant implémentation) |
| 3433739 | feat | GREEN — section "Offres reçues" dans la page détail admin |

## Deviations from Plan

None - plan executed exactly as written.

## Security / Threat Model Coverage

| Threat ID | Mitigation | Verified |
|-----------|------------|---------|
| T-05-03-01 | visitorPhone/visitorEmail uniquement dans page admin protégée | Test 1+2 (readFileSync) |
| T-05-03-01 | Page publique /artworks/[id] ne contient pas visitorPhone | Test 3 (readFileSync) |
| T-05-03-02 | Tableau HTML uniquement rendu côté serveur — pas d'endpoint public | Architecture Server Component |
| T-05-03-03 | artworkId via parseInt() + isNaN() guard — Drizzle paramétré | Code existant (ligne 56) |
| T-05-03-04 | Pas de pagination v1 — volume limité galerie personnelle | Accepté |

## Known Stubs

Aucun stub — les données sont directement issues de la DB via la query Drizzle.

## Self-Check: PASSED

- `src/app/admin/artworks/[id]/page.tsx` — modifié (contient visitorPhone, visitorEmail, desc(offers.amount), "Meilleure offre")
- `tests/admin/offer-list.test.ts` — créé (4 tests passent)
- Commits 9582550 et 3433739 — vérifiés dans git log
- TypeScript : 0 erreurs (`npx tsc --noEmit`)
