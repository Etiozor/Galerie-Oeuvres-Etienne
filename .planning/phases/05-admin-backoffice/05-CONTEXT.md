# Phase 5: Admin Back-office — Context

**Gathered:** 2026-05-11
**Status:** Ready for planning

<domain>
## Phase Boundary

L'artiste peut gérer le cycle de vie complet de sa collection depuis un back-office protégé : éditer les métadonnées des œuvres, changer les statuts, consulter toutes les offres reçues. En parallèle, le visiteur connecté dispose d'une page profil `/mon-profil` et d'un indicateur de connexion dans la nav. Les 5 plans avancent en deux blocs : admin d'abord (05-01 à 05-03), visiteur ensuite (05-04 et 05-05).

</domain>

<decisions>
## Implementation Decisions

### Ordre d'exécution

- **D-01:** Admin d'abord (plans 05-01, 05-02, 05-03), puis visiteur (05-04, 05-05). L'artiste a besoin de gérer ses œuvres et ses offres avant d'améliorer l'expérience visiteur.

### Page liste admin (05-01)

- **D-02:** La liste `/admin/artworks` existante (plan 02-03) reste la page principale. Elle affiche déjà titre + badge pipeline + date. En Phase 5, chaque ligne est cliquable vers `/admin/artworks/[id]` où se trouvent toutes les actions (statut, suppression, édition).
- **D-03:** Pas de dropdown inline pour changer le statut. L'artiste clique sur l'œuvre → page détail → y change le statut. Cohérence : un seul endroit pour toutes les actions sur une œuvre.

### Page détail admin (05-01 / 05-02)

- **D-04:** La page `/admin/artworks/[id]` étend la page de validation pipeline existante (plan 02-04, `/admin/artworks/[id]/validate`). En Phase 5, la même URL `/admin/artworks/[id]` devient la page centrale de gestion : on y trouve la validation pipeline (si `awaiting_validation`) + les métadonnées éditables + le changement de statut + la suppression. La route `/validate` reste accessible depuis la liste si nécessaire.
- **D-05:** Suppression : confirmation requise (dialog shadcn/ui AlertDialog) avant le DELETE. La suppression supprime l'entrée DB + les fichiers storage (original, processed, thumbnail) via `StorageProvider.delete()`. Cascade DB supprime les offres liées automatiquement (FK onDelete cascade).

### Formulaire d'édition des métadonnées (05-02)

- **D-06:** Flux de création : l'artiste uploade d'abord la photo (pipeline existant), le pipeline tourne, l'artiste valide l'image — ensuite seulement il remplit les métadonnées. Pas de formulaire avant upload.
- **D-07:** Formulaire d'édition disponible dès que l'œuvre existe en DB (même état `pending`). Champs : titre (varchar 255), date de création (date picker), description (textarea), type (select depuis `artwork_types`), médium (select depuis `mediums`), dimensions (width_cm + height_cm), prix de base + 6 colonnes de décomposition.
- **D-08:** La décomposition du prix (priceHoursSpent, priceFormat, priceFraming, priceMaterials, priceTechnicality 1-5, priceAttachment 1-5) est saisie dans le même formulaire que les métadonnées. Le composant `PriceBreakdown` côté visiteur (plan 04-02) sert de référence pour les labels.
- **D-09:** Server Action `updateArtwork(artworkId, data)` — même pattern que `submitOffer`. Validation Zod côté serveur avant toute écriture DB. Retour `{ success: true }` ou `{ success: false, errors: ... }`.

### Dashboard offres (05-03)

- **D-10:** Liste des offres accessible depuis `/admin/artworks/[id]` directement (section en bas de la page détail) — pas une URL séparée. Colonnes : visiteur (displayName), téléphone, email (si fourni), montant, message, date. Triable par montant décroissant par défaut.
- **D-11:** Le téléphone et l'email du visiteur sont affichés uniquement dans l'admin (artiste connecté). Jamais côté public. Pattern identique à `sendNewOfferEmail`.

### Page profil visiteur /mon-profil (05-04)

- **D-12:** Route `/mon-profil` — Server Component qui lit la session iron-session. Si non connecté → redirection vers `/` avec le modal d'identification ouvert (ou affichage d'un message "Identifiez-vous"). Si connecté → affichage du profil.
- **D-13:** Sections de `/mon-profil` :
  1. **Mes informations** : displayName, téléphone masqué (•••• + 4 derniers chiffres), email si fourni.
  2. **Mes offres** : liste de toutes les offres du visiteur connecté, toutes œuvres confondues — titre de l'œuvre (lien vers détail), montant, date, message.
  3. **Mes acquisitions** : œuvres dont le statut est `sold` ET sur lesquelles le visiteur a soumis au moins une offre. Heuristique simple — pas de champ `accepted_at` en DB.
  4. **Mes œuvres enregistrées** : liste des favoris (table `saved_artworks` — voir D-14).
- **D-14:** Système de favoris minimal : nouvelle table `saved_artworks` (visitorId, artworkId, createdAt — clé primaire composite). Bouton cœur sur la page détail d'œuvre, visible uniquement si le visiteur est connecté. Server Action `toggleSavedArtwork(artworkId)` — upsert/delete selon l'état actuel.

### Indicateur de connexion SiteNav (05-05)

- **D-15:** `SiteNav` devient async Server Component pour lire `getVisitorSession()`. Si connecté : affiche l'initiale du displayName en cercle (ou carré, D-03 = zéro coins arrondis) + lien vers `/mon-profil`. Si non connecté : affiche un bouton/lien "S'identifier" qui ouvre le modal `VisitorProfileModal`.
- **D-16:** D-03 s'applique à l'icône de compte : carré, pas de border-radius. Fond `var(--color-ink)`, initiale en blanc, taille ~28px. Space Mono pour la lettre.
- **D-17:** Le `VisitorProfileModal` est déjà un composant Client existant. Pour le déclencher depuis SiteNav (Server Component), passer un param URL `?identify=1` et lire ce param dans le layout pour ouvrir le modal automatiquement — ou exposer un `openModal` via un contexte React client.

### Acquisitions — Définition

- **D-18:** "Acquisition probable" = artwork.status === 'sold' ET visitor a au moins une offre sur cet artwork. Affiché dans /mon-profil avec mention "Acquis (offre soumise)". Pas de garantie que c'est bien cet acheteur — l'artiste peut avoir vendu à quelqu'un d'autre — mais c'est l'heuristique retenue pour v1 sans champ `accepted_at`.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Projet
- `.planning/PROJECT.md` — Vision et contraintes globales
- `.planning/REQUIREMENTS.md` — ADMIN-01 à ADMIN-05
- `.planning/ROADMAP.md` — Plans 05-01 à 05-05 avec critères de succès
- `CLAUDE.md` — Commenter le code en français, TypeScript strict

### Fondations (à réutiliser impérativement)
- `src/db/schema.ts` — Tables artworks, visitors, offers + relations Drizzle
- `src/lib/auth.ts` — Better Auth, pattern `auth.api.getSession({ headers })`
- `src/lib/session.ts` — iron-session visiteur, `getVisitorSession()`
- `src/app/admin/artworks/page.tsx` — Liste existante (02-03) à étendre
- `src/app/admin/artworks/[id]/validate/page.tsx` — Page validation pipeline (02-04) à étendre
- `src/actions/visitor.ts` — Pattern Server Action avec Zod + useActionState
- `src/actions/offers.ts` — Pattern Server Action avec rate limit et sendNewOfferEmail
- `src/components/layout/SiteNav.tsx` — Nav existante à étendre (D-15)
- `src/components/visitor/VisitorProfileModal.tsx` — Modal d'identification visiteur
- `src/components/artwork/PriceBreakdown.tsx` — Labels des 6 facteurs prix (référence pour le formulaire admin)

### Design system (CRITIQUE — respecter à la lettre)
- D-03 (Phase 3 CONTEXT) : zéro coins arrondis sur tous les éléments
- D-02 (Phase 3 CONTEXT) : Oswald (titres), Space Mono (labels/nav), Cormorant Garamond (descriptions)
- Palette : fond `#f2e8cf`, ink `#1a1a1a`, ink-muted `#5a5244`, surface `#ede0b8`
- Admin pages : `fontFamily: 'var(--font-geist-sans)'` (pattern existant dans les pages admin)

</canonical_refs>

<code_context>
## Existing Code Insights

### Pages admin existantes à étendre
- `/admin` — tableau de bord vide (placeholder Phase 5)
- `/admin/artworks` — liste titre + badge pipeline + date + lien validate
- `/admin/artworks/[id]/validate` — écran before/after + 3 Server Actions (approve/publishRaw/reject)
- `/admin/upload` — upload pipeline, bodySizeLimit configuré

### Patterns établis
- Auth check : `auth.api.getSession({ headers: await headers() })` + `if (!session) redirect('/admin/login')`
- Server Actions : `'use server'` + Zod parse + DB op + return `{ success: true | false }`
- Drizzle : `db.select().from(table).where(eq(...))` — pas de `db.query` (schema relations disponibles mais pattern select utilisé)
- shadcn/ui AlertDialog disponible (`src/components/ui/alert-dialog.tsx`)
- Inline styles partout (pas de Tailwind classes dans les composants admin existants)

### Nouveau : table saved_artworks
```typescript
// À ajouter dans src/db/schema.ts
export const savedArtworks = pgTable('saved_artworks', {
  visitorId: integer('visitor_id').notNull().references(() => visitors.id, { onDelete: 'cascade' }),
  artworkId: integer('artwork_id').notNull().references(() => artworks.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  primaryKey({ columns: [table.visitorId, table.artworkId] }),
])
```
→ `db:push` pour appliquer (pas de fichiers de migration dans ce projet).

### SiteNav → async Server Component
```typescript
// Pattern pour lire la session visiteur dans un Server Component
import { getVisitorSession } from '@/lib/session'

export async function SiteNav() {
  const session = await getVisitorSession()
  const isLoggedIn = !!session.visitorId
  // ...
}
```

</code_context>

<specifics>
## Specific Ideas

- La page `/admin/artworks/[id]` en Phase 5 devient la page "fiche complète" d'une œuvre : image + pipeline state + formulaire de métadonnées + changement de statut + liste des offres reçues + suppression. Tout au même endroit, un seul clic depuis la liste.
- Pour ouvrir le modal depuis un lien "S'identifier" dans SiteNav : utiliser un param `?modal=identify` dans l'URL + un Client Component dans le layout qui détecte ce param et ouvre le modal. Pattern propre, compatible Server Components.
- Le formulaire d'édition des métadonnées utilise `useActionState` (React 19) comme les autres formulaires — pas de state management séparé.
- `StorageProvider.delete()` doit être vérifié : l'interface existe mais la méthode delete n'a peut-être pas été implémentée dans l'adaptateur local. À vérifier avant le plan 05-01.

</specifics>

<deferred>
## Deferred Ideas

- Champ `offers.accepted_at` pour marquer l'offre acceptée — v2 (acquisitions précises)
- Gestion des types et médiums depuis l'admin (ajouter "pastel", "fusain", etc.) — v2
- Exports CSV des offres — v2
- Tableau de bord avec statistiques (nb vues, nb offres, CA potentiel) — v2
- Zoom interactif sur la page détail admin — non demandé
- Notifications push navigateur pour les nouvelles offres — v2

</deferred>

---

*Phase: 05-admin-backoffice*
*Context gathered: 2026-05-11*
