---
phase: 04-visitor-profiles-offers
plan: "04"
subsystem: offers-history-email
tags:
  - resend
  - email-notification
  - offer-history
  - client-component
  - tdd
  - security
dependency_graph:
  requires:
    - "04-01 (visitor profiles + iron-session)"
    - "04-02 (price breakdown schema)"
    - "04-03 (submitOffer Server Action + OfferSection)"
  provides:
    - "Email notification artiste (sendNewOfferEmail fire-and-forget)"
    - "OfferHistory composant (résumé + liste opt-in)"
    - "Agrégats offres COUNT/MAX dans la page détail"
  affects:
    - "src/app/artworks/[id]/page.tsx"
    - "src/components/artwork/ArtworkInfoPanel.tsx"
tech_stack:
  added:
    - "resend@6.12.2 (déjà présent dans package.json)"
    - "@testing-library/user-event (installé, non utilisé finalement — fireEvent suffisant)"
  patterns:
    - "Module-level Resend instantiation (RESEARCH.md Piège 3)"
    - "Fire-and-forget email via Promise + .catch() (T-04-04-04)"
    - "TDD RED/GREEN cycle pour OfferHistory"
    - "React.createElement dans les tests .ts (cohérence project — pas de JSX dans .ts)"
    - "Promise.all pour requêtes DB parallèles (agrégats + liste complète)"
key_files:
  created:
    - path: "src/lib/email.ts"
      role: "Client Resend module-level + sendNewOfferEmail()"
    - path: "src/components/artwork/OfferHistory.tsx"
      role: "Composant résumé offres + liste opt-in (Client Component)"
    - path: "tests/offers/history.test.ts"
      role: "12 tests TDD pour OfferHistory"
  modified:
    - path: "src/actions/offers.ts"
      role: "Ajout import visitors + sendNewOfferEmail fire-and-forget post-INSERT"
    - path: "src/app/artworks/[id]/page.tsx"
      role: "Requête Promise.all offres (COUNT/MAX + liste) + props vers ArtworkInfoPanel"
    - path: "src/components/artwork/ArtworkInfoPanel.tsx"
      role: "Import OfferHistory + nouvelles props + câblage avant OfferSection"
    - path: "tests/offers/submit.test.ts"
      role: "Ajout mock @/lib/email + db.query.visitors pour éviter crash sans RESEND_API_KEY"
decisions:
  - "sendNewOfferEmail en fire-and-forget (pas d'await) : l'offre est le résultat critique, pas l'email"
  - "Instance Resend au niveau module (pas dans la fonction) : warm-start cache serverless"
  - "React.createElement dans .ts tests (pas JSX) : oxc parser de Vite refuse JSX dans .ts"
  - "fireEvent.click au lieu de userEvent (synchrone, suffisant pour toggle sans animation)"
  - "Promise.all pour les deux requêtes DB offres : gain ~50% sur les pages avec offres"
  - "OfferHistory visible même pour les oeuvres non-disponibles qui ont reçu des offres"
metrics:
  duration: "9m 8s"
  completed_date: "2026-05-10"
  tasks_completed: 3
  tasks_total: 3
  files_created: 3
  files_modified: 4
---

# Phase 4 Plan 04 : Historique Offres + Email Notification Summary

**One-liner:** Email Resend fire-and-forget à l'artiste + composant OfferHistory opt-in (résumé toujours visible, liste complète au clic) câblé via Promise.all agrégats COUNT/MAX.

## What Was Built

### Tâche 1 : src/lib/email.ts + câblage submitOffer

**src/lib/email.ts** :
- Instance `new Resend(process.env.RESEND_API_KEY)` au niveau module (jamais dans une fonction)
- `ARTIST_EMAIL` : constante serveur avec fallback `etienne.le.pironnec1@gmail.com`
- `FROM_EMAIL` : `onboarding@resend.dev` en dev, `notifications@galeriepof.fr` en prod (Phase 6)
- `sendNewOfferEmail()` : email texte brut avec artworkTitle, visitorName, visitorPhone, amount, message
- Erreur Resend loggée côté serveur seulement — jamais throw pour ne pas bloquer submitOffer

**src/actions/offers.ts** :
- Ajout `import visitors` et `import sendNewOfferEmail`
- GARDE 2 : `columns` étendu pour inclure `title` (nécessaire pour l'objet email)
- Après INSERT : requête `db.query.visitors.findFirst()` pour `displayName + phone` (email privé artiste)
- Pattern fire-and-forget : `sendNewOfferEmail({...}).catch(err => console.error(...))`

### Tâche 2 (TDD) : src/components/artwork/OfferHistory.tsx

**12 tests** couvrant :
- `offerCount === 0` → `null` (pas de section vide)
- `offerCount === 1` → "1 offre" (singulier français, pas "1 offres")
- `offerCount === 3` → "3 offres · Meilleure : 850 €" (résumé visible sans clic)
- Bouton "Voir toutes les offres" visible par défaut (opt-in CLAUDE.md)
- Liste cachée par défaut ; révélée après `fireEvent.click`
- Bouton masqué après le clic (toggle setState)
- Téléphone jamais exposé (T-04-04-01)
- `bestOffer === null` → résumé sans "Meilleure"

**OfferHistory.tsx** :
- `'use client'` (useState toggle uniquement)
- `OfferHistoryItem` exporté (id, amount, message, visitorName, createdAt) — JAMAIS phone
- `return null` si `offerCount === 0`
- Résumé : Space Mono 12px, couleur `--color-ink`
- Bouton : `--color-teal`, underline, minHeight 44px (touch target), D-03 pas de border-radius
- Liste : Cormorant 14px italic pour message, Space Mono 10px muted pour date
- D-03 respecté : aucun `borderRadius` dans le composant

### Tâche 3 : page.tsx + ArtworkInfoPanel

**src/app/artworks/[id]/page.tsx** :
- Imports : `count, max, desc` depuis `drizzle-orm`, `offers, visitors` depuis schema, `OfferHistoryItem`
- `Promise.all` : deux requêtes parallèles
  - Agrégats : `COUNT() + MAX(offers.amount)` → `offerCount + bestOffer`
  - Liste : SELECT `id, amount, message, visitors.displayName, createdAt` — JAMAIS `visitors.phone`
  - `LEFT JOIN visitors` trié par `desc(offers.amount)`
- Filtre `visitorName !== null` (LEFT JOIN sur visiteur supprimé)
- Props `offerCount`, `bestOffer`, `allOffers` passées à `ArtworkInfoPanel`

**src/components/artwork/ArtworkInfoPanel.tsx** :
- Import `OfferHistory` + `OfferHistoryItem`
- Nouvelles props : `offerCount: number`, `bestOffer: string | null`, `allOffers: OfferHistoryItem[]`
- Section 8 refactorée : condition `(status === 'available' || offerCount > 0)`
- `<OfferHistory>` placé avant `<OfferSection>` (historique visible même hors vente)
- `<OfferSection>` conditionnel : `status === 'available'` uniquement

**tests/offers/submit.test.ts** (correction Rule 1) :
- Ajout mock `@/lib/email` → `sendNewOfferEmail: vi.fn().mockResolvedValue(undefined)`
- Ajout `db.query.visitors.findFirst` dans le mock DB
- Sans ces mocks, l'import de `offers.ts` crashait (`Missing API key — new Resend(undefined)`)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Crash des tests submit.test.ts après ajout email.ts**

- **Found during:** Tâche 3 — vérification `npx vitest run tests/visitor/ tests/offers/`
- **Issue:** `email.ts` instancie `new Resend(process.env.RESEND_API_KEY)` au niveau module. Sans `RESEND_API_KEY` dans l'environnement de test, Resend throw `"Missing API key"`. Importer `offers.ts` (qui importe `email.ts`) crashait la suite.
- **Fix:** Ajout de `vi.mock('@/lib/email', ...)` et `db.query.visitors.findFirst` mock dans `submit.test.ts`
- **Files modified:** `tests/offers/submit.test.ts`
- **Commit:** `bd44068`

**2. [Rule 1 - Bug] JSX non supporté dans les fichiers .ts par oxc (Vite)**

- **Found during:** Phase RED de la Tâche 2 — premier run vitest
- **Issue:** Le plan indique `tests/offers/history.test.ts` (extension `.ts`). oxc parser de Vite refuse le JSX dans les fichiers `.ts` — parse error `Expected > but found Identifier`.
- **Fix:** Utilisation de `React.createElement` au lieu de JSX (pattern identique à `pricebreakdown.test.ts` déjà dans le projet)
- **Files modified:** `tests/offers/history.test.ts`
- **Commit:** `382d366`

## TDD Gate Compliance

| Gate | Commit | Status |
|------|--------|--------|
| RED — `test(04-04)` | `382d366` | PASS |
| GREEN — `feat(04-04)` OfferHistory | `85cb93b` | PASS |
| GREEN — `feat(04-04)` câblage | `bd44068` | PASS |

## Known Stubs

Aucun stub. Toutes les données sont réelles :
- `offerCount` et `bestOffer` : requêtes COUNT/MAX en DB
- `allOffers` : requête DB complète avec LEFT JOIN visiteurs
- `sendNewOfferEmail` : appel réel Resend (en dev, sandbox `onboarding@resend.dev`)

## Threat Surface Scan

Pas de nouvelle surface réseau introduite dans ce plan. Les menaces du registre sont toutes mitigées :

| Menace | Mitigation vérifiée |
|--------|---------------------|
| T-04-04-01 : phone dans historique public | `visitors.phone` absent du SELECT, absent de `OfferHistoryItem` |
| T-04-04-02 : RESEND_API_KEY dans bundle client | `email.ts` sans `'use client'`, jamais importé depuis un Client Component |
| T-04-04-03 : ARTIST_EMAIL dans props client | Constante serveur uniquement dans `email.ts` |
| T-04-04-04 : email bloque submitOffer | Pattern fire-and-forget `.catch()` — pas d'`await` |

## Configuration Resend requise (Phase 6)

Pour la mise en production (Phase 6 — Railway) :

```bash
# Variables d'environnement à configurer sur Railway
RESEND_API_KEY=re_xxxxxxxxxxxx    # Resend Dashboard → API Keys
ARTIST_EMAIL=etienne.le.pironnec1@gmail.com  # Déjà défini en fallback

# Domaine expéditeur (optionnel mais recommandé)
# Resend Dashboard → Domains → Add Domain → galeriepof.fr
# Après vérification DNS : FROM_EMAIL passe automatiquement à notifications@galeriepof.fr
```

En développement : `onboarding@resend.dev` fonctionne sans vérification de domaine.

## Self-Check: PASSED

Files created/exist:
- `src/lib/email.ts` — FOUND
- `src/components/artwork/OfferHistory.tsx` — FOUND
- `tests/offers/history.test.ts` — FOUND

Commits exist:
- `a8307fe` — feat(04-04): client Resend module-level — FOUND
- `382d366` — test(04-04): add failing tests — FOUND
- `85cb93b` — feat(04-04): implement OfferHistory — FOUND
- `bd44068` — feat(04-04): requête offres + câblage — FOUND

TypeScript: `npx tsc --noEmit` → 0 erreurs
Tests: `npx vitest run tests/visitor/ tests/offers/` → 37/37 PASS
