# Phase 4 : Profils Visiteurs & Offres — Research

**Researched:** 2026-05-04
**Domain:** Sessions cookie sans mot de passe, soumission d'offres, email transactionnel, historique opt-in
**Confidence:** HIGH (stack vérifiée npm + docs officielles Next.js 15)

---

## Résumé

La Phase 4 connecte la galerie publique au système commercial : un visiteur peut créer un profil léger (pseudo + téléphone), obtenir une session cookie chiffrée, et soumettre une offre d'achat. L'artiste reçoit un email automatique à chaque nouvelle offre.

Le schéma DB (tables `visitors` et `offers`) est **déjà en place** depuis la Phase 1. La Phase 4 ajoute :
1. La gestion de session visiteur (iron-session v8, cookie chiffré séparé de Better Auth)
2. La décomposition du prix de base en 6 facteurs (colonnes séparées dans `artworks`)
3. La soumission d'offres avec rate limit DB-only (pas de Redis)
4. L'affichage de l'historique opt-in + l'envoi d'email via Resend

**Recommandation principale :** Iron-session v8 pour les sessions visiteurs (stateless, cookie chiffré AES-256, zéro table supplémentaire). Resend SDK pour les emails (pattern `{ data, error }` simple, pas de try/catch supplémentaire requis). Rate limit DB-only par `COUNT` Drizzle avant chaque insertion.

---

<user_constraints>
## Contraintes Utilisateur (issues du CLAUDE.md et du contexte projet)

### Décisions Verrouillées

- Visiteurs : pseudo/nom + téléphone obligatoire, email optionnel, **aucun mot de passe**
- Auth séparée : les visiteurs **n'utilisent pas Better Auth** — système de session propre
- Rate limit : **3 offres maximum** par visiteur par œuvre
- Historique offres : **nombre + meilleure offre** par défaut ; liste complète en opt-in
- Stack : Next.js 15 App Router, Drizzle ORM, Server Actions, Zod, Resend, Better Auth déjà installé pour l'artiste
- Tous les commentaires de code en **français**
- TypeScript strict partout
- Server Actions pour les mutations, Server Components pour le rendu public (SEO)

### Liberté de Claude

- Durée de vie de la session visiteur (iron-session `ttl`) — à recommander
- Format exact de stockage du prix de base (JSONB vs colonnes séparées) — à recommander
- Pattern exact de l'affichage opt-in (URL param vs useState client) — à recommander
- Normalisation du numéro de téléphone avant stockage (E.164 ou non)
- Template email (texte simple vs React Email) — à recommander

### Idées Reportées (hors scope Phase 4)

- Vérification OTP par SMS
- Likes sur les œuvres
- Historique des offres reçues par le visiteur (son propre historique)
</user_constraints>

---

<phase_requirements>
## Exigences de Phase

| ID | Description | Support Research |
|----|-------------|-----------------|
| AUTH-01 | Galerie, pages détail et historique offres accessibles sans compte | Server Components publics, pas de middleware sur `/artworks/*` |
| AUTH-02 | Profil léger : pseudo/nom + téléphone obligatoire, email optionnel | Iron-session + Server Action `createOrLoginVisitor` |
| AUTH-03 | Retrouver son compte par numéro de téléphone | Lookup Drizzle `eq(visitors.phone, phone)` + `session.save()` |
| MARKET-01 | Prix de base avec décomposition 6 facteurs visible sur page détail | Colonnes séparées dans `artworks` + composant `PriceBreakdown` |
| MARKET-02 | Offre libre (montant + message), avertissement si sous plancher, rate limit 3 | Server Action `submitOffer` + `COUNT` Drizzle + `belowFloor` |
| MARKET-03 | Email artiste à chaque nouvelle offre | Resend SDK dans `submitOffer`, après insertion en DB |
| MARKET-04 | Page détail : nombre d'offres + meilleure par défaut ; liste complète opt-in | Agrégat SQL + toggle `useState` client |
</phase_requirements>

---

## Carte des Responsabilités Architecturales

| Capacité | Tier Primaire | Tier Secondaire | Rationale |
|----------|-------------|----------------|-----------|
| Session visiteur (lecture) | API / Backend (Server Component) | — | `getIronSession(await cookies(), opts)` — lecture dans Server Component OK |
| Session visiteur (écriture) | Server Action | — | `cookies()` ne peut écrire que dans une Server Action ou Route Handler |
| Identification par téléphone | Server Action | — | Mutation DB + `session.save()` ensemble dans `'use server'` |
| Soumission d'offre | Server Action | — | Validation Zod + COUNT DB + INSERT + email Resend |
| Affichage historique (résumé) | Server Component | — | Agrégat SQL rendu côté serveur pour le SEO |
| Toggle opt-in liste complète | Client Component | Server Component parent | `useState` client sur un `'use client'` wrapper |
| Décomposition prix de base | Server Component | — | Lecture colonnes artworks, rendu statique |
| Envoi email artiste | Server Action | — | Resend SDK côté serveur uniquement (clé API secrète) |

---

## Stack Standard

### Core

| Bibliothèque | Version | Usage | Pourquoi Standard |
|---|---|---|---|
| iron-session | 8.0.4 | Sessions cookie chiffrées visiteurs | Stateless (pas de table sessions), AES-256-CBC, Next.js 15 compatible `[VERIFIED: npm registry]` |
| resend | 6.12.2 | Emails transactionnels artiste | SDK officiel, pattern `{ data, error }` propre, free tier 3000 emails/mois `[VERIFIED: npm registry]` |
| zod | 4.4.3 (déjà installé) | Validation inputs offres et profils | Déjà présent dans le projet, `z.e164()` natif pour les téléphones `[VERIFIED: npm registry]` |
| drizzle-orm | 0.45.2 (déjà installé) | COUNT rate limit, INSERT offres | Déjà utilisé partout dans le projet `[VERIFIED: package.json]` |

### Installation

```bash
npm install iron-session resend
```

**Vérification des versions :**
```bash
npm view iron-session version  # 8.0.4 confirmé 2024-11-12
npm view resend version        # 6.12.2 confirmé 2026-04-20
```

### Alternatives Considérées

| Au lieu de | Pourrait utiliser | Compromis |
|------------|-------------------|-----------|
| iron-session (cookie chiffré) | JWT manuel + table `visitor_sessions` | JWT = plus de code, table = migration DB supplémentaire. iron-session = zéro table |
| iron-session | Étendre Better Auth | Better Auth n'est pas conçu pour des profils sans mot de passe — contournement fragile |
| Resend | Nodemailer | Resend = infrastructure externe gérée, meilleure délivrabilité, free tier. Nodemailer = serveur SMTP à configurer |
| colonnes séparées | JSONB pour le prix | JSONB : flexible mais pas de contraintes DB, requêtes agrégées impossibles. Colonnes : typage fort, migrations propres |
| COUNT Drizzle | Redis / Upstash | Redis = dépendance externe non installée. COUNT en DB = suffisant pour 3 offres max par visiteur par œuvre (lecture ponctuelle, pas sous haute charge) |

---

## Patterns d'Architecture

### Diagramme Flux de Données — Plan 04-01 (Session Visiteur)

```
[Navigateur visiteur]
        │
        ▼
[Page /artworks/[id] — Server Component]
        │ lit iron-session via getIronSession(await cookies(), opts)
        │ → session.visitorId présent ? → affiche formulaire offre actif
        │ → absent ?                    → affiche bouton "Créer un profil"
        ▼
[Modal / Page /visitor/profile — Client Component]
        │ soumet FormData (pseudo, phone, email optionnel)
        ▼
[Server Action: createOrLoginVisitor]
        │ 1. Zod parse + normalisation téléphone
        │ 2. Drizzle: SELECT visitors WHERE phone = ?
        │    → trouvé   → utilise l'ID existant (AUTH-03)
        │    → pas trouvé → INSERT visitors + retourne new ID
        │ 3. getIronSession(await cookies(), opts)
        │ 4. session.visitorId = id ; await session.save()
        │    → cookie httpOnly chiffré envoyé au navigateur
        ▼
[Navigateur visiteur — cookie "pof_visitor_session" posé]
```

### Diagramme Flux de Données — Plan 04-03 (Soumission d'Offre)

```
[Formulaire offre — Client Component avec useActionState]
        │ soumet { artworkId, amount, message }
        ▼
[Server Action: submitOffer]
        │ 1. getIronSession → vérifie session.visitorId (garde-fou auth)
        │ 2. Zod parse { amount: z.number().positive(), message: z.string().max(500).optional() }
        │ 3. Drizzle COUNT WHERE artworkId=? AND visitorId=? → ≥ 3 → erreur rate limit
        │ 4. Drizzle SELECT artwork.basePrice → compare amount
        │ 5. Drizzle INSERT offers { artworkId, visitorId, amount, message, belowFloor }
        │ 6. Resend.emails.send() → email artiste
        │ 7. revalidatePath('/artworks/[id]') → cache invalidé
        ▼
[Page mise à jour — affiche la nouvelle offre dans l'historique]
```

### Diagramme Flux de Données — Plan 04-04 (Historique Opt-in)

```
[Page /artworks/[id] — Server Component]
        │ SQL: SELECT COUNT(*), MAX(amount) FROM offers WHERE artworkId=?
        │ → passe { offerCount, bestOffer } au panel
        ▼
[ArtworkInfoPanel — Server Component]
        │ affiche "N offres · Meilleure : X €"
        │ passe la liste complète (lazy-loaded) à OfferHistory
        ▼
[OfferHistory — Client Component 'use client']
        │ useState showAll = false
        │ bouton "Voir toutes les offres" → setShowAll(true)
        │ affiche la liste complète (déjà chargée, juste cachée)
        ▼
[Affichage : pseudo + montant pour chaque offre]
        (pas de numéro de téléphone affiché publiquement)
```

### Structure de Fichiers Recommandée

```
src/
├── actions/
│   ├── visitor.ts        # createOrLoginVisitor, logoutVisitor
│   └── offers.ts         # submitOffer
├── lib/
│   └── session.ts        # getVisitorSession() helper + SessionData type
├── components/
│   ├── artwork/
│   │   ├── ArtworkInfoPanel.tsx     # modifié : ajoute offres + prix décomposé
│   │   ├── PriceBreakdown.tsx       # NOUVEAU : décomposition 6 facteurs
│   │   ├── OfferForm.tsx            # NOUVEAU : formulaire offre (Client Component)
│   │   └── OfferHistory.tsx         # NOUVEAU : historique opt-in (Client Component)
│   └── visitor/
│       └── VisitorProfileModal.tsx  # NOUVEAU : modal création/connexion profil
└── db/
    └── schema.ts          # modifié : 6 colonnes prix ajoutées à artworks
```

---

## Patterns de Code

### Pattern 1 : Session Visiteur avec iron-session v8

**Ce que c'est :** Cookie AES-256-CBC chiffré, stateless (pas de table en DB). Next.js 15 exige `await cookies()`.

**Quand l'utiliser :** Toute Server Action ou Server Component qui doit connaître l'identité du visiteur.

```typescript
// Source: VERIFIED — github.com/vvo/iron-session README + nextjs.org/docs/app/api-reference/functions/cookies

// src/lib/session.ts
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'

/** Données stockées dans le cookie de session visiteur */
export interface VisitorSessionData {
  visitorId?: number
  displayName?: string
}

/** Configuration du cookie — VISITOR_SESSION_SECRET doit faire >= 32 caractères */
export const sessionOptions = {
  password: process.env.VISITOR_SESSION_SECRET as string,
  cookieName: 'pof_visitor_session',
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 60 * 60 * 24 * 365, // 1 an
  },
}

/**
 * Helper centralisé — à importer dans toutes les Server Actions visiteur.
 * POURQUOI une fonction wrapper ? Évite de dupliquer sessionOptions partout.
 */
export async function getVisitorSession() {
  return getIronSession<VisitorSessionData>(await cookies(), sessionOptions)
}
```

**Utilisation dans une Server Action :**
```typescript
// src/actions/visitor.ts
'use server'

import { getVisitorSession } from '@/lib/session'
import { db } from '@/db'
import { visitors } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function createOrLoginVisitor(formData: FormData) {
  // ... Zod validation ...
  const session = await getVisitorSession()
  session.visitorId = visitor.id
  session.displayName = visitor.displayName
  await session.save()  // Écrit le cookie httpOnly chiffré
  return { success: true }
}
```

**Lecture dans un Server Component :**
```typescript
// src/app/artworks/[id]/page.tsx
import { getVisitorSession } from '@/lib/session'

// cookies() peut être lu dans un Server Component, mais session.save() est impossible ici
const session = await getVisitorSession()
const isLoggedIn = !!session.visitorId
```

---

### Pattern 2 : Validation Zod du téléphone avec z.e164()

**Ce que c'est :** Zod v4 a `z.e164()` natif — valide `+[code_pays][numéro]` (7-15 chiffres).

**Pourquoi E.164 ?** Format international universel. Stocké normalisé en DB = lookups simples (AUTH-03).

**Limitation :** z.e164() valide le format syntaxique, pas si le numéro est actif ou attribué. Suffisant pour ce projet (pas de vérification OTP en v1).

```typescript
// Source: VERIFIED — zod.dev/api

import { z } from 'zod'

export const visitorProfileSchema = z.object({
  // Pseudo ou "Prénom Nom" — obligatoire
  displayName: z.string().min(2, 'Au moins 2 caractères').max(100),

  // Téléphone E.164 : +33612345678, +32497123456, etc.
  // POURQUOI E.164 ? Format normalisé international, stocké tel quel en DB.
  // Le visiteur doit inclure l'indicatif pays (ex: +33 pour la France).
  phone: z.e164(),

  // Email optionnel — validé seulement s'il est fourni
  email: z.string().email().optional().or(z.literal('')),
})

export const offerSchema = z.object({
  artworkId: z.number().int().positive(),
  // Montant en euros — minimum 1€ pour éviter les offres à 0
  amount: z.number().positive().min(1),
  // Message optionnel — limité pour éviter le spam
  message: z.string().max(500).optional(),
})
```

---

### Pattern 3 : Rate Limit DB-only (COUNT Drizzle)

**Ce que c'est :** Avant chaque INSERT d'offre, compter les offres existantes du visiteur pour cette œuvre. Si >= 3, rejeter.

**Pourquoi DB et pas Redis ?** Redis n'est pas installé. Le rate limit ici est métier (pas anti-DDoS) : 3 offres max par visiteur par œuvre. Une requête COUNT atomique par submission est largement suffisant.

**Piège : la course (race condition).** Deux soumissions simultanées pourraient toutes les deux passer le COUNT avant qu'une INSERT ne s'exécute. Solution : acceptable pour ce projet (site personnel, faible trafic). Pour une protection plus stricte, utiliser une contrainte UNIQUE ou une transaction sérialisée.

```typescript
// Source: VERIFIED — orm.drizzle.team/docs/guides/count-rows

import { db } from '@/db'
import { offers } from '@/db/schema'
import { count, eq, and } from 'drizzle-orm'

/**
 * Vérifie le rate limit avant insertion.
 * Retourne true si le visiteur a atteint la limite pour cette œuvre.
 */
async function hasReachedOfferLimit(
  visitorId: number,
  artworkId: number
): Promise<boolean> {
  const result = await db
    .select({ total: count() })
    .from(offers)
    .where(
      and(
        eq(offers.visitorId, visitorId),
        eq(offers.artworkId, artworkId)
      )
    )

  // count() retourne un bigint interprété comme string par le driver pg
  // → coercion explicite en number
  return Number(result[0]?.total ?? 0) >= 3
}
```

---

### Pattern 4 : Envoi Email Resend dans une Server Action

**Ce que c'est :** Resend SDK v6 envoie un email depuis une Server Action. La clé API ne quitte jamais le serveur.

**Piège critique :** Ne pas bloquer la réponse utilisateur sur l'email. Si Resend échoue (réseau, quota), l'offre est déjà enregistrée. Logguer l'erreur sans faire rater l'action entière.

```typescript
// Source: VERIFIED — resend.com/docs/send-with-nextjs

import { Resend } from 'resend'

// Instancier une seule fois au niveau module (pas dans la fonction)
// POURQUOI module-level ? Évite de recréer le client à chaque appel Server Action
const resend = new Resend(process.env.RESEND_API_KEY)

/**
 * Envoie l'email de notification à l'artiste.
 * POURQUOI ne pas lancer une erreur si l'email échoue ?
 * L'offre est déjà enregistrée en DB — l'artiste peut consulter son back-office.
 * Faire échouer l'action entière pour un email raté est disproportionné.
 */
async function notifyArtistNewOffer(params: {
  artworkTitle: string
  visitorName: string
  visitorPhone: string
  amount: number
  message?: string
}) {
  const { data, error } = await resend.emails.send({
    from: 'Galerie POF <notifications@galeriepof.fr>',
    to: process.env.ARTIST_EMAIL as string,
    subject: `Nouvelle offre — ${params.artworkTitle}`,
    text: [
      `Nouvelle offre reçue pour "${params.artworkTitle}"`,
      ``,
      `Visiteur : ${params.visitorName}`,
      `Téléphone : ${params.visitorPhone}`,
      `Montant : ${params.amount.toLocaleString('fr-FR')} €`,
      params.message ? `Message : ${params.message}` : '',
    ].filter(Boolean).join('\n'),
  })

  if (error) {
    // Log serveur uniquement — ne pas exposer l'erreur au client
    console.error('[notifyArtistNewOffer] Erreur Resend:', error)
  }

  return { emailId: data?.id }
}
```

---

### Pattern 5 : Toggle Opt-in Historique (useState Client)

**Ce que c'est :** La liste complète des offres est chargée côté serveur mais cachée par défaut. Un bouton client bascule l'affichage.

**URL param vs useState :** URL param permet le partage d'un lien avec la liste ouverte, mais force un rechargement serveur. Pour ce cas (galerie personnelle, pas de SEO sur l'historique), `useState` est suffisant et évite un round-trip inutile.

```typescript
// Source: ASSUMED — pattern Next.js standard 'use client' avec useState

'use client'

import { useState } from 'react'

interface Offer {
  id: number
  amount: string
  message: string | null
  visitorName: string
  createdAt: Date
}

interface OfferHistoryProps {
  offerCount: number
  bestOffer: string | null
  allOffers: Offer[]    // Chargé côté serveur, passé en prop
}

export function OfferHistory({ offerCount, bestOffer, allOffers }: OfferHistoryProps) {
  const [showAll, setShowAll] = useState(false)

  if (offerCount === 0) return null

  return (
    <div>
      {/* Résumé toujours visible (MARKET-04) */}
      <p>
        {offerCount} offre{offerCount > 1 ? 's' : ''}
        {bestOffer && ` · Meilleure : ${parseFloat(bestOffer).toLocaleString('fr-FR')} €`}
      </p>

      {/* Toggle opt-in — évite l'ancrage des prix à la baisse (CLAUDE.md) */}
      {!showAll && offerCount > 0 && (
        <button onClick={() => setShowAll(true)}>
          Voir toutes les offres
        </button>
      )}

      {showAll && (
        <ul>
          {allOffers.map((offer) => (
            <li key={offer.id}>
              <strong>{offer.visitorName}</strong>
              {' — '}
              {parseFloat(offer.amount).toLocaleString('fr-FR')} €
              {offer.message && <em> : {offer.message}</em>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
```

---

## Décisions Clés Documentées

### Q1 : Comment implémenter les sessions visiteurs ?

**Réponse : iron-session v8** (cookie chiffré AES-256-CBC)

| Critère | iron-session | JWT manuel | Étendre Better Auth |
|---------|-------------|------------|---------------------|
| Table DB supplémentaire | Non | Non | Oui (ou contournement) |
| Complexité | Faible | Moyenne | Élevée (détournement de l'outil) |
| Compatibilité Next.js 15 | Confirmée | Confirmée | Confirmée |
| Séparation artist/visiteur | Naturelle (cookie séparé) | Naturelle | Fragile |
| **Verdict** | **Recommandé** | Acceptable | Déconseillé |

Cookie séparé : `pof_visitor_session` (iron-session) et `better-auth.session_token` (Better Auth artiste) coexistent sans conflit.

---

### Q2 : Comment stocker la décomposition du prix de base (6 facteurs) ?

**Réponse : Colonnes séparées dans `artworks`**

Les 6 facteurs sont :
- `price_hours_spent` (decimal) — heures × taux horaire
- `price_format` (decimal) — bonus format/dimensions
- `price_framing` (decimal) — coût encadrement (0 si non encadré)
- `price_materials` (decimal) — coût des matériaux
- `price_technicality` (smallint, 1-5) — multiplicateur complexité
- `price_attachment` (smallint, 1-5) — valeur sentimentale

Le `base_price` actuel dans le schéma = la somme finale calculée. Les 6 colonnes permettent d'afficher le détail.

**Pourquoi pas JSONB ?**
- Pas de contraintes DB sur les valeurs individuelles (technicality doit être 1-5)
- Pas d'agrégats possibles sur les composants individuels (ex: "toutes les œuvres avec encadrement")
- Migration plus simple si un facteur change de type
- Drizzle type-safe natif sans `.$type<>()` supplémentaire

**Pourquoi pas une table séparée ?**
- Relation 1-to-1 stricte (une œuvre = exactement un prix de base)
- Jointure inutile à chaque affichage de la page détail
- Complexité de migration sans bénéfice

`[VERIFIED: orm.drizzle.team/docs/column-types/pg pour jsonb]` `[ASSUMED: choix colonnes séparées — raisonnement interne]`

---

### Q3 : Rate limit sans Redis ?

**Réponse : COUNT Drizzle avant INSERT**

```sql
SELECT count(*) FROM offers WHERE visitor_id = ? AND artwork_id = ?
```

Si `count >= 3` → rejeter avec message d'erreur explicite. Ce pattern est :
- Suffisant pour 3 offres max (usage rare, site personnel)
- Sans dépendance externe (pas de Redis, Upstash, etc.)
- Transactionnel (lecture atomique)

**Limitation acceptée :** Race condition théorique (deux soumissions simultanées). Pour ce projet (trafic faible), le risque est négligeable.

---

### Q4 : Toggle opt-in — URL param ou useState client ?

**Réponse : useState client**

| Critère | URL param (?showOffers=1) | useState client |
|---------|---------------------------|-----------------|
| SEO de la liste | Oui (mais non souhaité) | Non |
| Rechargement serveur | Oui | Non |
| Partage du lien avec liste ouverte | Oui | Non |
| Complexité | Moyenne (searchParams dans Server Component) | Faible |
| **Verdict pour ce projet** | Surdimensionné | **Recommandé** |

La liste d'offres n'a pas de valeur SEO (c'est du contenu transactionnel, pas du contenu éditorial). Un `useState` simple évite un round-trip serveur.

---

### Q5 : Email — texte simple ou React Email ?

**Réponse : texte simple (`text:`)** pour v1

React Email est une bibliothèque supplémentaire à installer et configurer. Pour une notification artiste interne (pas marketing), du texte plein est suffisant, lisible sur tous les clients mail, et sans dépendance supplémentaire.

React Email peut être ajouté en Phase 5 ou 6 si l'artiste souhaite un email plus élaboré.

`[ASSUMED: choix texte simple — raisonnement interne, pas de contrainte documentée]`

---

## Ne Pas Réinventer

| Problème | Ne pas construire | Utiliser plutôt | Pourquoi |
|----------|-------------------|-----------------|---------|
| Chiffrement cookie session | Crypto maison, JWT signé manuellement | iron-session | Gestion des rotations de clé, AES-256-CBC, expiration automatique |
| Envoi d'email | SMTP Nodemailer | Resend SDK | Infrastructure gérée, délivrabilité, free tier, pas de serveur SMTP |
| Validation téléphone | Regex `\d{10}` maison | `z.e164()` de Zod v4 | Validation internationale correcte, maintenance zéro |
| Comptage rate limit | Map en mémoire | COUNT Drizzle | Mémoire = non-persistant entre redémarrages, map = par instance (serverless) |

---

## Pièges Courants

### Piège 1 : `cookies()` est async en Next.js 15

**Ce qui plante :** Appeler `getIronSession(cookies(), opts)` sans `await` devant `cookies()`.

**Pourquoi :** Depuis Next.js 15, `cookies()` retourne une Promise. L'accès synchrone est déprécié et supprimé dans les versions futures.

**Comment éviter :**
```typescript
// CORRECT — Next.js 15
const session = await getIronSession<VisitorSessionData>(await cookies(), sessionOptions)

// INCORRECT — dépréciée, plante silencieusement ou en prod
const session = await getIronSession<VisitorSessionData>(cookies(), sessionOptions)
```

`[VERIFIED: nextjs.org/docs/app/api-reference/functions/cookies — "asynchronous function that returns a promise"]`

---

### Piège 2 : `session.save()` uniquement dans une Server Action

**Ce qui plante :** Appeler `session.save()` dans un Server Component (pas une Server Action).

**Pourquoi :** Next.js interdit d'écrire des cookies (via `Set-Cookie`) pendant le rendu d'un Server Component. Seules les Server Actions et Route Handlers peuvent écrire des cookies.

**Comment éviter :** Lire la session dans les Server Components, écrire uniquement dans les Server Actions (`'use server'`).

`[VERIFIED: nextjs.org/docs/app/api-reference/functions/cookies — "Setting cookies is not supported during Server Component rendering"]`

---

### Piège 3 : Resend instancié dans la fonction (et non au niveau module)

**Ce qui plante :** `const resend = new Resend(...)` à l'intérieur de la Server Action.

**Pourquoi :** En serverless (Railway, Vercel), chaque appel recrée le client inutilement. Le module est mis en cache entre les appels chauds — instancier au niveau module est le pattern officiel.

**Comment éviter :**
```typescript
// CORRECT — une seule instance partagée
const resend = new Resend(process.env.RESEND_API_KEY)

export async function submitOffer(...) {
  // utilise `resend` déjà instancié
}
```

`[CITED: resend.com/docs/send-with-nextjs]`

---

### Piège 4 : Exposer le numéro de téléphone dans l'historique public

**Ce qui plante :** Passer `visitor.phone` dans les props d'`OfferHistory`.

**Pourquoi :** L'historique est public (AUTH-01). Le téléphone est une donnée personnelle confidentielle — ne doit jamais être rendu côté client.

**Comment éviter :** La requête SQL pour `allOffers` ne sélectionne que `visitors.displayName`, jamais `visitors.phone` ni `visitors.email`.

`[ASSUMED: bonne pratique RGPD — raisonnement interne]`

---

### Piège 5 : `belowFloor` calculé côté client

**Ce qui plante :** Laisser le navigateur calculer si l'offre est sous le prix de base.

**Pourquoi :** Le client peut manipuler cette valeur. `belowFloor` doit être calculé dans la Server Action en comparant `amount` avec `artwork.basePrice` récupéré de la DB.

**Comment éviter :**
```typescript
// Dans submitOffer — Server Action
const artwork = await db.query.artworks.findFirst({
  where: eq(artworks.id, artworkId),
  columns: { basePrice: true }
})
const belowFloor = artwork?.basePrice
  ? parseFloat(amount.toString()) < parseFloat(artwork.basePrice)
  : false
```

`[ASSUMED: principe de validation côté serveur — raisonnement interne]`

---

### Piège 6 : Oublier VISITOR_SESSION_SECRET dans les variables d'environnement

**Ce qui plante :** La variable n'est pas définie → `process.env.VISITOR_SESSION_SECRET` est `undefined` → iron-session lève une erreur au premier appel.

**Comment éviter :** Ajouter au `.env.local` (dev) et aux variables Railway (prod) :
```env
VISITOR_SESSION_SECRET=une_clé_de_32_caractères_minimum_obligatoire
ARTIST_EMAIL=email_de_lartiste@exemple.fr
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
```

La vérification au démarrage peut être ajoutée dans `src/lib/session.ts` :
```typescript
if (!process.env.VISITOR_SESSION_SECRET || process.env.VISITOR_SESSION_SECRET.length < 32) {
  throw new Error('VISITOR_SESSION_SECRET manquante ou trop courte (minimum 32 caractères)')
}
```

`[VERIFIED: github.com/vvo/iron-session README — "password must be at least 32 characters"]`

---

## Schema DB — Modifications Phase 4

### Colonnes à ajouter à la table `artworks`

Ces 6 colonnes décomposent le `base_price` existant (MARKET-01) :

```typescript
// Source: VERIFIED — orm.drizzle.team/docs/column-types/pg

import { numeric, smallint } from 'drizzle-orm/pg-core'

// À ajouter dans la définition de pgTable('artworks', { ... })

// === Décomposition du prix de base (MARKET-01) ===
// Chaque facteur est optionnel — null si l'artiste ne l'a pas renseigné.

// Heures passées × taux horaire de l'artiste (ex: 8h × 20€/h = 160€)
priceHoursSpent: numeric('price_hours_spent', { precision: 8, scale: 2 }),

// Bonus lié au format/dimensions (ex: grande toile = +50€)
priceFormat: numeric('price_format', { precision: 8, scale: 2 }),

// Coût de l'encadrement (0 si non encadré, ex: 80€ si cadre baguette)
priceFraming: numeric('price_framing', { precision: 8, scale: 2 }),

// Coût des matériaux (pigments, papier, toile, etc.)
priceMaterials: numeric('price_materials', { precision: 8, scale: 2 }),

// Niveau de technicité 1-5 (1 = simple, 5 = très complexe)
// smallint = 2 octets, valeurs -32768 à 32767 — suffisant pour 1-5
priceTechnicality: smallint('price_technicality'),

// Attachement sentimental de l'artiste 1-5 (influe sur le prix plancher)
priceAttachment: smallint('price_attachment'),
```

**Migration :** `npx drizzle-kit push` (mode dev) ou générer une migration SQL.

---

## Architecture de Validation (Vitest)

### Framework de Test

| Propriété | Valeur |
|-----------|--------|
| Framework | Vitest 4.1.5 (déjà installé) |
| Config | `vitest.config.ts` (existe) |
| Commande rapide | `npx vitest run tests/offers/` |
| Suite complète | `npx vitest run` |

### Mapping Exigences → Tests

| REQ-ID | Comportement | Type | Commande Automatisée | Fichier |
|--------|-------------|------|---------------------|---------|
| AUTH-02 | Création profil visiteur avec téléphone valide | unit | `npx vitest run tests/visitor/profile.test.ts` | Wave 0 |
| AUTH-03 | Retrouver compte existant par téléphone | unit | `npx vitest run tests/visitor/lookup.test.ts` | Wave 0 |
| MARKET-02 | Rejet offre si rate limit atteint (>= 3) | unit | `npx vitest run tests/offers/ratelimit.test.ts` | Wave 0 |
| MARKET-02 | belowFloor calculé correctement côté serveur | unit | `npx vitest run tests/offers/submit.test.ts` | Wave 0 |
| MARKET-02 | Validation Zod offre — montant positif requis | unit | `npx vitest run tests/offers/validation.test.ts` | Wave 0 |
| AUTH-02 | Rejet téléphone format non-E.164 | unit | `npx vitest run tests/visitor/phone.test.ts` | Wave 0 |

### Échantillonnage

- **Par commit de tâche :** `npx vitest run tests/offers/ tests/visitor/`
- **Par fusion de wave :** `npx vitest run`
- **Gate de phase :** Suite complète verte avant `/gsd-verify-work`

### Lacunes Wave 0

- [ ] `tests/visitor/profile.test.ts` — AUTH-02/03
- [ ] `tests/offers/submit.test.ts` — MARKET-02 (rate limit, belowFloor)
- [ ] `tests/offers/validation.test.ts` — schémas Zod offre et profil
- [ ] `tests/visitor/phone.test.ts` — z.e164() et normalisation

---

## Disponibilité Environnement

| Dépendance | Requise par | Disponible | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | iron-session, Resend | Oui | v24.13.0 | — |
| PostgreSQL (via Docker) | Drizzle ORM | Oui (Phase 1) | — | — |
| resend (npm) | MARKET-03 | Non installé | 6.12.2 latest | — |
| iron-session (npm) | AUTH-02/03 | Non installé | 8.0.4 latest | — |
| RESEND_API_KEY (env) | Resend | A confirmer | — | Email skippe (log erreur) |
| VISITOR_SESSION_SECRET (env) | iron-session | A ajouter | — | Bloquant — app crash |
| ARTIST_EMAIL (env) | Notification artiste | A confirmer | — | Utiliser email hardcodé |

**Dépendances bloquantes (pas de fallback) :**
- `VISITOR_SESSION_SECRET` — doit être ajouté à `.env.local` avant le Wave 1

**Dépendances avec fallback :**
- `RESEND_API_KEY` / `ARTIST_EMAIL` — si absent, logguer l'erreur et continuer (l'offre est enregistrée)

---

## Domaine Sécurité (ASVS)

### Catégories ASVS Applicables

| Catégorie ASVS | Applicable | Contrôle Standard |
|----------------|-----------|-------------------|
| V2 Authentification | Oui (session visiteur) | iron-session (cookie httpOnly, AES-256) |
| V3 Gestion de Session | Oui | iron-session TTL 1 an, `sameSite: lax`, `httpOnly: true` |
| V4 Contrôle d'Accès | Oui | Vérification `session.visitorId` en première ligne de `submitOffer` |
| V5 Validation des Entrées | Oui | Zod `offerSchema` + `visitorProfileSchema` côté serveur |
| V6 Cryptographie | Partiellement | AES-256-CBC via iron-session (ne pas implémenter manuellement) |

### Patterns de Menace pour ce Stack

| Pattern | STRIDE | Mitigation Standard |
|---------|--------|---------------------|
| Manipulation du montant `belowFloor` côté client | Falsification | Calculé dans la Server Action uniquement |
| Accès à `session.visitorId` d'un autre visiteur | Élévation de privilège | Cookie chiffré AES-256, pas de session ID devinable |
| Spam d'offres (> 3 par visiteur par œuvre) | Déni de service | COUNT Drizzle avant INSERT |
| Exposition du téléphone dans l'historique public | Divulgation | SELECT `displayName` uniquement dans la requête historique |
| Clé API Resend exposée côté client | Divulgation | Instanciation au niveau module serveur uniquement, jamais dans un Client Component |
| VISITOR_SESSION_SECRET trop courte | Cryptographique | Validation >= 32 chars au démarrage |

---

## État de l'Art

| Ancienne Approche | Approche Actuelle | Changée Quand | Impact |
|---|---|---|---|
| `cookies()` synchrone (Next.js 14) | `await cookies()` (Next.js 15) | Next.js 15.0.0-RC | Tout le code iron-session doit `await cookies()` |
| `useFormState` (React 18) | `useActionState` (React 19) | React 19 / Next.js 15 | `useFormState` est déprécié — utiliser `useActionState` |
| iron-session v7 (Pages Router) | iron-session v8 (App Router) | 2024-11-12 | API simplifiée : `getIronSession(cookies(), opts)` uniquement |

---

## Journal des Hypothèses

| # | Hypothèse | Section | Risque si Faux |
|---|-----------|---------|----------------|
| A1 | Texte simple (pas React Email) suffisant pour l'email artiste | Pattern 4 | Email peu lisible — ajouter React Email en Phase 5 si besoin |
| A2 | useState client suffisant pour le toggle opt-in (pas d'URL param) | Pattern 5 / Q4 | Si l'artiste veut partager un lien avec la liste ouverte, rebasculer en URL param |
| A3 | Colonnes séparées préférées à JSONB pour les 6 facteurs prix | Q2 | Pas de risque fonctionnel — choix réversible avec une migration |
| A4 | Race condition rate limit acceptable (trafic faible) | Q3 | Si trafic élevé, ajouter une contrainte UNIQUE sur (visitor_id, artwork_id) + logique métier |
| A5 | TTL 1 an pour la session visiteur | Pattern 1 | Si trop long = préférence utilisateur. Réductible à 90 jours sans changement de comportement |

---

## Questions Ouvertes

1. **Domaine email expéditeur Resend**
   - Ce qu'on sait : Resend exige un domaine vérifié en production (`from: 'Galerie POF <notifications@galeriepof.fr>'`)
   - Ce qui est flou : Le domaine `galeriepof.fr` est-il déjà acheté / vérifié dans Resend ?
   - Recommandation : En dev, utiliser `onboarding@resend.dev` (domaine Resend, pas de vérification requise). Configurer le domaine réel en Phase 6 (Production Readiness).

2. **Format d'affichage du téléphone visiteur côté admin**
   - Ce qu'on sait : ADMIN-05 (Phase 5) doit afficher les coordonnées complètes du visiteur
   - Ce qui est flou : Le téléphone est stocké en E.164 (`+33612345678`). Faut-il l'afficher tel quel ou reformaté ?
   - Recommandation : Afficher tel quel pour la Phase 4. La Phase 5 peut ajouter du formatage d'affichage.

3. **Variable VISITOR_SESSION_SECRET en production Railway**
   - Ce qu'on sait : La variable doit faire ≥ 32 caractères
   - Ce qui est flou : A-t-elle déjà été générée et ajoutée à Railway ?
   - Recommandation : Générer avec `openssl rand -base64 32` et documenter dans Wave 0.

---

## Sources

### Primaires (HIGH confidence)
- `nextjs.org/docs/app/api-reference/functions/cookies` — Confirmation async cookies(), Server Actions uniquement pour écriture
- `github.com/vvo/iron-session` README — API getIronSession, SessionOptions, TypeScript generics
- `orm.drizzle.team/docs/guides/count-rows` — Pattern COUNT avec WHERE clause
- `orm.drizzle.team/docs/column-types/pg` — Type jsonb et numeric
- `resend.com/docs/send-with-nextjs` — Pattern Server Action Resend, `{ data, error }`
- `zod.dev/api` — z.e164() validation téléphone E.164

### Secondaires (MEDIUM confidence)
- `npm view iron-session version` — 8.0.4 confirmé
- `npm view resend version` — 6.12.2 confirmé
- `package.json` du projet — zod 4.4.3, drizzle-orm 0.45.2 déjà installés

### Tertiaires (LOW confidence — signalés)
- WebSearch : pattern useState vs URL param pour toggle opt-in — cross-vérifié avec la doc Next.js officielle

---

## Métadonnées

**Breakdown de confidence :**
- Stack (iron-session, Resend, Zod) : HIGH — versions vérifiées npm + docs officielles
- Patterns d'architecture : HIGH — basés sur docs Next.js 15 officielles
- Décisions (JSONB vs colonnes, rate limit DB-only) : MEDIUM — raisonnement interne vérifié contre docs Drizzle
- Pièges : HIGH — vérifiés contre les changelogs Next.js 15 et docs iron-session

**Date de recherche :** 2026-05-04
**Valable jusqu'au :** 2026-06-04 (bibliothèques stables — iron-session et Resend évoluent lentement)
