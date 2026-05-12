---
phase: 5
slug: admin-backoffice
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-11
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 5-01-01 | 01 | 1 | ADMIN-02, ADMIN-04 | T-05-01 | Suppression requiert confirmation dialog ; statut changeable uniquement par artiste connecté | unit | `npx vitest run tests/admin/artwork-actions.test.ts` | ❌ W0 | ⬜ pending |
| 5-02-01 | 02 | 1 | ADMIN-01, ADMIN-02 | T-05-02 | updateArtwork valide Zod avant écriture DB ; champs nullable si non renseignés | unit | `npx vitest run tests/admin/update-artwork.test.ts` | ❌ W0 | ⬜ pending |
| 5-03-01 | 03 | 1 | ADMIN-05 | T-05-03 | Téléphone/email visiteur jamais exposé sans session artiste | unit | `npx vitest run tests/admin/offer-list.test.ts` | ❌ W0 | ⬜ pending |
| 5-04-01 | 04 | 2 | — | T-05-04 | /mon-profil redirige si session visiteur absente | unit | `npx vitest run tests/visitor/profile.test.ts` | ❌ W0 | ⬜ pending |
| 5-04-02 | 04 | 2 | — | T-05-04 | toggleSavedArtwork upsert/delete idempotent ; limite 1 entrée par visiteur par œuvre | unit | `npx vitest run tests/visitor/saved-artworks.test.ts` | ❌ W0 | ⬜ pending |
| 5-05-01 | 05 | 2 | — | — | SiteNav affiche initiale si connecté, lien S'identifier si non connecté | manual | Browser test — voir Manual-Only | — | ⬜ pending |

---

## Wave 0 Requirements

- [ ] `tests/admin/artwork-actions.test.ts` — stubs pour ADMIN-02, ADMIN-04 (changeStatus, deleteArtwork)
- [ ] `tests/admin/update-artwork.test.ts` — stubs pour ADMIN-01, ADMIN-02 (updateArtwork Zod validation)
- [ ] `tests/admin/offer-list.test.ts` — stubs pour ADMIN-05 (getOffersForArtwork — phone/email visible admin only)
- [ ] `tests/visitor/profile.test.ts` — stubs pour /mon-profil guard + acquisitions heuristic
- [ ] `tests/visitor/saved-artworks.test.ts` — stubs pour toggleSavedArtwork (upsert/delete)

*Infrastructure Vitest existante couvre déjà le projet — aucune installation requise.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| SiteNav affiche initiale du visiteur connecté | D-15 CONTEXT | Server Component async — pas de test Vitest | 1. Connecter un visiteur ; 2. Vérifier carré initiale dans SiteNav sur / |
| AlertDialog suppression s'ouvre et bloque | ADMIN-02 | Interaction UI dialog | 1. Aller sur /admin/artworks/[id] ; 2. Cliquer "Supprimer l'œuvre" ; 3. Vérifier dialog s'ouvre avec titre correct |
| Bouton cœur toggle favori visible si connecté | D-14 CONTEXT | Client Component + iron-session | 1. Connecter visiteur ; 2. Aller sur détail d'une œuvre ; 3. Cliquer cœur ; vérifier sauvegarde + état toggled |
| /mon-profil affiche 4 sections avec données réelles | D-13 CONTEXT | Rendu DB complet | 1. Connecter visiteur avec offres existantes ; 2. Naviguer vers /mon-profil ; 3. Vérifier chaque section |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
