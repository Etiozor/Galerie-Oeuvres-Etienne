/**
 * Schéma de base de données de la Galerie POF.
 *
 * Ce fichier définit toutes les tables de la base de données.
 * Drizzle ORM lit ces définitions pour :
 * 1. Générer les migrations SQL (npx drizzle-kit push)
 * 2. Fournir les types TypeScript pour les requêtes
 *
 * DÉCISIONS IMPORTANTES :
 * - Les types et médiums sont en TABLE (pas en enum TypeScript) pour être
 *   extensibles depuis l'admin sans toucher au code [D-01, D-03]
 * - Les tags libres utilisent une relation many-to-many [D-02]
 * - Chaque œuvre a 3 chemins d'image distincts (original, traité, miniature) [C1]
 * - Les statuts utilisent des enums PostgreSQL natifs — ce sont des valeurs
 *   machine-critiques qui ne changent jamais [M8]
 */

import {
  pgTable,
  pgEnum,
  serial,
  text,
  varchar,
  numeric,
  integer,
  boolean,
  timestamp,
  primaryKey,
  index,
  smallint,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// ============================================================
// TABLES Better Auth — gestion des sessions et comptes artiste
// ============================================================

/**
 * Tables requises par Better Auth pour gérer l'authentification.
 *
 * POURQUOI ces tables sont dans notre schéma et pas gérées séparément ?
 * Le Drizzle Adapter de Better Auth a besoin de lire notre schéma pour savoir
 * dans quelles tables stocker les sessions, comptes et utilisateurs.
 * Ces tables sont créées et gérées entièrement par Better Auth — on ne les
 * touche jamais directement dans le code applicatif.
 *
 * Noms de colonnes : Better Auth impose ses propres conventions (camelCase en JS,
 * snake_case en base). On respecte ces conventions pour éviter les bugs.
 */

// Table des utilisateurs artiste (un seul utilisateur en pratique)
export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull(),
  image: text('image'),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
})

// Table des sessions actives (cookie de session → entrée ici)
export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  // Clé étrangère vers l'utilisateur — si l'utilisateur est supprimé, ses sessions aussi
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
})

// Table des comptes liés (email+password stocké ici via le champ password)
export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  // Le mot de passe hashé est stocké ici (bcrypt géré par Better Auth)
  password: text('password'),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
})

// Table de vérification (tokens email, reset de mot de passe, etc.)
export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at'),
  updatedAt: timestamp('updated_at'),
})

// ============================================================
// ENUMS PostgreSQL — uniquement pour les statuts machine-critiques
// ============================================================

/**
 * Statut de disponibilité d'une œuvre.
 *
 * Ce statut contrôle si une œuvre peut recevoir des offres :
 * - available (disponible) : accepte les offres
 * - sold (vendue) : transaction conclue
 * - given (donnée) : offerte à quelqu'un
 * - reserved (réservée) : en attente de confirmation
 */
export const artworkStatusEnum = pgEnum('artwork_status', [
  'available',
  'sold',
  'given',
  'reserved',
])

/**
 * État du pipeline de traitement d'image.
 *
 * Chaque œuvre passe par ces états lors de l'upload et du traitement :
 * - pending : en attente de traitement (upload reçu)
 * - processing : Sharp est en train de traiter l'image
 * - awaiting_validation : traitement terminé, artiste doit valider
 * - published : validé et visible dans la galerie publique
 * - failed : erreur lors du traitement — doit être géré par l'artiste
 */
export const pipelineStateEnum = pgEnum('pipeline_state', [
  'pending',
  'processing',
  'awaiting_validation',
  'published',
  'failed',
])

// ============================================================
// TABLE : artwork_types — Types d'œuvres (extensibles depuis l'admin)
// ============================================================

/**
 * Types d'œuvres : dessin, peinture, etc.
 *
 * POURQUOI une table et pas un enum TypeScript ?
 * L'artiste doit pouvoir ajouter un nouveau type depuis l'interface admin
 * sans qu'un développeur touche au code. Une table permet ça. Un enum non.
 * [Décision D-01]
 */
export const artworkTypes = pgTable('artwork_types', {
  id: serial('id').primaryKey(),

  // Nom affiché dans la galerie et l'admin (ex: "Dessin", "Peinture")
  name: varchar('name', { length: 100 }).notNull().unique(),

  // Slug URL-friendly pour les filtres (ex: "dessin", "peinture")
  slug: varchar('slug', { length: 100 }).notNull().unique(),

  // Ordre d'affichage dans les menus de filtre
  sortOrder: integer('sort_order').notNull().default(0),

  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// ============================================================
// TABLE : mediums — Médiums artistiques (extensibles depuis l'admin)
// ============================================================

/**
 * Médiums artistiques : crayon, encre, acrylique, huile, etc.
 *
 * Même logique que les types : en table pour permettre à l'artiste
 * d'ajouter de nouveaux médiums depuis l'admin. [Décision D-01]
 */
export const mediums = pgTable('mediums', {
  id: serial('id').primaryKey(),

  // Nom affiché (ex: "Crayon graphite", "Huile sur toile")
  name: varchar('name', { length: 100 }).notNull().unique(),

  // Slug URL-friendly pour les filtres (ex: "crayon", "huile")
  slug: varchar('slug', { length: 100 }).notNull().unique(),

  // Ordre d'affichage dans les menus de filtre
  sortOrder: integer('sort_order').notNull().default(0),

  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// ============================================================
// TABLE : artworks — Œuvres d'art (table principale)
// ============================================================

/**
 * Table principale : chaque ligne représente une œuvre de la galerie.
 *
 * Points importants :
 * - typeId et mediumId référencent des tables extensibles (D-01)
 * - original_path, processed_path, thumbnail_path sont TROIS colonnes séparées (C1)
 *   pour ne jamais perdre l'original si le traitement est refait
 * - base_price est le plancher souple pour les offres (les offres sous ce prix
 *   affichent un avertissement mais ne sont pas bloquées)
 */
export const artworks = pgTable('artworks', {
  id: serial('id').primaryKey(),

  // === Métadonnées de l'œuvre ===
  // Titre par défaut 'Sans titre' pour les uploads sans métadonnées (D-01, D-02).
  // L'artiste mettra à jour ce titre depuis l'admin en Phase 5.
  title: varchar('title', { length: 255 }).notNull().default('Sans titre'),
  description: text('description'),

  // Date de CRÉATION de l'œuvre (pas la date d'ajout dans la galerie)
  // L'artiste saisit cette date manuellement
  createdDate: timestamp('created_date', { withTimezone: true }),

  // Dimensions en centimètres (null si non renseigné)
  widthCm: numeric('width_cm', { precision: 6, scale: 1 }),
  heightCm: numeric('height_cm', { precision: 6, scale: 1 }),

  // === Classification — 3 niveaux [D-03] ===
  // Niveau 1 : type (dessin / peinture / ...) — référence artwork_types
  typeId: integer('type_id').references(() => artworkTypes.id),

  // Niveau 2 : médium (crayon / huile / ...) — référence mediums
  mediumId: integer('medium_id').references(() => mediums.id),

  // Niveau 3 : tags libres — via la table de jonction artwork_tags [D-02]

  // === Statuts ===
  status: artworkStatusEnum('status').notNull().default('available'),
  pipelineState: pipelineStateEnum('pipeline_state').notNull().default('pending'),

  // === Prix ===
  // Prix de base (plancher souple) — les offres sous ce montant affichent un avertissement
  basePrice: numeric('base_price', { precision: 10, scale: 2 }),

  // === Décomposition du prix de base (MARKET-01) ===
  // Ces 6 facteurs expliquent comment l'artiste a calculé le base_price.
  // Toutes nullables : l'artiste les renseigne depuis l'admin (Phase 5).
  // Affichage côté visiteur sur la page détail (Phase 4 — plan 04-02).

  // Rémunération du temps passé : heures × taux horaire de l'artiste
  // Ex : 8 heures à 25 €/h = 200 € → stocker 200.00
  priceHoursSpent: numeric('price_hours_spent', { precision: 8, scale: 2 }),

  // Bonus lié au format ou aux dimensions de l'œuvre
  // Ex : grande toile (120×80 cm) = +80 € par rapport au format A4
  priceFormat: numeric('price_format', { precision: 8, scale: 2 }),

  // Coût de l'encadrement si l'œuvre est livrée encadrée
  // 0 ou null si l'œuvre est vendue sans cadre
  priceFraming: numeric('price_framing', { precision: 8, scale: 2 }),

  // Coût des matériaux (pigments, papier, toile, crayons, etc.)
  priceMaterials: numeric('price_materials', { precision: 8, scale: 2 }),

  // Niveau de technicité de l'œuvre : 1 (simple) à 5 (très complexe)
  // POURQUOI smallint ? Valeurs 1-5 seulement — integer serait surdimensionné (2 octets suffisent)
  priceTechnicality: smallint('price_technicality'),

  // Attachement sentimental de l'artiste à l'œuvre : 1 à 5
  // Influe sur le prix plancher — l'artiste peut fixer un prix plus élevé
  // pour une œuvre à laquelle il tient particulièrement
  priceAttachment: smallint('price_attachment'),

  // === Chemins de stockage [C1 - CRITIQUE] ===
  // TROIS chemins DISTINCTS pour ne jamais perdre l'original.
  // La DB stocke des CLÉS de stockage, jamais des chemins absolus [M6].
  // En local : "originals/abc123.jpg"
  // En production R2 : même clé, le StorageProvider gère la différence.

  // Fichier original tel qu'uploadé — JAMAIS écrasé, JAMAIS public
  originalPath: text('original_path'),

  // Fichier traité par Sharp (auto-rotation, normalisation, WebP)
  // Null tant que le pipeline n'a pas terminé
  processedPath: text('processed_path'),

  // Miniature (400px de large, WebP) pour la galerie en scroll
  thumbnailPath: text('thumbnail_path'),

  // === Dates système ===
  // Date à laquelle l'œuvre est devenue publiquement visible
  publishedAt: timestamp('published_at', { withTimezone: true }),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  // .$onUpdate() déclenche la mise à jour automatique de ce timestamp à chaque UPDATE Drizzle.
  // POURQUOI nécessaire ? PostgreSQL ne met PAS automatiquement à jour les timestamps
  // contrairement à MySQL. Sans .$onUpdate(), ce champ resterait figé à la date d'insertion
  // même après modification du titre, du prix, etc. en Phase 5.
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  // Index pour accélérer les filtres par statut et état pipeline
  // (utilisés fréquemment dans la galerie publique et l'admin)
  index('artworks_status_idx').on(table.status),
  index('artworks_pipeline_idx').on(table.pipelineState),
])

// ============================================================
// TABLE : tags — Tags libres pour les œuvres [D-02]
// ============================================================

/**
 * Tags libres : mots-clés que l'artiste assigne librement à ses œuvres.
 *
 * Exemples : "portrait", "paysage", "offert à Paul", "série bleue", "2023"
 *
 * POURQUOI des tags en plus des types et médiums ?
 * Les types et médiums suivent une classification standard.
 * Les tags permettent à l'artiste d'organiser selon sa propre logique,
 * sans contrainte — comme des étiquettes sur une boîte. [Décision D-02]
 */
export const tags = pgTable('tags', {
  id: serial('id').primaryKey(),

  // Le tag lui-même (ex: "portrait", "paysage abstrait")
  name: varchar('name', { length: 100 }).notNull().unique(),

  // Slug pour les URLs de filtre éventuelles
  slug: varchar('slug', { length: 100 }).notNull().unique(),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

// ============================================================
// TABLE : artwork_tags — Relation many-to-many œuvres ↔ tags
// ============================================================

/**
 * Table de jonction entre œuvres et tags.
 *
 * Une œuvre peut avoir plusieurs tags, un tag peut être sur plusieurs œuvres.
 * C'est une relation "many-to-many" (plusieurs-à-plusieurs).
 *
 * Exemple : l'œuvre "Portrait de Marie" peut avoir les tags
 * "portrait", "crayon", "2024" — et le tag "portrait" peut apparaître
 * sur 10 œuvres différentes.
 */
export const artworkTags = pgTable('artwork_tags', {
  artworkId: integer('artwork_id')
    .notNull()
    .references(() => artworks.id, { onDelete: 'cascade' }),
  // onDelete: 'cascade' = si l'œuvre est supprimée, ses tags sont supprimés automatiquement

  tagId: integer('tag_id')
    .notNull()
    .references(() => tags.id, { onDelete: 'cascade' }),
}, (table) => [
  // Clé primaire composite : une œuvre ne peut avoir le même tag qu'une seule fois
  primaryKey({ columns: [table.artworkId, table.tagId] }),
])

// ============================================================
// TABLE : visitors — Profils légers des acheteurs potentiels
// ============================================================

/**
 * Profils visiteurs : les personnes qui soumettent des offres.
 *
 * Les visiteurs ne créent PAS de compte avec mot de passe.
 * Ils s'identifient par leur numéro de téléphone (unique).
 * C'est voulu : simplicité d'accès prioritaire. [AUTH-02, AUTH-03]
 *
 * L'email est optionnel — utile pour les notifications mais pas obligatoire.
 * Le téléphone est l'identifiant unique (permet de retrouver son compte).
 */
export const visitors = pgTable('visitors', {
  id: serial('id').primaryKey(),

  // Pseudo ou nom affiché dans l'historique des offres
  // L'artiste voit ce nom dans son back-office
  displayName: varchar('display_name', { length: 100 }).notNull(),

  // Numéro de téléphone — UNIQUE et OBLIGATOIRE
  // C'est l'identifiant pour retrouver son compte ("j'ai déjà un compte")
  phone: varchar('phone', { length: 30 }).notNull().unique(),

  // Email optionnel — pour les notifications de réponse de l'artiste
  email: varchar('email', { length: 255 }).unique(),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  // .$onUpdate() assure la mise à jour automatique à chaque UPDATE via Drizzle.
  // Même raison que pour artworks.updatedAt : PostgreSQL n'a pas de mécanisme natif
  // équivalent à MySQL's ON UPDATE CURRENT_TIMESTAMP.
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  index('visitors_phone_idx').on(table.phone),
])

// ============================================================
// TABLE : offers — Offres d'achat soumises par les visiteurs
// ============================================================

/**
 * Offres d'achat : chaque ligne est une proposition de prix d'un visiteur.
 *
 * Règles métier importantes :
 * - Maximum 3 offres par visiteur par œuvre [rate limit, Phase 4]
 * - below_floor = true si le montant est sous le prix de base de l'œuvre
 *   (avertissement affiché, mais l'offre est quand même acceptée)
 * - L'historique public montre le nombre d'offres + la meilleure par défaut [M3]
 *   Le détail complet est en opt-in pour éviter l'ancrage des prix à la baisse
 */
export const offers = pgTable('offers', {
  id: serial('id').primaryKey(),

  // L'œuvre concernée par l'offre
  artworkId: integer('artwork_id')
    .notNull()
    .references(() => artworks.id, { onDelete: 'cascade' }),

  // Le visiteur qui fait l'offre
  visitorId: integer('visitor_id')
    .notNull()
    .references(() => visitors.id, { onDelete: 'cascade' }),

  // Montant proposé en euros
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),

  // Message optionnel accompagnant l'offre
  message: text('message'),

  // Vrai si le montant est sous le prix de base de l'œuvre
  // Calculé au moment de la soumission et stocké pour les stats
  belowFloor: boolean('below_floor').notNull().default(false),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('offers_artwork_idx').on(table.artworkId),
  index('offers_visitor_idx').on(table.visitorId),
])

// ============================================================
// TABLE : saved_artworks — Favoris des visiteurs (D-14 Phase 5)
// ============================================================

/**
 * Œuvres enregistrées par les visiteurs (favoris).
 *
 * POURQUOI une clé primaire composite et pas un id serial ?
 * La contrainte (visitorId, artworkId) est unique par nature — un visiteur
 * ne peut enregistrer la même œuvre qu'une seule fois. La PK composite
 * garantit cette unicité au niveau DB sans index supplémentaire.
 * [D-14 Phase 5]
 */
export const savedArtworks = pgTable('saved_artworks', {
  visitorId: integer('visitor_id')
    .notNull()
    .references(() => visitors.id, { onDelete: 'cascade' }),
  artworkId: integer('artwork_id')
    .notNull()
    .references(() => artworks.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  primaryKey({ columns: [table.visitorId, table.artworkId] }),
])

// ============================================================
// RELATIONS Drizzle — pour les requêtes avec jointures automatiques
// ============================================================

/**
 * Relations Drizzle ORM.
 *
 * Ces déclarations permettent à Drizzle de générer automatiquement
 * les jointures SQL quand on utilise db.query.artworks.findMany({ with: { tags: true } })
 * au lieu d'écrire du SQL join manuellement.
 */

export const artworkRelations = relations(artworks, ({ one, many }) => ({
  type: one(artworkTypes, {
    fields: [artworks.typeId],
    references: [artworkTypes.id],
  }),
  medium: one(mediums, {
    fields: [artworks.mediumId],
    references: [mediums.id],
  }),
  artworkTags: many(artworkTags),
  offers: many(offers),
}))

export const artworkTypeRelations = relations(artworkTypes, ({ many }) => ({
  artworks: many(artworks),
}))

export const mediumRelations = relations(mediums, ({ many }) => ({
  artworks: many(artworks),
}))

export const tagRelations = relations(tags, ({ many }) => ({
  artworkTags: many(artworkTags),
}))

export const artworkTagRelations = relations(artworkTags, ({ one }) => ({
  artwork: one(artworks, {
    fields: [artworkTags.artworkId],
    references: [artworks.id],
  }),
  tag: one(tags, {
    fields: [artworkTags.tagId],
    references: [tags.id],
  }),
}))

export const visitorRelations = relations(visitors, ({ many }) => ({
  offers: many(offers),
}))

export const offerRelations = relations(offers, ({ one }) => ({
  artwork: one(artworks, {
    fields: [offers.artworkId],
    references: [artworks.id],
  }),
  visitor: one(visitors, {
    fields: [offers.visitorId],
    references: [visitors.id],
  }),
}))

/**
 * Relations Drizzle pour saved_artworks.
 * Permet d'utiliser db.query.savedArtworks.findMany({ with: { artwork: true } })
 * si nécessaire dans les requêtes futures.
 */
export const savedArtworkRelations = relations(savedArtworks, ({ one }) => ({
  visitor: one(visitors, {
    fields: [savedArtworks.visitorId],
    references: [visitors.id],
  }),
  artwork: one(artworks, {
    fields: [savedArtworks.artworkId],
    references: [artworks.id],
  }),
}))

// ============================================================
// EXPORTS de types TypeScript inférés depuis le schéma
// ============================================================

/**
 * Types TypeScript générés automatiquement depuis le schéma Drizzle.
 *
 * Ces types correspondent EXACTEMENT aux données en base de données.
 * Ils sont utilisés partout dans l'application pour garantir
 * que le code TypeScript correspond à ce que PostgreSQL stocke.
 *
 * Exemple :
 *   import type { Artwork, NewArtwork } from '@/db/schema'
 *   const artwork: Artwork = await db.query.artworks.findFirst(...)
 */
export type ArtworkType = typeof artworkTypes.$inferSelect
export type NewArtworkType = typeof artworkTypes.$inferInsert

export type Medium = typeof mediums.$inferSelect
export type NewMedium = typeof mediums.$inferInsert

export type Artwork = typeof artworks.$inferSelect
export type NewArtwork = typeof artworks.$inferInsert

export type Tag = typeof tags.$inferSelect
export type NewTag = typeof tags.$inferInsert

export type Visitor = typeof visitors.$inferSelect
export type NewVisitor = typeof visitors.$inferInsert

export type Offer = typeof offers.$inferSelect
export type NewOffer = typeof offers.$inferInsert

// ============================================================
// TYPE : PriceBreakdownData — Décomposition du prix de base
// ============================================================

/**
 * Type partiel pour la décomposition du prix.
 *
 * POURQUOI un type séparé et pas passer l'objet Artwork complet ?
 * ArtworkInfoPanel ne doit pas dépendre du type Artwork entier —
 * cela crée un couplage fort et rend les tests plus complexes.
 * Ce type léger ne contient que les 6 colonnes nécessaires au composant PriceBreakdown.
 *
 * Les colonnes numeric Drizzle arrivent comme `string | null` en TypeScript.
 * Les colonnes smallint arrivent comme `number | null`.
 */
export type PriceBreakdownData = {
  // Rémunération du temps de travail (en euros, format "200.00")
  priceHoursSpent: string | null
  // Bonus lié au format ou aux dimensions (en euros)
  priceFormat: string | null
  // Coût de l'encadrement (en euros, 0 si sans cadre)
  priceFraming: string | null
  // Coût des matériaux (en euros)
  priceMaterials: string | null
  // Score de technicité : 1 à 5 (null si non renseigné)
  priceTechnicality: number | null
  // Score d'attachement sentimental : 1 à 5 (null si non renseigné)
  priceAttachment: number | null
}
