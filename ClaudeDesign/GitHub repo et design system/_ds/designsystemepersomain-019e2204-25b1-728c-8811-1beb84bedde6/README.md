# DesignSystemePersoMain

Système d'interface chaud sur fond crème. Trois fontes, un seul rayon, une palette d'accents qui s'emploie soit en aplat vif, soit en teinte avec un texte foncé. Rien ici n'est lié à un produit : les jetons et les composants portent des noms de rôle, pas de domaine.

---

## Principes

**Une seule valeur quand une seule suffit.** Un rayon (8 px). Une sans-serif d'interface. Deux ombres. Cinq accents. Le système gagne sa cohérence en supprimant les choix, pas en les documentant.

**L'accent vif et l'accent foncé ne sont pas interchangeables.** Le vif remplit (bouton plein, onglet actif, arête de carte, barre d'avancement). Le foncé écrit (label, chiffre, lien, icône). Poser du texte sur un aplat vif, ou un aplat vif derrière un paragraphe, casse le contraste et le système.

**Le fond ne se teinte pas.** Une carte qui porte un état le porte sur son arête gauche de 6 px, pas dans son fond. Le fond des cartes reste sable dans tous les cas.

**Trois fontes, trois métiers.** Oswald ne fait que des titres, toujours en majuscules. Barlow fait tout ce que le système produit : labels, meta, chiffres, boutons, champs. Cormorant italique ne fait que ce qu'un humain a écrit : description, annonce, état vide, note.

**Le mouvement est presque absent.** Une entrée en fondu, une transition d'opacité. Pas de rebond, pas de ressort, pas d'animation liée au défilement.

---

## Fondations

| | Valeur |
|---|---|
| Fond de page | `#fdf8e8` |
| Surface (cartes, barres) | `#f0e6c8` |
| Hors-cadre | `#e6dfcb` |
| Bandeau sombre | `#1a1a1a` |
| Texte | `#1a1a1a` / muet `#5a5244` / inversé `#fdf8e8` |
| Primary | `#5b8e7d` — texte `#3f6b5c` |
| Success | `#8cb369` — texte `#4a6b2f` |
| Warning | `#f4a259` — texte `#7a3f14` |
| Critical | `#bc4b51` — texte `#9c3b41` |
| Highlight | `#f4e285` — fond seul, jamais de texte |
| Rayon | `8px` partout (`2px` micro-traits, `0` exception) |
| Filets | 8 % séparateurs · 6 % grilles internes · 14 % champs · 20 % pointillé |
| Ombres | `0 2px 16px rgba(26,26,26,.12)` posé · `0 18px 44px rgba(26,26,26,.28)` détaché |
| Rythme | base 4 px — gaps 8-12, paddings de carte 14-16, sections 24 |
| Cibles de frappe | 44 px principal · 38 px secondaire · 32 px compact |

**Recette de teinte** — fond de l'accent à 16 %, bordure du même accent à 50 %, texte dans sa variante foncée. C'est ce qui donne les pastilles, les avatars et les contrôles enfoncés.

**Typographie** — Oswald 32 / 24 / 18, majuscules, tracking +4 à 5 %. Barlow 10 à 24 px, 11 px étant de loin la taille la plus fréquente ; le tracking monte quand la taille descend (+4 % meta, +9 % pastille, +12 % eyebrow). Cormorant italique 400 en 16 et 18 px.

**Iconographie** — pas de librairie. Un glyphe Unicode chaque fois qu'il en existe un (`←` `→` `✕` `▾` `…`). Sinon un SVG tracé à la main : 24 px, trait 1,5 px, bouts et jonctions arrondis, `currentColor`.

**Ton** — phrases courtes, pas de point d'exclamation, pas de vocabulaire marketing. Un état vide dit ce qu'il n'y a pas puis ce qu'on peut faire, sans s'excuser. Les labels sont en majuscules ; les boutons et le corps sont en casse normale, jamais en Casse De Titre.

---

## Components

Douze primitives React exportées sur le namespace du système :

- **Button** — `variant`: primary · secondary · quiet · critical · ghost. `compact` (32 px, majuscules), `full`.
- **Badge** — pastille d'état. `tone`: primary · success · warning · critical · neutral.
- **Field** — label eyebrow + champ. `hint`, `error`, `multiline` (zone longue en éditorial italique), `defaultValue` pour un specimen non contrôlé.
- **Card** — surface de contenu. `tone` dessine l'arête gauche 6 px ; `title`, `badge`, `meta`, `footer`, `padded`.
- **StatTiles** — grille de chiffres. `items: [{ value, label, tone }]`, `columns`.
- **Avatar** — initiales dans un carré adouci. `name`, `label`, `tone`, `size`, `pending` (pointillé = place libre).
- **ProgressBar** — trait fin d'avancement. `value`, `tone`, `height`, `label`, `caption`.
- **Dialog** — modale. `title`, `eyebrow`, `footer`, `onClose`, `width`.
- **Nav** / **NavAction** — barre supérieure à titre centré, actions carrées 34 px aux extrémités.
- **Tabs** — sélection exclusive ; l'onglet actif prend l'aplat vif.
- **EmptyState** — `title`, `message`, `action`, `dashed`.
- **EditToolbar** — contrôles d'édition de texte au-dessus d'une zone de saisie.

---

## Arborescence

```
styles.css        ← point d'entrée : importe tokens.css
tokens.css        ← toutes les variables CSS + rôles typographiques
thumbnail.html    ← tuile du système
components/       ← une primitive par dossier : .jsx, .d.ts, carte de preview
preview/          ← cartes de fondation (couleur, type, rayon, rythme, traits, mouvement, icônes)
fonts/            ← Merriweather Sans Italic (fourni, non utilisé aujourd'hui)
assets/           ← favicon
```

## Consommer le système

Lier `styles.css`, charger le bundle compilé, puis lire les composants sur le namespace :

```html
<link rel="stylesheet" href="_ds/<dossier>/styles.css">
<script src="_ds/<dossier>/_ds_bundle.js"></script>
<script>
  const { Button, Card, Badge } = window.GaleriePOFDesignSystem_019e22;
</script>
```

Le namespace a été figé par le compilateur au premier nom du projet et ne suit pas les renommages ultérieurs — c'est la seule chaîne du système qui garde une trace de ce nom. Les cartes de preview le résolvent dynamiquement plutôt que de l'écrire en dur, pour rester valides s'il change un jour.

Les jetons sont utilisables directement en CSS (`var(--color-primary)`, `var(--radius-sm)`, `var(--border-hairline)`) sans passer par les composants.
