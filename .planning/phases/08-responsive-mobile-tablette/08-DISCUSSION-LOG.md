# Phase 8: Responsive Mobile/Tablette — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-07
**Phase:** 08-responsive-mobile-tablette
**Areas discussed:** Navigation mobile

---

## Navigation mobile

| Option | Description | Selected |
|--------|-------------|----------|
| Hamburger | Logo gauche, icône hamburger droite (44×44px). Overlay ou panneau avec liens en grand. | ✓ |
| Bottom navigation bar | Barre fixe en bas (style Instagram) avec icônes galerie/à propos/profil. | |
| Nav condensée actuelle | Garder horizontale mais agrandir touch targets (padding vertical 12px). | |

**User's choice:** Hamburger

---

### Type de rendu hamburger

| Option | Description | Selected |
|--------|-------------|----------|
| Overlay plein écran | Fond crème #f2e8cf plein écran, liens Oswald 32px uppercase. | |
| Panneau latéral glissant | Drawer depuis la droite (280px), fond #ede0b8, overlay sombre derrière. | ✓ |
| Dropdown sous la nav | Accordeon qui s'ouvre juste sous la barre 56px. | |

**User's choice:** Panneau latéral glissant (280px, fond surface, overlay sombre, fermeture par tap extérieur)

---

### Breakpoint hamburger

| Option | Description | Selected |
|--------|-------------|----------|
| ≤ 768px | Mobile + tablette portrait en hamburger. Tablette paysage et desktop gardent la nav horizontale. | ✓ |
| ≤ 1024px | Hamburger jusqu'à tablette paysage incluse. Desktop seulement garde la nav horizontale. | |
| ≤ 640px | Seulement les petits téléphones. Tablettes (768px+) gardent la nav actuelle. | |

**User's choice:** ≤ 768px

---

## Claude's Discretion

- Admin back-office mobile : non discuté → Claude recommande desktop/tablette prioritaire, drawer plein-largeur sur < 768px
- Hover → tactile : non discuté → tap direct vers page détail (pas d'overlay intermédiaire)
- Filtres galerie mobile : non discuté → pills scrollables horizontalement
- Formulaire d'offre avec clavier virtuel : non discuté → scroll-padding-bottom au planner

## Deferred Ideas

- Bottom navigation bar — non retenue lors de la sélection
- Admin sur téléphone — déféré, non prioritaire
- Gestes swipe prev/next — v2
- Pull-to-refresh — v2
