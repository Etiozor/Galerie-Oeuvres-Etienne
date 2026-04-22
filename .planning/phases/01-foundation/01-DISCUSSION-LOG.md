# Phase 1: Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-22
**Phase:** 01-foundation
**Areas discussed:** Classification des œuvres, Accès admin

---

## Classification des œuvres

| Option | Description | Selected |
|--------|-------------|----------|
| Liste fixe pour l'instant | Types et médiums hardcodés en v1 | |
| Extensible par moi-même | Ajout de nouveaux médiums depuis l'admin sans code | ✓ |

**User's choice:** Extensible — l'artiste veut pouvoir ajouter de nouveaux médiums depuis l'interface admin

---

| Option | Description | Selected |
|--------|-------------|----------|
| Non, type + médium suffit | Classification en 2 niveaux | |
| Oui, des tags libres | Étiquettes libres en plus (portrait, paysage, offert à Paul...) | ✓ |

**User's choice:** Tags libres — en plus du type et du médium, l'artiste veut pouvoir taguer librement ses œuvres

---

## Accès admin

| Option | Description | Selected |
|--------|-------------|----------|
| /admin | URL standard | ✓ |
| /studio | URL artistique | |
| /dashboard | URL classique | |

**User's choice:** `/admin`

---

| Option | Description | Selected |
|--------|-------------|----------|
| Email + mot de passe suffit | Simple, standard | ✓ |
| URL secrète en plus | Obscurité supplémentaire | |

**User's choice:** Email + mot de passe uniquement — usage personnel, la simplicité prime

---

## Claude's Discretion

- Structure exacte des tables et colonnes
- Configuration Docker Compose
- Approche des migrations Drizzle
- Inclusion optionnelle de données de seed pour faciliter le développement

## Deferred Ideas

- Aucune idée hors-scope soulevée pendant la discussion
