# Galerie POF

## What This Is

Un site-galerie personnel pour exposer, archiver et vendre les œuvres d'art de l'artiste (dessins et peintures). Le visiteur scroll verticalement à travers les œuvres à l'image d'un Instagram épuré, peut créer un compte pour liker et proposer une offre d'achat. L'artiste dispose d'un back-office pour gérer sa collection et d'un pipeline de traitement d'image avant publication.

## Core Value

Une vitrine centralisée où chaque œuvre est mise en valeur et peut trouver preneur — remplacement définitif du "chercher dans ses photos de téléphone".

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] L'artiste peut uploader une œuvre (PC ou mobile) avec titre, date, description, classification et dimensions
- [ ] Un pipeline auto-corrige l'image (exposition, balance des blancs) et l'artiste valide avant publication
- [ ] Les œuvres s'affichent en scroll vertical façon Instagram
- [ ] Chaque œuvre porte un statut : disponible, donnée, vendue
- [ ] Les visiteurs peuvent créer un compte et liker des œuvres
- [ ] Chaque œuvre a un prix de base justifié (temps, format, cadre, matériaux, technicité, attachement de l'artiste)
- [ ] Les visiteurs connectés peuvent soumettre une offre libre — le prix de base est un plancher souple (avertissement si en dessous)
- [ ] L'artiste reçoit un email à chaque nouvelle offre
- [ ] L'historique des offres est public sur la page de chaque œuvre
- [ ] Une page "À propos" présente l'artiste, ses inspirations et le sens de la démarche

### Out of Scope

- Enchères avec timer — trop complexe pour v1, offres libres suffisent
- Paiement en ligne intégré — les transactions se font hors site après accord
- Réseau social entre visiteurs — ce n'est pas l'objectif

## Context

- L'artiste photographie ses œuvres avec son téléphone ; les photos souffrent souvent d'un éclairage imparfait ou d'une balance des blancs incorrecte
- Le dossier de travail s'appelle "Vente POF" — POF est probablement le nom ou le pseudo de l'artiste
- UI cible : scroll vertical inspiré Instagram, visuels soignés via Claude design
- Déploiement : local d'abord pour tester, mise en ligne à terme (domaine public)

## Constraints

- **Stack**: À définir — doit supporter upload mobile + PC, pipeline image, comptes utilisateurs
- **Déploiement**: Local (dev) puis en ligne — architecture doit être portable
- **Images**: Pipeline de correction automatique avant publication (correction exposition/blancs)
- **Transactions**: Hors plateforme — pas de paiement intégré en v1

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Offres libres plutôt qu'enchères | Moins complexe, plus adapté à une vente directe artiste-acheteur | — Pending |
| Plancher souple sur les bids | Laisse de la flexibilité tout en informant sur la valeur estimée | — Pending |
| Historique des offres public | Crée de la confiance et de la transparence sur le marché de l'œuvre | — Pending |
| Pipeline image auto + validation | L'artiste garde le contrôle final mais ne part pas d'une photo brute | — Pending |
| Compte requis pour liker/bidder | Permet de savoir qui s'intéresse, évite le spam d'offres | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-06-08 — Phase 9 complete (Responsive Pages restantes)*

## Current State

Phase 9 complete — Site entièrement responsive : navigation hamburger (Phase 8), FilterDrawer galerie mobile (Phase 9), toutes les pages publiques et admin adaptées mobile/tablette.

Phases complétées : 1 Foundation, 2 Image Pipeline, 3 Public Gallery, 4 Visitor Profiles & Offers, 5 Admin Back-office, 8 Responsive Mobile/Tablette, 9 Responsive Pages restantes.

Prochaine étape : Phase 6 (Production Readiness — R2, Railway, smoke test).
