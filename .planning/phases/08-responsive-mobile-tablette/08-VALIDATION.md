---
phase: 8
slug: responsive-mobile-tablette
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-07
---

# Phase 8 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (déjà installé — utilisé dans toutes les phases précédentes) |
| **Config file** | `vitest.config.ts` (racine du projet) |
| **Quick run command** | `npx vitest run src/components/layout/` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/components/layout/`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd-verify-work`:** Full suite must be green + vérification manuelle DevTools mobile 375px
- **Max feedback latency:** ~15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 8-01-01 | 01 | 1 | D-01/D-02 | XSS displayName | React escape auto | unit | `npx vitest run src/components/layout/HamburgerMenu.test.tsx` | ❌ W0 | ⬜ pending |
| 8-01-02 | 01 | 1 | D-02 | — | N/A | unit | `npx vitest run src/components/layout/HamburgerMenu.test.tsx` | ❌ W0 | ⬜ pending |
| 8-01-03 | 01 | 1 | D-02 | — | N/A | unit | `npx vitest run src/components/layout/HamburgerMenu.test.tsx` | ❌ W0 | ⬜ pending |
| 8-01-04 | 01 | 1 | D-02 | — | N/A | unit | `npx vitest run src/components/layout/SiteNav.test.tsx` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/components/layout/HamburgerMenu.test.tsx` — stubs pour D-01/D-02 (useState open/close, overlay click, Escape key, body overflow, border-radius D-03)
- [ ] `src/components/layout/SiteNav.test.tsx` — si inexistant, tests de rendu Server Component avec mock `getVisitorSession`

*Vérifier si ces fichiers existent déjà avant de les créer.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Responsive CSS mobile (hamburger visible ≤768px, liens cachés) | D-01/D-03 | CSS @media — jsdom ne simule pas les media queries | DevTools → 375px iPhone SE, vérifier hamburger présent, liens desktop absents |
| Touch targets ≥ 44px | CONTEXT.md | Mesure visuelle | DevTools → Accessibility → Touch targets |
| Panneau hamburger glisse depuis la droite | D-02 | Animation CSS — jsdom ne l'exécute pas | Test sur appareil réel ou Chrome DevTools mobile |
| Drawer admin pleine largeur < 768px | Claude's Discretion | CSS !important — jsdom ignore @media | DevTools → 375px, vérifier drawer = 100% width |
| Formulaire d'offre visible au-dessus clavier virtuel | Claude's Discretion | Clavier virtuel non simulable | Test sur iPhone réel, ouvrir formulaire, vérifier scroll |
| FilterBar scrollable horizontalement sur mobile | Claude's Discretion | overflow-x scroll — jsdom ne scroll pas | DevTools → 375px, vérifier scroll horizontal des filtres |
| Aucun border-radius sur le panneau hamburger (D-03) | D-03 Phase 3 | Contrainte design | Inspecter via DevTools — border-radius doit être 0 ou unset |
| Safe area iPhone — contenu du panneau non coupé | Pitfall 6 | Zone sûre OS — DevTools simulable partiellement | DevTools → iPhone 14 Pro, vérifier contenu bas du panneau |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
