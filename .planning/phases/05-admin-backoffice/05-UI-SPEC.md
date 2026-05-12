---
phase: 5
slug: admin-backoffice
status: draft
shadcn_initialized: true
preset: base-nova / neutral / cssVariables
created: 2026-05-11
---

# Phase 5 — UI Design Contract : Admin Back-office

> Contrat visuel et d'interaction pour la Phase 5. Généré par gsd-ui-researcher, vérifié par gsd-ui-checker.
> Toutes les décisions de design héritées des phases 3 et 4 sont reprises ici sans modification.
> Les pages admin utilisent Geist Sans (pas les polices de la galerie publique).

---

## Design System

| Propriété | Valeur |
|-----------|--------|
| Outil | shadcn/ui (style: base-nova) |
| Preset | base-nova, baseColor: neutral, cssVariables: true |
| Bibliothèque de composants | Radix UI (via shadcn base-nova) |
| Bibliothèque d'icônes | lucide-react |
| Police — pages admin | Geist Sans (`var(--font-geist-sans)`) |
| Police — site public / SiteNav | Oswald (titres), Space Mono (labels/nav), Cormorant Garamond (descriptions italiques) |

**Note sur les styles :** Les pages admin existantes (`/admin/artworks`, `/admin/artworks/[id]/validate`) utilisent exclusivement des `inline styles` (pas de classes Tailwind dans les composants). Ce pattern est maintenu en Phase 5 pour cohérence et contrôle exact des couleurs.

---

## Spacing Scale

Valeurs déclarées (multiples de 4) :

| Token | Valeur | Usage |
|-------|--------|-------|
| xs | 4px | Espacement icônes, padding inline (ex : carré initiale SiteNav) |
| sm | 8px | Espacement compact entre éléments (ex : gap entre badge et date) |
| md | 16px | Padding de liste, espacement par défaut des champs de formulaire |
| lg | 24px | Padding de section, espacement entre groupes de champs |
| xl | 32px | Espacement entre sections de page, gap de grille |
| 2xl | 48px | Padding de page (`padding: '48px 16px'` — pattern existant admin) |
| 3xl | 64px | Réservé aux séparations majeures de mise en page |

Exceptions :
- Carré indicateur SiteNav : `28px × 28px` (touche 28px — taille fixe, hors grille)
- Touch target minimum sur mobile : 44px (appliqué via padding autour des éléments cliquables)
- Lignes de tableau admin : `padding: '12px 16px'` (établi en Phase 2, à conserver)

---

## Typographie

### Pages admin (`/admin/*`)

| Rôle | Taille | Graisse | Interligne | Police |
|------|--------|---------|------------|--------|
| Display (titre de page h1) | 28px | 600 | 1.2 | Geist Sans |
| Heading (titre de section h2) | 20px | 600 | 1.3 | Geist Sans |
| Body (texte courant, cellules tableau) | 16px | 400 | 1.5 | Geist Sans |
| Label (champs, colonnes, méta importante) | 14px | 600 | 1.4 | Geist Sans |
| Meta (date, info secondaire, tiny) | 14px | 400 | 1.4 | Geist Sans |

**Note :** Les informations très secondaires (dates, compteurs, métadonnées discrètes) utilisent 14px/400 avec `color: var(--color-ink-muted)` pour la distinction visuelle. La hiérarchie Label vs Meta est portée par la graisse (600 vs 400), pas par la taille.

### Site public — SiteNav (extension Phase 5)

| Rôle | Taille | Graisse | Interligne | Police |
|------|--------|---------|------------|--------|
| Logo nav | 18px | 700 | — | Oswald, uppercase, letter-spacing 0.05em |
| Liens nav | 11px | 400 | — | Space Mono, uppercase, letter-spacing 0.08em |
| Initiale carré compte | 13px | 400 | — | Space Mono |
| Lien "S'identifier" | 11px | 400 | — | Space Mono, uppercase, letter-spacing 0.08em |

### Page /mon-profil (visiteur)

| Rôle | Taille | Graisse | Interligne | Police |
|------|--------|---------|------------|--------|
| Titre de page h1 | 28px | 600 | 1.2 | Oswald, uppercase |
| Titre de section h2 | 16px | 400 | 1.4 | Space Mono, uppercase, letter-spacing 0.08em |
| Corps texte (informations) | 16px | 400 | 1.5 | Geist Sans (ou System UI) |
| Label masqué (téléphone) | 14px | 400 | 1.4 | Space Mono |
| Titre œuvre dans liste offres | 16px | 400 | 1.5 | Geist Sans (lien cliquable) |
| Montant offre | 16px | 600 | 1.5 | Space Mono |
| Date offre | 13px | 400 | 1.4 | Space Mono, color ink-muted |

**Note typographie /mon-profil :** La hiérarchie du h1 est portée par sa taille (28px), sa famille (Oswald) et son casing (uppercase) — la graisse 600 suffit, le 700 n'est pas nécessaire.

---

## Couleurs

**Répartition proportionnelle : `#f2e8cf` dominant (60%) — `#ede0b8` surfaces (30%) — accents chromatiques réservés (10%)**

| Rôle | Valeur | Usage |
|------|--------|-------|
| Dominant (60%) | `#f2e8cf` (`var(--color-bg)`) | Fond des pages publiques et /mon-profil |
| Secondaire (30%) | `#ede0b8` (`var(--color-surface)`) | SiteNav, info panels, fond des sections /mon-profil |
| Fond admin | `#f5f5f5` | Fond des lignes de liste, zones de preview (pattern existant pages admin) |
| Ink | `#1a1a1a` (`var(--color-ink)`) | Texte principal, fond carré initiale SiteNav |
| Ink muted | `#5a5244` (`var(--color-ink-muted)`) | Texte secondaire, méta, labels discrets |
| Teal — accent disponibilité | `#5b8e7d` (`var(--color-teal)`) | Badge "Disponible", CTA principal (offre) |
| Orange — accent action | `#f4a259` (`var(--color-orange)`) | Badge "Réservé", bouton "Faire une offre" |
| Vert — accent don | `#8cb369` (`var(--color-green)`) | Badge "Donné" |
| Jaune — accent sélection | `#f4e285` (`var(--color-yellow)`) | Filtre actif, highlight |
| Rouge — destructif | `#bc4b51` (`var(--color-red)`) | Badge "Vendu", actions destructives (supprimer) |
| Blanc | `#ffffff` | Texte sur fond sombre (initiale carré SiteNav, bouton "Uploader") |

### Attribution de l'accent — règle stricte

L'accent est réservé aux éléments suivants uniquement :

- **Teal `#5b8e7d`** : badge statut "Disponible", bouton CTA principal de soumission d'offre
- **Orange `#f4a259`** : badge statut "Réservé", bouton "Faire une offre" sur la page détail
- **Vert `#8cb369`** : badge statut "Donné"
- **Jaune `#f4e285`** : filtre actif dans la barre de filtres de la galerie
- **Rouge `#bc4b51`** : badge statut "Vendu", bouton "Supprimer l'œuvre" (action destructive), dialog de confirmation de suppression (bouton confirmer)
- **Noir `#1a1a1a`** : fond carré initiale visiteur dans SiteNav, bouton "Uploader une photo" (admin)

### Badges de statut d'œuvre (définitifs)

| Statut | Background | Texte | Libellé affiché |
|--------|------------|-------|-----------------|
| available | `rgba(91,142,125,0.12)` | `#5b8e7d` | Disponible |
| reserved | `rgba(244,162,89,0.15)` | `#a05a20` | Réservé |
| sold | `rgba(188,75,81,0.12)` | `#bc4b51` | Vendu |
| given | `rgba(140,179,105,0.15)` | `#5a7a3a` | Donné |

### Badges d'état pipeline (hérités Phase 2, inchangés)

| État | Background | Texte |
|------|------------|-------|
| pending | `#fafafa` | `#737373` |
| processing | `#eff6ff` | `#1d4ed8` |
| awaiting_validation | `#fefce8` | `#a16207` |
| published | `#f0fdf4` | `#15803d` |
| failed | `#fef2f2` | `#dc2626` |

---

## Contrat de copywriting

### Actions de la CTA principale (admin)

| Élément | Texte |
|---------|-------|
| CTA principal liste admin | Uploader une photo |
| CTA créer une œuvre (formulaire) | Enregistrer l'œuvre |
| CTA modifier métadonnées | Enregistrer les modifications |
| CTA changement de statut | Marquer comme [statut] |
| CTA suppression | Supprimer l'œuvre |
| CTA confirmation suppression | Supprimer définitivement |
| CTA annuler suppression | Annuler |

### Étais vides

| Contexte | Titre | Corps + action suggérée |
|----------|-------|------------------------|
| Liste admin — aucune œuvre | Aucune œuvre pour l'instant. | Uploader votre première photo pour commencer. [lien "Uploader une photo"] |
| Section offres — aucune offre reçue | Aucune offre reçue pour cette œuvre. | Les offres des visiteurs apparaîtront ici. |
| /mon-profil — section "Mes offres" vide | Vous n'avez pas encore soumis d'offre. | Parcourez la galerie et faites une offre sur une œuvre qui vous plaît. [lien "Voir la galerie"] |
| /mon-profil — section "Mes acquisitions" vide | Aucune acquisition probable. | Les œuvres vendues sur lesquelles vous avez soumis une offre apparaîtront ici. |
| /mon-profil — section "Mes œuvres enregistrées" vide | Aucune œuvre enregistrée. | Cliquez sur le cœur sur la page d'une œuvre pour l'enregistrer ici. |
| /mon-profil — visiteur non connecté (redirection) | Identifiez-vous pour accéder à votre profil. | [lien "S'identifier"] |

### Messages d'erreur

| Contexte | Message |
|----------|---------|
| Erreur suppression œuvre | La suppression a échoué. Réessayez ou contactez le support. |
| Erreur enregistrement métadonnées | Les modifications n'ont pas pu être enregistrées. Vérifiez les champs et réessayez. |
| Champ requis manquant (formulaire) | Ce champ est obligatoire. |
| Erreur toggle favori (non connecté) | Identifiez-vous pour enregistrer une œuvre. |
| Erreur server action générique | Une erreur s'est produite. Réessayez dans un instant. |

### Actions destructives — protocole de confirmation

| Action | Dialog titre | Dialog description | Bouton confirmer | Bouton annuler |
|--------|-------------|-------------------|-----------------|---------------|
| Supprimer une œuvre | Supprimer l'œuvre ? | Cette action est irréversible. L'œuvre, ses images et toutes les offres associées seront supprimées définitivement. | Supprimer définitivement | Annuler |

Composant utilisé : `shadcn/ui AlertDialog` (déjà disponible dans `src/components/ui/alert-dialog.tsx`).
Style AlertDialog : `borderRadius: 0` sur `AlertDialogContent`, `AlertDialogAction` en rouge `#bc4b51`, `AlertDialogCancel` en fond neutre. D-03 = zéro coins arrondis.

---

## Inventaire des composants par plan

### 05-01 : Liste admin + page détail `/admin/artworks/[id]`

| Composant | Type | Source | Notes |
|-----------|------|--------|-------|
| Ligne liste artworks | Server | Existant (à étendre) | Rendre chaque ligne cliquable vers `/admin/artworks/[id]` |
| Badge statut (available/sold/given/reserved) | Server | Nouveau | Inline styles — couleurs définies ci-dessus |
| PipelineBadge | Server | Existant | Aucun changement |
| AlertDialog suppression | Client | shadcn/ui | `borderRadius: 0` obligatoire, bouton confirmer rouge `#bc4b51` |
| Section statut (select + bouton) | Client | Nouveau | `<select>` natif stylisé ou shadcn `Select` sans radius |
| Bouton "Supprimer l'œuvre" | Client | Nouveau | Fond `#bc4b51`, texte blanc, `borderRadius: 0` |

### 05-02 : Formulaire création/édition métadonnées

| Composant | Type | Source | Notes |
|-----------|------|--------|-------|
| Input texte (titre) | Client | shadcn/ui Input | `borderRadius: 0`, largeur 100% |
| Input date (date de création) | Client | shadcn/ui Input type="date" | `borderRadius: 0` |
| Textarea (description) | Client | shadcn/ui Textarea | `borderRadius: 0`, min-height 80px |
| Select (type) | Client | shadcn/ui Select | `borderRadius: 0`, options: Dessin / Peinture |
| Select (médium) | Client | shadcn/ui Select | `borderRadius: 0`, options: Crayon / Encre / Acrylique / Huile |
| Input nombre (width_cm, height_cm) | Client | shadcn/ui Input type="number" | `borderRadius: 0`, unité "cm" en suffixe |
| Input nombre (prix de base) | Client | shadcn/ui Input type="number" | `borderRadius: 0`, unité "€" en suffixe |
| Input nombre (priceHoursSpent, priceFormat, priceFraming, priceMaterials) | Client | shadcn/ui Input type="number" | `borderRadius: 0`, unité "€" |
| Input score 1-5 (priceTechnicality, priceAttachment) | Client | shadcn/ui Input type="number" min=1 max=5 | `borderRadius: 0`, hint "1 à 5" |
| Bouton "Enregistrer les modifications" | Client | shadcn/ui Button | Fond `#1a1a1a`, texte blanc, `borderRadius: 0` |
| Message d'erreur champ | Client | Inline | 14px/400, color `#bc4b51`, `color: var(--color-ink-muted)` pour contexte, pas d'icône |

**Structure du formulaire (ordre des sections) :**
1. Titre de la section "Métadonnées" (h2 20px/600)
2. Titre — date — type — médium (grille 2 colonnes sur desktop)
3. Dimensions (width_cm × height_cm) — grille 2 colonnes
4. Description (pleine largeur)
5. Séparateur visuel (border-bottom 1px solid rgba(0,0,0,0.1))
6. Titre de la section "Prix" (h2 20px/600)
7. Prix de base
8. Décomposition : Temps de travail — Format/Dimensions — Encadrement — Matériaux — Complexité technique (1-5) — Attachement (1-5)
9. Bouton "Enregistrer les modifications"

### 05-03 : Dashboard offres (section dans `/admin/artworks/[id]`)

| Composant | Type | Source | Notes |
|-----------|------|--------|-------|
| Titre de section "Offres reçues" | Server | Inline | h2 20px/600 Geist Sans |
| Tableau des offres | Server | Nouveau | Colonnes : Visiteur — Téléphone — Email — Montant — Message — Date |
| Ligne de tableau | Server | Nouveau | padding 12px 16px, border-bottom 1px solid rgba(0,0,0,0.08) |
| Tri par montant | Server | Query param `?sort=amount` | Décroissant par défaut, lien cliquable sur en-tête "Montant" |
| Badge "Meilleure offre" | Server | Nouveau | Fond `rgba(91,142,125,0.12)`, texte `#5b8e7d`, `borderRadius: 0` |

**Colonnes du tableau offres (ordre) :**
1. Visiteur (displayName) — 16px/400
2. Téléphone — 14px/400 Space Mono (toujours affiché, admin uniquement)
3. Email — 14px/400 (affiché si fourni, sinon "—")
4. Montant — 16px/600 Space Mono, aligné à droite
5. Message — 14px/400, tronqué à 80 caractères avec ellipsis
6. Date — 14px/400 Space Mono, `color: var(--color-ink-muted)`

### 05-04 : Page `/mon-profil` (visiteur)

| Composant | Type | Source | Notes |
|-----------|------|--------|-------|
| Layout page profil | Server | Nouveau | Fond `var(--color-bg)`, max-width 720px, centré |
| En-tête profil (displayName, initiale) | Server | Nouveau | Initiale en carré 40px fond `var(--color-ink)` texte blanc, Oswald 28px uppercase |
| Section "Mes informations" | Server | Nouveau | displayName + téléphone masqué + email si fourni |
| Masque téléphone | Server | Inline | "•••• + 4 derniers chiffres", Space Mono 14px |
| Section "Mes offres" | Server | Nouveau | Liste triée par date décroissante |
| Ligne offre (titre œuvre — montant — date) | Server | Nouveau | Titre = lien vers `/artworks/[id]` |
| Section "Mes acquisitions" | Server | Nouveau | Heuristique : sold + offre soumise |
| Card acquisition | Server | Nouveau | Thumbnail 80×80px + titre + mention "Acquis (offre soumise)" |
| Section "Mes œuvres enregistrées" | Server | Nouveau | Grid 2 colonnes sur mobile, 3 sur desktop |
| Card artwork enregistrée | Server | Nouveau | Thumbnail + titre + lien vers détail |
| Bouton cœur (page détail) | Client | Nouveau | Icône lucide `Heart`, filled si enregistré, outline sinon. Couleur `#bc4b51` si actif, `var(--color-ink-muted)` sinon. Taille 20px. Visible uniquement si visiteur connecté. `aria-label="Enregistrer l'œuvre"` quand non enregistré ; `aria-label="Retirer des enregistrements"` quand enregistré. |
| État vide (chaque section) | Server | Nouveau | Voir copywriting ci-dessus |

**Structure de la page `/mon-profil` :**
```
SiteNav (sticky)
└── main (padding: '48px 24px', max-width: '720px', margin: '0 auto')
    ├── En-tête : carré initiale 40px + displayName (Oswald 28px uppercase)
    ├── Section "Mes informations" (Space Mono h2 16px uppercase)
    │   ├── Pseudo/Nom
    │   ├── Téléphone masqué
    │   └── Email (si fourni)
    ├── Section "Mes offres" (Space Mono h2 16px uppercase)
    │   └── Liste des offres (toutes œuvres confondues)
    ├── Section "Mes acquisitions" (Space Mono h2 16px uppercase)
    │   └── Liste des œuvres sold avec offre
    └── Section "Mes œuvres enregistrées" (Space Mono h2 16px uppercase)
        └── Grid de cards
```

### 05-05 : SiteNav — indicateur de connexion visiteur

| Composant | Type | Source | Notes |
|-----------|------|--------|-------|
| SiteNav async Server Component | Server | Existant (à rendre async) | Lit `getVisitorSession()` |
| Carré initiale visiteur | Server | Nouveau | 28×28px, fond `#1a1a1a`, texte blanc, Space Mono 13px, `borderRadius: 0`. Lien vers `/mon-profil`. |
| Lien "S'identifier" | Server/Client | Nouveau | Space Mono 11px uppercase, color `var(--color-ink-muted)`. Déclenche modal via `?modal=identify` ou contexte client. |

**Logique SiteNav :**
```
Si visiteur connecté (session.visitorId != null) :
  → Afficher carré [initiale] lié à /mon-profil
Sinon :
  → Afficher lien "S'identifier" (ouvre VisitorProfileModal)
```

**Pattern d'ouverture du modal depuis SiteNav :**
Param URL `?modal=identify` lu par un Client Component dans le layout public → ouvre `VisitorProfileModal`. Pattern Server Component compatible.

---

## Règles absolues — Rappel D-03

**ZÉRO `border-radius` sur l'ensemble des éléments de cette phase :**
- Boutons : `borderRadius: 0`
- Inputs / Textareas / Selects : `borderRadius: 0`
- Cards / Lignes de liste : `borderRadius: 0`
- AlertDialog content : `borderRadius: 0`
- Carré initiale SiteNav : `borderRadius: 0` (carré, pas cercle)
- Thumbnails / Images dans les cards : `borderRadius: 0`
- Badges statut : `borderRadius: 0`
- Bouton cœur (favori) : pas de conteneur avec radius

Tout composant shadcn/ui doit avoir ses styles par défaut écrasés via `style={{ borderRadius: 0 }}` ou `className` avec `!rounded-none`.

---

## Registre shadcn

| Registre | Composants utilisés | Safety Gate |
|----------|--------------------|-----------:|
| shadcn officiel | alert-dialog, button, input, textarea, select, badge, card | Non requis |
| Tiers | Aucun | N/A |

Composants shadcn déjà installés et disponibles :
- `src/components/ui/alert-dialog.tsx` — AlertDialog (Phase 2)
- `src/components/ui/alert.tsx`
- `src/components/ui/badge.tsx`
- `src/components/ui/button.tsx`
- `src/components/ui/card.tsx`

Composants à installer si nécessaire : `input`, `textarea`, `select`, `label` (via `npx shadcn add input textarea select label`).

---

## Sources des décisions

| Source | Décisions intégrées |
|--------|-------------------|
| 03-CONTEXT.md (Phase 3) | D-01 palette, D-02 typographie, D-03 zéro radius, D-05 contraste fort |
| 05-CONTEXT.md (Phase 5) | D-04 page détail unifiée, D-05 AlertDialog suppression, D-10 offres inline, D-12 /mon-profil guard, D-13 sections profil, D-14 table saved_artworks, D-15 SiteNav async, D-16 carré initiale, D-17 param modal, D-18 heuristique acquisition |
| Code existant (`artworks/page.tsx`) | Inline styles, Geist Sans admin, padding 48px 16px, max-width 960px, structure ligne liste |
| Code existant (`validate/page.tsx`) | Display 28px/600, fond #f5f5f5 pour zones preview, gap xl=32px |
| Code existant (`SiteNav.tsx`) | Hauteur 56px, fond surface, Space Mono 11px uppercase, logo Oswald 18px/700 |
| Code existant (`PriceBreakdown.tsx`) | Labels des 6 facteurs prix (référence exacte pour le formulaire admin) |
| Code existant (`globals.css`) | Variables CSS `--color-*` et `--font-*` |
| REQUIREMENTS.md | ADMIN-01 à ADMIN-05 — critères de succès |
| UI checker revision (2026-05-11) | Suppression taille 12px (Tiny) — absorbée par 14px/400 + ink-muted ; aria-label bouton cœur ajouté |
| UI checker revision 2 (2026-05-11) | /mon-profil h1 graisse 700→600 (2 graisses max) ; ligne de proportion 60/30/10 ajoutée en section Couleurs |
| User input (session 2026-05-11) | Aucune question nécessaire — tout pré-rempli depuis les artefacts amont |

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting : PASS
- [ ] Dimension 2 Visuels : PASS
- [ ] Dimension 3 Couleurs : PASS
- [ ] Dimension 4 Typographie : PASS
- [ ] Dimension 5 Espacement : PASS
- [ ] Dimension 6 Sécurité registre : PASS

**Approbation :** en attente
