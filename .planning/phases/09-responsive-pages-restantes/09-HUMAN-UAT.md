---
status: partial
phase: 09-responsive-pages-restantes
source: [09-VERIFICATION.md]
started: 2026-06-08T00:00:00Z
updated: 2026-06-08T00:00:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Galerie mobile — FilterDrawer
expected: Sur ≤768px, la barre de filtres chips est MASQUÉE, le bouton "Filtres" compact est visible. Tapper le bouton ouvre un bottom sheet depuis le bas avec animation. Sélectionner un filtre ferme le tiroir et affiche badge "· 1" sur le bouton. Sur ≥769px, la barre chips desktop est visible et le bouton FilterDrawer est masqué.
result: [pending]

### 2. /about — Paddings mobiles
expected: Sur ≤768px en DevTools, les colonnes about ont un padding de 32px/24px (réduit vs 48px desktop). Le titre h1 est à 22px (réduit vs 28px). Sur ≥1024px, le layout reste en 2 colonnes avec les paddings desktop.
result: [pending]

### 3. /mon-profil — Padding-top réduit
expected: Sur ≤768px, le padding-top de la page est réduit à 24px (moins de vide blanc en haut). Les lignes d'offres peuvent se wrapper sur très petits écrans. La grille "œuvres enregistrées" utilise minmax(140px) sur mobile. Requiert une session visiteur.
result: [pending]

### 4. /admin/upload — form-col non-sticky mobile
expected: Sur ≤768px, la colonne image est EN PREMIER (drop zone), puis le formulaire suit normalement en dessous. Le formulaire scrolle jusqu'au bas sans être tronqué (pas de position: sticky qui coupe les champs). Requiert une session artiste.
result: [pending]

### 5. /admin/artworks/[id] — Hero 1 colonne tablette
expected: Sur ≤1023px (tablette), le hero split (image gauche + panneau info droite) passe en 1 colonne — image empilée au-dessus du panneau. Sur ≤768px, les paddings du main sont réduits (16px). Requiert une session artiste.
result: [pending]

## Summary

total: 5
passed: 0
issues: 0
pending: 5
skipped: 0
blocked: 0

## Gaps
