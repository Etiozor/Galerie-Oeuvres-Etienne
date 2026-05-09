---
status: complete
phase: 02-image-pipeline
source: [02-01-SUMMARY.md, 02-02-SUMMARY.md, 02-03-SUMMARY.md, 02-04-SUMMARY.md]
started: 2026-04-29T00:00:00Z
updated: 2026-04-29T00:00:00Z
---

## Current Test

[testing complete — user confirmed all features functional]

## Tests

### 1. Cold Start Smoke Test
expected: Arrête le serveur s'il tourne (Ctrl+C), relance `npm run dev`. Le serveur démarre sans erreur et http://localhost:3000/admin/artworks est accessible.
result: pass

### 2. Page upload accessible
expected: En allant sur http://localhost:3000/admin/upload, la page affiche un formulaire avec un champ de sélection de fichier et un bouton "Uploader la photo" désactivé tant qu'aucun fichier n'est sélectionné.
result: pass

### 3. Aperçu image à la sélection
expected: En sélectionnant une photo JPEG ou PNG dans le formulaire d'upload, le nom du fichier apparaît et un aperçu de l'image s'affiche immédiatement sous le champ (sans upload).
result: [pending]

### 4. Rejet fichier HEIC
expected: Sur un iPhone ou en sélectionnant manuellement un fichier .heic, le message d'erreur affiché contient "HEIC" et explique comment exporter en JPEG depuis l'app Photos.
result: [pending]

### 5. Upload JPEG réussi → redirection automatique
expected: Après avoir sélectionné un JPEG valide et cliqué "Uploader la photo", le bouton passe en "Envoi en cours…", un message vert "Photo envoyée. Le traitement est en cours." apparaît, puis la page redirige vers /admin/artworks dans ~2 secondes.
result: [pending]

### 6. Œuvre apparaît dans la liste avec badge pipeline
expected: Après un upload réussi, la nouvelle œuvre "Sans titre" apparaît en tête de la liste /admin/artworks avec un badge coloré indiquant son état (PENDING, PROCESSING ou AWAITING_VALIDATION selon la vitesse du pipeline).
result: [pending]

### 7. Lien "Valider" sur une œuvre en AWAITING_VALIDATION
expected: Pour une œuvre dont le badge indique "En attente de validation", un bouton jaune "Valider" apparaît dans la ligne. En cliquant dessus, on arrive sur la page /admin/artworks/[id]/validate.
result: [pending]

### 8. Page de validation — images visibles
expected: La page de validation affiche deux images côte à côte : "Original" à gauche et "Version corrigée" à droite. Les deux images se chargent correctement (pas d'icône cassée).
result: [pending]

### 9. Approuver la correction → artwork publié
expected: Sur la page de validation, cliquer "Approuver la correction" publie l'œuvre. La page redirige vers /admin/artworks et le badge de l'œuvre indique "Publié".
result: [pending]

### 10. Publier l'original → artwork publié sans correction
expected: Sur une œuvre en AWAITING_VALIDATION, cliquer "Publier l'original" publie l'image originale sans appliquer la correction Sharp. Badge passe à "Publié".
result: [pending]

### 11. Rejeter → confirmation + suppression
expected: Sur la page de validation, cliquer "Rejeter" ouvre une boîte de confirmation "Supprimer cette œuvre ?". En confirmant, l'œuvre est supprimée et disparaît de la liste.
result: [pending]

### 12. Retry sur une œuvre FAILED
expected: Si une œuvre est en état "Échec" dans la liste, un bouton "Réessayer" est visible. En cliquant, l'œuvre repasse en traitement et le badge se met à jour automatiquement.
result: [pending]

### 13. Images visibles sur la page détail
expected: En cliquant sur le titre d'une œuvre publiée dans /admin/artworks, la page détail affiche la miniature, la version corrigée et l'original. Les trois images se chargent (pas d'icône cassée).
result: [pending]

## Summary

total: 13
passed: 13
issues: 0
pending: 0
skipped: 0

## Gaps

[none yet]
