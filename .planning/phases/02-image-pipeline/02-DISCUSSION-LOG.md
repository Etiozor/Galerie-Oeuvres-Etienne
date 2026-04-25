# Phase 2: Image Pipeline - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-25
**Phase:** 02-image-pipeline
**Areas discussed:** Ordre upload/métadonnées, Écran avant/après, Expérience d'upload, Gestion des erreurs

---

## Ordre upload / métadonnées

| Option | Description | Selected |
|--------|-------------|----------|
| Métadonnées d'abord | L'artiste remplit titre/type/médium avant d'uploader | |
| Upload d'abord | L'artiste uploade la photo, puis renseigne les métadonnées sur le site | ✓ |

**User's choice:** Upload d'abord, métadonnées après sur le site
**Notes:** L'artiste sait évidemment ce qu'il uploade, mais préfère renseigner les informations après l'import sur le site.

---

## Écran de comparaison avant/après

| Option | Description | Selected |
|--------|-------------|----------|
| Side-by-side | Original à gauche, corrigé à droite | ✓ |
| Slider comparateur | Glisser pour voir l'un ou l'autre | |
| Toggle | Bouton pour switcher entre les deux vues | |

**User's choice:** Side-by-side
**Notes:** Vue côte à côte, claire et simple.

---

## Expérience d'upload

| Option | Description | Selected |
|--------|-------------|----------|
| Simple bouton fichier | `<input type="file">` standard — fonctionne partout, iPhone affiche nativement "Prendre une photo" ou "Choisir dans la bibliothèque" | ✓ |
| Drag-and-drop + bouton | Plus confortable sur desktop | |

**User's choice:** Simple bouton fichier (après clarification que l'iPhone gère nativement les deux options)
**Notes:** L'utilisateur n'était pas sûr initialement — clarification apportée sur le comportement natif iOS.

---

## Gestion des erreurs pipeline

| Option | Description | Selected |
|--------|-------------|----------|
| Entrée FAILED + Réessayer | Badge rouge dans la liste admin, bouton pour relancer le pipeline | ✓ |
| Email de notification | En plus du badge admin | |
| Les deux | Badge + email | |

**User's choice:** Réessayer (entrée FAILED avec bouton de relance)
**Notes:** Pas de notification email pour les erreurs pipeline — l'artiste voit directement dans son admin.

---

## Claude's Discretion

- Dimensions de la miniature thumbnail
- Paramètres Sharp de normalisation
- Gestion du polling UI pour l'état du pipeline

## Deferred Ideas

- Barre de progression Sharp — v1 polling suffit
- Notification email échec pipeline — v2
- Recadrage manuel — v2
- Upload par lot — v2
