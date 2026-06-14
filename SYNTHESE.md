# Galerie POF — Document de synthèse du projet

## Ce qu'est ce projet

Une galerie en ligne personnelle permettant à un artiste d'exposer et de vendre ses œuvres (dessins, peintures). L'objectif fondamental : remplacer le "chercher dans ses photos de téléphone" par une vitrine centralisée, soignée, où chaque œuvre peut trouver preneur.

Le site est public (aucun compte requis pour consulter), épuré visuellement — scroll vertical façon Instagram sur mobile, grille masonry sur desktop — avec un système d'offres d'achat libre et un back-office pour l'artiste.

---

## Sujets abordés

### 1. Infrastructure et base de données
Mise en place d'un environnement de développement local complet : PostgreSQL via Docker, Drizzle ORM comme interface typée, migrations, script de seed. Le schéma couvre les œuvres, leurs métadonnées, les types d'œuvres, les médiums, les tags, les visiteurs, les offres et les favoris.

### 2. Authentification à deux niveaux
Deux systèmes d'auth coexistent et sont intentionnellement distincts :
- **L'artiste** : compte email + mot de passe via Better Auth, sessions sécurisées, routes `/admin` protégées par middleware.
- **Les visiteurs** : profils légers identifiés par numéro de téléphone uniquement, sans mot de passe. Philosophie de simplicité d'accès assumée.

### 3. Pipeline de traitement d'image
Upload depuis mobile ou PC, rejet explicite des fichiers HEIC (format iPhone non supporté), correction automatique via Sharp (exposition, contraste, balance des blancs), stockage en trois variantes (original, traité, miniature). L'artiste valide ou rejette le résultat avant publication. État machine du pipeline (PENDING → PROCESSING → AWAITING_VALIDATION / FAILED).

### 4. Galerie publique responsive
Page galerie avec scroll vertical (mobile) et grille masonry CSS (desktop), filtres par type et médium persistés en paramètres URL, page détail par œuvre avec URL propre, zoom haute résolution, navigation précédent/suivant, métadonnées complètes et balises Open Graph pour le partage social.

### 5. Système d'offres et de marché
Prix de base justifié par 6 facteurs (temps passé, format, encadrement, matériaux, technicité, attachement sentimental). Soumission d'offres libre avec plancher souple (avertissement si sous le prix, pas de blocage). Rate limit à 3 offres par visiteur par œuvre. Historique public en opt-in (compte d'offres + meilleure offre par défaut, détail sur demande).

### 6. Back-office artiste
Dashboard de gestion des œuvres : création complète (15 champs), édition, suppression, changement de statut (Disponible / Vendue / Donnée / Réservée), consultation des offres reçues avec coordonnées complètes des visiteurs. Interface admin redesignée avec drawer latéral redimensionnable, stat tiles, cartes avec badges overlay.

### 7. Notifications email
Envoi automatique via Resend à chaque nouvelle offre : montant et coordonnées du visiteur transmis à l'artiste en temps réel.

### 8. Profil visiteur
Page `/mon-profil` : informations de compte, mes offres soumises, mes œuvres enregistrées (favoris via un bouton cœur sur les pages détail), indicateur de connexion dans la navigation.

### 9. Responsive mobile et tablette
Navigation hamburger (menu latéral 280px), FilterDrawer galerie sur mobile (bottom sheet), adaptation CSS de toutes les pages publiques et admin (`/about`, `/mon-profil`, `/admin/upload`, `/admin/artworks/[id]`).

### 10. Abstraction du stockage
Interface `StorageProvider` avec adaptateur local en développement et R2 (Cloudflare, S3-compatible) en production. Swap sans toucher au code applicatif — uniquement via variable d'environnement.

---

## Concepts clés

| Concept | Ce qu'il résout |
|---------|----------------|
| **StorageProvider abstrait** | Découple l'application du support physique des fichiers. Local en dev, R2 en prod — un seul `STORAGE_BACKEND=r2` suffit. |
| **Plancher souple sur les offres** | L'artiste fixe un prix de référence justifié, mais le visiteur peut proposer moins. Avertissement, pas blocage. Respect de la relation directe artiste-acheteur. |
| **Historique d'offres en opt-in** | Évite l'ancrage psychologique à la baisse : afficher d'emblée la meilleure offre incite les suivants à s'aligner vers le bas. L'opt-in inverse la logique. |
| **Profils visiteurs sans mot de passe** | Le téléphone est l'identifiant unique. Simplicité d'accès voulue — pas de friction pour soumettre une offre. |
| **Types et médiums en table, pas en enum** | L'artiste peut ajouter un nouveau médium depuis l'admin sans intervention d'un développeur. |
| **`publishedAt` comme contrôle de visibilité** | Une œuvre est visible dans la galerie si et seulement si `publishedAt IS NOT NULL`. Pas de champ `isPublished` booléen redondant. |
| **Clés de stockage, jamais de chemins absolus** | La DB stocke `"originals/abc123.jpg"`, pas `/var/uploads/originals/abc123.jpg`. Le StorageProvider construit l'URL finale. |
| **Server Components par défaut** | Le rendu public est côté serveur (SEO, performance). Seuls les composants interactifs sont marqués `'use client'`. |
| **Server Actions pour les mutations** | Pas d'API REST séparée — les formulaires appellent des Server Actions Zod-validées directement. |

---

## Apprentissages à haut niveau

**Séparer les deux systèmes d'auth dès le départ** s'est avéré juste. Mélanger les sessions artiste et visiteur dans une même table aurait produit des bugs de sécurité et une logique de rôles complexe. Deux tables, deux cookies, deux flux indépendants — la clarté conceptuelle a évité des problèmes en aval.

**L'abstraction de stockage a tenu sa promesse.** Le code applicatif n'a jamais eu besoin de savoir s'il écrit dans le filesystem ou dans R2. Cette décision prise en Phase 1 n'a requis aucune modification lors des phases suivantes.

**Le schéma PostgreSQL from the start** (plutôt que SQLite → migration plus tard) a éliminé une catégorie entière de problèmes. Les différences de comportement SQLite/Postgres sur les types de données et les contraintes sont réelles et coûteuses à corriger tard.

**Le responsive est plus facile à planifier en avance qu'à corriger a posteriori.** Les Phases 8 et 9 (responsive) ont requis des interventions dans presque toutes les pages existantes. Intégrer la contrainte mobile dans les phases fonctionnelles aurait réduit ce travail de rattrapage.

**L'opt-in sur l'historique des offres est un choix de produit non-évident.** L'instinct initial était d'afficher l'historique complet pour la transparence. L'analyse a montré que l'affichage par défaut de la meilleure offre crée un effet d'ancrage inverse — les acheteurs suivants proposent moins pour "ne pas surpayer". L'opt-in protège la valeur des œuvres.

**Les commentaires en français dans le code** sont un vrai différenciateur quand le mainteneur n'est pas développeur. Le choix de commenter le POURQUOI (pas le QUOI) a produit un code documenté qui reste lisible même sans contexte de session.

---

## État actuel (juin 2026)

7 phases sur 9 sont complètes. Le site est fonctionnel localement dans sa totalité : galerie, offres, back-office, responsive. La Phase 6 (mise en production sur Railway + Cloudflare R2) est la prochaine étape avant le lancement public.
