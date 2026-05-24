# Galerie POF — Project Guide

## Project Overview

Site-galerie personnel pour exposer et vendre des œuvres d'art (dessins et peintures). Scroll vertical à l'Instagram sur mobile, grille masonry sur desktop. Système d'offres d'achat avec historique public. Upload direct sans traitement d'image — le fichier original est utilisé tel quel.

## Stack

- **Framework**: Next.js 15 App Router (TypeScript)
- **Base de données**: PostgreSQL via Docker (Drizzle ORM)
- **Auth artiste**: Better Auth (email + mot de passe)
- **Auth visiteurs**: Profils légers (pseudo/nom + téléphone, sans mot de passe)
- **Images**: Upload direct (pas de traitement — fichier original utilisé tel quel)
- **Storage local**: Filesystem local (StorageProvider abstrait)
- **Storage prod**: Cloudflare R2 (S3-compatible)
- **Email**: Resend
- **Validation**: Zod
- **UI**: Tailwind CSS 4 + shadcn/ui
- **Deploy**: Railway

## Code Style

- **Commenter tout le code** : L'artiste n'est pas développeur. Chaque fonction, route, modèle de données doit être commenté clairement en français. Expliquer le POURQUOI, pas seulement le QUOI.
- TypeScript strict partout
- Server Actions pour les mutations (pas d'API REST séparée)
- Server Components pour le rendu public (SEO)

## GSD Workflow

Ce projet utilise le workflow GSD. Les artefacts de planning sont dans `.planning/`.

- **Mode**: YOLO (auto-approve)
- **Granularité**: Standard (6 phases)
- **Recherche**: Activée avant chaque phase
- **Vérification**: Activée après chaque phase

### Phases

1. **Foundation** — DB schema, auth artiste, storage abstraction
2. **Upload** — Upload direct, stockage original, publication immédiate
3. **Public Gallery** — Galerie responsive, filtres, page détail, à propos
4. **Visitor Profiles & Offers** — Profils visiteurs, offres, historique, emails
5. **Admin Back-office** — CRUD œuvres, statuts, dashboard offres
6. **Production Readiness** — R2, Railway, smoke test

### Commandes

```
/gsd-discuss-phase 1   # Démarrer la phase suivante
/gsd-plan-phase 1      # Planifier directement
/gsd-progress          # Voir l'avancement
```

## Points d'attention critiques

### Upload image (Phase 2)
- Pas de traitement d'image : le fichier original est stocké tel quel
- Rejeter les fichiers HEIC avec un message clair (message spécifique iPhone)
- Un seul chemin stocké : `original_path`
- L'œuvre est immédiatement publiée après upload (`publishedAt = now()`)
- La visibilité en galerie est contrôlée par `publishedAt IS NOT NULL`

### Auth
- L'artiste : Better Auth email + mot de passe, rôle ARTIST
- Les visiteurs : numéro de téléphone comme identifiant unique, pas de mot de passe
- Toute la galerie est publique (aucun compte requis pour voir)

### Storage
- `StorageProvider` est une interface — local en dev, R2 en prod
- Ne jamais hardcoder de chemins `/public/uploads/...` dans le code applicatif
- La DB stocke uniquement des clés de stockage, pas des chemins absolus

### Offres
- Plancher souple : afficher un avertissement si l'offre est sous le prix de base, ne pas bloquer
- Rate limit : 3 offres par visiteur par œuvre
- Historique public : afficher par défaut le nombre d'offres + la meilleure ; détail complet en opt-in (évite l'ancrage psychologique à la baisse)

## Décisions clés

| Décision | Raison |
|----------|--------|
| PostgreSQL dès le début (pas SQLite) | Évite les bugs de migration SQLite→Postgres en production |
| StorageProvider abstrait dès le départ | Swap local→R2 sans toucher au code applicatif |
| Upload direct sans traitement d'image | Simplicité — pas de Sharp, pas de validation, l'original est affiché tel quel |
| Profils visiteurs sans mot de passe | Simplicité d'accès voulue par l'artiste |
| Historique offres en opt-in | Évite l'ancrage des prix vers le bas |
