# Requirements — Galerie POF

**Version:** v1
**Date:** 2026-04-22
**Status:** Approved

---

## v1 Requirements

### GALLERY — Affichage de la galerie

- [ ] **GALLERY-01** : L'utilisateur voit les œuvres en scroll vertical (1 colonne) sur mobile
- [ ] **GALLERY-02** : L'utilisateur voit les œuvres en grille masonry (2-3 colonnes) sur desktop
- [ ] **GALLERY-03** : L'utilisateur peut filtrer les œuvres par type (dessin / peinture) et par médium (crayon, encre, acrylique, huile)
- [ ] **GALLERY-04** : Chaque œuvre a une page dédiée avec URL propre, zoom haute-résolution, et navigation précédent/suivant

### ART — Métadonnées des œuvres

- [ ] **ART-01** : Chaque œuvre affiche son titre et sa date de création
- [ ] **ART-02** : Chaque œuvre peut avoir une description / commentaire libre de l'artiste
- [ ] **ART-03** : Chaque œuvre est classifiée par type (dessin / peinture) et par médium (crayon, encre, acrylique, huile)
- [ ] **ART-04** : Chaque œuvre indique ses dimensions (en cm)
- [ ] **ART-05** : Chaque œuvre a un statut : disponible / vendue / donnée / réservée

### PIPE — Pipeline de traitement d'image

- [x] **PIPE-01** : L'artiste peut uploader une image depuis son ordinateur ou son téléphone
- [ ] **PIPE-02** : Le pipeline corrige automatiquement l'exposition et le contraste de l'image
- [ ] **PIPE-03** : Le pipeline effectue une balance des blancs basique (normalisation des couleurs)
- [ ] **PIPE-04** : L'artiste voit un écran de comparaison avant/après et valide manuellement avant publication
- [ ] **PIPE-05** : L'artiste peut choisir de publier l'image brute sans correction

### AUTH — Accès et comptes

- [ ] **AUTH-01** : Toute la galerie, les pages détail et l'historique des offres sont accessibles sans aucun compte
- [ ] **AUTH-02** : Pour soumettre une offre, le visiteur crée un profil léger : pseudo OU nom + prénom, numéro de téléphone (obligatoire), email (optionnel)
- [ ] **AUTH-03** : Un visiteur peut retrouver son compte en saisissant son numéro de téléphone
- [ ] **AUTH-04** : L'artiste dispose d'un compte admin séparé protégé par email + mot de passe

### MARKET — Système d'offres

- [ ] **MARKET-01** : Chaque œuvre disponible affiche un prix de base avec sa justification détaillée (temps passé, format/dimensions, encadré ou non, matériaux, technicité, attachement de l'artiste)
- [ ] **MARKET-02** : Un visiteur avec un profil peut soumettre une offre libre (montant + message optionnel) ; un avertissement s'affiche si l'offre est sous le prix de base
- [ ] **MARKET-03** : L'artiste reçoit un email automatique à chaque nouvelle offre (avec le montant et les coordonnées du visiteur)
- [ ] **MARKET-04** : La page de l'œuvre affiche le nombre d'offres reçues et la meilleure offre par défaut ; le détail complet de l'historique est accessible via un bouton opt-in

### ADMIN — Back-office de l'artiste

- [ ] **ADMIN-01** : L'artiste peut ajouter une nouvelle œuvre avec tous ses champs (titre, date, description, classification, dimensions) et la fiche de prix de base détaillée
- [ ] **ADMIN-02** : L'artiste peut modifier ou supprimer une œuvre existante
- [ ] **ADMIN-03** : L'artiste accède à l'écran de validation pipeline (comparaison avant/après) et peut valider, rejeter ou publier sans correction
- [ ] **ADMIN-04** : L'artiste peut changer le statut d'une œuvre (disponible → vendue / donnée / réservée)
- [ ] **ADMIN-05** : L'artiste peut consulter toutes les offres reçues avec les informations complètes du visiteur (pseudo/nom, téléphone, email si fourni, montant, message)

### ABOUT — Page à propos

- [ ] **ABOUT-01** : Une page présente l'artiste, ses inspirations et la démarche du site

---

## v2 Requirements (déférés)

- Système de likes sur les œuvres
- Partage vers les réseaux sociaux (Open Graph, bouton partager)
- Vérification par SMS (OTP) pour sécuriser les comptes visiteurs
- Photo in-situ (œuvre mise en contexte dans un intérieur)
- Groupement par séries

---

## Hors scope (explicitement exclus)

- **Paiement en ligne** — les transactions se font hors plateforme après accord entre artiste et acheteur
- **Enchères avec timer** — offres libres préférées, plus adapté à la vente directe artiste-acheteur
- **Conversion HEIC** — les photos iPhone en format HEIC sont rejetées avec un message explicatif en v1 (trop complexe techniquement, rare en pratique)
- **Multi-artiste** — site dédié à un seul artiste
- **Réseau social entre visiteurs** — pas l'objectif du site

---

## Traceability

| REQ-ID | Phase | Plan |
|--------|-------|------|
| AUTH-04 | Phase 1 | 01-03 |
| PIPE-01 | Phase 2 | 02-01 |
| PIPE-02 | Phase 2 | 02-02 |
| PIPE-03 | Phase 2 | 02-02 |
| PIPE-04 | Phase 2 | 02-04 |
| PIPE-05 | Phase 2 | 02-04 |
| ADMIN-03 | Phase 2 | 02-04 |
| GALLERY-01 | Phase 3 | 03-01 |
| GALLERY-02 | Phase 3 | 03-01 |
| GALLERY-03 | Phase 3 | 03-02 |
| GALLERY-04 | Phase 3 | 03-03 |
| ART-01 | Phase 3 | 03-03 |
| ART-02 | Phase 3 | 03-03 |
| ART-03 | Phase 3 | 03-03 |
| ART-04 | Phase 3 | 03-03 |
| ART-05 | Phase 3 | 03-01 |
| ABOUT-01 | Phase 3 | 03-04 |
| AUTH-01 | Phase 4 | 04-01 |
| AUTH-02 | Phase 4 | 04-01 |
| AUTH-03 | Phase 4 | 04-01 |
| MARKET-01 | Phase 4 | 04-02 |
| MARKET-02 | Phase 4 | 04-03 |
| MARKET-03 | Phase 4 | 04-04 |
| MARKET-04 | Phase 4 | 04-04 |
| ADMIN-01 | Phase 5 | 05-02 |
| ADMIN-02 | Phase 5 | 05-01 |
| ADMIN-04 | Phase 5 | 05-01 |
| ADMIN-05 | Phase 5 | 05-03 |
