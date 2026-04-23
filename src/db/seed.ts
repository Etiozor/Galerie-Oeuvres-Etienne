/**
 * Script de peuplement de données de développement.
 *
 * Ce script insère des données fictives réalistes dans la base de données
 * pour faciliter le développement des phases 2 à 5.
 *
 * USAGE :
 *   npm run db:seed
 *
 * ATTENTION : Ce script EFFACE les données existantes avant d'insérer.
 * Ne jamais exécuter en production.
 *
 * PRÉREQUIS :
 *   - docker compose up -d (PostgreSQL doit être démarré)
 *   - npm run db:push (schéma doit être appliqué sur la base)
 */

import 'dotenv/config'
import { db } from './index'
import {
  artworkTypes,
  mediums,
  tags,
  artworks,
  artworkTags,
  visitors,
  offers,
} from './schema'

async function seed() {
  console.log('🌱 Début du seed de développement...')

  // --------------------------------------------------------
  // Nettoyage des données existantes (ordre important : FK d'abord)
  // --------------------------------------------------------
  console.log('  Nettoyage des tables...')
  await db.delete(artworkTags)
  await db.delete(offers)
  await db.delete(artworks)
  await db.delete(visitors)
  await db.delete(tags)
  await db.delete(mediums)
  await db.delete(artworkTypes)

  // --------------------------------------------------------
  // Types d'œuvres (extensibles depuis l'admin)
  // --------------------------------------------------------
  console.log('  Insertion des types...')
  const insertedTypes = await db.insert(artworkTypes).values([
    { name: 'Dessin', slug: 'dessin', sortOrder: 1 },
    { name: 'Peinture', slug: 'peinture', sortOrder: 2 },
  ]).returning()

  // --------------------------------------------------------
  // Médiums artistiques (extensibles depuis l'admin)
  // --------------------------------------------------------
  console.log('  Insertion des médiums...')
  const insertedMediums = await db.insert(mediums).values([
    { name: 'Crayon graphite', slug: 'crayon', sortOrder: 1 },
    { name: 'Encre de Chine', slug: 'encre', sortOrder: 2 },
    { name: 'Acrylique', slug: 'acrylique', sortOrder: 3 },
    { name: 'Huile sur toile', slug: 'huile', sortOrder: 4 },
  ]).returning()

  // --------------------------------------------------------
  // Tags libres
  // --------------------------------------------------------
  console.log('  Insertion des tags...')
  const insertedTags = await db.insert(tags).values([
    { name: 'portrait', slug: 'portrait' },
    { name: 'paysage', slug: 'paysage' },
    { name: 'abstrait', slug: 'abstrait' },
    { name: 'nature morte', slug: 'nature-morte' },
  ]).returning()

  // --------------------------------------------------------
  // Œuvres de démonstration
  // --------------------------------------------------------
  console.log('  Insertion des œuvres...')

  // Sécurité TypeScript : vérifier que les inserts ont bien retourné des lignes
  const dessin = insertedTypes[0]
  const peinture = insertedTypes[1]
  const crayon = insertedMediums[0]
  const huile = insertedMediums[3]

  if (!dessin || !peinture || !crayon || !huile) {
    throw new Error('Échec de l\'insertion des types/médiums de référence')
  }

  const insertedArtworks = await db.insert(artworks).values([
    {
      title: 'Portrait imaginaire #1',
      description: 'Un portrait au crayon graphite explorant les contrastes entre lumière et ombre.',
      createdDate: new Date('2024-03-15'),
      widthCm: '21',
      heightCm: '29.7',
      typeId: dessin.id,
      mediumId: crayon.id,
      status: 'available' as const,
      pipelineState: 'published' as const,
      basePrice: '350',
      // Chemins fictifs pour le développement — remplacés par de vrais fichiers en Phase 2
      originalPath: 'originals/seed-portrait-1.jpg',
      processedPath: 'processed/seed-portrait-1.webp',
      thumbnailPath: 'thumbnails/seed-portrait-1.webp',
      publishedAt: new Date('2024-04-01'),
    },
    {
      title: 'Paysage breton',
      description: null,
      createdDate: new Date('2024-06-20'),
      widthCm: '40',
      heightCm: '30',
      typeId: peinture.id,
      mediumId: huile.id,
      status: 'available' as const,
      pipelineState: 'published' as const,
      basePrice: '800',
      originalPath: 'originals/seed-paysage-1.jpg',
      processedPath: 'processed/seed-paysage-1.webp',
      thumbnailPath: 'thumbnails/seed-paysage-1.webp',
      publishedAt: new Date('2024-07-01'),
    },
    {
      title: 'Étude sans titre',
      description: 'Étude rapide en attente de traitement pipeline.',
      createdDate: new Date('2024-11-01'),
      widthCm: '15',
      heightCm: '20',
      typeId: dessin.id,
      mediumId: crayon.id,
      status: 'available' as const,
      pipelineState: 'awaiting_validation' as const, // En attente de validation artiste
      basePrice: '150',
      originalPath: 'originals/seed-etude-1.jpg',
      processedPath: null, // Pas encore traité
      thumbnailPath: null,
      publishedAt: null,
    },
  ]).returning()

  // --------------------------------------------------------
  // Association œuvres ↔ tags
  // --------------------------------------------------------
  console.log('  Association des tags...')
  const portraitTag = insertedTags[0]
  const paysageTag = insertedTags[1]
  const portrait1 = insertedArtworks[0]
  const paysage1 = insertedArtworks[1]

  if (!portraitTag || !paysageTag || !portrait1 || !paysage1) {
    throw new Error('Échec de l\'insertion des œuvres ou tags de référence')
  }

  await db.insert(artworkTags).values([
    { artworkId: portrait1.id, tagId: portraitTag.id },
    { artworkId: paysage1.id, tagId: paysageTag.id },
  ])

  // --------------------------------------------------------
  // Visiteurs de démonstration
  // --------------------------------------------------------
  console.log('  Insertion des visiteurs...')
  const insertedVisitors = await db.insert(visitors).values([
    {
      displayName: 'Marie Dupont',
      phone: '+33612345678',
      email: 'marie@example.com',
    },
    {
      displayName: 'Jean',
      phone: '+33698765432',
      email: null,
    },
  ]).returning()

  // --------------------------------------------------------
  // Offres de démonstration
  // --------------------------------------------------------
  console.log('  Insertion des offres...')
  const marie = insertedVisitors[0]
  const jean = insertedVisitors[1]

  if (!marie || !jean) {
    throw new Error('Échec de l\'insertion des visiteurs de référence')
  }

  await db.insert(offers).values([
    {
      artworkId: portrait1.id,
      visitorId: marie.id,
      amount: '300',
      message: 'Je suis très intéressée par ce portrait.',
      belowFloor: true, // 300 < 350 (prix de base)
    },
    {
      artworkId: portrait1.id,
      visitorId: jean.id,
      amount: '400',
      message: null,
      belowFloor: false, // 400 > 350 (prix de base)
    },
  ])

  console.log('✅ Seed terminé avec succès !')
  console.log('   - 2 types créés (Dessin, Peinture)')
  console.log('   - 4 médiums créés')
  console.log('   - 4 tags créés')
  console.log('   - 3 œuvres créées (2 publiées, 1 en attente de validation)')
  console.log('   - 2 visiteurs créés')
  console.log('   - 2 offres créées')

  process.exit(0)
}

seed().catch((error) => {
  console.error('❌ Erreur lors du seed :', error)
  process.exit(1)
})
