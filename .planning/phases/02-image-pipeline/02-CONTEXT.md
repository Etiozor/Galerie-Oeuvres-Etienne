# Phase 2: Image Pipeline - Context

**Gathered:** 2026-04-25
**Status:** Ready for planning

<domain>
## Phase Boundary

L'artiste peut uploader une photo depuis n'importe quel appareil, le pipeline Sharp l'auto-corrige (rotation EXIF, exposition, balance des blancs) et stocke trois variantes (original, traité, miniature). L'artiste valide le résultat avant publication. Tout se passe dans `/admin` — aucune interface publique dans cette phase.

</domain>

<decisions>
## Implementation Decisions

### Flux upload / métadonnées

- **D-01:** L'artiste uploade la photo EN PREMIER, puis renseigne les métadonnées (titre, type, médium, description, dimensions) sur le site après l'import. L'upload déclenche le pipeline ; les métadonnées sont remplies pendant ou après le traitement.
- **D-02:** La photo uploadée crée immédiatement une entrée en base avec l'état `PENDING`, même si les métadonnées ne sont pas encore renseignées.

### Écran de comparaison avant/après

- **D-03:** L'écran de validation affiche les deux images **côte à côte (side-by-side)** — original à gauche, version corrigée à droite.
- **D-04:** L'écran propose trois actions : "Approuver la correction" (publie le traité), "Publier l'original" (publie sans correction), "Rejeter" (supprime l'entrée).

### Expérience d'upload

- **D-05:** Interface d'upload : **simple bouton fichier** (`<input type="file" accept="image/jpeg,image/png">`). Sur iPhone, le système affiche automatiquement "Prendre une photo" ou "Choisir dans la bibliothèque" — aucune gestion spéciale requise.
- **D-06:** Formats acceptés : JPEG et PNG uniquement. Les fichiers HEIC sont rejetés avec un message explicatif clair ("Les photos iPhone en format HEIC ne sont pas supportées. Exporte en JPEG depuis l'app Photos.").
- **D-07:** Taille maximum : 20 MB (couvre les iPhone Pro en qualité maximale). Rejet avec message si dépassé.

### Gestion des erreurs pipeline

- **D-08:** Si Sharp plante, l'entrée passe en état `FAILED` — visible dans la liste admin avec un badge rouge.
- **D-09:** L'artiste peut cliquer "Réessayer" sur une entrée FAILED pour relancer le pipeline sur le fichier original (qui est toujours conservé).
- **D-10:** Pas de notification email pour les échecs pipeline — l'artiste voit directement dans son admin.

### Points critiques Sharp (repris de CLAUDE.md)

- **D-11:** `.rotate()` TOUJOURS en premier dans la chaîne Sharp (corrige la rotation EXIF des photos iPhone avant tout traitement).
- **D-12:** `withMetadata()` TOUJOURS pour préserver le profil ICC (couleurs Display-P3 des iPhone récents).
- **D-13:** Stocker TOUJOURS 3 chemins distincts : `original_path`, `processed_path`, `thumbnail_path`. L'original n'est jamais écrasé.
- **D-14:** Output format : WebP pour les versions traitée et miniature (meilleur ratio qualité/poids). L'original est conservé tel quel.

### Claude's Discretion

- Dimensions exactes de la miniature (thumbnail) — le planner décide (ex: 400px de large)
- Paramètres Sharp pour la normalisation (niveaux de `normalise()`) — à calibrer par le planner
- Gestion du polling côté UI pour afficher la progression du pipeline (PENDING → PROCESSING → AWAITING_VALIDATION)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Projet
- `.planning/PROJECT.md` — Vision, contraintes et décisions clés du projet
- `.planning/REQUIREMENTS.md` — PIPE-01 à PIPE-05 et ADMIN-03 (requirements de cette phase)
- `.planning/ROADMAP.md` — Plans 02-01 à 02-04 avec objectifs et critères de succès
- `CLAUDE.md` — Points d'attention critiques pipeline image (section "Pipeline image (Phase 2)")

### Fondations Phase 01 (à réutiliser)
- `src/lib/storage/index.ts` — Interface StorageProvider (put, get, delete, getUrl)
- `src/lib/storage/local.ts` — LocalStorageAdapter (implémentation dev)
- `src/db/schema.ts` — Tables artworks (original_path, processed_path, thumbnail_path, pipeline_state enum)
- `src/lib/auth.ts` — Instance Better Auth (pour protéger les routes admin)

### Points d'attention critiques
- Sharp : `.rotate()` en premier, `withMetadata()` pour ICC, output WebP
- HEIC rejeté avec message explicatif
- État `FAILED` explicite avec option "Réessayer"
- 3 chemins stockés, original jamais écrasé

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/storage/index.ts` — `StorageProvider` interface avec `put(key, buffer, contentType)`, `get(key)`, `delete(key)`, `getUrl(key)` — à utiliser dans le pipeline pour stocker les 3 variantes
- `src/db/schema.ts` — Table `artworks` avec `pipeline_state` enum (pending/processing/awaiting_validation/published/failed) et les 3 colonnes de chemins — le schéma est prêt
- `src/lib/auth.ts` — `auth.api.getSession()` — à appeler dans les Server Actions admin pour vérifier la session

### Established Patterns
- Server Actions pour toutes les mutations (pas d'API REST) — pattern établi en Phase 01
- Drizzle ORM avec `db` singleton depuis `src/db/index.ts`
- Variables d'environnement via `.env.local`, validées au démarrage
- Code commenté en français, expliquant le POURQUOI (D-07 de Phase 01)

### Integration Points
- Le pipeline écrit dans `uploads/originals/`, `uploads/processed/`, `uploads/thumbnails/` via `LocalStorageAdapter`
- La DB met à jour `pipeline_state` au fur et à mesure : PENDING → PROCESSING → AWAITING_VALIDATION ou FAILED
- L'écran de validation lit `processed_path` et `original_path` pour afficher le side-by-side
- Les actions "Approuver" / "Publier original" / "Rejeter" écrivent `status` et `published_at` en base

</code_context>

<specifics>
## Specific Ideas

- L'artiste utilise un iPhone — les photos peuvent être très lourdes (jusqu'à 20 MB en JPEG) et en couleurs Display-P3. La rotation EXIF est systématique sur iPhone. Ces deux points sont critiques pour Sharp.
- Sur iPhone, `<input type="file">` affiche nativement "Prendre une photo" ou "Choisir dans la bibliothèque" — pas besoin de code supplémentaire.
- L'artiste n'est pas développeur — les messages d'erreur doivent être en français, simples et actionnables ("Le fichier est trop lourd (max 20 MB). Compresse-le avant d'uploader.").

</specifics>

<deferred>
## Deferred Ideas

- Barre de progression pendant le traitement Sharp — nice-to-have, le polling d'état suffit pour v1
- Notification email en cas d'échec pipeline — à évaluer en Phase 5 (back-office)
- Recadrage / rotation manuelle avant publication — v2
- Traitement par lot (plusieurs photos à la fois) — v2

</deferred>

---

*Phase: 02-image-pipeline*
*Context gathered: 2026-04-25*
