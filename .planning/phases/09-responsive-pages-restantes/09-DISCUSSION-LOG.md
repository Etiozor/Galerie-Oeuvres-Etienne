# Phase 9: Responsive Pages restantes — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-08
**Phase:** 09-responsive-pages-restantes
**Areas discussed:** Périmètre, FilterBar mobile

---

## Périmètre

| Option | Description | Selected |
|--------|-------------|----------|
| /about + /mon-profil uniquement | Pages publiques seulement, admin ignoré | |
| Tout de même inclure /admin/upload | Upload inclus même si upload = PC | ✓ |
| Toute l'app | Toutes les pages (utilisateur a élargi en cours de discussion) | ✓ |

**User's choice:** Initialement "/about + /mon-profil + /admin/upload", puis élargi à toute l'app — "j'aimerais que tout soit clean sur tablette et cellulaire. Même les pages admin bien que je n'y aille pas régulièrement sur cell."

**Notes:** L'artiste uploade et édite depuis PC. Les pages admin sont incluses avec une priorité "pas cassé sur mobile" plutôt que "optimisé". `/admin/login` exclu car formulaire simple.

---

## FilterBar mobile

| Option | Description | Selected |
|--------|-------------|----------|
| Bouton "Filtres" + tiroir | Un bouton compact, tap → panneau avec tous les filtres | ✓ |
| Scroll horizontal (garder Phase 8) | Chips sur 1 ligne scrollable | |
| Masquer au scroll | Barre disparaît en scrollant, réapparaît en remontant | |

**User's choice:** Bouton "Filtres" + tiroir

**Notes:** L'utilisateur a signalé que la FilterBar prend "presque un tiers de la page" sur mobile — problème d'espace vertical. Le tiroir résout ça en condensant les filtres derrière un bouton compact.

---

## Claude's Discretion

- Padding/spacing exact sur chaque page mobile
- Bottom sheet vs panneau latéral pour le tiroir FilterBar
- Animation du tiroir (slideInFromRight ou slideInFromBottom)
- Adaptations précises de /admin/artworks/[id]
- Taille de grille "œuvres enregistrées" sur /mon-profil

## Deferred Ideas

- Recherche textuelle dans les filtres — nouvelle fonctionnalité
- Gestes swipe prev/next entre œuvres — v2
- Pull-to-refresh — v2
