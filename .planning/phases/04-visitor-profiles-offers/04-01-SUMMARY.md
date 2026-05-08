---
phase: "04-visitor-profiles-offers"
plan: "01"
subsystem: "visitor-session"
tags: [iron-session, server-action, zod-e164, auth-visitor, cookie]
dependency_graph:
  requires:
    - "03-03: src/app/artworks/[id]/page.tsx (base pour lecture session)"
    - "01-01: src/db/schema.ts visitors table"
  provides:
    - "getVisitorSession() — helper session iron-session pour tous les plans suivants"
    - "createOrLoginVisitor — Server Action upsert visiteur + cookie"
    - "VisitorProfileModal — composant formulaire d'identification"
    - "ArtworkInfoPanel.visitorId/visitorName props — affichage conditionnel"
  affects:
    - "04-02: utilisera getVisitorSession() pour les offres"
    - "04-03: câblera VisitorProfileModal dans la page détail"
tech_stack:
  added:
    - "iron-session v8.0.4 — sessions cookie chiffrées AES-256-CBC"
  patterns:
    - "useActionState(serverAction, null) — React 19 pattern pour Server Actions"
    - "vi.hoisted() — Vitest pattern pour mocks dans les factories vi.mock()"
    - "z.e164() — Zod v4 validation format E.164 téléphone international"
    - "await cookies() — Next.js 15 pattern, cookies() est async"
key_files:
  created:
    - path: "src/lib/session.ts"
      role: "getVisitorSession() + VisitorSessionData + sessionOptions"
    - path: "src/actions/visitor.ts"
      role: "createOrLoginVisitor (upsert) + logoutVisitor — Server Actions"
    - path: "src/components/visitor/VisitorProfileModal.tsx"
      role: "Modal formulaire identification visiteur — useActionState"
    - path: "tests/visitor/profile.test.ts"
      role: "7 tests unitaires AUTH-02 AUTH-03 — TDD RED/GREEN"
  modified:
    - path: "src/app/artworks/[id]/page.tsx"
      role: "Ajout lecture session + passage visitorId/visitorName à ArtworkInfoPanel"
    - path: "src/components/artwork/ArtworkInfoPanel.tsx"
      role: "Ajout props visitorId/visitorName + affichage conditionnel identifié"
decisions:
  - "Cookie pof_visitor_session séparé du cookie Better Auth — coexistence sans conflit"
  - "Session stocke uniquement visitorId + displayName, jamais le téléphone (T-04-01-06)"
  - "Bouton Faire une offre reste disabled en 04-01 — câblage modal reporté à 04-03 (wave conflict)"
  - "vi.hoisted() requis pour les mocks Vitest quand la variable est utilisée dans vi.mock() factory"
metrics:
  duration: "~40 minutes"
  completed_date: "2026-05-07"
  tasks_completed: 3
  tasks_total: 3
  files_created: 4
  files_modified: 2
  tests_added: 7
  tests_passing: 7
---

# Phase 04 Plan 01: Visitor Session Layer Summary

Iron-session v8 cookie layer for visitor identification — upsert by phone (E.164), separate cookie from Better Auth, read server-side in artwork detail page.

## What Was Built

### Task 1 (TDD) — Session helper + createOrLoginVisitor

**`src/lib/session.ts`**
- `VisitorSessionData` interface: `visitorId?: number`, `displayName?: string`
- `sessionOptions`: `cookieName='pof_visitor_session'`, `httpOnly`, `sameSite='lax'`, `maxAge=365j`
- `getVisitorSession()`: `getIronSession<VisitorSessionData>(await cookies(), sessionOptions)` — pattern Next.js 15 obligatoire
- Validation au démarrage : warn si `VISITOR_SESSION_SECRET` absent ou < 32 chars, silencieux en `NODE_ENV=test`

**`src/actions/visitor.ts`**
- `createOrLoginVisitor(prevState, formData)`: Zod `z.e164()` validation, SELECT visiteur existant par téléphone (AUTH-03), INSERT si nouveau, `session.save()` uniquement ici
- `logoutVisitor()`: `session.destroy()` pour usage futur
- Retour typé: `{ success: true }` | `{ success: false, errors: Record<string, string[]> }`

**`tests/visitor/profile.test.ts`** — 7 tests, tous verts
- AUTH-02: création nouveau visiteur avec `+33612345678` → `{ success: true }`
- AUTH-03: lookup existant par téléphone → `db.insert` non appelé, même `visitorId`
- Validation: rejet `0612345678` (sans indicatif), rejet `displayName` < 2 chars
- Internationaux: `+32`, `+41`, `+44` acceptés
- Rejet `+33abc123456` (non numérique)

### Task 2 — VisitorProfileModal

**`src/components/visitor/VisitorProfileModal.tsx`** (>60 lignes, ~250 lignes effectifs)
- `'use client'` — formulaire interactif
- `useActionState(createOrLoginVisitor, null)` — pattern React 19 officiel
- Overlay plein écran `position:fixed`, `backdrop-filter:blur(4px)`, `z-index:50`
- Panel sans `border-radius` (D-03), croix fermeture, clic overlay = fermer
- Champs: `displayName`, `phone` (placeholder `+33612345678`, label E.164), `email` (optionnel)
- Erreurs Zod par champ en Space Mono 11px rouge
- Bouton submit 44px, Oswald uppercase, orange, `disabled={isPending}`
- `useEffect` sur `state.success` → `onSuccess?.()` + `onClose()`

### Task 3 — Lecture session dans la page détail

**`src/app/artworks/[id]/page.tsx`**
- `import { getVisitorSession } from '@/lib/session'`
- `const visitorSession = await getVisitorSession()` après le chargement de l'œuvre
- Props `visitorId={visitorSession.visitorId}` et `visitorName={visitorSession.displayName}` passées à `ArtworkInfoPanel`

**`src/components/artwork/ArtworkInfoPanel.tsx`**
- Nouvelles props: `visitorId?: number`, `visitorName?: string`
- Si `visitorId` défini: "Identifié en tant que **{nom}**" en Space Mono teal
- Si `visitorId` undefined: texte "Soyez le premier à faire une offre."
- Bouton reste `disabled` — câblage `VisitorProfileModal` reporté à Plan 04-03

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] iron-session IronSessionOptions → SessionOptions**
- **Found during:** Task 2 (tsc --noEmit après VisitorProfileModal)
- **Issue:** `iron-session` v8 exporte `SessionOptions`, pas `IronSessionOptions`
- **Fix:** Renommé l'import dans `session.ts`
- **Files modified:** `src/lib/session.ts`
- **Commit:** 7be4ab6

**2. [Rule 1 - Bug] Null-safety sur les résultats Drizzle SELECT/INSERT**
- **Found during:** Task 2 (tsc --noEmit)
- **Issue:** TypeScript strict — `existingVisitors[0]` et `inserted[0]` peuvent être `undefined`
- **Fix:** Guards `if (existingVisitors.length > 0 && existingVisitors[0])` et `if (!newVisitor) throw`
- **Files modified:** `src/actions/visitor.ts`
- **Commit:** 7be4ab6

**3. [Rule 1 - Bug] vi.hoisted() requis pour mockSession dans vi.mock() factory**
- **Found during:** Task 1 (premier run vitest après implémentation)
- **Issue:** `mockSession` utilisé dans factory `vi.mock('@/lib/session', ...)` avant initialisation (hoisting ESM)
- **Fix:** Déplacer `mockSession` et `mockSessionSave` dans `vi.hoisted()` block
- **Files modified:** `tests/visitor/profile.test.ts`
- **Commit:** 9a85fbf

## TDD Gate Compliance

- RED gate: commit `6b5431d` — `test(04-01): add failing tests` (7 tests, 0 passants)
- GREEN gate: commit `9a85fbf` — `feat(04-01): implement visitor session helper` (7/7 passants)
- REFACTOR: micro-refactor inline (fix types, hoisted) inclus dans le commit GREEN

## Known Stubs

- Bouton "Faire une offre" dans `ArtworkInfoPanel` reste `disabled` même si `visitorId` est défini. Ce stub est intentionnel — le câblage avec `VisitorProfileModal` et le formulaire d'offre sera réalisé en Plan 04-03 (Wave 2), après la création du modèle d'offre en Plan 04-02.

## Threat Surface

Aucune nouvelle surface non couverte par le threat model du plan. Les 6 menaces (T-04-01-01 à T-04-01-06) sont toutes mitigées dans l'implémentation.

## Self-Check: PASSED

- `src/lib/session.ts` — FOUND
- `src/actions/visitor.ts` — FOUND
- `src/components/visitor/VisitorProfileModal.tsx` — FOUND
- `tests/visitor/profile.test.ts` — FOUND
- Commits 6b5431d, 9a85fbf, 7be4ab6, 7d6e702 — FOUND
- `npx tsc --noEmit` → 0 erreur
- `npx vitest run tests/visitor/profile.test.ts` → 7/7 passants
- `grep phone src/lib/session.ts` → résultat vide (téléphone jamais en session)
