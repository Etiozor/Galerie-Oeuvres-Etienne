---
status: partial
phase: 08-responsive-mobile-tablette
source: [08-VERIFICATION.md]
started: 2026-06-07T19:00:00Z
updated: 2026-06-07T19:00:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Navigation mobile — hamburger visible, desktop masqué
expected: DevTools Chrome → 375px iPhone SE → galerie `/` : bouton ≡ visible à droite dans la nav ; liens "Galerie", "À propos", "S'identifier" desktop masqués
result: [pending]

### 2. Animation panneau hamburger
expected: Tapper le bouton hamburger sur 375px : panneau 280px glisse depuis la droite en ~0.22s ; overlay semi-transparent visible ; aucun coin arrondi sur le panneau (D-03)
result: [pending]

### 3. Fermeture overlay au tap
expected: Ouvrir le panneau, puis tapper l'overlay sombre : panneau se ferme ; scroll du body restauré
result: [pending]

### 4. Drawer admin 100% largeur sur mobile
expected: DevTools 375px → `/admin/artworks` → cliquer sur une oeuvre : drawer occupe 100% de la largeur — pas de débordement hors-champ à droite
result: [pending]

### 5. FilterBar — scroll horizontal mobile
expected: DevTools 375px → galerie `/` : chips sur une seule ligne, pas de retour à la ligne ; scroll horizontal possible
result: [pending]

### 6. Panel info artworks/[id] — scroll jusqu'au formulaire
expected: DevTools 375px → `/artworks/[id]` → scroller jusqu'en bas : formulaire "Faire une offre" accessible au scroll sans blocage ; panel info non confiné dans 100vh
result: [pending]

### 7. D-11 — hover overlay galerie desktop uniquement
expected: Sur mobile 375px, tapper une carte de la galerie : navigation directe vers la page détail — pas d'overlay hover interférant avec le tap
result: [pending]

## Summary

total: 7
passed: 0
issues: 0
pending: 7
skipped: 0
blocked: 0

## Gaps
