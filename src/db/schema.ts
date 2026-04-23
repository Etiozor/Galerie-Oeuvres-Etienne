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
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

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
  title: varchar('title', { length: 255 }).notNull(),
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
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
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
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
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
