---
phase: 05-admin-backoffice
plan: "05"
subsystem: visitor-nav
tags: [sitenav, async-server-component, modal-trigger, visitor-session, suspense]
dependency_graph:
  requires:
    - 04-01  # iron-session getVisitorSession()
    - 04-03  # VisitorProfileModal composant
    - 05-04  # /mon-profil page destination du lien initiale
  provides:
    - indicateur-connexion-sitenav  # Carré initiale ou lien S'identifier dans la nav
    - modal-trigger-layout          # ModalTrigger avec Suspense dans layout racine
  affects:
    - src/app/layout.tsx            # Toutes les pages (ModalTrigger présent partout)
    - src/components/layout/SiteNav.tsx  # Nav visible sur toutes les pages publiques
tech_stack:
  added: []
  patterns:
    - async Server Component lisant iron-session (getVisitorSession)
    - Client Component useSearchParams avec Suspense boundary dans layout
    - Param URL ?identify=1 comme déclencheur de modal sans état React global
key_files:
  created:
    - src/components/layout/ModalTrigger.tsx
  modified:
    - src/components/layout/SiteNav.tsx
    - src/app/layout.tsx
decisions:
  - "SiteNav rendu async Server Component — pattern transparent pour React, compatible Next.js 15"
  - "ModalTrigger séparé de SiteNav — useSearchParams est un hook Client Component uniquement"
  - "Placement ModalTrigger dans layout.tsx racine — présent sur toutes les pages sans répétition"
  - "?identify=1 comme déclencheur — propre, sans Context React global, compatible SSR"
  - "borderRadius: 0 sur le carré initiale — D-03 : zéro coins arrondis sur tous les éléments"
metrics:
  duration: "102s (~2 min)"
  completed: "2026-05-12"
  tasks_completed: 1
  tasks_total: 1
  files_created: 1
  files_modified: 2
---

# Phase 5 Plan 05 : SiteNav Async + ModalTrigger Summary

**One-liner:** SiteNav async Server Component avec indicateur de connexion visiteur (carré initiale ou lien S'identifier) et ModalTrigger Client Component déclenché par `?identify=1`, intégré dans le layout racine avec Suspense boundary.

## Tasks Completed

| Task | Description | Commit | Status |
|------|-------------|--------|--------|
| 1 | SiteNav async + ModalTrigger + intégration layout | 751fe37 | Done |
| 2 | Checkpoint human-verify | — | Pending (human) |

## Implementation Details

### SiteNav.tsx — async Server Component (D-15, D-16)

`SiteNav` est maintenant une fonction async qui appelle `await getVisitorSession()` au début du rendu. Le retour de session est utilisé pour afficher conditionnellement :

- **Visiteur connecté** : carré 28×28px, fond `var(--color-ink)` (#1a1a1a), initiale en blanc Space Mono 13px, `borderRadius: 0` (D-03), lié à `/mon-profil`.
- **Visiteur non connecté** : lien "S'identifier" Space Mono 11px uppercase lettre-spacing 0.08em, href `?identify=1`.

Le premier caractère de `session.displayName` est rendu par JSX — React échappe automatiquement les caractères HTML (mitigation T-05-05-04, pas de XSS possible).

### ModalTrigger.tsx — Client Component (D-17)

Nouveau composant Client placé dans le layout racine :
- `useSearchParams()` surveille le changement de `?identify=1` dans l'URL
- `useEffect` ouvre le modal (`setIsOpen(true)`) quand le paramètre est détecté
- `router.replace(window.location.pathname)` nettoie l'URL à la fermeture sans rechargement
- Rend `<VisitorProfileModal isOpen={isOpen} onClose={handleClose} />`

### layout.tsx — Suspense boundary (T-05-05-05)

`ModalTrigger` est ajouté dans le `<body>` du layout racine, enveloppé dans :
```tsx
<Suspense fallback={null}>
  <ModalTrigger />
</Suspense>
```

Le `Suspense` est **obligatoire** : `useSearchParams()` dans `ModalTrigger` exige un boundary Suspense pour que `next build` réussisse (Pitfall 4 RESEARCH.md). `fallback={null}` : aucun contenu visible pendant la résolution initiale (le modal est fermé par défaut).

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None — tous les comportements sont pleinement câblés :
- `getVisitorSession()` retourne la session iron-session réelle
- `VisitorProfileModal` est un composant complet (Phase 4)
- `/mon-profil` est créé dans le plan 05-04

## Threat Flags

Aucune surface de sécurité nouvelle non documentée dans le plan. Toutes les menaces identifiées (T-05-05-01 à T-05-05-05) sont traitées par la conception :

| Menace | Traitement |
|--------|------------|
| T-05-05-02 : cookie forgeable | iron-session AES-256-CBC — non forgeable sans clé. SiteNav lecture seule. |
| T-05-05-04 : XSS displayName | JSX scalaire — React échappe automatiquement. Pas de dangerouslySetInnerHTML. |
| T-05-05-05 : build échoue | `<Suspense fallback={null}>` présent dans layout.tsx, documenté. |

## Self-Check: PASSED

| Item | Status |
|------|--------|
| src/components/layout/SiteNav.tsx | FOUND |
| src/components/layout/ModalTrigger.tsx | FOUND |
| src/app/layout.tsx | FOUND |
| commit 751fe37 | FOUND |
