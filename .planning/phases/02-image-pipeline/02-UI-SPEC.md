---
phase: 2
slug: image-pipeline
status: draft
shadcn_initialized: false
preset: none
created: 2026-04-25
---

# Phase 2 — UI Design Contract : Pipeline Image

> Contrat visuel et d'interaction pour l'implémentation de la Phase 2.
> Généré par gsd-ui-researcher. Vérifié par gsd-ui-checker.
>
> Toutes les interfaces de cette phase sont **admin-only** — aucune page publique.
> Tous les textes visibles par l'utilisateur sont **en français**.
> L'artiste n'est pas développeur : clarté et simplicité avant tout.

---

## Design System

| Propriété | Valeur |
|-----------|--------|
| Outil | shadcn/ui (à initialiser avant 02-04) |
| Preset | À configurer sur ui.shadcn.com/create — thème neutre, mode clair uniquement pour v1 |
| Bibliothèque de composants | Radix UI (via shadcn) |
| Bibliothèque d'icônes | lucide-react (bundlé avec shadcn) |
| Police | Geist Sans (déjà déclarée dans globals.css — var(--font-geist-sans)) |

**Note shadcn :** `components.json` n'existe pas encore. Il doit être initialisé avant le plan 02-04 (UI de validation). Les plans 02-01 à 02-03 sont purement backend — l'initialisation peut attendre le plan 02-04. L'exécuteur doit lancer `npx shadcn init` au début du plan 02-04.

**Composants shadcn requis pour cette phase :**
- `button` — boutons d'action primaire, secondaire, destructif
- `badge` — badges d'état pipeline (PENDING, PROCESSING, AWAITING_VALIDATION, PUBLISHED, FAILED)
- `progress` — indicateur de progression upload (si pertinent, sinon spinner)
- `alert` — messages d'erreur et avertissements
- `card` — carte par œuvre dans la liste admin

---

## Périmètre des interfaces (Phase 2 uniquement)

Trois surfaces UI à concevoir dans cette phase :

1. **Page upload** (`/admin/upload`) — bouton fichier simple, retour de progression, erreurs
2. **Liste admin des œuvres** (`/admin/artworks`) — tableau avec badges d'état pipeline et bouton "Réessayer" sur FAILED
3. **Écran de validation** (`/admin/artworks/[id]/validate`) — comparaison côte à côte avant/après, trois boutons d'action

---

## Spacing Scale

Valeurs déclarées (multiples de 4) :

| Token | Valeur | Usage |
|-------|--------|-------|
| xs | 4px | Gaps entre icône et libellé, padding inline badge |
| sm | 8px | Espacement compact (éléments de formulaire, padding badge) |
| md | 16px | Espacement par défaut (entre champs, padding de carte) |
| lg | 24px | Padding de section, espacement entre groupes de boutons |
| xl | 32px | Gaps de layout (entre les deux images côte à côte) |
| 2xl | 48px | Breaks de section majeurs |
| 3xl | 64px | Espacement niveau page (padding vertical de main) |

**Exceptions :**
- Zone de clic du bouton fichier : **hauteur minimum 44px** (cible tactile iPhone — WCAG 2.5.5). Cette valeur s'applique à la *hauteur de l'élément* uniquement — ne pas l'utiliser comme token de spacing (margin/gap/padding).
- Boutons d'action sur l'écran de validation : **hauteur minimum 44px** pour usage mobile (même règle — hauteur d'élément uniquement).

---

## Typography

| Rôle | Taille | Graisse | Interligne | Usage |
|------|--------|---------|------------|-------|
| Body | 16px | 400 (regular) | 1.5 | Texte courant, descriptions, messages d'erreur |
| Label | 14px | 600 (semibold) | 1.4 | Labels de champs, libellés de badge, métadonnées |
| Heading | 20px | 600 (semibold) | 1.3 | Titres de section (ex. "Valider l'œuvre", "Mes œuvres") |
| Display | 28px | 600 (semibold) | 1.2 | Titre de page principal (ex. "Uploader une photo") |

**Graisses : 2 uniquement** — 400 (regular) pour le corps de texte, 600 (semibold) pour tout le reste. La hiérarchie visuelle est portée par la taille, pas par la graisse.

**Police :** Geist Sans uniquement (déjà disponible via `--font-geist-sans`). Pas de police serif dans l'admin.

---

## Color

| Rôle | Valeur | Usage |
|------|--------|-------|
| Dominant (60%) | #ffffff | Fond de page, surfaces principales |
| Secondaire (30%) | #f5f5f5 | Fond de carte, fond de tableau, zone de comparaison |
| Accent (10%) | #171717 | Bouton CTA primaire uniquement (fond noir, texte blanc) |
| Destructif | #dc2626 | Badge FAILED, bouton "Rejeter", messages d'erreur critiques |

**Accent réservé à :** bouton CTA primaire ("Uploader la photo", "Approuver la correction") uniquement. Pas de lien, pas de bordure, pas d'icône colorée en accent.

**Palette sémantique des badges pipeline :**
| État | Couleur de fond | Couleur de texte | Justification |
|------|-----------------|------------------|---------------|
| PENDING | #fafafa | #737373 | Neutre — en attente |
| PROCESSING | #eff6ff | #1d4ed8 | Bleu — en cours |
| AWAITING_VALIDATION | #fefce8 | #a16207 | Ambre — action requise de l'artiste |
| PUBLISHED | #f0fdf4 | #15803d | Vert — succès |
| FAILED | #fef2f2 | #dc2626 | Rouge — erreur |

**Cohérence avec Phase 1 :** La page de login existante utilise `#111` (fond bouton) et `#fff` (texte bouton) — cohérent avec le dominant/accent défini ci-dessus. Pas de rupture.

---

## Copywriting Contract

### Page Upload (`/admin/upload`)

| Élément | Copie |
|---------|-------|
| Titre de page | Uploader une photo |
| Label bouton fichier | Choisir une photo |
| Placeholder sous le bouton | JPEG ou PNG, 20 MB maximum |
| CTA principal (submit) | Uploader la photo |
| Progression (pendant upload) | Envoi en cours… |
| Succès upload | Photo envoyée. Le traitement est en cours. |

**Messages d'erreur upload (source : D-06, D-07 — ne pas modifier) :**

| Situation | Message exact |
|-----------|---------------|
| Format HEIC détecté | Les photos iPhone en format HEIC ne sont pas supportées. Exporte en JPEG depuis l'app Photos. |
| Fichier > 20 MB | Le fichier est trop lourd (max 20 MB). Compresse-le avant d'uploader. |
| Format non supporté (autre) | Ce format de fichier n'est pas supporté. Utilise un fichier JPEG ou PNG. |
| Erreur réseau | Erreur d'envoi. Vérifie ta connexion et réessaie. |

### Liste admin des œuvres (`/admin/artworks`)

| Élément | Copie |
|---------|-------|
| Titre de page | Mes œuvres |
| Libellés des badges | En attente / En traitement / À valider / Publiée / Échec |
| Bouton retry (état FAILED) | Réessayer le traitement |
| Confirmation retry | (pas de confirmation — action réversible, relance simplement le pipeline) |
| État vide (aucune œuvre) | Aucune œuvre pour l'instant. Uploader votre première photo pour commencer. |
| Lien CTA état vide | Uploader une photo |

### Écran de validation (`/admin/artworks/[id]/validate`)

| Élément | Copie |
|---------|-------|
| Titre de page | Valider la correction |
| Label image gauche | Original |
| Label image droite | Version corrigée |
| Bouton 1 (CTA primaire) | Approuver la correction |
| Bouton 2 (CTA secondaire) | Publier l'original |
| Bouton 3 (destructif) | Rejeter |
| Description Bouton 1 (sous-titre optionnel) | Publier la version améliorée par le pipeline |
| Description Bouton 2 (sous-titre optionnel) | Publier la photo telle qu'elle a été prise |
| Description Bouton 3 (sous-titre optionnel) | Supprimer cette entrée définitivement |
| Confirmation Rejeter | Modal : "Supprimer cette œuvre ?" — "Cette action est irréversible. L'image originale et toutes les variantes seront supprimées." — Bouton confirmation : "Supprimer définitivement" — Bouton annulation : "Annuler" |

---

## Layout des interfaces

### Page upload — Structure

**Point focal :** le bouton CTA primaire "Uploader la photo" (fond #171717, texte blanc, pleine largeur) est l'ancre visuelle principale de la page. Tout le layout converge vers lui.

```
/admin/upload

[Titre : Uploader une photo]

[Zone centrale, centrée, max-w-md]
  [input type="file" — stylé comme un bouton pleine largeur, h-44px minimum]
  [Texte aide : JPEG ou PNG, 20 MB maximum]

[Message d'erreur si applicable — Alert rouge]

[Bouton "Uploader la photo" — pleine largeur, fond #171717, texte blanc]
  [État disabled + spinner si upload en cours]
```

### Liste admin — Structure de ligne

```
/admin/artworks

[Titre : Mes œuvres]   [Bouton "Uploader une photo" — top right]

[Tableau ou liste de cartes]
  Ligne :
    [Miniature 48x48px]  [Titre ou "Sans titre"]  [Badge état]  [Date upload]  [Bouton "Réessayer" si FAILED]
```

### Écran de validation — Structure

```
/admin/artworks/[id]/validate

[Titre : Valider la correction]

[Grid 2 colonnes, gap-xl (32px), sur desktop]
  [Colonne gauche]                [Colonne droite]
    Label "Original"               Label "Version corrigée"
    [Image — width 100%]           [Image — width 100%]

[Sur mobile : colonne unique — original en haut, corrigée en bas]

[Groupe 3 boutons — disposition verticale sur mobile, horizontale sur desktop]
  [Approuver la correction — fond #171717, texte blanc — primaire]
  [Publier l'original — variant outline — secondaire]
  [Rejeter — variant destructive — rouge]
```

---

## Comportements d'interaction

### Upload — Séquence d'états

1. **Initial :** Bouton "Choisir une photo" actif, CTA "Uploader la photo" désactivé (grisé)
2. **Fichier sélectionné :** CTA activé, nom de fichier affiché sous l'input
3. **Upload en cours :** CTA passe en état loading ("Envoi en cours…", spinner), input désactivé
4. **Upload réussi :** Message de succès "Photo envoyée. Le traitement est en cours." + redirection automatique vers la liste admin après 2 secondes
5. **Erreur upload :** Alert rouge avec message d'erreur spécifique (voir tableau copywriting), boutons réactivés

### Pipeline — Polling d'état

- L'interface liste admin **poolle l'état toutes les 3 secondes** pour les entrées en PENDING ou PROCESSING
- Quand l'état passe à AWAITING_VALIDATION, le badge se met à jour et un lien "Valider" apparaît
- Le polling s'arrête dès que l'entrée atteint AWAITING_VALIDATION, PUBLISHED ou FAILED
- Implémentation : `setInterval` côté client dans un `useEffect`, ou Server-Sent Events — au choix du planner

### Validation — Comportement boutons

- **"Approuver la correction" :** Déclenche la Server Action, bouton passe en loading ("En cours…"), les deux autres boutons sont désactivés pendant l'action. Succès → redirection vers `/admin/artworks`.
- **"Publier l'original" :** Même comportement que ci-dessus.
- **"Rejeter" :** Ouvre une modale de confirmation (shadcn `AlertDialog`). Si confirmé → Server Action → redirection. Si annulé → modale fermée, aucun changement.

### Retry (état FAILED)

- Clic sur "Réessayer" : bouton passe en loading immédiatement, relance la Server Action de retry.
- Pas de confirmation — l'action relance juste le pipeline sur l'original existant.
- Si le retry réussit : badge passe en PROCESSING puis AWAITING_VALIDATION.
- Si le retry échoue de nouveau : badge reste FAILED, message toast d'erreur.

---

## Registry Safety

| Registry | Blocs utilisés | Safety Gate |
|----------|---------------|-------------|
| shadcn officiel | button, badge, progress, alert, card, alert-dialog | Non requis |
| Tiers | Aucun | Non applicable |

Aucun registre tiers déclaré — vetting gate non requis.

---

## Notes pour l'exécuteur

- **Initialiser shadcn avant 02-04 :** `npx shadcn init` à lancer en début de plan 02-04. Choisir le style "default", baseColor "neutral", Tailwind CSS 4 mode.
- **Imports de composants :** Utiliser `npx shadcn add button badge progress alert card alert-dialog` — ne pas copier-coller manuellement.
- **Commentaires en français :** Toutes les fonctions, Server Actions et composants doivent être commentés en français (CLAUDE.md).
- **Phase 1 styling à migrer :** La page `/admin/login` et `/admin/page.tsx` utilisent des styles inline. Ne pas les migrer dans cette phase — prévu en Phase 5.
- **Accessibilité minimale :** Les boutons d'action ont un `aria-label` descriptif. Les images de comparaison ont un `alt` ("Image originale" / "Image après correction par le pipeline").

---

## Checker Sign-Off

- [x] Dimension 1 Copywriting: PASS
- [x] Dimension 2 Visuals: PASS
- [x] Dimension 3 Color: PASS
- [x] Dimension 4 Typography: PASS (2 graisses : 400 + 600)
- [x] Dimension 5 Spacing: PASS (44px = hauteur d'élément uniquement, justifié WCAG)
- [x] Dimension 6 Registry Safety: PASS

**Approval:** approved
